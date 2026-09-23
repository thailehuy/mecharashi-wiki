<!--
Mech intake form — fill this in and hand it back; Claude will turn it into
data/mechs/<ID>.json (following the TEMPLATE.json structure) and run
compile.py.

- Leave a field blank / delete a line if it doesn't apply (e.g. no modules
  carried by a given part).
- Module entries: copy the block for each module the part carries.
- Icon names = the CDN image keys used elsewhere in this repo, OR the local
  file names under data/unlisted/mechs/ (see **Images** below) — reuse an
  existing CDN key if a similar mech already has one, or use the new local
  filenames if this mech's art is only available locally.
- See data/README.md for what each field means.

Checklist for whoever (or whichever agent) turns this into the JSON file:

1. Copy `data/mechs/TEMPLATE.json` structure: exactly 4 part objects, in
   order `Body` / `L-Arm` / `R-Arm` / `Legs` (`position` drives the "which
   part is this" logic in compile.py — use these English names, not the
   Chinese ones some older CN-derived files still have).
2. Body's `ID` is the mech's overall ID and MUST match the `<ID>.json`
   filename. The other three parts can reuse suffixed IDs
   (`<ID>_ARM_L`/`<ID>_ARM_R`/`<ID>_LEGS`) like the template does — they
   just need to be unique within the file.
3. Stat fields per part (see data/README.md "Adding a mech" for the full
   list): `aircraftWeight`/`durable`/`Armor`/`fire` on every part;
   `output`+`Antiriot` on Body only; `Hit` on both arms; `Dodge` (and
   usually `move`) on Legs only.
4. `icon` is required on every part (used for the listing-grid/detail
   thumbnail). `mechaIcon` and `lihuiIcon` (Body only) are CDN-only keys —
   leave them as placeholders if there's no CN CDN asset, the local
   fallback only covers `icon`/portrait, not `mechaIcon`.
5. `introduce` (flavor text) only needs to be filled on the Body part —
   that's the only one shown on the detail page, but the template repeats
   it on all four parts for consistency; keep them identical.
6. `ModuleCarried` is an array of module objects (can be left as `[]` if
   the part carries none) — see data/modules/ for the shape of a module
   object (`ID`/`name`/`SpecificEffects`/`BufCarried`/`icon`/`weight`/`id`/
   `level`), or ask Claude to look one up from an existing mech with a
   similar module loadout. Check `data/modules/compiled.json` for the
   module's family (`id`) first — if a family with that exact ID already
   exists there and isn't the same module, PICK A DIFFERENT, unused family
   number instead of overwriting it (this bit a real mech once: reusing an
   in-use family silently swapped in a real module's slider content). If
   the module is genuinely new (no existing family/effect to reuse), it has
   no CN catalog entry to source per-level text from — the intake form's
   effect text must give the FULL per-level ladder (every level's numbers,
   not just the max/current one, e.g. "3/6/9/15%" for a 4-level module), and
   whoever builds the JSON must also add a `MANUAL_MODULES` entry for its
   family in `data/modules/compile.py` with a `levels` dict covering every
   level 1..maxLevel (see the existing `9010`/`1050` entries there for the
   pattern, including how a bonus clause that only unlocks at max level is
   handled) — skipping this means the module shows blank text the moment
   the level slider is dragged below max.
7. `manji` (per part) holds max-level (Lv.60+) stat overrides — fill in the
   same stat fields at their max values. If omitted entirely, compile.py
   falls back to the base stats for that part.
8. Images: every `icon` referenced should exist as a file under
   `data/unlisted/mechs/Icon/<Type>/` (grid/detail thumbnail) and, for a
   full detail-page portrait, `data/unlisted/mechs/Raw/<Type>/` — check
   with `ls` before using one. The site tries the local file first and
   only falls back to the CN CDN if that 404s, so a wrong/missing local
   filename means a broken icon even if the CDN also doesn't have it. If
   there are alternate-skin files under `data/unlisted/mechs/Skins/<Type>/`
   (named `Img_Skin_<wap-id>_<variant>.png`), add each `<variant>` token to
   the Body part's `AlternateSkins` array so the detail page's skin
   slider picks them up.
9. After writing the JSON (+ a `<ID>-translation.json` with just
   `{ "version": "X.Y" }`), run `python3 compile.py` and confirm the mech
   shows up in `data/mechs/compiled.json`.
-->

## Basics

- Mech ID: <8-digit numeric ID, check `ls data/mechs` for collisions>
- Mech Name: MobiuX
- Type (weight class): Light
- Quality: SSR
- Game version introduced: 3.3
- Dispatch version: 3.4
- Flavor text / lore description:

## Images
<!-- icon is prefixed with data/unlisted/mechs/Icon/<Type>/ -->
<!-- portrait (Raw) is prefixed with data/unlisted/mechs/Raw/<Type>/ -->
<!-- alternate skins (if any) are prefixed with data/unlisted/mechs/Skins/<Type>/ -->
- Icon file (all 4 parts share this): Icon_mecha_wap1052.png
- Portrait/Raw file (Body only): Icon_mecha_wap1052_SN_Raw.png
- mechaIcon (CDN key, per part, only if a CN CDN asset exists): Icon_wap1052_1
- lihuiIcon (CDN key, Body only, only if a CN CDN asset exists): icon_lihui_wap1052
- Alternate skins (Body only, list each variant token you have a
  `Img_Skin_wap1052_<variant>.png` file for, or "none"): none

### Body — max level (manji) overrides
- Durable: 9703
- Armor: 470
- Fire: 1215
- Output: 1595
- Weight: 285
- Antiriot: 4472

### L-Arm — max level (manji) overrides
- Durable: 5115
- Weight: 100
- Fire: 1215
- Hit: 1974

### R-Arm — max level (manji) overrides
- Durable: 5115
- Weight: 100
- Fire: 1215
- Hit: 1974

### Legs — max level (manji) overrides
- Durable: 8452
- Weight: 160
- Fire: 1215
- Dodge: 5233
- Move: 4

## Modules
<!-- Copy this block for each distinct module referenced above. -->
### Module 1
- Name: Origin Core
- Level: 4/4
- Effect text: During own turn, increases Dodge Rate by 3/6/9/15% of Firepower. During enemy turn, increases Firepower by 3/6/9/15% of Dodge Rate. <!-- numbers must be wrapped as <color=#F74848>NUMBER</color>, same convention as pilot skill text, record the different level effect based on the numbers split -->
- Icon name: Icon_entry_40042

### Module 2
- Name: Crit Rate Mod
- Level: 4/4
- Effect text: Same as others, ID 40024
- Icon name: Same as others, ID 40024

### Module 3
- Name: Descension Module
- Level: 8/8
- Effect text: Increases DMG dealt to targets within 2 adjacent tiles by 4/6/8/10/14/16/18/24%. Reduces DMG taken from attacker beyond 2 adjacent tiles by 4/6/8/10/14/16/18/24%.\n[Favorable Event] trigger rate increases by +10%. DMG calculation will use the highest number of pilot's attributes<!-- numbers must be wrapped as <color=#F74848>NUMBER</color>, same convention as pilot skill text, record the different level effect based on the numbers split -->
- Icon name: Icon_entry_10109

### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Favorable Event: Includes Critical Hit chance, Hit rate, Dodge Rate, Component proc rate, Module proc rate, [Flurry Strike] and [Gusty Strike] proc rate

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
