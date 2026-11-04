#!/usr/bin/env python3
"""Builds llms-full.txt (and the short llms.txt index) at the site root:
the wiki's pilots, STs, weapons, backpacks, modules, accessories, effects,
glossary, EX skills, bosses, banners and dispatch table as one plain-text
Markdown file for people to upload to ChatGPT, Claude, Gemini etc. and ask
questions too complex for a search box. Linked from the AI Help page (aihelp/).

Reads the compiled bundles, so run it after scripts/compile.py:

    python3 scripts/build_llm_context.py
"""
import json
import os
import re
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))
from build_pages import slugify, terrain_name, DEFAULT_SITE_URL  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.environ.get('SITE_URL', DEFAULT_SITE_URL)


def load(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return json.load(f)


def global_version():
    with open(os.path.join(ROOT, 'js/app.js'), encoding='utf-8') as f:
        m = re.search(r'GLOBAL_VERSION\s*=\s*([\d.]+)', f.read())
    return m.group(1) if m else '?'


def text(s):
    """Game rich text -> plain text; keyword tags keep their [Bracketed] name."""
    s = s or ''
    s = re.sub(r'<terr(?:ian|ain) ID=(\d+)\s*/>', lambda m: f'[{terrain_name(m.group(1))}]', s)
    s = re.sub(r'<b>(.*?)</b>', r'\1', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'[ \t]+', ' ', s)
    return re.sub(r'\n\s*', ' / ', s.strip())


def url(route, name=None):
    return SITE + route + '/' + (slugify(name) + '/' if name else '')


def skill_line(sk, label=None):
    name = sk.get('name') or '?'
    bits = []
    if sk.get('type'):
        bits.append({'EquipmentSkill': 'Active', 'SpecialAssault': 'Special Active'}.get(sk['type'], sk['type']))
    if sk.get('Ap') not in (None, ''):
        bits.append(f'{sk["Ap"]} AP')
    if sk.get('CD') not in (None, '', '0'):
        bits.append(f'CD {sk["CD"]}')
    head = (label + ': ' if label else '') + f'**{name}**' + (f' ({", ".join(bits)})' if bits else '')
    body = text(sk.get('SpecificEffects') or sk.get('describe') or sk.get('description') or sk.get('effect'))
    return f'- {head}: {body}' if body else f'- {head}'


# ---------------------------------------------------------------- sections

def pilots(out):
    P = load('data/pilots/compiled.json')['pilots']
    out.append(f'# Pilots ({len(P)})\n')
    for p in sorted(P, key=lambda p: p['PilotName']):
        s = p.get('stats', {})
        out.append(f'## Pilot: {p["PilotName"]}')
        out.append(f'Rarity {p["quality"]} | Class {p["Profession"]} | Occupation {p["Occupation"]} | '
                   f'ST license {p.get("AllowedMechaDriveList_DriveAllowedList", "?")} | '
                   f'Gender {p.get("Gender", "?")} | Real name {p.get("RealName", "?")} | '
                   f'Added in v{p.get("version", "?")} | ID {p["ID"]} | {url("pilots", p["PilotName"])}')
        if s:
            out.append('Max stats: ' + ', '.join(f'{k} {v}' for k, v in [
                ('Combat', s.get('Combat')), ('Assault', s.get('Assault')), ('Shooting', s.get('Shooting')),
                ('Tactics', s.get('Tactics')), ('Defense', s.get('Defense')), ('Engineering', s.get('Engineering')),
                ('Initial AP', s.get('InitialPilotAPValue_PilotAPInitBase')),
                ('AP cap', s.get('MaximumPilotAPValue_PilotAPMaxBase')),
                ('AP regen/turn', s.get('PilotAPRecoveryperTurn_PilotAPRecoverBase'))] if v))
        if p.get('Introduction'):
            out.append('Intro: ' + text(p['Introduction']))
        out.append('Talent:')
        out.append(skill_line(p['Talent0_2Ability'], 'Rank 0-2'))
        if text(p['Talent3_5Ability'].get('SpecificEffects')) != text(p['Talent0_2Ability'].get('SpecificEffects')):
            out.append(skill_line(p['Talent3_5Ability'], 'Rank 3+ (upgraded)'))
        sk = [b['skill'] for b in p.get('biomimetic_computer_data', []) if b.get('UnitType') == '0' and b.get('skill')]
        if sk:
            out.append('Skills (Bionic Computer):')
            out += [skill_line(x) for x in sk]
        core = [b['skill'] for b in p.get('biomimetic_computer_data', []) if b.get('UnitType') == '6' and b.get('skill')]
        if core:
            out.append(skill_line(core[0], 'Class core'))
        parts = (p.get('NeuralDriveTemplate') or {}).get('ListChipPartition') or []
        if parts:
            out.append('Neural Drive partitions:')
            for part in parts:
                eff = '; '.join(f'at {e["MinimumSum"]}: {e["PassiveSkill"]["name"]} — {text(e["PassiveSkill"].get("SpecificEffects"))}'
                                for e in part.get('ListActivationEffects', []) if e.get('PassiveSkill'))
                out.append(f'- {part["name"]} (slots {part.get("ListAssembled", "?")}): {eff}')
        if p.get('summonSkills'):
            out.append('Summon skills:')
            out += [skill_line(x) for x in p['summonSkills']]
        for g in p.get('formSkillGroups', []):
            out.append(f'{g["title"]}:')
            for grp in g.get('groups', []):
                out += [skill_line(x, grp.get('label')) for x in grp.get('skills', [])]
        out.append('')


def mechs(out):
    M = load('data/mechs/compiled.json')['mechs']
    out.append(f'# STs (mechs) ({len(M)})\n')
    for m in sorted(M, key=lambda m: m['name']):
        out.append(f'## ST: {m["name"]}')
        line = (f'Rarity {m["quality"]} | Weight class {m["type"]} | Firepower {m.get("output")} | '
                f'Added in v{m.get("version", "?")} | ID {m["ID"]}')
        if m.get('dispatchGroup'):
            line += f' | Dispatch group {m["dispatchGroup"]} (v{m.get("dispatchVersion", "?")})'
        out.append(line + f' | {url("sts", m["name"])}')
        for pt in m.get('parts', []):
            st = ', '.join(f'{k} {pt[k]}' for k, lbl in [('aircraftWeight', 0), ('maxHp', 0), ('Armor', 0), ('Hit', 0), ('Dodge', 0), ('Antiriot', 0)] if pt.get(k))
            out.append(f'- Part {pt["position"]}: {st.replace("aircraftWeight", "Weight").replace("maxHp", "HP").replace("Antiriot", "Anti-riot")}')
        if m.get('modules'):
            out.append('Modules:')
            out += [f'- {x["name"]} (Lv {x.get("level", "?")}): {text(x.get("SpecificEffects"))}' for x in m['modules']]
        for h in m.get('hiddenModules', []):
            out.append(f'- Hidden module {h["name"]} ({h.get("part", "")}): {text(h.get("SpecificEffects"))}')
        if m.get('introduce'):
            out.append('Intro: ' + text(m['introduce']))
        out.append('')


def weapons(out):
    W = load('data/weapons/compiled.json')['weapons']
    out.append(f'# Weapons ({len(W)})\n')
    for w in sorted(W, key=lambda w: w['name']):
        out.append(f'## Weapon: {w["name"]}')
        bits = [f'Rarity {w["quality"]}', f'Type {w["type"]} ({w.get("WeaponType1", "")})',
                f'Slot {w.get("RestrictionsPositionOfWeapon")}', f'For {w.get("LimitedModelOfWeapon")} STs',
                f'Range {w.get("range")}', f'Weight {w.get("WeaponWeight")}', f'Base ATK {w.get("WeaponBasicAttackingPower")}']
        if w.get('ShieldbloodBase'):
            bits.append(f'Shield {w["ShieldbloodBase"]}')
        if w.get('pilot'):
            bits.append(f'Signature weapon of {w["pilot"]}')
        if w.get('version'):
            bits.append(f'v{w["version"]}')
        if w.get('ac'):
            bits.append(f'Armed Conquest {w["ac"]} reward')
        out.append(' | '.join(bits) + f' | {url("weapons", w["name"])}')
        out += [skill_line(x, 'Passive') for x in w.get('PassiveSkill', [])]
        if w.get('crafting'):
            out.append('Crafting: ' + ', '.join(f'{c.get("qty", 1)}x {c.get("label", c.get("id"))}' for c in w['crafting']))
        if w.get('describe'):
            out.append('Description: ' + text(w['describe']))
        out.append('')


def backpacks(out):
    B = load('data/backpacks/compiled.json')['backpacks']
    out.append(f'# Backpacks ({len(B)})\n')
    for b in sorted(B, key=lambda b: (b['name'], b['quality'])):
        out.append(f'## Backpack: {b["name"]} ({b["quality"]})')
        bits = [f'Type {b.get("BackpackMainType")}', f'For {b.get("AssemblableAirmenType")} STs', f'Weight {b.get("weight")}']
        if b.get('version'):
            bits.append(f'v{b["version"]}')
        if b.get('ac'):
            bits.append(f'Armed Conquest {b["ac"]} reward')
        out.append(' | '.join(bits) + f' | {url("backpacks", b["name"] + "/" + b["quality"])}')
        if b.get('skill'):
            out.append(skill_line(b['skill'], 'Skill'))
        if b.get('crafting'):
            out.append('Crafting: ' + ', '.join(f'{c.get("qty", 1)}x {c.get("label", c.get("id"))}' for c in b['crafting']))
        out.append('')


def modules(out):
    M = load('data/modules/compiled.json')['modules']
    items = M.values() if isinstance(M, dict) else M
    out.append(f'# Modules ({len(items)})\n')
    for m in sorted(items, key=lambda m: m['name']):
        out.append(f'## Module: {m["name"]}')
        out.append(f'Category {m.get("category")} | Max level {m.get("maxLevel")} | {url("modules", m["name"].lower())}')
        for lv, t in sorted((m.get('levels') or {}).items(), key=lambda kv: int(kv[0])):
            out.append(f'- Lv {lv}: {text(t)}')
        out.append('')


def accessories(out):
    A = load('data/accessories/compiled.json')['accessories']
    out.append(f'# Accessories ({len(A)})\n')
    out.append('Triggers (TA) and Reactions (RA) fitted to weapons; each weapon takes 4, at least 1 TA + 1 RA. '
               '"Found in Clearance Ops" lists the CO chapters that drop them.\n')
    for a in sorted(A, key=lambda a: a.get('en_name') or a['name']):
        out.append(f'## Accessory: {a.get("en_name") or a["name"]}')
        bits = [f'Grade {a.get("grade")}', f'Kind {a.get("en_type") or a.get("type")}', a.get('level', '')]
        if a.get('cos'):
            bits.append('Found in Clearance Ops ' + ', '.join(map(str, a['cos'])))
        out.append(' | '.join(b for b in bits if b))
        out.append('Effect: ' + text(a.get('en_describe') or a.get('describe')))
        if a.get('notes'):
            out.append('Notes: ' + text(a['notes']))
        out.append('')


def effects(out):
    E = load('data/effects/effects.json')['effects']
    out.append(f'# Effects: buffs, debuffs and other ({len(E)})\n')
    out.append('Each effect keyword ([Bracketed] in skill text), its meaning, and who carries it '
               '(unit type: name, via which skill).\n')
    kinds = {'buff': 'Buff', 'debuff': 'Debuff', 'other': 'Other'}
    for e in sorted(E, key=lambda e: e['name']):
        out.append(f'## Effect: [{e["name"]}] ({kinds.get(e.get("kind"), e.get("kind", ""))}{", boss only" if e.get("boss") else ""})')
        out.append(text(e.get('effect')))
        for v in e.get('variants', []) or []:
            out.append('Variant: ' + text(v if isinstance(v, str) else v.get('effect', '')))
        carriers = []
        for c in e.get('carriers', []):
            via = '; '.join(f'{s.get("k", "")} {s.get("n", "")}'.strip() for s in c.get('s', []))
            carriers.append(f'{c.get("t")}: {c.get("u")}' + (f' ({via})' if via else ''))
        if carriers:
            out.append('Carried by: ' + ' | '.join(carriers))
        out.append('')


def glossary(out):
    G = load('data/glossary.json')
    out.append('# Glossary: skill and terrain keywords\n')
    for k, v in sorted(G.get('skill', {}).items(), key=lambda kv: kv[1].get('name', '')):
        out.append(skill_line(v, 'Skill'))
    for k, v in sorted(G.get('terrain', {}).items(), key=lambda kv: kv[1].get('name', '')):
        out.append(skill_line(v, 'Terrain'))
    out.append('')
    X = load('data/exskills.json')['exskills']
    out.append('# EX skills (universal basic attacks per weapon type)\n')
    for x in X:
        out.append(skill_line({**x, 'type': x.get('type')}, f'Weapons {x.get("Wpn")}'))
    out.append('')


def bosses(out):
    B = load('data/bosses/bosses.json')

    def stage(s, hp_line):
        out.append(f'### Slot {s.get("slot")}: {s["boss"]} piloting {s.get("mech")} ({s.get("cls")})' +
                   (f' — "{s["title"]}"' if s.get('title') else ''))
        out.append(hp_line)
        for sk in s.get('skills', []):
            out.append(f'- {sk.get("kind", "").title()} **{sk["name"]}**: {text(sk.get("description"))}')
            for bf in sk.get('buffs', []) or []:
                out.append(f'  - [{bf["name"]}]: {text(bf.get("description"))}')

    out.append('# Armed Conquest seasons (boss line-ups)\n')
    for season in B['armed_conquest']:
        out.append(f'## Armed Conquest {season["number"]}: {season["name"]} (v{season.get("version", "?")}) | {url("armedconquest", season["name"])}')
        for s in season['stages']:
            hp = '; '.join(f'{d}: body {h["body"]}, arm {h["arm"]}, legs {h["legs"]}' for d, h in (s.get('hp') or {}).items())
            stage(s, 'HP — ' + hp)
        out.append('')
    out.append('# Clearance Ops chapters (boss line-ups)\n')
    for ch in B['clearance_ops']:
        out.append(f'## Clearance Ops {ch["chapter"]}: {ch["name"]} | {url("clearanceops", ch["name"])}')
        for s in ch['stages']:
            h = s.get('hp') or {}
            stage(s, f'HP — body {h.get("body")}, arm {h.get("arm")}, legs {h.get("legs")}')
        out.append('')


def banners(out):
    B = load('data/banners/banners.json')['banners']
    out.append('# Gacha banners\n')
    out.append(load('data/banners/banners.json').get('note', '') + '\n')
    for b in B:
        bits = [f'{b.get("kind", "").upper()} banner', b.get('type', '')]
        if b.get('version'):
            bits.append(f'v{b["version"]}')
        for k in ('start', 'end'):
            if b.get(k):
                bits.append(f'{k} {b[k]}')
        if b.get('featured'):
            bits.append('featured: ' + ', '.join(b['featured']))
        if b.get('selectable'):
            bits.append('selectable: ' + ', '.join(b['selectable']))
        for t in ('new', 'rerun', 'upcoming'):
            if b.get(t):
                bits.append(t)
        out.append(f'- {b["name"]}: ' + ' | '.join(x for x in bits if x))
    out.append('')


def dispatch(out):
    D = load('data/dispatch.json')['dispatch']
    out.append('# Dispatch table (ST per dispatch group, by CN patch)\n')
    for r in D:
        out.append(f'- Patch {r.get("cnPatch")}: ' + ', '.join(f'{k} {v}' for k, v in r.items() if k != 'cnPatch'))
    out.append('')


HEADER = """# Mecharashi Wiki — full content for AI assistants

Source: {site} (fan wiki, not affiliated with the game's developers or publishers).
Built {today} from the wiki's data; the global server is on v{ver}. Entries
with a later version are not out on global yet. If the wiki and this file
disagree, the wiki is newer.

How to read this file:
- Mecharashi is a turn-based tactics game. You field PILOTS who drive STs (mechs).
  Each ST has Body, L-Arm, R-Arm and Legs parts with their own HP, and carries
  weapons, a backpack and modules. Weapons take accessories (Triggers and Reactions).
- Rarity, lowest to highest: R, SR, SSR, SSSR/UR.
- Words in [square brackets] are game keywords. Their meanings are in the
  Effects and Glossary sections.
- Every entry ends its first line with its wiki URL. Cite it when answering.
- Numbers are max-level values unless stated otherwise.

Sections: Pilots, STs, Weapons, Backpacks, Modules, Accessories, Effects,
Glossary, EX skills, Armed Conquest, Clearance Ops, Banners, Dispatch.
"""

INDEX = """# Mecharashi Wiki

> Fan wiki for the tactics game Mecharashi: pilots, STs (mechs), weapons, backpacks,
> modules, accessories, effects, bosses, events and game modes. Global server v{ver}.

The complete content as one text file, for AI assistants: {site}llms-full.txt
How to use it with ChatGPT, Claude or Gemini: {site}aihelp/

## Main pages
- [Pilots]({site}): every pilot, their talents, skills and Neural Drive
- [STs]({site}sts/): every ST with part stats and modules
- [Weapons]({site}weapons/)
- [Backpacks]({site}backpacks/)
- [Modules]({site}modules/)
- [Accessories]({site}accessories/)
- [Effects]({site}effects/): every buff and debuff and who carries it
- [Bosses]({site}bosses/): Armed Conquest and Clearance Ops
- [Banner List]({site}banners/)
"""


def main():
    ver = global_version()
    out = [HEADER.format(site=SITE, today=date.today().isoformat(), ver=ver)]
    for section in (pilots, mechs, weapons, backpacks, modules, accessories, effects, glossary, bosses, banners, dispatch):
        section(out)
    body = '\n'.join(out).rstrip() + '\n'
    with open(os.path.join(ROOT, 'llms-full.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(body)
    with open(os.path.join(ROOT, 'llms.txt'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(INDEX.format(site=SITE, ver=ver))
    print(f'llms-full.txt: {len(body):,} chars (~{len(body) // 4:,} tokens)')


if __name__ == '__main__':
    main()
