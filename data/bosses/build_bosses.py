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
GLOSSARY = os.path.join(ROOT, 'data', 'glossary.json')
PILOTS = os.path.join(ROOT, 'data', 'pilots', 'compiled.json')
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
    Extreme and Inferno). Passives also get their effects from enemy_buffs:
    see passive_effects(). Also returns the stage's skill IDs (for
    explain_terms()).
    """
    con = sqlite3.connect(DB)
    described = dict(con.execute("SELECT skill_id, description FROM enemy_skills WHERE description != ''"))
    effects = passive_effects(con)
    linked = linked_buffs(con)
    rows = con.execute('SELECT "group", stage, difficulty, boss_pilot, stage_name, main_skills, passives FROM bosses '
                       "WHERE content = 'Armed Conquest' ORDER BY rowid").fetchall()
    con.close()
    out = {}
    for season, stage, diff, boss, title, main, passives in rows:
        diff = DIFFICULTY_NAMES.get(diff, diff)
        st = out.setdefault((season, int(stage)), {'boss': canonical(boss, bosses), 'title': title, 'diffs': [], 'skills': {}, 'ids': set()})
        st['diffs'].append(diff)
        for kind, text in (('active', main), ('passive', passives)):
            for part in filter(None, (text or '').split('; ')):
                sid, name = SKILL.match(part).groups()
                st['ids'].add(int(sid))
                sk = st['skills'].setdefault(sid, {'name': name, 'kind': kind, 'diffs': []})
                sk['diffs'].append(diff)
                desc = described.get(int(sid))
                if desc and 'effects' not in sk:   # once: the gaps get filled below
                    sk['description'] = desc.strip()
                if kind == 'passive' and 'effects' not in sk:
                    text, buffs = effects_for(effects.get(int(sid), []), boss)
                    if text and not sk.get('description'):
                        sk['description'] = text
                        sk['composed'] = True   # a guide card replaces it (add_guide)
                    shown = linked(int(sid))
                    if sk.get('description'):
                        sk['description'] = fill_holes(sk['description'], int(sid), shown)
                    for b in shown:
                        if b['description'] and b['name'] not in [x['name'] for x in buffs]:
                            buffs.append({'name': b['name'], 'description': b['description']})
                    if buffs:
                        sk['buffs'] = buffs
                    sk['effects'] = True
    for st in out.values():
        for sk in st['skills'].values():
            sk.pop('effects', None)
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
        result[key] = (st['boss'], st['title'], skills, st['ids'])
    return result



def passive_effects(con):
    """Passive skill ID -> its Armed Conquest buff rows in enemy_buffs
    (source_ids lists "PassiveSkill <ID>"): (name, kind, units, description)."""
    out = {}
    rows = con.execute("SELECT name, kind, units, description, source_ids FROM enemy_buffs "
                       "WHERE content LIKE '%Armed Conquest%' ORDER BY rowid")
    for name, kind, units, desc, sources in rows:
        for sid in re.findall(r'PassiveSkill (\d+)', sources or ''):
            out.setdefault(int(sid), []).append((name, kind, set((units or '').split(', ')), (desc or '').strip()))
    return out



# Buff categories of helper buffs; buffs in any other category are the ones
# the game shows by name (Cold Seal is "Spark", Acid II "ShortCircuit").
HELPER_CATEGORIES = {None, '', 'None', 'PilotSetupPassiveSkill', 'EquipmentPassiveSkill'}
# Where enemy_skills dropped a buff name from a description it left a gap:
# "gains . At end of action, grants  to an ally."
HOLE = re.compile(r'(?<=\S) (?=[ .,;:)\n]|$)')


def linked_buffs(con):
    """Passive skill ID -> the shown buffs it links to ({id, name,
    description}), lowest ID first: buffs in its skill_effects chains,
    link_skill_buff and enemy_buffs rows, plus its own ID range (passive
    9824201 owns buffs 98242010-98242019)."""
    info = {int(b): (n, c, (d or '').strip()) for b, n, c, d in
            con.execute('SELECT buff_id, name, categories, description FROM buffs')}
    links = {}
    for sid, chain in con.execute("SELECT skill_id, buff_chain FROM skill_effects WHERE skill_table = 'PassiveSkillInfo'"):
        for b in filter(None, (chain or '').split(' > ')):
            links.setdefault(int(sid), set()).add(int(b))
    for sid, b in con.execute("SELECT skill_id, buff_id FROM link_skill_buff WHERE skill_table = 'PassiveSkillInfo'"):
        links.setdefault(int(sid), set()).add(int(b))
    for b, sources in con.execute('SELECT buff_id, source_ids FROM enemy_buffs'):
        for sid in re.findall(r'PassiveSkill (\d+)', sources or ''):
            links.setdefault(int(sid), set()).add(int(b))

    def shown(sid):
        own = range(sid * 10, sid * 10 + 10) if sid < 10 ** 7 else ()
        out = []
        for b in sorted(links.get(sid, set()) | set(own)):
            name, cat, desc = info.get(b, (None, None, ''))
            if name and cat not in HELPER_CATEGORIES and not INTERNAL.match(name) and name not in [x['name'] for x in out]:
                out.append({'id': b, 'name': name, 'description': '' if desc == name else desc})
        return out
    return shown


def fill_holes(text, sid, shown):
    """Fill the gaps in a passive's description, only in the one case that
    held against the guide: the passive links exactly one shown buff and it
    is the passive's own first buff (9824201 -> Cold Seal 98242010)."""
    if HOLE.search(text) and len(shown) == 1 and shown[0]['id'] == sid * 10:
        filled = HOLE.sub(' [%s]' % shown[0]['name'], text)
        # "[X] changes to [X]": a second, unlinked buff was meant.
        if not re.search(r'\[([^\]]+)\],? (?:changes |turns |converts )?(?:to|into) \[\1\]', filled):
            return filled
    return text


