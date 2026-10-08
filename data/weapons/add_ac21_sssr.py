"""One-off script: add the 2 AC21 SSSR pilot weapons (Hardaway, Maat) from the
weapons spreadsheet. Same approach as add_ac20_sssr.py: hand-built raw entries
with placeholder passive IDs (9xxxx), pilot-based placeholder names where the
weapon/skill name is unknown, and no stats beyond grip/range.
Existing weapons are never modified.
"""
import json
import os

from add_ac20_sssr import colorize

DIR = os.path.dirname(os.path.abspath(__file__))

VERSION = '3.7'
AC = 21

TYPES = {
    'Rocket': {'WeaponType1': 'Heavy', 'label': 'Rocket Launcher', 'grip': 'Shoulder',   'range': '3-6'},
    'Saw':    {'WeaponType1': 'Melee', 'label': 'Chainsaw',        'grip': 'DoubleHand', 'range': '1（可斜向）'},
}

SKILL_NAMES = ('Equipped Passive', 'Carried Passive', 'Used Passive')

# (equipped, carried, used) descriptions, from the spreadsheet (unofficial
# translations). Talent/glossary names follow the wiki's existing wording
# (e.g. the sheet's "Total Calculation" is Hardaway's [Complete Calculation]).
# `tags` maps a [Name] to the full tag that replaces it, applied after the
# "Enhanced [talent]" substitution.
WEAPONS = [
    {
        'ID': '40215123', 'type': 'Rocket', 'pilot': 'Hardaway', 'icon': 'Icon_weapon_40200501',
        'talent': ('401250', 'Complete Calculation'),
        'tags': {
            'Structural Damage': '<buf ID=4012502>[Structural Damage]</buf>',
            'Extra Strike': '<buf ID=900031>[Extra Strike]</buf>',
        },
        'skillIds': ('90022', '90023', '90024'),
        'skillIcons': ('Icon_skill_passive_4127', 'Icon_skill_passive_5331', 'Icon_skill_passive_1135'),
        'skills': (
            "When actively attacking targets with debuffs with a Rocket Launcher, Hit Rate and Crit Rate +20%.",
            "Enhanced [Complete Calculation]: At the start of the turn, inflicts all enemy units on the battlefield with 1 stack of [Structural Damage]. "
            "This effect doubles against bosses. When attacking with a Rocket Launcher, for every 1 stack of [Structural Damage] the target possesses, "
            "Skill Multiplier +0.01, up to +0.12. After the enemy unit is initiated against in combat, can ignore distance and perform [Extra Strike], "
            "dealing 0.1 AoE DMG to all enemy units in a <color=#F74848>3x3</color> tile range, and inflicts hit targets with 1 stack of [Structural Damage]. "
            "Can trigger up to 3 times per turn.",
            "When HP is full, Rocket Launcher DMG +20%.",
        ),
    },
    {
        'ID': '10815123', 'type': 'Saw', 'pilot': 'Maat', 'icon': 'Icon_weapon_50100602',
        'talent': ('101950', 'Corrupting Shadow'),
        'tags': {
            # Outside "Enhanced [...]", [Corrupting Shadow] is the talent's active strike.
            'Corrupting Shadow': '<skill activeSkill=1019512>[Corrupting Shadow]</skill>',
            'Vengeful Edge': '<buf ID=5009234>[Vengeful Edge]</buf>',
            'Armor Down III': '<buf ID=7101703>[Armor Down III]</buf>',
        },
        'skillIds': ('90025', '90026', '90027'),
        'skillIcons': ('Icon_skill_passive_1103', 'Icon_skill_passive_5332', 'Icon_skill_passive_1122'),
        'skills': (
            "When actively attacking with a Chainsaw, for every 1 enemy unit within a 2 tile radius, Hit Rate and DMG +5%, up to 20%.",
            "Enhanced [Corrupting Shadow]: When moving, ignores enemy unit obstruction. When activating [Corrupting Shadow], "
            "if the target already has Armor Down, effect increases by 1 level, up to [Armor Down III]. For every 1 enemy unit with "
            "[Vengeful Edge] on the battlefield, Chainsaw attack multiplier +0.06, up to +0.24.",
            "When actively attacking enemies with damaged parts, DMG and Crit Rate +15%.",
        ),
    },
]


def render(text, w):
    text = colorize(text)
    talent_id, talent_name = w['talent']
    text = text.replace(f'Enhanced [{talent_name}]', f'Enhanced \0')
    for tag, full in w['tags'].items():
        text = text.replace(f'[{tag}]', full)
    return text.replace('\0', f'<skill mainSkill={talent_id}>[{talent_name}]</skill>')


def main():
    raw_path = os.path.join(DIR, 'sssr-raw.json')
    tr_path = os.path.join(DIR, 'sssr-translations.json')
    raw = json.load(open(raw_path, 'r', encoding='utf-8'))
    tr = json.load(open(tr_path, 'r', encoding='utf-8'))
    existing = {w['ID'] for w in raw}

    added = 0
    for w in WEAPONS:
        if w['ID'] in existing or w['ID'] in tr:
            print(f"SKIP {w['ID']} ({w['pilot']}): already exists")
            continue
        t = TYPES[w['type']]
        name = w.get('name') or f"{w['pilot']}'s {t['label']}"
        base = {
            'ID': w['ID'], 'name': name, 'quality': 'SSSR',
            'WeaponType1': t['WeaponType1'], 'WeaponType2': w['type'],
            'type': w['type'], 'icon': w['icon'],
        }
        passives = []
        for i, sid in enumerate(w['skillIds']):
            icon = w['skillIcons'][i]
            passives.append({
                'ID': sid, 'name': SKILL_NAMES[i], 'SpecificEffects': '',
                'SkillIcon': icon, 'icon': icon, 'Status': 1, 'weight': int(sid),
            })
        detail = dict(base, PassiveSkill=passives, grade='70',
                      LimitedModelOfWeapon='Light/Medium/Heavy',
                      RestrictionsPositionOfWeapon=t['grip'], range=t['range'])
        raw.append(dict(base, detail={'data': {'data': [detail]}, 'status': 1, 'switch': None, 'info': 0}))
        tr[w['ID']] = {
            'name': name,
            'passiveSkills': {
                sid: {'name': SKILL_NAMES[i], 'SpecificEffects': render(w['skills'][i], w)}
                for i, sid in enumerate(w['skillIds'])
            },
            'pilot': w['pilot'],
            'ac': AC,
            'version': VERSION,
        }
        added += 1

    with open(raw_path, 'w', encoding='utf-8') as f:
        json.dump(raw, f, indent=2, ensure_ascii=False)
    with open(tr_path, 'w', encoding='utf-8') as f:
        json.dump(tr, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'Added {added} weapons.')


if __name__ == '__main__':
    main()
