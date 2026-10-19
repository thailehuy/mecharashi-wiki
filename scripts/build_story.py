#!/usr/bin/env python3
"""The Story page's data, from the global client's tables (RebuildGameUpdate/
out/stats.db). Writes data/story/story.json and story.js (StoryData).

    python3 scripts/build_story.py

Skynet tabs: the in-game Skynet encyclopedia (ConfigDataSkynetWikipedia*):
- Categories (CatalogueTypeInfo): Geography, Factions, Events (shown as Incidents), Items. The
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

Event stories (ConfigDataPlotActivityInfo, one per limited-time event): its
story level groups (PlotLevelGroupList, plus challenge groups whose stages play
cutscenes, like Gilded Reverie's) and their stages (PlotActivityLevelInfo):
number, name, title (an in-game date, a heading, or the name again) and
briefing. A stage's battles (LevelBattleIdList) are its difficulties; with more
than one, each difficulty's rewards are listed. Run dates come from the event's
OperationalActivityInfo open time. A rerun (same name) replaces the original.

Border Conflict (the roguelike mode, ConfigDataRoguelike*; every difficulty
repeats its text under new IDs, so each distinct text is kept once):
- Bosses (BossInfo): each faction and its foes by tier (BossLevelPoolInfo,
  Rookie...Ace), with what you find on them (ActionGridBossPostEventId).
- Encounters (EventInfo): scene, choices (EventOptionInfo: the choice, its
  effect in brackets, its outcome) and the follow-up steps sharing its name; a
  battle's opening (ExtraBattleInfo) goes before its Victory/Defeat steps.
- Discoveries: the map tiles' finds (ActionGridPostEventInfo), without the
  bosses' and the designers' "Collection Pool" rows.
Morgana's and Skysweep's (GrowthBossInfo) story is dialogue only; not shown.

Cutscenes: a main or event stage's StartDialogID (before its battle) and
EndDialogID (after) start a chain of ConfigDataDialogueInfo lines (see
Dialogue). story.json gives each stage its scenes' IDs, line counts and skip
summaries; the lines go in data/story/dialogue/<ch-ID|ev-ID>.js
(StoryDialogue), one file per chapter or event, fetched when a cutscene is
opened. Mid-battle dialogue isn't included.

A stage's rewards are its RewardDropId (ConfigDataItemDropInfo): the items the
mission screen shows (UIShowItemList) plus the guaranteed ones
(CertainDropList), each once; a guaranteed item's fixed amount is used when
the shown list has none. Pilots, STs (an ST's Body/Arms/Legs collapse into
the ST) and backpacks link to their wiki pages by ID.
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
DIALOGUE = os.path.join(HERE, 'dialogue')
DB = os.path.join(ROOT, 'data', 'db')

# Skynet categories shown, in tab order (after Main Story and Event Stories); the game calls Faction "Factions"
# and Incidents "Events" (renamed so they aren't confused with the Event Stories tab).
CATEGORIES = [('geography', 'SkynetWikipediaCatalogueType_Geography', 'Geography'),
              ('faction', 'SkynetWikipediaCatalogueType_Power', 'Faction'),
              ('events', 'SkynetWikipediaCatalogueType_Event', 'Incidents'),
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
        # Event rewards: medals ("UIIcons/HonorMedal_ABS/Icon_honormedal_001") and event blind boxes.
        self.d.names['ItemType_HonorMedal'] = {i: (n, (icon or '').rsplit('/', 1)[-1]) for i, n, icon in con.execute(
            'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataHonorMedalInfo')}
        self.d.names['ItemType_PlotActivityBlindBox'] = {i: (n, icon) for i, n, icon in con.execute(
            'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataPlotActivityBlindBoxItemInfo')}
        self.pilots = load('pilots')
        self.mechs = load('mechs')
        self.backpacks = load('backpacks')

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
            elif x['type'] == 'ItemType_Backpack':
                bid = str(x['configId'])
                if bid not in self.backpacks:
                    print('%s: backpack %s not on the wiki' % (where, bid))
                    continue
                out.append({'kind': 'backpack', 'id': bid, 'name': self.backpacks[bid]['name']})
            else:
                item = self.d.item(dict(x, count=-1))
                item['kind'] = 'item'
                if count > 0:
                    item['count'] = count
                out.append(item)
        return out


class Dialogue:
    """A stage's cutscenes: ConfigDataDialogueInfo lines chained by NextID from its StartDialogID (before the
    battle) and EndDialogID (after). A line's speaker is its left character at Position 1, its right one at
    Position 2; no position is narration. The game's skip summary (SkipMessageInfo) sums a scene up."""

    def __init__(self, con):
        self.rows = {r['ID']: r for r in con.execute(
            'SELECT ID, NextID, Position, LeftNameStrKey_EN, RightNameStrKey_EN, WordsStrKey_EN, SkipMessageID '
            'FROM ConfigDataDialogueInfo')}
        self.skips = dict(con.execute('SELECT ID, WordsStrKey_EN FROM ConfigDataSkipMessageInfo'))
        self.scenes = {}

    def scene(self, start):
        if start in self.scenes:
            return self.scenes[start]
        lines, seen, i, skip = [], set(), start, None
        while i in self.rows and i not in seen:
            seen.add(i)
            r = self.rows[i]
            skip = skip or r['SkipMessageID']
            words = text(r['WordsStrKey_EN'])
            if words:
                who = {1: r['LeftNameStrKey_EN'], 2: r['RightNameStrKey_EN']}.get(r['Position'])
                # <yellow>term</yellow> highlights a term; kept for the page to style.
                lines.append([text(who) or '', clean(words)])
            i = r['NextID']
        sc = {'lines': lines}
        summary = text(self.skips.get(skip))
        # Scenes without one of their own say "Default prompt message" (or "0").
        if summary and summary not in ('0', 'Default prompt message'):
            sc['summary'] = clean(summary)
        self.scenes[start] = sc if lines else None
        return self.scenes[start]

    def attach(self, st, start, end):
        """Adds the stage's scenes ({id, when, summary, n}); their lines go in its dialogue file."""
        scenes = []
        for when, sid in (('before', start), ('after', end)):
            sc = sid and self.scene(sid)
            if sc:
                scenes.append(dict({'id': sid, 'when': when, 'n': len(sc['lines'])},
                                   **({'summary': sc['summary']} if 'summary' in sc else {})))
        if scenes:
            st['scenes'] = scenes

    def write(self, key, stages):
        """data/story/dialogue/<key>.js: StoryDialogue[key] = {scene id: [[speaker, text], ...]}."""
        out = {s['id']: self.scenes[s['id']]['lines'] for st in stages for s in st.get('scenes', [])}
        if not out:
            return 0
        with open(os.path.join(DIALOGUE, key + '.js'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('(window.StoryDialogue = window.StoryDialogue || {})[%s] = ' % json.dumps(key))
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
            f.write(';\n')
        return sum(len(v) for v in out.values())


def chapters(con, dialogue):
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
            dialogue.attach(st, w['StartDialogID'], w['EndDialogID'])
            stages.append(st)
        chapter['stages'] = stages
        out.append(chapter)
    return out


def run_dates(con):
    """Activity ID -> (start, end) dates ("2026-09-10") from its operational activity's open time."""
    times = {r['ID']: r for r in con.execute('SELECT * FROM ConfigDataCommonFuncOpenTimeInfo')}
    out = {}
    for r in con.execute("SELECT * FROM ConfigDataOperationalActivityInfo "
                         "WHERE ActivityType = 'OperationalActivityType_PlotActivity'"):
        t = times.get(r['OpenTimeInfoId'])
        parms = json.loads(r['OperationalActivityParms'] or '[]')
        # An event not yet run on global has a placeholder year (2098).
        if t and parms and t['ValidStartTime'] and not t['ValidStartTime'].startswith('209'):
            day = lambda s: '%04d-%02d-%02d' % tuple(int(x) for x in s.split()[0].split('/'))
            out[parms[0]['P1']] = (day(t['ValidStartTime']), day(t['ValidEndTime']))
    return out


def events(con, dialogue):
    rewards = Rewards(con)
    dates = run_dates(con)
    difficulties = dict(con.execute('SELECT ID, NameStrKey_EN FROM ConfigDataPlotActivityLevelDifficultyInfo '
                                    'WHERE ID IS NOT NULL'))
    out, by_name = [], {}
    for a in con.execute('SELECT * FROM ConfigDataPlotActivityInfo ORDER BY ID').fetchall():
        name = text(a['NameStrKey_EN'])
        parts = []
        groups = json.loads(a['PlotLevelGroupList'] or '[]') + json.loads(a['ChallengeLevelGroupList'] or '[]')
        for gid in groups:
            g = con.execute('SELECT * FROM ConfigDataPlotActivityLevelGroupInfo WHERE ID = ?', (gid,)).fetchone()
            levels = [con.execute('SELECT * FROM ConfigDataPlotActivityLevelInfo WHERE ID = ?', (i,)).fetchone()
                      for i in json.loads(g['LevelList'] or '[]')]
            levels = [l for l in levels if l]
            # Story groups: the story stages, and challenge stages that play out a story (cutscenes).
            if g['PlotActivityLevelGroupType'] != 'PlotActivityLevelGroupType_Plot' and \
                    not any(l['StartDialogID'] or l['EndDialogID'] for l in levels):
                continue
            stages = []
            for l in levels:
                st = {'id': l['ID'], 'kind': 'main'}
                if text(l['Number']):
                    st['code'] = text(l['Number'])
                if text(l['NameStrKey_EN']):
                    st['name'] = clean(text(l['NameStrKey_EN']))
                # The title is often the name again or "<Event> Story Stage 1"; otherwise it's a
                # date ("XC 119, March 9") or a heading worth keeping.
                title = text(l['TitleStrKey_EN'])
                if title and title != st.get('name') and 'Story Stage' not in title:
                    st['date' if title.startswith('XC ') else 'subtitle'] = clean(title)
                if text(l['DescStrKey_EN']) and l['DescStrKey_EN'] != l['NameStrKey_EN']:
                    st['text'] = clean(text(l['DescStrKey_EN']))
                battles = [con.execute('SELECT * FROM ConfigDataPlotActivityLevelBattleInfo WHERE ID = ?', (b,))
                           .fetchone() for b in json.loads(l['LevelBattleIdList'] or '[]')]
                battles = [b for b in battles if b]
                where = '%s %s' % (name, st.get('name'))
                tiers = []
                for b in battles:
                    r = [x for d in json.loads(b['RewardDropIds'] or '[]') for x in rewards.get(d, where)]
                    if r:
                        tiers.append({'name': text(difficulties.get(b['Difficulty'])) or '', 'rewards': r})
                if len(tiers) > 1 and all(t['name'] for t in tiers):
                    st['tiers'] = tiers
                elif tiers:
                    st['rewards'] = tiers[0]['rewards']
                dialogue.attach(st, l['StartDialogID'], l['EndDialogID'])
                stages.append(st)
            if stages:
                parts.append({'name': text(g['NameStrKey_EN']), 'stages': stages})
        if not parts:
            continue
        # Hunters' Freedom names its stages by place ("ST Arena", again and again) and titles them:
        # the title is the stage's name there and the name its location.
        names = [s.get('name') for p in parts for s in p['stages']]
        if len(set(names)) < len(names):
            for s in (s for p in parts for s in p['stages'] if s.get('subtitle')):
                s['name'], s['location'] = s.pop('subtitle'), s['name']
        event = {'id': a['ID'], 'name': name}
        if a['ID'] in dates:
            event['start'], event['end'] = dates[a['ID']]
        event['parts'] = parts
        # A rerun replays the same story; it takes the original's place, with its rewards and the original's date.
        if name in by_name:
            first = by_name[name]
            event['id'], event['rerun'] = first['id'], event.get('start')
            event['start'], event['end'] = first.get('start'), first.get('end')
            out[out.index(first)] = event
            continue
        by_name[name] = event
        out.append(event)
    return out


def option(con, o):
    """An encounter choice: "Search for something useful\n[Choose 1 weapon to take]" -> the choice, its
    effect and what happens (the option's own outcome text, or its results')."""
    lines = clean(text(o['ContentStrKey_EN']) or '').split('\n')
    out = {'text': lines[0].strip()}
    effect = ' '.join(l.strip() for l in lines[1:] if l.strip()).strip('[]')
    if effect:
        out['effect'] = effect
    outcomes = [text(o['SelectedResultDescStrKey_EN'])]
    if not outcomes[0]:
        outcomes = []
        for r in json.loads(o['ResultInfoList'] or '[]'):
            row = con.execute('SELECT SelectedResultDescStrKey_EN FROM ConfigDataRoguelikeEventOptionResultInfo '
                              'WHERE ID = ?', (r['Id'],)).fetchone()
            if row and text(row[0]) and text(row[0]) not in outcomes:
                outcomes.append(text(row[0]))
    if outcomes:
        out['outcome'] = clean('\n'.join(outcomes))
    return out


def border_conflict(con):
    # Every difficulty repeats the same text under new IDs; each distinct text is kept once, in ID order.
    def post(pid):
        p = pid and con.execute('SELECT TitleStrKey_EN, DescStrKey_EN FROM ConfigDataActionGridPostEventInfo '
                                'WHERE ID = ?', (pid,)).fetchone()
        return p and text(p[1]) and {'name': text(p[0]), 'text': clean(text(p[1]))}

    bosses, seen, found = [], set(), set()
    for b in con.execute('SELECT * FROM ConfigDataRoguelikeBossInfo ORDER BY ID').fetchall():
        key = (b['NameStrKey_EN'], b['DescStrKey_EN'])
        if key in seen:
            continue
        seen.add(key)
        foes = []
        for p in json.loads(b['LevelPoolInfoList'] or '[]'):
            r = con.execute('SELECT * FROM ConfigDataRoguelikeBossLevelPoolInfo WHERE ID = ?', (p['PoolId'],)).fetchone()
            if not r or not text(r['DescStrKey_EN']):
                continue
            tier = text(r['DifficultyStrKey_EN'])
            same = next((f for f in foes if f['text'] == clean(text(r['DescStrKey_EN']))), None)
            # "Border Bandits - Normal/Hard/Extreme" share one write-up: one foe fought at several tiers.
            if same:
                same['tiers'].append(tier)
                continue
            foe = {'name': re.sub(r' - (Normal|Hard|Extreme|Inferno)$', '', text(r['NameStrKey_EN'])),
                   'tiers': [tier], 'text': clean(text(r['DescStrKey_EN']))}
            # BossImage "Pilot_11002A_Raw" is the full art; the page shows its bust (_half).
            if text(r['BossImage']):
                foe['portrait'] = re.sub(r'_Raw$', '', text(r['BossImage'])) + '_half'
            loot = post(r['ActionGridBossPostEventId'])
            if loot:
                foe['found'] = loot
                found.add((loot['name'], loot['text']))
            foes.append(foe)
        bosses.append({'name': text(b['NameStrKey_EN']).strip('"'), 'text': clean(text(b['DescStrKey_EN'])),
                       'foes': foes})

    # An encounter is one scene in steps: events sharing a name ("Scrap Dash": the bet, the pick, one more
    # round?), then for a battle its opening (ExtraBattleInfo, same name) and the "<Name> - Victory"/"- Defeat"/
    # "- Withdraw" events after it.
    scenes, seen = {}, set()
    for e in con.execute('SELECT * FROM ConfigDataRoguelikeEventInfo ORDER BY ID').fetchall():
        key = (e['NameStrKey_EN'], e['DescStrKey_EN'])
        if key in seen or not text(e['DescStrKey_EN']):
            continue
        seen.add(key)
        name, _, after = text(e['NameStrKey_EN']).partition(' - ')
        opts = [con.execute('SELECT * FROM ConfigDataRoguelikeEventOptionInfo WHERE ID = ?', (o,)).fetchone()
                for o in json.loads(e['OptionList'] or '[]')]
        step = {'text': clean(text(e['DescStrKey_EN'])), 'options': [option(con, o) for o in opts if o]}
        if after:
            step['label'] = after
        scene = scenes.setdefault(name, {'name': name, 'before': [], 'after': []})
        scene['after' if after else 'before'].append(step)
    # Each difficulty retranslates a battle's opening slightly; the first is kept.
    for x in con.execute('SELECT * FROM ConfigDataRoguelikeExtraBattleInfo ORDER BY ID').fetchall():
        name = text(x['NameStrKey_EN'])
        scene = scenes.setdefault(name, {'name': name, 'before': [], 'after': []})
        if text(x['DescStrKey_EN']) and 'battle' not in scene:
            scene['battle'] = {'label': 'Battle', 'text': clean(text(x['DescStrKey_EN']))}
    encounters = []
    for s in scenes.values():
        steps = s['before'] + ([s['battle']] if 'battle' in s else []) + s['after']
        encounters.append({'name': s['name'], 'steps': steps})

    # Map tiles' finds, but not the bosses' (shown with them) nor the designers' "Zone 1 Collection Pool" rows.
    discoveries, seen = [], set(found)
    for p in con.execute('SELECT TitleStrKey_EN, DescStrKey_EN FROM ConfigDataActionGridPostEventInfo ORDER BY ID'):
        t, d = text(p[0]), text(p[1])
        if not d or (t, clean(d)) in seen or 'Collection Pool' in (t or '') or d.startswith('Test '):
            continue
        seen.add((t, clean(d)))
        discoveries.append({'name': t, 'text': clean(d)})
    return {'bosses': bosses, 'encounters': encounters, 'discoveries': discoveries}


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    w = world(con)
    dialogue = Dialogue(con)
    chs = chapters(con, dialogue)
    evs = events(con, dialogue)
    bc = border_conflict(con)
    data = {'world': w, 'chapters': chs, 'events': evs, 'borderConflict': bc}

    os.makedirs(HERE, exist_ok=True)
    # One dialogue file per chapter (ch-<id>) and event (ev-<id>), fetched when a cutscene is first opened.
    os.makedirs(DIALOGUE, exist_ok=True)
    for old in os.listdir(DIALOGUE):
        os.remove(os.path.join(DIALOGUE, old))
    lines = sum(dialogue.write('ch-%d' % c['id'], c['stages']) for c in chs) + \
        sum(dialogue.write('ev-%d' % e['id'], [s for p in e['parts'] for s in p['stages']]) for e in evs)
    print('Wrote %s: %d dialogue lines in %d files (%d KB)' % (
        DIALOGUE, lines, len(os.listdir(DIALOGUE)),
        sum(os.path.getsize(os.path.join(DIALOGUE, f)) for f in os.listdir(DIALOGUE)) // 1024))
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.StoryData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d world entries, %d chapters, %d stages, %d events, Border Conflict %d bosses / '
          '%d encounters / %d discoveries (%d KB)' % (
              OUT, sum(len(c['entries']) for c in w), len(chs), sum(len(c['stages']) for c in chs), len(evs),
              len(bc['bosses']), len(bc['encounters']), len(bc['discoveries']), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
