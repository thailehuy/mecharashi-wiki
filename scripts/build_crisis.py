#!/usr/bin/env python3
"""The Refactor-in-Crisis page's data (a Misc. page), from the global client's
tables (RebuildGameUpdate/out/stats.db) and, for the themes global doesn't
have yet, the CN client's (mined/cn/out/stats.db). Writes
data/crisis/crisis.json and crisis.js (CrisisData).

    python3 scripts/build_crisis.py

Refactor-in-Crisis is the game's ProtagonistPilotChallenge (the "Nostalgic
Challenge" in its internal names). Each theme
(ConfigDataProtagonistPilotChallengeThemeInfo) has two protagonist pilots,
the units they fight in (SupportTacticalUnitList), ten stages (LevelInfo),
three endings (ConditionEndInfo -> ProtagonistEndAVGInfo: which protagonist
reached Resolution Degree 20) and its missions (QuestList). A theme opens on
its OpenTimeInfoId's start; its version is the CN patch it opened with, read
as build_storm.py does.

Protagonists: ProtagonistPilotLevelInfo, a row per Resolution Degree (RD 1 to
31) with the Data it takes, the stat bonus (DescStrKey) and, every few
degrees, a perk (AddSpecialBufEffectDescStrKey, or the text of the passive in
ShowPassiveSkillIds where that's empty). A perk's [Term] is a buff; each one
the glossary doesn't have is listed under the pilot with its effect
(ConfigDataActorBufInfo). Every protagonist has the same Data curve.

Stages: ProtagonistPilotChallengeLevelInfo -> its battle map (victory and
defeat conditions) and its difficulty tiers (ProtagonistPilotChallenge
DifficultyInfo: enemy bonus, Data for a clear, the tier it unlocks after).
Stages 1, 3, 5, 7 and 9 are Chaotic Blocks (Resolution Tiers), 2, 4, 6 and 8
Regular Blocks (one difficulty), 10 the Final Battle (Chaos Index λ). The
units come from the map (BattleSceneActor, from extract_maps.py, run for the
CN client too): by team (TeamA you, TeamANpc your allies, TeamBNpc the
enemies, TeamCNpc a third side, Env the map's own), their pilot template's
name, their ST and level, and the Data a protagonist gets for defeating them
(ProtagonistPilotChallengeTargetExpInfo, by the unit's ref: Normal, Elite,
Boss).

Text of the CN-only themes: the global client's row with the same ID when it
has one, else the global text of any row whose CN text is the same (a
translation memory over every table both clients have), else the fan
translation in data/crisis/fan.json (CN text -> English). Text with none of
these is kept in Chinese and printed. Missions are worded from their
conditions, as the global client words them.

Left out: the store (on the Shops page), the entry and ending cutscenes, and
the buffs each tier puts on the enemies (the tier's text says what they do).
"""
import json
import os
import re
import sqlite3
import sys
from collections import Counter, OrderedDict, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_banners import CN_STATS  # noqa: E402
from build_storm import cn_patches, open_date  # noqa: E402
from build_story import STATS, clean, load, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'crisis')
OUT = os.path.join(HERE, 'crisis.json')
OUT_JS = os.path.join(HERE, 'crisis.js')
FAN = os.path.join(HERE, 'fan.json')
GLOSSARY = os.path.join(ROOT, 'data', 'glossary.json')

