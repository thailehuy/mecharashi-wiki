import json, os, re

DIR = os.path.dirname(os.path.abspath(__file__))

RAW_FIELDS = [
    'ID', 'name', 'quality', 'weight', 'BackpackMainType',
    'AssemblableAirmenType', 'icon', 'HowGet', 'RelatedDescription',
    'AmountOfRepair',
]

# ── Crafting material decomposition ─────────────────────────────────────────
# UR composites are named "{base prefix}{干扰|强化}背包·{suffix}" in CN; SSSR
# items reference their UR predecessor in RelatedDescription as
# "旧式{base prefix}{干扰|强化}背包的改良升级款" and carry the same suffix in
# their own skill name. Mirrors data/backpacks/build_translations_ur.py.
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

JAMMER_BY_SUFFIX = {
    '攻击': '60500104', '命中': '60500204', '回避': '60500304', '暴击': '60500404',
    '暴伤': '60500504', '护甲': '60500604', '增伤': '60500704',
}

AMPLIFIER_BY_SUFFIX = {
    '再攻击': '60600104', '追击': '60600204', '警戒': '60600304', '首攻': '60600404',
    '反击': '60600504', '弹道': '60600604', '协力': '60600704', '援护': '60600804',
}

RELATED_DESC_PREDECESSOR_RE = re.compile(r'旧式(.+?)(干扰|强化)背包')

# One SSSR skill (维护者驱动·抗暴) uses a stylized suffix instead of the
# canonical one used everywhere else (暴击); normalize it before lookup.
SUFFIX_ALIASES = {'抗暴': '暴击'}

MATERIALS_BASE = 'materials/'


def modifier_id_for_suffix(suffix):
    suffix = SUFFIX_ALIASES.get(suffix, suffix)
    return JAMMER_BY_SUFFIX.get(suffix) or AMPLIFIER_BY_SUFFIX.get(suffix)


def parse_ur_cn_name(cn_name):
    for prefix, base_id in BASE_BY_PREFIX.items():
        if cn_name.startswith(prefix):
            rest = cn_name[len(prefix):]
            break
    else:
        return None
    if not (rest.startswith('干扰') or rest.startswith('强化')):
        return None
    suffix = rest.split('·')[-1]
    modifier_id = modifier_id_for_suffix(suffix)
    return (base_id, modifier_id) if modifier_id else None


def parse_sssr_predecessor(related_description_cn, skill_name_cn):
    # Base prefix comes from the leading "旧式{prefix}{干扰|强化}背包" phrase.
    # The combo keyword there isn't always reliable (e.g. 侵猎者背包 says 强化
    # but its actual predecessor is a Jammer item), so the modifier is instead
    # resolved directly from the skill's own suffix against both tables.
    m = RELATED_DESC_PREDECESSOR_RE.search(related_description_cn or '')
    if not m:
        return None
    base_id = BASE_BY_PREFIX.get(m.group(1))
    if not base_id:
        return None
    suffix = skill_name_cn.split('·')[-1] if '·' in (skill_name_cn or '') else None
    modifier_id = modifier_id_for_suffix(suffix) if suffix else None
    return (base_id, modifier_id) if modifier_id else None


def material_item(backpack_id, qty=1, composite=False):
    m = {'kind': 'item', 'id': backpack_id, 'qty': qty}
    if composite: m['composite'] = True
    return m


def material_generic(icon, label, qty=1, composite=False):
    m = {'kind': 'generic', 'icon': MATERIALS_BASE + icon, 'label': label, 'qty': qty}
    if composite: m['composite'] = True
    return m


def apply_translation(entry, t):
    if t.get('name'):
        entry['name'] = t['name']
    if t.get('RelatedDescription'):
        entry['RelatedDescription'] = t['RelatedDescription']
    if t.get('skills') and entry.get('skill'):
        tr = t['skills'].get(entry['skill'].get('ID', ''))
        if tr:
            for k, v in tr.items():
                if v: entry['skill'][k] = v


raw = json.load(open(os.path.join(DIR, 'detail-cn.json'), 'r', encoding='utf-8'))

# First pass: index UR composites by (base_id, modifier_id) so SSSR entries
# can look up their specific UR predecessor for crafting materials.
ur_lookup = {}
for b in raw:
    if b.get('quality') != 'UR':
        continue
    d = ((b.get('detail') or {}).get('data') or {}).get('data')
    if not d:
        continue
    parsed = parse_ur_cn_name(d.get('name', ''))
    if parsed:
        ur_lookup[parsed] = b['ID']

backpacks = []
for b in raw:
    detail = b.get('detail')
    if not detail:
        continue
    d = (detail.get('data') or {}).get('data')
    if not d:
        continue

    entry = {f: d[f] for f in RAW_FIELDS if d.get(f) is not None}
    entry['icon'] = d.get('BackpackIcon') or d.get('icon', '')

    skills = d.get('WithPassiveSkills') or []
    if skills:
        sk = skills[0]
        entry['skill'] = {
            'ID': sk.get('ID', ''),
            'name': sk.get('name', ''),
            'icon': sk.get('SkillIcon') or sk.get('icon', ''),
            'SpecificEffects': sk.get('SpecificEffects', ''),
        }

    if entry.get('quality') == 'UR':
        parsed = parse_ur_cn_name(d.get('name', ''))
        if parsed:
            base_id, modifier_id = parsed
            entry['crafting'] = [
                material_item(base_id),
                material_item(modifier_id),
                material_generic('random-sr.png', 'Random A-Grade Backpack', 3),
                material_generic('precision-blueprint.png', 'Precision Quality Blueprint'),
            ]
    elif entry.get('quality') == 'SSSR':
        predecessor = parse_sssr_predecessor(d.get('RelatedDescription', ''), (skills[0]['name'] if skills else ''))
        ur_id = ur_lookup.get(predecessor) if predecessor else None
        if ur_id:
            entry['crafting'] = [
                material_item(ur_id, composite=True),
                material_generic('random-ssr.png', 'Random Composite Backpack', composite=True),
                material_generic('random-ssr.png', 'Random S-Grade Backpack', 3),
                material_generic('ac-blueprint.png', 'AC Blueprint'),
            ]

    t_path = os.path.join(DIR, f"{b['ID']}-translation.json")
    if os.path.exists(t_path):
        t = json.load(open(t_path, 'r', encoding='utf-8'))
        apply_translation(entry, t)
        entry['enTranslation'] = True
    else:
        entry['enTranslation'] = False

    backpacks.append(entry)

order = {'SSSR': 0, 'UR': 1, 'SSR': 2, 'SR': 3, 'R': 4}
backpacks.sort(key=lambda b: (order.get(b.get('quality', ''), 9), b.get('BackpackMainType', ''), b.get('name', '')))

out = {'backpacks': backpacks}
with open(os.path.join(DIR, 'compiled.json'), 'w') as f:
    json.dump(out, f, indent=2)
js = 'var BackpacksData = ' + json.dumps(out) + ';\n'
with open(os.path.join(DIR, 'compiled.js'), 'w') as f:
    f.write(js)

print(f'Compiled {len(backpacks)} backpacks ({len(js)//1024} KB)')
