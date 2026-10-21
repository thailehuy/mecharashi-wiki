#!/usr/bin/env python3
"""Move the wiki to the version the global (EN) server is running, from the
banner timeline (data/banners/banners.json, build_banners.py) and the global
client's tables (RebuildGameUpdate/out/stats.db).

    python3 scripts/set_global_version.py                  # the newest version whose banners have opened
    python3 scripts/set_global_version.py --version 2.4    # this version
    python3 scripts/set_global_version.py --dry-run        # print the changes, write nothing

The live version is the newest one with a banner that has opened by today; the
client can't say (it holds units of the next patches before they're out).

- Banners: the version's banner timeline is printed, with its banners that
  still have no dates and the next version's banners already scheduled.
- js/app.js: GLOBAL_VERSION, the badge in the header. The pilot, ST, weapon and
  backpack pages warn that a unit's text is translated from CN while its
  version is newer than it, so the version's units lose that warning.
- js/pages/dispatchcalc.js: the Dispatch Calculator's schedule starts at the
  version (DCALC_PATCHES loses the patches before it), on the day its first
  banner opened (DCALC_FIRST_PATCH). Dispatch rows (data/dispatch.json) from
  before the first patch are always in the pool; the others join it as their
  patch starts. The global client's dispatch pool
  (ConfigDataDispatchTaskFactoryInfo.RewardSuit) is checked against that, and
  a version's patch length against its banners.
"""
import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import date, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
BANNERS = os.path.join(ROOT, 'data', 'banners', 'banners.json')
DISPATCH = os.path.join(ROOT, 'data', 'dispatch.json')
MECHS = os.path.join(ROOT, 'data', 'db', 'mechs.json')
APP_JS = os.path.join(ROOT, 'js', 'app.js')
CALC_JS = os.path.join(ROOT, 'js', 'pages', 'dispatchcalc.js')
GROUPS = ['Arsenal', 'InnovativE', 'GeekX', 'Sparkplug']   # DISPATCH_GROUPS in js/pages/dispatch.js

VERSION_RE = re.compile(r"^var GLOBAL_VERSION = ([\d.]+);", re.M)
FIRST_RE = re.compile(r"^var DCALC_FIRST_PATCH = '([\d-]+)';", re.M)
PATCHES_RE = re.compile(r"^var DCALC_PATCHES = \[\n(.*?)\n\];", re.M | re.S)


def version_key(v):
    return tuple(int(x) for x in v.split('.'))


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def write(path, text, dry_run):
    if not dry_run:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)


def live_version(banners, today):
    """The newest version with a banner that has opened by today."""
    opened = [b['version'] for b in banners if b.get('version') and b.get('start') and b['start'] <= today]
    return max(opened, key=version_key) if opened else None


def report_banners(banners, version, today):
    """Print the version's banner timeline; return the day its first banner opened."""
    mine = [b for b in banners if b.get('version') == version]
    dated = sorted((b for b in mine if b.get('start')), key=lambda b: (b['start'], b['kind'], b['id']))
    print(f'v{version} banners:')
    for b in dated:
        print(f"  {b['start']} to {b.get('end') or '?'}  {b['kind']:5}  {b['name']}")
    for b in mine:
        if not b.get('start'):
            print(f"  WARNING: {b['kind']} banner {b['name']} ({b['id']}) has no dates yet")
    later = sorted({b['version'] for b in banners if b.get('version') and b.get('start') and b['start'] > today
                    and version_key(b['version']) > version_key(version)}, key=version_key)
    for v in later:
        first = min(b['start'] for b in banners if b.get('version') == v and b.get('start'))
        print(f'  v{v} banners open on {first}: run this again then')
    return dated[0]['start'] if dated else None


def set_global_version(version, dry_run):
    text = read(APP_JS)
    m = VERSION_RE.search(text)
    if not m:
        sys.exit(f'No GLOBAL_VERSION in {os.path.relpath(APP_JS, ROOT)}')
    if version_key(m.group(1)) >= version_key(version):
        print(f'GLOBAL_VERSION: {m.group(1)}, unchanged')
        return
    print(f'GLOBAL_VERSION: {m.group(1)} -> {version}')
    write(APP_JS, text[:m.start(1)] + version + text[m.end(1):], dry_run)


