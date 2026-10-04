"""One-off script: add the 5 AC20 SSSR pilot weapons (Wataru, Toraoh, Zoey,
Audrey, Lexuan) from the weapons spreadsheet. They are not in the CN API yet,
so like HMG-29C / False Smile they are hand-built raw entries with placeholder
passive IDs (9xxxx). Where the weapon name is unknown, a pilot-based
placeholder is used, and likewise for skill names. Stats other than
grip/range (which are fixed per weapon type) are left out until real data is
available.
Existing weapons are never modified.
"""
import json
import os
import re

DIR = os.path.dirname(os.path.abspath(__file__))

VERSION = '3.6'
AC = 20

TYPES = {
    'Blade':       {'WeaponType1': 'Melee',   'label': 'Alter-Blade',  'grip': 'Hand',       'range': '1（可斜向）'},
    'ShotGun':     {'WeaponType1': 'Assault', 'label': 'Shotgun',      'grip': 'Hand',       'range': '1-2'},
    'Rod':         {'WeaponType1': 'Melee',   'label': 'Polearm',      'grip': 'DoubleHand', 'range': '1（可斜向）'},
    'HeavySniper': {'WeaponType1': 'Sniper',  'label': 'Sniper Rifle', 'grip': 'DoubleHand', 'range': '2-4'},
    'MachineGun':  {'WeaponType1': 'Assault', 'label': 'Machine Gun',  'grip': 'Hand',       'range': '1-3'},
}

# (equipped, carried, used) descriptions, from the spreadsheet (unofficial translations)
WEAPONS = [
    {
        'ID': '10915122', 'type': 'Blade', 'pilot': 'Wataru', 'icon': 'Icon_weapon_10700701',
        'talent': ('101850', 'World Savior'),
        'name': 'Radiant Dragon Blade',
        'talentIcon': 'Icon_skill_talent_9601', 'skillIds': ('90007', '90008', '90009'),
        'skillIcons': ('Icon_skill_passive_5115', None, 'Icon_skill_passive_1101'),
        'skillNames': ('Prismatic Flow', 'Heroic Radiance', 'Heart Of Courage'),
        'skills': (
            "When actively attacking with an Alter-Blade, if consumed greater than or equal to 5 AP, CD Turns -1 for 1 skill on cooldown. Can only trigger 1 time per turn.",
            "Enhanced [World Savior]: Talent range expands to the entire map. For every 1 buff carried, DMG +5%, up to 30%. When actively attacking, if HP is full, target cannot be guarded or trigger Large Shield [Target Shift].",
            "When in combat, DMG +15%. When in combat against a boss, additionally DMG +15%.",
        ),
    },
    {
        'ID': '20315123', 'type': 'ShotGun', 'pilot': 'Toraoh', 'icon': 'Icon_weapon_20300501',
        'talent': ('201950', 'Demon Prince'),
        'name': 'Shadow Tiger Roar',
        'tags': {'Tiger Might': '2019506'},
        'talentIcon': 'Icon_skill_talent_9501', 'skillIds': ('90010', '90011', '90012'),
        'skillIcons': ('Icon_skill_passive_5142', None, 'Icon_skill_passive_5150'),
        'skillNames': ('Two Roars - One Hunt', 'Tiger Soul Radiance', 'Heart Of Rebel'),
        'skills': (
            "When simultaneously using two Shotguns, Bullets +3.",
            "Enhanced [Demon Prince]: Max [Tiger Might] stacks +3. For every stack of [Tiger Might], DMG Taken -3%. If possessing at least 5 stacks of [Tiger Might], AP Regen +1.",
            "When actively attacking, if possessing at least 3 buffs, DMG +20%.",
        ),
    },
    {
        'ID': '10315124', 'type': 'Rod', 'pilot': 'Zoey', 'icon': 'Icon_weapon_10300601',
        'talent': ('601150', 'Fearless Hunting Fang'),
        'name': 'Void Severance',
        'talentIcon': 'Icon_skill_talent_5155', 'skillIds': ('90013', '90014', '90015'),
        'skillIcons': ('Icon_skill_passive_1181', None, 'Icon_skill_passive_5187'),
        'skillNames': ('Mighty Swing', 'Predator Hunt', 'Menace'),
        'skills': (
            "When attacking with a Polearm, DMG +15%, Hit Rate +10%. This effect doubles during the enemy turn.",
            "Enhanced [Fearless Hunting Fang]: When sortied, gains 2 stacks of [Advantage]. Stacks up to 3 times. At the end of action, for every 1 enemy within a 6 tile range inflicted with [Provocation], gains 1 stack of [Advantage]. When attacking with a Polearm, deals 35% Splash DMG to another part with the lowest HP percentage. For every 1 enemy inflicted with [Provocation] within a 6 tile range, attack multiplier +0.05, up to 0.2.",
            "After attacking, inflicts target with [Hit Rate Down III] and [Dodge Rate Down II], lasting for 1 turn.",
        ),
    },
    {
        'ID': '30215124', 'type': 'HeavySniper', 'pilot': 'Audrey', 'icon': 'Icon_weapon_30200304',
        'talent': ('301350', 'Iron-blooded Commander'),
        'name': 'Conquest',
        'talentIcon': 'Icon_skill_talent_5157', 'skillIds': ('90016', '90017', '90018'),
        'skillIcons': ('Icon_skill_passive_5208', None, 'Icon_skill_passive_4118'),
        'skillNames': ('Battle Rhythm', 'Boundless Conquest', 'Disciplined Formation'),
        'tags': {'Shatter Mark': '900172'},
        'skills': (
            "When actively attacking with a Sniper Rifle, if more than 2 Hits, immediately regens 1 AP. Can only trigger 1 time per turn.",
            "Enhanced [Iron-blooded Commander]: [Ricochet] +1. Proportion of [Ricochet] DMG +5%. For every enemy targeted by [Ricochet], additionally inflicts 1 stack of [Shatter Mark]. Can stack up to 10 times.",
            "When actively attacking, if there are allies within 3 tiles, Hit Rate and Crit Rate +10%.",
        ),
    },
    {
        'ID': '20115124', 'type': 'MachineGun', 'pilot': 'Lexuan', 'icon': 'Icon_weapon_20100602',
        'talent': ('202050', 'Saturated Fire'),
        'name': 'Rapid Gatling',
        'tags': {'Overcharged Bullet': '2020505', 'Weapon Skill': '900153'},
        'talentIcon': 'Icon_skill_talent_5159', 'skillIds': ('90019', '90020', '90021'),
        'skillIcons': ('Icon_skill_passive_5142', None, 'Icon_skill_passive_1126'),
        'skillNames': ('Extended Ammo Belt', 'Bullet Frenzy', 'Synchronized Firepower'),
        'skills': (
            "Machine Gun Bullets +1, additionally +1 if triggering [Link Attack]. Effect cannot trigger multiple times.",
            "Enhanced [Saturated Fire]: When [Overcharged Bullet] is at least 80 stacks, Machine Gun attack Multiplier +0.05, DMG and Hit Rate +10%. When using [Weapon Skill], this effect doubles. When sortied, gains 20 stacks of [Overcharged Bullet].",
            "When simultaneously attacking with two weapons, ignores 35% of target's Armor.",
        ),
    },
]

