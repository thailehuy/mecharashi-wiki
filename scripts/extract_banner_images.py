#!/usr/bin/env python3
"""Render the gacha banner art the Banner List page uses
(data/banners/banners.json) into the assets repo (data/banners/<prefab>.jpg).

A banner's art is split into 2 or more textures (Img_1_pilot_gacha_<Name>1_Raw,
..2_Raw, ...) that its pool prefab (ui_prefabs_pilotgacha_abs /
ui_prefabs_wapgacha_abs) lays out side by side. This walks each prefab's UI
tree, places every active Image/RawImage by its RectTransform (skipping
particle/effect/button nodes) and composites them, then scales the result to
WIDTH. The textures live in the ui_uiimages_* gacha bundles; the newest copy
of each bundle (installed .b or downloaded __data) wins. The game folder and
bundle key come from the MRT_FieldWiki update scripts' settings.py; with
MECHA_REGION=CN they are the CN client's, for the banners only CN has so far.
Images already in the assets repo are skipped unless --force is given.

    python3 scripts/extract_banner_images.py [--force]
    MECHA_REGION=CN python3 scripts/extract_banner_images.py

Needs: pip install UnityPy Pillow
"""
import glob
import json
import os
import re
import sys

import UnityPy
from PIL import Image
from UnityPy.files.SerializedFile import SerializedFile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate'))
import settings  # noqa: E402

BANNERS = os.path.join(ROOT, 'data', 'banners', 'banners.json')
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
OUT_DIR = os.path.join(ASSETS_DIR, 'data', 'banners')
BUNDLE_DIR = os.path.join(settings.GAME_DIR, 'Mecharashi_Data', 'StreamingAssets', 'ExportAssetBundle')
CACHE_DIR = os.path.dirname(settings.CONFIG_CACHE)
LANG = 'cn' if settings.CN else 'en'
BUNDLES = ['ui_prefabs_pilotgacha_abs.b', 'ui_prefabs_wapgacha_abs.b', 'ui_uiimages_uigacha_*_abs.b',
           'ui_uiimages_uipilotgacha_abs.b', 'ui_uiimages_uiwapgacha_abs.b',
           # Localized art (titles, and some banners' backgrounds); the downloaded copy is the game's language.
           'ui_textimages_pilotgachaimg_abs.' + LANG, 'ui_textimages_chinese_wapgachaimg_abs.' + LANG]
WIDTH = 1300
SKIP = re.compile(r'particle|effect|btn|button|fx|shine', re.I)
# The character art (a Spine render) sometimes sits inside an effect container; it's kept.
SPINE = re.compile(r'^(img_)?spine\d*$', re.I)


def newest(name):
    """The newest copy of a bundle: installed .b or downloaded __data."""
    paths = glob.glob(os.path.join(BUNDLE_DIR, name))
    paths += glob.glob(os.path.join(CACHE_DIR, name.rsplit('.', 1)[0], '*', '__data'))
    return max(paths, key=os.path.getmtime)


class Bundles:
    """The gacha bundles loaded together, so a prefab's textures in other bundles resolve."""

    def __init__(self, paths=None):
        if paths is None:
            names = {os.path.basename(p) for pat in BUNDLES for p in glob.glob(os.path.join(BUNDLE_DIR, pat))}
            paths = [newest(n) for n in sorted(names)]
        env = UnityPy.load(*paths)
        self.cabs = {}
        for f in env.files.values():
            for k, sf in self._serialized(f):
                self.cabs[k.lower()] = sf
        self.trees = {}

    def _serialized(self, f):
        for k, sub in getattr(f, 'files', {}).items():
            if isinstance(sub, SerializedFile):
                yield k, sub
            else:
                yield from self._serialized(sub)

    def deref(self, sf, ptr):
        if not ptr['m_PathID']:
            return None
        if ptr['m_FileID']:
            sf = self.cabs.get(sf.externals[ptr['m_FileID'] - 1].path.split('/')[-1].lower())
            if sf is None:
                return None
        return sf.objects.get(ptr['m_PathID'])

    def tree(self, o):
        k = (o.assets_file.name, o.path_id)
        if k not in self.trees:
            self.trees[k] = o.read_typetree()
        return self.trees[k]

    def prefabs(self, wanted):
        found = {}
        for sf in self.cabs.values():
            for o in sf.objects.values():
                if o.type.name == 'GameObject':
                    name = self.tree(o)['m_Name']
                    if name in wanted and name not in found:
                        found[name] = o
        return found


