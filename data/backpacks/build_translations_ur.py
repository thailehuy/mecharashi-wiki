"""Derive translations for the 98 UR "composite" backpacks.

Composite = a base backpack (Manipulator/Power Bank/Accelerator/Inducer/
Jetpack/Mini Radar/Ammo Crate/Mirage Generator) fused with either a Jammer or
an Amplifier sub-type. Verified against detail-cn.json that the composite's
ability text is exactly:

    <base's own effect line(s), minus its own filler>
    <modifier's own effect line, minus its own filler>
    <base's own filler line, if it has one>

(Ammo has no filler line of its own, matching Manipulator; the rest all end
with "ST Body's HP +10%, DMG Dealt +5%.") The modifier's own filler ("ST's
Body HP +10%.") is always dropped in favor of the base's.

Name/skill-name/flavor text are synthesized from the already-translated base
and modifier files using the same phrasing pattern observed in the CN
RelatedDescription field.
"""
import json
import os
import re

DIR = os.path.dirname(os.path.abspath(__file__))

BASE_BY_PREFIX = {
    '修理': '60700104',  # Manipulator / Heal
    '出力': '60100104',  # Power Bank / PowerAdd
    '移动': '60200104',  # Accelerator / MovePointAdd
    '诱导': '60300104',  # Inducer / Interference
    '飞行': '60400104',  # Jetpack / Flow
    '雷达': '60800104',  # Mini Radar / Radar
    '弹药': '60900104',  # Ammo Crate / Ammo
    '隐形': '61000104',  # Mirage Generator / Invisible
}

# Mirrors BACKPACK_TYPE_LABEL in js/pages/backpacks.js -- keep in sync.
BASE_TYPE_LABEL = {
    '60700104': 'Repair',
    '60100104': 'Power',
    '60200104': 'Maneuver',
    '60300104': 'Signal',
    '60400104': 'Jet',
    '60800104': 'Radar',
    '60900104': 'Ammo',
    '61000104': 'Stealth',
}

JAMMER_BY_SUFFIX = {
    '攻击': ('60500104', 'ATK'),
    '命中': ('60500204', 'Hit'),
    '回避': ('60500304', 'Dodge'),
    '暴击': ('60500404', 'Crit'),
    '暴伤': ('60500504', 'Crit DMG'),
    '护甲': ('60500604', 'Armor'),
    '增伤': ('60500704', 'DMG UP'),
}

AMPLIFIER_BY_SUFFIX = {
    '再攻击': ('60600104', 'Re-ATK'),
    '追击':   ('60600204', 'Flurry Strike'),
    '警戒':   ('60600304', 'Vigilant'),
    '首攻':   ('60600404', 'First Strike'),
    '反击':   ('60600504', 'Retaliation'),
    '弹道':   ('60600604', 'Ballistics'),
    '协力':   ('60600704', 'Link'),
    '援护':   ('60600804', 'Guard'),
}

BASE_FILLER_RE = re.compile(r"^ST Body'?s? HP <color=#F74848>\+10%</color>")
MOD_FILLER_RE  = re.compile(r"^ST'?s Body HP <color=#F74848>\+10%</color>\.$")


def load_translation(backpack_id):
    path = os.path.join(DIR, f'{backpack_id}-translation.json')
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def split_effect(t):
    """Return (core_lines, filler_line_or_None) for a skill's SpecificEffects."""
    lines = t.split('\n')
    if BASE_FILLER_RE.match(lines[-1]) or MOD_FILLER_RE.match(lines[-1]):
        return lines[:-1], lines[-1]
    return lines, None


def parse_ur_name(cn_name):
    for prefix, base_id in BASE_BY_PREFIX.items():
        if cn_name.startswith(prefix):
            rest = cn_name[len(prefix):]
            break
    else:
        return None

    if rest.startswith('干扰'):
        combo = 'Jammer'
        table = JAMMER_BY_SUFFIX
    elif rest.startswith('强化'):
        combo = 'Amplifier'
        table = AMPLIFIER_BY_SUFFIX
    else:
        return None

    suffix = rest.split('·')[-1] if '·' in rest else rest.split('·')[-1]
    if suffix not in table:
        return None
    modifier_id, tag = table[suffix]
    return base_id, combo, modifier_id, tag


def main():
    with open(os.path.join(DIR, 'detail-cn.json'), 'r', encoding='utf-8') as f:
        entries = json.load(f)
    ur_entries = [e for e in entries if e['quality'] == 'UR']

    written, skipped = 0, []
    for entry in ur_entries:
        parsed = parse_ur_name(entry['name'])
        if not parsed:
            skipped.append(entry)
            continue
        base_id, combo, modifier_id, tag = parsed

        base_t = load_translation(base_id)
        mod_t  = load_translation(modifier_id)

        base_skill = next(iter(base_t['skills'].values()))
        mod_skill  = next(iter(mod_t['skills'].values()))

        base_core, base_filler = split_effect(base_skill['SpecificEffects'])
        mod_core, _mod_filler  = split_effect(mod_skill['SpecificEffects'])

        combined_lines = base_core + mod_core
        if base_filler:
            combined_lines.append(base_filler)
        effect = '\n'.join(combined_lines)

        composite_skill_id = entry['detail']['data']['data']['WithPassiveSkills'][0]['ID']
        composite_skill_name = f"{base_skill['name']} · {tag}"
        composite_name = f"{BASE_TYPE_LABEL[base_id]} {mod_t['name']}"

        verb = 'affects the enemy\'s' if combo == 'Jammer' else 'enhances the ST\'s'
        base_flavor = base_t.get('RelatedDescription', '').rstrip('.')
        related_description = (
            f"{base_flavor}. Also integrates a function that {verb} {tag} capability."
            if base_flavor else ''
        )

        out = {'name': composite_name}
        if related_description:
            out['RelatedDescription'] = related_description
        out['skills'] = {
            composite_skill_id: {
                'name': composite_skill_name,
                'SpecificEffects': effect,
            }
        }

        path = os.path.join(DIR, f"{entry['ID']}-translation.json")
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write('\n')
        written += 1

    print(f'Wrote {written} translation files.')
    if skipped:
        print(f'Could not parse {len(skipped)} entries:')
        for e in skipped:
            print(' ', e['ID'], e['name'])


if __name__ == '__main__':
    main()
