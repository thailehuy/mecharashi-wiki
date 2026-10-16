#!/usr/bin/env python3
"""Add the Armed Conquest and Clearance Ops boss line-ups to bosses.json.

The `bosses` map (name, pilot link, images) is kept by hand. This script
rebuilds `armed_conquest` and `clearance_ops` from the DMG calc's targets
(data/dmgcalc/bench-data.js), adds each Armed Conquest boss's stage name and
skills from the mined DB (data/screenshots/mined/mecharashi.db) and what the
Armed Conquest guide adds (ac-guide.json: descriptions, bounties, skill cards,
minions, Extreme modifiers, clues), then writes bosses.json and bosses.js.
Mismatches between the guide and the DB are printed.
"""
import json
import os
import re
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BENCH = os.path.join(ROOT, 'data', 'dmgcalc', 'bench-data.js')
WEAPONS = os.path.join(ROOT, 'data', 'weapons', 'compiled.json')
DB = os.path.join(ROOT, 'data', 'screenshots', 'mined', 'mecharashi.db')
GUIDE = os.path.join(HERE, 'ac-guide.json')
OUT = os.path.join(HERE, 'bosses.json')
OUT_JS = os.path.join(HERE, 'bosses.js')

CO_FROM = 11  # first Clearance Ops chapter listed

AC_LABEL = re.compile(r'^(.*) · (.*) (\d+) · (.*)$')       # "Ride or Die · Hard 2 · Garcia"
CO_LABEL = re.compile(r'^(\d+)\. (.*) (\d+) · (.*)$')       # "17. Crossroads of Memory 1 · Jon"
# Armed Conquest seasons in release order (AC number = position). Not in the
# game data; kept by hand.
AC_SEASONS = [
    'Trapped Beast',
    'Thunder Rumbles',
    'Cross The Line',
    'Restless Soul',
    'Empty Promise',
    'Longest Night',
    'Lost in the Desert',
    'Wildfire',
    'The Savage Law',
    'Submerged Era',
    'The End of Destiny',
    'Ride or Die',
    'Survival Edge',
]
# Each season's version is its weapons' version, as on the weapons page.
# AC1 brought no weapons.
AC_VERSIONS = {1: '1.1'}
DIFFICULTIES = ['Normal', 'Hard', 'Extreme', 'Inferno']
# The DMG calc's labels for the last two difficulties -> their in-game names.
DIFFICULTY_NAMES = {'Hell': 'Extreme', 'Difficulty 4': 'Inferno'}


def load_targets():
    with open(BENCH, encoding='utf-8') as f:
        text = f.read()
    text = text[text.index('=') + 1:].strip().rstrip(';')
    return json.loads(text)['targets']


def ac_versions():
    """AC number -> version of its newest weapon (what the weapons page shows)."""
    with open(WEAPONS, encoding='utf-8') as f:
        weapons = json.load(f)['weapons']
    versions = dict(AC_VERSIONS)
    for w in weapons:
        if w.get('ac') and w.get('version') and w.get('quality') == 'SSSR':
            v = versions.get(w['ac'])
            if v is None or float(w['version']) > float(v):
                versions[w['ac']] = w['version']
    return versions


def part_hp(t):
    # Both arms always have the same HP.
    hp = t['hp']
    return {'body': round(hp['Body']), 'arm': round(hp['Left arm']), 'legs': round(hp['Legs'])}


def mech_class(t):
    # Boss-only mechs (Hades, Leviathan, Holmberg, Tonatiuh) have no class in
    # the game data; the game calls them Titans.
    return t['cls'] or 'Titan'


SKILL = re.compile(r'(\d+) (.*)')                         # "8820601 Massive Gunfire"


def ac_skills(bosses):
    """(season, stage) -> (boss, stage name, skills), from the DB's bosses table.

    Each skill: name, kind ('active' or 'passive'), description (passives in
    enemy_skills only; active skills have none in the DB) and, when the skill
    isn't on every difficulty, the difficulties it's on (e.g. a β passive on
    Extreme and Inferno).
    """
    con = sqlite3.connect(DB)
    described = dict(con.execute("SELECT skill_id, description FROM enemy_skills WHERE description != ''"))
    rows = con.execute('SELECT "group", stage, difficulty, boss_pilot, stage_name, main_skills, passives FROM bosses '
                       "WHERE content = 'Armed Conquest' ORDER BY rowid").fetchall()
    con.close()
    out = {}
    for season, stage, diff, boss, title, main, passives in rows:
        diff = DIFFICULTY_NAMES.get(diff, diff)
        st = out.setdefault((season, int(stage)), {'boss': canonical(boss, bosses), 'title': title, 'diffs': [], 'skills': {}})
        st['diffs'].append(diff)
        for kind, text in (('active', main), ('passive', passives)):
            for part in filter(None, (text or '').split('; ')):
                sid, name = SKILL.match(part).groups()
                sk = st['skills'].setdefault(sid, {'name': name, 'kind': kind, 'diffs': []})
                sk['diffs'].append(diff)
                desc = described.get(int(sid))
                if desc:
                    sk['description'] = desc.strip()
    result = {}
    for key, st in out.items():
        skills = []
        for sk in st['skills'].values():
            on = sk.pop('diffs')
            diffs = [d for d in DIFFICULTIES if d in on]
            if len(diffs) < len(st['diffs']):
                sk['difficulties'] = diffs
            skills.append(sk)
        # Active skills first, each kind in the game's order.
        skills.sort(key=lambda sk: sk['kind'] != 'active')
        result[key] = (st['boss'], st['title'], skills)
    return result


