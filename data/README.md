# Wiki data (`data/db/`)

All pilot, ST, module, weapon and backpack data lives in `data/db/` as one
JSON table per entity, with the final English text the pages display. There
are no raw API dumps or translation files any more. To change what the wiki
shows, edit the table row and recompile from the repo root:

```
python3 scripts/compile.py
```

This rebuilds `data/{pilots,mechs,modules,weapons,backpacks}/compiled.{json,js}`
(the bundles the pages load), `glossary.js`/`dispatch.js`/`exskills.js`, and
the builder index maps. The deploy workflow also runs it on every push, so an
edited table goes live even if you forget, but run it locally to check your
change. It stops with a list of errors if a row references an ID that doesn't
exist.

The pre-migration sources (CN dumps, `-translation.json` files, scrapers) are
in git history under the tag `pre-db`.

Before writing English text or stats by hand, check the mined global-client
database (`data/screenshots/MRT_FieldWiki/source/mecharashi.db`). It may already have the
official values. See "Using the mined game database" in the root
[README](../README.md).

## Conventions

- Each table is an object keyed by game ID (a string). The IDs match the
  mined DB's (`pilot_id`, `skill_id`, `part_id`, module `passive_ids`, …).
- Text keeps the game markup: numbers as `<color=#F74848>15%</color>`, linked
  terms as `<buf ID=900004>[Re-ATK]</buf>` / `<skill ID=…>[…]</skill>`. Every
  `[Bracketed]` term needs its ID in `data/glossary.json` (`buf`/`skill`).
  An innate neural core (the Profession Neuron's skill) is tagged
  `<neural ID=…>[…]</neural>` and resolved from `skills.json`.
- Stats are kept as strings, as in the original data.
- Leave out a field rather than writing an empty value.
- Formatting: 2-space indent, `ensure_ascii=False`, trailing newline. Row
  order in the file doesn't matter, except in `modules.json` (see below).
- Some old entries still have CN-only text (backpack `how_get`, some weapon
  `range` values and intros). It's displayed as is.

## Tables

| Table | Key | Row |
|---|---|---|
| `pilots.json` | pilot ID | One pilot. References talents, neural partitions |
| `pilot_lore.json` | pilot ID | The pilot's profile, introduction and stories (Lore tab) |
| `pilot_neurons.json` | pilot ID | The pilot's Bionic Computer board: an ordered list of neurons |
| `neural_partitions.json` | partition ID | One Neural Drive partition (α, β, γ…) and its unlocks |
| `skills.json` | skill ID | Every talent, pilot skill, neural passive and weapon passive |
| `mechs.json` | Body part ID | One ST. References parts, modules |
| `mech_lore.json` | Body part ID | The ST's manufacturer and stories (Lore tab) |
| `mech_parts.json` | part ID | One ST part's max-level stats |
| `modules.json` | module family ID | A module and its text per level |
| `weapons.json` | weapon ID | One weapon. References its passives in `skills.json` |
| `backpacks.json` | backpack ID | One backpack, its skill and crafting materials |
| `materials.json` | material slug | Crafting materials (label + icon) and the recipe of crafted ones |

### `pilots.json`

```json
"10103118": {
  "name": "Ada", "real_name": "Ada Diaz", "gender": "Female",
  "profession": "Striker", "occupation": "Fighter", "quality": "SSR",
  "license": "Light", "version": "2.3",
  "portrait_icon": "Pilot_10103118A_half", "avatar_icon": "Pilot_10103118A_Raw",
  "skins": ["B"],
  "introduction": "…",
  "talents": ["101750", "101751"],
  "stats": { "combat": "5216", "assault": "2339", "shooting": "1455", "tactics": "1897",
             "defense": "4331", "engineering": "1307", "ap_init": "5", "ap_max": "5", "ap_regen": "2" },
  "neural": [
    { "partition": "fighter-alpha", "slots": "Attack/Dodge/Critical" },
    { "partition": "fighter-beta", "slots": "Attack/Critical/Critical" },
    { "partition": "10103118-gamma1", "slots": "…" },
    { "partition": "10103118-gamma2", "slots": "…" }
  ],
  "summon_skills": [ … ], "form_skill_groups": [ … ]
}
```

- `talents`: `[basic, ascended]` skill IDs (`kind: "talent"`).
- `stats`: the max-level values shown on the wiki (Combat = melee, Shooting =
  ranged, Tactics = tactical, Engineering = mechanic).
- `version`: release version, drives the version filter and sort. Defaults to `1.0`.
- `skins`: alternate skin letters; `python3 scripts/check_skins.py`
  fills this in from the assets repo.
- `neural[].slots`: chip slot colours, red = `Attack`, yellow = `Dodge`,
  blue = `Critical`.
- `summon_skills` / `form_skill_groups` (optional) are
  copied to the page as is, in the page's own format (`name`, `icon`, `type`,
  `Ap`, `CD`, `describe`/`SpecificEffects`). See an existing pilot.

