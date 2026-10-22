#!/usr/bin/env python3
"""The Memory Storm page's data (a Misc. page), from the global client's
tables (RebuildGameUpdate/out/stats.db) and, for the seasons global doesn't
have yet, the CN client's (mined/cn/out/stats.db). Writes data/storm/storm.json
and storm.js (StormData).

    python3 scripts/build_storm.py

Memory Storm is the game's ChipsDungeon. Each season is a row of
ConfigDataChipsDungeonLevelInfo: name, description, when it opens (OpenTime ->
ConfigDataCommonFuncOpenTimeInfo; a far-future date means not yet on global),
whether it's closed (IsClose, or since 2.4 an open time's ValidEndTime that has passed), energy costs and pilot EXP. A season in both
clients is taken from global; one only in CN takes its name and description
from FAN below. A season's version is the CN patch it opened in: each opens
with a patch, on the day of that patch's first debut banner (as
build_banners.py reads the CN pools).

Clear drops: the season's score tiers (GradeScoreList ->
ConfigDataChipsDungeonGradeScoreInfo), each with a first-clear, bonus and
normal drop ID, resolved like the Story page's (see build_story.Rewards).

Part pool: a bonus run also gives FixedPartNum ST parts from
ConfigDataChipsDungeonBonusRewardContentInfo (BonusRewardContentId): an
A-grade (Rate4RarityA) or B-grade (Rate4RarityB) part, each grade from its ST
list. The row also lists the season's S-grade (SSR) STs, with no rate of their
own. STs are linked by their Body ID (suit ID = its first 4 digits).

The daily bonus-run cap is ConfigDataConfigableConst
ChipsDungeonMaxBonusRewardTimes. Left out: Endless Mode
(ChipsDungeonEndlessLevelInfo), which drops no parts.
"""
import json
import os
import sqlite3
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_banners import CN_STATS, PILOT_SQL, ST_SQL, read_pools  # noqa: E402
from build_story import Rewards, STATS, clean, load, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'storm')
OUT = os.path.join(HERE, 'storm.json')
OUT_JS = os.path.join(HERE, 'storm.js')
# An open time this far out is a placeholder for a season global doesn't have yet.
UNRELEASED_YEAR = 2090
POOLS = [('s', 'WapSuitList4RarityS'), ('a', 'WapSuitListRarityA'), ('b', 'WapSuitList4RarityB')]
# Fan translations of the CN-only seasons, by level ID, with the CN name they translate (a changed name is
# reported). Terms as the global client words them: 猎者 Hunters, 尼赫鲁 Nehru, 更生实验 Rebirth Experiment.
FAN = {
    3: {'cn': '猎者考验', 'name': "Hunters' Trial",
        'text': 'For years, Professor Nehru has searched for the end point of the Rebirth Experiment, and each of his '
                'experiments means a brand-new hell for its test subjects. But pass it, complete the proof of his '
                'hypothesis, and power will be your reward.'},
    4: {'cn': '联军特训', 'name': 'Allied Special Training',
        'text': 'The war has begun again. This time both sides\' forces are better prepared, with finer STs and... '
                'harsher training. Only those who fight to the very end are fit to take the battlefield.'},
}