HAN = re.compile(r'[一-鿿]')
# BattleTeamType: TeamA, TeamANpc, TeamBNpc, TeamCNpc, Env.
SIDES = {1: 'you', 2: 'ally', 4: 'enemy', 6: 'third', 7: 'env'}
# BattleActorType 1 and 2 place a unit template (a pilot in an ST); 3 a vehicle (a device).
UNIT_TYPES = (1, 2)
# TargetExpInfo's title (global's, or the CN client's) -> the unit's rank.
RANKS = {'normal': 'Normal', 'elite': 'Elite', 'boss': 'Boss', '普通': 'Normal', '精锐': 'Elite', '头目': 'Boss'}
KINDS = {'混乱区块': 'chaotic', '常规区块': 'regular', '最终解析': 'final'}
BUF = re.compile(r'<buf ID=(\d+)>(?:\[([^\]]*)\])?</buf>')
# A buff's stack cap as its text quotes it: <BufLevelMax>5</BufLevelMax>.
LEVEL_MAX = re.compile(r'<BufLevelMax>(\d+)</BufLevelMax>')
RD_PREFIX = re.compile(r'^\s*\[(?:RD ?|解析度)(\d+)\]\s*')
# A number in game text (not the digits of a colour or a word): what a text template leaves open.
NUM = re.compile(r'(?<![#\w.])\d+(?:\.\d+)?')
SLOT = '\x00'


def jl(v):
    return json.loads(v) if v else []


def has_han(s):
    return bool(s and HAN.search(s))


def templates(pairs):
    """CN text -> English pairs -> the same with their numbers left open (CN with SLOTs -> English with SLOTs),
    for the pairs whose numbers are the same and in the same order in both."""
    out = {}
    for c, e in pairs.items():
        nums = NUM.findall(c)
        if nums and nums == NUM.findall(e):
            out.setdefault(NUM.sub(SLOT, c), NUM.sub(SLOT, e))
    return out


def fill(template, nums):
    for n in nums:
        template = template.replace(SLOT, n, 1)
    return template