### `pilot_lore.json`

```json
"10103118": {
  "affiliation": "Dawnstar League", "blood_type": "AB", "height": "165cm",
  "profile": [ { "label": "Hobbies", "value": "Figure Skating" } ],
  "introduction": "Rosa Díaz's younger sister, …",
  "stories": [
    { "title": "XC 109, December 24", "text": "\"I had that dream again today, …" },
    …,
    { "title": "XC 119, March 9", "text": "…",
      "comment": { "by": "Matilda", "text": "The subsequent search found …" } }
  ]
}
```

Filled in by `python3 scripts/build_lore.py` from the global client's tables
for every pilot on Global. Pilots from v2.6 on that Global lacks take theirs
from the CN client (`data/screenshots/mined/cn/out/stats.db`) in Chinese, with
`"cn": true` (the Lore tab says so); their affiliation, blood type and profile
labels/values use global's English where another pilot's profile has the same
Chinese. `profile` holds the pilot-specific fields of the in-game
Profile, in order. `introduction` is the Profile screen's long bio (the
one-line `introduction` in `pilots.json` is shown instead when a pilot has no
row). `stories` are the four anecdotes; `comment` is the remark some end with,
`by` linking to the pilot of that name if there is one. Paragraphs are split
on `\n`. compile.py writes it to `data/pilots/lore.js`, its own bundle, which
the pilot page fetches when the Lore tab is first opened.

### `mech_lore.json`

```json
"20470103": { "manufacturer": "Laniakea", "stories": [ { "title": "Stolen", "text": "…", "comment": { "by": "Naomi", "text": "…" } }, … ] }
```

Like `pilot_lore.json`, filled in by `build_lore.py` for every ST on Global.
The Lore tab's introduction is the ST's `introduce` from `mechs.json`. STs from
v2.6 on that Global lacks take theirs from the CN client in Chinese, with
`"cn": true`, plus `introduction` (the CN flavor text, shown instead of
`introduce`); `manufacturer` is global's English when global has that
manufacturer.

### `pilot_neurons.json`

```json
"10103118": [
  { "id": "1010311800", "unit": "0", "type": "6", "icon": "Icon_pilotclass_001_l",
    "innate": "100001", "skill": "100001", "cost": "2:1:10801000:2/" },
  { "id": "1010311801", "unit": "17", "type": "5", "icon": "Icon_zoneskill_0003",
    "bonus": "PilotGammaChipBandwidthAdd:3", "cost": "…" },
  …
]
```

