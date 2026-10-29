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
    python3 scripts/build_gacha_fx.py --new-only

--new-only (what update_global.py and update_cn.py run) builds only the pools data/gachafx/ doesn't
have yet, plus the CN-built ones the Global client now has, and adds them without touching the
other pools or the engine; it does nothing when there are none, and skips quietly when the
pipeline folder isn't on this machine. A new mech's pool needs its line in the pipeline's
scripts/lib/mechGachaCards.json first: pool prefabs without one are printed. --skip-build copies the last staged out/ without re-running the pipeline; --setup runs the
pipeline's one-off setup (npm install, Python check, bundle key) first. Needs Git Bash, Node and
UnityPy (see the pipeline's README). Stops without copying if any pool built with a warning.
"""
import argparse
import filecmp
import json
import os
import re
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
# Same defaults and env vars as pipeline.sh.
BUNDLES = {
    'global': os.environ.get('GLOBAL_BUNDLES', 'C:/Games/Mecharashi/Client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
    'cn': os.environ.get('CN_BUNDLES', 'C:/PGLauncher/games/Mecharashi/client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
}
# Pool prefabs that aren't a single mech (standard, selector and two-mech pools): no wap, never built.
NOT_A_MECH = {'Featured', 'GlaDre', 'Heavy', 'Light', 'MalAgl', 'Medium', 'Select', 'SelectSniper', 'SelectTactician',
              'Selected', 'Suit', 'XRArcus'}


def bash():
    """Git Bash on Windows (WSL's bash.exe in System32 would not see these paths), plain bash elsewhere."""
    for path in (os.environ.get('BASH'), r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')):
        if path and os.path.exists(path):
            return path
    sys.exit('bash not found (set BASH to Git Bash)')


def pipeline(*args):
    subprocess.run([bash(), './pipeline.sh', *args], cwd=PIPELINE_DIR, check=True)


def client_pools(client):
    """The mapped pools (wap -> pool key) the client's bundles have, and its pool keys without a wap."""
    if not os.path.exists(os.path.join(PIPELINE_DIR, 'settings.local.json')):
        subprocess.run([sys.executable, 'make-settings.py'], cwd=PIPELINE_DIR, check=True)
    pipeline('sync')
    r = subprocess.run([sys.executable, 'scripts/export-gacha-prefab.py', '--settings', 'settings.local.json',
                        '--bundles', BUNDLES[client], '--list'], cwd=PIPELINE_DIR, check=True,
                       capture_output=True, encoding='utf-8', env={**os.environ, 'PYTHONIOENCODING': 'utf8'})
    mapped, unmapped = {}, []
    for line in r.stdout.splitlines():
        m = re.match(r'\s+(\d+|—)\s+(\S+)\s*$', line)
        if m and m.group(1) == '—':
            unmapped.append(m.group(2))
        elif m:
            mapped[m.group(1)] = m.group(2)
    return mapped, unmapped


def textures_of(json_path):
    """The staged textures a pool's JSON names (any string value that is a file in out/fx)."""
    names = set()

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, str) and os.path.exists(os.path.join(STAGED_DIR, 'fx', x + '.png')):
            names.add(x)
    walk(json.load(open(json_path, encoding='utf-8')))
    return names


def copy(src, rel):
    """Copy src to OUT_DIR/rel; returns 'added', 'changed' or None (already identical)."""
    dst = os.path.join(OUT_DIR, *rel.split('/'))
    if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
        return None
    state = 'changed' if os.path.exists(dst) else 'added'
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
    return state


def new_only():
    """Build and add only the pools the assets repo doesn't have yet (or has from CN while Global now has them)."""
    if not os.path.isdir(PIPELINE_DIR):
        print(f'gacha FX: {PIPELINE_DIR} not on this machine, skipped')
        return
    path = os.path.join(OUT_DIR, 'manifest.json')
    have = {row['wap']: row for row in json.load(open(path, encoding='utf-8'))} if os.path.exists(path) else {}
    todo = {}  # wap -> client to build it from
    for client in ('global', 'cn'):
        if not os.path.isdir(BUNDLES[client]):
            print(f'gacha FX: no {client} client at {BUNDLES[client]}, skipped')
            continue
        mapped, unmapped = client_pools(client)
        for wap in mapped:
            if wap not in todo and (wap not in have or (client == 'global' and have[wap]['client'] == 'cn')):
                todo[wap] = client
        for key in unmapped:
            if key not in NOT_A_MECH:
                print(f'gacha FX: {client} pool prefab WapGacha{key}PoolItemPrefab has no wap: if it is a new mech, '
                      f'add it to {PIPELINE_DIR}/scripts/lib/mechGachaCards.json')
    if not todo:
        print(f'gacha FX: no new mech pools ({len(have)} in {OUT_DIR})')
        return
    for client in ('global', 'cn'):
        waps = sorted(w for w, c in todo.items() if c == client)
        if waps:
            print(f'gacha FX: building {client} pools {" ".join(waps)}', flush=True)
            pipeline('export', client, *waps)
            pipeline('build', client, *waps)
    pipeline('stage')

    staged = {row['wap']: row for row in json.load(open(os.path.join(STAGED_DIR, 'manifest.json'), encoding='utf-8'))}
    bad = [w for w in sorted(todo) if w not in staged or staged[w]['client'] != todo[w]
           or staged[w]['warnings'] or not staged[w].get('card')]
    if bad:
        sys.exit(f"gacha FX: pools not built cleanly (missing, ⚠ or no card; see the pipeline's build logs), "
                 f"nothing copied: {' '.join(bad)}")
    added = changed = 0
    for wap in sorted(todo):
        rels = {f'{wap}.json': os.path.join(STAGED_DIR, 'gachaFx', f'{wap}.json'),
                f'cards/{wap}.webp': os.path.join(STAGED_DIR, 'cards', f'{wap}.webp')}
        for t in textures_of(rels[f'{wap}.json']):
            # a texture other pools already use keeps its published file (same name = same official asset)
            if not os.path.exists(os.path.join(OUT_DIR, 'fx', t + '.png')):
                rels[f'fx/{t}.png'] = os.path.join(STAGED_DIR, 'fx', t + '.png')
        for rel, src in rels.items():
            state = copy(src, rel)
            added += state == 'added'
            changed += state == 'changed'
        have[wap] = staged[wap]
    if not os.path.exists(os.path.join(OUT_DIR, 'gacha-fx-engine.js')):
        copy(ENGINE, 'gacha-fx-engine.js')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps([have[w] for w in sorted(have)], ensure_ascii=False, indent=1) + '\n')
    print(f"gacha FX: added/updated pools {' '.join(sorted(todo))} -> {OUT_DIR}: {added} files added, {changed} changed")


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
    ap.add_argument('--new-only', action='store_true', help="build only the pools the assets repo doesn't have yet")
    args = ap.parse_args()
    if args.new_only:
        return new_only()

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
        state = copy(src, rel)
        added += state == 'added'
        changed += state == 'changed'
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
