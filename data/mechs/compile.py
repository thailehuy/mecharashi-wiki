import json, glob, os

DIR         = os.path.dirname(os.path.abspath(__file__))

BODY_FIELDS = ['ID', 'name', 'type', 'quality', 'icon', 'mechaIcon', 'lihuiIcon', 'introduce',
               'output', 'durable', 'Armor', 'fire', 'Antiriot']

def apply_translation(entry, t):
    for field in ('name', 'introduce'):
        if t.get(field):
            entry[field] = t[field]
    if t.get('modules'):
        for mod in (entry.get('modules') or []):
            tr = t['modules'].get(mod.get('ID',''))
            if tr:
                for k, v in tr.items():
                    if v: mod[k] = v
    if t.get('parts'):
        for p in (entry.get('parts') or []):
            override = t['parts'].get(p.get('position', ''))
            if override:
                p['maxHp'] = override

mechs = []
for path in sorted(glob.glob(f'{DIR}/[0-9]*.json')):
    mid = os.path.basename(path).replace('.json', '')
    if mid.endswith('-translation'):
        continue
    try:
        raw = json.load(open(path, 'r', encoding='utf8'))['data']['data']
    except Exception as e:
        print(f'Skip {path}: {e}')
        continue
    body  = next((e for e in raw if e.get('position') in ('Body','躯干')), raw[0] if raw else {})
    entry = {k: body.get(k, '') for k in BODY_FIELDS}
    entry['parts'] = [{
        'position':       p.get('position', ''),
        'aircraftWeight': p.get('aircraftWeight', '0'),
        'maxHp':          p.get('manji', {}).get('durable', p.get('durable', '0'))
    } for p in raw]
    manji = body.get('manji', {})
    entry['manjiFirepower'] = manji.get('fire', body.get('fire', ''))
    entry['modules']        = manji.get('ModuleCarried', [])

    t_path = f'{DIR}/{mid}-translation.json'
    t = json.load(open(t_path, 'r', encoding='utf8')) if os.path.exists(t_path) else {}
    apply_translation(entry, t)
    if t.get('manjiFirepower'):
        entry['manjiFirepower'] = t['manjiFirepower']
    entry['version'] = t.get('version', '1.0')
    mechs.append(entry)

order = {'SSR': 0, 'SR': 1, 'R': 2}
mechs.sort(key=lambda m: (order.get(m.get('quality',''), 9), m.get('name','')))

out = {'mechs': mechs}
with open(f'{DIR}/compiled.json', 'w') as f:
    json.dump(out, f, indent=2)
js = 'var MechsData = ' + json.dumps(out) + ';\n'
with open(f'{DIR}/compiled.js', 'w') as f:
    f.write(js)

print(f'Compiled {len(mechs)} mechs  ({len(js)//1024} KB)')
