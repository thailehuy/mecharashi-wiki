#!/usr/bin/env python3
"""Extract the item icons the boss drops (bosses.json), crafting materials
(data/db/materials.json), story stage rewards (data/story/story.json), Elite Battle rewards
(data/elite/elite.json), Simulated Battle rewards (data/sim/sim.json), Covert Phantom boss rewards
(data/covert/covert.json), Memory Storm clear drops (data/storm/storm.json) and the Shops page's Nostalgic Challenge Store items (data/shops.js) use from the game's bundles into the assets repo (data/items/<icon>.png), and the
Border Conflict foes' portraits on the Story and Covert Phantom pages and the Covert Phantom pilot masteries'
pilots (data/unlisted/pilot_images_half/<portrait>.png).

The icons are sprites in the game's ui_uiimages_uiicons_itemtype_abs_* bundles
(pilot chips': ..._itemchips_abs, medals': ..._honormedal_abs), the portraits
in ui_uiimages_uipiloticons_abs_*: the installed copies and any newer ones the
game downloaded into its cache (the newest copy of each bundle wins). The game
folder and bundle key come from the MRT_FieldWiki update scripts' settings.py.
Images already in the assets repo are skipped unless --force is given.

    python3 scripts/extract_item_icons.py [--force]

Needs: pip install UnityPy
"""
import glob
import json
import os
import re
import sys

import UnityPy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'bosses')
sys.path.insert(0, os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate'))
import settings  # noqa: E402

BOSSES = os.path.join(HERE, 'bosses.json')
MATERIALS = os.path.join(ROOT, 'data', 'db', 'materials.json')
STORY = os.path.join(ROOT, 'data', 'story', 'story.json')
ELITE = os.path.join(ROOT, 'data', 'elite', 'elite.json')
SIM = os.path.join(ROOT, 'data', 'sim', 'sim.json')
COVERT = os.path.join(ROOT, 'data', 'covert', 'covert.json')
STORM = os.path.join(ROOT, 'data', 'storm', 'storm.json')
SHOPS = os.path.join(ROOT, 'data', 'shops.js')
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
OUT_DIR = os.path.join(ASSETS_DIR, 'data', 'items')
PORTRAIT_DIR = os.path.join(ASSETS_DIR, 'data', 'unlisted', 'pilot_images_half')
BUNDLE_DIR = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'ExportAssetBundle')
CACHE_DIR = os.path.join(settings.LOCAL_LOW, 'Unity', 'tentree_Mecharashi')
ICON_BUNDLES = ('ui_uiimages_uiicons_itemtype_abs_', 'ui_uiimages_uiicons_itemchips_abs',
                'ui_uiimages_uiicons_honormedal_abs')
PORTRAIT_BUNDLES = ('ui_uiimages_uipiloticons_abs_',)


def needed_icons():
    """Every item icon a drop in bosses.json, a crafting material or a story reward uses."""
    with open(BOSSES, encoding='utf-8') as f:
        data = json.load(f)
    sets = [st['drops'] for c in data['clearance_ops'] for st in c['stages'] if 'drops' in st]
    sets += [d for s in data['armed_conquest'] for st in s['stages'] for d in st.get('drops', {}).values()]
    icons = {it['icon'] for d in sets for key in ('items', 'always', 'first') for it in d.get(key, []) if 'icon' in it}
    with open(MATERIALS, encoding='utf-8') as f:
        icons |= {m['item_icon'] for m in json.load(f).values() if 'item_icon' in m}
    if os.path.exists(STORY):
        with open(STORY, encoding='utf-8') as f:
            story = json.load(f)
        # Accessories' Icon_skill_* icons are pilot skill icons, already in the assets repo.
        stages = [st for c in story['chapters'] for st in c['stages']] + \
                 [st for e in story.get('events', []) for p in e['parts'] for st in p['stages']]
        # An event stage with several difficulties lists each one's rewards.
        rewards = [r for st in stages for t in st.get('tiers', [st]) for r in t.get('rewards', [])]
        icons |= {r['icon'] for r in rewards
                  if r['kind'] == 'item' and r.get('icon') and not r['icon'].startswith('Icon_skill_')}
    if os.path.exists(ELITE):
        with open(ELITE, encoding='utf-8') as f:
            elite = json.load(f)
        # Each stage's clear and achievement rewards, and each chapter's star rewards.
        rewards = [r for c in elite['chapters'] for s in c['starRewards'] for r in s['rewards']] + \
                  [r for c in elite['chapters'] for st in c['stages']
                   for r in st['rewards'] + [x for a in st['achievements'] for x in a['rewards']]]
        icons |= {r['icon'] for r in rewards
                  if r['kind'] == 'item' and r.get('icon') and not r['icon'].startswith('Icon_skill_')}
    if os.path.exists(SIM):
        with open(SIM, encoding='utf-8') as f:
            sim = json.load(f)
        icons |= {r['icon'] for c in sim['chapters'] for st in c['stages'] for r in st['rewards']
                  if r['kind'] == 'item' and r.get('icon')}
    # Each boss tier's rewards, per difficulty.
    icons |= {r['icon'] for t in covert_tiers() for rs in t['rewards'].values() for r in rs
              if r['kind'] == 'item' and r.get('icon')}
    if os.path.exists(STORM):
        with open(STORM, encoding='utf-8') as f:
            storm = json.load(f)
        # Each score tier's first-clear, bonus and normal drops.
        icons |= {r['icon'] for s in storm['seasons'] for t in s['tiers'] for key in ('first', 'bonus', 'normal')
                  for r in t[key] if r['kind'] == 'item' and r.get('icon')}
    # The Shops page's Nostalgic Challenge Store items (data/shops.js, written by hand).
    if os.path.exists(SHOPS):
        with open(SHOPS, encoding='utf-8') as f:
            icons |= set(re.findall(r"icon: '([^']+)'", f.read()))
    return icons