# Internal buff names (helpers the game doesn't show): their text describes
# the passive itself rather than a buff the player sees.
INTERNAL = re.compile(r'^(?:$|Boss \d|Hidden|Passive|\(Hidden\)|.*\(Hidden\)$|.*[.]$|Adds |Grants |Before |Cleared |Counts|Link \d|'
                      r'Applies |Attacker |Display |Restores |Boss can |(?:Body|Left Arm|Right Arm|Legs) \d+%)', re.I)


def effects_for(rows, boss):
    """A passive's buff rows for one boss -> (description from the internal
    rows' text, named buffs [{name, description}])."""
    text, named = [], {}
    for name, kind, units, desc in rows:
        if boss not in units or not desc or desc == name:
            continue
        desc = re.sub(r'^Hidden - ', '', desc)
        if INTERNAL.match(name or '') or kind == 'mechanic' and name and desc.startswith(name):
            if desc not in text:
                text.append(desc)
        elif desc not in named.setdefault(name, []):
            named[name].append(desc)
    return '\n'.join(text), [{'name': n, 'description': ' '.join(d)} for n, d in named.items() if d]


# Bracketed words that name a side, a turn, a weapon type or a unit rather
# than an effect, so they need no explanation. Pilot names are added too.
NOT_TERMS = {'enemy', 'ally', 'all', 'enemy turn', 'your turn', 'machine gun', 'machine guns', 'shield', 'alter-blades',
             'eston', 'vincenza'}
# Terms the skill text calls by another name than the effect's own; the
# explanation is shown as "Term (Effect)".
TERM_ALIASES = {
    'ignore unit obstruction': 'Phantom',
    'two-handed retaliation': 'Dual Gun Retaliation',   # Cassha's
}


