#!/usr/bin/env python3
"""Icons for the DMG calc dropdowns. bench-data.js has no icon fields, so this
joins its IDs and names to the wiki's compiled data and writes bench-icons.js:
  window.BenchIcons = {kind: {bench key: path}}
A path is relative to the assets site (ASSET_BASE) when the file is in the
sibling mecharashi-wiki-assets repo, else a full CDN URL. Anything not found
is left out and its dropdown row shows no icon.
Run after extract-bench.py: python3 data/dmgcalc/build-icons.py"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..')
ASSETS = os.path.join(HERE, '..', '..', '..', 'mecharashi-wiki-assets')
OUT = os.path.join(HERE, 'bench-icons.js')
CDN = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/'

# Same as WEAPON_ICON_FOLDER / WEAPON_ICON_OVERRIDE in js/pages/weapons.js.
WEAPON_FOLDER = {'Blade': 'AB', 'Buckler': 'SS', 'Flamethrower': 'FT', 'Funnel': 'CT', 'HeavyMachineGun': 'HMG',
                 'HeavySniper': 'SR', 'LightSniper': 'LR', 'MachineGun': 'MG', 'Missile': 'ML', 'PileBunker': 'PB',
                 'RailGun': 'RG', 'Rocket': 'RL', 'Rod': 'PA', 'Saw': 'CH', 'Shield': 'LS', 'ShotGun': 'SG'}
# Weapon advanced options by name without the tier (user confirmed 2026-10-15).
ADV_ICONS = {'Anti-LST Expert': 'Icon_skill_passive_1010', 'Anti-MST Expert': 'Icon_skill_passive_1010',
             'Anti-HST Expert': 'Icon_skill_passive_1010', 'Decisive Blow': 'Icon_skill_passive_1011',
             'Accurate Strike': 'Icon_skill_passive_1136', 'Forceful Strike': 'Icon_skill_passive_1127',
             'Balanced Strike': 'Icon_skill_passive_1115'}
WEAPON_OVERRIDE = {'10215123': 'Icon_weapon_10200501', '40215123': 'Icon_weapon_40200502', '10815123': 'Icon_weapon_10600403'}


def load(rel):
    with open(os.path.join(DATA, rel), encoding='utf-8') as f:
        return json.load(f)


def bench():
    with open(os.path.join(HERE, 'bench-data.js'), encoding='utf-8') as f:
        s = f.read()
    return json.loads(s[s.index('{'):s.rindex('}') + 1])


def local(rel):
    return rel if os.path.exists(os.path.join(ASSETS, rel)) else None


def skill_icon(icon):
    return icon and (local(f'data/unlisted/pilot_skills/{icon}.png') or f'{CDN}skill/{icon}.png')


def main():
    D = bench()
    out = {k: {} for k in ('adv', 'st', 'pilot', 'weapon', 'skill', 'module', 'feature', 'back', 'comp', 'boss')}

    mechs = {m['ID'][:4]: m for m in load('mechs/compiled.json')['mechs']}
    for k, st in D['sts'].items():
        m = mechs.get(k)
        if m:
            out['st'][k] = local(f"data/unlisted/mechs/Icon/{m['type']}/{m['icon']}.png") or f"{CDN}mecha/{m['icon']}.png"

    for p in load('pilots/compiled.json')['pilots']:
        if p['ID'] in D['pilots']:
            icon = p['PortraitHeroIcon']
            out['pilot'][p['ID']] = local(f'data/unlisted/pilot_images_half/{icon}.png') or f'{CDN}characterHalf/{icon}.png'

    weapons = {w['ID']: w for w in load('weapons/compiled.json')['weapons']}
    for k in D['weapons']:
        w = weapons.get(D['alias'].get(k, k)) or weapons.get(k)
        if w:
            icon = WEAPON_OVERRIDE.get(w['ID'], w['icon'])
            out['weapon'][k] = local(f"data/weapons/icons/{WEAPON_FOLDER.get(w['type'], '')}/{icon}.png") or f'{CDN}weapons/{icon}.png'

    # Skills: by ID (bench key minus its letter), then EX skills and every named skill by name.
    skills = load('db/skills.json')
    by_name = {}
    for v in skills.values():
        by_name.setdefault(v['name'], v.get('icon'))
    for e in load('exskills.json')['exskills']:
        by_name.setdefault(e['name'], e['icon'])

    def walk(x):
        if isinstance(x, dict):
            n, i = x.get('name'), x.get('icon') or x.get('SkillIcon')
            if isinstance(n, str) and isinstance(i, str) and i.startswith('Icon_skill'):
                by_name.setdefault(n, i)
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(load('pilots/compiled.json'))
    for k, S in D['skills'].items():
        n = (S.get('n') or '').replace('‌', '')
        icon = (skills.get(k[1:]) or {}).get('icon') or by_name.get(n) or by_name.get(re.sub(r' - EX$', '', n))
        if icon:
            out['skill'][k] = skill_icon(icon)

    def mod_name(n):
        return re.sub(r'\s+(Mod|Module)?\s*(I|II|III)?$', '', (n or '').replace('‌', '')).strip().lower()
    mods = {mod_name(m['name']): m['icon'] for m in load('modules/compiled.json')['modules'].values()}
    db_mods = load('db/modules.json')                # keyed by module group (the bench's modules key)
    for g, M in D['modules'].items():
        group_icon = None                            # a Mod II with no icon of its own reuses its Mod I's
        for it in M['items']:
            icon = ((local(f"data/unlisted/mech_modules/Icon_entry_{it['id']}.png") and f"Icon_entry_{it['id']}")
                    or mods.get(mod_name(it['n'])) or (db_mods.get(g) or {}).get('icon') or group_icon)
            if icon:
                group_icon = group_icon or icon
                out['module'][it['id']] = skill_icon(icon) if icon.startswith('Icon_skill') else \
                    local(f'data/unlisted/mech_modules/{icon}.png') or f'{CDN}skill/{icon}.png'

    feats = load('features/features.json')
    for port in ('pilot', 'st', 'weapon'):
        for group in feats[port].values():
            for F in group:
                if F['id'] in D['features'] and F.get('icon'):
                    out['feature'][F['id']] = F['icon']

    backs = load('db/backpacks.json')
    back_by_name = {}
    for b in backs.values():
        back_by_name.setdefault(b['name'], b['icon'])
    for k, B in D['backs'].items():
        icon = (backs.get(k) or {}).get('icon') or back_by_name.get(B['n'])
        if icon:
            out['back'][k] = local(f'data/backpacks/icons/{icon}.png')

    # extract-bench.py gives components the wiki's names, "X" or "X W" (the W ones have their own *_W entries)
    accs = {(a['statetype'].endswith('_W'), a['en_name']): a['icon'] for a in load('accessories/compiled.json')['accessories']}
    for k, C in D['components'].items():
        n = re.sub(r' W$', '', C['n']) if C['w'] else C['n']
        icon = accs.get((C['w'], n)) or accs.get((False, n))
        if icon:
            out['comp'][k] = skill_icon(icon)

    for A in D['adv'].values():
        for o in A.get('opts', []):
            icon = ADV_ICONS.get(re.sub(r'\s+[IVX]+$', '', o['n']))
            if icon:
                out['adv'][o['fx']] = skill_icon(icon)

    bosses = load('bosses/bosses.json')['bosses']
    for t in D['targets']:
        b = bosses.get(t['boss'])
        if b and b.get('portrait'):
            out['boss'][t['boss']] = b['portrait']

    out = {kind: {k: v for k, v in m.items() if v} for kind, m in out.items()}
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('window.BenchIcons = ' + json.dumps(out, separators=(',', ':'), ensure_ascii=False) + ';\n')
    for kind, m in out.items():
        print(f'{kind:8} {len(m)}')


if __name__ == '__main__':
    main()
