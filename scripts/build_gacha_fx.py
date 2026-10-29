#!/usr/bin/env python3
"""Build the animated recruitment banners (gacha FX) for every mech pool and every S-rank pilot pool, and copy them into
the assets repo's data/gachafx/:

    data/gachafx/<wap>.json                web FX data for one mech pool (particle systems + layers)
    data/gachafx/cards/<wap>.webp          its banner illustration, 2600x1080, drawn under the effects
    data/gachafx/manifest.json             one row per mech pool: wap, client (global/cn), pool key, prefab, counts
    data/gachafx/pilots/<id>.json          the same for a pilot pool, keyed by pilot id
    data/gachafx/pilots/cards/<id>.webp
    data/gachafx/pilots/manifest.json      one row per pilot pool: id, client, pool key, prefab, counts
    data/gachafx/fx/<texture>.png          every texture the mech JSONs reference (official asset names, shared)
    data/gachafx/pilots/fx/<texture>.png   the same for the pilots: kept apart, since a few official names stand for
                                           different files in the mech and the pilot bundles (T_UIFX_Cooperation_Flare2_SAC)
    data/gachafx/gacha-fx-engine.js        the WebGL2 player: startGachaFx(canvas, data, { background, texUrl, ... })

The work is done by the pipeline in data/screenshots/animation-sample/6_pipeline/ (git-ignored;
read its README.md first): it exports every mapped pool from the Global and CN clients, builds,
checks against its baseline, bundles the engine and stages out/ (pilots: pilots/out/). Global's
build is used when the Global client has the pool, CN's otherwise. Files in data/gachafx/ that the
new build no longer produces are removed.

Mech pools must all build without a warning, or nothing is copied. Pilot pools that build with a
warning (a feature the engine can't draw yet) are left out and listed; the clean ones are copied.

    python3 scripts/build_gacha_fx.py [--skip-build] [--setup] [--prefer cn]
    python3 scripts/build_gacha_fx.py --new-only

--new-only (what update_global.py and update_cn.py run) builds only the pools data/gachafx/ doesn't
have yet, plus the CN-built ones the Global client now has, and adds them without touching the
other pools or the engine; it does nothing when there are none, and skips quietly when the
pipeline folder isn't on this machine. A new mech's or pilot's pool needs its line in the
pipeline's scripts/lib/mechGachaCards.json or pilotGachaCards.json first: pool prefabs without one
are printed. --skip-build copies the last staged out/ without re-running the pipeline; --setup runs
the pipeline's one-off setup (npm install, Python check, bundle key) first. Needs Git Bash, Node and
UnityPy (see the pipeline's README).
"""
import argparse
import filecmp
import json
import os
import re
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')  # the ⚠ in messages (Windows consoles default to cp1252)
sys.stderr.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.environ.get('ASSETS_DIR', os.path.join(os.path.dirname(ROOT), 'mecharashi-wiki-assets'))
SAMPLE_DIR = os.path.join(ROOT, 'data', 'screenshots', 'animation-sample')
PIPELINE_DIR = os.path.join(SAMPLE_DIR, '6_pipeline')
ENGINE = os.path.join(SAMPLE_DIR, '5_demo', 'gacha-fx-engine.js')
OUT_DIR = os.path.join(ASSETS_DIR, 'data', 'gachafx')
# Same defaults and env vars as pipeline.sh.
BUNDLES = {
    'global': os.environ.get('GLOBAL_BUNDLES', 'C:/Games/Mecharashi/Client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
    'cn': os.environ.get('CN_BUNDLES', 'C:/PGLauncher/games/Mecharashi/client/Mecharashi_Data/StreamingAssets/ExportAssetBundle'),
}
LOCAL_LOW = os.path.join(os.path.expanduser('~'), 'AppData', 'LocalLow', 'Unity')
CACHES = {
    'global': os.environ.get('GLOBAL_CACHE', os.path.join(LOCAL_LOW, 'tentree_Mecharashi')),
    'cn': os.environ.get('CN_CACHE', os.path.join(LOCAL_LOW, 'Zlong_钢岚')),
}


class Kind:
    """What differs between the mech and the pilot pools."""

    def __init__(self, name, key, sub, staged, cards, prefab, skip, strict):
        self.name, self.key, self.sub, self.staged = name, key, sub, staged
        self.cards, self.prefab, self.skip, self.strict = cards, prefab, skip, strict
        self.flag = ['--pilot'] if name == 'pilot' else []

    def rel(self, path):
        """Published path of one of this kind's files (relative to OUT_DIR)."""
        return f'{self.sub}/{path}' if self.sub else path


KINDS = [
    # Pool prefabs that aren't a single mech (standard, selector and two-mech pools): no wap, never built.
    Kind('mech', 'wap', '', os.path.join(PIPELINE_DIR, 'out'), 'mechGachaCards.json', 'WapGacha{}PoolItemPrefab',
         {'Featured', 'GlaDre', 'Heavy', 'Light', 'MalAgl', 'Medium', 'Select', 'SelectSniper', 'SelectTactician',
          'Selected', 'Suit', 'XRArcus'}, strict=True),
    # Standard, preview, selector, exchange, two-pilot and result prefabs: no pilot id, never built.
    Kind('pilot', 'id', 'pilots', os.path.join(PIPELINE_DIR, 'pilots', 'out'), 'pilotGachaCards.json',
         'PilotGacha{}ItemPrefab',
         {'EileenSylvie', 'HonSyl', 'Permanent', 'PilotExchange', 'Predictive', 'Result', 'Select', 'SelectRosaNaomi',
          'SelectSniper', 'SelectTactician', 'Selected'}, strict=False),
]


def bash():
    """Git Bash on Windows (WSL's bash.exe in System32 would not see these paths), plain bash elsewhere."""
    for path in (os.environ.get('BASH'), r'C:\Program Files\Git\bin\bash.exe', shutil.which('bash')):
        if path and os.path.exists(path):
            return path
    sys.exit('bash not found (set BASH to Git Bash)')


def pipeline(kind, *args):
    subprocess.run([bash(), './pipeline.sh', *kind.flag, *args], cwd=PIPELINE_DIR, check=True)


def client_pools(kind, client):
    """The mapped pools (wap or pilot id -> pool key) the client's bundles have, and its pool keys without one."""
    if not os.path.exists(os.path.join(PIPELINE_DIR, 'settings.local.json')):
        subprocess.run([sys.executable, 'make-settings.py'], cwd=PIPELINE_DIR, check=True)
    pipeline(kind, 'sync')
    extra = []
    if kind.name == 'pilot':
        extra = ['--kind', 'pilot'] + (['--cache', CACHES[client]] if os.path.isdir(CACHES[client]) else [])
    r = subprocess.run([sys.executable, 'scripts/export-gacha-prefab.py', *extra, '--settings', 'settings.local.json',
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


def textures_of(kind, json_path):
    """The staged textures a pool's JSON names (any string value that is a file in out/fx)."""
    names = set()

    def walk(x):
        if isinstance(x, dict):
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
        elif isinstance(x, str) and os.path.exists(os.path.join(kind.staged, 'fx', x + '.png')):
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


def new_only(kind):
    """Build and add only the pools the assets repo doesn't have yet (or has from CN while Global now has them)."""
    label = f'gacha FX ({kind.name})'
    path = os.path.join(OUT_DIR, kind.rel('manifest.json'))
    have = {row[kind.key]: row for row in json.load(open(path, encoding='utf-8'))} if os.path.exists(path) else {}
    todo = {}  # wap / pilot id -> client to build it from
    for client in ('global', 'cn'):
        if not os.path.isdir(BUNDLES[client]):
            print(f'{label}: no {client} client at {BUNDLES[client]}, skipped')
            continue
        mapped, unmapped = client_pools(kind, client)
        for key in mapped:
            if key not in todo and (key not in have or (client == 'global' and have[key]['client'] == 'cn')):
                todo[key] = client
        for pool in unmapped:
            if pool not in kind.skip:
                print(f'{label}: {client} pool prefab {kind.prefab.format(pool)} has no {kind.key}: if it is a new '
                      f'{kind.name}, add it to {PIPELINE_DIR}/scripts/lib/{kind.cards}')
    if not todo:
        print(f'{label}: no new pools ({len(have)} in {os.path.dirname(path)})')
        return
    for client in ('global', 'cn'):
        keys = sorted(k for k, c in todo.items() if c == client)
        if keys:
            print(f'{label}: building {client} pools {" ".join(keys)}', flush=True)
            pipeline(kind, 'export', client, *keys)
            pipeline(kind, 'build', client, *keys)
    pipeline(kind, 'stage')

    staged = {row[kind.key]: row for row in json.load(open(os.path.join(kind.staged, 'manifest.json'), encoding='utf-8'))}
    bad = [k for k in sorted(todo) if k not in staged or staged[k]['client'] != todo[k]
           or staged[k]['warnings'] or not staged[k].get('card')]
    if bad and kind.strict:
        sys.exit(f"{label}: pools not built cleanly (missing, ⚠ or no card; see the pipeline's build logs), "
                 f"nothing copied: {' '.join(bad)}")
    if bad:
        print(f"{label}: left out, not built cleanly (⚠ or no card; see the pipeline's pilots/build logs): {' '.join(bad)}")
    good = [k for k in sorted(todo) if k not in bad]
    added = changed = 0
    for key in good:
        rels = {kind.rel(f'{key}.json'): os.path.join(kind.staged, 'gachaFx', f'{key}.json'),
                kind.rel(f'cards/{key}.webp'): os.path.join(kind.staged, 'cards', f'{key}.webp')}
        for t in textures_of(kind, rels[kind.rel(f'{key}.json')]):
            # a texture other pools already use keeps its published file (same name = same official asset)
            if not os.path.exists(os.path.join(OUT_DIR, *kind.rel(f'fx/{t}.png').split('/'))):
                rels[kind.rel(f'fx/{t}.png')] = os.path.join(kind.staged, 'fx', t + '.png')
        for rel, src in rels.items():
            state = copy(src, rel)
            added += state == 'added'
            changed += state == 'changed'
        have[key] = staged[key]
    if not good:
        return
    if not os.path.exists(os.path.join(OUT_DIR, 'gacha-fx-engine.js')):
        copy(ENGINE, 'gacha-fx-engine.js')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps([have[k] for k in sorted(have)], ensure_ascii=False, indent=1) + '\n')
    print(f"{label}: added/updated pools {' '.join(good)} -> {OUT_DIR}: {added} files added, {changed} changed")


def wanted_files(kind, keys, manifest_path):
    """Published path (relative to OUT_DIR) -> source file, for the given pools of one kind."""
    files = {kind.rel('manifest.json'): manifest_path}
    for key in keys:
        files[kind.rel(f'{key}.json')] = os.path.join(kind.staged, 'gachaFx', f'{key}.json')
        files[kind.rel(f'cards/{key}.webp')] = os.path.join(kind.staged, 'cards', f'{key}.webp')
        for t in textures_of(kind, files[kind.rel(f'{key}.json')]):
            files[kind.rel(f'fx/{t}.png')] = os.path.join(kind.staged, 'fx', t + '.png')
    return files


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--skip-build', action='store_true', help='copy the last staged out/ as is')
    ap.add_argument('--setup', action='store_true', help="run the pipeline's setup first")
    ap.add_argument('--prefer', choices=('global', 'cn'), default='global', help='client to take a pool from when both have it')
    ap.add_argument('--new-only', action='store_true', help="build only the pools the assets repo doesn't have yet")
    args = ap.parse_args()
    if args.new_only:
        if not os.path.isdir(PIPELINE_DIR):
            print(f'gacha FX: {PIPELINE_DIR} not on this machine, skipped')
            return
        for kind in KINDS:
            new_only(kind)
        return

    if not os.path.isdir(PIPELINE_DIR):
        sys.exit(f'{PIPELINE_DIR} not found: the gacha FX pipeline is git-ignored and lives only on the machine that set it up')
    if not os.path.isdir(ASSETS_DIR):
        sys.exit(f'assets repo not found at {ASSETS_DIR} (set ASSETS_DIR)')
    if args.setup:
        pipeline(KINDS[0], 'setup')
    for kind in KINDS:
        if not args.skip_build:
            pipeline(kind, 'all')
            if args.prefer != 'global':
                pipeline(kind, 'stage', '--prefer', args.prefer)

    files = {'gacha-fx-engine.js': ENGINE}
    summary = []
    for kind in KINDS:
        manifest = json.load(open(os.path.join(kind.staged, 'manifest.json'), encoding='utf-8'))
        bad = [row[kind.key] for row in manifest if row['warnings'] or not row.get('card')]
        if bad and kind.strict:
            sys.exit(f'{kind.name} pools with ⚠ or without a card (see the pipeline\'s build logs), nothing copied: '
                     f'{" ".join(bad)}')
        if bad:
            print(f'{kind.name} pools left out (⚠ or no card; see the pipeline\'s pilots/build logs): {" ".join(bad)}')
        manifest = [row for row in manifest if row[kind.key] not in bad]
        manifest_path = os.path.join(kind.staged, 'manifest.published.json')
        with open(manifest_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
        files.update(wanted_files(kind, [row[kind.key] for row in manifest], manifest_path))
        by_client = {}
        for row in manifest:
            by_client[row['client']] = by_client.get(row['client'], 0) + 1
        summary.append(f"{len(manifest)} {kind.name} pools ({', '.join(f'{n} {c}' for c, n in sorted(by_client.items()))})")

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
    print(f"{', '.join(summary)} -> {OUT_DIR}: {added} added, {changed} changed, {removed} removed")


if __name__ == '__main__':
    main()