def set_dispatch_schedule(version, start, banners, dry_run):
    """Start the Dispatch Calculator's schedule at the version; return its first patch's version."""
    text = read(CALC_JS)
    first, block = FIRST_RE.search(text), PATCHES_RE.search(text)
    if not first or not block:
        sys.exit(f'No DCALC_FIRST_PATCH / DCALC_PATCHES in {os.path.relpath(CALC_JS, ROOT)}')
    patches = [(v, int(w)) for v, w in re.findall(r"\['([\d.]+)', (\d+)\]", block.group(1))]
    versions = [v for v, _ in patches]
    if version not in versions:
        if patches and version_key(versions[0]) > version_key(version):
            print(f'Dispatch Calculator: the schedule already starts at v{versions[0]}, unchanged')
            return versions[0]
        sys.exit(f'Dispatch Calculator: v{version} is not in DCALC_PATCHES; add it (and its length in weeks) first')
    if not start:
        print(f'Dispatch Calculator: v{version} has no dated banner, so no start day: unchanged (starts at '
              f'v{versions[0]} on {first.group(1)})')
        return versions[0]
    kept = patches[versions.index(version):]
    weeks = kept[0][1]
    # Its patch-long banners end when it does.
    end = max((b['end'] for b in banners if b.get('version') == version and b.get('end')), default=None)
    expected = (date.fromisoformat(start) + timedelta(weeks=weeks)).isoformat()
    if end and end != expected:
        print(f'  WARNING: v{version} is {weeks} weeks in DCALC_PATCHES (to {expected}), its banners run to {end}')
    if start == first.group(1) and kept == patches:
        print(f'Dispatch Calculator: starts at v{version} on {start}, unchanged')
        return version
    print(f'Dispatch Calculator: starts at v{version} on {start} (was v{versions[0]} on {first.group(1)})')
    rows = [', '.join(f"['{v}', {w}]" for v, w in kept[i:i + 7]) + ',' for i in range(0, len(kept), 7)]
    text = text[:block.start(1)] + '\n'.join('  ' + r for r in rows) + text[block.end(1):]
    first = FIRST_RE.search(text)
    write(CALC_JS, text[:first.start(1)] + start + text[first.end(1):], dry_run)
    return version


def check_dispatch_pool(first_patch):
    """Compare the global client's dispatch pool with the rows the calculator has in it before its schedule."""
    if not os.path.exists(STATS):
        print(f'Dispatch pool: no {os.path.relpath(STATS, ROOT)}, not checked')
        return
    mechs = load(MECHS)
    c = sqlite3.connect(STATS)
    pool = set()
    for (suits,) in c.execute('select RewardSuit from ConfigDataDispatchTaskFactoryInfo'):
        for suit in json.loads(suits):
            r = c.execute('select WapPartBodyId from ConfigDataTacticalUnitSuitInfo where ID = ?', (suit,)).fetchone()
            name = r and mechs.get(str(r[0]), {}).get('name')
            pool.add(name or f'suit {suit}')
    listed = set()
    for row in load(DISPATCH)['dispatch']:
        names = {row[g] for g in GROUPS}
        listed |= names
        early = version_key(row['cnPatch']) < version_key(first_patch)
        if early and not names <= pool:
            print(f"  WARNING: dispatch row v{row['cnPatch']} is in the calculator's pool, but the global client "
                  f"doesn't have {', '.join(sorted(names - pool))} in its dispatch pool")
        elif not early and names & pool:
            print(f"  WARNING: the global client's dispatch pool already has {', '.join(sorted(names & pool))} "
                  f"(row v{row['cnPatch']}), which the calculator only adds at v{row['cnPatch']}")
    for name in sorted(pool - listed):
        print(f'  WARNING: {name} is in the global dispatch pool but not in data/dispatch.json')
    print(f'Dispatch pool: {len(pool)} STs on global, checked')


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--version', help='the version global is running (default: the newest whose banners have opened)')
    ap.add_argument('--dry-run', action='store_true', help='print the changes, write nothing')
    a = ap.parse_args()
    banners = load(BANNERS)['banners']
    today = date.today().isoformat()
    version = a.version or live_version(banners, today)
    if not version:
        sys.exit('No banner has opened yet: run build_banners.py first')
    print(f'Global is on v{version}')
    start = report_banners(banners, version, today)
    set_global_version(version, a.dry_run)
    first_patch = set_dispatch_schedule(version, start, banners, a.dry_run)
    check_dispatch_pool(first_patch)


if __name__ == '__main__':
    main()
