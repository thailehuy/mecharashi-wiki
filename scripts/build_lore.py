#!/usr/bin/env python3
"""Pilot and ST lore (the in-game Profile and Skynet anecdotes), from the game tables.

Writes data/db/pilot_lore.json and mech_lore.json. Run compile.py afterwards.

    python3 scripts/build_lore.py

The text comes from the global client (RebuildGameUpdate/out/stats.db).

Pilots:
- Profile (ConfigDataPilotResumeInfo, keyed by pilot ID): affiliation, blood
  type, height and up to three pilot-specific fields (ExtraTitle/Value 1-3,
  e.g. Ada's "Hobbies: Figure Skating"). BirthDay, Weight, BirthPlace and Hobby
  are only filled in on unused early rows, so they're left out.
- Introduction (ConfigDataPilotArchivesInfo, ID = pilot ID): the long bio of
  the Profile screen, not the one-line `introduction` in pilots.json.
- Stories (ConfigDataSkynetPilotAnecdoteInfo, ID = pilot ID + 1-4): the four
  unlockable anecdotes, each a dated title and its text.

STs (keyed by the wiki's ST ID, the Body part ID; its suit ID is the first
four digits, e.g. Aglow 20470103 -> 2047):
- Manufacturer (ConfigDataSkynetWapSuitAtlasInfo.FactoryType -> ConfigDataWapFactoryInfo).
- Stories (the atlas row's AnecdoteLevelTemplateId -> ConfigDataSkynetWapSuitAnecdoteLevelTemplateInfo
  -> ConfigDataSkynetWapSuitAnecdoteInfo): four anecdotes, as for pilots.
  The ST's introduction is its `introduce` in mechs.json, added by compile.py.

Some stories end with a remark by a character (CommentCharacter ->
ConfigDataCharacterPicture).

stats.db is the global client, so it has no lore for anything newer than
Global (v2.6+). Pilots and STs from v2.6 on take theirs from the CN client
(mined/cn/out/stats.db) when it has it, in Chinese (marked `cn`): the
introduction and stories as they are, a pilot profile's affiliation, blood
type and labels/values in the global client's English where another pilot's
profile has the same Chinese, an ST's manufacturer in global's English when
global has that manufacturer. An ST's introduction is then the CN client's
flavor text (ConfigDataTacticalUnitSuitInfo.DescStrKey). Other rows keep what
they had.
"""
import json
import os
import sqlite3
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
CN_STATS = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')
# Pilots from this version on take their lore from the CN client while global has none.
CN_FROM = (2, 6)
RESUME_COLS = ['CampStrKey', 'BloodStrKey'] + [f'Extra{k}{i}StrKey' for k in ('Title', 'Value') for i in (1, 2, 3)]

# Placeholder values the game tables carry instead of leaving a field empty.
JUNK = {'', 'None', 'TEST'}


