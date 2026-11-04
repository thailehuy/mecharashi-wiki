#!/usr/bin/env python3
"""The Effects page's data (a Misc. page, with Buffs, Debuffs and Other effects
sub pages). Writes data/effects/effects.json and effects.js (EffectsData).

    python3 scripts/build_effects.py

Entries: every buff keyword in the glossary (data/glossary.json "buf"), plus
the buffs boss skills explain that the glossary lacks (data/bosses/bosses.json,
each skill's "buffs").

Kind: the buff's EffectType in the global client's ActorBufInfo
(RebuildGameUpdate/out/stats.db): Enhance and Cure are buffs, Weak debuffs;
otherwise (Unusual, Special, none) its Enhance or Weak category decides, and
the rest (or one not in the global client) is "other". A boss-only buff is looked up by its English name.

Carriers: every pilot, ST, weapon and backpack skill whose text tags the
keyword (<buf ID=...>), read from the compiled bundles (data/*/compiled.json):
pilot talents, skills (Neural Link nodes), Neural Drive partitions, summon and
form skills; ST modules (at the level the ST carries them); weapon passives;
backpack skills. Boss skills (Armed Conquest and Clearance Ops) name buffs
only as [Name], so they're matched by name, along with the buffs each skill
explains.

Effects sharing a name (the glossary has some under several buff IDs) are
merged into one, carriers combined. Their texts are compared as the mined EN
DB (MRT_FieldWiki/source/mecharashi.db, buffs.description) words them, else
as the glossary does: the text of the one most units carry is the effect's,
and any that differ are kept as its variants. EXCLUDE drops effects by name.
"""
import json
import os
import re
import sqlite3
import sys
from collections import Counter, OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'data', 'effects')
OUT = os.path.join(HERE, 'effects.json')
OUT_JS = os.path.join(HERE, 'effects.js')
FIELD_WIKI = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki')
STATS = os.path.join(FIELD_WIKI, 'RebuildGameUpdate', 'out', 'stats.db')
EN_DB = os.path.join(FIELD_WIKI, 'source', 'mecharashi.db')

# Left off the page, by name.
EXCLUDE = set()

KINDS = {'BufEffectType_Enhance': 'buff', 'BufEffectType_Cure': 'buff', 'BufEffectType_Weak': 'debuff'}
TAG = re.compile(r'<buf ID=(\d+)>')
ROMAN = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}


def load(*path):
    with open(os.path.join(ROOT, *path), encoding='utf-8') as f:
        return json.load(f)


def plain(s):
    return re.sub(r'<[^>]+>', '', s or '').strip()


def norm(name):
    return re.sub(r'\s+', ' ', plain(name)).rstrip('.').strip().lower()


def family(name):
    """Sort key grouping a buff's numbered versions: ("short circuit", 2) for "Short Circuit II"."""
    n = plain(name)
    m = re.match(r'^(.*?)[\s ]+([IVX]+|Ⅱ|Ⅲ|[αβγ]|\d+)$', n)
    if m:
        lv = m.group(2)
        lv = ROMAN.get(lv, {'Ⅱ': 2, 'Ⅲ': 3, 'α': 1, 'β': 2, 'γ': 3}.get(lv, int(lv) if lv.isdigit() else 0))
        return m.group(1).lower(), lv
    return n.lower(), 0


def kind_of(effect_type, categories):
    """buff / debuff / other: the EffectType, else (Unusual, Special, none) the Enhance/Weak category."""
    if effect_type in KINDS:
        return KINDS[effect_type]
    cats = categories or ''
    if 'BufCategory_Weak' in cats:
        return 'debuff'
    if 'BufCategory_Enhance' in cats:
        return 'buff'
    return 'other'


class Carriers:
    def __init__(self):
        self.by_buff = {}

    def add(self, bid, t, unit, source, skill, where=None):
        units = self.by_buff.setdefault(bid, OrderedDict())
        u = units.setdefault((t, unit), {'t': t, 'u': unit, 's': OrderedDict()})
        s = u['s'].setdefault((source, skill), {'k': source, 'n': skill})
        if where:
            w = s.setdefault('w', [])
            if where not in w:
                w.append(where)

    def scan(self, text, *args):
        for bid in set(TAG.findall(text or '')):
            self.add(bid, *args)

    def out(self, bid):
        return [dict(u, s=list(u['s'].values())) for u in self.by_buff.get(bid, {}).values()]


def skill_text(sk):
    return sk.get('SpecificEffects', '') if isinstance(sk, dict) else ''


def same_text(s):
    return re.sub(r'\s+', ' ', plain(s)).rstrip('. ').lower()


def merge(entries, en_text):
    """One effect per name: carriers combined, the most-carried version's text, the other texts as variants."""
    groups = OrderedDict()
    for e in entries:
        groups.setdefault(norm(e['name']), []).append(e)
    for group in groups.values():
        # Most carriers first; on a tie, one the EN DB has.
        group = sorted(group, key=lambda e: (-len(e['carriers']), e['id'] not in en_text))
        main = dict(group[0], ids=[e['id'] for e in group])
        main.pop('id')
        kinds = {e['kind'] for e in group} - {'other'}
        if len(kinds) == 1:
            main['kind'] = kinds.pop()
        units = OrderedDict()
        for e in group:
            for c in e['carriers']:
                u = units.setdefault((c['t'], c['u']), {'t': c['t'], 'u': c['u'], 's': []})
                u['s'] += [x for x in c['s'] if x not in u['s']]
        main['carriers'] = list(units.values())
        seen = {same_text(en_text.get(main['ids'][0]) or main['effect'])}
        for e in group[1:]:
            t = same_text(en_text.get(e['id']) or e['effect'])
            if t not in seen:
                seen.add(t)
                main.setdefault('variants', []).append(e['effect'])
        yield main


