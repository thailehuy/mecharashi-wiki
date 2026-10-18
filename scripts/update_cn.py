#!/usr/bin/env python3
"""The pipeline to run after the CN client updates. Start the CN game once so
it downloads the update, close it, then from the repo root:

    python3 scripts/update_cn.py                  # every step
    python3 scripts/update_cn.py --version 3.8    # prefill "Game version introduced" on the new forms
    python3 scripts/update_cn.py --from intake    # start at a later step (earlier outputs must exist)

Steps
    mine      the CN client -> the CN master DB (data/screenshots/mined/cn: raw/, out/stats.db, mecharashi.db), with
              `MECHA_REGION=CN rebuild_all.py --extract`; stops when the CN tables are unchanged (--force goes on)
    banners   the banner list with the CN client's upcoming banners (build_banners.py), then their art from the CN
              bundles into the assets repo (MECHA_REGION=CN extract_banner_images.py)
    intake    translation intake forms in data/intake/ for the new pilots and STs (build_intake.py) and the new
              signature weapons and crafted backpacks (build_item_intake.py); existing forms are kept

Nothing here touches the global build (source/mecharashi.db, RebuildGameUpdate/out) or data/db/. Fill in the forms'
`EN:` lines and hand them to Claude to add the units; run scripts/update_global.py when the global client updates.
"""
import argparse
import glob
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, 'scripts')
FIELD_WIKI = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki')
CN_DB = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'cn', 'mecharashi.db')
INTAKE = os.path.join(ROOT, 'data', 'intake')
STEPS = ['mine', 'banners', 'intake']


def run(args, region='CN', cwd=ROOT):
    """Run a Python script (path + its arguments) for a region; stop the pipeline when it fails."""
    t = time.time()
    print(f'\n=== {os.path.basename(args[0])} {" ".join(args[1:])}'.rstrip() + f' ({region})', flush=True)
    env = {**os.environ, 'MECHA_REGION': region, 'PYTHONIOENCODING': 'utf8'}
    r = subprocess.run([sys.executable, *args], cwd=cwd, env=env)
    if r.returncode:
        sys.exit(f'\n{os.path.basename(args[0])} failed (exit {r.returncode}); later steps were not run.')
    print(f'--- done in {time.time() - t:.0f}s', flush=True)


def mtime(path):
    return os.path.getmtime(path) if os.path.exists(path) else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from', dest='start', choices=STEPS, default='mine', help='first step to run')
    ap.add_argument('--version', help='prefill "Game version introduced" on the new intake forms')
    ap.add_argument('--force', action='store_true', help='rebuild the CN DB even when the tables are unchanged')
    a = ap.parse_args()
    todo = STEPS[STEPS.index(a.start):]
    t0 = time.time()

    if 'mine' in todo:
        before = mtime(CN_DB)
        run([os.path.join('RebuildGameUpdate', 'rebuild_all.py'), '--extract'] + (['--force'] if a.force else []),
            cwd=FIELD_WIKI)
        if mtime(CN_DB) == before:
            print('\nThe CN master DB was not rebuilt (the tables are unchanged): stopping. '
                  '--force rebuilds it, --from banners reruns the rest.')
            return

    if 'banners' in todo:
        sys.path.insert(0, SCRIPTS)
        from build_banners import MAX_VERSION
        if a.version and tuple(int(x) for x in a.version.split('.')) > MAX_VERSION:
            print(f'\nNote: build_banners.py drops units after v{".".join(map(str, MAX_VERSION))} (MAX_VERSION); '
                  f'raise it to list v{a.version} banners.')
        run([os.path.join(SCRIPTS, 'build_banners.py')], region='GLOBAL')
        run([os.path.join(SCRIPTS, 'extract_banner_images.py')])

    if 'intake' in todo:
        started = time.time()
        version = ['--version', a.version] if a.version else []
        run([os.path.join(SCRIPTS, 'build_intake.py'), *version])
        run([os.path.join(SCRIPTS, 'build_item_intake.py'), *version])
        written = sorted(p for p in glob.glob(os.path.join(INTAKE, '*.md')) if mtime(p) >= started)
        print(f'\n{len(written)} new intake form(s)' + ''.join(f'\n  {os.path.relpath(p, ROOT)}' for p in written))

    print(f'\nCN update done in {time.time() - t0:.0f}s. Banner art is in the assets repo (commit it there); '
          'fill in the intake forms and hand them to Claude.')


if __name__ == '__main__':
    main()
