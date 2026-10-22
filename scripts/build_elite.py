#!/usr/bin/env python3
"""The Elite Battle page's data (a Misc. page), from the global client's
tables (RebuildGameUpdate/out/stats.db). Writes data/elite/elite.json and
elite.js (EliteData).

    python3 scripts/build_elite.py

Chapters (ConfigDataEliteBattleChapterInfo, by ID): slug (its page,
elitebattle/<slug>/), name, picture (ChapterImagePath, "Img_elite_pic_02",
extracted by extract_story_images.py), its stages (Levels) and the rewards for
collecting 6/12/18 stars across them (TotalStarRewards).

Stages (ConfigDataEliteBattleLevelInfo): number ("1-1"), name, energy cost,
daily attempts and clear rewards (RewardDropId, resolved like the Story page's,
see build_story.Rewards). Its battle (BattleMapId -> ConfigDataBattleMapInfo)
gives the victory and defeat conditions (AttackWinDescStrKey/
DefendWinDescStrKey), the three star conditions (StarConditionDescStrKey,
"/"-separated) and the achievements (BattleAchievementIds ->
ConfigDataBattleAchievementInfo: name, description, Reward drop ID).

Left out: the event-time bonus drops (EliteBattleLevelExtraRewardInfo, only
while an operational activity runs).
"""
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_pages import slugify  # noqa: E402
from build_story import Rewards, STATS, clean, text  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'elite')
OUT = os.path.join(HERE, 'elite.json')
OUT_JS = os.path.join(HERE, 'elite.js')


def stage(con, rewards, lid):
    l = con.execute('SELECT * FROM ConfigDataEliteBattleLevelInfo WHERE ID = ?', (lid,)).fetchone()
    m = con.execute('SELECT * FROM ConfigDataBattleMapInfo WHERE ID = ?', (l['BattleMapId'],)).fetchone()
    where = 'Elite %s' % l['LevelNumber']
    st = {'id': l['ID'], 'code': l['LevelNumber'], 'name': text(l['NameStrKey_EN']),
          'energy': l['EnergyCost'], 'daily': l['BattleCountEveryDay'],
          'win': clean(text(m['AttackWinDescStrKey_EN'])), 'lose': clean(text(m['DefendWinDescStrKey_EN']))}
    stars = text(m['StarConditionDescStrKey_EN'])
    if stars:
        st['stars'] = [clean(s).strip() for s in stars.split('/') if s.strip()]
    st['achievements'] = []
    for aid in json.loads(m['BattleAchievementIds'] or '[]'):
        a = con.execute('SELECT * FROM ConfigDataBattleAchievementInfo WHERE ID = ?', (aid,)).fetchone()
        if not a:
            print('%s: no achievement %d' % (where, aid))
            continue
        st['achievements'].append({'name': text(a['NameStrKey_EN']), 'text': clean(text(a['DescStrKey_EN'])),
                                   'rewards': rewards.get(a['Reward'], '%s achievement %d' % (where, aid))})
    st['rewards'] = rewards.get(l['RewardDropId'], where)
    return st


def main():
    con = sqlite3.connect(STATS)
    con.row_factory = sqlite3.Row
    rewards = Rewards(con)
    chapters = []
    for c in con.execute('SELECT * FROM ConfigDataEliteBattleChapterInfo ORDER BY ID').fetchall():
        chapters.append({
            'id': c['ID'], 'slug': slugify(text(c['NameStrKey_EN'])), 'name': text(c['NameStrKey_EN']),
            'image': text(c['ChapterImagePath']),
            'starRewards': [{'stars': s['Count'], 'rewards': rewards.get(s['DropId'], 'Elite chapter %d %d stars' % (
                c['ID'], s['Count']))} for s in json.loads(c['TotalStarRewards'] or '[]')],
            'stages': [stage(con, rewards, lid) for lid in json.loads(c['Levels'] or '[]')],
        })
    data = {'chapters': chapters}

    os.makedirs(HERE, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write('window.EliteData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('Wrote %s: %d chapters, %d stages (%d KB)' % (
        OUT, len(chapters), sum(len(c['stages']) for c in chapters), os.path.getsize(OUT_JS) // 1024))


if __name__ == '__main__':
    main()
