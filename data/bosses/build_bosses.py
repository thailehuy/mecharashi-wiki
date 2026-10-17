#!/usr/bin/env python3
"""Add the Armed Conquest and Clearance Ops boss line-ups to bosses.json.

The `bosses` map (name, pilot link, images) is kept by hand. This script
rebuilds `armed_conquest` and `clearance_ops` from the DMG calc's targets
(data/dmgcalc/bench-data.js), adds each boss's skills (and each Armed Conquest
stage's name) from the mined DB
(data/screenshots/MRT_FieldWiki/source/mecharashi.db), each Armed Conquest
stage's description, bounties and clues and each Clearance Ops chapter's
description and turn limit from the game tables
(RebuildGameUpdate/out/stats.db) and what the Armed Conquest guide adds
(ac-guide.json: skill cards, minions, Extreme modifiers, and descriptions,
bounties and clues where the game tables lack them) and each Clearance Ops
boss's drops (build_co_drops.py), then writes bosses.json and bosses.js.
Mismatches between the guide and the game data are printed.
"""
import json
import os
import re
import sqlite3

from build_co_drops import chapter_drops

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BENCH = os.path.join(ROOT, 'data', 'dmgcalc', 'bench-data.js')
WEAPONS = os.path.join(ROOT, 'data', 'weapons', 'compiled.json')
DB = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'source', 'mecharashi.db')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
GUIDE = os.path.join(HERE, 'ac-guide.json')
GLOSSARY = os.path.join(ROOT, 'data', 'glossary.json')
PILOTS = os.path.join(ROOT, 'data', 'pilots', 'compiled.json')
OUT = os.path.join(HERE, 'bosses.json')
OUT_JS = os.path.join(HERE, 'bosses.js')

AC_LABEL = re.compile(r'^(.*) · (.*) (\d+) · (.*)$')       # "Ride or Die · Hard 2 · Garcia"
CO_LABEL = re.compile(r'^(\d+)\. (.*) (\d+) · (.*)$')       # "17. Crossroads of Memory 1 · Jon"
CO_COMPANION_LABEL = re.compile(r'^(\d+\. .*) · (.*)$')     # "1. Rekindled Spark · Black Widow"
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
    # Both arms have the same HP, except that the DMG calc adds a shield's HP
    # to the arm holding it; the lower one is the bare arm's.
    hp = t['hp']
    return {'body': round(hp['Body']), 'arm': round(min(hp['Left arm'], hp['Right arm'])), 'legs': round(hp['Legs'])}


def mech_class(t):
    # Boss-only mechs (Hades, Leviathan, Holmberg, Tonatiuh) have no class in
    # the game data; the game calls them Titans.
    return t['cls'] or 'Titan'


SKILL = re.compile(r'(\d+) (.*)')                         # "8820601 Massive Gunfire"
# Chip and equipment passives most bosses carry (stat boosts the guide
# doesn't show): left out of the line-ups.
GENERIC_PASSIVE = re.compile(r'^(?:Superconducting Core|Elite Chip [XVI]+|Auto Load|Reinforced Armor [IVX]+|'
                             r'(?:Universal )?Flying Device|Repair Unit|TacW Guidance [IV]+|Strategic Strike \d+)$')


