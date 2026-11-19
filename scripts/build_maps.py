"""Battle map previews -> data/maps/maps.json / maps.js (MapsData, the "View map" popup on boss pages).

    python scripts/build_maps.py

For each Armed Conquest stage listed in STAGES, every difficulty's battle map (ConfigDataRaidDungeonInfo level
lists -> ConfigDataRaidDungeonLevelInfo.BattleID) is read from the global client's bundles:
  - gameboard_abs.b: the board (m_cols x m_rows, per-cell m_cellType = GridType)
  - battlescene_abs.b: what the map places (m_actorInfos, x/y), the player deploy slots (m_formationInfos),
    scene objects (m_sceneObjects; grid index = x * 1000 + y)
plus the units its scene triggers summon (BattleSceneAction, from extract_maps.py; action groups run where a Group action calls them), named from the stats.db tables.
Needs UnityPy and the MRT_FieldWiki folder (its RebuildGameUpdate/settings.py has the game path and bundle key).
Seasons: SEASONS below, or the AC numbers given on the command line.
Clearance Ops: every chapter in data/bosses/bosses.json (its `battle`), as stage "co-<chapter>": one map per route (see main).
Events: every battle stage of every story event (ConfigDataPlotActivityInfo), as stage "ev-<level ID>": one map per difficulty;
build_events.py adds them to the stages in events.json, so run this first. Stages with no units (story only) get none.
"""
import json
import os
import re
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REBUILD = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate')
STATS = os.path.join(REBUILD, 'out', 'stats.db')
OUT = os.path.join(ROOT, 'data', 'maps')
sys.path.insert(0, REBUILD)

import UnityPy  # noqa: E402
import settings  # noqa: E402
import extract_maps  # noqa: E402

# Armed Conquest seasons to export (every stage of each): None = every season in ConfigDataRaidDungeonInfo.
# `python scripts/build_maps.py 12 13` exports only those (and replaces maps.json), for testing.
SEASONS = None
RAID_LEVELS = [('Normal', 'LevelList'), ('Hard', 'HardLevelList'), ('Extreme', 'HellLevelList'),
               ('Inferno', 'Difficult4LevelList')]
# Story events' level groups (ConfigDataPlotActivityInfo), as in build_events.py.
EVENT_GROUPS = ['PlotLevelGroupList', 'ChallengeLevelGroupList', 'DailyLevelGroupList']
GRID_TYPES = {0: 'ground', 1: 'concrete', 2: 'wetland', 3: 'sand', 4: 'shoal', 5: 'ocean', 6: 'pit',
              7: 'low', 8: 'high', 10: 'high', 11: 'pit', 12: 'pit', 13: 'high'}
ASSETS = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
UI_BUNDLES = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'ExportAssetBundle')
# Small square icons for the map cells, kept in the assets repo; missing ones are exported from the client's UI bundles.
#   pilots: "<CharacterPicture.Icon>_head" (ui_uipiloticons_abs_*.b), the avatars the other pages use too
#   vehicles / scene objects: "<VehicleInfo.Icon>" / "Icon_<model name>_head" (ui_uiimages_uiicons_vehicletype_abs.b)
PILOT_DIR = 'data/unlisted/pilot_images_other/Head'
VEHICLE_DIR = 'data/unlisted/vehicles'
ICON_BUNDLES = {PILOT_DIR: 'ui_*piloticons_abs_*.b', VEHICLE_DIR: 'ui_uiimages_uiicons_vehicletype_abs.b'}
# A scene object with no icon of its own (e.g. the Baffle Cart, ITA_BlockWall) gets the game's generic barrier.
OBJECT_FALLBACK = 'Icon_Block_Barricade1'
# A unit's team when it isn't an enemy (team 4): 1 = on the player's side (e.g. a base to defend), 7 = neutral.
TEAM_KIND = {1: 'ally', 7: 'neutral'}
BOARD_BUNDLE = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'ExportAssetBundle', 'gameboard_abs.b')


