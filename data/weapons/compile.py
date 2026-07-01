import json, os

DIR = os.path.dirname(os.path.abspath(__file__))

DETAIL_FIELDS = [
    'grade', 'LimitedModelOfWeapon', 'RestrictionsPositionOfWeapon',
    'range', 'WeaponWeight', 'WeaponBasicAttackingPower',
    'WeaponHitPoint', 'WeaponUnderstanding', 'ShieldbloodBase',
    'PassiveSkill', 'describe',
]

# Load bulk translation files; per-weapon files can override these
bulk_translations = {}
for bulk_file in ['sssr-translations.json', 'ur-translations.json']:
    bp = os.path.join(DIR, bulk_file)
    if os.path.exists(bp):
        bulk_translations.update(json.load(open(bp, 'r', encoding='utf-8')))

# Build global passive ID → translation map so UR upgraded weapons
# sharing passive IDs with SSSR weapons also get EN descriptions
global_passive_translations = {}
for wt in bulk_translations.values():
    for pid, ptr in (wt.get('passiveSkills') or {}).items():
        if pid not in global_passive_translations:
            global_passive_translations[pid] = ptr

def apply_translation(entry, t):
    for key in ('name', 'describe', 'pilot', 'version'):
        if t.get(key):
            entry[key] = t[key]
    if t.get('passiveSkills') and entry.get('PassiveSkill'):
        for ps in entry['PassiveSkill']:
            tr = t['passiveSkills'].get(str(ps.get('ID', '')))
            if tr:
                for k, v in tr.items():
                    if v: ps[k] = v

def apply_global_passive_translations(entry):
    for ps in entry.get('PassiveSkill') or []:
        tr = global_passive_translations.get(str(ps.get('ID', '')))
        if tr:
            for k, v in tr.items():
                if v: ps[k] = v

weapons = []
for src_file in ['sssr-raw.json', 'ur-raw.json']:
    src_path = os.path.join(DIR, src_file)
    if not os.path.exists(src_path):
        continue
    raw_list = json.load(open(src_path, 'r', encoding='utf-8'))
    for w in raw_list:
        if not w.get('detail'):
            continue
        detail_arr = (w['detail'].get('data') or {}).get('data') or []
        if not detail_arr:
            continue
        d = detail_arr[0]
        entry = {
            'ID':          w['ID'],
            'name':        w['name'],
            'quality':     w['quality'],
            'WeaponType1': w.get('WeaponType1', ''),
            'WeaponType2': w.get('WeaponType2', ''),
            'type':        w.get('type', ''),
            'icon':        w.get('icon', ''),
        }
        for f in DETAIL_FIELDS:
            if d.get(f) is not None:
                entry[f] = d[f]

        apply_global_passive_translations(entry)

        if w['ID'] in bulk_translations:
            apply_translation(entry, bulk_translations[w['ID']])

        t_path = os.path.join(DIR, f"{w['ID']}-translation.json")
        if os.path.exists(t_path):
            apply_translation(entry, json.load(open(t_path, 'r', encoding='utf-8')))

        weapons.append(entry)

weapons.sort(key=lambda w: (w.get('WeaponType1', ''), w.get('WeaponType2', ''), w.get('name', '')))

out = {'weapons': weapons}
with open(os.path.join(DIR, 'compiled.json'), 'w') as f:
    json.dump(out, f, indent=2)
js = 'var WeaponsData = ' + json.dumps(out) + ';\n'
with open(os.path.join(DIR, 'compiled.js'), 'w') as f:
    f.write(js)

print(f'Compiled {len(weapons)} weapons ({len(js)//1024} KB)')