def memory(cn, glob, cn_strings):
    """CN text -> the global client's English for it: every column both clients have (XStrKey in CN, its
    XStrKey_EN in global) of every row with the same ID, the most common English per CN text."""
    votes = defaultdict(Counter)
    tables = {r[0] for r in glob.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    for (t,) in cn.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'ConfigData%'").fetchall():
        if t not in tables or t.startswith('ConfigDataST_'):
            continue
        ccols = [r[1] for r in cn.execute('PRAGMA table_info("%s")' % t)]
        gcols = {r[1] for r in glob.execute('PRAGMA table_info("%s")' % t)}
        cols = [k for k in ccols if k + '_EN' in gcols]
        if 'ID' not in ccols or not cols:
            continue
        rows = {r[0]: r[1:] for r in cn.execute('SELECT ID, %s FROM "%s"' % (', '.join('"%s"' % k for k in cols), t))}
        for r in glob.execute('SELECT ID, %s FROM "%s"' % (', '.join('"%s_EN"' % k for k in cols), t)):
            mine = rows.get(r[0])
            if not mine:
                continue
            for c, e in zip(mine, r[1:]):
                if isinstance(c, str) and isinstance(e, str) and e.strip() and not has_han(e):
                    c = cn_strings.get(int(c[3:])) if c.startswith('ST:') and c[3:].isdigit() else c
                    if has_han(c):
                        votes[c][e] += 1
    return {c: v.most_common(1)[0][0] for c, v in votes.items()}


class English:
    """The English of a CN client's text: official, from the translation memory, or fan-translated."""

    def __init__(self, cn, glob):
        self.glob = glob
        self.cn_strings = dict(cn.execute('SELECT ID, Value FROM ConfigDataST_CN'))
        self.tm = memory(cn, glob, self.cn_strings)
        with open(FAN, encoding='utf-8') as f:
            self.fan = json.load(f)
        # The same text with other numbers: "Defend for 7 turns" from "Defend for 8 turns".
        self.tm_t, self.fan_t = templates(self.tm), templates(self.fan)
        self.fan_keys = {NUM.sub(SLOT, c): c for c in self.fan}
        self.used = set()
        self.missing = OrderedDict()
        self.rows = {}

    def chinese(self, v):
        if isinstance(v, str) and v.startswith('ST:') and v[3:].isdigit():
            return self.cn_strings.get(int(v[3:]))
        return v

    def global_row(self, table, i):
        rows = self.rows.get(table)
        if rows is None:
            rows = self.rows[table] = {}
            for r in self.glob.execute('SELECT * FROM %s' % table):
                rows.setdefault(r['ID'], r)
        return rows.get(i)

    def __call__(self, row, table, col, where):
        """The English of a CN row's text column (None when it has none)."""
        g = self.global_row(table, row['ID'])
        official = text(g[col + '_EN']) if g is not None and col + '_EN' in g.keys() else None
        if official and not has_han(official):
            return official
        return self.of(self.chinese(row[col]), where)

    def of(self, cn, where):
        cn = text(cn)
        if not cn or not has_han(cn):
            return cn
        if cn in self.tm:
            return self.tm[cn]
        if cn in self.fan:
            self.used.add(cn)
            return self.fan[cn]
        key, nums = NUM.sub(SLOT, cn), NUM.findall(cn)
        if key in self.tm_t:
            return fill(self.tm_t[key], nums)
        if key in self.fan_t:
            self.used.add(self.fan_keys[key])
            return fill(self.fan_t[key], nums)
        if where:
            self.missing.setdefault(cn, where)
        return cn


class Global:
    """The global client's text: its _EN columns."""

    def __call__(self, row, table, col, where):
        return text(row[col + '_EN'])

    def of(self, s, where):
        return text(s)

    def chinese(self, v):
        return None if isinstance(v, str) and v.startswith('ST:') else v


class Builder:
    def __init__(self, con, en, pilots, mechs, glossary):
        self.con = con
        self.en = en
        self.pilots = pilots
        self.mechs = mechs
        self.glossary = glossary
        self.tables = {}
        self.tiers = {}              # difficulty ID -> tier, shared by every stage that has it

    def one(self, table, i):
        rows = self.tables.get(table)
        if rows is None:
            rows = self.tables[table] = {}
            for r in self.con.execute('SELECT * FROM %s' % table):
                rows.setdefault(r['ID'], r)
        return rows.get(i)

    def t(self, table, i, col, where):
        r = self.one(table, i)
        return self.en(r, table, col, where) if r is not None else None

    def pilot_name(self, pid):
        return self.pilots[str(pid)]['name'] if str(pid) in self.pilots else str(pid)

    def mech(self, body):
        """(ST name, wiki ST ID or None) of an ST by its Body part ID."""
        mid = next((m for m in self.mechs if int(m) // 10000 == body // 10000), None)
        name = self.t('ConfigDataWapBodyInfo', body, 'NameStrKey', None if mid else 'ST %d' % body)
        if mid and (not name or has_han(name)):
            name = self.mechs[mid]['name']
        return name, mid

    def unit(self, tid, where):
        """{name, st, mech, lv} of a unit template, or None when the client doesn't have it."""
        t = self.one('ConfigDataTacticalUnitTemplateInfo', tid)
        if t is None:
            return None
        p = self.one('ConfigDataPilotTemplateInfo', t['PilotTemplateId'])
        named = p and str(p['PilotId']) in self.pilots
        # A named pilot the wiki has: its name there when the template's has no English (not reported).
        name = p and self.t('ConfigDataPilotTemplateInfo', p['ID'], 'NameStrKey', None if named else where)
        if named and (not name or has_han(name)):
            name = self.pilot_name(p['PilotId'])
        out = {'name': name or '?'}
        w = self.one('ConfigDataWapTemplateInfo', t['WapTemplateId'])
        if w and w['WapBodyID']:
            out['st'], mid = self.mech(w['WapBodyID'])
            if mid:
                out['mech'] = mid
        levels = jl(t['ReplaceWapLevel'])
        lv = levels[0] if levels else t['ReplacePilotLevel']
        if lv:
            out['lv'] = lv
        return out

    def tier(self, did, where):
        if did not in self.tiers:
            d = self.one('ConfigDataProtagonistPilotChallengeDifficultyInfo', did)
            name = self.en(d, 'ConfigDataProtagonistPilotChallengeDifficultyInfo', 'TitleStrKey', where)
            x = {'name': 'Normal' if KINDS.get(name) or has_han(name) or name == 'Normal Stage Difficulty' else name,
                 'text': clean(self.en(d, 'ConfigDataProtagonistPilotChallengeDifficultyInfo', 'DescStrKey', where))}
            if d['EXP']:
                x['data'] = d['EXP']
            if d['UnlockNeedDifficultyId']:
                x['after'] = d['UnlockNeedDifficultyId']
            self.tiers[did] = x
        return did

    def units(self, level, where):
        """The units a stage's map places, merged by side, unit, level, rank and whether they join mid-battle."""
        ranks = {}
        for r in self.con.execute('SELECT * FROM ConfigDataProtagonistPilotChallengeTargetExpInfo WHERE LevelInfo = ?',
                                  (level['ID'],)):
            for ref in jl(r['TargetRefNameList']):
                ranks[ref] = (RANKS.get((r['TitleStrKey_EN'] or '').lower(), '?'), r['EXP'])
        merged = OrderedDict()
        for a in self.con.execute('SELECT * FROM BattleSceneActor WHERE map = ? ORDER BY rowid', (level['BattleMapId'],)):
            side = SIDES.get(a['team'])
            if side is None:
                print('%s: %s on team %d, left out' % (where, a['ref'], a['team']))
                continue
            u = self.unit(a['config_id'], where) if a['actor_type'] in UNIT_TYPES else None
            if u is None:
                v = self.one('ConfigDataVehicleInfo', a['config_id'])
                if v is None:
                    print('%s: no unit template or vehicle %d for %s, left out' % (where, a['config_id'], a['ref']))
                    continue
                u = {'name': clean(self.en(v, 'ConfigDataVehicleInfo', 'NameStrKey', where)) or '?', 'device': True}
            rank = ranks.get(a['ref'])
            if rank:
                u['rank'], u['data'] = rank
            if a['source'].startswith('summon'):
                u['summoned'] = True
            u['side'] = side
            key = json.dumps(u, sort_keys=True)
            if key in merged:
                merged[key]['n'] += 1
            else:
                merged[key] = dict(u, n=1)
        order = {s: i for i, s in enumerate(['you', 'ally', 'enemy', 'third', 'env'])}
        rank_order = {'Boss': 0, 'Elite': 1, 'Normal': 2}
        return sorted(merged.values(), key=lambda u: (order[u['side']], u.get('summoned', False),
                                                      rank_order.get(u.get('rank'), 3)))

    def stage(self, lid, where):
        level = self.one('ConfigDataProtagonistPilotChallengeLevelInfo', lid)
        m = self.one('ConfigDataBattleMapInfo', level['BattleMapId'])
        where = '%s stage %s' % (where, level['Number'])
        cn_kind = self.en.chinese(level['TitleStrKey'])
        name = self.en(level, 'ConfigDataProtagonistPilotChallengeLevelInfo', 'TitleStrKey', where)
        kind = KINDS.get(cn_kind) or {'Chaotic Block': 'chaotic', 'Regular Block': 'regular',
                                      'Final Battle': 'final'}.get(name)
        if not kind:
            print('%s: unknown kind of stage %s' % (where, name))
        out = {
            'n': int(level['Number']), 'kind': kind, 'name': name,
            'text': clean(self.en(level, 'ConfigDataProtagonistPilotChallengeLevelInfo', 'DescStrKey', where)),
            'win': clean(self.en(m, 'ConfigDataBattleMapInfo', 'AttackWinDescStrKey', where)),
            'lose': clean(self.en(m, 'ConfigDataBattleMapInfo', 'DefendWinDescStrKey', where)),
            'tiers': [self.tier(d, where) for d in jl(level['DifficultyIds'])],
            'units': self.units(level, where),
        }
        if level['LevelImagePath']:
            out['image'] = level['LevelImagePath'].rsplit('/', 1)[-1]
        return out

    def buff_name(self, bid, where):
        """A buff's name: the glossary's (the wiki's name for it), else the client's."""
        known = self.glossary.get('buf', {}).get(str(bid))
        if known:
            return known['name']
        b = self.one('ConfigDataActorBufInfo', bid)
        return b and clean(self.en(b, 'ConfigDataActorBufInfo', 'NameDescStrKey', where))

    def rich(self, s, where):
        """Perk text: game markup kept, every buff tag carrying its name."""
        s = LEVEL_MAX.sub(r'\1', s or '')
        return BUF.sub(lambda m: '<buf ID=%s>[%s]</buf>' % (
            m.group(1), m.group(2) if m.group(2) and not has_han(m.group(2)) else
            (self.buff_name(int(m.group(1)), where) or m.group(2) or '?')), s)

    def terms(self, perks, where):
        """The buffs the perks name that the glossary doesn't explain, with their effects."""
        out, seen = [], set(self.glossary.get('buf', {}))
        for p in perks:
            for bid in BUF.findall(p['text']):
                bid = bid[0]
                if bid in seen:
                    continue
                seen.add(bid)
                b = self.one('ConfigDataActorBufInfo', int(bid))
                desc = b and text(self.en(b, 'ConfigDataActorBufInfo', 'BuffDescStrKey', where))
                if desc:
                    out.append({'id': int(bid), 'name': self.buff_name(int(bid), where),
                                'text': self.rich(desc, where)})
        return out

    def protagonist(self, pid, where):
        where = '%s %s' % (where, self.pilot_name(pid))
        rows = list(self.con.execute('SELECT * FROM ConfigDataProtagonistPilotLevelInfo WHERE PilotId = ? ORDER BY Level',
                                     (pid,)))
        perks = []
        for r in rows:
            perk = text(self.en(r, 'ConfigDataProtagonistPilotLevelInfo', 'AddSpecialBufEffectDescStrKey', where))
            if not perk:
                for sid in jl(r['ShowPassiveSkillIds']):
                    s = self.one('ConfigDataPassiveSkillInfo', sid)
                    perk = s and text(self.en(s, 'ConfigDataPassiveSkillInfo', 'SkillDescStrKey', where))
            if perk:
                perks.append({'rd': r['Level'], 'text': self.rich(RD_PREFIX.sub('', perk), where)})
        colour = self.one('ConfigDataProtagonistPilotChallengePilotInfo', pid)
        return {
            'id': str(pid), 'name': self.pilot_name(pid), 'color': colour['Colour'] if colour else None,
            # The stat bonus every degree adds, as of the last degree.
            'bonus': clean(self.en(rows[-1], 'ConfigDataProtagonistPilotLevelInfo', 'DescStrKey', where)),
            'perks': perks, 'terms': self.terms(perks, where),
            '_data': [r['EXP'] or 0 for r in rows],
        }

    def support(self, tid, pros, where):
        """The unit a protagonist fights in. Its pilot template's PilotId is the protagonist's with a 4 for the 1
        (10103405 for 10103105), or one of its own; then its name has the protagonist's."""
        t = self.one('ConfigDataTacticalUnitTemplateInfo', tid)
        p = self.one('ConfigDataPilotTemplateInfo', t['PilotTemplateId'])
        pid = next((x for x in pros if p['PilotId'] - x == 300), None)
        if pid is None:
            name = self.en.chinese(p['NameStrKey']) or text(p['NameStrKey_EN']) or ''
            pid = next((x for x in pros if (self.en.chinese(self.one('ConfigDataPilotInfo', x)['NameStrKey']) or
                                            self.pilot_name(x)) in name), None)
        if pid is None:
            print('%s: no protagonist for support unit %d' % (where, tid))
        u = self.unit(tid, None)
        out = {'pilot': str(pid), 'st': u.get('st'), 'lv': u.get('lv')}
        if u.get('mech'):
            out['mech'] = u['mech']
        return out

    def mission(self, qid, theme, stages, where):
        q = self.one('ConfigDataQuestInfo', qid)
        c = jl(q['CompleteCondList'])[0]
        kind = c['CondType'].replace('QuestCompleteCondType_ProtagonistPilotChallenge', '')
        if kind == 'LevelDifficultyClear':
            tier = self.tiers[self.tier(c['P1'], where)]['name']
            n = next(s['n'] for s, lid in stages if lid == c['P2'])
            depth = 'Chaos Index ' + tier if tier.startswith('λ') else 'Resolution Tier ' + tier
            label = 'Clear Stage %d at %s' % (n, depth)
        elif kind == 'PilotLevel':
            label = '%s reaches Resolution Degree %d' % (self.pilot_name(c['P3']), c['P1'])
        elif kind == 'PilotGainExpOneLevel':
            label = '%s gains %s Data by defeating units' % (self.pilot_name(c['P3']), format(c['P1'], ','))
        else:
            print('%s: mission %d has condition %s' % (where, qid, c['CondType']))
            label = '?'
        out = {'text': label, 'rewards': self.rewards(q['DropReward'], where)}
        if '<color' in (q['TitleStrKey_EN'] or ''):
            out['challenge'] = True
        return out

    def rewards(self, drop_id, where):
        d = self.one('ConfigDataItemDropInfo', drop_id)
        out = []
        for x in jl(d['CurrencyDropList']):
            cur = next(r for r in self.con.execute('SELECT * FROM ConfigDataCurrencyTypeInfo WHERE CurrencyType = ?',
                                                   (x['CurrencyType'],)))
            out.append({'kind': 'item', 'icon': cur['Icon'], 'count': x['maxCount'],
                        'name': '%s ×%s' % (self.en(cur, 'ConfigDataCurrencyTypeInfo', 'NameStrKey', where),
                                            format(x['maxCount'], ','))})
        for x in jl(d['CertainDropList']):
            if x['type'] != 'ItemType_HonorMedal':
                print('%s: reward %s %d left out' % (where, x['type'], x['configId']))
                continue
            medal = self.one('ConfigDataHonorMedalInfo', x['configId'])
            out.append({'kind': 'item', 'icon': medal['Icon'].rsplit('/', 1)[-1], 'medal': True,
                        'name': self.en(medal, 'ConfigDataHonorMedalInfo', 'NameStrKey', where)})
        return out

    def theme(self, t):
        where = 'Refactor-in-Crisis %s' % t['EnglishTitle']
        pros = jl(t['ProtagonistPilots'])
        stages = []
        for lid in jl(t['LevelInfo']):
            stages.append((self.stage(lid, where), lid))
        protagonists = [self.protagonist(p, where) for p in pros]
        endings = []
        for eid in jl(t['ConditionEndInfo']):
            e = self.one('ConfigDataProtagonistEndAVGInfo', eid)
            need = {str(x['PilotID']): x['Lv'] for x in jl(e['PilotLv'])}
            endings.append({'name': self.en(e, 'ConfigDataProtagonistEndAVGInfo', 'DescStrKey', where),
                            'rd20': [p for p in map(str, pros) if need.get(p, 0) >= 20]})
        return {
            'id': t['ID'], 'code': t['EnglishTitle'],
            'name': self.en(t, 'ConfigDataProtagonistPilotChallengeThemeInfo', 'TitleStrKey', where),
            'image': t['Icon'],
            'protagonists': protagonists,
            'support': [self.support(s, pros, where) for s in jl(t['SupportTacticalUnitList'])],
            'endings': endings,
            'missions': [self.mission(q['questId'], t, stages, where) for q in jl(t['QuestList'])],
            'stages': [s for s, _ in stages],
            '_open': t['OpenTimeInfoId'],
        }


def main():
    glob = sqlite3.connect(STATS)
    glob.row_factory = sqlite3.Row
    cn = sqlite3.connect(CN_STATS)
    cn.row_factory = sqlite3.Row
    pilots, mechs = load('pilots'), load('mechs')
    with open(GLOSSARY, encoding='utf-8') as f:
        glossary = json.load(f)
    for con, name in ((glob, 'global'), (cn, 'CN')):
        if not con.execute("SELECT 1 FROM sqlite_master WHERE name = 'BattleSceneActor'").fetchone():
            sys.exit('The %s client has no BattleSceneActor table: run extract_maps.py for it first' % name)

    en = English(cn, glob)
    g_builder = Builder(glob, Global(), pilots, mechs, glossary)
    c_builder = Builder(cn, en, pilots, mechs, glossary)
    patches = cn_patches(cn, pilots, mechs)
    g_themes = {t['ID']: t for t in glob.execute('SELECT * FROM ConfigDataProtagonistPilotChallengeThemeInfo')}

    themes = []
    for t in cn.execute('SELECT * FROM ConfigDataProtagonistPilotChallengeThemeInfo ORDER BY ID'):
        on_global = t['ID'] in g_themes and open_date(glob, g_themes[t['ID']]['OpenTimeInfoId'])
        b = g_builder if on_global else c_builder
        x = b.theme(g_themes[t['ID']] if on_global else t)
        opens = x.pop('_open')
        x['opens'] = open_date(glob, opens) if on_global else None
        if not on_global:
            x['fan'] = True
            x['cnName'] = en.chinese(t['TitleStrKey'])
        x['cnOpens'] = open_date(cn, t['OpenTimeInfoId'])
        x['version'] = ([v for d, v in patches if d <= x['cnOpens']] or [None])[-1] if x['cnOpens'] else None
        themes.append(x)

    # Every protagonist levels on the same Data curve: kept once.
    curves = {tuple(p.pop('_data')) for x in themes for p in x['protagonists']}
    if len(curves) > 1:
        print('Refactor-in-Crisis: the protagonists have %d different Data curves; the first is shown' % len(curves))
    curve = sorted(curves)[0]
    tiers = {}
    for b in (g_builder, c_builder):
        for did, tier in b.tiers.items():
            if did in tiers and tiers[did] != tier and b is c_builder:
                continue        # global's wording of a shared tier wins
            tiers[did] = tier

    unlock = glob.execute("SELECT MessageTextStrKey_EN FROM ConfigDataGameFunctionInfo "
                          "WHERE GameFunctionType = 'GameFunctionType_ProtagonistPilotChallenge'").fetchone()
    data = {
        'unlock': clean(text(unlock[0])) if unlock else None,
        'dataWays': [clean(text(r[0])) for r in glob.execute(
            'SELECT DescStrKey_EN FROM ConfigDataProtagonistPilotExpGetWayDescInfo ORDER BY ID')],
        'levels': [{'rd': i + 1, 'data': d} for i, d in enumerate(curve)],
        'tiers': {str(k): v for k, v in sorted(tiers.items())},
        'themes': themes,
    }

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.CrisisData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d themes (%d KB)' % (OUT, len(themes), os.path.getsize(OUT_JS) // 1024))
    unused = set(en.fan) - en.used
    if unused:
        print('fan.json: %d translations no longer used: %s' % (len(unused), ', '.join(sorted(unused))))
    if en.missing:
        print('%d texts have no English (kept in Chinese); add them to data/crisis/fan.json:' % len(en.missing))
        for cn_text, where in en.missing.items():
            print('  %s: %s' % (where, cn_text))


if __name__ == '__main__':
    main()
