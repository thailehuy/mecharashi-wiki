"""Split the mined Damage Bench (data/screenshots/mined/Damage_Bench.html) into
the files served at /dmgcalc/. Run: python3 data/dmgcalc/extract-bench.py

  dmgcalc/bench.css           the bench's <style> block
  dmgcalc/bench.js            the bench's script, reading its data from window.BenchData
  data/dmgcalc/bench-data.js  window.BenchData = the bench's embedded `const D = {...}`

dmgcalc/index.html (the markup, plus the link back to the wiki) is kept by hand;
the script warns if an element id the script looks up is missing from it."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(HERE, '..', 'screenshots', 'mined', 'Damage_Bench.html')
PAGE_DIR = os.path.join(ROOT, 'dmgcalc')
OUT_CSS = os.path.join(PAGE_DIR, 'bench.css')
OUT_JS = os.path.join(PAGE_DIR, 'bench.js')
OUT_DATA = os.path.join(HERE, 'bench-data.js')
PAGE = os.path.join(PAGE_DIR, 'index.html')

DATA_PREFIX = 'const D = '


def main():
    html = open(SRC, encoding='utf-8').read()

    css = re.search(r'<style>\n(.*?)</style>', html, re.S)
    script = re.search(r'<script>\n(.*?)</script>', html, re.S)
    if not css or not script:
        sys.exit('Damage_Bench.html: <style> or <script> block not found')

    lines = script.group(1).split('\n')
    data_line = next((i for i, l in enumerate(lines) if l.startswith(DATA_PREFIX)), None)
    if data_line is None:
        sys.exit('Damage_Bench.html: "%s{...}" line not found' % DATA_PREFIX)
    data = json.loads(lines[data_line][len(DATA_PREFIX):].rstrip().rstrip(';'))
    code = lines[:data_line] + ['const D = window.BenchData;'] + lines[data_line + 1:]

    os.makedirs(PAGE_DIR, exist_ok=True)
    with open(OUT_CSS, 'w', encoding='utf-8') as f:
        f.write(css.group(1))
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(code))
    with open(OUT_DATA, 'w', encoding='utf-8') as f:
        f.write('window.BenchData = ')
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')

    if os.path.exists(PAGE):
        page = open(PAGE, encoding='utf-8').read()
        ids = set(re.findall(r'\$\("([\w-]+)"\)', '\n'.join(code)))
        made_by_script = '\n'.join(code)
        missing = sorted(i for i in ids if 'id="%s"' % i not in page and 'id="%s"' % i not in made_by_script)
        if missing:
            print('warning: dmgcalc/index.html has no element with id: ' + ', '.join(missing))

    meta = data.get('meta', {})
    print('Damage Bench data: game build %s, built %s' % (meta.get('build'), meta.get('built')))


if __name__ == '__main__':
    main()
