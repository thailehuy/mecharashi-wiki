#!/usr/bin/env python3
"""The pipeline to run after the global (EN) client updates. Start the game
once so it downloads the update, close it, then from the repo root:

    python3 scripts/update_global.py                  # every step, taking in every version the client has past GLOBAL_VERSION
    python3 scripts/update_global.py --version 2.6    # take in this version's official text
    python3 scripts/update_global.py --check          # also run the update chain's audits (new game functions, bench, coverage)
    python3 scripts/update_global.py --from data      # start at a later step (earlier outputs must exist)

Steps
    mine          the global client -> the master DB (MRT_FieldWiki/source/mecharashi.db, RebuildGameUpdate/out/stats.db)
                  and the Damage Bench draft, with `rebuild_all.py --extract`; stops when the tables are unchanged
                  (--force goes on)
    translations  the official English text of the version's pilots, STs, weapons and backpacks (and their skills,
                  modules and glossary terms) in place of the wiki's translations from the CN client
                  (take_translations.py); a renamed pilot/ST is renamed in its weapons and the pages' release order
    crafting      the Workshop recipes of everything now on Global -> data/db/ weapons, backpacks, materials
                  (build_crafting.py), then compile.py
    data          everything the wiki derives from the mined data: the DMG calc's bench data and icons (incl. the
                  Armed Conquest line-ups), accessory chain traits, R&D features and totals, the Armed Conquest and
                  Clearance Ops boss pages with their skills and drops (build_bosses.py), the banner list, then the
                  version global is on (set_global_version.py: the newest whose banners have opened; it prints that
                  version's banner timeline, sets GLOBAL_VERSION, which drops the CN-text warning from its pilots' and
                  STs' pages, starts the Dispatch Calculator's schedule at it and checks the dispatch pool), the pilot and ST
                  lore (build_lore.py), the Story page's world settings and chapters (build_story.py), the Events
                  page (build_events.py), and the Elite Battle, Simulated Battle, Covert Phantom and Memory Storm
                  pages (build_elite.py, build_sim.py, build_covert.py, build_storm.py).
                  A new Armed Conquest season stops build_bosses.py until its name is added to AC_SEASONS there
                  (release order); then rerun with --from data
    images        new drop/material/story/Elite, Simulated Battle, Covert Phantom, Memory Storm and event reward item icons, Border
                  Conflict foe portraits, banner art, event pictures, the Story page's stage pictures and the Elite Battle
                  chapters' pictures from the game's
                  bundles into the assets repo (extract_item_icons.py, extract_banner_images.py, extract_event_images.py,
                  extract_story_images.py); pilot voice lines from its sound banks into the
                  voices repo (extract_voices.py), then the Voice Lines tab's data (build_voice.py)
    compile       data/db/ -> the page bundles and builder index maps (compile.py)

Review `git diff` (and the assets and voices repos') before committing. The CN client has its own pipeline, scripts/update_cn.py.
"""
import argparse
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = os.path.join(ROOT, 'scripts')
FIELD_WIKI = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki')
MAIN_DB = os.path.join(FIELD_WIKI, 'source', 'mecharashi.db')
STEPS = ['mine', 'translations', 'crafting', 'data', 'images', 'compile']
# In order, after compile.py: build-icons.py, build_features.py and build_bosses.py read the compiled bundles.
DATA = [['extract-bench.py', '--data-only'], ['build-icons.py'], ['extract-chain-traits.py'], ['build_features.py'],
        ['build_rd_totals.py'], ['build_bosses.py'], ['build_banners.py'], ['set_global_version.py'], ['build_lore.py'],
        ['build_story.py'], ['build_events.py'], ['build_elite.py'], ['build_sim.py'], ['build_covert.py'], ['build_storm.py']]


def run(args, cwd=ROOT):
    """Run a Python script (path + its arguments) for the global client; stop the pipeline when it fails."""
    t = time.time()
    print(f'\n=== {os.path.basename(args[0])} {" ".join(args[1:])}'.rstrip(), flush=True)
    env = {**os.environ, 'MECHA_REGION': 'GLOBAL', 'PYTHONIOENCODING': 'utf8'}
    r = subprocess.run([sys.executable, *args], cwd=cwd, env=env)
    if r.returncode:
        sys.exit(f'\n{os.path.basename(args[0])} failed (exit {r.returncode}); later steps were not run.')
    print(f'--- done in {time.time() - t:.0f}s', flush=True)


def script(name, *args):
    return [os.path.join(SCRIPTS, name), *args]


def mtime(path):
    return os.path.getmtime(path) if os.path.exists(path) else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--from', dest='start', choices=STEPS, default='mine', help='first step to run')
    ap.add_argument('--version', action='append', help='the version whose official text to take in (repeatable; '
                                                       'default: every one the client has past GLOBAL_VERSION)')
    ap.add_argument('--check', action='store_true', help="run the update chain's audits after mining")
    ap.add_argument('--force', action='store_true', help='rebuild the master DB even when the tables are unchanged')
    a = ap.parse_args()
    todo = STEPS[STEPS.index(a.start):]
    t0 = time.time()

    if 'mine' in todo:
        before = mtime(MAIN_DB)
        run([os.path.join('RebuildGameUpdate', 'rebuild_all.py'), '--extract']
            + (['--check'] if a.check else []) + (['--force'] if a.force else []), cwd=FIELD_WIKI)
        if mtime(MAIN_DB) == before:
            print('\nThe master DB was not rebuilt (the tables are unchanged): stopping. '
                  '--force rebuilds it, --from translations reruns the rest.')
            return

    if 'translations' in todo:
        run(script('take_translations.py', *[x for v in a.version or [] for x in ('--version', v)]))
    if 'crafting' in todo:
        run(script('build_crafting.py'))
        run(script('compile.py'))
    if 'data' in todo:
        for args in DATA:
            run(script(*args))
    if 'images' in todo:
        run(script('extract_item_icons.py'))
        run(script('extract_banner_images.py'))
        run(script('extract_event_images.py'))
        run(script('extract_story_images.py'))
        run(script('extract_voices.py'))
        run(script('build_voice.py'))
    if 'compile' in todo:
        run(script('compile.py'))

    print(f'\nGlobal update done in {time.time() - t0:.0f}s. Review the changes here (git diff) and in the assets '
          'repo before committing.')


if __name__ == '__main__':
    main()
