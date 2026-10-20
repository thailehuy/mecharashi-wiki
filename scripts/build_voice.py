#!/usr/bin/env python3
"""Pilot voice lines and voice actors, from the game tables → data/pilots/voice.js (PilotVoiceData, fetched by the
pilot page's Voice Lines tab).

    python3 scripts/build_voice.py

Run extract_voices.py first: its data/pilots/voice-audio.json says which lines have audio, in which languages
(the files are on voices.mecharashi-wiki.cc as <lang>/<pilot ID>/<event>.mp3).

- Lines (ConfigDataPilotVoiceInfo): the pilot's voice scheme's lines (ConfigDataPilotInfo.VoiceScheme →
  ConfigDataPilotVoiceScheme.PilotVoiceIDList) and any other row whose ID is the pilot ID + 2 digits (a skin's
  lines). One per Wwise event; the in-game voice gallery's (ShowInPilotVoiceShowcase) first, in its order, then
  the rest. Grouped by skin: an event PI_<pilot ID><letter>_… belongs to the skin with that letter
  (ConfigDataPilotSkinInfo, icon Icon_pilotSkin_<pilot ID><letter>).
- Conditions: a line with a PilotBond plays only with/against certain pilots (PilotBondIdentityInfo, the
  identities in ConfigDataPilotInfo.PilotIdentityInfoList, resolved to the wiki pilots that carry them) or in a
  certain ST (PilotBondParam, ST IDs).
- Voice actors (PilotVoiceScheme.CharacterVoiceIDList → ConfigDataCharacterVoice): English and Chinese.

Text is the global client's (RebuildGameUpdate/out/stats.db). Pilots that are only on CN take their lines and
Chinese voice actor from the CN tables (data/screenshots/mined/cn/out/stats.db) without text, each titled like
the global lines with the same event suffix. Audio no line in the tables plays is listed under "Unused".
"""
import collections
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PILOTS = os.path.join(ROOT, 'data', 'db', 'pilots.json')
MECHS = os.path.join(ROOT, 'data', 'db', 'mechs.json')
AUDIO = os.path.join(ROOT, 'data', 'pilots', 'voice-audio.json')
OUT = os.path.join(ROOT, 'data', 'pilots', 'voice.js')
GLOBAL = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
CN = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')

LANGS = ('en', 'ja', 'zh')
EVENT_RE = re.compile(r'^PI_(\d{8})([A-Z]?)_Voice_Line_(\w+)$')
BONDS = {'VoiceBond_MyTeam': 'team', 'VoiceBond_TargetInMyTeam': 'target', 'VoiceBond_MyEnemy': 'enemy',
         'VoiceBond_WapEquiped': 'st'}


def connect(path):
    con = sqlite3.connect('file:%s?mode=ro' % path, uri=True)
    con.row_factory = sqlite3.Row
    return con


def text(v):
    v = (v or '').strip()
    # The CN tables' text is still string keys (ST:12345).
    return None if not v or v.startswith('ST:') else v


