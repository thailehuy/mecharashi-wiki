import json, glob, os, re
from collections import Counter

DIR = os.path.dirname(os.path.abspath(__file__))
MECHS_DIR = os.path.join(DIR, '..', 'mechs')

NUM_RE = re.compile(r'<color=#F74848>([^<]*)</color>')
ROMAN_SUFFIX_RE = re.compile(r'[Ⅰ-Ⅸ]+$')  # Ⅰ-Ⅸ
CLAUSE_SPLIT_RE = re.compile(r'[；;\n]')

# Standalone (PropertyS) weapon-type modules aren't part of any mech's fixed
# kit — they're equipped by player choice on whichever ST carries a matching
# weapon, so no mech's translation file will ever reference them. Their
# effect is a simple, uniform "+X%" (or "-X%") per level, so we hand-author
# the English template here instead of waiting for one to show up in-game.
MANUAL_TEMPLATES = {
    '浮游炮模组':   {'name': 'Cutter Mod',       'template': 'Cutter DMG <color=#F74848>+3%</color>.'},
    '刀剑模组':     {'name': 'Blade Mod',        'template': 'Alter-Blade DMG <color=#F74848>+3%</color>.'},
    '电锯模组':     {'name': 'Chainsaw Mod',     'template': 'Chainsaw DMG <color=#F74848>+3%</color>.'},
    '喷火器模组':   {'name': 'Flamethrower Mod', 'template': 'Flamethrower DMG <color=#F74848>+3%</color>.'},
    '反战术模组':   {'name': 'Anti-AoE Mod',     'template': 'DMG Taken from AoE Attacks <color=#F74848>-3%</color>.'},
    '反狙击模组':   {'name': 'Anti-Sniper Mod',  'template': 'DMG Taken from Sniper Weapons <color=#F74848>-3%</color>.'},
    '反格斗模组':   {'name': 'Anti-Melee Mod',   'template': 'DMG Taken from Melee Weapons <color=#F74848>-3%</color>.'},
    '反突击模组':   {'name': 'Anti-Assault Mod', 'template': 'DMG Taken from Assault Weapons <color=#F74848>-3%</color>.'},
    '检修模组':     {'name': 'Maintenance Mod',  'template': 'Backpack Repair AMT <color=#F74848>+3%</color>.'},
    '电磁炮模组':   {'name': 'Rail Gun Mod',      'template': 'Rail Gun DMG <color=#F74848>+3%</color>.'},
    '火箭模组':     {'name': 'Rocket Mod',       'template': 'Rocket DMG <color=#F74848>+3%</color>.'},
    '导弹模组':     {'name': 'Missile Mod',      'template': 'Missile DMG <color=#F74848>+3%</color>.'},
    '轻型步枪模组': {'name': 'Light Rifle Mod',  'template': 'Light Rifle DMG <color=#F74848>+3%</color>.'},
    '狙击步枪模组': {'name': 'Sniper Rifle Mod', 'template': 'Sniper Rifle DMG <color=#F74848>+3%</color>.'},
    '重机枪模组':   {'name': 'HMG Mod',           'template': 'Heavy Machine Gun DMG <color=#F74848>+3%</color>.'},
    '机枪模组':     {'name': 'MG Mod',            'template': 'Machine Gun DMG <color=#F74848>+3%</color>.'},
    '霰弹枪模组':   {'name': 'Shotgun Mod',       'template': 'Shotgun DMG <color=#F74848>+3%</color>.'},
    '长柄模组':     {'name': 'Polearm Mod',      'template': 'Polearm DMG <color=#F74848>+3%</color>.'},
    '拳套模组':     {'name': 'Knuckle Mod',      'template': 'Knuckle DMG <color=#F74848>+3%</color>.'},
    '打桩机模组':   {'name': 'Pile Bunker Mod',  'template': 'Pile Bunker DMG <color=#F74848>+3%</color>.'},
}

# These families are equipped and translated on real mechs, but aren't in the
# SSR module catalog scrape at all (confirmed: the detail API returns nothing
# for their IDs — they're a different tier/category the site doesn't cover
# yet), so there's no per-level CN ladder to substitute from. Each one only
# has translations at 2 known levels (2 and max/8), but at BOTH of those the
# family's main scaling number exactly matches the standard 8-level
# 3/4/6/8/10/12/14/18% progression used across every other confirmed "18% at
# max" module on the site — so the remaining levels are filled in using that
# same, already-established curve rather than guessed from nothing.
STANDARD_18_CURVE = ['3%', '4%', '6%', '8%', '10%', '12%', '14%', '18%']
SYNTHETIC_18_FAMILIES = {'3034', '3045', '3027', '3031', '3036', '3033', '3040'}