SKILL_NAMES = ('Equipped Passive', 'Carried Passive', 'Used Passive')
SKILL_ICONS = ('Icon_skill_passive_1146', None, 'Icon_skill_passive_1114')  # None = pilot talent icon

NUM_RE = re.compile(r'(?<![\w.\-+])([+-]?\d+(?:\.\d+)?(?:%|x)?)(?!\w|\.\d)')


def colorize(text):
    return NUM_RE.sub(r'<color=#F74848>\1</color>', text)


def render(text, tags, talent=None):
    text = colorize(text)
    for tag, buf_id in tags.items():
        text = text.replace(f'[{tag}]', f'<buf ID={buf_id}>[{tag}]</buf>')
    if talent:
        talent_id, talent_name = talent
        text = text.replace(f'Enhanced [{talent_name}]', f'Enhanced <skill mainSkill={talent_id}>[{talent_name}]</skill>')
    return text


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
            icon = w.get('skillIcons', SKILL_ICONS)[i] or w['talentIcon']
            passives.append({
                'ID': sid, 'name': w.get('skillNames', SKILL_NAMES)[i], 'SpecificEffects': '',
                'SkillIcon': icon, 'icon': icon, 'Status': 1, 'weight': int(sid),
            })
        detail = dict(base, PassiveSkill=passives, grade='70',
                      LimitedModelOfWeapon='Light/Medium/Heavy',
                      RestrictionsPositionOfWeapon=t['grip'], range=t['range'])
        raw.append(dict(base, detail={'data': {'data': [detail]}, 'status': 1, 'switch': None, 'info': 0}))
        tr[w['ID']] = {
            'name': name,
            'passiveSkills': {
                sid: {'name': w.get('skillNames', SKILL_NAMES)[i], 'SpecificEffects': render(w['skills'][i], w.get('tags', {}), w['talent'])}
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
