#!/usr/bin/env python3
"""The Events page's data, from the global client's tables (RebuildGameUpdate/
out/stats.db). Writes data/events/events.json and events.js (EventsData).

    python3 scripts/build_events.py

One event per limited-time story event run (ConfigDataPlotActivityInfo, by
ID); a rerun is its own event, since its missions and shop are new. Its slug is
its name's, with "-rerun", "-rerun-2"... for the later runs. Dates come from
its OperationalActivityInfo open time (see build_story.run_dates); one that
never closes (ends in 2099) is permanent, in the game's Chronicles.

- Image: its main screen (the first of Prefabs, or a texture from IMAGES),
  rendered into the assets repo by scripts/extract_event_images.py as
  data/events/<image>.jpg.
- Stages: its level groups (PlotLevelGroupList, ChallengeLevelGroupList,
  DailyLevelGroupList) and their stages (PlotActivityLevelInfo). A stage's
  battles (LevelBattleIdList) are its difficulties, each with its clear rewards
  (RewardDropIds) and achievements (its battle maps' BattleAchievementIds ->
  ConfigDataBattleAchievementInfo: name, description, Reward drop ID).
- Milestones: its mission groups (QuestGroupList -> PlotActivityQuestGroupInfo,
  with the Command Level that unlocks the group in H.I.V.E.) and their missions
  (ConfigDataQuestInfo, by SortId): title, description, DropReward, and the
  steps of a mission that counts a short set of others (see milestones()).
- Currencies: the ones it lists (MatchCurrencyTypeList) and the ones its
  shops and prize draw take (ConfigDataCurrencyTypeInfo: name, icon, lore,
  what it's for).
- Shops: its operational activity's ExclusiveShopInfoID -> fixed shops
  (ConfigDataFixedShopItemInfo: item, price, purchase limit) and random shops
  (ConfigDataRandomShopItemInfo: the B-Boxes H.I.V.E.'s Intel Shop rolls, one
  per pool on each refresh).
- Commanders: the ones its battles allow (AllowUseCommanders ->
  ConfigDataBattleCommanderInfo) and their skills (CommanderDevelopmentGroupInfo
  by CommanderId: each group's levels are CommanderDevelopmentInfo rows, whose
  passive (PassiveSkillInfo) and Commander Skill (MainSkillInfo) give the text;
  a skill's levels are merged into one text, "+10/12/14/16/20%").

The story itself (briefings, cutscenes) is the Story page's (build_story.py);
the page shows it from there.
"""
import json
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_story import Rewards, STATS, clean, run_dates, text  # noqa: E402
from build_pages import slugify  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'events')
# Battle maps from build_maps.py ("ev-<level ID>": {difficulty: map ID}), for the stages' "View map" button.
MAPS = os.path.join(ROOT, 'data', 'maps', 'maps.json')
OUT = os.path.join(HERE, 'events.json')
OUT_JS = os.path.join(HERE, 'events.js')

GROUP_KINDS = [('PlotLevelGroupList', 'story'), ('ChallengeLevelGroupList', 'challenge'),
               ('DailyLevelGroupList', 'daily')]
# Purchase limits that reset (ConfigDataRefreshTimeRuleInfo); 1 never resets.
RESETS = {'RefreshTimeRuleType_Day': 'daily', 'RefreshTimeRuleType_Week': 'weekly',
          'RefreshTimeRuleType_Month': 'monthly'}
# H.I.V.E.'s random shop has no name of its own; its currencies call it this.
RANDOM_SHOP_NAMES = {115011: 'Intel Shop'}
# Events whose main screen is all filled in at run time (H.I.V.E.'s is a feed): a texture instead.
IMAGES = {13: 'Img_Web_Shop_BG_Raw'}


def battle_achievements(con, rewards, map_ids, where):
    out = []
    for mid in map_ids:
        m = con.execute('SELECT BattleAchievementIds FROM ConfigDataBattleMapInfo WHERE ID = ?', (mid,)).fetchone()
        for aid in json.loads((m and m[0]) or '[]'):
            a = con.execute('SELECT * FROM ConfigDataBattleAchievementInfo WHERE ID = ?', (aid,)).fetchone()
            if not a:
                print('%s: no achievement %d' % (where, aid))
                continue
            out.append({'name': text(a['NameStrKey_EN']), 'text': clean(text(a['DescStrKey_EN']) or ''),
                        'rewards': rewards.get(a['Reward'], '%s achievement %d' % (where, aid))})
    return out