def primary_clause(text):
    """Some modules unlock an extra clause only at their max level (e.g.
    "...DMG Taken -18%; HP >= 50%: DMG +20%"). That bonus clause is always
    separated from the main effect by a semicolon or newline, and we have no
    English template for it — so we only ever read numbers from the text
    before the first separator, and drop the bonus clause entirely rather
    than risk misaligning its numbers with the template's tags."""
    return CLAUSE_SPLIT_RE.split(text or '', maxsplit=1)[0]


def extract_nums(text):
    return NUM_RE.findall(text or '')


def extract_primary_nums(text):
    """Like extract_nums, but for raw CN text only — restricted to the
    primary clause so a max-level-only bonus clause's numbers never get
    counted (see primary_clause())."""
    return NUM_RE.findall(primary_clause(text))


def has_bonus_clause_pattern(levels):
    """True only when the clause separator (；/;/\\n) shows up EXCLUSIVELY on
    the final level — the "extra effect unlocked at max level" pattern. Some
    modules instead use that same separator to join two clauses that are
    both part of the core effect at every level (e.g. a flat bonus plus a
    stacking bonus); for those, every level must be read in full or the
    second clause's numbers get silently dropped."""
    non_final_has_sep = any(CLAUSE_SPLIT_RE.search(lv['SpecificEffects'] or '') for lv in levels[:-1])
    final_has_sep = bool(CLAUSE_SPLIT_RE.search(levels[-1]['SpecificEffects'] or ''))
    return final_has_sep and not non_final_has_sep


def compute_affixes(cn_num, en_num):
    """Figure out what non-numeric prefix/suffix the translator added around a
    raw CN number (e.g. CN "10%" -> EN "+10%" has prefix "+"), so later levels'
    raw numbers can be re-wrapped with the same affix."""
    if en_num.endswith(cn_num):
        return en_num[:-len(cn_num)] if cn_num else en_num, ''
    if en_num.startswith(cn_num):
        return '', en_num[len(cn_num):] if cn_num else en_num
    return '', ''


def build_local_index():
    """Scan every mech's raw + translation JSON to find every module ever
    equipped in-game (local ID = family code + level digit), its raw CN name,
    and (if translated) its English name/effect at that specific level."""
    raw_files = [
        f for f in glob.glob(os.path.join(MECHS_DIR, '[0-9]*.json'))
        if not f.endswith('-translation.json')
    ]
    local_modules = {}
    for rf in raw_files:
        try:
            data = json.load(open(rf, encoding='utf-8'))['data']['data']
        except Exception:
            continue
        if not isinstance(data, list):
            data = [data]
        for part in data:
            for mc in (part.get('ModuleCarried') or []):
                if isinstance(mc, dict) and mc.get('ID') and mc['ID'] not in local_modules:
                    local_modules[mc['ID']] = {
                        'family': mc.get('id'),
                        'level': int(mc.get('level') or 0),
                        'cn_name': mc.get('name'),
                        'cn_text': mc.get('SpecificEffects'),
                        'icon': mc.get('SkillIcon') or mc.get('icon'),
                    }
            manji = part.get('manji') or {}
            for mc in (manji.get('ModuleCarried') or []):
                if isinstance(mc, dict) and mc.get('ID') and mc['ID'] not in local_modules:
                    local_modules[mc['ID']] = {
                        'family': mc.get('id'),
                        'level': int(mc.get('level') or 0),
                        'cn_name': mc.get('name'),
                        'cn_text': mc.get('SpecificEffects'),
                        'icon': mc.get('SkillIcon') or mc.get('icon'),
                    }

    en_by_local_id = {}
    for tf in glob.glob(os.path.join(MECHS_DIR, '*-translation.json')):
        d = json.load(open(tf, encoding='utf-8'))
        for lid, mod in (d.get('modules') or {}).items():
            if lid not in en_by_local_id:
                en_by_local_id[lid] = {'name': mod.get('name'), 'effect': mod.get('SpecificEffects')}

    return local_modules, en_by_local_id