def load(name):
    path = os.path.join(DB, name + '.json')
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save(name, data):
    with open(os.path.join(DB, name + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def text(v):
    v = (v or '').strip()
    return None if v in JUNK else v


def story_out(r, characters):
    if not text(r['ParagraphTextStrKey_EN']):
        return None
    story = {'title': text(r['TitleStrKey_EN']) or '', 'text': text(r['ParagraphTextStrKey_EN'])}
    comment = text(r['CommentContentStrKey_EN'])
    if comment:
        by = text(characters.get(r['CommentCharacter']))
        story['comment'] = {'by': by, 'text': comment} if by else {'text': comment}
    return story


def pilot_row(con, pid, characters):
    row = {}
    r = con.execute('SELECT * FROM ConfigDataPilotResumeInfo WHERE ID = ?', (int(pid),)).fetchone()
    # A placeholder row (Bertha's: "TEST" names, blood type and height) is skipped whole.
    if r and 'TEST' not in tuple(r):
        for key, col in [('affiliation', 'CampStrKey_EN'), ('blood_type', 'BloodStrKey_EN'), ('height', 'HeightStrKey_EN')]:
            if text(r[col]):
                row[key] = text(r[col])
        extra = [{'label': text(r[f'ExtraTitle{i}StrKey_EN']), 'value': text(r[f'ExtraValue{i}StrKey_EN'])}
                 for i in (1, 2, 3)]
        extra = [e for e in extra if e['label'] and e['value']]
        if extra:
            row['profile'] = extra
    r = con.execute('SELECT ContentStrKey_EN FROM ConfigDataPilotArchivesInfo WHERE ID = ?', (int(pid),)).fetchone()
    if r and text(r[0]):
        row['introduction'] = text(r[0])
    stories = [story_out(r, characters) for r in
               con.execute('SELECT * FROM ConfigDataSkynetPilotAnecdoteInfo WHERE ID / 10 = ? ORDER BY ID', (int(pid),))]
    if any(stories):
        row['stories'] = [s for s in stories if s]
    return row


def mech_row(con, atlas, factories, characters):
    row = {}
    if text(factories.get(atlas['FactoryType'])):
        row['manufacturer'] = factories[atlas['FactoryType']]
    tpl = con.execute('SELECT AnecdoteLevelInfo FROM ConfigDataSkynetWapSuitAnecdoteLevelTemplateInfo WHERE ID = ?',
                      (atlas['AnecdoteLevelTemplateId'],)).fetchone()
    stories = []
    for e in sorted(json.loads(tpl[0]) if tpl else [], key=lambda e: e['AnalyticLevel']):
        r = con.execute('SELECT * FROM ConfigDataSkynetWapSuitAnecdoteInfo WHERE ID = ?', (e['AnecdoteId'],)).fetchone()
        if r and story_out(r, characters):
            stories.append(story_out(r, characters))
    if stories:
        row['stories'] = stories
    return row


class CN:
    """The CN client's lore, in the Chinese of its string table (ConfigDataST_CN)."""

    def __init__(self, con, glob, pilots, factories):
        self.con = con
        self.strings = dict(con.execute('SELECT ID, Value FROM ConfigDataST_CN'))
        # Chinese profile text -> global's English for it, from the pilots both clients have.
        votes = defaultdict(Counter)
        cols = ', '.join(RESUME_COLS)
        en = {r[0]: r[1:] for r in glob.execute(f'SELECT ID, {", ".join(c + "_EN" for c in RESUME_COLS)} FROM ConfigDataPilotResumeInfo')}
        for r in con.execute(f'SELECT ID, {cols} FROM ConfigDataPilotResumeInfo'):
            for c, e in zip(r[1:], en.get(r[0], ())):
                c, e = self.zh(c), text(e)
                if c and e and '测试' not in c:
                    votes[c][e] += 1
        self.en = {c: v.most_common(1)[0][0] for c, v in votes.items()}
        # Comment authors: global's name for the character, else the pilot of that CN name, else the Chinese.
        self.glob_chars = dict(glob.execute('SELECT ID, CharNameStrKey_EN FROM ConfigDataCharacterPicture'))
        self.factories = factories
        self.pilot_names = {self.zh(r[1]): pilots[str(r[0])]['name']
                            for r in con.execute('SELECT ID, NameStrKey FROM ConfigDataPilotInfo') if str(r[0]) in pilots}

    def zh(self, v):
        if isinstance(v, str) and v.startswith('ST:') and v[3:].isdigit():
            v = self.strings.get(int(v[3:]))
        return text(v)

    def profile(self, v):
        v = self.zh(v)
        return self.en.get(v, v)

    def character(self, i):
        if text(self.glob_chars.get(i)):
            return text(self.glob_chars[i])
        r = self.con.execute('SELECT CharNameStrKey FROM ConfigDataCharacterPicture WHERE ID = ?', (i,)).fetchone()
        name = r and self.zh(r[0])
        return self.pilot_names.get(name, name)

    def story(self, r):
        if not self.zh(r['ParagraphTextStrKey']):
            return None
        story = {'title': self.zh(r['TitleStrKey']) or '', 'text': self.zh(r['ParagraphTextStrKey'])}
        comment = self.zh(r['CommentContentStrKey'])
        if comment:
            by = self.character(r['CommentCharacter'])
            story['comment'] = {'by': by, 'text': comment} if by else {'text': comment}
        return story

    def pilot_row(self, pid):
        con, row = self.con, {}
        r = con.execute('SELECT * FROM ConfigDataPilotResumeInfo WHERE ID = ?', (int(pid),)).fetchone()
        if r:
            for key, col in [('affiliation', 'CampStrKey'), ('blood_type', 'BloodStrKey'), ('height', 'HeightStrKey')]:
                if self.profile(r[col]):
                    row[key] = self.profile(r[col])
            extra = [{'label': self.profile(r[f'ExtraTitle{i}StrKey']), 'value': self.profile(r[f'ExtraValue{i}StrKey'])}
                     for i in (1, 2, 3)]
            extra = [e for e in extra if e['label'] and e['value']]
            if extra:
                row['profile'] = extra
        r = con.execute('SELECT ContentStrKey FROM ConfigDataPilotArchivesInfo WHERE ID = ?', (int(pid),)).fetchone()
        if r and self.zh(r[0]):
            row['introduction'] = self.zh(r[0])
        stories = [self.story(r) for r in
                   con.execute('SELECT * FROM ConfigDataSkynetPilotAnecdoteInfo WHERE ID / 10 = ? ORDER BY ID', (int(pid),))]
        if any(stories):
            row['stories'] = [s for s in stories if s]
        if row:
            row['cn'] = True
        return row

    def mech_row(self, mid):
        con, row = self.con, {}
        atlas = con.execute('SELECT * FROM ConfigDataSkynetWapSuitAtlasInfo WHERE ID = ?', (int(mid) // 10000,)).fetchone()
        if atlas:
            f = con.execute('SELECT NameStrKey FROM ConfigDataWapFactoryInfo WHERE FactoryType = ?', (atlas['FactoryType'],)).fetchone()
            name = text(self.factories.get(atlas['FactoryType'])) or (f and self.zh(f[0]))
            if name:
                row['manufacturer'] = name
        r = con.execute('SELECT DescStrKey FROM ConfigDataTacticalUnitSuitInfo WHERE WapPartBodyId = ?', (int(mid),)).fetchone()
        if r and self.zh(r[0]):
            row['introduction'] = self.zh(r[0])
        tpl = atlas and con.execute('SELECT AnecdoteLevelInfo FROM ConfigDataSkynetWapSuitAnecdoteLevelTemplateInfo WHERE ID = ?',
                                    (atlas['AnecdoteLevelTemplateId'],)).fetchone()
        stories = []
        for e in sorted(json.loads(tpl[0]) if tpl else [], key=lambda e: e['AnalyticLevel']):
            r = con.execute('SELECT * FROM ConfigDataSkynetWapSuitAnecdoteInfo WHERE ID = ?', (e['AnecdoteId'],)).fetchone()
            if r and self.story(r):
                stories.append(self.story(r))
        if stories:
            row['stories'] = stories
        if row:
            row['cn'] = True
        return row


def version(v):
    return tuple(int(x) for x in str(v or '0').split('.'))


def update(name, items, rows, on_global):
    """rows: wiki ID -> new row, for every item the game has. Others keep theirs."""
    lore = load(name)
    for key in items:
        if rows.get(key):
            lore[key] = rows[key]
        elif key in on_global:
            lore.pop(key, None)
    save(name, {k: lore[k] for k in sorted(lore)})
    missing = [v['name'] for k, v in items.items() if k not in lore]
    print(f'{name}.json: {len(lore)}')
    if missing:
        print(f'  no lore ({len(missing)}, not on Global yet or placeholder text): {", ".join(missing)}')


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    characters = {r['ID']: r['CharNameStrKey_EN'] for r in con.execute('SELECT ID, CharNameStrKey_EN FROM ConfigDataCharacterPicture')}

    pilots, mechs = load('pilots'), load('mechs')
    factories = {r['FactoryType']: r['NameStrKey_EN'] for r in con.execute('SELECT * FROM ConfigDataWapFactoryInfo')}
    cn = None
    if os.path.exists(CN_STATS):
        cn_con = sqlite3.connect(CN_STATS)
        cn_con.row_factory = sqlite3.Row
        cn = CN(cn_con, con, pilots, factories)

    on_global = {str(r[0]) for r in con.execute('SELECT ID FROM ConfigDataPilotInfo')}
    rows = {pid: pilot_row(con, pid, characters) for pid in pilots}
    for pid, p in pilots.items():
        if cn and not rows[pid] and version(p.get('version')) >= CN_FROM:
            rows[pid] = cn.pilot_row(pid)
    update('pilot_lore', pilots, rows, on_global)

    atlases = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataSkynetWapSuitAtlasInfo')}
    suit = {mid: int(mid) // 10000 for mid in mechs}
    rows = {mid: mech_row(con, atlases[suit[mid]], factories, characters) for mid in mechs if suit[mid] in atlases}
    for mid, m in mechs.items():
        if cn and not rows.get(mid) and version(m.get('version')) >= CN_FROM:
            rows[mid] = cn.mech_row(mid)
    update('mech_lore', mechs, rows, {mid for mid in mechs if suit[mid] in atlases})

if __name__ == '__main__':
    main()
