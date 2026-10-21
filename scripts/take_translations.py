#!/usr/bin/env python3
"""Replace the wiki's own translations of a version's pilots, STs, weapons and
backpacks with the official English text, once the global (EN) client has
that version (RebuildGameUpdate/out/stats.db, from rebuild_all.py).

Units are added from the CN client before Global gets them (build_intake.py,
build_item_intake.py), with fan translations. When their version reaches
Global, this takes in the game's own text for every row of that version:

- pilots.json        name, real_name, introduction
- skills.json        name and effect/describe of the talents, neural skills, γ passives and weapon passives those
                     rows use, unless an older row shares the skill
- mechs.json         name, introduce; modules.json name and each level's effect (same sharing rule)
- weapons.json       name, describe
- backpacks.json     name, the skill's id, name, icon and effect
- glossary.json      the buffs/skills the new text tags that the glossary lacks, or still has in Chinese

A weapon passive the wiki keyed by an ID of its own (not the game's) takes the
text of the game passive in the same position. Everything changed is printed;
rows the global client doesn't have yet are listed and left alone. Run
compile.py afterwards (update_global.py does).

    python3 scripts/take_translations.py                  # every version the global client has past GLOBAL_VERSION
    python3 scripts/take_translations.py --version 2.6    # this version (repeatable)
    python3 scripts/take_translations.py --dry-run        # print the changes, write nothing
"""
import argparse
import json
import os
import re
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, 'data', 'db')
GLOSSARY = os.path.join(ROOT, 'data', 'glossary.json')
STATS = os.path.join(ROOT, 'data', 'screenshots', 'MRT_FieldWiki', 'RebuildGameUpdate', 'out', 'stats.db')
TABLES = ['pilots', 'pilot_neurons', 'neural_partitions', 'skills', 'mechs', 'modules', 'weapons', 'backpacks']
CJK = re.compile(r'[一-鿿]')
TAG = re.compile(r'<(buf|skill|neural)\s+(\w+)=(\d+)>')
# An innate neural core's skills.json key: the game gives Shifters' innate core the same ID as their starting skill
# (Lustre's 800201 is both a passive and a main skill), so these rows are keyed "neural:<game ID>".
NEURAL = 'neural:'
PLACEHOLDER = {'TEST', '无'}
# Release-order lists that name the units: a renamed pilot/ST is renamed there too.
NAME_LISTS = {'pilots': os.path.join(ROOT, 'js', 'pages', 'pilots.js'), 'mechs': os.path.join(ROOT, 'js', 'pages', 'sts.js')}
# GLOBAL_VERSION, the version the global server is on (set_global_version.py): its text and older are taken in already.
APP_JS = os.path.join(ROOT, 'js', 'app.js')
ZERO_WIDTH = re.compile('[​-‍﻿]')
# A talent-enhancing buff's text only points at the talent ("[Arthur] Core Talent"): not worth a glossary entry.
TALENT_POINTER = re.compile(r'^\[[^\]]+\] Core Talent$')
# A tag's attribute -> the game table its ID is in.
TAG_TABLE = {'activeSkill': 'ConfigDataActiveSkillInfo', 'mainSkill': 'ConfigDataMainSkillInfo',
             'mainSkillID': 'ConfigDataMainSkillInfo', 'passiveSkill': 'ConfigDataPassiveSkillInfo'}


