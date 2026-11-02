#!/usr/bin/env python3
"""Each ST's default paint (the Color Scheme tab on ST pages), from the game tables.

Writes data/db/mech_paint.json. Run compile.py afterwards.

    python3 scripts/build_paint.py

The text comes from the global client (RebuildGameUpdate/out/stats.db).

- An ST's default scheme is the paint plan 1 + suit ID + 01 (ConfigDataWapPaintingPlanInfo,
  e.g. Flintstone 1002 -> 1100201, "Default Color Scheme"). Its template
  (ConfigDataWapPaintingTemplateInfo) gives each part's dye colors, one per
  coloring zone: four for the body, arms and legs, three for the hand and
  shoulder weapons and the backpack.
- A part the ST's template leaves out (so far always the weapons and the
  backpack) takes the shared factory finish of its kind: plan 2000001 for
  weapons, 2000002 for backpacks ("Original Plan").
- Colors are named by ConfigDataWapPaintingColorInfo. The finish (Regular,
  Metallic, ...) is added in brackets when it isn't Regular.

STs global doesn't have yet (v2.6+) take theirs from the CN client
(mined/cn/out/stats.db), marked `cn`. The two clients' string keys differ, so a
CN string is matched by its Chinese: global's English where global's own
Chinese string table (ConfigDataST_CN) has the same text, else the Chinese.
"""
import json
import os
import sqlite3
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
CN_STATS = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'out', 'stats.db')

# (template column, label, shared plan for a part the ST's template leaves out)
SLOTS = [('BodyDyeColor', 'Body', None), ('LeftArmDyeColor', 'Left Arm', None),
         ('RightArmDyeColor', 'Right Arm', None), ('LegDyeColor', 'Legs', None),
         ('LeftHandWeaponDyeColor', 'Left Hand Weapon', 2000001),
         ('RightHandWeaponDyeColor', 'Right Hand Weapon', 2000001),
         ('LeftShoulderWeaponDyeColor', 'Left Shoulder Weapon', 2000001),
         ('RightShoulderWeaponDyeColor', 'Right Shoulder Weapon', 2000001),
         ('BackpackDyeColor', 'Backpack', 2000002)]
KIND = {'WapPaintingPlanType_Wap': 'ST', 'WapPaintingPlanType_Weapon': 'Weapons',
        'WapPaintingPlanType_BackPack': 'Backpack'}
JUNK = {'', 'None', 'TEST'}


class Client:
    def __init__(self, path, en):
        self.con = sqlite3.connect(path)
        self.con.row_factory = sqlite3.Row
        self.en = en
        table = 'ConfigDataST_EN' if en is None else 'ConfigDataST_CN'
        self.strings = dict(self.con.execute(f'SELECT ID, Value FROM {table}'))
        if en is None:
            # Chinese -> English, from global's own two string tables (the most common English per Chinese text).
            zh = dict(self.con.execute('SELECT ID, Value FROM ConfigDataST_CN'))
            votes = defaultdict(Counter)
            for sid, v in self.strings.items():
                if (zh.get(sid) or '').strip() and (v or '').strip() not in JUNK:
                    votes[zh[sid].strip()][v.strip()] += 1
            self.zh_en = {k: c.most_common(1)[0][0] for k, c in votes.items()}
        self.colors = {r['ID']: r for r in self.con.execute('SELECT * FROM ConfigDataWapPaintingColorInfo')}
        self.materials = {r['ID']: r['NameStrKey'] for r in self.con.execute('SELECT * FROM ConfigDataWapPaintingMaterialInfo')}

    def text(self, key):
        """A string key ('ST:118825') -> its text; the CN client's in global's English where global has it."""
        if not key or not key.startswith('ST:'):
            return None
        v = (self.strings.get(int(key[3:])) or '').strip()
        if v in JUNK:
            return None
        return self.en.zh_en.get(v, v) if self.en else v

    def plan(self, pid):
        return self.con.execute('SELECT * FROM ConfigDataWapPaintingPlanInfo WHERE ID = ?', (pid,)).fetchone()

    def template(self, tid):
        return self.con.execute('SELECT * FROM ConfigDataWapPaintingTemplateInfo WHERE ID = ?', (tid,)).fetchone()

    def color(self, cid):
        c = self.colors[cid]
        name = self.text(c['ColorNameStrKey']) or str(cid)
        finish = self.text(self.materials.get(c['MaterialId']))
        return name if not finish or c['MaterialId'] == 1 else f'{name} ({finish})'

    def scheme(self, suit):
        own = self.plan(int(f'1{suit}01'))
        if not own:
            return None
        tpl = self.template(own['WapPaintingTemplateID'])
        groups = {}
        for col, label, shared in SLOTS:
            plan, row = own, tpl
            if not row[col]:
                plan = self.plan(shared)
                row = self.template(plan['WapPaintingTemplateID'])
            g = groups.setdefault(plan['ID'], {
                'kind': KIND[plan['WapPaintingPlanType']],
                'scheme': self.text(plan['Descript1StrKey']) if plan is own else self.text(plan['NameStrKey']),
                'desc': self.text(plan['Descript2StrKey']),
                'parts': []})
            g['parts'].append({'part': label, 'colors': [self.color(c) for c in json.loads(row[col])]})
        return [{k: v for k, v in g.items() if v} for g in groups.values()]


def main():
    mechs = json.load(open(os.path.join(DB, 'mechs.json'), encoding='utf-8'))
    glob = Client(STATS, None)
    cn = Client(CN_STATS, glob) if os.path.exists(CN_STATS) else None
    out, missing = {}, []
    for mid in mechs:
        suit = int(mid) // 10000
        groups = glob.scheme(suit)
        row = {'groups': groups} if groups else None
        if not row and cn:
            groups = cn.scheme(suit)
            row = {'cn': True, 'groups': groups} if groups else None
        if row:
            out[mid] = row
        else:
            missing.append(mechs[mid].get('name', mid))
    with open(os.path.join(DB, 'mech_paint.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'mech_paint: {len(out)} STs ({sum(1 for r in out.values() if r.get("cn"))} from the CN client)')
    if missing:
        print('No default scheme: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
