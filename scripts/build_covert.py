#!/usr/bin/env python3
"""The Covert Phantom page's data (Border Conflict's roguelike mode, a Misc.
page), from the global client's tables (RebuildGameUpdate/out/stats.db).
Writes data/covert/covert.json and covert.js (CovertData).

    python3 scripts/build_covert.py

Difficulties (ConfigDataRoguelikeDifficultyInfo: 30, 40, 50, 60, 70, Max):
unlock condition, the level your STs and weapons are set to, and the enemies'
usual level (the most common among its battles' enemies).

Areas (ConfigDataRoguelikeRegionInfo, ID 100<difficulty><slot>): every
difficulty has the same areas (Area 1, 2-1..2-3, 3-1..3-3, 4-1..4-4; 30 has no
Area 4) with the same action points, max stars and node layout, so an area is
kept once with the difficulties it's on. The areas a route picks between
(2-1, 2-2, 2-3) differ only in their node layout, which isn't shown, so they're
merged into one (Area 2) when their battles and bosses are the same. Its battles are the levels of the
nodes (ConfigDataRoguelikeActionGridInfo, walked from StartActionGridId through
ActionGridNeighborInfo), each with the star tiers of the nodes it's on; a
battle (by its battle map) is kept once with the difficulties it's on.

Bosses (BossIds -> ConfigDataRoguelikeBossInfo): two boss groups per area (one
on Max), each fought at tiers (Rookie, Veteran, Elite, Ace) unlocked by the
stars collected (BossLevelPoolInfo: foe, portrait, battle, rewards). A group
is kept once per area with the difficulties it's on; its rewards differ by
difficulty, so each tier's are kept per difficulty. A reward is a supply box
(OutsideReward) whose contents are currencies (its CurrencyDropList: Honor,
Tech Coins, Old Vouchers), so those are listed in place of the box.

A battle's enemies are the units its map places (BattleSceneActor, team 4;
those summoned by a scene trigger are marked; the roaming boss a map can call
in, ref GrowthBoss, has its level set by the run, so it shows none). Units
(actor types 2, 12, 13) are unit templates; the rest (turrets, beacons, tanks)
are vehicles, named by ConfigDataVehicleInfo. A few maps place unit templates
the client doesn't have; those are left out (and printed). An enemy's version on each
difficulty is in ConfigDataRoguelikeActorInfo.DifficultyOfActorIdList; only its
level changes, apart from a few that switch pilot or ST at 60+ (kept as their
own rows). Name: its pilot template's; ST: its body part's, linked when the
wiki has that ST. The unit a level names in CaptureTacticalUnitInfo can be
captured.

Also: Alert Levels (Max only: ConfigDataRoguelikeDifficultyGradientInfo, the
fixed modifiers of each and the optional modifier groups it adds, from
ConfigDataRoguelikeTag*), the tech tree (ConfigDataRoguelikeTechnologyUnit,
upgrade cost, currency and effect per level, in rows: each row unlocks after
the units its PreUnlockInfo names, all in the rows above it) and the pilot
masteries the in-run shop sells (ConfigDataRoguelikePilotExclusiveSkillInfo,
with the pilot's portrait and the passive skill they teach).

Left out: random events (on the Story page's Border Conflict tab), the in-run
shop and weapon upgrades, and the weekly high-score rules.
"""
import json
import os
import re
import sqlite3
import sys
from collections import OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_story import Rewards, STATS, clean, load, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'covert')
OUT = os.path.join(HERE, 'covert.json')
OUT_JS = os.path.join(HERE, 'covert.js')

ENEMY_TEAM = 4
ROAMING = 'GrowthBoss'
UNIT_TYPES = (2, 12, 13)
RARITY = re.compile(r'^RarityType_')
SKILL_TAG = re.compile(r'<skill [^>]*>(.*?)</skill>')
BUF_TAG = re.compile(r'<buf ID=(\d+)>\[?(.*?)\]?</buf>')
BUF_NAMES = {}   # buff ID -> name, for effects that name a buff with an empty <buf> tag (filled by main)
UNLOCK = re.compile(r'^Unlock:\s*')


def jl(v):
    return json.loads(v) if v else []


def plain(s):
    """Game text -> plain text: <color>/<link> tags dropped, [buff] and <skill> names kept."""
    s = SKILL_TAG.sub(lambda m: m.group(1), s or '')
    s = BUF_TAG.sub(lambda m: '[%s]' % (m.group(2) or BUF_NAMES.get(int(m.group(1))) or '?'), s)
    return clean(s).replace('​', '').strip()


