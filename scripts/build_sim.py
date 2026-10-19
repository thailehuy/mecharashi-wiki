#!/usr/bin/env python3
"""The Simulated Battle page's data, from the global client's tables
(RebuildGameUpdate/out/stats.db). Writes data/sim/sim.json and sim.js (SimData).

    python3 scripts/build_sim.py

Chapters (ConfigDataSimulationBattleLevelGroupInfo, by ID): their stages
(LevelIDList) and the chip algorithm they belong to (SimulationBattleRankInfo,
whose LevelGroupIDList lists its chapters: α, β, γ, γ+).

Stages (ConfigDataSimulationBattleLevelInfo): number ("1-1"), name (Regular or
Chain Sim) and clear rewards (LevelDropReward, resolved like the Story page's,
see build_story.Rewards). A Chain Sim fights several battles in a row
(BattleMapInfoList, one entry each, with its own energy cost); each battle's
victory and defeat text is its battle map's (AttackWinDescStrKey/
DefendWinDescStrKey). Simulated battles have no star conditions or
achievements.

Modifiers (BuffInfoIDList -> SimulationBattleBuffInfo): name, icon and effect.
Its ActorBuffID is a battle's AttackerGlobalBuffId (your team) or
DefenderGlobalBuffId (the enemies); a few are off by one from it, so failing an
exact match the battle map's ID in it (2110901x -> map 1109) picks the battle.
Effects name buffs as <buf ID=..></buf> with no name; they get the buff's
name from ConfigDataActorBufInfo, or [?] when it has none (some buffs, like
Ignition's, aren't in the client's tables at all).

A stage's UnlockCalculusPoolID is the chip algorithm pool its first clear
unlocks (SimulationBattleCalculusPowerPoolInfo: algorithm, power, chip
quality). The pools' chip drops are server-side, so only that is shown.

Left out: the event-time bonus algorithm runs (SimulationBattleExtraRewardInfo).
"""
import json
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_story import Rewards, STATS, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'sim')
OUT = os.path.join(HERE, 'sim.json')
OUT_JS = os.path.join(HERE, 'sim.js')

STAGE_NAMES = {'BattleLevelType_BattlePack': 'Chain Sim'}
SIDES = (('AttackerGlobalBuffId', 'allies'), ('DefenderGlobalBuffId', 'enemies'))
EMPTY_BUF = re.compile(r'<buf ID=(\d+)></buf>')


def side(maps, buff_id):
    """(battle index, 'allies'/'enemies'/'both') a modifier applies to, or (None, None)."""
    for i, m in enumerate(maps):
        found = [s for key, s in SIDES if m.get(key) == buff_id]
        if found:
            return i, found[0] if len(found) == 1 else 'both'
    # 21109010 -> map 1109: the battle whose map that is, when it has one global buff.
    for i, m in enumerate(maps):
        if str(m['BattleMapID'])[1:] == str(buff_id)[2:5]:
            found = [s for key, s in SIDES if m.get(key)]
            return i, found[0] if len(found) == 1 else None
    return None, None


def stage(con, rewards, pools, lid):
    l = con.execute('SELECT * FROM ConfigDataSimulationBattleLevelInfo WHERE ID = ?', (lid,)).fetchone()
    where = 'Simulated %s' % l['LevelNum']
    maps = json.loads(l['BattleMapInfoList'])
    st = {'id': l['ID'], 'code': l['LevelNum'],
          'name': STAGE_NAMES.get(l['LevelType'], text(l['NameStrKey_EN'])),
          'energy': sum(m['CostEnergy'] for m in maps), 'battles': []}
    for m in maps:
        bm = con.execute('SELECT AttackWinDescStrKey_EN, DefendWinDescStrKey_EN FROM ConfigDataBattleMapInfo '
                         'WHERE ID = ?', (m['BattleMapID'],)).fetchone()
        st['battles'].append({'energy': m['CostEnergy'], 'win': text(bm[0]), 'lose': text(bm[1])})
    st['modifiers'] = []
    for bid in json.loads(l['BuffInfoIDList'] or '[]'):
        b = con.execute('SELECT * FROM ConfigDataSimulationBattleBuffInfo WHERE ID = ?', (bid,)).fetchone()
        desc = EMPTY_BUF.sub(lambda x: buf_name(con, x.group(1), where), text(b['DescStrKey_EN']) or '')
        mod = {'name': text(b['NameStrKey_EN']), 'icon': b['BuffIcon'], 'text': desc}
        battle, who = side(maps, b['ActorBuffID'])
        if who:
            mod['side'] = who
        else:
            print('%s: no side for %s (%s)' % (where, mod['name'], b['ActorBuffID']))
        if battle is not None and len(maps) > 1:
            mod['battle'] = battle + 1
        st['modifiers'].append(mod)
    if l['UnlockCalculusPoolID']:
        p = pools[l['UnlockCalculusPoolID']]
        st['unlocks'] = {'algorithm': p['ChipZone'] + ('+' if p['CalculusRank'].endswith('R4') else ''),
                         'power': p['CalculusPower'], 'quality': p['Quality'].replace('RarityType_', '')}
    st['rewards'] = rewards.get(l['LevelDropReward'], where)
    return st


def buf_name(con, bid, where):
    row = con.execute('SELECT NameDescStrKey_EN FROM ConfigDataActorBufInfo WHERE ID = ?', (bid,)).fetchone()
    if not row or not text(row[0]):
        print('%s: no name for buff %s' % (where, bid))
        return '[?]'
    return '<buf ID=%s>[%s]</buf>' % (bid, text(row[0]).strip('[]'))


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    rewards = Rewards(con)
    pools = {p['ID']: p for p in con.execute('SELECT * FROM ConfigDataSimulationBattleCalculusPowerPoolInfo')}
    ranks = {}
    for r in con.execute('SELECT * FROM ConfigDataSimulationBattleRankInfo'):
        name = re.search(r'the (\S+) Chip Algorithm', r['NameStrKey_EN']).group(1)
        for g in json.loads(r['LevelGroupIDList']):
            ranks[g] = name
    chapters = []
    for g in con.execute('SELECT * FROM ConfigDataSimulationBattleLevelGroupInfo ORDER BY ID').fetchall():
        c = {'id': g['ID']}
        if g['ID'] in ranks:
            c['algorithm'] = ranks[g['ID']]
        c['stages'] = [stage(con, rewards, pools, lid) for lid in json.loads(g['LevelIDList'] or '[]')]
        chapters.append(c)
    data = {'chapters': chapters}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.SimData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d chapters, %d stages (%d KB)' % (
        OUT, len(chapters), sum(len(c['stages']) for c in chapters), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
