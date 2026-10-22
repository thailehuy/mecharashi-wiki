#!/usr/bin/env python3
"""Extract the Story page's stage pictures (data/story/story.json's `image`: each
main-story stage's and side story chapter's) into the assets repo
(data/story/<image>.jpg), and the Elite Battle page's chapter pictures
(data/elite/elite.json's `image`) into data/elite/<image>.jpg.

They're whole textures: map screenshots (Icon_Map_Desert_Raw, 1160x740) in the
game's ui_uiimages_uimapscreenshot_abs bundle, cutscene pictures
(TEST-304_Raw, 1920x592) in ui_uiimages_uidialogpic_* and the Elite Battle
chapters' (Img_elite_pic_02, 660x728, in a ragged dark frame that is cropped
off) in ui_uiimages_uielitebattle_abs: the installed copies and any newer ones
the game downloaded into its cache (the newest copy of each bundle wins).
Images already in the assets repo are skipped unless --force is given.

    python3 scripts/extract_story_images.py [--force]

Needs: pip install UnityPy Pillow
"""
import json
import os
import sys

import UnityPy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_item_icons import ASSETS_DIR, ELITE, STORY, newest_bundles, settings  # noqa: E402

STORY_DIR = os.path.join(ASSETS_DIR, 'data', 'story')
ELITE_DIR = os.path.join(ASSETS_DIR, 'data', 'elite')
STORY_BUNDLES = ('ui_uiimages_uimapscreenshot_abs', 'ui_uiimages_uidialogpic_')
ELITE_BUNDLES = ('ui_uiimages_uielitebattle_abs',)
# The Elite Battle pictures' frame: ~15px at the sides, 8 at the top, 25 at the bottom, ragged.
ELITE_CROP = (30, 20, 630, 690)


def story_images():
    with open(STORY, encoding='utf-8') as f:
        story = json.load(f)
    stages = [st for c in story['chapters'] for st in c['stages']] + \
             [st for s in story.get('sideStories', []) for st in s['stages']]
    return {st['image'] for st in stages if st.get('image')}


def elite_images():
    if not os.path.exists(ELITE):
        return set()
    with open(ELITE, encoding='utf-8') as f:
        return {c['image'] for c in json.load(f)['chapters'] if c.get('image')}


def extract(what, need, prefixes, out_dir, force, crop=None):
    todo = need if force else {i for i in need if not os.path.exists(os.path.join(out_dir, i + '.jpg'))}
    print('%d %s used, %d to extract' % (len(need), what, len(todo)))
    if not todo:
        return
    os.makedirs(out_dir, exist_ok=True)
    done = set()
    for name, path in sorted(newest_bundles(prefixes).items()):
        for obj in UnityPy.load(path).objects:
            if obj.type.name != 'Texture2D':
                continue
            tex = obj.read()
            if tex.m_Name in todo and tex.m_Name not in done:
                img = tex.image.convert('RGB')
                if crop:
                    img = img.crop(crop)
                img.save(os.path.join(out_dir, tex.m_Name + '.jpg'), quality=85, optimize=True)
                done.add(tex.m_Name)
    print('Extracted %d into %s' % (len(done), out_dir))
    missing = sorted(todo - done)
    if missing:
        print('Not in any %s* bundle: %s' % ('*/'.join(prefixes), ', '.join(missing)))


def main():
    force = '--force' in sys.argv[1:]
    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    extract('story pictures', story_images(), STORY_BUNDLES, STORY_DIR, force)
    extract('Elite Battle pictures', elite_images(), ELITE_BUNDLES, ELITE_DIR, force, ELITE_CROP)


if __name__ == '__main__':
    main()
