#!/usr/bin/env python3
"""Build the pilot and ST gacha banner history (data/banners/banners.{json,js})
from the game tables (RebuildGameUpdate/out/stats.db).

Each pool's dates come from its open time (ConfigDataCommonFuncOpenTimeInfo).
Pools dated before launch or in 2048+ are tests or not yet scheduled, except
the 2098/4/10 block, which holds the next patches' banners (debut banners for
2.4/2.5 units): those are kept as upcoming, with no dates. A banner's version is the
patch running when it opened: a patch starts with the first banner of a unit
from that version. Upcoming banners take the version of the last debut before
them in pool ID order. Versions after MAX_VERSION are dropped.

The banner art is rendered by scripts/extract_banner_images.py, keyed by the
pool's prefab name (`image`).

    python3 scripts/build_banners.py
"""
import json
import os
import sqlite3
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
PILOTS = os.path.join(ROOT, 'data', 'db', 'pilots.json')
MECHS = os.path.join(ROOT, 'data', 'db', 'mechs.json')
HERE = os.path.join(ROOT, 'data', 'banners')
OUT = os.path.join(HERE, 'banners.json')
OUT_JS = os.path.join(HERE, 'banners.js')

MAX_VERSION = (2, 5)
UPCOMING_START = datetime(2098, 4, 10)
# Always-open pools that have no featured unit (standard and beginner).
STANDARD = {'pilot': {1, 4}, 'st': {1, 2, 3, 4}}

PILOT_SQL = '''
select p.ID, p.GachaPoolUpType, p.TagType, p.NameStrKey_EN, p.PrefabPath, t.ValidStartTime, t.ValidEndTime,
       c.GachaRateInfoOfUpPilot4RarityS, c.IdPoolOfSelfSelectUpPoolPilot4RarityS, c.ShowPilotInExchangePool
from ConfigDataPilotGachaPoolInfo p
left join ConfigDataCommonFuncOpenTimeInfo t on t.ID = p.OpenTimeId
left join ConfigDataPilotGachaPoolContentInfo c on c.ID = p.PilotGachaPoolContentInfo
order by p.ID'''

ST_SQL = '''
select p.ID, p.GachaPoolUpType, p.TagType, p.NameStrKey_EN, p.PrefabPath, t.ValidStartTime, t.ValidEndTime,
       c.GachaRateInfoOfUpWapSuit4RarityS, c.IdPoolOfSuitSelfSelectUpPoolSuit4RarityS, c.ShowWapInExchangePool
from ConfigDataWapGachaPoolInfo p
left join ConfigDataWapGachaPoolOpenTimeInfo o on o.ID = p.OpenTimeId
left join ConfigDataCommonFuncOpenTimeInfo t on t.ID = o.OpenTimeId
left join ConfigDataWapGachaPoolContentInfo c on c.ID = p.WapGachaPoolContentInfo
order by p.ID'''


def parse_time(s):
    return datetime.strptime(' '.join(s.split()), '%Y/%m/%d %H:%M:%S') if s else None


def version_key(v):
    return tuple(int(x) for x in v.split('.'))


def banner_type(pool_id, up_type, tag):
    if tag.endswith('_NewBee'):
        return 'beginner'
    if up_type.endswith('DrawCustomItemSingleUp'):
        return 'exchange'
    if 'SelfSelect' in up_type:
        return 'selector'
    if up_type.endswith('_SingleUp'):
        return 'limited'
    return 'standard'


def read_pools(db, sql, kind, unit):
    """Every pool as a banner dict; `unit` maps a pool's unit ID to (name, version)."""
    pools = []
    for pid, up_type, tag, name, prefab, start, end, up, select, exchange in db.execute(sql):
        ids = lambda s: json.loads(s) if s else []
        pools.append({
            'id': pid, 'kind': kind, 'name': name, 'type': banner_type(pid, up_type, tag),
            'start': parse_time(start), 'end': parse_time(end), 'image': prefab,
            'featured': [unit(x['Id']) for x in ids(up)],
            'options': [unit(x) for x in ids(select) + ids(exchange)],
        })
    return pools


