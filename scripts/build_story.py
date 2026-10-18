#!/usr/bin/env python3
"""The Story page's data, from the global client's tables (RebuildGameUpdate/
out/stats.db). Writes data/story/story.json and story.js (StoryData).

    python3 scripts/build_story.py

Skynet tabs: the in-game Skynet encyclopedia (ConfigDataSkynetWikipedia*):
- Categories (CatalogueTypeInfo): Geography, Factions, Events, Items. The
  Characters category (each pilot's "Pledge") is left out.
- Entries (EntryInfo, IsActive only): a name, a one-line brief and one or more
  text blocks (TextBlockInfo, "Part 1", "Part 2", ... unlocked as the story
  goes on), each a list of clauses (ClauseInfo -> ClauseUpdateInfo, whose
  NameStrKey holds the text). The text links other entries with
  <link type=ENTRY ID>[Name]</link>; it's kept as <link type=ID>Name</link>
  and the page turns it into a jump link.

Chapters (ConfigDataWorldMapChapterInfo, by ID; its NextChapterId is the
next chapter's first waypoint): name, subtitle, date (its story-map time
point, WorldMapTimePointInfo: "XC&Apr. 01. 116" -> "XC 116, Apr. 01"; XC is
the game's "New Era"), intro (DetailDesc) and stages (WorldMapWayPointInfo):
- MainWayPointIds in order: main stages (Master, "0-1"...), the encounters
  between them (Water) and the chapter's Critical Operation (Rating).
- BranchWayPointIds: side missions, with the character who gives them.
DispatchWayPointIds aren't stages of their own (no waypoint rows).

A stage's rewards are its RewardDropId (ConfigDataItemDropInfo): the items the
mission screen shows (UIShowItemList) plus the guaranteed ones
(CertainDropList), each once; a guaranteed item's fixed amount is used when
the shown list has none. Pilots and STs (an ST's Body/Arms/Legs collapse into
the ST) link to their wiki pages by ID.
"""
import json
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_drops import Drops, STATS  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'story')
OUT = os.path.join(HERE, 'story.json')
OUT_JS = os.path.join(HERE, 'story.js')
DB = os.path.join(ROOT, 'data', 'db')

# Skynet categories shown, in tab order (after Chapters); the game calls Faction "Factions".
CATEGORIES = [('geography', 'SkynetWikipediaCatalogueType_Geography', 'Geography'),
              ('faction', 'SkynetWikipediaCatalogueType_Power', 'Faction'),
              ('events', 'SkynetWikipediaCatalogueType_Event', 'Events'),
              ('items', 'SkynetWikipediaCatalogueType_Item', 'Items')]
STAGE_KINDS = {'WayPointType_Master': 'main', 'WayPointType_Water': 'encounter',
               'WayPointType_Rating': 'critical', 'WayPointType_Branch': 'side'}
ST_PARTS = ('ItemType_WapBody', 'ItemType_WapArm', 'ItemType_WapLeg')

LINK = re.compile(r'<link type=(\d+)>(.*?)</link>', re.S)
COLOR = re.compile(r'</?color[^>]*>')


def text(v):
    v = (v or '').strip()
    return None if v in ('', 'None') else v


def clean(s, links=False):
    """Game text -> plain text; with links, <link type=ID>[Name]</link> stays as <link type=ID>Name</link>."""
    s = COLOR.sub('', s or '')
    if links:
        return LINK.sub(lambda m: '<link type=%s>%s</link>' % (m.group(1), m.group(2).strip('[]')), s)
    return LINK.sub(lambda m: m.group(2), s)


