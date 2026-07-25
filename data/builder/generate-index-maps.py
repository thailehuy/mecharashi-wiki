"""Maintains the Builder page's ID -> short-index maps used to encode Build
UIDs (see js/pages/builder.js's _computeBuildUID/_loadBuildUID).

This is deliberately NOT a sort-and-recompute step. An index, once assigned
to an ID, is permanent — the map only ever grows by appending the next
integer to any newly-found eligible ID it hasn't seen before. That's what
makes a Build UID stay valid forever: a real game ID can be reused in a
lower/higher spot by a future content patch without disturbing any index
already handed out to an existing pilot/mech/weapon/backpack/module.

Run this after adding new pilots/mechs/weapons/backpacks/modules to the site
(or anytime, harmlessly — it's a no-op if nothing new is eligible). It reads
the existing index-maps.json first so previously-assigned indices are always
preserved, then writes the updated JSON + a `window.BuilderIndexMaps = ...`
JS mirror for the browser.
"""
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(DIR, '..')
MAP_JSON = os.path.join(DIR, 'index-maps.json')
MAP_JS = os.path.join(DIR, 'index-maps.js')

CATEGORIES = ['pilot', 'mech', 'weapon', 'backpack', 'module']


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def load_compiled(rel_path):
    """Reads a `var X = {...};` or `window.X = {...};` compiled.js file."""
    path = os.path.join(ROOT, rel_path)
    content = open(path, encoding='utf-8').read()
    content = content[content.index('=') + 1:].strip()
    if content.endswith(';'):
        content = content[:-1]
    return json.loads(content)


def eligible_ids():
    ids = {cat: [] for cat in CATEGORIES}

    pilots = load_compiled('pilots/compiled.js')['pilots']
    ids['pilot'] = [p['ID'] for p in pilots if p.get('quality') == 'SSR']

    mechs = load_compiled('mechs/compiled.js')['mechs']
    ids['mech'] = [m['ID'] for m in mechs if m.get('quality') == 'SSR']

    weapons = load_compiled('weapons/compiled.js')['weapons']
    ids['weapon'] = [w['ID'] for w in weapons if w.get('quality') == 'SSSR']

    backpacks = load_compiled('backpacks/compiled.js')['backpacks']
    ids['backpack'] = [b['ID'] for b in backpacks if b.get('quality') == 'SSSR']

    modules = load_compiled('modules/compiled.js')['modules']
    ids['module'] = [
        family for family, m in modules.items()
        if m.get('category') in ('PropertyS', 'SuitS')
    ]

    return ids


def main():
    existing = load_json(MAP_JSON) if os.path.exists(MAP_JSON) else {}
    maps = {cat: dict(existing.get(cat, {})) for cat in CATEGORIES}

    ids = eligible_ids()
    added = {cat: 0 for cat in CATEGORIES}

    for cat in CATEGORIES:
        next_idx = (max(maps[cat].values()) + 1) if maps[cat] else 0
        # Sort only to make first-time-generation output deterministic and
        # reviewable in a diff — this initial order has no bearing on
        # stability going forward, since indices never get recomputed once
        # assigned, only appended to.
        for eid in sorted(ids[cat], key=lambda x: int(x)):
            if eid in maps[cat]:
                continue
            maps[cat][eid] = next_idx
            next_idx += 1
            added[cat] += 1

    with open(MAP_JSON, 'w', encoding='utf-8') as f:
        json.dump(maps, f, indent=2, sort_keys=True)
        f.write('\n')

    with open(MAP_JS, 'w', encoding='utf-8') as f:
        f.write('window.BuilderIndexMaps = ' + json.dumps(maps, ensure_ascii=False) + ';\n')

    total = sum(len(m) for m in maps.values())
    print('Wrote {} total index entries ({} KB)'.format(
        total, round(os.path.getsize(MAP_JSON) / 1024, 1)))
    for cat in CATEGORIES:
        print('  {}: {} entries ({} new)'.format(cat, len(maps[cat]), added[cat]))


if __name__ == '__main__':
    main()