def stages(con, rewards, a, name):
    difficulties = dict(con.execute('SELECT ID, NameStrKey_EN FROM ConfigDataPlotActivityLevelDifficultyInfo '
                                    'WHERE ID IS NOT NULL'))
    groups = []
    for col, kind in GROUP_KINDS:
        for gid in json.loads(a[col] or '[]'):
            g = con.execute('SELECT * FROM ConfigDataPlotActivityLevelGroupInfo WHERE ID = ?', (gid,)).fetchone()
            if not g:
                continue
            out = []
            for lid in json.loads(g['LevelList'] or '[]'):
                l = con.execute('SELECT * FROM ConfigDataPlotActivityLevelInfo WHERE ID = ?', (lid,)).fetchone()
                if not l:
                    continue
                st = {'id': l['ID']}
                if text(l['Number']):
                    st['code'] = text(l['Number'])
                st['name'] = clean(text(l['NameStrKey_EN']) or text(l['TitleStrKey_EN']) or '')
                title = text(l['TitleStrKey_EN'])
                if title and title != st['name'] and 'Story Stage' not in title and not title.startswith('XC '):
                    st['subtitle'] = clean(title)
                where = '%s %s' % (name, st['name'])
                tiers = []
                for bid in json.loads(l['LevelBattleIdList'] or '[]'):
                    b = con.execute('SELECT * FROM ConfigDataPlotActivityLevelBattleInfo WHERE ID = ?', (bid,)).fetchone()
                    if not b:
                        continue
                    maps = [m['BattleMapID'] for m in json.loads(b['BattleMapInfoList'] or '[]')]
                    tiers.append({
                        'name': text(difficulties.get(b['Difficulty'])) or text(b['SubLevelDescStrKey_EN']) or '',
                        'rewards': [x for d in json.loads(b['RewardDropIds'] or '[]') for x in rewards.get(d, where)],
                        'achievements': battle_achievements(con, rewards, maps, where),
                    })
                tiers = [t for t in tiers if t['rewards'] or t['achievements']]
                if len(tiers) == 1:
                    tiers[0].pop('name')
                if tiers:
                    st['tiers'] = tiers
                out.append(st)
            if out:
                groups.append({'name': text(g['NameStrKey_EN']) or '', 'kind': kind, 'stages': out})
    # Hunters' Freedom names its stages by place ("ST Arena", again and again) and titles them:
    # the title is the stage's name there and the name its location (as on the Story page).
    names = [s['name'] for g in groups for s in g['stages']]
    if len(set(names)) < len(names):
        for s in (s for g in groups for s in g['stages'] if s.get('subtitle')):
            s['name'], s['location'] = s.pop('subtitle'), s['name']
    return groups


def milestones(con, rewards, a, name):
    """Missions without a reward are hidden steps counted by another ("Clear these 4 stages",
    CompleteQuestSet -> ConfigDataQuestetInfo); a short set's steps are listed under it."""
    out = []
    for gid in json.loads(a['QuestGroupList'] or '[]'):
        g = con.execute('SELECT * FROM ConfigDataPlotActivityQuestGroupInfo WHERE ID = ?', (gid,)).fetchone()
        quests = []
        for qid in json.loads(g['QuestList'] or '[]'):
            q = con.execute('SELECT * FROM ConfigDataQuestInfo WHERE ID = ?', (qid,)).fetchone()
            if not q:
                print('%s: no mission %d' % (name, qid))
                continue
            if not q['DropReward']:
                continue
            m = {'sort': q['SortId'] or 0, 'title': clean(text(q['TitleStrKey_EN']) or '')}
            if text(q['DescStrKey_EN']):
                m['text'] = clean(text(q['DescStrKey_EN']))
            for cond in json.loads(q['CompleteCondList'] or '[]'):
                qs = cond['CondType'] == 'QuestCompleteCondType_CompleteQuestSet' and con.execute(
                    'SELECT QuestList FROM ConfigDataQuestetInfo WHERE ID = ?', (cond['P2'],)).fetchone()
                steps = [text(r[0]) for r in (con.execute('SELECT TitleStrKey_EN FROM ConfigDataQuestInfo WHERE ID = ?',
                                                          (s,)).fetchone() for s in json.loads(qs[0]))
                         if r] if qs else []
                # Long sets are H.I.V.E.'s commissions, titled by their designers' IDs.
                if steps and len(steps) <= 8 and all(steps) and steps != [m['title']]:
                    m['steps'] = [clean(s) for s in steps]
            m['rewards'] = rewards.get(q['DropReward'], '%s mission %d' % (name, qid))
            quests.append(m)
        quests.sort(key=lambda m: m.pop('sort'))
        group = {'name': text(g['NameStrKey_EN']) or name}
        if g['MatchCommanderLevel']:
            group['level'] = g['MatchCommanderLevel']
        group['missions'] = quests
        out.append(group)
    return out


