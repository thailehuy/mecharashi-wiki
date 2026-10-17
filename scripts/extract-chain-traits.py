"""Extracts SSR weapon accessory chain traits (TA trigger + RA reaction pairs)
from the mined global-client DB into data/accessories/chain-traits.{json,js}
(window.ChainTraitsData), used by the Builder page's per-weapon accessory
pickers.

Reads the DB's WepComponents (wep_components) and WepChainTraits
(wep_chain_traits) tables, SSR quality only, skipping "Obsolete Data" rows
and any component that never appears in an allowed pair (e.g. "RA -
Debilitation (Not available)").

- `ta` / `ra`: component ID -> name, W (two-handed/backpack) flag, icon,
  probability factor, series (W and non-W variants share one — a weapon
  can't carry two accessories of the same kind and series), trigger/effect
  text, restriction text and `fits` (the WeaponType2 codes it can be
  slotted into, matching WeaponsData).
- `pairs`: TA ID -> {RA ID: chance}. Only allowed pairs are listed. A pair's
  own fits is always the intersection of its TA's and RA's fits (verified
  against the DB's per-pair `fits` column when this script runs).

The DB is gitignored (data/screenshots/MRT_FieldWiki/source/mecharashi.db, see the root
README), so this isn't part of compile.py — rerun it by hand after
refreshing the DB:

    python3 scripts/extract-chain-traits.py
"""
import json
import os
import re
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'data', 'accessories')
DB_PATH = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
OUT_JSON = os.path.join(DIR, 'chain-traits.json')
OUT_JS = os.path.join(DIR, 'chain-traits.js')
COMPILED_JSON = os.path.join(DIR, 'compiled.json')

# DB weapon-type names (as shown in game) -> WeaponType2 codes used by
# WeaponsData. Knuckles have no weapon on the site yet; "Knuckle" is the
# game's own code for them.
WEAPON_TYPE_CODES = {
    'Alter-Blade':       'Blade',
    'Chainsaw':          'Saw',
    'Cutter':            'Funnel',
    'Flamethrower':      'Flamethrower',
    'Heavy Machine Gun': 'HeavyMachineGun',
    'Knuckles':          'Knuckle',
    'Large Shield':      'Shield',
    'Light Rifle':       'LightSniper',
    'Machine Gun':       'MachineGun',
    'Missile Launcher':  'Missile',
    'Pile Bunker':       'PileBunker',
    'Polearm':           'Rod',
    'Rail Gun':          'RailGun',
    'Rocket Launcher':   'Rocket',
    'Shotgun':           'ShotGun',
    'Small Shield':      'Buckler',
    'Sniper Rifle':      'HeavySniper',
}
ALL_CODES = sorted(WEAPON_TYPE_CODES.values())

# "TA - Accurate", "TA W - Accurate", "TA-W - Annihilate", "RA-W - Slamming"
NAME_RE = re.compile(r'^(TA|RA)(?:[ -](W))? - (.+)$')


def parse_fits(text):
    if text == 'Any weapon':
        return list(ALL_CODES)
    codes = []
    for name in text.split(', '):
        if name not in WEAPON_TYPE_CODES:
            sys.exit('Unknown weapon type in fits: {!r}'.format(name))
        codes.append(WEAPON_TYPE_CODES[name])
    return sorted(codes)


def load_icons():
    """Accessory icons by (statetype, English name) from the existing
    accessories data — the DB has no icon keys."""
    icons = {}
    for a in json.load(open(COMPILED_JSON, encoding='utf-8'))['accessories']:
        icons[(a['statetype'], a['en_name'])] = a['icon']
    return icons


def clean_text(text):
    return (text or '').strip()


def main():
    if not os.path.exists(DB_PATH):
        sys.exit('Missing DB: ' + DB_PATH)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    icons = load_icons()

    rows = db.execute(
        "select component_id, name, kind, probability_factor, series, fits, effect, restriction "
        "from wep_components where quality = 'SSR' and name != 'Obsolete Data'"
    ).fetchall()

    components = {'ta': {}, 'ra': {}}
    for r in rows:
        m = NAME_RE.match(r['name'])
        if not m:
            sys.exit('Unexpected component name: {!r}'.format(r['name']))
        prefix, w, name = m.groups()
        kind = prefix.lower()
        statetype = ('Condition' if kind == 'ta' else 'Function') + ('_W' if w else '')
        entry = {
            'name': name,
            'w': bool(w),
            'icon': icons.get((statetype, name)) or icons.get((statetype.replace('_W', ''), name)),
            'factor': r['probability_factor'],
            'series': r['series'],
            'restriction': clean_text(r['restriction']),
            'fits': parse_fits(r['fits']),
        }
        entry['trigger' if kind == 'ta' else 'effect'] = clean_text(r['effect'])
        components[kind][str(r['component_id'])] = entry

    pairs = {}
    for r in db.execute(
        "select ta_id, ra_id, chance, fits from wep_chain_traits "
        "where ta_quality = 'SSR' and ra_quality = 'SSR' order by ta_id, ra_id"
    ):
        ta_id, ra_id = str(r['ta_id']), str(r['ra_id'])
        ta, ra = components['ta'].get(ta_id), components['ra'].get(ra_id)
        if not ta or not ra:
            sys.exit('Pair references an unknown component: {} + {}'.format(ta_id, ra_id))
        expected = sorted(set(ta['fits']) & set(ra['fits']))
        if parse_fits(r['fits']) != expected:
            sys.exit('Pair fits is not the TA/RA intersection: {} + {}'.format(ta_id, ra_id))
        pairs.setdefault(ta_id, {})[ra_id] = r['chance']

    # Drop components that never appear in an allowed pair.
    used_ra = {ra for ras in pairs.values() for ra in ras}
    components['ta'] = {k: v for k, v in components['ta'].items() if k in pairs}
    components['ra'] = {k: v for k, v in components['ra'].items() if k in used_ra}

    missing_icons = [v['name'] for kind in ('ta', 'ra') for v in components[kind].values() if not v['icon']]
    data = {'ta': components['ta'], 'ra': components['ra'], 'pairs': pairs}

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('window.ChainTraitsData = ' + json.dumps(data, ensure_ascii=False) + ';\n')

    print('Wrote {} TAs, {} RAs, {} pairs'.format(
        len(components['ta']), len(components['ra']), sum(len(v) for v in pairs.values())))
    if missing_icons:
        print('No icon for: ' + ', '.join(missing_icons))


if __name__ == '__main__':
    main()