class Builder:
    def __init__(self, con):
        self.con = con
        self.rewards = Rewards(con)
        self.mechs = load('mechs')
        self.diffs = OrderedDict()   # difficulty ID -> name ("30", ..., "Max")
        for d in con.execute('SELECT ID, TitleStrKey_EN FROM ConfigDataRoguelikeDifficultyInfo ORDER BY ID'):
            self.diffs[d['ID']] = text(d['TitleStrKey_EN'])
        self.variants = {}           # base actor ID -> {difficulty ID: template ID}
        for a in con.execute('SELECT ID, DifficultyOfActorIdList FROM ConfigDataRoguelikeActorInfo'):
            self.variants[a['ID']] = {x['DifficultyId']: x['ActorId'] for x in jl(a['DifficultyOfActorIdList'])}
        self.battles = {}            # battle map ID -> battle
        self.currencies = {c['CurrencyType']: c['ID'] for c in con.execute(
            'SELECT ID, CurrencyType FROM ConfigDataCurrencyTypeInfo')}

    def one(self, table, i):
        return self.con.execute('SELECT * FROM %s WHERE ID = ?' % table, (i,)).fetchone()

    def unit(self, tid):
        """(name, ST, wiki ST name or None, level) of a unit template."""
        t = self.one('ConfigDataTacticalUnitTemplateInfo', tid)
        p = t and self.one('ConfigDataPilotTemplateInfo', t['PilotTemplateId'])
        w = t and self.one('ConfigDataWapTemplateInfo', t['WapTemplateId'])
        body = w and self.one('ConfigDataWapBodyInfo', w['WapBodyID'])
        st = body and text(body['NameStrKey_EN'])
        mid = w and w['WapBodyID'] and next((m for m in self.mechs if int(m) // 10000 == w['WapBodyID'] // 10000), None)
        levels = jl(t['ReplaceWapLevel']) if t else []
        lv = levels[0] if levels else (t['ReplacePilotLevel'] if t else None)
        return (p and text(p['NameStrKey_EN'])) or '?', st, mid and self.mechs[mid]['name'], lv

    def battle(self, map_id, level, diff):
        """The battle on a map, with this difficulty added to it and its enemies."""
        b = self.battles.get(map_id)
        if not b:
            m = self.one('ConfigDataBattleMapInfo', map_id)
            b = self.battles[map_id] = {
                'id': map_id, 'name': text(level['TitleStrKey_EN']) or text(m['NameStrKey_EN']),
                'win': plain(text(m['AttackWinDescStrKey_EN'])), 'lose': plain(text(m['DefendWinDescStrKey_EN'])),
                'diffs': [], '_enemies': OrderedDict(), '_capture': text(level['CaptureTacticalUnitInfo'])}
            if text(m['StarConditionDescStrKey_EN']):
                b['stars'] = [plain(s) for s in m['StarConditionDescStrKey_EN'].split('/') if s.strip()]
        name = self.diffs[diff]
        if name in b['diffs']:
            return b
        b['diffs'].append(name)
        for a in self.con.execute('SELECT * FROM BattleSceneActor WHERE map = ? AND team = ?', (map_id, ENEMY_TEAM)):
            if a['actor_type'] in UNIT_TYPES:
                tid = self.variants.get(a['config_id'], {}).get(diff, a['config_id'])
                if not self.one('ConfigDataTacticalUnitTemplateInfo', tid):
                    if name == b['diffs'][0]:
                        print('battle %d (%s): no unit template %d for %s, left out' % (map_id, b['name'], tid, a['ref']))
                    continue
                who, st, mech, lv = self.unit(tid)
            else:
                v = self.one('ConfigDataVehicleInfo', a['config_id'])
                who, st, mech, lv = plain(v and v['NameStrKey_EN']) or '?', None, None, None
            summoned = a['source'].startswith('summon')
            key = (who, st, summoned)
            e = b['_enemies'].setdefault(key, {'name': who, 'st': st, 'refs': set(), 'lv': {}, 'diffs': set()})
            if mech:
                e['mech'] = mech
            if a['actor_type'] not in UNIT_TYPES:
                e['device'] = True
            if summoned:
                e['summoned'] = True
            if a['ref'] == b['_capture']:
                e['capture'] = True
            if a['ref'] == ROAMING:
                e['roaming'] = True
                lv = None
            e['refs'].add(a['ref'])
            e['lv'][name] = lv
            e['diffs'].add(name)
        return b

    def finish_battle(self, b):
        enemies = []
        for e in b.pop('_enemies').values():
            out = {k: v for k, v in e.items() if k not in ('refs', 'lv', 'diffs')}
            out['n'] = len(e['refs'])
            lvs = set(e['lv'].values())
            if lvs != {None}:
                out['lv'] = lvs.pop() if len(lvs) == 1 else e['lv']
            if len(e['diffs']) < len(b['diffs']):
                out['diffs'] = [d for d in b['diffs'] if d in e['diffs']]
            enemies.append(out)
        b.pop('_capture')
        b['enemies'] = enemies

    def region_grids(self, r):
        start, seen, todo = r['StartActionGridId'], set(), [r['StartActionGridId']]
        seen.add(start)
        while todo:
            g = self.one('ConfigDataRoguelikeActionGridInfo', todo.pop())
            nb = self.one('ConfigDataRoguelikeActionGridNeighborInfo', g['ActionGridNeighborInfo'])
            for n in jl(nb and nb['NeighborActionGridIds']):
                if n not in seen:
                    seen.add(n)
                    todo.append(n)
        return [self.one('ConfigDataRoguelikeActionGridInfo', g) for g in sorted(seen)]

    def box(self, drop_id, where):
        """A supply box's contents: its currencies, each as a reward chip."""
        row = self.one('ConfigDataItemDropInfo', drop_id)
        if not row:
            print('%s: no drop %s' % (where, drop_id))
            return []
        out = []
        for c in jl(row['CurrencyDropList']):
            item = self.rewards.d.item({'type': 'ItemType_Currency', 'configId': self.currencies[c['CurrencyType']]})
            out.append(dict(item, kind='item', count=c['maxCount']))
        if row['CertainDropList']:
            print('%s: drop %s has items too, left out' % (where, drop_id))
        return out

    def boss(self, bid, diff, where):
        """(boss group without rewards, [each tier's rewards on this difficulty])"""
        b = self.one('ConfigDataRoguelikeBossInfo', bid)
        tiers, rewards = [], []
        for p in jl(b['LevelPoolInfoList']):
            r = self.one('ConfigDataRoguelikeBossLevelPoolInfo', p['PoolId'])
            levels = jl(r['LevelPool'])
            level = self.one('ConfigDataRoguelikeLevelInfo', levels[0])
            if len(levels) > 1:
                print('%s: boss pool %d has %d levels, showing the first' % (where, p['PoolId'], len(levels)))
            tier = {'tier': text(r['DifficultyStrKey_EN']), 'stars': p.get('Star', 0),
                    'foe': re.sub(r' - (Normal|Hard|Extreme|Inferno)$', '', text(r['NameStrKey_EN']) or ''),
                    'battle': self.battle(level['BattleMapId'], level, diff)['id']}
            rewards.append(self.box(r['OutsideReward'], '%s %s' % (where, tier['tier'])))
            if text(r['DescStrKey_EN']):
                tier['text'] = plain(r['DescStrKey_EN'])
            if text(r['BossImage']):
                tier['portrait'] = re.sub(r'_Raw$', '', r['BossImage']) + '_half'
            tiers.append(tier)
        return {'name': text(b['NameStrKey_EN']).strip('"'), 'text': plain(b['DescStrKey_EN']), 'tiers': tiers}, rewards

    def areas(self):
        areas = OrderedDict()        # slot -> area
        for r in self.con.execute('SELECT * FROM ConfigDataRoguelikeRegionInfo ORDER BY ID').fetchall():
            diff = 1000 + (r['ID'] // 100) % 10
            dname, slot = self.diffs[diff], r['ID'] % 100
            where = '%s %s' % (dname, text(r['NameStrKey_EN']))
            a = areas.setdefault(slot, {'slot': slot, 'name': text(r['NameStrKey_EN']), 'ap': r['ActionPoint'],
                                        'stars': r['MaxStarCount'], 'diffs': [], 'next': None,
                                        '_battles': OrderedDict(), '_bosses': OrderedDict()})
            a['diffs'].append(dname)
            nxt = self.one('ConfigDataRoguelikeRegionForwardInfo', r['ID'])
            names = sorted({text(self.one('ConfigDataRoguelikeRegionInfo', x['RegionId'])['NameStrKey_EN'])
                            for x in jl(nxt and nxt['NextRegion'])})
            if names:
                a['next'] = names
            for g in self.region_grids(r):
                stars = jl(g['StarPool'])
                for lid in jl(g['LevelIds']):
                    level = self.one('ConfigDataRoguelikeLevelInfo', lid)
                    if not level:
                        print('%s: no level %d' % (where, lid))
                        continue
                    b = self.battle(level['BattleMapId'], level, diff)
                    e = a['_battles'].setdefault(b['id'], {'stars': set(), 'diffs': []})
                    e['stars'] |= set(stars)
                    if dname not in e['diffs']:
                        e['diffs'].append(dname)
            for bid in jl(r['BossIds']):
                boss, rewards = self.boss(bid, diff, where)
                g = a['_bosses'].setdefault(json.dumps(boss, sort_keys=True), dict(boss, diffs=[]))
                if dname in g['diffs']:
                    continue    # Area 4's two boss groups are both White Dwarf
                g['diffs'].append(dname)
                for t, rw in zip(g['tiers'], rewards):
                    t.setdefault('rewards', {})[dname] = rw
        out = []
        for a in areas.values():
            a['battles'] = sorted(({'id': k, 'stars': sorted(v['stars']), 'diffs': v['diffs']}
                                   for k, v in a.pop('_battles').items()), key=lambda x: (x['stars'], x['id']))
            a['bosses'] = list(a.pop('_bosses').values())
            out.append(a)
        return merge_siblings(out)

    def difficulties(self):
        usual = defaultdict(lambda: defaultdict(int))     # difficulty -> level -> enemies
        for b in self.battles.values():
            for e in b['enemies']:
                for d in e.get('diffs', b['diffs']):
                    lv = e['lv'].get(d) if isinstance(e.get('lv'), dict) else e.get('lv')
                    if lv:
                        usual[d][lv] += e['n']
        out = []
        for d in self.con.execute('SELECT * FROM ConfigDataRoguelikeDifficultyInfo ORDER BY ID'):
            out.append({'name': self.diffs[d['ID']], 'label': text(d['DescStrKey_EN']),
                        'unlock': UNLOCK.sub('', text(d['UnlockInfoStrKey_EN']) or ''),
                        'level': d['PlayerWapPartLevel'], 'weaponLevel': d['PlayerWeaponLevel'],
                        'enemyLevel': max(usual[self.diffs[d['ID']]].items(), key=lambda x: x[1])[0]})
        return out

    def tag(self, tid):
        t = self.one('ConfigDataRoguelikeTagInfo', tid)
        if not t:
            print('no modifier %d' % tid)
            return None
        return {'name': plain(t['NameStrKey_EN']), 'text': plain(t['DescStrKey_EN']), 'icon': t['Icon'],
                'alert': t['ConflicLevel'] or 0}

    def alert_levels(self):
        out = []
        for g in self.con.execute('SELECT * FROM ConfigDataRoguelikeDifficultyGradientInfo ORDER BY ID'):
            fixed = self.one('ConfigDataRoguelikeTagGroupInfo', g['FixTagGroupId'])
            lvl = {'name': text(g['NameStrKey_EN']), 'fixed': [t for t in map(self.tag, jl(fixed and fixed['TagList'])) if t],
                   'groups': []}
            for gid in jl(g['ExtraTagGroupList']):
                grp = self.one('ConfigDataRoguelikeTagGroupInfo', gid)
                tags = [t for t in map(self.tag, jl(grp['TagList'])) if t]
                if tags:
                    lvl['groups'].append({'name': plain(grp['NameStrKey_EN']), 'tags': tags})
            out.append(lvl)
        return out

    def tech(self):
        """The tech tree as rows, each unlocking after the row above it: units sharing a prerequisite
        (PreUnlockInfo -> RoguelikePreTechnologyUnitUpgradeInfo: the units it needs, at a level) form a row."""
        units, rows = {}, OrderedDict()   # unit ID -> unit; prerequisite ID -> its unit IDs
        for u in self.con.execute('SELECT * FROM ConfigDataRoguelikeTechnologyUnit ORDER BY ID'):
            levels = []
            for x in jl(u['UpgradeInfoList']):
                f = self.one('ConfigDataRoguelikeTechnologyUnitFuncInfo', x['FuncId'])
                levels.append({'cost': x['UpgradePoint'], 'text': plain(f and f['DescStrKey_EN'])})
            cur = self.currencies[u['ReplaceTechnologyPointType'] or 'CurrencyType_RoguelikeTechnologyPoint']
            units[u['ID']] = {'name': text(u['NameStrKey_EN']), 'levels': levels,
                              'currency': text(self.one('ConfigDataCurrencyTypeInfo', cur)['NameStrKey_EN'])}
            rows.setdefault(u['PreUnlockInfo'], []).append(u['ID'])
        needs = {}
        for pre in rows:
            p = self.one('ConfigDataRoguelikePreTechnologyUnitUpgradeInfo', pre)
            needs[pre] = jl(p and p['PreUpgradeInfoList'])
        # A row goes after the rows holding everything it needs.
        out, done = [], set()
        while len(out) < len(rows):
            pre = next((p for p in rows if rows[p][0] not in done
                        and all(x['PreTechnologyUnitId'] in done for x in needs[p])), None)
            if pre is None:
                sys.exit('tech tree: prerequisites of %s never met' % [p for p in rows if rows[p][0] not in done])
            row = {'units': [units[i] for i in rows[pre]]}
            if needs[pre]:
                row['after'] = [units[x['PreTechnologyUnitId']]['name'] for x in needs[pre]]
                if any(x['PreTechnologyUnitLevel'] != 1 for x in needs[pre]):
                    row['afterLevel'] = max(x['PreTechnologyUnitLevel'] for x in needs[pre])
            out.append(row)
            done.update(rows[pre])
        return out

    def masteries(self):
        out = []
        for s in self.con.execute('SELECT * FROM ConfigDataRoguelikePilotExclusiveSkillInfo ORDER BY ID'):
            rs = self.one('ConfigDataRoguelikeSkillInfo', s['SkillId'])
            sk = rs and self.one('ConfigDataPassiveSkillInfo', rs['SkillId'])
            m = {'pilot': re.sub(r"'s Pilot Mastery$", '', text(s['NameStrKey_EN'])), 'portrait': s['Icon'],
                 'rarity': RARITY.sub('', s['Rarity']), 'text': plain(s['ColorDescStrKey_EN'])}
            if sk:
                m['skill'] = {'name': text(sk['NameStrKey_EN']), 'icon': sk['Icon'],
                              'text': plain(sk['SkillDescStrKey_EN'])}
            else:
                print('mastery %d: no skill %s' % (s['ID'], s['SkillId']))
            out.append(m)
        return out


def merge_siblings(areas):
    """Area 2-1, 2-2, 2-3 -> one "Area 2" with their names, when only their layout differs."""
    groups = OrderedDict()
    for a in areas:
        groups.setdefault(re.sub(r'-\d+$', '', a['name']), []).append(a)
    out = []
    for name, g in groups.items():
        # A battle's star tiers follow the layout (Area 3-1 has a 3-star node where 3-2 has a 2-star one), so
        # they're compared without them and merged.
        same = lambda a: dict({k: v for k, v in a.items() if k not in ('slot', 'name', 'next', 'battles')},
                              battles=[(b['id'], b['diffs']) for b in a['battles']])
        if len(g) > 1 and all(same(a) == same(g[0]) for a in g) and all(a['next'] == g[0]['next'] for a in g):
            battles = [dict(b, stars=sorted({s for a in g for s in a['battles'][i]['stars']}))
                       for i, b in enumerate(g[0]['battles'])]
            out.append(dict(g[0], name=name, picks=[a['name'] for a in g], battles=battles,
                            next=merged_next(g[0]['next'])))
        else:
            if len(g) > 1:
                print('%s: its areas differ, kept apart' % name)
            out += [dict(a, next=merged_next(a['next'])) for a in g]
    return out


def merged_next(names):
    """["Area 3-1", "Area 3-2", "Area 3-3"] -> "Area 3" (one of them)."""
    if not names:
        return None
    bases = {re.sub(r'-\d+$', '', n) for n in names}
    return bases.pop() if len(bases) == 1 else names


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    BUF_NAMES.update((i, (n or '').strip().strip('[]')) for i, n in con.execute(
        'SELECT ID, NameDescStrKey_EN FROM ConfigDataActorBufInfo') if n and n.strip())
    b = Builder(con)
    areas = b.areas()
    for x in b.battles.values():
        b.finish_battle(x)
    data = {'difficulties': b.difficulties(), 'areas': areas,
            'battles': {str(k): v for k, v in sorted(b.battles.items())},
            'alertLevels': b.alert_levels(), 'tech': b.tech(), 'masteries': b.masteries()}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.CovertData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d areas, %d battles, %d alert levels, %d tech units in %d rows, %d masteries (%d KB)' % (
        OUT, len(areas), len(b.battles), len(data['alertLevels']), sum(len(r['units']) for r in data['tech']),
        len(data['tech']), len(data['masteries']),
        os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