# The guide's card types -> the DB's skill kinds.
GUIDE_KIND = {'Active': 'active', 'Code': 'active', 'Passive': 'passive', 'Talent': 'passive'}
NUM = re.compile(r'\d+(?:\.\d+)?')


def guide_cards(cards):
    """The guide's cards for one unit -> its skills, each with the buff (and
    terrain) cards shown under it attached as `buffs`."""
    skills = []
    for c in cards:
        f = c.get('fields', {})
        if c['card'] in ('skill', 'weapon'):
            sk = {'name': c['name'], 'type': f.get('Type') or f.get('Source') or ('Weapon' if c['card'] == 'weapon' else None),
                  'icon': c.get('icon')}
            for key, field in (('cost', 'Cost'), ('cd', 'CD'), ('weapon', 'Wpn')):
                if f.get(field, '-') != '-':
                    sk[key] = f[field]
            sk['description'] = c.get('description', '')
            skills.append({k: v for k, v in sk.items() if v})
        else:
            buff = {'name': c['name'], 'description': c.get('description', '')}
            if c.get('tags'):
                buff['tags'] = c['tags']
            if skills:
                skills[-1].setdefault('buffs', []).append(buff)
            else:
                skills.append(dict(buff, type='Other'))
    return skills


def add_guide(s, st, entry, warn):
    """Merge the guide's entry for a stage into it: the guide's skill cards
    replace the DB's (empty or buff-less) descriptions; skills the DB doesn't
    list are added, and DB skills the guide lacks are kept."""
    where = 'AC%d %s' % (s['number'], st['boss'])
    if entry['title'].replace('’', "'").lower() != st['title'].lower():
        warn('%s: guide calls the stage "%s", DB "%s"' % (where, entry['title'], st['title']))
    st['description'] = entry['description']
    if entry.get('bounties'):
        # The guide calls the fourth difficulty Purgatory.
        st['bounties'] = [dict(b, conditions={('Inferno' if d == 'Purgatory' else d): c for d, c in b['conditions'].items()})
                          for b in entry['bounties']]
    if 'skills' not in entry:
        return
    own = guide_cards([c for c in entry['skills'] if not c.get('unit')])
    db = st['skills']
    merged = []
    for g in own:
        same = [sk for sk in db if sk['name'].lower() == g['name'].lower()]
        if not same:
            if g['type'] != 'Other':
                warn('%s: "%s" (%s) is in the guide but not the DB' % (where, g['name'], g['type']))
            merged.append(dict(g, kind=GUIDE_KIND.get(g['type'], 'passive')))
            continue
        # A DB skill listed twice (one per difficulty set) takes the guide card
        # on the copy whose numbers match it; the other keeps the DB text.
        nums = NUM.findall(g['description'])
        match = next((sk for sk in same if NUM.findall(sk.get('description', '')) == nums), same[0])
        if match.get('description') and NUM.findall(match['description']) != nums:
            # The DB is the game data: keep its text, take the rest from the card.
            warn('%s: "%s" numbers differ: guide %s, DB %s (DB text kept)' % (where, g['name'], nums, NUM.findall(match['description'])))
            g = dict(g, description=match['description'])
        for sk in same:
            if sk is match:
                g = dict(g, kind=sk['kind'])
                if 'difficulties' in sk:
                    g['difficulties'] = sk['difficulties']
                merged.append(g)
            else:
                merged.append(sk)
            db.remove(sk)
    for sk in db:
        warn('%s: "%s" is in the DB but not the guide' % (where, sk['name']))
    st['skills'] = merged + db
    units = {}
    for c in entry['skills']:
        if c.get('unit'):
            units.setdefault(c['unit'], []).append(c)
    if units:
        st['units'] = [{'name': name, 'skills': guide_cards(cards)} for name, cards in units.items()]
    if entry.get('extreme_modifiers'):
        st['extreme_modifiers'] = entry['extreme_modifiers']
    if entry.get('clues'):
        st['clues'] = entry['clues']


