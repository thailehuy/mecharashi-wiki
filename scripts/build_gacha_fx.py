#!/usr/bin/env python3
"""Build the animated mech recruitment banners (gacha FX) for every mech pool and copy them into
the assets repo's data/gachafx/:

    data/gachafx/<wap>.json           web FX data for one pool (particle systems + layers)
    data/gachafx/fx/<texture>.png     every texture those JSONs reference (official asset names, shared)
    data/gachafx/cards/<wap>.webp     the banner illustration, 2600x1080, drawn under the effects
    data/gachafx/manifest.json        one row per pool: wap, client (global/cn), pool key, prefab, counts
    data/gachafx/gacha-fx-engine.js   the WebGL2 player: startGachaFx(canvas, data, { background, texUrl, ... })

The work is done by the pipeline in data/screenshots/animation-sample/6_pipeline/ (git-ignored;
read its README.md first): it exports every mapped pool from the Global and CN clients, builds,
checks against its baseline, bundles the engine and stages out/. Global's build is used when the
Global client has the pool, CN's otherwise. Files in data/gachafx/ that the new build no longer
produces are removed.

    python3 scripts/build_gacha_fx.py [--skip-build] [--setup] [--prefer cn]

--skip-build copies the last staged out/ without re-running the pipeline; --setup runs the
pipeline's one-off setup (npm install, Python check, bundle key) first. Needs Git Bash, Node and
UnityPy (see the pipeline's README). Stops without copying if any pool built with a warning.
"""
import argparse
import filecmp
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
SAMPLE_DIR = os.path.join(ROOT, 'data', 'screenshots', 'animation-sample')
PIPELINE_DIR = os.path.join(SAMPLE_DIR, '6_pipeline')
STAGED_DIR = os.path.join(PIPELINE_DIR, 'out')
ENGINE = os.path.join(SAMPLE_DIR, '5_demo', 'gacha-fx-engine.js')
OUT_DIR = os.path.join(ASSETS_DIR, 'data', 'gachafx')


def bash():
    """Git Bash on Windows (WSL's bash.exe in System32 would not see these paths), plain bash elsewhere."""
    for path in (os.environ.get('BASH'), r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')):
        if path and os.path.exists(path):
            return path
    sys.exit('bash not found (set BASH to Git Bash)')


def pipeline(*args):
    subprocess.run([bash(), './pipeline.sh', *args], cwd=PIPELINE_DIR, check=True)


def wanted_files():
    """Published path (relative to OUT_DIR) -> source file."""
    files = {'manifest.json': os.path.join(STAGED_DIR, 'manifest.json'), 'gacha-fx-engine.js': ENGINE}
    for name in os.listdir(os.path.join(STAGED_DIR, 'gachaFx')):
        files[name] = os.path.join(STAGED_DIR, 'gachaFx', name)
    for sub in ('fx', 'cards'):
        for name in os.listdir(os.path.join(STAGED_DIR, sub)):
            files[sub + '/' + name] = os.path.join(STAGED_DIR, sub, name)
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--skip-build', action='store_true', help='copy the last staged out/ as is')
    ap.add_argument('--setup', action='store_true', help="run the pipeline's setup first")
    ap.add_argument('--prefer', choices=('global', 'cn'), default='global', help='client to take a pool from when both have it')
    args = ap.parse_args()

    if not os.path.isdir(PIPELINE_DIR):
        sys.exit(f'{PIPELINE_DIR} not found: the gacha FX pipeline is git-ignored and lives only on the machine that set it up')
    if not os.path.isdir(ASSETS_DIR):
        sys.exit(f'assets repo not found at {ASSETS_DIR} (set ASSETS_DIR)')
    if args.setup:
        pipeline('setup')
    if not args.skip_build:
        pipeline('all')
        if args.prefer != 'global':
            pipeline('stage', '--prefer', args.prefer)

    manifest = json.load(open(os.path.join(STAGED_DIR, 'manifest.json'), encoding='utf-8'))
    warned = [row['wap'] for row in manifest if row['warnings']]
    if warned:
        sys.exit(f'pools with ⚠ (see the pipeline\'s build logs), not copied: {" ".join(warned)}')
    missing = [row['wap'] for row in manifest if not row.get('card')]
    if missing:
        sys.exit(f'pools without a card, not copied: {" ".join(missing)}')

    files = wanted_files()
    added = changed = removed = 0
    for rel, src in sorted(files.items()):
        dst = os.path.join(OUT_DIR, *rel.split('/'))
        if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
            continue
        if os.path.exists(dst):
            changed += 1
        else:
            added += 1
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(src, dst)
    if os.path.isdir(OUT_DIR):
        for dirpath, _, names in os.walk(OUT_DIR):
            for name in names:
                rel = os.path.relpath(os.path.join(dirpath, name), OUT_DIR).replace(os.sep, '/')
                if rel not in files:
                    os.remove(os.path.join(dirpath, name))
                    removed += 1

    by_client = {}
    for row in manifest:
        by_client[row['client']] = by_client.get(row['client'], 0) + 1
    counts = ', '.join(f'{n} {c}' for c, n in sorted(by_client.items()))
    print(f'{len(manifest)} pools ({counts}) -> {OUT_DIR}: {added} added, {changed} changed, {removed} removed')


if __name__ == '__main__':
    main()