List order is display order. `type` `"6"` is the innate Profession Neuron;
its `icon` is the occupation icon and `innate` its skill ID. `skill` points to
`skills.json`. The board layout (`unit`/`type`) is the same for every pilot of
a content revision, so copy the list from a similar pilot and change the
`id`s, `skill`s and `bonus`es. Every SR/SSR pilot has the profession skill
plus 8 neural skills. The game gives 7 of them from neuron units and the 8th,
the starting skill, from the pilot itself (`PilotInfo.InitMainSkillIds` /
`InitPassiveSkillIds`), so the wiki puts it on a neuron of its own,
`<pilot ID>36` (`"unit": "3", "type": "0"`), last in the list: the Builder
encodes a skill by its place in this list, so moving it breaks shared Build
URLs. Hailis's starting skill shares its game ID (800101) with her profession
skill, so the profession skill uses a wiki-only ID (174500; Lustre's is 173500).

### `neural_partitions.json`

```json
"fighter-alpha": {
  "name": "α", "type": "Alpha",
  "effects": [ { "min": "1", "skill": "100011" }, { "min": "4", "skill": "100012" }, … ]
}
```

α and β are shared by every pilot of an occupation (`<occupation>-alpha`,
`<occupation>-beta`; Shifter has a second set, `-2`). Reuse them: a new
pilot only needs its own γ partitions, `<pilotID>-gamma1` and
`<pilotID>-gamma2` (`name` `γ1`/`γ2`, `type` `Gamma`, 6 unlocks at `min`
1/4/7/10/13/16). Some older pilots have a single `γ`.

### `skills.json`

```json
"101704": { "kind": "skill", "name": "Starfall Flash", "describe": "…", "icon": "Icon_skill_order_1172",
            "ap": "3", "cd": "0", "type": "SpecialAssault", "buffs": "…" }
"100011": { "kind": "neural", "name": "Mobile Warfare 2", "effect": "…", "icon": "Icon_skill_passive_5010" }
```

- `kind`: `talent`, `skill` (Bionic Computer skill), `neural` or `weapon` (weapon passive).
- Active skills use `describe`, passives use `effect`.
- `type`: `EquipmentSkill` (weapon attack), `Order` (code),
  `SpecialAssault` (code + attack, including dashes). Leave it out for passives.
- `resource: "PP"` shows the PP badge.
- `buffs`: buff IDs the skill carries (from the game data, not displayed).
- `skill_icon` is only set where the game used a different icon key for
  the skill card than `icon`.
- A skill ID shared by several pilots (e.g. the class-wide CEC skills) has
  one row, so its text is the same everywhere.
- An innate neural core whose game ID is also a main skill's is keyed
  `neural:<ID>`: Shifters' innate core shares its ID with their starting
  skill (Lustre's `neural:800201` Configuration Shift 1 and `800201` Tainted
  Blade / Shadow Ray; Hailis's `neural:800101` and `800101`). The neuron's
  `skill`/`innate` use the same key, and text links it with
  `<neural ID=800201>`.

### `mechs.json` and `mech_parts.json`

```json
"20470103": {
  "name": "Aglow", "type": "Medium", "quality": "SSR", "version": "1.2",
  "icon": "Icon_mecha_wap2047", "mecha_icon": "Icon_wap2047_1", "portrait_icon": "icon_lihui_wap2047",
  "introduce": "…",
  "output": "2725", "firepower": "1098", "fire": "…", "durable": "…", "armor": "…", "antiriot": "…",
  "parts": ["20470103", "20470203", "20470303", "20470403"],
  "modules": [ { "family": "3005", "level": 2 }, … ],
  "skins": ["01"], "dispatch_group": "…", "dispatch_version": "1.4",
  "hidden_modules": [ … ]
}
```

- The key is the Body part's ID.
- `firepower` is the max-level Firepower shown on the page. `fire`,
  `durable`, `armor` and `antiriot` are the Body's base values (`output` =
  weight capacity).
- `parts` are `mech_parts.json` IDs in Body, L-Arm, R-Arm, Legs order.
  Each part row holds its max-level stats: `mech`, `position`
  (`Body`/`L-Arm`/`R-Arm`/`Legs`), `weight`, `hp`, `armor`; plus `antiriot`
  on Body, `hit` on the arms and `dodge` on Legs. Manually added STs can use
  `<ID>_ARM_L` / `<ID>_ARM_R` / `<ID>_LEGS` as part IDs.
- `modules`: family + level from `modules.json`; that level must exist there.
- `skins`: variant tokens of `data/unlisted/mechs/Skins/<Type>/Img_Skin_<wap-id>_<variant>.png`.
- `hidden_modules` (optional) is copied to the page as is.

### `modules.json`

```json
"4032": {
  "name": "Cutter Mod", "icon": "Icon_entry_40311",
  "category": "PropertyS", "max_level": 4, "current_level": 1,
  "levels": { "1": { "effect": "Cutter DMG <color=#F74848>+3%</color>." }, … }
}
"4027": { "name": "Firepower Module", "icon": "Icon_skill_passive_1126",
          "levels": { "4": { "effect": "Firepower +<color=#F74848>10%</color>." } } }
```

- Families with a `category` (`PropertyS`, `SuitS`, `GeneralSuit`) are listed
  on the Modules page, in file order, and need text for every level
  1..`max_level` (the level slider shows each one).
- Families without one exist only for the STs that carry them and only need
  the carried levels.
- A level's game ID is `<family><level>` (e.g. `40274`); a level row sets
  `id` where it differs. A level row sets `icon` where the carried module's
  icon differs from the family's.
- A new module needs a new, unused family ID; reusing one swaps in another
  module's text.

### `weapons.json`

```json
"20414121": {
  "name": "Blaze Howl - B", "quality": "UR", "type1": "Assault", "type2": "Flamethrower",
  "type": "Flamethrower", "icon": "Icon_weapon_20500301",
  "models": "Light/Medium/Heavy", "slot": "Hand", "range": "2", "weight": "480", "atk": "1385",
  "shield": "…", "grade": "70", "hp": "3831", "understanding": "4558",
  "describe": "…", "pilot": "Rosa", "version": "1.2", "ac": 2,
  "passives": ["53037"],
  "crafting": [
    { "material": "dl-bounty-medal-ii", "qty": 8 },
    { "material": "dl-bounty-medal-i", "qty": 4 }
  ]
}
```

`pilot` is the paired pilot's name (signature weapons). `passives` are
`skills.json` IDs (`kind: "weapon"`). `grade`, `hp` and `understanding`
aren't displayed. `crafting` is the Workshop recipe, in the same format as a
backpack's (an SSSR weapon's starts with its UR version as `weapon`).