def load(name):
    with open(os.path.join(DB, name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def world(con):
    out = []
    for key, cat, name in CATEGORIES:
        entries = []
        for e in con.execute('SELECT * FROM ConfigDataSkynetWikipediaEntryInfo WHERE CatalogueType = ? AND IsActive '
                             'ORDER BY ID', (cat,)):
            parts = []
            for tb in json.loads(e['TextBlockIds'] or '[]'):
                block = con.execute('SELECT * FROM ConfigDataSkynetWikipediaTextBlockInfo WHERE ID = ?', (tb,)).fetchone()
                clauses = []
                for cid in json.loads(block['ClauseIds'] or '[]') if block else []:
                    clause = con.execute('SELECT UpdateInfoIds FROM ConfigDataSkynetWikipediaClauseInfo WHERE ID = ?',
                                         (cid,)).fetchone()
                    # A clause's last update is its text once the story has caught up.
                    upd = clause and json.loads(clause[0] or '[]')
                    row = upd and con.execute('SELECT NameStrKey_EN FROM ConfigDataSkynetWikipediaClauseUpdateInfo '
                                              'WHERE ID = ?', (upd[-1],)).fetchone()
                    if row and text(row[0]):
                        clauses.append(clean(text(row[0]), links=True))
                if clauses:
                    parts.append({'title': text(block['TitleStrKey_EN']) or '', 'text': '\n'.join(clauses)})
            if not parts:
                continue
            entry = {'id': e['ID'], 'name': text(e['NameStrKey_EN'])}
            brief = text(e['BriefStrKey_EN'])
            if brief and brief != entry['name']:
                entry['brief'] = brief
            entry['parts'] = parts
            entries.append(entry)
        out.append({'key': key, 'name': name, 'entries': entries})
    return out


def date(s):
    """"XC&Apr. 01. 116" -> "XC 116, Apr. 01"."""
    m = re.match(r'^XC&(\w+)\. (\d+)\. (\d+)$', s or '')
    return 'XC %s, %s. %s' % (m.group(3), m.group(1), m.group(2)) if m else s


class Rewards:
    def __init__(self, con):
        self.d = Drops(print)
        self.con = con
        self.d.names['ItemType_PilotChip'] = {i: (n, icon) for i, n, icon in con.execute(
            'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataPilotChipInfo')}
        self.d.names['ItemType_WeaponEntry'] = {i: (n, icon) for i, n, icon in con.execute(
            'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataWeaponEntryInfo')}
        self.pilots = load('pilots')
        self.mechs = load('mechs')

    def get(self, drop_id, where):
        shown, certain = self.d.lists(drop_id)
        fixed = {(x['type'], x['configId']): x['maxCount'] for x in certain if x.get('minCount') == x.get('maxCount')}
        seen, out = set(), []
        for x in shown + certain:
            key = (x['type'], x['configId'])
            if key in seen:
                continue
            seen.add(key)
            count = x['count'] if x.get('count', -1) > 0 else fixed.get(key, -1)
            if x['type'] == 'ItemType_Weapon':
                try:
                    out.append(dict(self.d.weapon(x['configId']), kind='weapon'))
                except KeyError:
                    print('%s: weapon %d not in the mined DB' % (where, x['configId']))
            elif x['type'] == 'ItemType_Pilot':
                pid = str(x['configId'])
                if pid not in self.pilots:
                    print('%s: pilot %s not on the wiki' % (where, pid))
                    continue
                out.append({'kind': 'pilot', 'id': pid, 'name': self.pilots[pid]['name']})
            elif x['type'] in ST_PARTS:
                # Body part ID 20200102 -> suit 2020; the wiki keys an ST by its Body.
                mid = next((m for m in self.mechs if int(m) // 10000 == x['configId'] // 10000), None)
                if mid is None:
                    print('%s: no ST for part %d' % (where, x['configId']))
                elif not any(r.get('id') == mid for r in out):
                    out.append({'kind': 'st', 'id': mid, 'name': self.mechs[mid]['name']})
            else:
                item = self.d.item(dict(x, count=-1))
                item['kind'] = 'item'
                if count > 0:
                    item['count'] = count
                out.append(item)
        return out


def chapters(con):
    rewards = Rewards(con)
    characters = dict(con.execute('SELECT ID, CharNameStrKey_EN FROM ConfigDataCharacterPicture'))
    times = {r['BelongChapterID']: r for r in con.execute('SELECT * FROM ConfigDataWorldMapTimePointInfo')}
    out = []
    for c in con.execute('SELECT * FROM ConfigDataWorldMapChapterInfo ORDER BY ID').fetchall():
        cid = c['ID']
        name = re.sub(r'^Chapter\s*-\s*', 'Chapter ', text(c['NameStrKey_EN']))
        chapter = {'id': cid, 'name': name, 'title': text(c['DescStrKey_EN'])}
        if cid in times:
            chapter['date'] = date(text(times[cid]['TimeStrKey_EN']))
        if text(c['DetailDescStrKey_EN']):
            chapter['intro'] = clean(text(c['DetailDescStrKey_EN']))
        stages = []
        for wid in json.loads(c['MainWayPointIds'] or '[]') + json.loads(c['BranchWayPointIds'] or '[]'):
            w = con.execute('SELECT * FROM ConfigDataWorldMapWayPointInfo WHERE ID = ?', (wid,)).fetchone()
            if not w:
                print('%s: no waypoint %d' % (name, wid))
                continue
            st = {'id': wid, 'kind': STAGE_KINDS.get(w['WayPointType'], 'main')}
            for key, col in [('code', 'TitleStrKey_EN'), ('name', 'NameStrKey_EN'), ('location', 'PosStrKey_EN'),
                             ('text', 'DescStrKey_EN')]:
                if text(w[col]):
                    st[key] = clean(text(w[col]))
            if st['kind'] == 'critical':
                st.pop('code', None)
            if st['kind'] == 'side' and text(characters.get(w['CharacterPictureId'])):
                st['giver'] = text(characters[w['CharacterPictureId']])
            r = rewards.get(w['RewardDropId'], '%s %s' % (name, st.get('code') or st.get('name')))
            if r:
                st['rewards'] = r
            stages.append(st)
        chapter['stages'] = stages
        out.append(chapter)
    return out


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    w = world(con)
    chs = chapters(con)
    data = {'world': w, 'chapters': chs}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.StoryData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d world entries, %d chapters, %d stages (%d KB)' % (
        OUT, sum(len(c['entries']) for c in w), len(chs), sum(len(c['stages']) for c in chs),
        os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
