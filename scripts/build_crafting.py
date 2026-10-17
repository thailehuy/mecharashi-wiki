#!/usr/bin/env python3
"""Crafting recipes for weapons and backpacks, from the game tables.

Writes the `crafting` lists in data/db/weapons.json and backpacks.json and the
crafted materials (blueprints, Arsenal Handbooks, Bounty Medals) in
materials.json. Run compile.py afterwards.

    python3 scripts/build_crafting.py

The recipes come from the Workshop (RebuildGameUpdate/out/stats.db):

- Backpack Crafting (ConfigDataBackpackMakingFormulaInfo): a backpack (or
  Adjudicator / Sugar-Coated Destroyer) costs the backpacks in
  BackpackIdCostList, one composite item (CostCompositeMaterialList), a number
  of random backpacks of a quality (CostCustomRarityList) and a blueprint. A
  Special backpack has a row per composite backpack it accepts: any Composite
  one.
- Arms Production (ConfigDataItemExchangeBlueprintInfo): a UR weapon costs
  Bounty Medals; its SSSR version costs the UR weapon (SrcItemId) and Arsenal
  Handbooks; the Special backpack blueprints cost Handbooks and Medals.

stats.db is the global client, so it has no recipe for anything newer than
Global (v2.6+). Those rows keep what they had.
"""
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')

# Random backpacks of a quality (CostCustomRarityList) -> materials.json slug.
RANDOM_BACKPACK = {'RarityType_SR': 'random-a-grade', 'RarityType_SSR': 'random-s-grade'}
# Items that keep their hand-made materials.json entry (own icon file).
FIXED_MATERIALS = {11530003: 'standard-blueprint', 11530004: 'precision-blueprint'}


def load(name):
    with open(os.path.join(DB, name + '.json'), encoding='utf-8') as f:
        return json.load(f)


def save(name, data):
    with open(os.path.join(DB, name + '.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def main():
    con = sqlite3.connect(STATS)
    weapons, backpacks, materials = load('weapons'), load('backpacks'), load('materials')
    items = {i: (n, icon) for i, n, icon in con.execute('SELECT ID, NameStrKey_EN, Icon FROM ConfigDataNormalItemInfo')}
    warnings = []

    def material(item_id):
        """materials.json slug for a game item, adding its row if new."""
        name, icon = items[item_id]
        if item_id in FIXED_MATERIALS:
            key = FIXED_MATERIALS[item_id]
            materials[key]['label'] = name
            return key
        key = slug(name)
        materials.setdefault(key, {})
        materials[key].update({'label': name, 'item_icon': icon})
        return key

    def ref(kind, item_id, qty):
        """A crafting entry for an item of the given ItemType."""
        sid = str(item_id)
        if kind == 'ItemType_Backpack':
            if sid not in backpacks:
                return None
            out = {'backpack': sid, 'qty': qty}
            if backpacks[sid]['quality'] == 'UR':
                out['composite'] = True
            return out
        if kind == 'ItemType_Weapon':
            return {'weapon': sid, 'qty': qty} if sid in weapons else None
        return {'material': material(item_id), 'qty': qty}

    # ── Backpack Crafting ──
    formulas = {}
    for row in con.execute('SELECT BackpackProductID, BackpackProductBackpackType, BackpackIdCostList, '
                           'CostCompositeMaterialList, CostCustomRarityList, BluePrintItemID '
                           'FROM ConfigDataBackpackMakingFormulaInfo ORDER BY ID'):
        formulas.setdefault(row[0], []).append(row)
    recipes = {}  # (table, id) -> crafting list
    for pid, rows in formulas.items():
        _, kind, cost, _, rarity, blueprint = rows[0]
        table = {'ItemType_Backpack': 'backpacks', 'ItemType_Weapon': 'weapons'}.get(kind)
        if not table or str(pid) not in (backpacks if table == 'backpacks' else weapons):
            continue
        out = [ref('ItemType_Backpack', c['BackpackId'], c['Count']) for c in json.loads(cost or '[]')]
        composites = [json.loads(r[3])[0] for r in rows if r[3]]
        if len(composites) > 1:
            out.append({'material': 'random-composite', 'qty': 1, 'composite': True})
        elif composites:
            out.append(ref(composites[0]['Type'], composites[0]['Id'], composites[0]['Count']))
        for r in json.loads(rarity or '[]'):
            out.append({'material': RANDOM_BACKPACK[r['Rarity']], 'qty': r['Count']})
        if blueprint:
            out.append({'material': material(blueprint), 'qty': 1})
        if None in out:
            warnings.append('%s %s: an ingredient is not in the wiki' % (table, pid))
            continue
        recipes[(table, str(pid))] = out

    # ── Arms Production ──
    for result, kind, src, mats in con.execute('SELECT ResultItemId, ItemType, SrcItemId, ExchangeMaterials '
                                              'FROM ConfigDataItemExchangeBlueprintInfo ORDER BY ID'):
        out = [ref('ItemType_Weapon', src, 1)] if src else []
        out += [{'material': material(m['ItemId']), 'qty': m['Count']} for m in json.loads(mats)]
        if None in out:
            warnings.append('weapon %s: its UR version %s is not in the wiki' % (result, src))
            continue
        if kind == 'ItemType_Weapon':
            if str(result) in weapons:
                recipes[('weapons', str(result))] = out
        else:
            materials[material(result)]['crafting'] = out

    # Rows without a recipe here (v2.6+) still name their backpacks as `item`.
    for b in backpacks.values():
        if 'crafting' in b:
            b['crafting'] = [{('backpack' if k == 'item' else k): v for k, v in c.items()} for c in b['crafting']]

    counts = {'weapons': 0, 'backpacks': 0}
    for (table, pid), out in recipes.items():
        (weapons if table == 'weapons' else backpacks)[pid]['crafting'] = out
        counts[table] += 1

    save('weapons', weapons)
    save('backpacks', backpacks)
    save('materials', materials)
    print('Recipes: %(weapons)d weapons, %(backpacks)d backpacks' % counts)
    for w in warnings:
        print('  warning: ' + w)


if __name__ == '__main__':
    main()
