#!/usr/bin/env python3
"""Export every R&D feature from the mined DB, grouped the way the Features
page shows them: pilot class, ST weight class and weapon R&D tree.
Writes features.json and features.js. Run: python3 scripts/build_features.py

Each feature also carries what a loadout picker needs to filter it:
  slots         feature ports it fits: ["I"], ["II"], ["III"] or all three
  for           pilot: its class; ST: its weight class, or "any"
  weapon_types  weapon: the weapon types (WeaponType2 codes) it affects, or
                null when it affects every weapon; it fits any weapon port
  basic         Basic features (the pilot attribute features and the weapon
                upgrades and modifications): two with the same key can't be
                equipped together, i.e. a feature and its II version. The game
                words this rule two ways ("Basic Features of the same type
                cannot be equipped simultaneously" / "Cannot equip duplicate
                Basic Features") for the same kind of features. Any feature
                can only be equipped once per loadout.
and pilot_classes maps the wiki's pilot Profession to the R&D class."""
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'features')
DB = os.path.join(HERE, '..', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
BENCH = os.path.join(HERE, '..', 'dmgcalc', 'bench-data.js')
PILOTS = os.path.join(HERE, '..', 'pilots', 'compiled.json')
OUT = os.path.join(HERE, 'features.json')
OUT_JS = os.path.join(HERE, 'features.js')

# Feature ID digit 1 = port type, digit 2 = which tree (see the DB's Notes sheet).
PILOT_CLASSES = ['Fighter', 'Raider', 'Sniper', 'Tactician', 'Guardian', 'Machinist']
ST_CLASSES = ['Light', 'Medium', 'Heavy']
WEAPON_TREES = ['Melee', 'Assault', 'Ranged', 'Tactical', 'Shield']

# Every weapon type (WeaponType2) a player weapon can have.
WEAPON_TYPES = ['Knuckle', 'PileBunker', 'Blade', 'Rod', 'Saw', 'Buckler', 'Shield',
                'MachineGun', 'HeavyMachineGun', 'ShotGun', 'Flamethrower',
                'LightSniper', 'HeavySniper', 'Missile', 'Rocket', 'RailGun', 'Funnel']
# Weapon features made for one weapon type (or the shields), by the weapon
# named in the feature. Takes priority over the DMG calc's effects, which
# don't always name it (Chainsaw) or have none (mechanic-only modifications).
MOD_WEAPONS = [
    ('Pile Bunker', ['PileBunker']), ('Polearm', ['Rod']), ('Chainsaw', ['Saw']), ('Alter-Blade', ['Blade']),
    ('Shotgun', ['ShotGun']), ('Flamethrower', ['Flamethrower']), ('Heavy Machine Gun', ['HeavyMachineGun']),
    ('Machine Gun', ['MachineGun']), ('Light Rifle', ['LightSniper']), ('Sniper Rifle', ['HeavySniper']),
    ('Missile Launcher', ['Missile']), ('Rail Gun', ['RailGun']), ('Rocket Launcher', ['Rocket']),
    ('Cutter', ['Funnel']), ('Shield Weapon', ['Buckler', 'Shield']),
]

# The mined data has no icon field, so icons are assigned here.
# Pilot attribute % features share one icon per attribute (Icon_RnD_N_*, in the
# game's attribute order: Melee, Assault, Snipe, Ranged, Mechanic, Defense;
# shown as Melee, Assault, Ranged, Tactical, Mechanics, Defense); Hybrid
# Training is E_3031. Base and II use the same icon.
RND_ICONS = 'data/unlisted/rnd/'
ATTR_ICONS = {
    'Melee': 'N_1001', 'Assault': 'N_1002', 'Ranged': 'N_1003',
    'Tactical': 'N_1004', 'Mechanics': 'N_1005', 'Defense': 'N_1006',
    'Hybrid Training': 'E_3031',
}
# Every other feature, by feature ID, worked out from the icon art (not
# confirmed in game). Conventions in the art: a crosshair = Hit, a burst or
# sparkle = Crit, chevrons or an up arrow = the II version; on ST features the
# glyph is the weight class (L, M, H). A value with a "/" is a full asset path
# (some features reuse a pilot passive or module icon). Confirmed by the user:
# Lone Wolf, Raider High Energy, Urgent Repair, Stable Refit - Armor and the
# weapon modifications except Pile Bunker and Missile Launcher.
FEATURE_ICONS = {
    # Pilot: RA = Re-ATK, SA = Link (support attack), SD = Guard
    '11004051': 'E_1001', '11004052': 'E_1002',                       # Fighter Re-ATK Flurry Strike / Crit
    '13004051': 'E_1005', '13004052': 'E_1006',                       # Sniper Re-ATK Hit / Crit
    '14004051': 'E_1005', '14004052': 'E_1006',                       # Tactician Re-ATK Hit / Crit
    '12004051': 'E_1003', '12004052': 'E_1004',                       # Raider Link Hit / Crit
    '16004051': 'E_1003', '16004052': 'E_1007',                       # Machinist Link Hit / DMG
    '15004051': 'E_1008', '15004052': 'E_1009',                       # Guardian Guard DMG Taken / Retaliation
    '11008051': 'data/unlisted/pilot_skills/Icon_skill_passive_2117.png',  # Fighter Lone Wolf DMG Reduction (pilot passive icon)
    '11008101': 'data/unlisted/pilot_skills/Icon_skill_passive_4114.png',  # Fighter Lone Wolf Hit (pilot passive icon)
    '11005051': 'E_3032', '11005101': 'E_3033',                       # Fighter Mobility Hit / Crit (running boot)
    '12005051': 'E_3034', '12005101': 'E_3035',                       # Raider Ballistics Armor Piercing / DMG Reduction
    '12008051': 'data/unlisted/pilot_skills/Icon_skill_passive_1152.png',  # Raider High Energy (pilot passive icon)
    '12008101': 'E_3047',                                             # Raider Std. Energy (AP 3)
    '13005051': 'E_3036', '13005101': 'E_3037',                       # Sniper Stability Hit / Crit (planted)
    '13008051': 'E_3048', '13008101': 'E_3049',                       # Sniper First Strike Hit / Crit
    '14005051': 'E_3038', '14005101': 'E_3039',                       # Tactician Load Hit / Crit (reload loop)
    '14008051': 'E_3050', '14008101': 'E_3051',                       # Tactician Modified Ammo / Regularization
    '15005051': 'E_3040', '15005101': 'E_3041',                       # Guardian Defense DMG Reduction / Dodge
    '15008051': 'E_3054', '15008101': 'E_3055',                       # Guardian Guts Endurance (refresh) / Recuperate (AP+)
    '16005051': 'E_3042', '16005101': 'E_3043',                       # Machinist Repair Single / Mass
    '16008101': 'E_3053',                                             # Machinist Urgent Repair (same icon)
    '16008051': 'E_3053',                                             # Machinist Maintenance Repair (wrench + part)
    # ST
    '21001101': 'E_2018',                                             # Stable Refit - DMG Taken (100%)
    '22001101': 'E_2018',                                             # Stable Refit - Armor (same icon as DMG Taken)
    '23001101': 'E_2019',                                             # Fortitude Refit - Firepower (50%)
    # Weapon: per-category upgrades (fist, spikes, target, missiles)
    '31001071': 'E_3002', '31001072': 'E_3003', '31004071': 'E_3059', '31004141': 'E_3060',
    '32001071': 'E_3005', '32001072': 'E_3006', '32004071': 'E_3061', '32004141': 'E_3062',
    '33001071': 'E_3008', '33001072': 'E_3009', '33004071': 'E_3063', '33004141': 'E_3064',
    '34001071': 'E_3011', '34001072': 'E_3012', '34004071': 'E_3065', '34004141': 'E_3066',
    '35002071': 'E_3014', '35004141': 'E_3067', '35010141': 'E_3015',  # Shield HP / HP II / Shield Modification
    '32003071': 'E_3022', '32008071': 'E_3083',                       # Onslaught Hit / II (50%)
    '31003071': 'E_3023', '31008071': 'E_3084',                       # Onslaught Crit / II
    '35003071': 'E_3016', '35008071': 'E_3080',                       # Anti-Armor L / II (yellow L)
    '33003071': 'E_3019', '33008071': 'E_3081',                       # Anti-Armor M / II
    '34003071': 'E_3021', '34008071': 'E_3082',                       # Anti-Armor H / II
    # Weapon modifications (red "I" badges)
    '31001141': 'E_3001',                                             # Pile Bunker
    '31002071': 'E_3024',                                             # Polearm
    '31010071': 'E_3072',                                             # Chainsaw
    '31010141': 'data/unlisted/mech_modules/Icon_entry_40301.png',    # Alter-Blade (Blade Mod module icon)
    '32001141': 'E_3007',                                             # Shotgun
    '32002071': 'E_3025',                                             # Flamethrower
    '32010071': 'E_3070',                                             # Heavy Machine Gun
    '32010141': 'E_3069',                                             # Machine Gun
    '33001141': 'E_3004', '33010071': 'E_3004',                       # Sniper Rifle / II
    '33002071': 'E_3026', '33010141': 'E_3026',                       # Light Rifle / II
    '34001141': 'E_3010',                                             # Missile Launcher
    '34010071': 'E_3071',                                             # Rocket Launcher
    '34010141': 'data/unlisted/mech_modules/Icon_entry_40311.png',    # Cutter (Cutter Mod module icon)
    '34002071': 'E_3027',                                             # Rail Gun
}
# ST refits: colour = feature type, glyph = weight class. HP Upgrade has one
# (purple) set for base and II.
ST_ICONS = {
    'Integrated': (['E_2001', 'E_2004', 'E_2007'], ['E_3073', 'E_3074', 'E_3075']),
    'HP Upgrade': (['E_3056', 'E_3057', 'E_3058'], ['E_3056', 'E_3057', 'E_3058']),
    'Core':       (['E_3028', 'E_3029', 'E_3030'], ['E_3076', 'E_3077', 'E_3078']),
}
PORT_ORDER = {'I,II,III': 0, 'I': 1, 'II': 2, 'III': 3}


def icon(fid, name):
    m = re.match(r'^\w+ - (.+?)(?: II)?$', name)
    key = ATTR_ICONS.get(m.group(1)) if fid[0] == '1' and m else None
    key = key or FEATURE_ICONS.get(fid)
    if not key and fid[0] == '2':
        kind = 'Integrated' if 'Integrated' in name else 'HP Upgrade' if 'HP Upgrade' in name else 'Core' if 'Core' in name else None
        if kind:
            key = ST_ICONS[kind][name.endswith(' II')][int(fid[1]) - 1]
    if not key:
        return None
    return key if '/' in key else RND_ICONS + 'Icon_RnD_' + key + '.png'


def load_bench():
    with open(BENCH, encoding='utf-8') as fh:
        text = fh.read()
    return json.loads(text[text.index('=') + 1:].strip().rstrip(';'))


def weapon_types(fid, name, bench):
    """WeaponType2 codes a weapon feature affects, from the DMG calc's effects
    (per-type rows, a weapon category, or an "Attacking with" condition);
    None when that is every weapon type, or an effect has no weapon limit."""
    named = next((ts for word, ts in MOD_WEAPONS if word in name), None)
    if named:
        return named
    cat_types = {}
    for w in bench['weapons'].values():
        cat_types.setdefault(w['cat'], set()).add(w['type'])
    bits = bench['wtBits']
    feat = bench['features'].get(fid)
    types = set()
    for e in bench['fx'].get(feat['fx'], []) if feat else []:
        mine = set()
        if e.get('wt'):
            mine.add(e['wt'])
        if e.get('wc'):
            mine |= cat_types.get(e['wc'], set())
        for c in e.get('c') or []:
            if c['t'] == 'wtype':
                mine |= {t for t, b in bits.items() if c['v'] & b}
        if not mine:
            return None
        types |= mine
    types &= set(WEAPON_TYPES)
    if not types:
        raise ValueError('No weapon type for feature %s %s' % (fid, name))
    return None if types >= set(WEAPON_TYPES) - {'Knuckle'} else [t for t in WEAPON_TYPES if t in types]


def pilot_classes(con):
    """The wiki's pilot Profession (Striker, ...) -> R&D class (Fighter, ...), from pilots in both."""
    db = {str(r[0]): r[1] for r in con.execute('select pilot_id, class from pilots')}
    with open(PILOTS, encoding='utf-8') as fh:
        pilots = json.load(fh)['pilots']
    out = {}
    for p in pilots:
        cls = db.get(str(p['ID']))
        if cls in PILOT_CLASSES:
            if out.setdefault(p['Profession'], cls) != cls:
                raise ValueError('Profession %s maps to both %s and %s' % (p['Profession'], out[p['Profession']], cls))
    return out


def cost(text):
    """'4 Fighter Cube I,2 Guardian Cube I,22500 GameMoney' -> [[4, 'Fighter Cube I'], ...]"""
    out = []
    for part in (text or '').split(','):
        n, item = part.strip().split(' ', 1)
        out.append([int(n), item])
    return out


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    rows = con.execute('select * from rd_features order by feature_id').fetchall()
    bench = load_bench()

    sections = {
        'pilot': {c: [] for c in PILOT_CLASSES},
        'st': {c: [] for c in ST_CLASSES},
        'weapon': {t: [] for t in WEAPON_TREES},
    }
    for r in rows:
        fid = str(r['feature_id'])
        kind, tree = int(fid[0]), int(fid[1]) - 1
        name = re.sub(r' -(?=\S)', ' - ', r['name'])     # "Fighter -Special Training" typo in the game data
        f = {
            'id': fid,
            'name': name,
            'group': r['group'],
            'slots': r['ports'].split(','),
            'effect': r['effect'],
            'rule': r['rule'],
            'cost': cost(r['unlock_cost']),
            'icon': icon(fid, name),
        }
        if 'Basic Features' in (r['rule'] or ''):
            f['basic'] = re.sub(r' II$', '', name)
        if kind == 1:
            f['for'] = PILOT_CLASSES[tree]
            sections['pilot'][PILOT_CLASSES[tree]].append(f)
        elif kind == 2:
            f['for'] = 'any' if r['port_type'] == 'mech:any' else ST_CLASSES[tree]
            sections['st'][ST_CLASSES[tree]].append(f)
        else:
            f['weapon_types'] = weapon_types(fid, name, bench)
            sections['weapon'][WEAPON_TREES[tree]].append(f)
    for groups in sections.values():
        for fs in groups.values():
            fs.sort(key=lambda f: (PORT_ORDER[','.join(f['slots'])], f['id']))

    out = {
        '_source': 'data/screenshots/MRT_FieldWiki/source/mecharashi.db table rd_features',
        'pilot_classes': pilot_classes(con),
        'pilot': sections['pilot'],
        'st': sections['st'],
        'weapon': sections['weapon'],
    }
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, indent=2, ensure_ascii=False)
        fh.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8') as fh:
        fh.write('window.FeaturesData = ')
        json.dump(out, fh, ensure_ascii=False)
        fh.write(';\n')
    n = sum(len(fs) for g in sections.values() for fs in g.values())
    print('Wrote %s (%d features)' % (OUT, n))


if __name__ == '__main__':
    main()
