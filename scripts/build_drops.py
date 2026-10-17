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

Accessories don't drop on their own: a dropped weapon comes with them. Each
EX weapon has an ID per chapter, and the game shows what that weapon can carry
in its "Accessory Collection" (ConfigDataWeaponEntryDropInfo.DropEntry4ClientShow
-> a ConfigDataNormalItemInfo whose description tags each accessory's
ConfigDataWeaponEntryInfo ID). The same row's TA/RA drop pools aren't used: they
are empty for CO14-15, and where they differ from the shown list (CO16 Bertha's
weapons, for one) the game shows the list. A Clearance Ops boss's accessories
are the SSR ones its weapons list, each with how many of its weapons carry it.
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
# "TA - Invasion", "TA W - Combo", "RA-W - Splash": the accessory's name after it.
ACC_PREFIX = re.compile(r'^[TR]A[ -]?W? - ')
# An accessory in an Accessory Collection's text: <ItemTip Type=20 ID=1173>[TA - Code Lock]</ItemTip>.
ACC_TIP = re.compile(r'<ItemTip Type=20 ID=(\d+)>')
ACC_KINDS = [('ta', 'WeaponEntryType_Condition'), ('ra', 'WeaponEntryType_Function')]


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
        # Weapon ID -> the accessory IDs its "Accessory Collection" lists.
        shows = {i: d for i, d in self.stats.execute(
            "SELECT ID, ColorDescStrKey_EN FROM ConfigDataNormalItemInfo WHERE NormalItemType = 'NormalItemType_OnlyForView'")}
        self.acc_lists = {wid: [int(a) for a in ACC_TIP.findall(shows.get(show) or '')] for wid, show in self.stats.execute(
            'SELECT ID, DropEntry4ClientShow FROM ConfigDataWeaponEntryDropInfo')}
        # SSR accessory ID -> {id, name, w (two-handed only), icon}, and its kind.
        self.accs = {}
        for aid, kind, name, icon, plate in self.stats.execute(
                'SELECT ID, Type, NameStrKey_EN, Icon, IconBaseplateType FROM ConfigDataWeaponEntryInfo '
                "WHERE Rarity = 'RarityType_SSR'"):
            self.accs[aid] = (kind, {'id': aid, 'name': ACC_PREFIX.sub('', name), 'w': 'Special' in (plate or ''),
                                     'icon': icon})

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

    def accessories(self, weapons, where):
        """Weapons ({id, quality, ...}) -> {ta, ra}: the SSR accessories they
        can carry, each as {id, name, w, icon, weapons (how many of them carry
        it)}, most carried first; empty when none can."""
        counts = {}
        for w in weapons:
            # Only the chapters' EX weapons come with accessories (have a row).
            aids = self.acc_lists.get(w['id'])
            if aids == [] and w['quality'] == 'SSR':
                self.warn('%s: %s (%d) lists no accessories' % (where, w['name'], w['id']))
            for aid in set(aids or ()):
                if aid in self.accs:
                    counts[aid] = counts.get(aid, 0) + 1
        out = {}
        for key, kind in ACC_KINDS:
            accs = [dict(self.accs[aid][1], weapons=n) for aid, n in counts.items() if self.accs[aid][0] == kind]
            if accs:
                out[key] = sorted(accs, key=lambda a: (-a['weapons'], a['w'], a['name']))
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
            accs = d.accessories(drops['weapons'], where)
            if accs:
                drops['accessories'] = accs
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
            for key, accs in b.get('accessories', {}).items():
                print('    %s: %s' % (key.upper(), ', '.join('%s%s ×%d' % (a['name'], ' W' if a['w'] else '', a['weapons'])
                                                            for a in accs)))
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