def load_assets(path, names):
    """{m_Name: m_data} of the bundle's MonoBehaviours named in names"""
    out = {}
    for o in UnityPy.load(path).objects:
        if o.type.name != 'MonoBehaviour':
            continue
        tt = o.read_typetree()
        if tt.get('m_Name') in names:
            out[tt['m_Name']] = tt['m_data']
    return out


def export_icons(wanted):
    """{assets dir: {texture name}} -> {(dir, name) found}: copies the missing ones out of the client's bundles."""
    import glob
    have = set()
    for d, names in wanted.items():
        missing = set()
        for n in names:
            if os.path.exists(os.path.join(ASSETS, d, n + '.png')):
                have.add((d, n))
            else:
                missing.add(n)
        if not missing:
            continue
        os.makedirs(os.path.join(ASSETS, d), exist_ok=True)
        for path in sorted(glob.glob(os.path.join(UI_BUNDLES, ICON_BUNDLES[d]))):
            for o in UnityPy.load(path).objects:
                if o.type.name == 'Texture2D':
                    t = o.read()
                    if t.m_Name in missing:
                        t.image.save(os.path.join(ASSETS, d, t.m_Name + '.png'))
                        missing.discard(t.m_Name)
                        have.add((d, t.m_Name))
                        print('exported', d + '/' + t.m_Name + '.png', '-> assets repo (commit and push it)')
            if not missing:
                break
        for n in missing:
            print('icon not in the client bundles:', d + '/' + n)
    return have


def turns_of(conds):
    """the Round conditions of a trigger (several in a GroupBegin..GroupEnd = any of them)"""
    return sorted({c['p'][0] for c in conds if c['type'] == 'Round'})


UNIT_STATE = {'ActorAlreadyDead', 'ActorLive', 'ActorLiveGreat'}


def holds(conds, turn, board):
    """Whether a trigger's conditions hold on a turn, given the blackboard; None when they test something other
    than the turn and the blackboard (a unit dying, a region, ...). Conditions between GroupBegin and GroupEnd are
    alternatives; the rest must all hold."""
    def one(c):
        t, v = c['type'], c['p'][0]
        if t == 'Round':
            ok = turn == v
        elif t == 'RoundGreat':
            ok = turn > v
        elif t == 'BlackBoardKeyValueEqual':
            ok = board.get(c['s1'], 0) == v
        elif t == 'BlackBoardKeyValueGreat':
            ok = board.get(c['s1'], 0) > v
        elif t == 'SceneObjectState':
            ok = board.get('@' + c['s1']) == c['s2']
        elif t in UNIT_STATE:
            return True  # whether a unit stands: described separately ("only while X stands")
        else:
            return None
        return ok != bool(c['not'])
    result, group = True, None
    for c in conds:
        if c['type'] == 'GroupBegin':
            group = []
        elif c['type'] == 'GroupEnd':
            if group is not None:
                if None in group:
                    return None
                result = result and any(group)
            group = None
        else:
            r = one(c)
            if group is not None:
                group.append(r)
            elif r is None:
                return None
            else:
                result = result and r
    return result


SIM_TURNS = 12


def turn_text(turns):
    """('turn 2 or 7', 'T2/7'); a run to the end of the simulation is 'every turn from turn 5', 'T5+'"""
    if len(turns) > 2 and turns[-1] == SIM_TURNS and turns == list(range(turns[0], SIM_TURNS + 1)):
        return ('every turn from turn %d' % turns[0] if turns[0] > 1 else 'every turn'), 'T%d+' % turns[0]
    return 'turn ' + ' or '.join(map(str, turns)), 'T' + '/'.join(map(str, turns))