class Tables:
    def __init__(self, con):
        self.voice = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataPilotVoiceInfo')}
        self.schemes = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataPilotVoiceScheme')}
        self.pilots = {r['ID']: r for r in con.execute('SELECT ID, VoiceScheme, PilotIdentityInfoList FROM ConfigDataPilotInfo')}
        self.actors = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataCharacterVoice')}
        self.skins = {r['Icon']: text(r['NameStrKey_EN']) for r in con.execute('SELECT Icon, NameStrKey_EN FROM ConfigDataPilotSkinInfo')}

    def rows(self, pid):
        """The pilot's voice rows, or [] if this client doesn't have the pilot."""
        p = self.pilots.get(int(pid))
        scheme = self.schemes.get(p['VoiceScheme']) if p else None
        if not scheme:
            return []
        ids = set(json.loads(scheme['PilotVoiceIDList'] or '[]')) | {i for i in self.voice if i // 100 == int(pid)}
        return [self.voice[i] for i in sorted(ids) if i in self.voice and self.voice[i]['WwiseVoiceEventName']]

    def cast(self, pid):
        p = self.pilots.get(int(pid))
        scheme = self.schemes.get(p['VoiceScheme']) if p else None
        out = {}
        for i in json.loads((scheme and scheme['CharacterVoiceIDList']) or '[]'):
            a = self.actors.get(i)
            if a and text(a['Voicer']):
                out[{'EN': 'en', 'CN': 'zh'}.get(a['LocalizationType'], a['LocalizationType'].lower())] = a['Voicer']
        return out


def suffix_titles(g):
    """Event suffix (Click_2) → the title global lines with it have most often."""
    counts = collections.defaultdict(collections.Counter)
    for r in g.voice.values():
        m = EVENT_RE.match(r['WwiseVoiceEventName'] or '')
        if m and text(r['TitleStrKey_EN']):
            counts[m.group(3)][r['TitleStrKey_EN']] += 1
    return {s: c.most_common(1)[0][0] for s, c in counts.items()}


def identities(g, pilots):
    """Identity (Kaidan, UON, …) → the wiki pilots carrying it."""
    out = collections.defaultdict(list)
    for pid, p in g.pilots.items():
        if str(pid) in pilots:
            for ident in json.loads(p['PilotIdentityInfoList'] or '[]'):
                out[ident].append(pilots[str(pid)]['name'])
    # A pilot's own identity is sometimes given to others too (Bertha carries Kaidan's): keep just the pilot.
    return {i: [n for n in names if n.lower() == i.lower()] or names for i, names in out.items()}


def condition(r, idents, mechs):
    kind = BONDS.get(r['PilotBond'])
    if not kind:
        return None
    if kind == 'st':
        names = [mechs[str(i)]['name'] for i in json.loads(r['PilotBondParam'] or '[]') if str(i) in mechs]
    else:
        names = sorted({n for i in json.loads(r['PilotBondIdentityInfo'] or '[]') for n in idents.get(i, [])})
    return {'kind': kind, 'names': names} if names else None


def pilot_voice(pid, rows, has_text, titles, audio, skins, idents, mechs):
    def title_for(event):
        m = EVENT_RE.match(event)
        return titles.get(m.group(3)) if m else None

    lines, seen = [], set()
    # The voice gallery's lines first, in its order; then the rest by ID.
    for r in sorted(rows, key=lambda r: (r['ShowInPilotVoiceShowcase'] is None, r['ShowInPilotVoiceShowcase'] or 0, r['ID'])):
        event = r['WwiseVoiceEventName']
        if event in seen:
            continue
        seen.add(event)
        line = {'title': (text(r['TitleStrKey_EN']) if has_text else None) or title_for(event) or 'Line', 'event': event}
        if has_text and text(r['TalkContentStrKey_EN']):
            line['text'] = text(r['TalkContentStrKey_EN'])
        cond = condition(r, idents, mechs) if has_text else None
        if cond:
            line['cond'] = cond
        lines.append(line)
    # Audio no table row plays: kept apart, its title only a guess from the event name.
    unused = [{'title': title_for(event) or 'Line', 'event': event} for event in sorted(audio) if event not in seen]

    groups = collections.OrderedDict()
    for line in lines + unused:
        langs = [lang for lang in LANGS if lang in audio.get(line['event'], {})]
        if langs:
            line['audio'] = langs
        m = EVENT_RE.match(line['event'])
        letter = m.group(2) if m and line not in unused else '?'
        groups.setdefault(letter, []).append(line)
    out = []
    for letter, ls in groups.items():
        if letter == '':
            name = 'Default'
        elif letter == '?':
            name = 'Unused'
        else:
            name = skins.get('Icon_pilotSkin_%s%s' % (pid, letter)) or 'Skin %s' % letter
        out.append({'name': name, 'lines': ls})
    out.sort(key=lambda grp: (grp['name'] == 'Unused', grp['name'] != 'Default'))
    return out


def main():
    with open(PILOTS, encoding='utf-8') as f:
        pilots = json.load(f)
    with open(MECHS, encoding='utf-8') as f:
        mechs = json.load(f)
    audio = {}
    if os.path.exists(AUDIO):
        with open(AUDIO, encoding='utf-8') as f:
            audio = json.load(f)
    g = Tables(connect(GLOBAL))
    cn = Tables(connect(CN)) if os.path.exists(CN) else None
    titles = suffix_titles(g)
    idents = identities(g, pilots)

    out, cn_only, none = {}, [], []
    for pid, p in pilots.items():
        rows, has_text, cast = g.rows(pid), True, g.cast(pid)
        if not rows and cn:
            rows, has_text, cast = cn.rows(pid), False, cn.cast(pid)
            if rows:
                cn_only.append(p['name'])
        if not rows and not audio.get(pid):
            none.append(p['name'])
            continue
        skins = {**(cn.skins if cn else {}), **{k: v for k, v in g.skins.items() if v}}
        entry = {'groups': pilot_voice(pid, rows, has_text, titles, audio.get(pid, {}), skins, idents, mechs)}
        if cast:
            entry['cast'] = cast
        out[pid] = entry

    js = 'var PilotVoiceData = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(js)
    n = sum(len(grp['lines']) for v in out.values() for grp in v['groups'])
    print('voice.js: %d pilots, %d lines (%d KB)' % (len(out), n, len(js.encode('utf-8')) // 1024))
    if cn_only:
        print('  CN only, no text (%d): %s' % (len(cn_only), ', '.join(cn_only)))
    if none:
        print('  no voice lines (%d): %s' % (len(none), ', '.join(none)))


if __name__ == '__main__':
    main()
