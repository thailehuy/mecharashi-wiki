#!/usr/bin/env python3
"""Extract the item icons the boss drops use (bosses.json) from the game's
bundles into the assets repo (data/items/<icon>.png).

The icons are sprites in the game's ui_uiimages_uiicons_itemtype_abs_* bundles:
the installed copies and any newer ones the game downloaded into its cache
(the newest copy of each bundle wins). The game folder and bundle key come
from the MRT_FieldWiki update scripts' settings.py. Icons already in the
assets repo are skipped unless --force is given.

    python3 data/bosses/extract_item_icons.py [--force]

Needs: pip install UnityPy
"""
import glob
import json
import os
import sys

import UnityPy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate'))
import settings  # noqa: E402

BOSSES = os.path.join(HERE, 'bosses.json')
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
OUT_DIR = os.path.join(ASSETS_DIR, 'data', 'items')
BUNDLE_DIR = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'ExportAssetBundle')
CACHE_DIR = os.path.join(settings.LOCAL_LOW, 'Unity', 'tentree_Mecharashi')
PREFIX = 'ui_uiimages_uiicons_itemtype_abs_'


def needed_icons():
    """Every item icon a drop in bosses.json uses."""
    with open(BOSSES, encoding='utf-8') as f:
        data = json.load(f)
    sets = [st['drops'] for c in data['clearance_ops'] for st in c['stages'] if 'drops' in st]
    sets += [d for s in data['armed_conquest'] for st in s['stages'] for d in st.get('drops', {}).values()]
    return {it['icon'] for d in sets for key in ('items', 'always', 'first') for it in d.get(key, []) if 'icon' in it}


def newest_bundles():
    """Bundle name -> the path of its newest copy (installed .b or downloaded __data)."""
    copies = {}
    for p in glob.glob(os.path.join(BUNDLE_DIR, PREFIX + '*.b')):
        copies.setdefault(os.path.basename(p)[:-2], []).append(p)
    for p in glob.glob(os.path.join(CACHE_DIR, PREFIX + '*', '*', '__data')):
        copies.setdefault(os.path.basename(os.path.dirname(os.path.dirname(p))), []).append(p)
    return {name: max(paths, key=os.path.getmtime) for name, paths in copies.items()}


def main():
    force = '--force' in sys.argv[1:]
    need = needed_icons()
    todo = need if force else {i for i in need if not os.path.exists(os.path.join(OUT_DIR, i + '.png'))}
    print('%d item icons used, %d to extract' % (len(need), len(todo)))
    if not todo:
        return
    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    os.makedirs(OUT_DIR, exist_ok=True)
    done = set()
    for name, path in sorted(newest_bundles().items()):
        for obj in UnityPy.load(path).objects:
            if obj.type.name != 'Sprite':
                continue
            sprite = obj.read()
            if sprite.m_Name in todo and sprite.m_Name not in done:
                # The whole 340x340 texture, like the weapon icons (sprite.image
                # trims the transparent edges).
                sprite.m_RD.texture.read().image.save(os.path.join(OUT_DIR, sprite.m_Name + '.png'))
                done.add(sprite.m_Name)
    print('Extracted %d into %s' % (len(done), OUT_DIR))
    missing = sorted(todo - done)
    if missing:
        print('Not in any %s* bundle: %s' % (PREFIX, ', '.join(missing)))


if __name__ == '__main__':
    main()
