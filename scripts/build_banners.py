#!/usr/bin/env python3
"""Build the pilot and ST gacha banner history (data/banners/banners.{json,js})
from the game tables (RebuildGameUpdate/out/stats.db).

Each pool's dates come from its open time (ConfigDataCommonFuncOpenTimeInfo).
Pools dated before launch or in 2048+ are tests or not yet scheduled, except
the 2098/4/10 block, which holds the next patches' banners (debut banners for
2.4/2.5 units): those are kept as upcoming, with no dates. A banner's version is the
patch running when it opened: a patch starts with the first banner of a unit
from that version. Upcoming banners take the version of the last debut before
them in pool ID order. Units from later patches that no pool features yet,
up to MAX_VERSION, get a placeholder debut banner each (upcoming, no dates,
named after the unit), with the art and pool ID of the unit's first limited
banner on the CN server (mined/cn/out/stats.db, built by
`MECHA_REGION=CN python decode.py`) when there is one. Versions after
MAX_VERSION are dropped.

The banner art is rendered by scripts/extract_banner_images.py, keyed by the
pool's prefab name (`image`); run it with MECHA_REGION=CN for the CN-only art.

    python3 scripts/build_banners.py
"""
import json
import os
import sqlite3
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
CN_STATS = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')
PILOTS = os.path.join(ROOT, 'data', 'db', 'pilots.json')
MECHS = os.path.join(ROOT, 'data', 'db', 'mechs.json')
HERE = os.path.join(ROOT, 'data', 'banners')
OUT = os.path.join(HERE, 'banners.json')
OUT_JS = os.path.join(HERE, 'banners.js')

MAX_VERSION = (3, 7)
UPCOMING_START = datetime(2098, 4, 10)
# Always-open pools that have no featured unit (standard and beginner).
STANDARD = {'pilot': {1, 4}, 'st': {1, 2, 3, 4}}
# Corrections to the patch or type the CN schedule gives an added CN pool. 106/108 are the new
# permanent standard pools (pre-2.0 pilots removed), set up in the game data like exchange pools.
CN_OVERRIDES = {
    ('pilot', 85): {'version': '2.6'}, ('st', 87): {'version': '2.6'},
    ('pilot', 106): {'version': '3.1', 'type': 'standard', 'name': 'Ace Pilot Recruitment'},
    ('st', 108): {'version': '3.1', 'type': 'standard', 'name': 'Standard Shipping'},
}

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

    # Placeholder debuts for units newer than any banner, which the game data doesn't schedule yet.
    # The CN server's debut pool, if any, gives the art and pool ID (so pilot/ST pairs line up as in CN).
    cn_debut = {}
    cn_pools = []
    if os.path.exists(CN_STATS):
        cn = sqlite3.connect(CN_STATS)
        cn_body = dict(cn.execute('select ID, WapPartBodyId from ConfigDataTacticalUnitSuitInfo'))
        cn_pools = (read_pools(cn, PILOT_SQL, 'pilot', lambda i: str(i)) +
                    read_pools(cn, ST_SQL, 'st', lambda i: str(cn_body.get(i))))
        cn_pools = sorted((b for b in cn_pools if b['start'] and 2025 <= b['start'].year < 2048),
                          key=lambda b: (b['start'], b['id']))
        for b in cn_pools:
            if b['type'] == 'limited':
                for uid in b['featured']:
                    cn_debut.setdefault((b['kind'], uid), b)
    newest = max((v for b in banners for _, v in b['featured']), key=version_key)

    # CN pools newer than any global pool that aren't debuts of units placed above (reruns and exchanges) are added as
    # upcoming, without dates. Their patch is the CN patch running when they opened: the one of the
    # last debut before them (CN didn't release every patch in version order).
    units = {'pilot': pilots, 'st': mechs}
    unit = lambda kind, uid: (units[kind][uid]['name'], units[kind][uid]['version'])
    debut_ids = {id(b) for (k, uid), b in cn_debut.items()
                 if uid in units[k] and version_key(units[k][uid]['version']) > version_key(newest)}
    cn_patches = sorted((b['start'], unit(k, uid)[1]) for (k, uid), b in cn_debut.items() if uid in units[k])
    last_global = {k: max(b['id'] for b in banners if b['kind'] == k and b['id'] < 4000) for k in units}
    names = {}     # (kind, unit name) -> name of its global limited banner
    exchange_names = {}
    for b in banners:
        if b['type'] == 'limited' and len(b['featured']) == 1:
            names[(b['kind'], b['featured'][0][0])] = b['name']
        elif b['type'] == 'exchange':
            exchange_names[b['kind']] = b['name']
    for b in cn_pools:
        if (id(b) in debut_ids or b['type'] not in ('limited', 'exchange') or b['id'] <= last_global[b['kind']]
                or not all(uid in units[b['kind']] for uid in b['featured'] + b['options'])):
            continue
        version = max((p for p in cn_patches if p[0] <= b['start']), default=(None, None))[1]
        if not version or version_key(version) < version_key(newest):
            continue
        featured = [unit(b['kind'], uid) for uid in b['featured']]
        name = exchange_names[b['kind']] if b['type'] == 'exchange' else names.get((b['kind'], featured[0][0]), featured[0][0])
        banners.append({'id': b['id'], 'kind': b['kind'], 'name': name, 'type': b['type'], 'version': version,
                        'upcoming': True, 'start': None, 'end': None, 'image': b['image'], 'featured': featured,
                        'options': [unit(b['kind'], uid) for uid in b['options']],
                        **CN_OVERRIDES.get((b['kind'], b['id']), {})})
    for kind, units in (('pilot', pilots), ('st', mechs)):
        for uid, u in sorted(units.items(), key=lambda kv: (version_key(kv[1]['version']), int(kv[0]))):
            if version_key(newest) < version_key(u['version']) <= MAX_VERSION:
                d = cn_debut.get((kind, uid))
                banners.append({'id': d['id'] if d else int(uid), 'kind': kind, 'name': u['name'], 'type': 'limited',
                                'version': u['version'], 'upcoming': True, 'start': None, 'end': None,
                                'image': d and d['image'], 'featured': [(u['name'], u['version'])], 'options': []})

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
        if b['image']:
            row['image'] = b['image']
        out.append(row)

    order = {'standard': 0, 'beginner': 1}
    out.sort(key=lambda r: (r['type'] not in order, order.get(r['type'], 0), r.get('start') or '9999',
                            r['kind'] != 'pilot', r['id']))
    data = {
        'note': 'Global server banners from the game data. Banners not yet scheduled, including debuts for future patches, are listed under their patch without dates.',
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
