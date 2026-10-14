<!--
Mech intake form — fill this in and hand it back; Claude will turn it into
rows in the data/db/ tables (see data/README.md "Adding an ST") and run
compile.py.

- Leave a field blank / delete a line if it doesn't apply (e.g. no modules
  carried by a given part).
- Module entries: copy the block for each module the part carries.
- Icon names = the CDN image keys used elsewhere in this repo, OR the local
  file names under data/unlisted/mechs/ (see **Images** below) — reuse an
  existing CDN key if a similar mech already has one, or use the new local
  filenames if this mech's art is only available locally.

Checklist for whoever (or whichever agent) turns this into table rows:

1. data/db/mechs.json row keyed by the Body part ID (8-digit, unused —
   check mechs.json and mech_parts.json). Its `parts` list names 4
   data/db/mech_parts.json rows in Body / L-Arm / R-Arm / Legs order; the
   non-Body parts can use `<ID>_ARM_L` / `<ID>_ARM_R` / `<ID>_LEGS`.
2. Part rows hold the max-level stats below: `weight`/`hp`/`armor`
   on every part; `antiriot` on Body only; `hit` on both arms; `dodge` on
   Legs only. The mech row's `output` is the Body's weight capacity and
   `firepower` the max-level Firepower.
3. `icon` (listing-grid/detail thumbnail) and `portrait_icon`/`mecha_icon`
   (CDN-only keys, leave out if there's no CN CDN asset) go on the mech row,
   as does `introduce` (flavor text).
4. `modules` is a list of `{ "family": "<id>", "level": <n> }` pointing at
   data/db/modules.json. A module "same as others" reuses that family. A
   genuinely new module needs a NEW, unused family ID — reusing an in-use
   family silently swaps in a real module's text (this happened once). If
   it's listed on the Modules page (`category` set), the intake text must
   give the FULL per-level ladder (every level's numbers, e.g. "3/6/9/15%"
   for a 4-level module) so each level row has its own `effect` — otherwise
   the level slider shows blank text below max.
5. Images: every `icon` referenced should exist as a file under
   `data/unlisted/mechs/Icon/<Type>/` (grid/detail thumbnail) and, for a
   full detail-page portrait, `data/unlisted/mechs/Raw/<Type>/` — check
   with `ls` before using one. The site tries the local file first and
   only falls back to the CN CDN if that 404s. If there are alternate-skin
   files under `data/unlisted/mechs/Skins/<Type>/` (named
   `Img_Skin_<wap-id>_<variant>.png`), list each `<variant>` token in the
   mech row's `skins`.
6. Set `version` (and `dispatch_version`/`dispatch_group` if known), run
   `python3 compile.py` (it fails on any broken ID reference) and confirm
   the mech shows up in `data/mechs/compiled.json`.
-->

## Basics
<!-- → data/db/mechs.json row -->

- Mech ID: <8-digit numeric Body part ID, check data/db/mechs.json and mech_parts.json for collisions>
- Mech Name: Nivequus                      <!-- name -->
- Type (weight class): Light               <!-- type: Light / Medium / Heavy -->
- Quality: SSR                             <!-- quality -->
- Game version introduced: 3.7             <!-- version -->
- Dispatch version: 3.8                    <!-- dispatch_version (+ dispatch_group if known) -->
- Flavor text / lore description:          <!-- introduce -->

## Images
<!-- icon is prefixed with data/unlisted/mechs/Icon/<Type>/ -->
<!-- portrait (Raw) is prefixed with data/unlisted/mechs/Raw/<Type>/ -->
<!-- alternate skins (if any) are prefixed with data/unlisted/mechs/Skins/<Type>/ -->
- Icon file: Icon_mecha_wap1071.png        <!-- icon (without .png) -->
- Portrait/Raw file: Icon_mecha_wap1071_SN_Raw.png  <!-- found from `icon`, no field needed -->
- CDN mecha icon (only if a CN CDN asset exists): Icon_wap1071_1      <!-- mecha_icon -->
- CDN portrait key (only if a CN CDN asset exists): icon_lihui_wap1071 <!-- portrait_icon -->
- Alternate skins (list each variant token you have a
  `Img_Skin_wap1071_<variant>.png` file for, or "none"): none        <!-- skins -->

## Max-level stats
<!-- Each part → one data/db/mech_parts.json row (Body / L-Arm / R-Arm / Legs).
     HP → hp, Weight → weight, Armor → armor, Crit RES → antiriot,
     Hit → hit, Dodge → dodge. Body's Firepower → the mech row's `firepower`,
     Body's Output → the mech row's `output` (weight capacity).
     Per-part Firepower and Move aren't stored (not displayed). -->

### Body
- HP: 10120
- Firepower: 1215
- Weight: 275
- Output: 1575
- Crit RES: 4472
- Armor: 706

### L-Arm
- HP: 4976
- Weight: 90
- Armor:
- Hit: 1974

### R-Arm
- HP: 4976
- Weight: 90
- Armor:
- Hit: 1974

### Legs
- HP: 8368
- Weight: 170
- Armor:
- Dodge: 5233
- Move: 4

## Modules
<!-- Copy this block for each module the ST carries. Each one → a
     { "family": "<id>", "level": <n> } entry in the mech row's `modules`;
     a new module also needs a data/db/modules.json family (see checklist 4). -->
### Module 1
- Name: Frostedge Amplifier
- Level: 4/4
- Effect text: DMG Dealt increases by 4/8/1420%. When actively attacking, if the target is in a straight line with this unit, DMG Dealt additionally increases by 3/6/10/15% <!-- numbers must be wrapped as <color=#F74848>NUMBER</color>, same convention as pilot skill text, record the different level effect based on the numbers split -->
- Icon name: Icon_skill_passive_5238

### Module 2
- Name: Firepower Module
- Level: 4/4
- Effect text: Same as others, family 4027 level 4 (ID 40274)
- Icon name: Same as others

### Module 3
- Name: First Strike Module
- Level: 8/8
- Effect text: If 2 or less allies have acted, DMG Dealt increases by 4/6/8/10/14/16/18/24%.\nWhen attacking with two Melee weapons, skill multiplier increases by +0.1.<!-- numbers must be wrapped as <color=#F74848>NUMBER</color>, same convention as pilot skill text, record the different level effect based on the numbers split -->
- Icon name: Icon_entry_10001

### Glossary buf 1
<!-- Pick an unused ID for the <buf> tag, add the entry to data/glossary.json (`buf`), and tag every reference in this ST's module text -->

### Glossary skill 1
<!-- Pick an unused ID for the <skill> tag, add the entry to data/glossary.json (`skill`), and tag every reference in this ST's module text -->
<!-- Also scan the skill text itself and link necessary tags -->