def term_lookup():
    """(name, stage skill IDs) -> the description of the effect named, or
    None: the buff of that name the stage's skills link to, else the wiki
    glossary's entry, else the DB's buff of that name when all its copies
    agree."""
    con = sqlite3.connect(DB)
    by_name = {}
    for b, name, desc in con.execute('SELECT buff_id, name, description FROM buffs ORDER BY buff_id'):
        desc = (desc or '').strip()
        if name and desc and desc != name:
            by_name.setdefault(name.lower(), []).append((int(b), desc))
    links = {}
    for sid, b, chain in con.execute('SELECT skill_id, buff_id, buff_chain FROM skill_effects'):
        for x in [b] + (chain or '').split(' > '):
            if str(x or '').isdigit():
                links.setdefault(int(sid), set()).add(int(x))
    for sid, b in con.execute('SELECT skill_id, buff_id FROM link_skill_buff'):
        links.setdefault(int(sid), set()).add(int(b))
    con.close()
    with open(GLOSSARY, encoding='utf-8') as f:
        g = json.load(f)
    glossary = {}
    for kind in ('buf', 'skill', 'terrain'):
        for e in g[kind].values():
            if e.get('name') and e.get('effect'):
                glossary.setdefault(e['name'].lower(), e['effect'].strip())

    def own(name, sids):
        """The stage's buff of that name: one its skills link to, or one in
        a skill's ID family (Andrea's passive 9837701 -> Morale 98377034).
        Else a family buff named "<side> <name>" when they all agree
        (Emergency Arm Repair 1015010 -> L-Arm Partial Repair 10150102)."""
        linked, families = set(), {sid // 100 for sid in sids}
        for sid in sids:
            linked |= links.get(sid, set()) | set(range(sid * 10, sid * 10 + 10))
        hit = [desc for b, desc in by_name.get(name.lower(), []) if b in linked or b // 1000 in families]
        if hit:
            return hit[0]
        sided = {desc for key, rows in by_name.items() if key.endswith(' ' + name.lower())
                 for b, desc in rows if b // 1000 in families}
        return sided.pop() if len(sided) == 1 else None

    def lookup(name, sids, season_sids):
        """Stage's own buff, the season's, the glossary's, then the DB's
        keyword buff (ID under 10^6, e.g. Re-Mv 900012) or its only text."""
        found = own(name, sids) or own(name, season_sids) or glossary.get(name.lower())
        if found:
            return found
        cands = by_name.get(name.lower(), [])
        keyword = [desc for b, desc in cands if b < 10 ** 6]
        descs = {desc for _, desc in cands}
        return keyword[0] if keyword else descs.pop() if len(descs) == 1 else None
    return lookup


def stage_entries(st):
    """A stage's skills, its minions' skills and its Extreme modifiers."""
    return list(st['skills']) + [sk for u in st.get('units', []) for sk in u['skills']] + st.get('extreme_modifiers', [])


def walk_buffs(x):
    for b in x.get('buffs', []):
        yield b
        yield from walk_buffs(b)


def buff_defs(stages):
    """Lowercased buff name -> the first buff of that name under the
    stages' skills."""
    defs = {}
    for st in stages:
        for sk in stage_entries(st):
            for b in walk_buffs(sk):
                if b.get('description'):
                    defs.setdefault(b['name'].lower(), b)
    return defs


def explain_terms(where, st, sids, season, lookup, warn):
    """Give every skill (and Extreme modifier) a buff entry for each [Term]
    its text uses that isn't explained under it: the stage's own definition
    from another skill's buffs, else lookup(), else another stage of the
    season's (season: (its stages' definitions, its skill IDs)). Skill names
    on the stage (shown as their own cards) and NOT_TERMS are left alone."""
    entries = stage_entries(st)
    skill_names = {sk['name'].lower() for sk in entries if sk.get('name')}
    defs = buff_defs([st])
    season_defs, season_sids = season
    for sk in entries:
        own = {(sk.get('name') or '').lower()} | {b['name'].lower() for b in walk_buffs(sk)}
        texts = [sk.get('description') or ''] + [b.get('description') or '' for b in walk_buffs(sk)]
        for text in texts:   # grows as explanations are added
            for term in re.findall(r'\[([^\[\]<>]+)\]', text):
                key = term.lower()
                if key in own or key in skill_names or key in NOT_TERMS:
                    continue
                own.add(key)
                alias = TERM_ALIASES.get(key)
                if alias:
                    own.add(alias.lower())
                    found, desc = None, lookup(alias, sids, season_sids)
                    term = '%s (%s)' % (term, alias)
                else:
                    found = defs.get(key)
                    desc = not found and lookup(term, sids, season_sids)
                found = found or not desc and season_defs.get(key)
                if found:
                    b = {k: v for k, v in found.items() if k in ('name', 'description', 'tags')}
                else:
                    if not desc:
                        warn('%s: "%s" uses [%s], which nothing explains' % (where, sk.get('name') or 'modifier', term))
                        continue
                    b = {'name': term, 'description': desc}
                sk.setdefault('buffs', []).append(b)
                texts.append(b['description'])


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
    # Seasons after the guide only have what was added by hand (e.g. modifiers).
    if 'title' in entry and entry['title'].replace('’', "'").lower() != st['title'].lower():
        warn('%s: guide calls the stage "%s", DB "%s"' % (where, entry['title'], st['title']))
    if entry.get('description'):
        st['description'] = entry['description']
    if entry.get('bounties'):
        # The guide calls the fourth difficulty Purgatory.
        st['bounties'] = [dict(b, conditions={('Inferno' if d == 'Purgatory' else d): c for d, c in b['conditions'].items()})
                          for b in entry['bounties']]
    if entry.get('extreme_modifiers'):
        st['extreme_modifiers'] = entry['extreme_modifiers']
    if entry.get('clues'):
        st['clues'] = entry['clues']
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
        if match.get('description') and not match.get('composed') and NUM.findall(match['description']) != nums:
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
    stage_ids = {}
    for s in ac.values():
        for st in s['stages'].values():
            boss, st['title'], st['skills'], stage_ids[id(st)] = skills[(s['name'], st['slot'])]
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
    lookup = term_lookup()
    with open(PILOTS, encoding='utf-8') as f:
        NOT_TERMS.update(p['PilotName'].lower() for p in json.load(f)['pilots'])
    for s in ac.values():
        season = (buff_defs(s['stages']), set().union(*(stage_ids[id(st)] for st in s['stages'])))
        for st in s['stages']:
            explain_terms('AC%d %s' % (s['number'], st['boss']), st, stage_ids[id(st)], season, lookup, warnings.append)
    for s in ac.values():
        for st in s['stages']:
            for sk in st['skills']:
                sk.pop('composed', None)
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