def boss_skills(bosses, content):
    """(season, stage) -> (boss, stage name, skills), from the DB's bosses table
    (main bosses only; Armed Conquest companions such as Hayato come from the
    guide's units). content: 'Armed Conquest' or 'Clearance Ops' (one row per
    stage, no difficulties). Clearance Ops companions, which have no stage,
    are keyed (chapter, None, boss).

    Each skill: name, kind ('active' or 'passive'), description (passives in
    enemy_skills only; active skills have none in the DB) and, when the skill
    isn't on every difficulty, the difficulties it's on (e.g. a β passive on
    Extreme and Inferno), and its icon from the game tables (skill_icons()).
    Passives also get their effects from enemy_buffs:
    see passive_effects(). Also returns the stage's skill IDs (for
    explain_terms()).
    """
    con = sqlite3.connect(DB)
    described = dict(con.execute("SELECT skill_id, description FROM enemy_skills WHERE description != ''"))
    effects = passive_effects(con, content)
    linked = linked_buffs(con)
    rows = con.execute('SELECT "group", stage, difficulty, boss_pilot, stage_name, main_skills, passives, role FROM bosses '
                       "WHERE content = ? AND role IN ('main', 'companion') ORDER BY rowid", (content,)).fetchall()
    con.close()
    icons = skill_icons()
    out = {}
    for season, stage, diff, boss, title, main, passives, role in rows:
        if role == 'companion':
            if stage is not None or content != 'Clearance Ops':
                continue
            key = (season, None, boss)
        else:
            key = (season, int(stage))
            boss = canonical(boss, bosses)
        diff = DIFFICULTY_NAMES.get(diff, diff)
        st = out.setdefault(key, {'boss': boss, 'title': title, 'diffs': [], 'skills': {}, 'ids': set()})
        st['diffs'].append(diff)
        for kind, text in (('active', main), ('passive', passives)):
            for part in filter(None, (text or '').split('; ')):
                sid, name = SKILL.match(part).groups()
                if kind == 'passive' and GENERIC_PASSIVE.match(name):
                    continue
                st['ids'].add(int(sid))
                sk = st['skills'].setdefault(sid, {'name': name, 'kind': kind, 'diffs': []})
                if icons.get((kind, int(sid))):
                    sk['icon'] = icons[(kind, int(sid))]
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
            if diffs and len(diffs) < len(st['diffs']):
                sk['difficulties'] = diffs
            skills.append(sk)
        # Active skills first, each kind in the game's order.
        skills.sort(key=lambda sk: sk['kind'] != 'active')
        result[key] = (st['boss'], st['title'], skills, st['ids'])
    return result



def skill_icons():
    """(kind, skill ID) -> icon name, from the Icon column of the game's
    main (active) and passive skill tables."""
    con = sqlite3.connect(STATS)
    icons = {}
    for kind, table in (('active', 'ConfigDataMainSkillInfo'), ('passive', 'ConfigDataPassiveSkillInfo')):
        for sid, icon in con.execute("SELECT ID, Icon FROM %s WHERE Icon IS NOT NULL AND Icon != ''" % table):
            icons[(kind, int(sid))] = icon
    con.close()
    return icons


def passive_effects(con, content):
    """Passive skill ID -> its buff rows for the content in enemy_buffs
    (source_ids lists "PassiveSkill <ID>"): (name, kind, units, description)."""
    out = {}
    rows = con.execute("SELECT name, kind, units, description, source_ids FROM enemy_buffs "
                       "WHERE content LIKE ? ORDER BY rowid", ('%' + content + '%',))
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


def skill_buff_links(con, table=None):
    """(skill ID, buff ID) pairs from the buff_ids lists of enemy_skills and
    pilot_skills, optionally only skills from one skill table."""
    pairs = set()
    for t in ('enemy_skills', 'pilot_skills'):
        sql = 'SELECT skill_id, buff_ids FROM %s' % t
        for sid, buffs in con.execute(sql + ' WHERE skill_table = ?' if table else sql, (table,) if table else ()):
            for b in re.findall(r'\d+', str(buffs or '')):
                pairs.add((int(sid), int(b)))
    return pairs


def linked_buffs(con):
    """Passive skill ID -> the shown buffs it links to ({id, name,
    description}), lowest ID first: buffs in its skill_effects chains,
    its buff_ids (skill_buff_links()) and enemy_buffs rows, plus its own ID range (passive
    9824201 owns buffs 98242010-98242019)."""
    info = {int(b): (n, c, (d or '').strip()) for b, n, c, d in
            con.execute('SELECT buff_id, name, categories, description FROM buffs')}
    links = {}
    for sid, chain in con.execute("SELECT skill_id, buff_chain FROM skill_effects WHERE skill_table = 'PassiveSkillInfo'"):
        for b in filter(None, (chain or '').split(' > ')):
            links.setdefault(int(sid), set()).add(int(b))
    for sid, b in skill_buff_links(con, 'PassiveSkillInfo'):
        links.setdefault(sid, set()).add(b)
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
             'assault', 'eston', 'vincenza'}