def suits(ids, mechs, where):
    out = []
    for s in ids:
        mid = next((m for m in mechs if int(m) // 10000 == s), None)
        if mid is None:
            print('%s: no ST for suit %d' % (where, s))
            continue
        out.append({'kind': 'st', 'id': mid, 'name': mechs[mid]['name']})
    return out


def open_date(con, time_id):
    """A season's open date (YYYY-MM-DD), or None for a placeholder."""
    r = con.execute('SELECT ValidStartTime FROM ConfigDataCommonFuncOpenTimeInfo WHERE ID = ?', (time_id,)).fetchone()
    if not r or not r[0]:
        return None
    y, m, d = (int(x) for x in r[0].split()[0].split('/'))
    return None if y >= UNRELEASED_YEAR else '%04d-%02d-%02d' % (y, m, d)


def is_closed(con, l):
    """Whether a season is closed: its IsClose flag (dropped from the table in 2.4), else an end time that has passed."""
    if 'IsClose' in l.keys():
        return bool(l['IsClose'])
    r = con.execute('SELECT ValidEndTime FROM ConfigDataCommonFuncOpenTimeInfo WHERE ID = ?', (l['OpenTime'],)).fetchone()
    if not r or not r[0]:
        return False
    y, m, d = (int(x) for x in r[0].split()[0].split('/'))
    return '%04d-%02d-%02d' % (y, m, d) <= date.today().isoformat()


def cn_patches(cn, pilots, mechs):
    """(date, version) of each CN patch's first debut banner, in date order."""
    body = dict(cn.execute('SELECT ID, WapPartBodyId FROM ConfigDataTacticalUnitSuitInfo'))
    pools = read_pools(cn, PILOT_SQL, 'pilot', str) + read_pools(cn, ST_SQL, 'st', lambda i: str(body.get(i)))
    units = {'pilot': pilots, 'st': mechs}
    first = {}
    for b in sorted((b for b in pools if b['type'] == 'limited' and b['start']), key=lambda b: b['start']):
        for uid in b['featured']:
            if uid in units[b['kind']]:
                v = units[b['kind']][uid]['version']
                first.setdefault(v, b['start'].strftime('%Y-%m-%d'))
    return sorted((d, v) for v, d in first.items())


def season(con, rewards, mechs, l):
    where = 'Memory Storm %s' % text(l['NameStrKey_EN'])
    pool = con.execute('SELECT * FROM ConfigDataChipsDungeonBonusRewardContentInfo WHERE ID = ?',
                       (l['BonusRewardContentId'],)).fetchone()
    tiers = []
    for gid in json.loads(l['GradeScoreList'] or '[]'):
        g = con.execute('SELECT * FROM ConfigDataChipsDungeonGradeScoreInfo WHERE ID = ?', (gid,)).fetchone()
        name = 'Tier %s' % g['Grade'].rsplit('Grade', 1)[-1]
        tiers.append({'name': name, 'min': g['MinScore'], 'max': g['MaxScore'] if g['MaxScore'] > 0 else None,
                      'first': rewards.get(g['FirstRewardDropId'], '%s %s first clear' % (where, name)),
                      'bonus': rewards.get(g['BonusRewardDropId'], '%s %s bonus' % (where, name)),
                      'normal': rewards.get(g['NormalRewardDropId'], '%s %s normal' % (where, name))})
    return {
        'id': l['ID'], 'name': text(l['NameStrKey_EN']), 'text': clean(text(l['DescStrKey_EN'])),
        'bonusEnergy': l['BonusEnergyCost'],
        'normalEnergy': [{'upTo': c['Times'] if c['Times'] > 0 else None, 'cost': c['Cost']}
                         for c in json.loads(l['NormalEnergyCostList'] or '[]')],
        'exp': l['PilotAddExp'],
        'parts': pool['FixedPartNum'],
        'rates': {'a': round(pool['Rate4RarityA'] * 100, 2), 'b': round(pool['Rate4RarityB'] * 100, 2)},
        'pool': {k: suits(json.loads(pool[col] or '[]'), mechs, where) for k, col in POOLS},
        'tiers': tiers,
    }


def levels(con):
    return {l['ID']: l for l in con.execute('SELECT * FROM ConfigDataChipsDungeonLevelInfo ORDER BY ID')}


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    rewards = Rewards(con)
    mechs = load('mechs')
    unlock = con.execute("SELECT MessageTextStrKey_EN FROM ConfigDataGameFunctionInfo "
                         "WHERE GameFunctionType = 'GameFunctionType_ChipsDungeon'").fetchone()
    daily = con.execute("SELECT Value FROM ConfigDataConfigableConst "
                        "WHERE ConfigableConstEnumValue = 'ConfigableConstId_ChipsDungeonMaxBonusRewardTimes'").fetchone()

    cn = None
    if os.path.exists(CN_STATS):
        cn = sqlite3.connect(CN_STATS)
        cn.row_factory = sqlite3.Row
    patches = cn_patches(cn, load('pilots'), mechs) if cn else []
    glob, cn_levels = levels(con), levels(cn) if cn else {}

    seasons = []
    for lid in sorted(set(glob) | set(cn_levels)):
        if lid in glob:
            s = season(con, rewards, mechs, glob[lid])
            s['opens'] = open_date(con, glob[lid]['OpenTime'])
            s['closed'] = bool(s['opens'] and is_closed(con, glob[lid]))
        else:
            l = cn_levels[lid]
            fan = FAN.get(lid)
            if not fan:
                print('Memory Storm: CN season %d (%s) has no fan translation in FAN, skipped' % (lid, l['NameStrKey_EN']))
                continue
            if fan['cn'] != l['NameStrKey_EN']:
                print('Memory Storm: CN season %d is now %s, FAN has %s' % (lid, l['NameStrKey_EN'], fan['cn']))
            s = season(cn, rewards, mechs, l)
            s.update(name=fan['name'], text=fan['text'], fan=True, opens=None, closed=False)
        cn_open = cn_levels.get(lid) and open_date(cn, cn_levels[lid]['OpenTime'])
        # The patch that started last on or before it opened.
        s['version'] = ([v for d, v in patches if d <= cn_open] or [None])[-1] if cn_open else None
        seasons.append(s)

    data = {'unlock': clean(text(unlock[0])) if unlock else None,
            'dailyBonus': int(daily[0]) if daily else None, 'seasons': seasons}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.StormData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d seasons (%d KB)' % (OUT, len(seasons), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