class Currencies:
    def __init__(self, con):
        self.rows = {r['CurrencyType']: r for r in con.execute('SELECT * FROM ConfigDataCurrencyTypeInfo')}

    def get(self, ctype):
        r = self.rows.get(ctype)
        if not r:
            return None
        c = {'type': ctype, 'name': text(r['NameStrKey_EN'])}
        if text(r['Icon']):
            c['icon'] = text(r['Icon'])
        if text(r['DescStrKey_EN']):
            c['text'] = clean(text(r['DescStrKey_EN']))
        if text(r['ColorDescStrKey_EN']):
            c['use'] = clean(text(r['ColorDescStrKey_EN']))
        return c


def lottery_currencies(con, op):
    """The currencies an event's prize draw (LotteryPageID: Material Preparation, Resource Supply...) takes."""
    page = op and op['LotteryPageID'] and con.execute('SELECT PoolList FROM ConfigDataLotteryPageInfo WHERE ID = ?',
                                                      (op['LotteryPageID'],)).fetchone()
    out = []
    for pid in json.loads(page[0]) if page else []:
        pool = con.execute('SELECT CostCurrencyInfo FROM ConfigDataLotteryPoolInfo WHERE ID = ?', (pid,)).fetchone()
        out += [c['CurrencyType'] for c in json.loads((pool and pool[0]) or '[]')]
    return out


def shops(con, rewards, shop_info, name):
    """The event's shops and the currencies they take."""
    out, paid = [], []
    s = shop_info and con.execute('SELECT * FROM ConfigDataActivityExclusiveShopInfo WHERE ID = ?', (shop_info,)).fetchone()
    if not s:
        return out, paid
    resets = {r['ID']: RESETS.get(r['RefreshTimeRuleType']) for r in con.execute(
        'SELECT ID, RefreshTimeRuleType FROM ConfigDataRefreshTimeRuleInfo')}
    for sid in json.loads(s['FixedShopIdList'] or '[]'):
        shop = con.execute('SELECT * FROM ConfigDataFixedShopInfo WHERE ID = ?', (sid,)).fetchone()
        items = []
        for it in con.execute('SELECT * FROM ConfigDataFixedShopItemInfo WHERE ShopID = ? ORDER BY SortID DESC, ID',
                              (sid,)).fetchall():
            r = rewards.item(it['ItemType'], it['ItemId'], it['CountPerCell'] or -1, '%s shop' % name)
            if not r:
                continue
            row = {'item': r, 'price': it['NormalPrice'], 'currency': it['CurrencyType']}
            if (it['SellNumMax'] or 0) > 0:
                row['limit'] = it['SellNumMax']
                if resets.get(it['RefreshTimeRuleId']):
                    row['resets'] = resets[it['RefreshTimeRuleId']]
            items.append(row)
            paid.append(it['CurrencyType'])
        out.append({'name': text(shop['NameStrKey_EN']) or 'Event Shop', 'items': items})
    for sid in json.loads(s['RandomShopIdList'] or '[]'):
        shop = con.execute('SELECT * FROM ConfigDataRandomShopInfo WHERE ID = ?', (sid,)).fetchone()
        pools = [g['GroupType'] for g in json.loads(shop['RandomItemRange'] or '[]')]
        items = []
        for it in con.execute('SELECT * FROM ConfigDataRandomShopItemInfo WHERE ShopID = ? ORDER BY ItemGroupBelong, '
                              'SortID, ID', (sid,)).fetchall():
            r = rewards.item(it['ItemType'], it['ItemId'], it['CountPerCell'] or -1, '%s shop' % name)
            if not r:
                continue
            row = {'item': r, 'price': it['NormalPrice'], 'currency': it['CurrencyType']}
            if it['ItemGroupBelong'] in pools:
                row['pool'] = pools.index(it['ItemGroupBelong']) + 1
            if (it['SellCount'] or 0) > 0:
                row['limit'] = it['SellCount']
            items.append(row)
            paid.append(it['CurrencyType'])
        shop_out = {'name': RANDOM_SHOP_NAMES.get(sid) or 'Event Shop', 'random': True}
        # Its "name" is a line about the shop.
        if text(shop['NameStrKey_EN']):
            shop_out['text'] = clean(text(shop['NameStrKey_EN']))
        if text(shop['RefreshCurrencyType']):
            shop_out['refresh'] = shop['RefreshCurrencyType']
            paid.append(shop['RefreshCurrencyType'])
        shop_out['items'] = items
        out.append(shop_out)
    return out, paid