def substitute(en_template, cn_template_nums, cn_level_nums, allow_trailing_bonus=False):
    """Positionally substitute a level's raw CN numbers into the EN template's
    <color> tags. Exact tag-count matches are always safe. A level with
    exactly one EXTRA trailing number (only allowed for the final level, a
    common "bonus unlocked at max level" pattern) is substituted for its
    shared leading tags and the untranslatable trailing bonus is dropped.
    Any other count mismatch is refused — the CN clause structure may have
    changed in a way that isn't safe to guess positionally (e.g. a leading
    tag removed rather than a trailing one added).

    The EN template itself may have MORE tags than cn_template_nums when it
    was translated from the bonus-including max level (English prose has no
    reliable separator to strip that trailing clause the way primary_clause()
    does for CN, so the extra tag(s) ride along) — that's fine for the final
    level (where the bonus clause is real), but for every other level we
    truncate the template right after its shared leading tags so that
    untranslatable, level-8-only bonus text doesn't get claimed at levels
    that don't actually have it."""
    en_matches = list(NUM_RE.finditer(en_template))
    if len(en_matches) < len(cn_template_nums):
        raise ValueError('template tag count mismatch (template EN/CN texts disagree)')
    en_nums = [m.group(1) for m in en_matches]

    if len(cn_level_nums) == len(cn_template_nums):
        common = len(cn_template_nums)
    elif allow_trailing_bonus and len(cn_level_nums) == len(cn_template_nums) + 1:
        common = len(cn_template_nums)
    else:
        raise ValueError('level tag count does not match template (unsafe to substitute)')

    if not allow_trailing_bonus:
        anchor = en_matches[common - 1].end() if common > 0 else 0
        sep_match = CLAUSE_SPLIT_RE.search(en_template, anchor)
        if sep_match:
            # A literal separator survived translation (e.g. CN "；" kept as
            # English ";") — cut there. This also catches bonus clauses with
            # no numeric tag of their own (tag-counting alone can't see them).
            en_template = en_template[:sep_match.start()]
        elif len(en_matches) > common:
            cutoff = en_matches[common - 1].end()
            if cutoff < len(en_template) and en_template[cutoff] == '.':
                cutoff += 1
            en_template = en_template[:cutoff]

    affixes = [compute_affixes(c, e) for c, e in zip(cn_template_nums[:common], en_nums[:common])]
    it = iter(zip(cn_level_nums[:common], affixes))
    state = {'i': 0}

    def repl(m):
        if state['i'] >= common:
            return m.group(0)
        state['i'] += 1
        num, (pre, suf) = next(it)
        return '<color=#F74848>' + pre + num + suf + '</color>'

    return NUM_RE.sub(repl, en_template)


