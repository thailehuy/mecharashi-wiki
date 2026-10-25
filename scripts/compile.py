#!/usr/bin/env python3
"""Compile the data/db/ tables into the JS bundles the wiki pages load.

data/db/ holds one JSON table per entity, keyed by game ID, with the final
English text. This script joins them back into the shapes the pages read
(PilotsData, MechsData, ModulesData, WeaponsData, BackpacksData), writes each
to data/<kind>/compiled.{json,js}, then compiles glossary/dispatch/exskills
and refreshes the builder index maps.
"""

import json, os, sys, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
DB = os.path.join(DATA, 'db')

QUALITY_ORDER = {'SSR': 0, 'SR': 1, 'R': 2}
BACKPACK_QUALITY_ORDER = {'SSSR': 0, 'UR': 1, 'SSR': 2, 'SR': 3, 'R': 4}
STAT_KEYS = [('combat', 'Combat'), ('assault', 'Assault'), ('shooting', 'Shooting'),
             ('tactics', 'Tactics'), ('defense', 'Defense'), ('engineering', 'Engineering'),
             ('ap_init', 'InitialPilotAPValue_PilotAPInitBase'),
             ('ap_max', 'MaximumPilotAPValue_PilotAPMaxBase'),
             ('ap_regen', 'PilotAPRecoveryperTurn_PilotAPRecoverBase')]
RANKED_STATS = ['Combat', 'Shooting', 'Assault', 'Tactics', 'Engineering']


