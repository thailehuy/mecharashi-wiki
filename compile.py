#!/usr/bin/env python3
"""Compile pilots, mechs and glossary into their respective JS bundles."""

import json, glob, os, sys, subprocess

ROOT = os.path.dirname(os.path.abspath(__file__))

def run(label, script):
    print(f'  {label}...', end=' ', flush=True)
    result = subprocess.run([sys.executable, script], capture_output=True, text=True)
    if result.returncode != 0:
        print('FAILED')
        print(result.stderr)
        sys.exit(1)
    print('ok')

def compile_glossary():
    print('  glossary...', end=' ', flush=True)
    src  = os.path.join(ROOT, 'data', 'glossary.json')
    dest = os.path.join(ROOT, 'data', 'glossary.js')
    data = json.load(open(src, encoding='utf-8'))
    js   = 'window.GlossaryData = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
    open(dest, 'w', encoding='utf-8').write(js)
    print('ok')

if __name__ == '__main__':
    print('Compiling...')
    run('pilots', os.path.join(ROOT, 'data', 'pilots', 'compile.py'))
    run('mechs',  os.path.join(ROOT, 'data', 'mechs',  'compile.py'))
    compile_glossary()
    print('Done.')