def load(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def save(path, data):
    """Write a table in the file's own indentation (glossary.json uses 1 space), only when its content changed."""
    with open(path, encoding='utf-8') as f:
        old = f.read()
    second = old.split('\n', 2)[1] if '\n' in old else ''
    out = json.dumps(data, indent=len(second) - len(second.lstrip(' ')) or 2, ensure_ascii=False) + '\n'
    if json.loads(old) != data:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(out)


def version_key(v):
    return tuple(int(x) for x in v.split('.'))


class Global:
    def __init__(self):
        if not os.path.exists(STATS):
            sys.exit(f'Missing {os.path.relpath(STATS, ROOT)}: mine the global client first (rebuild_all.py)')
        self.c = sqlite3.connect(STATS)
        self.c.row_factory = sqlite3.Row

    def row(self, table, id_):
        return self.c.execute(f'select * from {table} where ID = ?', (int(id_),)).fetchone()

    def pilot(self, id_):
        """A released pilot: the global client also holds placeholder rows (text "TEST") for some future ones."""
        r = self.row('ConfigDataPilotInfo', id_)
        return r if r and r['IsPlayerPilot'] else None

    def skill(self, id_, active=False):
        """A skill row. Active and passive skills can share an ID: look first in the table the wiki row's kind says."""
        tables = ['ConfigDataMainSkillInfo', 'ConfigDataPassiveSkillInfo']
        for table in tables if active else tables[::-1]:
            r = self.row(table, id_)
            if r:
                return r
        return None

    def suit(self, body_id):
        return self.c.execute('select * from ConfigDataTacticalUnitSuitInfo where WapPartBodyId = ? and ID < 10000',
                              (int(body_id),)).fetchone()


def text(value, name=False):
    value = ZERO_WIDTH.sub('', (value or '').replace('\r', '')).strip()
    return value.rstrip('.') if name else value     # the game's names sometimes end in a stray "."


class Taker:
    def __init__(self, game, t, glossary):
        self.g, self.t, self.glossary = game, t, glossary
        self.changes, self.missing, self.notes = [], [], []
        self.renames = {'pilots': {}, 'mechs': {}}    # old name -> official name
        # Game IDs of the innate neural cores (the Profession Neuron's skill), which the text tags as passives.
        self.innate = {n['skill'].removeprefix(NEURAL) for nodes in t['pilot_neurons'].values()
                       for n in nodes if n.get('type') == '6' and n.get('skill')}

    def rename(self, table, where, row, value):
        old = row.get('name')
        self.set(where, row, 'name', value)
        if row.get('name') != old:
            self.renames[table][old] = row['name']

    def set(self, where, row, field, value):
        """Set a field to the game's text, when the game has some and it differs."""
        value = self.untag(text(value, name=field == 'name'))
        if not value or value in PLACEHOLDER or CJK.search(value) or row.get(field) == value:
            return
        self.changes.append((where, field, row.get(field), value))
        row[field] = value

    def untag(self, value):
        """A buff whose text only points at a pilot's talent ("[Melissa] Core Talent") links to the talent instead:
        <skill ID=<talent>>, which the pages resolve to the talent, or a plain [Name] when that ID is taken by another
        skill (Tiphys's 600850 is also his Defense Field code). The buff ID may be a different keyword in the
        glossary (900140 is Melissa's talent in the game, 900059 the Sentinel Ward buff).
        An innate neural core tagged as a passive (<skill passiveSkill=800201>) becomes <neural ID=800201>, since its
        ID can also be a main skill's."""
        def link(m):
            id_, name = m[1], m[2]
            r = self.g.row('ConfigDataActorBufInfo', id_)
            pointer = r and TALENT_POINTER.match(text(r['BuffDescStrKey_EN']))
            if not pointer:
                return m[0]
            pilot = text(r['BuffDescStrKey_EN'])[1:].split(']')[0]
            talent = next((p['talents'][0] for p in self.t['pilots'].values()
                           if p.get('name') == pilot and p.get('talents')), None)
            if (talent and self.t['skills'].get(talent, {}).get('name') == name
                    and talent not in self.glossary['skill']
                    and all(b.get('skill', {}).get('id') != talent for b in self.t['backpacks'].values())):
                return f'<skill ID={talent}>[{name}]</skill>'
            return f'[{name}]'
        value = re.sub(r'<skill passiveSkill=(\d+)>(.*?)</skill>',
                       lambda m: f'<neural ID={m[1]}>{m[2]}</neural>' if m[1] in self.innate else m[0], value)
        return re.sub(r'<buf ID=(\d+)>\[([^\]]*)\]</buf>', link, value)

    def skill(self, sid, game_id=None):
        row = self.t['skills'].get(sid)
        active = row is not None and 'describe' in row and 'effect' not in row
        game_id = game_id or (sid[len(NEURAL):] if sid.startswith(NEURAL) else None)
        if sid.startswith(NEURAL):
            r = self.g.row('ConfigDataPassiveSkillInfo', game_id) if game_id.isdigit() else None
        else:
            r = self.g.skill(game_id or sid, active) if (game_id or sid).isdigit() else None
        if row is None or r is None:
            return r is not None
        where = f'skills[{sid}]' + (f' (from game {game_id})' if game_id else '')
        self.set(where, row, 'name', r['NameStrKey_EN'])
        self.set(where, row, 'describe' if 'describe' in row and 'effect' not in row else 'effect', r['SkillDescStrKey_EN'])
        return True

    def module(self, family):
        row = self.t['modules'].get(family)
        entry = self.g.c.execute('select NameStrKey_EN from ConfigDataWapEntryInfo where EntryLevelIdList like ?',
                                 (f'%{int(family) * 10 + 1}%',)).fetchone()
        if row is None or entry is None:
            return
        self.set(f'modules[{family}]', row, 'name', entry['NameStrKey_EN'])
        for level, lv in row.get('levels', {}).items():
            r = self.g.row('ConfigDataPassiveSkillInfo', int(family) * 10 + int(level))
            if r:
                self.set(f'modules[{family}].levels[{level}]', lv, 'effect', r['SkillDescStrKey_EN'])

    def glossary_terms(self):
        """Every buf/skill the changed text tags: add it to the glossary when it's missing or still in Chinese."""
        for where, field, _, value in list(self.changes):
            for tag, attr, id_ in TAG.findall(value):
                if tag == 'neural':
                    if NEURAL + id_ not in self.t['skills']:
                        self.notes.append(f'{where}: [neural {id_}] is tagged but skills.json has no {NEURAL}{id_} row')
                    continue        # the pages resolve a neural core tag from skills.json
                kind = 'buf' if tag == 'buf' else 'skill'
                entry = self.glossary[kind].get(id_)
                if entry and not CJK.search(entry.get('name', '') + entry.get('effect', '')):
                    continue
                if kind == 'skill' and attr != 'activeSkill' and id_ in self.t['skills']:
                    continue        # the pages resolve a pilot/module skill tag from skills.json
                if kind == 'buf':
                    r = self.g.row('ConfigDataActorBufInfo', id_)
                    name, effect = r and r['NameDescStrKey_EN'], r and r['BuffDescStrKey_EN']
                else:
                    r = self.g.row(TAG_TABLE.get(attr, 'ConfigDataActiveSkillInfo'), id_) or self.g.skill(id_)
                    name, effect = r and r['NameStrKey_EN'], r and r['SkillDescStrKey_EN']
                if not r or not text(name):
                    self.notes.append(f'{where}: [{kind} {id_}] is tagged but neither the glossary nor the game has it')
                    continue
                if TALENT_POINTER.match(text(effect)):
                    continue
                entry = self.glossary[kind].setdefault(id_, {})
                self.set(f'glossary.{kind}[{id_}]', entry, 'name', name)
                self.set(f'glossary.{kind}[{id_}]', entry, 'effect', effect)


def owners(t):
    """skill ID / module family -> the versions of the rows that use it."""
    skills, modules = {}, {}

    def add(table, key, version):
        table.setdefault(key, set()).add(version or '1.0')

    for pid, p in t['pilots'].items():
        v = p.get('version')
        for sid in p.get('talents', []):
            add(skills, sid, v)
        for n in t['pilot_neurons'].get(pid, []):
            for k in ('skill', 'innate'):
                if n.get(k):
                    add(skills, n[k], v)
        for z in p.get('neural', []):
            for e in t['neural_partitions'].get(z['partition'], {}).get('effects', []):
                add(skills, e['skill'], v)
    for w in t['weapons'].values():
        for sid in w.get('passives', []):
            add(skills, sid, w.get('version'))
    for m in t['mechs'].values():
        for mod in m.get('modules', []):
            add(modules, mod['family'], m.get('version'))
    return skills, modules


def on_global(g, t):
    """Every version with a pilot or ST the global client has (it has units of the next patches before they're out)."""
    found = {p['version'] for pid, p in t['pilots'].items() if p.get('version') and g.pilot(pid)}
    found |= {m['version'] for bid, m in t['mechs'].items() if m.get('version') and g.suit(bid)}
    return found


def global_version():
    with open(APP_JS, encoding='utf-8') as f:
        m = re.search(r'^var GLOBAL_VERSION = ([\d.]+);', f.read(), re.M)
    if not m:
        sys.exit(f'No GLOBAL_VERSION in {os.path.relpath(APP_JS, ROOT)}')
    return m.group(1)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--version', action='append', help='the version to take in (default: every one the global client has past GLOBAL_VERSION)')
    ap.add_argument('--dry-run', action='store_true', help='print the changes, write nothing')
    a = ap.parse_args()
    g = Global()
    t = {name: load(os.path.join(DB, name + '.json')) for name in TABLES}
    glossary = load(GLOSSARY)
    versions = set(a.version or [])
    if not versions:
        live = global_version()
        versions = {v for v in on_global(g, t) if version_key(v) > version_key(live)}
        if not versions:
            print(f'The global client has no pilot or ST newer than v{live} (GLOBAL_VERSION): nothing to take in')
            return
    print('Taking in the official text of version ' + ', '.join(sorted(versions, key=version_key)))
    k = Taker(g, t, glossary)
    skill_versions, module_versions = owners(t)
    mine = lambda used: used and used <= versions   # only rows of these versions use it

    for pid, p in t['pilots'].items():
        if p.get('version') not in versions:
            continue
        r = g.pilot(pid)
        if r is None:
            k.missing.append(f'pilot {pid} {p["name"]}')
            continue
        k.rename('pilots', f'pilots[{pid}]', p, r['NameStrKey_EN'])
        k.set(f'pilots[{pid}]', p, 'real_name', r['RealNameStrKey_EN'])
        k.set(f'pilots[{pid}]', p, 'introduction', r['DescStrKey_EN'])
        if p.get('summon_skills') or p.get('form_skill_groups'):
            k.notes.append(f'pilots[{pid}] {p["name"]}: summon_skills / form_skill_groups are kept by hand: check them')
    for sid, used in skill_versions.items():
        if mine(used) and (sid.isdigit() or sid.startswith(NEURAL)):
            k.skill(sid)

    for bid, m in t['mechs'].items():
        if m.get('version') not in versions:
            continue
        r = g.suit(bid)
        if r is None:
            k.missing.append(f'ST {bid} {m["name"]}')
            continue
        k.rename('mechs', f'mechs[{bid}]', m, r['NameStrKey_EN'])
        k.set(f'mechs[{bid}]', m, 'introduce', r['DescStrKey_EN'])
    for family, used in module_versions.items():
        if mine(used):
            k.module(family)

    for wid, w in t['weapons'].items():
        if w.get('version') not in versions:
            continue
        r = g.row('ConfigDataWeaponInfo', wid)
        if r is None:
            k.missing.append(f'weapon {wid} {w["name"]}')
            continue
        k.set(f'weapons[{wid}]', w, 'name', r['NameStrKey_EN'])
        k.set(f'weapons[{wid}]', w, 'describe', r['DescStrKey_EN'])
        game_ids = [str(i) for col in ('GlobalInitPassiveSkillIdList', 'CarryEffectiveGlobalInitPassiveSkillIdList',
                                       'PassiveSkillIdList') for i in json.loads(r[col] or '[]')]
        for i, sid in enumerate(w.get('passives', [])):
            if g.skill(sid):
                continue        # the game's own ID: taken in above
            if i < len(game_ids) and len(game_ids) == len(w['passives']):
                k.skill(sid, game_ids[i])
                k.notes.append(f'weapons[{wid}]: passive {sid} took the text of game passive {game_ids[i]} (re-key it to the game ID?)')
            else:
                k.notes.append(f'weapons[{wid}]: passive {sid} is not a game ID and the game lists {game_ids}: map it by hand')
        src = g.c.execute('select SrcItemId from ConfigDataItemExchangeBlueprintInfo where ResultItemId = ?', (int(wid),)).fetchone()
        if src and src[0] and str(src[0]) not in t['weapons']:
            k.notes.append(f'weapons[{wid}]: its UR version {src[0]} is not in the wiki (build_item_intake.py {wid} makes its form)')

    for bid, b in t['backpacks'].items():
        if b.get('version') not in versions:
            continue
        r = g.row('ConfigDataBackpackInfo', bid)
        if r is None:
            k.missing.append(f'backpack {bid} {b["name"]}')
            continue
        k.set(f'backpacks[{bid}]', b, 'name', r['NameStrKey_EN'])
        skill_ids = json.loads(r['PassiveSkillIds'] or '[]')
        s = skill_ids and g.row('ConfigDataPassiveSkillInfo', skill_ids[0])
        if s:
            sk = b.setdefault('skill', {})
            k.set(f'backpacks[{bid}].skill', sk, 'id', str(s['ID']))
            k.set(f'backpacks[{bid}].skill', sk, 'name', s['NameStrKey_EN'])
            k.set(f'backpacks[{bid}].skill', sk, 'icon', s['Icon'])
            k.set(f'backpacks[{bid}].skill', sk, 'effect', s['SkillDescStrKey_EN'])
        if len(skill_ids) > 1:
            k.notes.append(f'backpacks[{bid}]: the game gives it skills {skill_ids}; only the first is stored')

    k.glossary_terms()
    # A renamed pilot keeps its signature weapons' links.
    for wid, w in t['weapons'].items():
        if w.get('pilot') in k.renames['pilots']:
            k.set(f'weapons[{wid}]', w, 'pilot', k.renames['pilots'][w['pilot']])

    for where, field, old, new in k.changes:
        print(f'  {where}.{field}: {json.dumps(old, ensure_ascii=False)[:80]} -> {json.dumps(new, ensure_ascii=False)[:80]}')
    print(f'{len(k.changes)} field(s) changed')
    if k.missing:
        print('Not in the global client yet (left alone): ' + '; '.join(k.missing))
    for n in k.notes:
        print('  note: ' + n)
    if a.dry_run or not k.changes:
        return
    for name in TABLES:
        save(os.path.join(DB, name + '.json'), t[name])
    save(GLOSSARY, glossary)
    for table, renames in k.renames.items():
        if not renames:
            continue
        with open(NAME_LISTS[table], encoding='utf-8') as f:
            js = f.read()
        for old, new in renames.items():
            js = js.replace(f"'{old}'", f"'{new}'")
        with open(NAME_LISTS[table], 'w', encoding='utf-8', newline='') as f:
            f.write(js)
        print(f'Renamed in {os.path.relpath(NAME_LISTS[table], ROOT)}: '
              + ', '.join(f'{o} -> {n}' for o, n in renames.items()) + ' (check bosses.json / ac-guide.json links too)')


if __name__ == '__main__':
    main()