def covert_tiers():
    """Every boss tier on the Covert Phantom page."""
    if not os.path.exists(COVERT):
        return []
    with open(COVERT, encoding='utf-8') as f:
        return [t for a in json.load(f)['areas'] for g in a['bosses'] for t in g['tiers']]


def needed_portraits():
    """Every Border Conflict foe's portrait (Pilot_11002A_half) on the Story and Covert Phantom pages, and the
    Covert Phantom pilot masteries' pilots."""
    need = {t['portrait'] for t in covert_tiers() if t.get('portrait')}
    if os.path.exists(COVERT):
        with open(COVERT, encoding='utf-8') as f:
            need |= {m['portrait'] for m in json.load(f)['masteries']}
    if not os.path.exists(STORY):
        return need
    with open(STORY, encoding='utf-8') as f:
        bc = json.load(f).get('borderConflict', {})
    return need | {f['portrait'] for b in bc.get('bosses', []) for f in b['foes'] if f.get('portrait')}


def newest_bundles(prefixes):
    """Bundle name -> the path of its newest copy (installed .b or downloaded __data)."""
    copies = {}
    for prefix in prefixes:
        for p in glob.glob(os.path.join(BUNDLE_DIR, prefix + '*.b')):
            copies.setdefault(os.path.basename(p)[:-2], []).append(p)
        for p in glob.glob(os.path.join(CACHE_DIR, prefix + '*', '*', '__data')):
            copies.setdefault(os.path.basename(os.path.dirname(os.path.dirname(p))), []).append(p)
    return {name: max(paths, key=os.path.getmtime) for name, paths in copies.items()}


def extract(what, need, prefixes, out_dir, force, whole):
    todo = need if force else {i for i in need if not os.path.exists(os.path.join(out_dir, i + '.png'))}
    print('%d %s used, %d to extract' % (len(need), what, len(todo)))
    if not todo:
        return
    os.makedirs(out_dir, exist_ok=True)
    done = set()
    for name, path in sorted(newest_bundles(prefixes).items()):
        for obj in UnityPy.load(path).objects:
            if obj.type.name != 'Sprite':
                continue
            sprite = obj.read()
            if sprite.m_Name in todo and sprite.m_Name not in done:
                # Icons: the whole 340x340 texture, like the weapon icons (sprite.image trims the
                # transparent edges). Portraits share an atlas, so they're cut out of it.
                img = sprite.m_RD.texture.read().image if whole else sprite.image
                img.save(os.path.join(out_dir, sprite.m_Name + '.png'))
                done.add(sprite.m_Name)
    print('Extracted %d into %s' % (len(done), out_dir))
    missing = sorted(todo - done)
    if missing:
        print('Not in any %s* bundle: %s' % ('*/'.join(prefixes), ', '.join(missing)))


def main():
    force = '--force' in sys.argv[1:]
    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    extract('item icons', needed_icons(), ICON_BUNDLES, OUT_DIR, force, whole=True)
    extract('portraits', needed_portraits(), PORTRAIT_BUNDLES, PORTRAIT_DIR, force, whole=False)


if __name__ == '__main__':
    main()