### `backpacks.json` and `materials.json`

```json
"60902426": {
  "name": "Overload", "quality": "SSSR", "weight": "150", "main_type": "Ammo", "st_type": "Medium",
  "icon": "Icon_backpack_61100101", "version": "3.7", "ac": 21,
  "skill": { "id": "", "name": "Overload Drive · First Strike", "icon": "…", "effect": "…" },
  "crafting": [
    { "backpack": "60902405", "qty": 1, "composite": true },
    { "material": "random-composite", "qty": 1, "composite": true },
    { "material": "random-s-grade", "qty": 3 },
    { "material": "ac-blueprint", "qty": 1 }
  ]
}
```

A backpack's skill is stored inline. A `crafting` entry is a `backpack` ID, a
`weapon` ID or a `materials.json` slug (`material`), with a `qty`;
`composite: true` marks a Composite backpack. `how_get`,
`related_description` and `repair` aren't displayed.

`scripts/build_crafting.py` writes the recipes of everything on Global from
the game's Workshop tables, and the crafted materials (blueprints, Arsenal
Handbooks, Bounty Medals) in `materials.json`. Entries newer than Global
(v2.6+) are kept as they are; the Special backpacks among them still use the
generic `ac-blueprint`. A material has either an `icon` (a file in the assets
repo's `data/backpacks/materials/`) or an `item_icon` (a game item icon in
`data/items/`, extracted by `extract_item_icons.py`), and a crafted one has
its own `crafting` list, shown under the item's recipe.

