#!/usr/bin/env python3
"""Render the Events page's pictures (data/events/events.json's `image`: an
event's main screen prefab, or a texture) into the assets repo
(data/events/<image>.jpg).

Each prefab is laid out like a gacha banner (extract_banner_images.layers:
every visible image by its RectTransform, without buttons and effects) and
cropped to the screen, 2400x1080 around its centre, then scaled to WIDTH
(TWEAKS fixes up the ones laid out or shaded at run time); a texture is cropped to the
screen's shape. The
prefabs are in ui_prefabs_plotactivity*_abs, their textures in the
ui_uiimages_uiplotactivity*/uiactivity* bundles (newest copy wins) and the
English title art in the installed ui_textimages_*activity_abs.en (the
downloaded copies are the game's language). Images already in the assets repo
are skipped unless --force is given.

    python3 scripts/extract_event_images.py [--force]

Needs: pip install UnityPy Pillow
"""
import glob
import json
import os
import sys

import UnityPy
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_banner_images as eb  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVENTS = os.path.join(ROOT, 'data', 'events', 'events.json')
OUT_DIR = os.path.join(eb.ASSETS_DIR, 'data', 'events')
BUNDLES = ['ui_prefabs_plotactivity_abs.b', 'ui_prefabs_plotactivitydetective_abs.b',
           'ui_uiimages_uiplotactivity*_abs*.b', 'ui_uiimages_uiactivity_abs_*.b']
TEXT_BUNDLES = ['ui_textimages_plotactivity_abs.en', 'ui_textimages_activity_abs.en']
SCREEN = (2400, 1080)
WIDTH = 1200


def gilded(ls):
    """Gilded Reverie's stage cards are laid out (and its title slid in) at run time: the wall and the title,
    centred and enlarged."""
    bg = [L for L in ls if L[0].read().m_Name == 'Img_OnlyChallenge_bg_Raw']
    title = [L for L in ls if L[0].read().m_Name == 'Img_OnlyChallenge_bg_title']
    w, h = title[0][3] * 1.5, title[0][4] * 1.5
    return bg + [(title[0][0], -w / 2, -h / 2, w, h, 1)]


class Picture:
    """A PIL image standing in for a texture layer."""

    def __init__(self, image):
        self.image = image
        self.m_Name = ''

    def read(self):
        return self


def ada(ls):
    """Guided by Starlight's Ada (Cover03_M2) is drawn with a scan-line checkerboard over her body for a shader,
    as is the overlay above her (Cover02_M1): her own artwork from the assets repo in her place, without the overlay."""
    art = Image.open(os.path.join(eb.ASSETS_DIR, 'data', 'unlisted', 'pilot_images_raw',
                                  'Pilot_10103118A_Raw.png')).convert('RGBA')
    out = []
    for L in ls:
        name = L[0].read().m_Name
        if name == 'Img_PlotLevelAda_Cover02_M1':
            continue
        if name == 'Img_PlotLevelAda_Cover03_M2':
            L = (Picture(art), L[1], L[2], L[3], L[3] * art.height / art.width, 1)
        out.append(L)
    return out


# Prefabs whose layers need fixing up.
TWEAKS = {'PlotActivityOnlyChallengeOB12UIPrefab': gilded, 'UIPlotActivityAdaMainUIPrefab': ada}


def render(ls):
    """The layers on a screen-sized canvas centred on the prefab's origin."""
    w, h = SCREEN
    canvas = Image.new('RGBA', SCREEN, (0, 0, 0, 255))
    for img, x, y, lw, lh, alpha in ls:
        im = img.read().image.convert('RGBA').resize((max(1, round(lw)), max(1, round(lh))), Image.LANCZOS)
        if alpha < 1:
            im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
        layer = Image.new('RGBA', SCREEN)
        layer.paste(im, (round(x + w / 2), round(h / 2 - (y + lh))))
        canvas = Image.alpha_composite(canvas, layer)
    return canvas.convert('RGB').resize((WIDTH, round(h * WIDTH / w)), Image.LANCZOS)


def texture(b, name):
    """A plain texture (an event whose screens are filled in at run time), cropped to the screen's shape."""
    for sf in b.cabs.values():
        for o in sf.objects.values():
            if o.type.name == 'Texture2D' and b.tree(o)['m_Name'] == name:
                im = o.read().image.convert('RGB')
                w, h = im.size
                ch = min(h, round(w * SCREEN[1] / SCREEN[0]))
                top = (h - ch) // 2
                im = im.crop((0, top, w, top + ch))
                return im.resize((WIDTH, round(ch * WIDTH / w)), Image.LANCZOS)
    return None


def main():
    force = '--force' in sys.argv[1:]
    with open(EVENTS, encoding='utf-8') as f:
        need = {e['image'] for e in json.load(f)['events'] if e.get('image')}
    todo = need if force else {n for n in need if not os.path.exists(os.path.join(OUT_DIR, n + '.jpg'))}
    print('%d event images used, %d to render' % (len(need), len(todo)))
    if not todo:
        return
    UnityPy.set_assetbundle_decrypt_key(eb.settings.BUNDLE_KEY)
    names = {os.path.basename(p) for pat in BUNDLES for p in glob.glob(os.path.join(eb.BUNDLE_DIR, pat))}
    paths = [eb.newest(n) for n in sorted(names)] + [os.path.join(eb.BUNDLE_DIR, n) for n in TEXT_BUNDLES]
    b = eb.Bundles(paths)
    found = b.prefabs(todo)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in sorted(found):
        ls = eb.layers(b, found[name])
        if name in TWEAKS:
            ls = TWEAKS[name](ls)
        if not ls:
            print('  %s: no images' % name)
            continue
        render(ls).save(os.path.join(OUT_DIR, name + '.jpg'), quality=85, optimize=True)
        print('  %s: %d parts' % (name, len(ls)))
    missing = []
    for name in sorted(todo - set(found)):
        im = texture(b, name)
        if im is None:
            missing.append(name)
            continue
        im.save(os.path.join(OUT_DIR, name + '.jpg'), quality=85, optimize=True)
        print('  %s: texture' % name)
    if missing:
        print('Prefabs or textures not found: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