def main():
    db = sqlite3.connect(STATS)
    pilots = json.load(open(PILOTS, encoding='utf-8'))
    mechs = json.load(open(MECHS, encoding='utf-8'))
    body = dict(db.execute('select ID, WapPartBodyId from ConfigDataTacticalUnitSuitInfo'))

    def pilot(i):
        p = pilots[str(i)]
        return p['name'], p['version']

    def mech(i):
        m = mechs[str(body[i])]
        return m['name'], m['version']

    pools = read_pools(db, PILOT_SQL, 'pilot', pilot) + read_pools(db, ST_SQL, 'st', mech)

    banners = []
    for b in pools:
        if b['id'] in STANDARD[b['kind']]:
            b['type'] = 'beginner' if b['type'] == 'beginner' else 'standard'
            b['start'] = b['end'] = None
        elif b['start'] is None or b['start'].year < 2025:
            continue
        elif b['start'].year >= 2048:
            if b['start'] != UPCOMING_START:
                continue
            b['upcoming'] = True
            b['start'] = b['end'] = None
        elif b['end'] and b['end'].year >= 2048:
            b['end'] = None       # open until closed some other way
        banners.append(b)

    # Patch start = first banner featuring a unit from that patch.
    starts = {}
    for b in banners:
        for _, v in b['featured']:
            if b['start'] and (v not in starts or b['start'] < starts[v]):
                starts[v] = b['start']
    patches = sorted(starts.items(), key=lambda kv: version_key(kv[0]))

    def version_at(t):
        return max((v for v, s in patches if s <= t), key=version_key, default=patches[0][0])

    for kind in ('pilot', 'st'):
        last_debut = None
        pending = []      # upcoming banners before the first upcoming debut
        for b in sorted((b for b in banners if b['kind'] == kind), key=lambda b: b['id']):
            debut = [v for _, v in b['featured'] if b['start'] is None or starts.get(v) == b['start']]
            if b.get('upcoming'):
                # Featured units older than the last debut are reruns.
                new = [v for v in debut if not last_debut or version_key(v) > version_key(last_debut)]
                if new:
                    last_debut = max(new, key=version_key)
                    for p in pending or []:
                        p['version'] = last_debut
                    pending = None
                if pending is None:
                    b['version'] = last_debut
                else:
                    pending.append(b)
            elif b['start']:
                b['version'] = version_at(b['start'])
                if debut and (not last_debut or version_key(max(debut, key=version_key)) > version_key(last_debut)):
                    last_debut = max(debut, key=version_key)

    out = []
    for b in banners:
        if b.get('version') and version_key(b['version']) > MAX_VERSION:
            continue
        row = {'kind': b['kind'], 'id': b['id'], 'name': b['name'], 'type': b['type']}
        if b.get('version'):
            row['version'] = b['version']
        if b.get('upcoming'):
            row['upcoming'] = True
        if b['start']:
            row['start'] = b['start'].strftime('%Y-%m-%d')
        if b['end']:
            row['end'] = b['end'].strftime('%Y-%m-%d')
        if b['featured']:
            row['featured'] = [n for n, _ in b['featured']]
        if b['options']:
            row['options'] = [n for n, _ in b['options']]
        row['image'] = b['image']
        out.append(row)

    order = {'standard': 0, 'beginner': 1}
    out.sort(key=lambda r: (r['type'] not in order, order.get(r['type'], 0), r.get('start') or '9999',
                            r['kind'] != 'pilot', r['id']))
    data = {
        'note': 'Global server banners from the game data. Banners not yet scheduled are listed under their patch without dates.',
        'banners': out,
    }
    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('window.BannersData = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
    print('%d banners (%d pilot, %d ST), patches: %s' % (
        len(out), sum(r['kind'] == 'pilot' for r in out), sum(r['kind'] == 'st' for r in out),
        ', '.join('%s %s' % (v, s.strftime('%Y-%m-%d')) for v, s in patches)))


if __name__ == '__main__':
    main()