## Intake forms

After a CN game update, mine the CN client again (`data/screenshots/mined/cn/`)
and run `python3 scripts/build_intake.py`. It writes a form for each pilot and
ST the CN client has and the wiki doesn't (`data/intake/pilot-<ID>.md`,
`data/intake/st-<body part ID>.md`) with everything the game data gives
already filled in: IDs, icons, stats, AP/CD, chip slots, neural partitions,
module levels. Each piece of new Chinese text has an empty `EN:` line under
it, and its `[terms]` are listed with their IDs and, where the wiki has them,
their English names. Text the wiki already has (shared skills, partitions,
modules, glossary terms) is listed by name and needs nothing. Fill in the
`EN:` lines and ask Claude to add the unit from the form; the checklist at
the top of each form lists the mistakes to avoid. Pass IDs to write forms
for specific units, `--version` to fill in the game version, `--full` to
ask for every text even where the wiki has it, and `--force` to overwrite a
form (they're kept otherwise, as they may be half translated).

`python3 scripts/build_item_intake.py` does the same for each new signature
weapon (`data/intake/weapon-<SSSR ID>.md`, with its UR version) and crafted
backpack (`data/intake/backpack-<ID>.md`), with the Workshop recipe already
in `crafting` form and any new material listed for a name.
`python3 scripts/update_cn.py` runs the whole CN update: mining, the banner
list and art, then both intake scripts.

When Global reaches that version, `python3 scripts/update_global.py` mines
the global client and `take_translations.py` swaps the version's fan
translations for the official text (its output lists every change), before
rebuilding recipes, bosses, drops and banners.

## Adding a pilot

Fill in its intake form (above) and ask Claude to add the pilot from it, or
by hand:

1. Use the game's pilot ID.
2. Add the talents, skills and γ neural passives to `skills.json` (reuse
   existing IDs for shared ones, e.g. the class's innate skill).
3. Add `<ID>-gamma1`/`<ID>-gamma2` to `neural_partitions.json`; reference the
   occupation's shared α/β partitions.
4. Copy a similar pilot's list in `pilot_neurons.json` and adapt it.
5. Add the `pilots.json` row, with `version`.
6. Add the pilot's name to `PILOT_RELEASE_ORDER` in `js/pages/pilots.js` if
   it's a new release, then run `python3 scripts/compile.py`.

## Adding an ST

Fill in its intake form (above) and ask Claude to add the ST from it, or by
hand:

1. Use the game's Body part ID.
2. Add 4 `mech_parts.json` rows (Body, L-Arm, R-Arm, Legs).
3. Add any new module to `modules.json` (with every level's text if it's
   shown on the Modules page).
4. Add the `mechs.json` row, with `version`, then run `python3 scripts/compile.py`.

## Images

Icon fields hold image keys, not paths. The pages look for a local copy in
the assets repo first and fall back to the game's CDN:

- Pilots: `data/unlisted/pilot_images_half/<portrait_icon>.png` (thumbnails)
  and `data/unlisted/pilot_images_raw/<avatar_icon>.png` (detail art).
- STs: `data/unlisted/mechs/Icon/<Type>/<icon>.png` and
  `data/unlisted/mechs/Raw/<Type>/<icon without "Icon_mecha_">_SN_Raw.png`.
  `mecha_icon` has no local fallback (and isn't displayed).
- Skills, talents and neural passives: `data/unlisted/pilot_skills/<icon>.png`.
  Check the file exists before using a key.
- Modules: `data/unlisted/mech_modules/<icon>.png`, except those reusing a
  pilot passive's icon (`Icon_skill_*`), which come from
  `data/unlisted/pilot_skills/` (don't copy them into `mech_modules/`).
