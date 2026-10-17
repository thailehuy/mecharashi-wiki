"""Split the mined Damage Bench
(data/screenshots/MRT_FieldWiki/working/drafts/Damage_Bench.html) into
the files served at /dmgcalc/. Run: python3 data/dmgcalc/extract-bench.py

  dmgcalc/bench.css           the bench's <style> block
  dmgcalc/bench.js            the bench's script, reading its data from window.BenchData
  data/dmgcalc/bench-data.js  window.BenchData = the bench's embedded `const D = {...}`

dmgcalc/index.html (the markup, plus the link back to the wiki) is kept by hand;
the script warns if an element id the script looks up is missing from it.

bench.js and bench.css now carry hand edits (Calculate button, rarity filters):
use --data-only to rewrite bench-data.js alone.

The data is pruned to what the bench can still use: SSR STs, SSR / SSSR weapons
(game ID tier 4+, plus the STs' built-in arms), SSR accessories, SR+ backpacks,
and the effects / buff categories / aliases those still reach."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
SRC = os.path.join(HERE, '..', 'screenshots', 'MRT_FieldWiki', 'working', 'drafts', 'Damage_Bench.html')
PAGE_DIR = os.path.join(ROOT, 'dmgcalc')
OUT_CSS = os.path.join(PAGE_DIR, 'bench.css')
OUT_JS = os.path.join(PAGE_DIR, 'bench.js')
OUT_DATA = os.path.join(HERE, 'bench-data.js')
PAGE = os.path.join(PAGE_DIR, 'index.html')
MECHS = os.path.join(HERE, '..', 'db', 'mechs.json')
ACCESSORIES = os.path.join(HERE, '..', 'accessories', 'compiled.json')

DATA_PREFIX = 'const D = '
# The bench's names for the last two Armed Conquest difficulties -> their in-game names.
DIFFICULTY_NAMES = {'Hell': 'Extreme', 'Difficulty 4': 'Inferno'}


RARITY = ['C', 'R', 'SR', 'SSR', 'SSSR']


def weapon_tier(k):
    return int(k[4]) if len(k) == 8 else 0


def prune(data):
    """Drop what the bench's pickers no longer offer, then every effect, buff
    category and alias nothing kept refers to (references are found by scanning
    the kept data for the keys, so nothing reached by key is lost)."""
    data['sts'] = {k: v for k, v in data['sts'].items() if v.get('q') == 'SSR'}
    fixed = {str(w) for st in data['sts'].values() for p in st['parts'].values()
             for w in (p.get('fixed') or {}).values()}
    data['weapons'] = {k: v for k, v in data['weapons'].items() if weapon_tier(k) >= 4 or k in fixed}
    data['components'] = {k: v for k, v in data['components'].items() if v.get('q') == 'SSR'}
    data['backs'] = {k: v for k, v in data['backs'].items() if RARITY.index(v['q']) >= RARITY.index('SR')}
    data['alias'] = {k: v for k, v in data['alias'].items() if v in data['weapons']}
    types = {w['type'] for w in data['weapons'].values()}
    data['adv'] = {k: v for k, v in data['adv'].items() if k in types}
    data.pop('catShown', None)                       # never read by bench.js
    for M in data['modules'].values():              # placeholder items in the module picker
        M['items'] = [it for it in M['items'] if it['n'] != 'TEST']
    data['modules'].pop('3021', None)                # Matrix Mod: defensive only, no effects in the bench

    rest = tokens({k: v for k, v in data.items() if k not in ('fx', 'bcat')})
    data['fx'] = {k: v for k, v in data['fx'].items() if k in rest}
    # fields bench.js never reads, and empty (null) effect fields it only tests for truthiness
    for t in data['targets']:
        for b in t.get('bfx') or []:
            b.pop('mine', None)
            b.pop('tag', None)
        for w in t.get('ctr') or []:
            w.pop('n', None)
            w.pop('part', None)
    data['fx'] = {k: [drop_nulls(e) for e in v] for k, v in data['fx'].items()}
    used = rest | tokens(data['fx'])
    data['bcat'] = {k: v for k, v in data['bcat'].items() if k in used}


def rename_components(data):
    """The bench names accessories "TA - Invasion", "TA W - Invasion" or "TA-W - Invasion";
    use the wiki's name instead ("Invasion", "Invasion W"), matched on the name and W flag."""
    with open(ACCESSORIES, encoding='utf-8') as f:
        wiki = {(a['statetype'].endswith('_W'), a['en_name'].lower()): a['en_name']
                for a in json.load(f)['accessories']}
    for C in data['components'].values():
        n = re.sub(r'^(TA|RA)([ -]W)? - ', '', C['n'])
        n = wiki.get((C['w'], n.lower()), n)
        C['n'] = n + ' W' if C['w'] else n


def drop_nulls(x):
    if isinstance(x, dict):
        return {k: drop_nulls(v) for k, v in x.items() if v is not None}
    if isinstance(x, list):
        return [drop_nulls(v) for v in x]
    return x


def tokens(x, out=None):
    """every string, number (as text) and dict key inside x"""
    out = set() if out is None else out
    if isinstance(x, dict):
        for k, v in x.items():
            out.add(str(k))
            tokens(v, out)
    elif isinstance(x, list):
        for v in x:
            tokens(v, out)
    elif isinstance(x, (str, int)) and not isinstance(x, bool):
        out.add(str(x))
    return out


def dedent(text):
    """Remove the indent every non-blank line shares (the bench indents its
    <style> and <script> blocks)."""
    lines = text.split('\n')
    n = min((len(l) - len(l.lstrip(' ')) for l in lines if l.strip()), default=0)
    return '\n'.join(l[n:] for l in lines)


def main():
    html = open(SRC, encoding='utf-8').read()

    css = re.search(r'<style>\n(.*?)</style>', html, re.S)
    script = re.search(r'<script>\n(.*?)</script>', html, re.S)
    if not css or not script:
        sys.exit('Damage_Bench.html: <style> or <script> block not found')

    lines = dedent(script.group(1)).split('\n')
    data_line = next((i for i, l in enumerate(lines) if l.startswith(DATA_PREFIX)), None)
    if data_line is None:
        sys.exit('Damage_Bench.html: "%s{...}" line not found' % DATA_PREFIX)
    data = json.loads(lines[data_line][len(DATA_PREFIX):].rstrip().rstrip(';'))
    # ST rarity (q: SR / SSR) from the wiki's mech DB, keyed by the ST's body part id
    with open(MECHS, encoding='utf-8') as f:
        mechs = json.load(f)
    for st in data['sts'].values():
        m = mechs.get(str(st['parts']['Body']['id']))
        if m and m.get('quality'):
            st['q'] = m['quality']
    prune(data)
    rename_components(data)
    for t in data['targets']:
        for old, new in DIFFICULTY_NAMES.items():
            t['label'] = t['label'].replace(f' · {old} ', f' · {new} ')
    code = lines[:data_line] + ['const D = window.BenchData;'] + lines[data_line + 1:]

    os.makedirs(PAGE_DIR, exist_ok=True)
    if '--data-only' not in sys.argv:
        with open(OUT_CSS, 'w', encoding='utf-8') as f:
            f.write(dedent(css.group(1)))
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
