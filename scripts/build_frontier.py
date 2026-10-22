#!/usr/bin/env python3
"""The Frontier Trial page's data (an Expansion Ops page), from the global
client's tables (RebuildGameUpdate/out/stats.db). Writes
data/frontier/frontier.json and frontier.js (FrontierData).

    python3 scripts/build_frontier.py

Stages (ConfigDataScoringLevelInfo, the game's "Scoring" levels, by ID): name,
kind (ScoringLevelType: ST part enhancement or R&D materials), turn limit
(MaxRounds), pilot EXP, sweep ticket cost and what unlocks it
(UnlockCondition: a Permit, ConfigDataPlayerRatingInfo, and for the later
stages a main story stage, read from data/story/story.json).

Its battle (BattleMapId -> ConfigDataBattleMapInfo) gives the first phase's
victory and defeat conditions (AttackWinDescStrKey/DefendWinDescStrKey), the
second phase's (Secondhand...) and each grade's condition (GradeInfos ->
ConfigDataBattleGradeInfo). Rewards, resolved like the Story page's (see
build_story.Rewards): a first clear's per grade (FirstRewards), and a repeat
run's per grade and formation type (Light/Medium/Heavy/ComplexWapFormationRewards;
BonusReward is always the same as NormalReward, so it's left out).

Left out: the event-time bonus drops (ScoringLevelExtraRewardInfo, only while
an operational activity runs).
"""
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_story import Rewards, STATS, clean, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'frontier')
OUT = os.path.join(HERE, 'frontier.json')
OUT_JS = os.path.join(HERE, 'frontier.js')
STORY = os.path.join(ROOT, 'data', 'story', 'story.json')

GRADES = ['Pass', 'C', 'B', 'A', 'S', 'SSS']
KINDS = {'ScoringLevelType_WapPartUpgradeMaterial': 'parts', 'ScoringLevelType_RnDMaterial': 'rnd'}
# "Complex" in the tables; the game's formation filter calls it Mixed.
FORMATIONS = [('Light', 'light'), ('Medium', 'medium'), ('Heavy', 'heavy'), ('Complex', 'mixed')]


def grade(g):
    return g.replace('BattleGradeType_', '')


def story_stages():
    """Main story stage ID -> its code, name and chapter."""
    with open(STORY, encoding='utf-8') as f:
        d = json.load(f)
    return {st['id']: {'code': st.get('code'), 'name': st.get('name'), 'chapter': c['name'], 'slug': c['slug']}
            for c in d['chapters'] for st in c['stages']}


def unlock(con, stories, l):
    u = {}
    for c in json.loads(l['UnlockCondition'] or '[]'):
        if c['CondType'] == 'ConditionType_PlayerRatingLevel':
            r = con.execute('SELECT NameNum FROM ConfigDataPlayerRatingInfo WHERE ID = ?', (c['P1'],)).fetchone()
            u['permit'] = 'Permit ' + text(r['NameNum'])
        elif c['CondType'] == 'ConditionType_MainQuestMapWayPointComplete':
            st = stories.get(c['P1'])
            if not st:
                print('%s: no story stage %d' % (text(l['NameStrKey_EN']), c['P1']))
                continue
            u['stage'] = st
        else:
            print('%s: unknown condition %s' % (text(l['NameStrKey_EN']), c['CondType']))
    return u


def stage(con, rewards, stories, l):
    m = con.execute('SELECT * FROM ConfigDataBattleMapInfo WHERE ID = ?', (l['BattleMapId'],)).fetchone()
    name = text(l['NameStrKey_EN'])
    conds = {}
    for gid in json.loads(m['GradeInfos'] or '[]'):
        g = con.execute('SELECT * FROM ConfigDataBattleGradeInfo WHERE ID = ?', (gid,)).fetchone()
        conds[grade(g['BattleGradeType'])] = clean(text(g['DescStrKey_EN']))
    first = {grade(g['Grade']): g['FirstReward'] for g in json.loads(l['FirstRewards'] or '[]')}
    normal = {key: {grade(g['Grade']): g['NormalReward'] for g in json.loads(l[col + 'WapFormationRewards'] or '[]')}
              for col, key in FORMATIONS}
    grades = []
    for gr in GRADES:
        where = '%s %s' % (name, gr)
        grades.append({
            'grade': gr,
            'cond': conds.get(gr),
            'first': rewards.get(first[gr], where + ' first clear') if gr in first else [],
            'normal': {k: rewards.get(normal[k][gr], '%s %s' % (where, k)) if gr in normal[k] else [] for _, k in FORMATIONS},
        })
    return {
        'id': l['ID'], 'name': name, 'kind': KINDS[l['ScoringLevelType']],
        'turns': l['MaxRounds'], 'exp': l['PilotExp'], 'sweep': l['SweepsTicketCost'],
        'unlock': unlock(con, stories, l),
        'win': clean(text(m['AttackWinDescStrKey_EN'])), 'lose': clean(text(m['DefendWinDescStrKey_EN'])),
        'win2': clean(text(m['SecondhandAttackWinDescStrKey_EN'])), 'lose2': clean(text(m['SecondhandDefendWinDescStrKey_EN'])),
        'grades': grades,
    }


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    rewards = Rewards(con)
    stories = story_stages()
    f = con.execute("SELECT * FROM ConfigDataGameFunctionInfo WHERE GameFunctionType = 'GameFunctionType_Scoring'").fetchone()
    stages = [stage(con, rewards, stories, l)
              for l in con.execute('SELECT * FROM ConfigDataScoringLevelInfo ORDER BY ID').fetchall()]
    data = {'tagline': text(f['DescTextStrKey_EN']), 'unlock': clean(text(f['MessageTextStrKey_EN'])), 'stages': stages}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.FrontierData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d stages (%d KB)' % (OUT, len(stages), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