def add_icons(seasons):
    """Skills without a guide card (later seasons, DB-only skills) take the
    icon of a guide card with the same name: the same boss's first, else any
    boss's when all such cards agree."""
    by_boss, by_name = {}, {}
    def skills(st):
        for sk in st['skills']:
            yield sk
        for u in st.get('units', []):
            for sk in u['skills']:
                yield sk
    for s in seasons:
        for st in s['stages']:
            for sk in skills(st):
                if sk.get('icon'):
                    by_boss.setdefault((st['boss'], sk['name']), sk['icon'])
                    by_name.setdefault(sk['name'], set()).add(sk['icon'])
    for s in seasons:
        for st in s['stages']:
            for sk in st['skills']:
                if 'icon' not in sk:
                    icons = by_name.get(sk['name'], set())
                    icon = by_boss.get((st['boss'], sk['name'])) or (next(iter(icons)) if len(icons) == 1 else None)
                    if icon:
                        sk['icon'] = icon


def canonical(name, bosses):
    for b in bosses.values():
        if name == b['name'] or name in b.get('aliases', []):
            return b['name']
    raise ValueError('Boss not in bosses.json: %s' % name)


def main():
    with open(OUT, encoding='utf-8') as f:
        data = json.load(f)
    bosses = data['bosses']

    ac, co = {}, {}
    for t in load_targets():
        if t['content'] == 'Armed Conquest':
            m = AC_LABEL.match(t['label'])
            season, diff, slot, boss = m.group(1), m.group(2), int(m.group(3)), m.group(4)
            s = ac.setdefault(season, {'number': None, 'name': season, 'version': None, 'stages': {}})
            # The boss and its mech are the same on every difficulty of a stage.
            st = s['stages'].setdefault(slot, {'slot': slot, 'boss': canonical(boss, bosses), 'mech': t['mech'], 'cls': mech_class(t), 'difficulties': [], 'hp': {}})
            diff = DIFFICULTY_NAMES.get(diff, diff)
            st['difficulties'].append(diff)
            st['hp'][diff] = part_hp(t)
        elif t['content'] == 'Clearance Ops':
            m = CO_LABEL.match(t['label'])
            chapter, name, slot, boss = int(m.group(1)), m.group(2), int(m.group(3)), m.group(4)
            if chapter < CO_FROM:
                continue
            c = co.setdefault(chapter, {'chapter': chapter, 'name': name, 'battle': t['battle'], 'stages': {}})
            c['stages'].setdefault(slot, {'slot': slot, 'boss': canonical(boss, bosses), 'mech': t['mech'], 'cls': mech_class(t), 'hp': part_hp(t)})

    skills = ac_skills(bosses)
    for s in ac.values():
        for st in s['stages'].values():
            boss, st['title'], st['skills'] = skills[(s['name'], st['slot'])]
            if boss != st['boss']:
                raise ValueError('%s stage %d: DMG calc has %s, DB has %s' % (s['name'], st['slot'], st['boss'], boss))

    versions = ac_versions()
    missing = [name for name in ac if name not in AC_SEASONS]
    if missing:
        raise ValueError('Add these Armed Conquest seasons to AC_SEASONS: %s' % ', '.join(missing))
    for s in ac.values():
        s['number'] = AC_SEASONS.index(s['name']) + 1
        s['version'] = versions.get(s['number'])
        stages = []
        for slot in sorted(s['stages']):
            st = s['stages'][slot]
            st['difficulties'] = [d for d in DIFFICULTIES if d in st['difficulties']]
            st['hp'] = {d: st['hp'][d] for d in st['difficulties']}
            stages.append(st)
        s['stages'] = stages
    for c in co.values():
        c['stages'] = [c['stages'][k] for k in sorted(c['stages'])]

    with open(GUIDE, encoding='utf-8') as f:
        guide = {(e['ac'], e['boss']): e for e in json.load(f)['bosses']}
    warnings = []
    for s in ac.values():
        for st in s['stages']:
            entry = guide.pop((s['number'], st['boss']), None)
            if entry:
                add_guide(s, st, entry, warnings.append)
    for ac_no, boss in guide:
        warnings.append('AC%d %s: in the guide but not in any season' % (ac_no, boss))
    add_icons(ac.values())
    for w in warnings:
        print('guide:', w)

    # Newest first: AC by season number, CO by chapter number.
    data['armed_conquest'] = sorted(ac.values(), key=lambda s: -s['number'])
    data['clearance_ops'] = sorted(co.values(), key=lambda c: -c['chapter'])

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    with open(OUT_JS, 'w', encoding='utf-8') as f:
        f.write('window.BossesData = ')
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write(';\n')
    print('Wrote %s (%d bosses, %d AC seasons, %d CO chapters)' % (OUT, len(bosses), len(ac), len(co)))


if __name__ == '__main__':
    main()
