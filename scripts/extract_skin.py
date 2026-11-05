"""Export ST skin art (Img_Skin_*) from a game client's bundles into the assets repo.

All ST skin art lives in one bundle, ui_uiimages_uiskinreward_abs.b, in the client's install folder
(StreamingAssets/ExportAssetBundle), not in the downloaded cache. CN gets new skins first.

    python scripts/extract_skin.py --list                      # every Img_Skin texture in the bundle
    python scripts/extract_skin.py wap2049_S1 --type Medium    # -> Skins/Medium/Img_Skin_wap2049_S1.png
    python scripts/extract_skin.py wap3132 --type Heavy --as wap3032_S2

The skin list (name, ST, release time) is ConfigDataWapPaintingPlanInfo in mined/cn/out/stats.db:
rows whose PaintingPanelPictureResource starts with Img_Skin_wap. The bundle key comes from the
gacha pipeline's settings.local.json (run its make-settings.py once). Needs UnityPy.
After exporting, add the variant to the ST's `skins` in data/db/mechs.json and run compile.py.
"""
import argparse, json, os, sys
import UnityPy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SETTINGS = os.path.join(ROOT, 'data', 'screenshots', 'animation-sample', '6_pipeline', 'settings.local.json')
BUNDLES = {
    'cn': os.environ.get('CN_BUNDLES', 'C:/PGLauncher/games/Mecharashi/client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
    'global': os.environ.get('GLOBAL_BUNDLES', 'C:/Games/Mecharashi/Client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
}
SKINS = os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets', 'data', 'unlisted', 'mechs', 'Skins')

ap = argparse.ArgumentParser()
ap.add_argument('name', nargs='?', help='texture name after Img_Skin_, e.g. wap2049_S1')
ap.add_argument('--type', choices=['Light', 'Medium', 'Heavy'], help='ST weight class (Skins sub-folder)')
ap.add_argument('--as', dest='out_name', help='save under a different name (after Img_Skin_)')
ap.add_argument('--client', choices=BUNDLES, default='cn')
ap.add_argument('--list', action='store_true')
args = ap.parse_args()

k = json.load(open(SETTINGS, encoding='utf-8-sig'))['key'].strip()
UnityPy.set_assetbundle_decrypt_key(bytes.fromhex(k) if len(k) == 32 else k.encode())
env = UnityPy.load(os.path.join(BUNDLES[args.client], 'ui_uiimages_uiskinreward_abs.b'))
# Each image is in the bundle twice: the full Texture2D and a trimmed Sprite. Keep the Texture2D.
tex = {os.path.basename(p)[:-4]: o for p, o in env.container.items() if o.type.name == 'Texture2D'}

if args.list or not args.name:
    print('\n'.join(sorted(tex)))
    sys.exit(0)
if not args.type:
    sys.exit('--type is required')
o = tex.get(f'img_skin_{args.name}'.lower())
if not o:
    sys.exit(f'no Img_Skin_{args.name} in the bundle (--list shows all)')
out = os.path.join(SKINS, args.type, f'Img_Skin_{args.out_name or args.name}.png')
im = o.read().image
im.save(out)
print(f'{out} {im.size}')