def main():
    glossary = load('data', 'glossary.json')['buf']
    bosses = load('data', 'bosses', 'bosses.json')
    car = Carriers()

    for p in load('data', 'pilots', 'compiled.json')['pilots']:
        name = p['PilotName']
        for key in ('Talent0_2Ability', 'Talent3_5Ability'):
            sk = p.get(key)
            if sk:
                car.scan(skill_text(sk), 'pilot', name, 'Talent', sk['name'])
        for n in p.get('biomimetic_computer_data', []):
            if n.get('skill'):
                car.scan(skill_text(n['skill']), 'pilot', name, 'Neural Link', n['skill']['name'])
        for part in p.get('NeuralDriveTemplate', {}).get('ListChipPartition', []):
            for e in part.get('ListActivationEffects', []):
                sk = e['PassiveSkill']
                car.scan(skill_text(sk), 'pilot', name, 'Neural Drive ' + part['name'], sk['name'])
        for sk in p.get('summonSkills') or []:
            car.scan(skill_text(sk), 'pilot', name, 'Summon skill', sk.get('name', ''))
        for g in p.get('formSkillGroups') or []:
            for form in g.get('forms', []):
                for sk in form.get('skills', []):
                    car.scan(skill_text(sk), 'pilot', name, 'Form skill', sk.get('name', ''))

    for m in load('data', 'mechs', 'compiled.json')['mechs']:
        for mod in m.get('modules', []):
            car.scan(skill_text(mod), 'st', m['name'], 'Module', mod['name'])

    for w in load('data', 'weapons', 'compiled.json')['weapons']:
        for sk in w.get('PassiveSkill', []):
            car.scan(skill_text(sk), 'weapon', w['name'], 'Weapon passive', sk['name'])

    for b in load('data', 'backpacks', 'compiled.json')['backpacks']:
        sk = b.get('skill')
        if sk:
            car.scan(skill_text(sk), 'backpack', b['name'], 'Backpack skill', sk['name'])

    # Entries: the glossary's, then the boss-only buffs.
    entries = OrderedDict()
    by_name = {}
    for bid, g in glossary.items():
        entries[bid] = {'id': bid, 'name': plain(g['name']), 'effect': g.get('effect', '')}
        by_name.setdefault(norm(g['name']), bid)

    boss_skills = []
    for mode, label, key in (('armed_conquest', 'AC', 'number'), ('clearance_ops', 'CO', 'chapter')):
        for s in bosses[mode]:
            for st in s['stages']:
                where = {'m': label, 'n': s[key], 'name': s['name'], 'slot': st['slot']}
                for sk in st.get('skills', []):
                    boss_skills.append((st['boss'], sk, where))
                    for b in sk.get('buffs', []):
                        k = norm(b['name'])
                        if k not in by_name:
                            bid = 'boss-' + re.sub(r'[^a-z0-9]+', '-', k).strip('-')
                            by_name[k] = bid
                            entries[bid] = {'id': bid, 'name': b['name'].rstrip('.').strip(), 'effect': b.get('description', ''),
                                            'boss': True}

    for boss, sk, where in boss_skills:
        # The [Names] in its text, and the buffs the stage explains under it.
        names = set(re.findall(r'\[([^\[\]]+)\]', sk.get('description', '')))
        names |= {b['name'] for b in sk.get('buffs', [])}
        for bid in {by_name.get(norm(n)) for n in names} - {None}:
            car.add(bid, 'boss', boss, 'Boss skill', sk['name'], where)

    # Kinds, from the game's own buff table.
    con = sqlite3.connect(STATS)
    rows = con.execute('SELECT ID, EffectType, Categories, NameDescStrKey_EN FROM ConfigDataActorBufInfo').fetchall()
    kind_by_id = {str(i): kind_of(t, c) for i, t, c, _ in rows}
    kinds_by_name = {}
    for _, t, c, n in rows:
        if n:
            kinds_by_name.setdefault(norm(n), Counter())[kind_of(t, c)] += 1

    for bid, e in entries.items():
        if e.get('boss'):
            c = kinds_by_name.get(norm(e['name']))
            e['kind'] = c.most_common(1)[0][0] if c else 'other'
        else:
            e['kind'] = kind_by_id.get(bid, 'other')
        e['carriers'] = car.out(bid)

    en = sqlite3.connect(EN_DB)
    en_text = {str(i): d for i, d in en.execute('SELECT buff_id, description FROM buffs')}

    out = []
    for e in merge(entries.values(), en_text):
        if norm(e['name']) in EXCLUDE:
            continue
        fam, lv = family(e['name'])
        e['fam'] = fam
        e['lv'] = lv
        out.append(e)

    out.sort(key=lambda e: (e['fam'], e['lv'], e['name'].lower()))
    # Keep only a family key on entries that share it with another one.
    fams = Counter(e['fam'] for e in out)
    for e in out:
        if fams[e['fam']] < 2:
            del e['fam']
        del e['lv']

    os.makedirs(HERE, exist_ok=True)
    data = {'effects': out}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('window.EffectsData = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')

    kinds = Counter(e['kind'] for e in out)
    print('%d effects (%d boss-only, %d merged from several IDs, %d with variants): %d buffs, %d debuffs, %d other; '
          '%d with no carrier' % (
              len(out), sum(1 for e in out if e.get('boss')), sum(1 for e in out if len(e['ids']) > 1),
              sum(1 for e in out if e.get('variants')), kinds['buff'], kinds['debuff'], kinds['other'],
              sum(1 for e in out if not e['carriers'])))


if __name__ == '__main__':
    sys.exit(main())
