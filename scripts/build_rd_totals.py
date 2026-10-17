"""Export R&D totals (max bonus of a fully researched tree) from the mined DB,
split into pilot / mech / weapon R&D. Also writes rd-totals.js for the site. Run: python3 scripts/build_rd_totals.py"""
import json
import os
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'rd')
DB = os.path.join(HERE, '..', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
OUT = os.path.join(HERE, 'rd-totals.json')
OUT_JS = os.path.join(HERE, 'rd-totals.js')   # same data for the R&D Bonus page

PILOT_CLASSES = {'Fighter', 'Guardian', 'Machinist', 'Raider', 'Sniper', 'Tactician'}


def category(applies_to):
    if applies_to in PILOT_CLASSES:
        return 'pilot'
    if applies_to.endswith(' ST'):
        return 'mech'
    if applies_to.endswith(' weapons'):
        return 'weapon'
    raise ValueError('Unknown R&D target: %s' % applies_to)


def main():
    con = sqlite3.connect(DB)
    out = {
        '_source': 'data/screenshots/MRT_FieldWiki/source/mecharashi.db table rd_totals',
        '_notes': [
            'total = sum of every R&D node stat for the target, i.e. a fully researched tree.',
            '*Add stats are flat, *Multi stats are fractions (0.2 = +20%).',
            'Pilot: atr = (Lv70 base + neurons + chips + R&D Add) x (1 + potential bonus + R&D Multi).',
        ],
        'pilot': {}, 'mech': {}, 'weapon': {},
    }
    rows = con.execute('select applies_to, stat, total, nodes from rd_totals order by applies_to, stat')
    for applies_to, stat, total, nodes in rows:
        bucket = out[category(applies_to)].setdefault(applies_to, {})
        bucket[stat] = {'total': float(total), 'nodes': int(nodes)}
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w') as f:
        f.write('window.RDTotalsData = ')
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write(';\n')
    print('Wrote %s (%s)' % (OUT, ', '.join('%s: %d' % (k, len(out[k])) for k in ('pilot', 'mech', 'weapon'))))


if __name__ == '__main__':
    main()
