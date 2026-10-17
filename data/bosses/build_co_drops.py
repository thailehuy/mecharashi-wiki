#!/usr/bin/env python3
"""Clearance Ops boss -> drops, from the game tables. build_bosses.py adds them
to each Clearance Ops stage in bosses.json; run this on its own to print them.

Each Clearance Ops chapter is a row of ConfigDataDungeonLevelInfo in the game
tables (RebuildGameUpdate/out/stats.db). Its LevelBosses gives every boss a
NormalReward, BonusReward and FirstKillReward drop ID, which ConfigDataItemDropInfo
resolves to the items the game shows as possible drops (UIShowItemList) and the
items always given (CertainDropList). Boss names come from the mined DB's
`bosses` table (boss_id); weapon names and qualities from its `weapons` table,
weapon type codes and icons from ConfigDataWeaponInfo.

The game files hold which items a boss can drop, not the odds of each: those
are server-side.
"""
import json
import os
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DB = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')

QUALITY_ORDER = ['UR', 'SSSR', 'SSR', 'SR', 'R', 'N']


def drop_lists(stats, drop_id):
    """Drop ID -> (possible items, guaranteed items), each a list of (type, config ID)."""
    row = stats.execute('SELECT UIShowItemList, CertainDropList FROM ConfigDataItemDropInfo WHERE ID = ?',
                        (drop_id,)).fetchone()
    if row is None:
        return [], []
    shown, certain = (json.loads(x) if x else [] for x in row)
    return ([(x['type'], x['configId']) for x in shown],
            [(x['type'], x['configId']) for x in certain])


def chapter_drops(warn=print):
    """Clearance Ops battle map ID -> {'name': chapter name, 'bosses': [boss
    drops, in the game's order]}. A boss's drops: boss_id, boss (pilot name),
    weapons ({id, name, quality, type: weapon type code, icon}, best quality
    first), and the other items it can drop (`items`) or always drops
    (`always`), by name."""
    stats = sqlite3.connect(STATS)
    db = sqlite3.connect(DB)
    names = {wid: (name, quality) for wid, name, quality in db.execute('SELECT weapon_id, name, quality FROM weapons')}
    looks = {wid: (wtype.replace('EquipmentType_', ''), icon) for wid, wtype, icon in
             stats.execute('SELECT ID, Type, Icon FROM ConfigDataWeaponInfo WHERE Type IS NOT NULL')}
    items = dict(stats.execute('SELECT ID, NameStrKey_EN FROM ConfigDataNormalItemInfo'))
    boss_names = dict(db.execute("SELECT boss_id, boss_pilot FROM bosses WHERE content = 'Clearance Ops'"))

    def weapon(wid):
        name, quality = names[wid]
        wtype, icon = looks[wid]
        return {'id': wid, 'name': name, 'quality': quality, 'type': wtype, 'icon': icon}

    def sort_key(w):
        q = QUALITY_ORDER.index(w['quality']) if w['quality'] in QUALITY_ORDER else len(QUALITY_ORDER)
        return q, w['type'], w['name']

    out = {}
    for battle, name, level_bosses in stats.execute(
            'SELECT BattleMapId, NameStrKey_EN, LevelBosses FROM ConfigDataDungeonLevelInfo ORDER BY ID'):
        chapter = out[battle] = {'name': name, 'bosses': []}
        for b in json.loads(level_bosses or '[]'):
            boss_id = b['BossId']
            where = '%s boss %d' % (name, boss_id)
            shown, certain = drop_lists(stats, b['NormalReward'])
            first_shown, _ = drop_lists(stats, b['FirstKillReward'])
            if b['BonusReward'] != b['NormalReward']:
                warn('%s: BonusReward %d differs from NormalReward' % (where, b['BonusReward']))
            if {x for x in first_shown if x[0] == 'ItemType_Weapon'} != {x for x in shown if x[0] == 'ItemType_Weapon'}:
                warn('%s: first-clear weapons differ from repeat-clear weapons' % where)
            wids = [cid for t, cid in shown if t == 'ItemType_Weapon']
            missing = [wid for wid in wids if wid not in names or wid not in looks]
            if missing:
                warn('%s: weapon IDs not in the mined DB or game tables: %s' % (where, missing))
            if boss_id not in boss_names:
                warn('%s: boss not in the mined DB' % where)
            drops = {
                'boss_id': boss_id,
                'boss': boss_names.get(boss_id),
                'weapons': sorted((weapon(wid) for wid in wids if wid not in missing), key=sort_key),
            }
            other = [items.get(cid, str(cid)) for t, cid in shown if t == 'ItemType_NormalItem']
            if other:
                drops['items'] = other
            always = [items.get(cid, str(cid)) for t, cid in certain if t == 'ItemType_NormalItem']
            if always:
                drops['always'] = always
            chapter['bosses'].append(drops)
    return out


def main():
    warnings = []
    for battle, ch in chapter_drops(warnings.append).items():
        print('%s (battle %d)' % (ch['name'], battle))
        for b in ch['bosses']:
            extra = ' + ' + ', '.join(b['items']) if b.get('items') else ''
            print('  %s: %d weapons%s' % (b['boss'], len(b['weapons']), extra))
    for w in warnings:
        print('WARNING:', w)


if __name__ == '__main__':
    main()
