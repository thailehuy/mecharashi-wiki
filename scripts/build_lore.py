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
Global (v2.6+). Those rows keep what they had.
"""
import json
import os
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')

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

    pilots = load('pilots')
    on_global = {str(r[0]) for r in con.execute('SELECT ID FROM ConfigDataPilotInfo')}
    update('pilot_lore', pilots, {pid: pilot_row(con, pid, characters) for pid in pilots}, on_global)

    mechs = load('mechs')
    factories = {r['FactoryType']: r['NameStrKey_EN'] for r in con.execute('SELECT * FROM ConfigDataWapFactoryInfo')}
    atlases = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataSkynetWapSuitAtlasInfo')}
    suit = {mid: int(mid) // 10000 for mid in mechs}
    update('mech_lore', mechs,
           {mid: mech_row(con, atlases[suit[mid]], factories, characters) for mid in mechs if suit[mid] in atlases},
           {mid for mid in mechs if suit[mid] in atlases})


if __name__ == '__main__':
    main()
