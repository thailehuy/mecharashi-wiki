#!/usr/bin/env python3
"""Boss drops for Clearance Ops and Armed Conquest, from the game tables.
build_bosses.py adds them to each stage in bosses.json; run this on its own to
print them.

Every reward is a drop ID that ConfigDataItemDropInfo (RebuildGameUpdate/out/
stats.db) resolves to the items the game shows as possible drops
(UIShowItemList, with an amount when it's fixed) and the items always given
(CertainDropList).

- Clearance Ops: each chapter is a row of ConfigDataDungeonLevelInfo; its
  LevelBosses gives every boss a NormalReward, BonusReward and FirstKillReward.
- Armed Conquest: each season (ConfigDataRaidDungeonInfo) lists its stages per
  difficulty; a stage (ConfigDataRaidDungeonLevelInfo) has a Reward (every
  clear), a FirstReward and a reward per bounty (OfferRewardList ->
  ConfigDataRaidDungeonOfferRewardInfo).

Boss names come from the mined DB's `bosses` table (boss_id); weapon names and
qualities from its `weapons` table, weapon type codes and icons from
ConfigDataWeaponInfo. The game files hold which items a boss can drop, not the
odds of each: those are server-side.
"""
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')

QUALITY_ORDER = ['UR', 'SSSR', 'SSR', 'SR', 'R', 'N']
# A season's stage list per difficulty, in ConfigDataRaidDungeonInfo.
RAID_LEVELS = [('Normal', 'LevelList'), ('Hard', 'HardLevelList'), ('Extreme', 'HellLevelList'),
               ('Inferno', 'Difficult4LevelList')]
# "Castilla Annihilation Voucher": most have no icon in the tables (the game
# draws the boss), so they take the boss's portrait.
VOUCHER = re.compile(r'^(.*) Annihilation Voucher\.?$')


class Drops:
    """Resolves drop IDs to weapons and named items."""

    def __init__(self, warn):
        self.warn = warn
        self.stats = sqlite3.connect(STATS)
        self.db = sqlite3.connect(DB)
        self.weapon_names = {wid: (name, quality) for wid, name, quality in
                             self.db.execute('SELECT weapon_id, name, quality FROM weapons')}
        self.looks = {wid: (wtype.replace('EquipmentType_', ''), icon) for wid, wtype, icon in
                      self.stats.execute('SELECT ID, Type, Icon FROM ConfigDataWeaponInfo WHERE Type IS NOT NULL')}
        # Item type -> {ID: (name, icon)}.
        self.names = {
            'ItemType_NormalItem': {i: (n, icon) for i, n, icon in self.stats.execute(
                'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataNormalItemInfo')},
            'ItemType_Currency': {i: (n, icon) for i, n, icon in self.stats.execute(
                'SELECT ID, NameStrKey_EN, Icon FROM ConfigDataCurrencyTypeInfo')},
            'ItemType_WapPaintingMarking': {i: ('ST Emblem: %s' % n, icon) for i, n, icon in self.stats.execute(
                'SELECT ID, NameStrKey_EN, IconPath FROM ConfigDataWapPaintingMarkingInfo')},
        }
        self.boss_names = dict(self.db.execute('SELECT boss_id, boss_pilot FROM bosses'))

    def lists(self, drop_id):
        """Drop ID -> (possible items, guaranteed items), each a list of the game's {type, configId, ...}."""
        row = drop_id and self.stats.execute('SELECT UIShowItemList, CertainDropList FROM ConfigDataItemDropInfo '
                                             'WHERE ID = ?', (drop_id,)).fetchone()
        if not row:
            return [], []
        return tuple(json.loads(x) if x else [] for x in row)

    def item(self, x):
        """The game's {type, configId, count} -> {name (with the amount when
        it's fixed), icon (its sprite in the game's itemtype bundles) or boss
        (an Annihilation Voucher's boss, whose portrait it takes)}."""
        name, icon = self.names.get(x['type'], {}).get(x['configId'], (None, None))
        if name is None:
            self.warn('no name for %s %d' % (x['type'], x['configId']))
            name = '%s %d' % (x['type'].replace('ItemType_', ''), x['configId'])
        out = {'name': name + (' ×%d' % x['count'] if x.get('count', -1) > 0 else '')}
        voucher = VOUCHER.match(name)
        if voucher:
            out['boss'] = voucher.group(1)
        elif icon:
            out['icon'] = icon
        return out

    def weapon(self, wid):
        name, quality = self.weapon_names[wid]
        wtype, icon = self.looks[wid]
        return {'id': wid, 'name': name, 'quality': quality, 'type': wtype, 'icon': icon}

    def resolve(self, drop_id, where):
        """Drop ID -> {weapons ({id, name, quality, type: weapon type code,
        icon}, best quality first), items (other items it can drop, as
        Drops.item), always (the items always given)}, leaving out empty lists."""
        shown, certain = self.lists(drop_id)
        wids = [x['configId'] for x in shown if x['type'] == 'ItemType_Weapon']
        missing = [wid for wid in wids if wid not in self.weapon_names or wid not in self.looks]
        if missing:
            self.warn('%s: weapon IDs not in the mined DB or game tables: %s' % (where, missing))

        def sort_key(w):
            q = QUALITY_ORDER.index(w['quality']) if w['quality'] in QUALITY_ORDER else len(QUALITY_ORDER)
            return q, w['type'], w['name']
        out = {
            'weapons': sorted((self.weapon(wid) for wid in wids if wid not in missing), key=sort_key),
            'items': [self.item(x) for x in shown if x['type'] != 'ItemType_Weapon'],
            'always': [self.item(dict(x, count=x.get('maxCount', -1) if x.get('minCount') == x.get('maxCount') else -1))
                       for x in certain if x['type'] != 'ItemType_Weapon'],
        }
        return {k: v for k, v in out.items() if v}