# Terms the skill text calls by another name than the effect's own; the
# explanation is shown as "Term (Effect)".
TERM_ALIASES = {
    'ignore unit obstruction': 'Phantom',
    'two-handed retaliation': 'Dual Gun Retaliation',   # Cassha's
    'link attacks': 'Link Attack',
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
    for sid, b in skill_buff_links(con):
        links.setdefault(sid, set()).add(b)
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
                if 'icon' not in g and 'icon' in sk:
                    g['icon'] = sk['icon']
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


# Each Armed Conquest season's level lists in ConfigDataRaidDungeonInfo (ID =
# AC number), one per difficulty; a level's position is its stage slot.
RAID_LEVELS = [('Normal', 'LevelList'), ('Hard', 'HardLevelList'), ('Extreme', 'HellLevelList'),
               ('Inferno', 'Difficult4LevelList')]
# Placeholder bounties left in the tables (AC3's last stage: 'Defeat BOSS
# "Genovese Luno"', no condition on Hard and up); the guide's are kept.
PLACEHOLDER_BOUNTY = re.compile(r'^(?:Defeat BOSS|Raid Mission)')


def stage_info():
    """(AC number, slot) -> the stage's title, description, bounties
    ({name, conditions: {difficulty: text}}) and clues ({name, subtitle,
    text}, in bounty order: each bounty unlocks one) from the game tables.
    A clue's text grows with the difficulty it's from, so where the
    difficulties' texts differ, text is {difficulty: text}. A season's last stage also has the clues it takes to unlock on
    each difficulty (clue_unlock; the clues count over all difficulties)."""
    con = sqlite3.connect(STATS)
    one = lambda sql, *args: con.execute(sql, args).fetchone()
    out = {}
    for row in con.execute('SELECT ID, %s FROM ConfigDataRaidDungeonInfo' % ', '.join(c for _, c in RAID_LEVELS)).fetchall():
        for (diff, _), levels in zip(RAID_LEVELS, row[1:]):
            for slot, level in enumerate(json.loads(levels or '[]'), 1):
                title, desc, offers, clues = one('SELECT NameStrKey_EN, DescStrKey_EN, OfferRewardList, UnlockClueCond '
                                                 'FROM ConfigDataRaidDungeonLevelInfo WHERE ID = ?', level)
                st = out.setdefault((row[0], slot), {'title': title, 'description': desc, 'bounties': [], 'clues': [],
                                                     'clue_unlock': {}})
                if clues:
                    st['clue_unlock'][diff] = clues
                for i, offer in enumerate(json.loads(offers or '[]')):
                    ach, clue = one('SELECT AchievementId, ClueID FROM ConfigDataRaidDungeonOfferRewardInfo WHERE ID = ?', offer)
                    name, cond = one('SELECT NameStrKey_EN, DescStrKey_EN FROM ConfigDataBattleAchievementInfo WHERE ID = ?', ach)
                    if PLACEHOLDER_BOUNTY.match(name):
                        continue
                    if i == len(st['bounties']):
                        st['bounties'].append({'name': name, 'conditions': {}})
                    st['bounties'][i]['conditions'][diff] = cond.rstrip('.')
                    found = clue and one('SELECT NameStrKey_EN, DescStrKey_EN, DetailsStrKey_EN '
                                         'FROM ConfigDataRaidDungeonClueInfo WHERE ID = ?', clue)
                    if found:
                        if diff == 'Normal':
                            st['clues'].append({'name': found[0], 'subtitle': found[1], 'text': {}})
                        c = next(c for c in st['clues'] if c['name'] == found[0])
                        c['text'][diff] = found[2]
    con.close()
    for st in out.values():
        for c in st['clues']:
            if len(set(c['text'].values())) == 1:
                c['text'] = c['text']['Normal']
    return out


def add_stage_info(s, st, info, warn):
    """The game tables' description, bounties and clues replace the guide's
    (and the last stage gets its clue_unlock);
    a bounty whose numbers differ from the guide's is printed."""
    where = 'AC%d %s' % (s['number'], st['boss'])
    if info['title'] != st['title']:
        warn('%s: game tables call the stage "%s", DB "%s"' % (where, info['title'], st['title']))
    guide = {b['name'].lower(): b for b in st.get('bounties', [])}
    for b in info['bounties']:
        g = guide.get(b['name'].lower())
        for diff, cond in b['conditions'].items():
            if g and diff in g['conditions'] and NUM.findall(g['conditions'][diff]) != NUM.findall(cond):
                warn('%s: bounty "%s" (%s) differs: guide "%s", game "%s"' % (where, b['name'], diff, g['conditions'][diff], cond))
    for key in ('description', 'bounties', 'clues', 'clue_unlock'):
        if info[key]:
            st[key] = info[key]


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


def chapter_info():
    """Clearance Ops battle map ID -> the chapter's description and turn
    limit from the game tables. (Every chapter is won by defeating any boss,
    then all of them.)"""
    con = sqlite3.connect(STATS)
    out = {battle: {'description': desc, 'turns': turns} for battle, desc, turns in
           con.execute('SELECT BattleMapId, DescStrKey_EN, MaxRounds FROM ConfigDataDungeonLevelInfo')}
    con.close()
    return out


def canonical(name, bosses):
    for b in bosses.values():
        if name == b['name'] or name in b.get('aliases', []):
            return b['name']
    raise ValueError('Boss not in bosses.json: %s' % name)


def main():
    with open(OUT, encoding='utf-8') as f:
        data = json.load(f)
    bosses = data['bosses']

    ac, co, companion_mechs = {}, {}, {}
    for t in load_targets():
        # Second bosses (Hayato beside Sunny) are listed under the stage's units by the guide.
        if t.get('role') == 'companion':
            m = CO_COMPANION_LABEL.match(t['label'])
            if t['content'] == 'Clearance Ops' and m:
                companion_mechs[(m.group(1), m.group(2))] = t['mech']
            continue
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
            c = co.setdefault(chapter, {'chapter': chapter, 'name': name, 'battle': t['battle'], 'stages': {}})
            c['stages'].setdefault(slot, {'slot': slot, 'boss': canonical(boss, bosses), 'mech': t['mech'], 'cls': mech_class(t), 'hp': part_hp(t)})

    skills = boss_skills(bosses, 'Armed Conquest')
    stage_ids = {}
    for s in ac.values():
        for st in s['stages'].values():
            boss, st['title'], st['skills'], stage_ids[id(st)] = skills[(s['name'], st['slot'])]
            if boss != st['boss']:
                raise ValueError('%s stage %d: DMG calc has %s, DB has %s' % (s['name'], st['slot'], st['boss'], boss))
    co_skills = boss_skills(bosses, 'Clearance Ops')
    chapters = chapter_info()
    drop_warnings = []
    drops = chapter_drops(drop_warnings.append)
    for c in co.values():
        group = '%d. %s' % (c['chapter'], c['name'])
        boss_drops = {canonical(b['boss'], bosses): b for b in drops[c['battle']]['bosses']}
        for st in c['stages'].values():
            boss, _, st['skills'], stage_ids[id(st)] = co_skills[(group, st['slot'])]
            if boss != st['boss']:
                raise ValueError('%s stage %d: DMG calc has %s, DB has %s' % (group, st['slot'], st['boss'], boss))
            d = boss_drops.pop(st['boss'], None)
            if d is None:
                drop_warnings.append('%s stage %d: no drops for %s' % (group, st['slot'], st['boss']))
            else:
                st['drops'] = {k: v for k, v in d.items() if k not in ('boss_id', 'boss')}
        for boss in boss_drops:
            drop_warnings.append('%s: drops for %s, who is on no stage' % (group, boss))
        # Companions fight beside the chapter's bosses, on no stage of their own.
        companions = [{'name': k[2], 'mech': companion_mechs.get((group, k[2])), 'skills': v[2], 'ids': v[3]}
                      for k, v in co_skills.items() if k[0] == group and k[1] is None]
        if companions:
            c['companions'] = companions
        c.update(chapters[c['battle']])

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
    info = stage_info()
    for s in ac.values():
        for st in s['stages']:
            add_stage_info(s, st, info[(s['number'], st['slot'])], warnings.append)
    add_icons(ac.values())
    lookup = term_lookup()
    with open(PILOTS, encoding='utf-8') as f:
        NOT_TERMS.update(p['PilotName'].lower() for p in json.load(f)['pilots'])
    for s in ac.values():
        season = (buff_defs(s['stages']), set().union(*(stage_ids[id(st)] for st in s['stages'])))
        for st in s['stages']:
            explain_terms('AC%d %s' % (s['number'], st['boss']), st, stage_ids[id(st)], season, lookup, warnings.append)
    for c in co.values():
        sids = set().union(*(stage_ids[id(st)] for st in c['stages']), *(u['ids'] for u in c.get('companions', [])))
        chapter = (buff_defs(c['stages']), sids)
        for st in c['stages']:
            explain_terms('CO%d %s' % (c['chapter'], st['boss']), st, stage_ids[id(st)], chapter, lookup, warnings.append)
        for u in c.get('companions', []):
            explain_terms('CO%d %s' % (c['chapter'], u['name']), {'skills': u['skills']}, u.pop('ids'), chapter, lookup, warnings.append)
    for s in list(ac.values()) + list(co.values()):
        for st in s['stages'] + s.get('companions', []):
            for sk in st['skills']:
                sk.pop('composed', None)
    for w in warnings:
        print('guide:', w)
    for w in drop_warnings:
        print('drops:', w)

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