def scene_actions(con):
    """TEMP table SceneAction: BattleSceneAction with every Group action (str1 = an action group's name) replaced by
    the group's actions, run by the calling trigger (its index, event, conditions and desc; action index
    caller * 1000 + the group's), nested groups included. The groups themselves stay, as event 'ActionGroup'."""
    con.execute('CREATE TEMP TABLE SceneAction AS SELECT * FROM BattleSceneAction')
    cols = [r[1] for r in con.execute('PRAGMA table_info(BattleSceneAction)')]
    groups = {}
    for r in con.execute("SELECT * FROM BattleSceneAction WHERE event = 'ActionGroup' ORDER BY trigger_index, action_index"):
        r = dict(zip(cols, r))
        groups.setdefault((r['map'], r['trigger_desc']), []).append(r)
    for _ in range(3):  # nested groups
        calls = [dict(zip(cols, r)) for r in con.execute("SELECT * FROM SceneAction WHERE action = 'Group' AND event != 'ActionGroup'")]
        con.execute("DELETE FROM SceneAction WHERE action = 'Group' AND event != 'ActionGroup'")
        added = []
        for c in calls:
            for g in groups.get((c['map'], c['str1']), []):
                added.append(dict(g, trigger_index=c['trigger_index'], action_index=c['action_index'] * 1000 + g['action_index'],
                                  event=c['event'], repeatable=c['repeatable'], conds_json=c['conds_json'], trigger_desc=c['trigger_desc']))
        if not added:
            break
        con.executemany('INSERT INTO SceneAction VALUES (%s)' % ','.join('?' * len(cols)), [[r[k] for k in cols] for r in added])


def simulate(con, mp, last=SIM_TURNS):
    """{(trigger, action): [turns]}: the actions of turn-start triggers that only test the turn and the blackboard,
    run over turns 1..last in trigger order (SetBlackBoardKeyValue: str1 = p1; AddOrRemoveSceneObject opens or
    removes the scene object str1, which SceneObjectState tests). A trigger that isn't repeatable runs once."""
    triggers = {}
    for ti, ai, event, rep, action, p1, str1, str2, conds in con.execute(
            'SELECT trigger_index, action_index, event, repeatable, action, p1, str1, str2, conds_json FROM SceneAction '
            'WHERE map = ? ORDER BY trigger_index, action_index', (mp,)):
        t = triggers.setdefault(ti, {'event': event, 'repeat': rep, 'conds': json.loads(conds or '[]'), 'actions': []})
        t['actions'].append((ai, action, p1, str1, str2))
    board, done, fired = {}, set(), {}

    def run(ti, t, turn):
        done.add(ti)
        for ai, action, p1, str1, str2 in t['actions']:
            fired.setdefault((ti, ai), []).append(turn)
            if action == 'SetBlackBoardKeyValue':
                board[str1] = p1
            elif action == 'AddOrRemoveSceneObject':  # a scene object (e.g. a Reinforcement Alert) opened or removed
                board['@' + str1] = str2 or None
    for ti, t in sorted(triggers.items()):  # setup, before the first turn
        if t['event'] in ('FormationSetupStart', 'BattleStart') and holds(t['conds'], 0, board):
            run(ti, t, 0)
    for turn in range(1, last + 1):
        for ti, t in sorted(triggers.items()):
            if t['event'] != 'BattleTurnStart' or (ti in done and not t['repeat']):
                continue
            if holds(t['conds'], turn, board):
                run(ti, t, turn)
    return fired


def died(conds):
    """the refs whose death a trigger waits for (CurrDeadActorIsOneOf X, or ActorLive / ActorLiveGreat X negated)"""
    out = set()
    for c in conds:
        if c['type'] == 'CurrDeadActorIsOneOf' or (c['type'] in ('ActorLive', 'ActorLiveGreat') and c['not']):
            out.update(r.lstrip('#') for r in (c.get('s1') or '').split(',') if r)
    return out