def chapter_drops(warn=print):
    """Clearance Ops battle map ID -> {'name': chapter name, 'bosses': [boss
    drops, in the game's order]}. A boss's drops: boss_id, boss (pilot name)
    and Drops.resolve's lists for its repeat clears."""
    d = Drops(warn)
    out = {}
    for battle, name, level_bosses in d.stats.execute(
            'SELECT BattleMapId, NameStrKey_EN, LevelBosses FROM ConfigDataDungeonLevelInfo ORDER BY ID').fetchall():
        chapter = out[battle] = {'name': name, 'bosses': []}
        for b in json.loads(level_bosses or '[]'):
            boss_id = b['BossId']
            where = '%s boss %d' % (name, boss_id)
            shown, _ = d.lists(b['NormalReward'])
            first_shown, _ = d.lists(b['FirstKillReward'])
            if b['BonusReward'] != b['NormalReward']:
                warn('%s: BonusReward %d differs from NormalReward' % (where, b['BonusReward']))
            weapons = lambda xs: {x['configId'] for x in xs if x['type'] == 'ItemType_Weapon'}
            if weapons(first_shown) != weapons(shown):
                warn('%s: first-clear weapons differ from repeat-clear weapons' % where)
            if boss_id not in d.boss_names:
                warn('%s: boss not in the mined DB' % where)
            drops = d.resolve(b['NormalReward'], where)
            drops.setdefault('weapons', [])
            chapter['bosses'].append(dict(boss_id=boss_id, boss=d.boss_names.get(boss_id), **drops))
    return out


def season_drops(warn=print):
    """(Armed Conquest season ID = AC number, stage slot) -> {difficulty:
    {boss (pilot name), drops (Drops.resolve's lists for every clear, plus
    `first`: the first clear's items), bounties (each bounty's reward, in
    bounty order)}}. A slot is the stage's place in its difficulty's list, as
    in build_bosses.stage_info."""
    d = Drops(warn)
    out = {}
    rows = d.stats.execute('SELECT ID, NameStrKey_EN, %s FROM ConfigDataRaidDungeonInfo'
                           % ', '.join(c for _, c in RAID_LEVELS)).fetchall()
    for season, season_name, *levels in rows:
        for (diff, _), level_list in zip(RAID_LEVELS, levels):
            for slot, level in enumerate(json.loads(level_list or '[]'), 1):
                title, boss_id, reward, first, offers = d.stats.execute(
                    'SELECT NameStrKey_EN, BossID, Reward, FirstReward, OfferRewardList '
                    'FROM ConfigDataRaidDungeonLevelInfo WHERE ID = ?', (level,)).fetchone()
                where = 'AC%d %s (%s)' % (season, title, diff)
                drops = d.resolve(reward, where)
                first_drops = d.resolve(first, where + ' first clear')
                if first_drops.get('weapons'):
                    warn('%s: first clear drops weapons' % where)
                firsts = first_drops.get('always') or first_drops.get('items')
                if firsts:
                    drops['first'] = firsts
                bounties = []
                for offer in json.loads(offers or '[]'):
                    r = d.stats.execute('SELECT Reward FROM ConfigDataRaidDungeonOfferRewardInfo WHERE ID = ?',
                                        (offer,)).fetchone()
                    bounties.append(', '.join(it['name'] for it in d.resolve(r and r[0], where + ' bounty').get('items', [])))
                out.setdefault((season, slot), {})[diff] = {
                    'boss': d.boss_names.get(boss_id), 'title': title, 'drops': drops, 'bounties': bounties}
    return out


def main():
    warnings = []
    for battle, ch in chapter_drops(warnings.append).items():
        print('CO %s (battle %d)' % (ch['name'], battle))
        for b in ch['bosses']:
            extra = ' + ' + ', '.join(it['name'] for it in b['items']) if b.get('items') else ''
            print('  %s: %d weapons%s' % (b['boss'], len(b['weapons']), extra))
    for (season, slot), diffs in sorted(season_drops(warnings.append).items()):
        for diff, s in diffs.items():
            dr = s['drops']
            print('AC%d stage %d %s (%s), %s: %s%s%s' % (
                season, slot, s['title'], diff, s['boss'],
                '%d weapons + ' % len(dr['weapons']) if dr.get('weapons') else '',
                ', '.join(it['name'] for it in dr.get('items', [])) or '-',
                ' | first clear: ' + ', '.join(it['name'] for it in dr['first']) if dr.get('first') else ''))
    for w in warnings:
        print('WARNING:', w)


if __name__ == '__main__':
    main()
