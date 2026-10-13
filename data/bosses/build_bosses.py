#!/usr/bin/env python3
"""Add the Armed Conquest and Clearance Ops boss line-ups to bosses.json.

The `bosses` map (name, pilot link, images) is kept by hand. This script
rebuilds `armed_conquest` and `clearance_ops` from the DMG calc's targets
(data/dmgcalc/bench-data.js), then writes bosses.json and bosses.js.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BENCH = os.path.join(ROOT, 'data', 'dmgcalc', 'bench-data.js')
WEAPONS = os.path.join(ROOT, 'data', 'weapons', 'compiled.json')
OUT = os.path.join(HERE, 'bosses.json')
OUT_JS = os.path.join(HERE, 'bosses.js')

CO_FROM = 11  # first Clearance Ops chapter listed

AC_LABEL = re.compile(r'^(.*) · (.*) (\d+) · (.*)$')       # "Ride or Die · Hard 2 · Garcia"
CO_LABEL = re.compile(r'^(\d+)\. (.*) (\d+) · (.*)$')       # "17. Crossroads of Memory 1 · Jon"
# Armed Conquest seasons in release order (AC number = position). Not in the
# game data; kept by hand.
AC_SEASONS = [
    'Trapped Beast',
    'Thunder Rumbles',
    'Cross The Line',
    'Restless Soul',
    'Empty Promise',
    'Longest Night',
    'Lost in the Desert',
    'Wildfire',
    'The Savage Law',
    'Submerged Era',
    'The End of Destiny',
    'Ride or Die',
    'Survival Edge',
]
# Each season's version is its weapons' version, as on the weapons page.
# AC1 brought no weapons.
AC_VERSIONS = {1: '1.1'}
DIFFICULTIES = ['Normal', 'Hard', 'Extreme', 'Inferno']
# The DMG calc's labels for the last two difficulties -> their in-game names.
DIFFICULTY_NAMES = {'Hell': 'Extreme', 'Difficulty 4': 'Inferno'}


def load_targets():
    with open(BENCH, encoding='utf-8') as f:
        text = f.read()
    text = text[text.index('=') + 1:].strip().rstrip(';')
    return json.loads(text)['targets']


def ac_versions():
    """AC number -> version of its newest weapon (what the weapons page shows)."""
    with open(WEAPONS, encoding='utf-8') as f:
        weapons = json.load(f)['weapons']
    versions = dict(AC_VERSIONS)
    for w in weapons:
        if w.get('ac') and w.get('version') and w.get('quality') == 'SSSR':
            v = versions.get(w['ac'])
            if v is None or float(w['version']) > float(v):
                versions[w['ac']] = w['version']
    return versions


def part_hp(t):
    # Both arms always have the same HP.
    hp = t['hp']
    return {'body': round(hp['Body']), 'arm': round(hp['Left arm']), 'legs': round(hp['Legs'])}


def mech_class(t):
    # Boss-only mechs (Hades, Leviathan, Holmberg, Tonatiuh) have no class in
    # the game data; the game calls them Titans.
    return t['cls'] or 'Titan'


def canonical(name, bosses):
    for b in bosses.values():
        if name == b['name'] or name in b.get('aliases', []):
            return b['name']
    raise ValueError('Boss not in bosses.json: %s' % name)


def main():
    with open(OUT, encoding='utf-8') as f:
        data = json.load(f)
    bosses = data['bosses']

    ac, co = {}, {}
    for t in load_targets():
        if t['content'] == 'Armed Conquest':
            m = AC_LABEL.match(t['label'])
            season, diff, slot, boss = m.group(1), m.group(2), int(m.group(3)), m.group(4)
            s = ac.setdefault(season, {'number': None, 'name': season, 'version': None, 'stages': {}})
            # The boss and its mech are the same on every difficulty of a stage.
            st = s['stages'].setdefault(slot, {'slot': slot, 'boss': canonical(boss, bosses), 'mech': t['mech'], 'cls': mech_class(t), 'difficulties': [], 'hp': {}})
            diff = DIFFICULTY_NAMES.get(diff, diff)
            st['difficulties'].append(diff)
            st['hp'][diff] = part_hp(t)
        elif t['content'] == 'Clearance Ops':
            m = CO_LABEL.match(t['label'])
            chapter, name, slot, boss = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
            if chapter < CO_FROM:
                continue
            c = co.setdefault(chapter, {'chapter': chapter, 'name': name, 'battle': t['battle'], 'stages': {}})
            c['stages'].setdefault(slot, {'slot': slot, 'boss': canonical(boss, bosses), 'mech': t['mech'], 'cls': mech_class(t), 'hp': part_hp(t)})

    versions = ac_versions()
    missing = [name for name in ac if name not in AC_SEASONS]
    if missing:
        raise ValueError('Add these Armed Conquest seasons to AC_SEASONS: %s' % ', '.join(missing))
    for s in ac.values():
        s['number'] = AC_SEASONS.index(s['name']) + 1
        s['version'] = versions.get(s['number'])
        stages = []
        for slot in sorted(s['stages']):
            st = s['stages'][slot]
            st['difficulties'] = [d for d in DIFFICULTIES if d in st['difficulties']]
            st['hp'] = {d: st['hp'][d] for d in st['difficulties']}
            stages.append(st)
        s['stages'] = stages
    for c in co.values():
        c['stages'] = [c['stages'][k] for k in sorted(c['stages'])]

    # Newest first: AC by season number, CO by chapter number.
    data['armed_conquest'] = sorted(ac.values(), key=lambda s: -s['number'])
    data['clearance_ops'] = sorted(co.values(), key=lambda c: -c['chapter'])

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('window.BossesData = ')
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(';\n')
    print('Wrote %s (%d bosses, %d AC seasons, %d CO chapters)' % (OUT, len(bosses), len(ac), len(co)))


if __name__ == '__main__':
    main()