VALUE = re.compile(r'<color=#[0-9A-Fa-f]+>(.*?)</color>')
BUF = re.compile(r'<buf ID=(\d+)>(?:\[([^\]]*)\])?</buf>')
LV = re.compile(r'\s*Lv\.\s*\d+$')


def merge_levels(texts):
    """Per-level skill texts -> one, the values that differ joined: "+10/12/14%"."""
    parts = [VALUE.split(t) for t in texts]
    if len({len(p) for p in parts}) != 1 or any(
            len({p[i] for p in parts}) > 1 for i in range(0, len(parts[0]), 2)):
        return None
    out = parts[0][:]
    for i in range(1, len(out), 2):
        vals = [p[i] for p in parts]
        if len(set(vals)) > 1:
            m = [re.match(r'^([+-]?)([\d.]+)(%?)$', v) for v in vals]
            if all(m) and len({(x.group(1), x.group(3)) for x in m}) == 1:
                out[i] = m[0].group(1) + '/'.join(x.group(2) for x in m) + m[0].group(3)
            else:
                out[i] = '/'.join(vals)
        out[i] = '<color=#F74848>%s</color>' % out[i]
    return ''.join(out)


def commanders(con, a):
    """The commanders an event allows and their skills (see the module doc)."""
    def buf_name(bid):
        b = con.execute('SELECT NameDescStrKey_EN FROM ConfigDataActorBufInfo WHERE ID = ?', (bid,)).fetchone()
        return b and text(b[0])

    terms = {}

    def rich(s):
        def tag(m):
            name = m.group(2) or buf_name(int(m.group(1))) or '?'
            if int(m.group(1)) not in terms:
                b = con.execute('SELECT BuffDescStrKey_EN FROM ConfigDataActorBufInfo WHERE ID = ?',
                                (int(m.group(1)),)).fetchone()
                terms[int(m.group(1))] = {'id': int(m.group(1)), 'name': name, 'text': b and text(b[0])}
            return '<buf ID=%s>[%s]</buf>' % (m.group(1), name)
        return BUF.sub(tag, s or '')

    def skill(table, sid):
        r = con.execute('SELECT NameStrKey_EN, SkillDescStrKey_EN FROM %s WHERE ID = ?' % table, (sid,)).fetchone()
        return r and (text(r[0]), text(r[1]))

    out = []
    for cid in json.loads(a['AllowUseCommanders'] or '[]'):
        c = con.execute('SELECT * FROM ConfigDataBattleCommanderInfo WHERE ID = ?', (cid,)).fetchone()
        if not c:
            continue
        skills = []
        for g in con.execute('SELECT * FROM ConfigDataCommanderDevelopmentGroupInfo WHERE CommanderId = ? ORDER BY ID',
                             (cid,)):
            levels = [con.execute('SELECT * FROM ConfigDataCommanderDevelopmentInfo WHERE ID = ?', (d,)).fetchone()
                      for d in json.loads(g['DevelopmentInfos'] or '[]')]
            levels = [l for l in levels if l]
            if not levels:
                continue
            passives = [skill('ConfigDataPassiveSkillInfo', json.loads(l['PassiveSkillId'])[0])
                        for l in levels if l['PassiveSkillId']]
            passives = [p for p in passives if p]
            sk = {'name': text(g['DescStrKey_EN']), 'levels': len(levels)}
            if levels[0]['IsTalent']:
                sk['talent'] = True
            main = levels[0]['MainSkillIds'] and skill('ConfigDataMainSkillInfo', json.loads(levels[0]['MainSkillIds'])[0])
            if main:
                sk['command'] = {'name': main[0], 'text': rich(main[1])}
            if passives:
                texts = [p[1] for p in passives]
                merged = merge_levels(texts) if len(texts) > 1 else texts[0]
                pname = LV.sub('', passives[0][0])
                if merged:
                    sk['passive'] = {'name': pname, 'text': rich(merged)}
                else:
                    sk['passive'] = {'name': pname, 'levels': [rich(t) for t in texts]}
            skills.append(sk)
        if skills:
            out.append({'id': cid, 'name': text(c['NameStrKey_EN']), 'skills': skills,
                        'terms': [t for t in terms.values() if t['text']]})
        terms = {}
    return out


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    rewards = Rewards(con)
    # Shop paints: skin kits ('Skin Kit: "Shark—!"') and paint colours.
    rewards.d.names['ItemType_WapPaintingPlan'] = {i: ('%s: %s' % (kit, n) if kit else n, icon) for i, n, kit, icon in con.execute(
        'SELECT ID, NameStrKey_EN, Descript1StrKey_EN, Icon FROM ConfigDataWapPaintingPlanInfo')}
    rewards.d.names['ItemType_WapPaintingColor'] = {i: (n, None) for i, n in con.execute(
        'SELECT ID, NameStrKey_EN FROM ConfigDataWapPaintingColorInfo')}
    dates = run_dates(con)
    currencies = Currencies(con)
    ops = {}
    for r in con.execute("SELECT * FROM ConfigDataOperationalActivityInfo "
                         "WHERE ActivityType = 'OperationalActivityType_PlotActivity'"):
        parms = json.loads(r['OperationalActivityParms'] or '[]')
        if parms:
            ops[parms[0]['P1']] = r

    stage_maps = {}
    if os.path.exists(MAPS):
        with open(MAPS, encoding='utf-8') as f:
            stage_maps = json.load(f)['stages']
    else:
        print('no %s: run build_maps.py for the stages\' battle maps' % MAPS)

    events, runs = [], {}
    for a in con.execute('SELECT * FROM ConfigDataPlotActivityInfo ORDER BY ID').fetchall():
        name = text(a['NameStrKey_EN'])
        op = ops.get(a['ID'])
        run = runs[name] = runs.get(name, 0) + 1
        # "H.I.V.E." -> "hive".
        slug = slugify(name.replace('.', '')) + ('' if run == 1 else '-rerun' if run == 2 else '-rerun-%d' % (run - 1))
        ev = {'id': a['ID'], 'slug': slug, 'name': name}
        if run > 1:
            ev['rerun'] = run - 1
        if a['ID'] in dates:
            ev['start'], end = dates[a['ID']]
            # An event that never closes (2099, like Hunters' Freedom's rerun) stays in the game's Chronicles.
            if end.startswith('209'):
                ev['permanent'] = True
            else:
                ev['end'] = end
        prefabs = [p for p in json.loads(a['Prefabs'] or '[]') if p != 'NULL']
        if a['ID'] in IMAGES or prefabs:
            ev['image'] = IMAGES.get(a['ID']) or prefabs[0]
        ev['stages'] = stages(con, rewards, a, name)
        for st in (st for g in ev['stages'] for st in g['stages']):
            if stage_maps.get('ev-%d' % st['id']):
                st['maps'] = stage_maps['ev-%d' % st['id']]
        ev['milestones'] = milestones(con, rewards, a, name)
        ev['shops'], paid = shops(con, rewards, op and op['ExclusiveShopInfoID'], name)
        types = []
        for t in json.loads(a['MatchCurrencyTypeList'] or '[]') + paid + lottery_currencies(con, op):
            if t not in types:
                types.append(t)
        ev['currencies'] = [c for c in map(currencies.get, types) if c]
        cmd = commanders(con, a)
        if cmd:
            ev['commanders'] = cmd
        events.append(ev)

    data = {'events': events}
    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.EventsData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d events, %d stages, %d missions, %d shop items (%d KB)' % (
        OUT, len(events), sum(len(g['stages']) for e in events for g in e['stages']),
        sum(len(g['missions']) for e in events for g in e['milestones']),
        sum(len(s['items']) for e in events for s in e['shops']), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