def main():
    list_cn = json.load(open(os.path.join(DIR, 'list-cn.json'), encoding='utf-8'))['data']['data']
    scraped = json.load(open(os.path.join(DIR, 'modules-raw.json'), encoding='utf-8'))
    local_modules, en_by_local_id = build_local_index()

    names_by_family = {}
    for info in local_modules.values():
        names_by_family.setdefault(info['family'], set()).add(info['cn_name'])

    catalog_by_id = {c['ID']: c for c in list_cn}

    modules = {}
    skipped_untranslated = []
    skipped_unmatched = []
    fallback_families = []
    static_families = []

    for entry in scraped:
        catalog_id = entry['ID']
        family = catalog_id[:-1]
        levels = entry['detail']['data']['data']['WithPassiveSkills']
        cn_name = ROMAN_SUFFIX_RE.sub('', levels[0]['name'])

        manual = MANUAL_TEMPLATES.get(cn_name)
        if cn_name not in names_by_family.get(family, set()) and not manual:
            skipped_unmatched.append(cn_name)
            continue

        max_level_lid = None
        if manual:
            # No mech carries this module (it's a player-equipped standalone
            # weapon mod), so there's no in-game translation to derive from —
            # use the hand-authored template, referenced against level 1.
            en_template = manual['template']
            en_name = manual['name']
            tinfo = {'level': 1}
            num_extractor = extract_primary_nums if has_bonus_clause_pattern(levels) else extract_nums
            cn_template_nums = num_extractor(levels[0]['SpecificEffects'])
        else:
            candidates = [
                (lid, info) for lid, info in local_modules.items()
                if info['family'] == family and lid in en_by_local_id
            ]
            if not candidates:
                skipped_untranslated.append(cn_name)
                continue

            num_extractor = extract_primary_nums if has_bonus_clause_pattern(levels) else extract_nums

            # Some families change their main clause's structure partway
            # through the level range (e.g. an early "at full HP" phrasing
            # with no number, replaced by an explicit "HP >= X%" threshold
            # from some level onward). A single global template can't cover
            # both regimes, so group levels by their own tag count and, for
            # each regime, use whichever translated candidate (if any) is
            # itself in that regime — only levels in a regime with no
            # translated example at all fall back to the closest available
            # template (the most common regime's).
            level_counts = [len(num_extractor(lv['SpecificEffects'])) for lv in levels]
            mode_count = Counter(level_counts).most_common(1)[0][0]
            regime_templates = {}
            for lid, info in candidates:
                regime = level_counts[info['level'] - 1]
                regime_templates.setdefault(regime, (lid, info))

            default_lid, default_tinfo = regime_templates.get(mode_count, candidates[0])
            en_name = en_by_local_id[default_lid]['name']
            tinfo = default_tinfo

            # If some mech's translation happens to cover this module at its
            # exact max level, that text is a complete, hand-translated
            # description INCLUDING the bonus clause unlocked at that level —
            # use it verbatim there instead of substituting into the
            # (bonus-less) template, so the bonus clause actually gets shown.
            max_level_lid = next(
                (lid for lid, info in local_modules.items()
                 if info['family'] == family and info['level'] == len(levels) and lid in en_by_local_id),
                None
            )

        level_effects = {}
        had_fallback = False
        for i, lv in enumerate(levels, 1):
            if i == len(levels) and max_level_lid:
                level_effects[str(i)] = en_by_local_id[max_level_lid]['effect']
                continue

            if manual:
                lvl_en_template, lvl_cn_template_nums = en_template, cn_template_nums
            else:
                t_lid, t_info = regime_templates.get(level_counts[i - 1], (default_lid, default_tinfo))
                lvl_en_template = en_by_local_id[t_lid]['effect']
                lvl_cn_template_nums = num_extractor(levels[t_info['level'] - 1]['SpecificEffects'])

            cn_level_nums = num_extractor(lv['SpecificEffects'])
            try:
                level_effects[str(i)] = substitute(
                    lvl_en_template, lvl_cn_template_nums, cn_level_nums,
                    allow_trailing_bonus=(i == len(levels))
                )
            except ValueError:
                level_effects[str(i)] = lvl_en_template
                had_fallback = True
        if had_fallback:
            fallback_families.append(cn_name)
        if len(set(level_effects.values())) == 1 and len(levels) > 1:
            static_families.append(cn_name)

        catalog = catalog_by_id.get(catalog_id, {})
        modules[family] = {
            'name': en_name,
            'icon': catalog.get('icon', entry.get('icon')),
            'category': catalog.get('IconType', entry.get('IconType')),
            'maxLevel': len(levels),
            'currentLevel': tinfo['level'],
            'levels': level_effects,
        }

    synthesized_families = []
    for family in SYNTHETIC_18_FAMILIES:
        instances = sorted(
            (info for info in local_modules.values() if info['family'] == family),
            key=lambda info: info['level']
        )
        max_lid = next(
            (lid for lid, info in local_modules.items()
             if info['family'] == family and info['level'] == 8 and lid in en_by_local_id),
            None
        )
        if not instances or not max_lid:
            continue

        cn_name = instances[-1]['cn_name']
        en_template = en_by_local_id[max_lid]['effect']
        en_name = en_by_local_id[max_lid]['name']
        cn_template_nums = extract_primary_nums(instances[-1]['cn_text'])

        level_effects = {}
        for i in range(1, 9):
            cn_level_nums = cn_template_nums[:-1] + [STANDARD_18_CURVE[i - 1]]
            if i == 8:
                level_effects[str(i)] = en_template
            else:
                level_effects[str(i)] = substitute(en_template, cn_template_nums, cn_level_nums)

        modules[family] = {
            'name': en_name,
            'icon': instances[-1]['icon'],
            'category': 'GeneralSuit',
            'maxLevel': 8,
            'currentLevel': 8,
            'levels': level_effects,
        }
        synthesized_families.append(cn_name)

    out = {'modules': modules}
    with open(os.path.join(DIR, 'compiled.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    js = 'var ModulesData = ' + json.dumps(out, ensure_ascii=False) + ';\n'
    with open(os.path.join(DIR, 'compiled.js'), 'w', encoding='utf-8') as f:
        f.write(js)

    print(f'Compiled {len(modules)} module families  ({len(js)//1024} KB)')
    if synthesized_families:
        print(f'  {len(synthesized_families)} families aren\'t in the SSR catalog scrape at all, but were '
              f'synthesized from the standard 18%-at-max curve since their known levels matched it: '
              f'{", ".join(synthesized_families)}')
    if fallback_families:
        print(f'  {len(fallback_families)} families had at least one level with an unsafe tag-count '
              f'mismatch (fell back to the template text for that level): {", ".join(fallback_families)}')
    if static_families:
        print(f'  {len(static_families)} families show IDENTICAL text at every level (only one '
              f'translated instance exists and its structure doesn\'t match other levels), '
              f'needs a fresh translation to differentiate: {", ".join(static_families)}')
    if skipped_untranslated:
        print(f'  {len(skipped_untranslated)} SSR families skipped (no EN translation on any mech yet): '
              f'{", ".join(skipped_untranslated)}')
    if skipped_unmatched:
        print(f'  {len(skipped_unmatched)} SSR catalog entries have no matching in-use local family '
              f'(likely unused SSR modules): {", ".join(skipped_unmatched)}')


if __name__ == '__main__':
    main()