def load(name):
    with open(os.path.join(DB, name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def rename(row, mapping):
    """Copy present db-named fields of row to their output names."""
    return {out: row[db] for db, out in mapping if db in row}


# ── Validation ───────────────────────────────────────────────────────────────

def validate(t):
    errors = []

    def ref(table, key, where):
        if key not in t[table]:
            errors.append(f'{where}: unknown {table} id {key!r}')

    for pid, p in t['pilots'].items():
        for sid in p.get('talents', []):
            ref('skills', sid, f'pilots[{pid}].talents')
        for n in p.get('neural', []):
            ref('neural_partitions', n['partition'], f'pilots[{pid}].neural')
        if pid not in t['pilot_neurons']:
            errors.append(f'pilots[{pid}]: no pilot_neurons entry')
    for pid, nodes in t['pilot_neurons'].items():
        ref('pilots', pid, 'pilot_neurons')
        for n in nodes:
            if 'skill' in n:
                ref('skills', n['skill'], f'pilot_neurons[{pid}][{n["id"]}]')
    for part_id, part in t['neural_partitions'].items():
        for e in part['effects']:
            ref('skills', e['skill'], f'neural_partitions[{part_id}]')
    for mid, m in t['mechs'].items():
        for part_id in m.get('parts', []):
            ref('mech_parts', part_id, f'mechs[{mid}].parts')
        for mod in m.get('modules', []):
            fam = t['modules'].get(mod['family'])
            if not fam or str(mod['level']) not in fam['levels']:
                errors.append(f'mechs[{mid}].modules: unknown module {mod["family"]} level {mod["level"]}')
    for part_id, part in t['mech_parts'].items():
        ref('mechs', part['mech'], f'mech_parts[{part_id}]')
    def crafting_refs(row, where):
        for c in row.get('crafting', []):
            kind = next(k for k in ('backpack', 'weapon', 'material') if k in c)
            ref(kind + 's', c[kind], where)

    for wid, w in t['weapons'].items():
        for sid in w.get('passives', []):
            ref('skills', sid, f'weapons[{wid}].passives')
        crafting_refs(w, f'weapons[{wid}].crafting')
    for bid, b in t['backpacks'].items():
        crafting_refs(b, f'backpacks[{bid}].crafting')
    for key, m in t['materials'].items():
        crafting_refs(m, f'materials[{key}].crafting')
    for pid in t['pilot_lore']:
        ref('pilots', pid, 'pilot_lore')
    for mid in t['mech_lore']:
        ref('mechs', mid, 'mech_lore')

    if errors:
        print('FAILED: data/db has broken references')
        for e in errors:
            print('  ' + e)
        sys.exit(1)


# ── Builders ─────────────────────────────────────────────────────────────────

def skill_out(skills, sid):
    s = skills[sid]
    out = {'ID': sid, 'name': s.get('name', '')}
    out.update(rename(s, [('describe', 'describe'), ('effect', 'SpecificEffects')]))
    out['SkillIcon'] = s.get('skill_icon', s.get('icon', ''))
    out['icon'] = s.get('icon', '')
    out.update(rename(s, [('ap', 'Ap'), ('cd', 'CD'), ('type', 'type'), ('resource', 'resource')]))
    return out


def build_pilots(t):
    skills = t['skills']
    pilots = []
    for pid, p in t['pilots'].items():
        talents = p.get('talents', [])
        entry = {
            'ID': pid,
            'PilotName': p.get('name', ''),
            'PortraitHeroIcon': p.get('portrait_icon', ''),
            'AvatarHeroIcon': p.get('avatar_icon', ''),
            'RealName': p.get('real_name', ''),
            'Gender': p.get('gender', ''),
            'Profession': p.get('profession', ''),
            'Occupation': p.get('occupation', ''),
            'quality': p.get('quality', ''),
            'Talent0_2Ability': skill_out(skills, talents[0]) if len(talents) > 0 else '',
            'Talent3_5Ability': skill_out(skills, talents[1]) if len(talents) > 1 else '',
            'NeuralDriveTemplate': {
                'ID': pid,
                'ListChipPartition': [{
                    'name': part['name'],
                    'TypeComputing': part['type'],
                    'ListAssembled': n['slots'],
                    'ListActivationEffects': [
                        {'MinimumSum': e['min'], 'PassiveSkill': skill_out(skills, e['skill'])}
                        for e in part['effects']
                    ],
                } for n in p.get('neural', []) for part in [t['neural_partitions'][n['partition']]]],
            },
            'biomimetic_computer_data': [],
            'AllowedMechaDriveList_DriveAllowedList': p.get('license', ''),
            'AlternateSkins': p.get('skins', ''),
            'Introduction': p.get('introduction', ''),
            'stats': {out: p.get('stats', {}).get(db) for db, out in STAT_KEYS},
            'version': p.get('version', '1.0'),
        }
        for n in t['pilot_neurons'][pid]:
            node = {'ID': n['id'], 'UnitType': n['type']}
            node.update(rename(n, [('icon', 'icon'), ('innate', 'skill3')]))
            if 'skill' in n:
                node['skill'] = skill_out(skills, n['skill'])
            entry['biomimetic_computer_data'].append(node)
        entry.update(rename(p, [('summon_skills', 'summonSkills'),
                                ('form_skill_groups', 'formSkillGroups')]))
        pilots.append(entry)

    def to_num(v):
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    for field in RANKED_STATS:
        values = sorted({to_num(p['stats'].get(field)) for p in pilots} - {None}, reverse=True)
        rank_of = {v: i + 1 for i, v in enumerate(values)}
        for p in pilots:
            v = to_num(p['stats'].get(field))
            if v is not None:
                p.setdefault('statRanks', {})[field] = rank_of[v]

    pilots.sort(key=lambda p: (QUALITY_ORDER.get(p['quality'], 9), p['PilotName']))
    return {'pilots': pilots}


def mech_module_out(modules, fam_id, level):
    fam = modules[fam_id]
    lv = fam['levels'][str(level)]
    icon = lv.get('icon', fam['icon'])
    return {'ID': lv.get('id', fam_id + str(level)), 'name': fam['name'], 'SpecificEffects': lv['effect'],
            'SkillIcon': icon, 'icon': icon, 'id': fam_id, 'level': level}


def build_mechs(t):
    mechs = []
    for mid, m in t['mechs'].items():
        entry = {'ID': mid}
        entry.update(rename(m, [('name', 'name'), ('type', 'type'), ('quality', 'quality'), ('icon', 'icon'),
                                ('portrait_icon', 'lihuiIcon'), ('introduce', 'introduce'), ('output', 'output'),
                                ('armor', 'Armor'), ('fire', 'fire'), ('antiriot', 'Antiriot')]))
        entry['parts'] = []
        for part_id in m.get('parts', []):
            p = t['mech_parts'][part_id]
            entry['parts'].append({out: p.get(db) for db, out in [
                ('position', 'position'), ('weight', 'aircraftWeight'), ('hp', 'maxHp'), ('armor', 'Armor'),
                ('hit', 'Hit'), ('dodge', 'Dodge'), ('antiriot', 'Antiriot')]})
        entry['manjiFirepower'] = m.get('firepower', m.get('fire', ''))
        entry['modules'] = [mech_module_out(t['modules'], x['family'], x['level']) for x in m.get('modules', [])]
        entry.update(rename(m, [('skins', 'AlternateSkins'), ('hidden_modules', 'hiddenModules'),
                                ('dispatch_group', 'dispatchGroup'), ('dispatch_version', 'dispatchVersion')]))
        entry['version'] = m.get('version', '1.0')
        mechs.append(entry)
    mechs.sort(key=lambda m: (QUALITY_ORDER.get(m.get('quality', ''), 9), m.get('name', '')))
    return {'mechs': mechs}


def build_modules(t):
    # Only families with a category are listed on the Modules page; the rest
    # exist just for the mechs that carry them. File order = page order.
    return {'modules': {
        fam_id: {'name': f['name'], 'icon': f['icon'], 'category': f['category'],
                 'maxLevel': f['max_level'], 'currentLevel': f['current_level'],
                 'levels': {lv: row['effect'] for lv, row in f['levels'].items()}}
        for fam_id, f in t['modules'].items() if 'category' in f
    }}


def crafting_out(t, crafting):
    """A crafting list for the pages: backpacks and weapons by ID, materials
    with their label, icon (a path in the assets repo) and own recipe."""
    out = []
    for c in crafting:
        if 'backpack' in c or 'weapon' in c:
            kind = 'backpack' if 'backpack' in c else 'weapon'
            entry = {'kind': kind, 'id': c[kind], 'qty': c['qty']}
        else:
            mat = t['materials'][c['material']]
            icon = ('data/items/' + mat['item_icon'] + '.png' if 'item_icon' in mat
                    else 'data/backpacks/materials/' + mat['icon'])
            entry = {'kind': 'material', 'label': mat['label'], 'icon': icon, 'qty': c['qty']}
            if 'crafting' in mat:
                entry['crafting'] = crafting_out(t, mat['crafting'])
        if c.get('composite'):
            entry['composite'] = True
        out.append(entry)
    return out


def build_weapons(t):
    weapons = []
    for wid, w in t['weapons'].items():
        entry = {'ID': wid}
        entry.update(rename(w, [('name', 'name'), ('quality', 'quality'), ('type1', 'WeaponType1'),
                                ('type2', 'WeaponType2'), ('type', 'type'), ('icon', 'icon'),
                                ('models', 'LimitedModelOfWeapon'), ('slot', 'RestrictionsPositionOfWeapon'),
                                ('range', 'range'), ('weight', 'WeaponWeight'), ('atk', 'WeaponBasicAttackingPower'),
                                ('shield', 'ShieldbloodBase')]))
        entry['PassiveSkill'] = [skill_out(t['skills'], sid) for sid in w.get('passives', [])]
        entry.update(rename(w, [('describe', 'describe'), ('pilot', 'pilot'), ('version', 'version'), ('ac', 'ac')]))
        if 'crafting' in w:
            entry['crafting'] = crafting_out(t, w['crafting'])
        weapons.append(entry)
    weapons.sort(key=lambda w: (w.get('WeaponType1', ''), w.get('WeaponType2', ''), w.get('name', '')))
    return {'weapons': weapons}


def build_backpacks(t):
    backpacks = []
    for bid, b in t['backpacks'].items():
        entry = {'ID': bid}
        entry.update(rename(b, [('name', 'name'), ('quality', 'quality'), ('weight', 'weight'),
                                ('main_type', 'BackpackMainType'), ('st_type', 'AssemblableAirmenType'),
                                ('icon', 'icon'), ('version', 'version'), ('ac', 'ac')]))
        s = b['skill']
        entry['skill'] = {'ID': s.get('id', ''), 'name': s.get('name', ''), 'icon': s.get('icon', ''),
                          'SpecificEffects': s.get('effect', '')}
        if 'crafting' in b:
            entry['crafting'] = crafting_out(t, b['crafting'])
        backpacks.append(entry)

    def version_key(b):
        # SSSR backpacks sort newest-first; the rest have no version.
        v = b.get('version')
        if not v:
            return (0, 0)
        major, minor = v.split('.')
        return (-int(major), -int(minor))

    backpacks.sort(key=lambda b: (BACKPACK_QUALITY_ORDER.get(b.get('quality', ''), 9), version_key(b),
                                  b.get('BackpackMainType', ''), b.get('name', '')))
    return {'backpacks': backpacks}


# Lore bundles, loaded by a detail page only when its Lore tab is opened (js/lore.js).
# Both kinds share one shape: profile rows, introduction, stories.

def lore_out(profile, introduction, row):
    out = {'profile': [{'label': label, 'value': v} for label, v in profile if v] + row.get('profile', [])}
    if introduction:
        out['introduction'] = introduction
    if row.get('stories'):
        out['stories'] = row['stories']
    if row.get('cn'):
        out['cn'] = True
    return out if out['profile'] or len(out) > 1 else None


def build_pilot_lore(t):
    # A pilot with no mined lore (not on Global yet) shows its one-line bio.
    lore = {}
    for pid, p in t['pilots'].items():
        row = t['pilot_lore'].get(pid, {})
        out = lore_out([('Affiliation', row.get('affiliation')), ('Blood Type', row.get('blood_type')),
                        ('Height', row.get('height'))], row.get('introduction') or p.get('introduction'), row)
        if out:
            lore[pid] = out
    return lore


def build_mech_lore(t):
    lore = {}
    for mid, m in t['mechs'].items():
        row = t['mech_lore'].get(mid, {})
        out = lore_out([('Manufacturer', row.get('manufacturer'))], row.get('introduction') or m.get('introduce'), row)
        if out:
            lore[mid] = out
    return lore


# ── Output ───────────────────────────────────────────────────────────────────

def write_bundle(kind, var, out):
    d = os.path.join(DATA, kind)
    with open(os.path.join(d, 'compiled.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    js = f'var {var} = ' + json.dumps(out) + ';\n'
    with open(os.path.join(d, 'compiled.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    return len(js) // 1024


def write_lore(kind, var, out):
    js = f'var {var} = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    with open(os.path.join(DATA, kind, 'lore.js'), 'w', encoding='utf-8') as f:
        f.write(js)
    return len(js.encode('utf-8')) // 1024


def compile_plain(name, var):
    data = json.load(open(os.path.join(DATA, name + '.json'), encoding='utf-8'))
    js = f'window.{var} = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
    open(os.path.join(DATA, name + '.js'), 'w', encoding='utf-8').write(js)


def run(script):
    # Force UTF-8: on Windows the locale default (cp1252) can't decode the
    # child's output.
    result = subprocess.run([sys.executable, script], capture_output=True, text=True, encoding='utf-8')
    if result.returncode != 0:
        print('FAILED')
        print(result.stderr)
        sys.exit(1)


TABLES = ['pilots', 'pilot_neurons', 'neural_partitions', 'skills', 'mechs', 'mech_parts',
          'modules', 'weapons', 'backpacks', 'materials', 'pilot_lore', 'mech_lore']

BUNDLES = [('pilots', 'PilotsData', build_pilots), ('mechs', 'MechsData', build_mechs),
           ('modules', 'ModulesData', build_modules), ('weapons', 'WeaponsData', build_weapons),
           ('backpacks', 'BackpacksData', build_backpacks)]

if __name__ == '__main__':
    print('Compiling...')
    tables = {name: load(name) for name in TABLES}
    validate(tables)
    for kind, var, build in BUNDLES:
        out = build(tables)
        size = write_bundle(kind, var, out)
        print(f'  {kind}: {len(next(iter(out.values())))} ({size} KB)')
    for kind, var, build in [('pilots', 'PilotLoreData', build_pilot_lore), ('mechs', 'MechLoreData', build_mech_lore)]:
        lore = build(tables)
        print(f'  {kind} lore: {len(lore)} ({write_lore(kind, var, lore)} KB)')
    compile_plain('glossary', 'GlossaryData')
    compile_plain('dispatch', 'DispatchData')
    compile_plain('exskills', 'ExSkillsData')
    print('  glossary, dispatch, exskills: ok')
    # Reads the bundles above, so it must run last.
    run(os.path.join(ROOT, 'scripts', 'generate-index-maps.py'))
    print('  builder index maps: ok')
    print('Done.')