def cause(event, conds, name):
    """what makes an event-driven trigger fire, in words ('Libby is destroyed'), or None"""
    out = []
    for c in conds:
        t, p, s1 = c['type'], c['p'], (c.get('s1') or '').lstrip('#')
        if t == 'CurrDeadActorIsOneOf' or (t in ('ActorLive', 'ActorLiveGreat') and c['not'] and event == 'ActorDie'):
            out.append('%s is destroyed' % ' or '.join(name(r) for r in s1.split(',') if r))
        elif t == 'ActorBodyPartHpGreat' and c['not']:
            out.append("%s's HP falls to %d%% or less" % (name(s1), p[1] // 100))
        elif t == 'ActorExistWapPartDestroyed':
            out.append('a part of %s is destroyed' % name(s1))
        elif t == 'ActorBeAttackedBySkill':
            out.append('%s is hit by a certain skill' % name(s1))
        elif t == 'ActorHasBuf' and not c['not']:
            out.append('%s gains a certain effect' % name(s1))
        elif t == 'OneOfActorInRegion' and not c['not']:
            out.append('a unit reaches a marked area')
        elif t == 'Round' and event in ('TeamEnd', 'BattleTurnEnd'):
            out.append('the end of turn %d' % p[0])
    out = list(dict.fromkeys(out))
    return ' or '.join(out) if out else None


def bb_allows(conds, bb):
    """False when a condition outside any GroupBegin/GroupEnd (an OR group) needs a blackboard value the route doesn't set"""
    depth = 0
    for c in conds:
        if c['type'] == 'GroupBegin':
            depth += 1
        elif c['type'] == 'GroupEnd':
            depth -= 1
        elif depth == 0 and c['type'] == 'BlackBoardKeyValueEqual' and c['s1'] in bb:
            if (bb[c['s1']] == c['p'][0]) == bool(c['not']):
                return False
    return True


def reinforcements_of(con, mp, scene, units, unit, bb=None, skip_groups=()):
    """Units a map's scene triggers summon, with where and when.

    Where: Summon has the tile (p1); SummonAtSceneObject places the unit on the scene object named str3 (or str1, the
    summoned unit's ref): usually a "Reinforcement Alert" an AddOrRemoveSceneObject (str2 'Open') puts on tile p1,
    else one of the map's own scene objects.
    When, from the trigger conditions:
      the turn and the blackboard only (simulate)  -> on those turns
      a unit's death (directly, or the alert's)    -> the turn after it dies (the summoned unit itself: it respawns)
      ActorAlreadyDead / ActorLive X               -> only while X stands / after X is destroyed
    One entry per (unit ref, tile): the same unit summoned by several triggers is merged.
    bb: the blackboard values a Clearance Ops route sets (summons needing other values are left out); skip_groups: the
    route action groups (their summons are the route's starting units). Summons at formation setup aren't reinforcements,
    and an action group's count only where a trigger calls it (SceneAction, see scene_actions).
    """
    bb = bb or {}
    names = {u['ref']: u['name'] for u in units}
    rows = []
    for ti, ai, event, action, p1, p2, p3, p4, str1, str3, conds, desc in con.execute(
            "SELECT trigger_index, action_index, event, action, p1, p2, p3, p4, str1, str3, conds_json, trigger_desc FROM SceneAction "
            "WHERE map = ? AND action IN ('SummonAtSceneObject', 'Summon') AND event != 'FormationSetupStart'", (mp,)):
        if event == 'ActionGroup' or desc in skip_groups or not bb_allows(json.loads(conds or '[]'), bb):
            continue
        if action == 'Summon':  # [tile, team, actor type, config id]
            rows.append((ti, ai, event, str1, None, p1, p2, p3, p4, conds))
        else:                   # [team, actor type, config id]
            rows.append((ti, ai, event, str1, str3 or str1, None, p1, p2, p3, conds))
    for r in rows:
        names.setdefault(r[3].lstrip('#'), unit(r[7], r[8])['name'])
    pos = {u['ref']: (u['x'], u['y']) for u in units}
    dupes = {n for n in names.values() if list(names.values()).count(n) > 1}

    def name(r, here=None):
        """a unit by its ref: 'the Mercenary here' / 'Signal Transmitter (7, 11)' when the name alone is ambiguous"""
        r = r.lstrip('#')
        n = names.get(r, r)
        if here and pos.get(r) == here:
            return 'the %s here' % n
        return '%s (%d, %d)' % ((n,) + pos[r]) if n in dupes and r in pos else n

    alerts = {}
    for marker, p1, event, conds in con.execute(
            "SELECT str1, p1, event, conds_json FROM SceneAction WHERE map = ? AND action = 'AddOrRemoveSceneObject' "
            "AND str2 = 'Open'", (mp,)):
        alerts.setdefault(marker, []).append((p1, event, json.loads(conds or '[]')))
    placed = {o['m_refName']: o['m_gridIndex'] for o in scene['m_sceneObjects']}
    fired = simulate(con, mp)
    setters = {}  # (blackboard key, value) -> [(event, conds)] of the triggers that set it
    for event, p1, str1, conds in con.execute(
            "SELECT event, p1, str1, conds_json FROM SceneAction WHERE map = ? AND action = 'SetBlackBoardKeyValue'", (mp,)):
        setters.setdefault((str1, p1), []).append((event, json.loads(conds or '[]')))

    merged = {}
    for ti, ai, event, ref, marker, grid, team, atype, cid, conds in rows:
        conds = json.loads(conds or '[]')
        u = unit(atype, cid)
        u['ref'] = ref.lstrip('#')
        if team in TEAM_KIND:
            u['kind'] = TEAM_KIND[team]
        opened = alerts.get(marker, []) if marker else []
        if grid is None:
            grid = opened[0][0] if opened else placed.get(marker)
        if grid is not None:
            u.update({'x': grid // 1000, 'y': grid % 1000})
        here = (u.get('x'), u.get('y'))
        when, tag = [], ''
        turns = sorted(set(fired.get((ti, ai), []))) if event == 'BattleTurnStart' else []
        dead = set()
        for _, ev, cs in opened:
            if ev == 'ActorDie':
                dead |= died(cs)
        dead |= died(conds)
        if u['ref'] in dead and len(turns) > 3:  # re-summoned every turn while it is down: a respawn
            turns = []
        if turns:
            text, tag = turn_text(turns)
            when.append(('arrives at the start of ' if text.startswith('turn') else 'arrives at the start of ') + text)
            alert_turns = sorted({t for _, ev, c in opened if ev == 'BattleTurnStart' for t in turns_of(c)})
            if alert_turns:
                when.append('a Reinforcement Alert marks this tile from turn ' + ' or '.join(map(str, alert_turns)))
        elif dead:
            others = sorted(d for d in dead if d != u['ref'])
            if others:
                when.append(('arrives the turn after %s is destroyed (a Reinforcement Alert marks this tile meanwhile)'
                             if opened else 'arrives when %s is destroyed') % ' or '.join(name(d, here) for d in others))
                tag = '+1'
            if u['ref'] in dead:
                when.append('then again each time it is destroyed' if others else 'respawns here after it is destroyed')
                tag = '↻'
        if not when:  # an event: the summon's own, or what sets its blackboard key / opens its alert
            sources = [(event, conds)] if event != 'BattleTurnStart' else []
            for c in conds:
                if c['type'] == 'BlackBoardKeyValueEqual':
                    sources += setters.get((c['s1'], c['p'][0]), [])
            sources += [(ev, cs) for _, ev, cs in opened]
            why = [w for w in (cause(ev, cs, lambda r: name(r, here)) for ev, cs in sources) if w]
            why = [part for w in why for part in w.split(' or ')]  # rejoined with ' or ' below
            ends = sorted({int(w.rsplit(' ', 1)[1]) for w in why if w.startswith('the end of turn ')})
            why = [w for w in dict.fromkeys(why) if not w.startswith('the end of turn ')]
            if ends and not why:
                text, tag = turn_text(ends)
                when.append('arrives at the end of ' + text)
            elif why:
                why = ' or '.join(why + ['the end of turn %d' % t for t in ends])
                when.append(('arrives at the start of the turn after %s' if event == 'BattleTurnStart' else 'arrives when %s') % why)
                tag = '+1'
        for c in conds:
            s1 = (c.get('s1') or '').lstrip('#')
            if c['type'] in ('ActorAlreadyDead', 'ActorLive') and s1 and s1 not in dead:
                alive = (c['type'] == 'ActorLive') != bool(c['not'])
                when.append(('only while %s stands' if alive else 'only after %s is destroyed') % name(s1, here))
        if not when:
            when.append('arrives when a scripted event fires')
        text = '; '.join(when)
        u['when'] = text[0].upper() + text[1:] + '.'
        u['tag'] = tag or '!'
        key = (u['ref'], here)
        if key in merged:  # the same unit from another trigger: keep the more specific text
            if merged[key]['tag'] == '!' and u['tag'] != '!':
                merged[key] = u
            continue
        merged[key] = u
    return list(merged.values())


def main():
    con = sqlite3.connect(STATS)
    scene_actions(con)
    one = lambda sql, *a: (con.execute(sql, a).fetchone() or [None])[0]

    icons = {PILOT_DIR: set(), VEHICLE_DIR: {OBJECT_FALLBACK}}
    occupy = {t: json.loads(o or '[]') for t, o in con.execute('SELECT GridOccupyType, EdgeGridOffsetList FROM ConfigDataActorGridOccupyTypeInfo') if t}

    def footprint(kind):
        """the extra tiles (dx, dy) a GridOccupyType covers besides its own, e.g. a Titan's 2x2"""
        return [[o.get('x', 0), o.get('y', 0)] for o in occupy.get(kind, [])]

    def icon(d, name):
        icons[d].add(name)
        return [d, name]  # resolved to a path (or None) once the icons are exported

    def unit(atype, cid):
        """name, kind, icon and short facts of a placed actor"""
        if atype == 3:
            name, desc, ic, occ = con.execute('SELECT NameStrKey_EN, DescStrKey_EN, Icon, GridOccupyType FROM ConfigDataVehicleInfo WHERE ID = ?', (cid,)).fetchone()
            return {'name': name, 'kind': 'turret', 'desc': desc, 'avatar': ic and icon(VEHICLE_DIR, ic), 'tiles': footprint(occ)}
        pt, occ = con.execute('SELECT PilotTemplateId, GridOccupyType FROM ConfigDataTacticalUnitTemplateInfo WHERE ID = ?', (cid,)).fetchone() or (None, None)
        pic = one('SELECT Icon FROM ConfigDataCharacterPicture WHERE ID = '
                  '(SELECT CharacterPictureId FROM ConfigDataPilotTemplateInfo WHERE ID = ?)', pt)
        return {'name': one('SELECT NameStrKey_EN FROM ConfigDataPilotTemplateInfo WHERE ID = ?', pt), 'kind': 'enemy',
                'avatar': pic and icon(PILOT_DIR, pic + '_head'), 'tiles': footprint(occ)}

    stages, wanted = {}, {}
    seasons = [int(a) for a in sys.argv[1:]] or SEASONS or [r[0] for r in con.execute('SELECT ID FROM ConfigDataRaidDungeonInfo ORDER BY ID')]
    for ac in seasons:
        row = con.execute('SELECT %s FROM ConfigDataRaidDungeonInfo WHERE ID = ?' % ', '.join(c for _, c in RAID_LEVELS), (ac,)).fetchone()
        if not row:
            print('AC%d: not in ConfigDataRaidDungeonInfo' % ac)
            continue
        for diff_name, levels in zip([d for d, _ in RAID_LEVELS], row):
            for slot, level in enumerate(json.loads(levels or '[]'), 1):
                mp = one('SELECT BattleID FROM ConfigDataRaidDungeonLevelInfo WHERE ID = ?', level)
                stages.setdefault('ac-%d-%d' % (ac, slot), {})[diff_name] = mp
                wanted[str(mp)] = str(one('SELECT GameBoardId FROM ConfigDataBattleMapInfo WHERE ID = ?', mp))

    # Clearance Ops: one battle map per chapter (skipped when testing AC seasons), played by routes: the choices of the
    # dialog at the start (ConfigDataDialogChooseItem, e.g. "Regular Route", "Rear Ambush"), each an action group of
    # the scene that switches on its deploy slots and summons, removes and moves units. A fresh run takes the first;
    # the others open as the chapter is cleared. Each route is its own map, "<map>:<group>", under the route's name.
    routes = {}  # map -> [(group, name)]
    if not sys.argv[1:]:
        with open(os.path.join(ROOT, 'data', 'bosses', 'bosses.json'), encoding='utf-8') as f:
            chapters = json.load(f).get('clearance_ops', [])
        choices = {r: (i, n) for i, r, n in con.execute(
            'SELECT ID, BattleSceneDialogChooseItemRefName, WordsStrKey_EN FROM ConfigDataDialogChooseItem')}
        for c in chapters:
            mp = str(c['battle'])
            groups = {g for g, in con.execute("SELECT DISTINCT trigger_desc FROM BattleSceneAction WHERE map = ? AND event = 'ActionGroup' "
                                               "AND action = 'ActiveFormationPos'", (int(mp),))}
            routes[mp] = sorted(((g, choices[g][1]) for g in groups if g in choices), key=lambda r: choices[r[0]][0])
            stages['co-%d' % c['chapter']] = {n: '%s:%s' % (mp, g) for g, n in routes[mp]} or {'Normal': int(mp)}
            wanted[mp] = str(one('SELECT GameBoardId FROM ConfigDataBattleMapInfo WHERE ID = ?', int(mp)))

    # Story events: every battle stage of every event (ConfigDataPlotActivityInfo's story, challenge and daily level
    # groups), as "ev-<level ID>": {difficulty: map ID} ("Normal" when the stage has one battle). Picked up by
    # build_events.py, so a new event gets its maps with no change here. Story-only stages (no units) are dropped below.
    if not sys.argv[1:]:
        diff_names = dict(con.execute('SELECT ID, NameStrKey_EN FROM ConfigDataPlotActivityLevelDifficultyInfo WHERE ID IS NOT NULL'))
        for a_row in con.execute('SELECT %s FROM ConfigDataPlotActivityInfo ORDER BY ID' % ', '.join(EVENT_GROUPS)).fetchall():
            for gids in a_row:
                for gid in json.loads(gids or '[]'):
                    for lid in json.loads(one('SELECT LevelList FROM ConfigDataPlotActivityLevelGroupInfo WHERE ID = ?', gid) or '[]'):
                        tiers = {}
                        for bid in json.loads(one('SELECT LevelBattleIdList FROM ConfigDataPlotActivityLevelInfo WHERE ID = ?', lid) or '[]'):
                            b = con.execute('SELECT Difficulty, SubLevelDescStrKey_EN, BattleMapInfoList FROM ConfigDataPlotActivityLevelBattleInfo '
                                            'WHERE ID = ?', (bid,)).fetchone()
                            if not b:
                                continue
                            for m in json.loads(b[2] or '[]'):
                                mp = m['BattleMapID']
                                board = one('SELECT GameBoardId FROM ConfigDataBattleMapInfo WHERE ID = ?', mp)
                                if not board:
                                    continue
                                tier = diff_names.get(b[0]) or b[1] or 'Normal'
                                while tier in tiers:
                                    tier += '+'
                                tiers[tier] = mp
                                wanted[str(mp)] = str(board)
                        if tiers:
                            stages['ev-%d' % lid] = tiers

    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    scenes = load_assets(extract_maps.bundles()[-1][1], set(wanted))
    boards = load_assets(BOARD_BUNDLE, set(wanted.values()))

    def placed(atype, cid, ref, x, y, team):
        u = unit(atype, cid)
        u.update({'ref': ref.lstrip('#'), 'x': x, 'y': y, 'boss': bool(re.match(r'#?BOSS\d*$', ref))})
        if team in TEAM_KIND:
            u['kind'] = TEAM_KIND[team]
        return u

    out = {}
    for mp, bd in wanted.items():
        if mp not in scenes or bd not in boards:
            print('map %s (board %s): not in the client bundles, skipped' % (mp, bd))
            continue
        s, b = scenes[mp], boards[bd]
        cols, rows = b['m_cols'], b['m_rows']
        cells = ''.join('%x' % b['m_cellType'][y * cols + x] if b['m_cellType'][y * cols + x] < 16 else 'f'
                        for y in range(rows) for x in range(cols))
        objects = {}
        for o in s['m_sceneObjects']:
            name, model, occ = con.execute('SELECT NameStrKey_EN, Model, GridOccupyType FROM ConfigDataBattleSceneObjectInfo WHERE ID = ?',
                                           (o['m_sceneObjectId'],)).fetchone()
            objects[o['m_refName']] = {'x': o['m_gridIndex'] // 1000, 'y': o['m_gridIndex'] % 1000, 'name': name,
                                       'avatar': icon(VEHICLE_DIR, 'Icon_%s_head' % model.rsplit('/', 1)[-1]) if model else None,
                                       'tiles': footprint(occ)}
        formation = [f for f in s['m_formationInfos'] if not f['m_isAlternative']]
        route_groups = [g for g, _ in routes.get(mp, [])]
        for group in route_groups or [None]:
            units = {a['m_refName'].lstrip('#'): placed(a['m_actorType'], a['m_configId'], a['m_refName'], a['m_x'], a['m_y'], a['m_teamType'])
                     for a in s['m_actorInfos']}
            active, bb = [], {}
            if group:  # the route's actions, in order
                for act, p1, p2, p3, p4, str1 in con.execute(
                        "SELECT action, p1, p2, p3, p4, str1 FROM BattleSceneAction WHERE map = ? AND event = 'ActionGroup' "
                        "AND trigger_desc = ? ORDER BY trigger_index, action_index", (int(mp), group)):
                    ref = (str1 or '').lstrip('#')
                    if act == 'Summon':
                        units[ref] = placed(p3, p4, str1, p1 // 1000, p1 % 1000, p2)
                    elif act == 'RemoveActor':
                        units.pop(ref, None)
                    elif act == 'ActorMove' and ref in units:
                        units[ref].update({'x': p1 // 1000, 'y': p1 % 1000})
                    elif act == 'ActiveFormationPos':
                        active.append(str1)
                    elif act == 'SetBlackBoardKeyValue':
                        bb[str1] = p1
            units = list(units.values())
            reinforcements = reinforcements_of(con, int(mp), s, units, unit, bb, set(route_groups))
            # Deploy slots (PlayerN), numbered by name; a route's are the ones it switches on, in its order.
            slots = [f for f in formation if not group or f['m_refName'] in active]
            if group:
                slots.sort(key=lambda f: active.index(f['m_refName']))
            out['%s:%s' % (mp, group) if group else mp] = {
                'board': int(bd), 'cols': cols, 'rows': rows, 'cells': cells,
                'camera': s['m_cameraDirection'],
                'max_deploy': s['m_maxFormationSetupCount'] or len(slots),
                'units': units,
                'slots': [{'n': i + 1 if group else int(f['m_refName'][-1]), 'x': f['m_x'], 'y': f['m_y']} for i, f in enumerate(slots)],
                'objects': list(objects.values()),
                'reinforcements': reinforcements,
            }
    con.close()
    # Event stages: drop maps with nothing on them (story-only stages, e.g. H.I.V.E. 16-3) and those not exported.
    for key in [k for k in stages if k.startswith('ev-')]:
        tiers = {t: mp for t, mp in stages[key].items()
                 if str(mp) in out and (out[str(mp)]['units'] or out[str(mp)]['reinforcements'])}
        if tiers:
            stages[key] = tiers
        else:
            del stages[key]
    used = {str(mp) for t in stages.values() for mp in t.values()}
    out = {k: v for k, v in out.items() if k in used}
    have = export_icons(icons)
    for m in out.values():
        for u in m['units'] + m['reinforcements'] + m['objects']:
            a = u.get('avatar')
            if a and tuple(a) not in have and u in m['objects']:
                a = [VEHICLE_DIR, OBJECT_FALLBACK]
            u['avatar'] = '%s/%s.png' % tuple(a) if a and tuple(a) in have else None

    data = {'grid_types': GRID_TYPES, 'stages': stages, 'maps': out}
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'maps.json'), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'maps.js'), 'w', encoding='utf-8') as f:
        f.write('window.MapsData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('maps:', ', '.join(sorted(out)), '->', OUT)


if __name__ == '__main__':
    main()