def layers(b, root):
    """Every visible image under a prefab as (image object, x, y, w, h, alpha), y up."""
    out = []

    def walk(go, M, prect, depth, fx=False):
        g = b.tree(go)
        if not g['m_IsActive']:
            return
        fx = fx or bool(depth and SKIP.search(g['m_Name']))
        comps = [b.deref(go.assets_file, c['component']) for c in g['m_Component']]
        tr = comps[0]
        t = b.tree(tr)
        if tr.type.name == 'RectTransform':
            px, py, pw, ph = prect
            amin, amax, piv = t['m_AnchorMin'], t['m_AnchorMax'], t['m_Pivot']
            w = (amax['x'] - amin['x']) * pw + t['m_SizeDelta']['x']
            h = (amax['y'] - amin['y']) * ph + t['m_SizeDelta']['y']
            ax = px + pw * (amin['x'] + (amax['x'] - amin['x']) * piv['x']) + t['m_AnchoredPosition']['x']
            ay = py + ph * (amin['y'] + (amax['y'] - amin['y']) * piv['y']) + t['m_AnchoredPosition']['y']
            sx, sy = t['m_LocalScale']['x'], t['m_LocalScale']['y']
            # Scale about the pivot, on top of the parents' transform.
            a, d, cx, cy = M
            M = (a * sx, d * sy, a * (ax - sx * ax) + cx, d * (ay - sy * ay) + cy)
            prect = (ax - w * piv['x'], ay - h * piv['y'], w, h)
        for c in comps[1:]:
            if fx and not SPINE.match(g['m_Name']):
                break
            if c is None or c.type.name != 'MonoBehaviour':
                continue
            try:
                x = b.tree(c)
            except Exception:
                continue
            if not x.get('m_Enabled', 1):
                continue
            for k in ('m_Texture', 'm_Sprite'):
                if k in x and x[k]['m_PathID']:
                    img = b.deref(c.assets_file, x[k])
                    if img is None:
                        print('  %s: missing texture' % g['m_Name'])
                        continue
                    a, d, cx, cy = M
                    rx, ry, rw, rh = prect
                    out.append((img, a * rx + cx, d * ry + cy, a * rw, d * rh, x.get('m_Color', {}).get('a', 1)))
        for ch in t['m_Children']:
            cto = b.deref(tr.assets_file, ch)
            walk(b.deref(cto.assets_file, b.tree(cto)['m_GameObject']), M, prect, depth + 1, fx)

    walk(root, (1, 1, 0, 0), (0, 0, 0, 0), 0)
    return [L for L in out if L[3] > 0 and L[4] > 0 and L[5] > 0.01]


def render(ls):
    x0 = min(L[1] for L in ls)
    y1 = max(L[2] + L[4] for L in ls)
    w = round(max(L[1] + L[3] for L in ls) - x0)
    h = round(y1 - min(L[2] for L in ls))
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    for img, x, y, lw, lh, alpha in ls:
        im = img.read().image.convert('RGBA').resize((max(1, round(lw)), max(1, round(lh))), Image.LANCZOS)
        if alpha < 1:
            im.putalpha(im.getchannel('A').point(lambda v: int(v * alpha)))
        layer = Image.new('RGBA', canvas.size)
        layer.paste(im, (round(x - x0), round(y1 - (y + lh))))
        canvas = Image.alpha_composite(canvas, layer)
    return canvas.convert('RGB').resize((WIDTH, round(h * WIDTH / w)), Image.LANCZOS)


def main():
    force = '--force' in sys.argv[1:]
    with open(BANNERS, encoding='utf-8') as f:
        need = {r['image'] for r in json.load(f)['banners'] if r.get('image')}
    todo = need if force else {n for n in need if not os.path.exists(os.path.join(OUT_DIR, n + '.jpg'))}
    print('%d banner images used, %d to render' % (len(need), len(todo)))
    if not todo:
        return
    UnityPy.set_assetbundle_decrypt_key(settings.BUNDLE_KEY)
    b = Bundles()
    found = b.prefabs(todo)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in sorted(found):
        ls = layers(b, found[name])
        if not ls:
            print('  %s: no images' % name)
            continue
        render(ls).save(os.path.join(OUT_DIR, name + '.jpg'), quality=85, optimize=True)
        print('  %s: %d parts' % (name, len(ls)))
    missing = sorted(todo - set(found))
    if missing:
        print('Prefabs not found: ' + ', '.join(missing))


if __name__ == '__main__':
    main()
