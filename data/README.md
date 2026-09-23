# Adding pilots and mechs manually

The CN game data source this wiki was built from stops updating after
version 3.2 — anything released after that has to be entered by hand. This
document explains how a new pilot or mech file must be shaped so
`compile.py` can pick it up and the site can display it correctly.

After adding or editing any file described here, recompile from the repo
root:

```
python3 compile.py
```

This regenerates `data/pilots/compiled.{json,js}`, `data/mechs/compiled.{json,js}`,
and the builder index maps. Nothing shows up on the site until you do this.

## General shape

Every pilot/mech source file is named `<ID>.json` and wraps the real payload
in `{"data": {"data": ...}}` (this mirrors the original CN API dumps the
existing files came from — compile.py unwraps it via `raw['data']['data']`).
A sibling `<ID>-translation.json` file can override individual fields after
the fact, but **for manually-added entries you don't need one at all** —
just write the final English text straight into `<ID>.json`. Only use a
`-translation.json` file if you want to keep a non-English source file
untouched and layer English on top of it.

Use the ID scheme already used by existing files (an 8-digit numeric ID).
Pick a new, unused ID — check `ls data/pilots` / `ls data/mechs` for
collisions.

## Adding a pilot

The easiest way to hand off a new pilot: fill in
`data/pilots/INTAKE_TEMPLATE.md` (name, profession, talent text, skill
text/cost/effect, neural text/effect, image filenames) and ask Claude to
generate the pilot from it — it'll produce `data/pilots/<ID>.json` (and a
matching entry in `PILOT_RELEASE_ORDER` in `js/pages/pilots.js` if needed)
following the rules below.

To build the file by hand instead:

1. Copy `data/pilots/TEMPLATE.json` to `data/pilots/<ID>.json`.
2. Fill in the placeholder (`<...>`) values. Fields `compile.py` actually
   reads (see `data/pilots/compile.py` FIELDS/STAT_FIELDS):
   - `ID`, `PilotName`, `RealName`, `Gender`, `Profession`, `Occupation`,
     `quality` (`SSR`/`SR`/`R`)
   - `PortraitHeroIcon` / `AvatarHeroIcon` — CDN image keys, see **Images** below
   - `AllowedMechaDriveList_DriveAllowedList` — license type, e.g. `Light`
   - `Talent0_2Ability` / `Talent3_5Ability` — the two talent tiers shown on
     the pilot card (`name` + `SpecificEffects` are what's displayed)
   - `NeuralDriveTemplate` — the α/β/γ neural drive chip tree (passive
     skills unlocked at various chip-point thresholds). **The α (Alpha) and
     β (Beta) partitions are identical for every pilot sharing the same
     `Occupation`** (e.g. all `Raider`s use the same Alpha/Beta) — copy
     those two blocks verbatim from any existing pilot with the same
     `Occupation` instead of reusing the template's (which are Raider's).
     The γ (Gamma) partition is pilot-specific and is split into two
     sections, `γ1` and `γ2` (each its own `ListChipPartition` entry with
     `TypeComputing: "Gamma"`), each with exactly 6 unlocks at fixed
     `MinimumSum` thresholds `1 / 4 / 7 / 10 / 13 / 16` — only the
     `PassiveSkill` name/effect at each threshold varies per pilot.
   - `biomimetic_computer_data` — the neuron board (skills + stat bonuses
     laid out on the grid). The `UnitNumber`/`LocationOnMap`/`UnitType`
     layout is structural and shared by every pilot — leave that part of
     the template as-is and only change `ID`s, `AttributeBonus` values, and
     the `skill` blocks to match the new pilot's actual kit.
   - `manji` (optional) — max-level (Lv.60+) stat overrides; if omitted,
     compile.py falls back to the base stats
   - Base stats: `Combat`, `Assault`, `Shooting`, `Tactics`, `Defense`,
     `Engineering`, `InitialPilotAPValue_PilotAPInitBase`,
     `MaximumPilotAPValue_PilotAPMaxBase`, `PilotAPRecoveryperTurn_PilotAPRecoverBase`
3. Run `python3 compile.py` and confirm the pilot appears in
   `data/pilots/compiled.json` under `"pilots"`.

## Adding a mech

The easiest way to hand off a new mech: fill in
`data/mechs/INTAKE_TEMPLATE.md` (name, type, per-part stats, modules
carried, image filenames) and ask Claude to generate the mech from it — it
follows the same TEMPLATE.json shape and rules below.

To build the file by hand instead:

1. Copy `data/mechs/TEMPLATE.json` to `data/mechs/<ID>.json`. It's a list of
   4 part objects: `Body`, `L-Arm`, `R-Arm`, `Legs` — `compile.py` expects
   exactly this order/shape (`position` value drives the "which part is
   this" logic; unlike the older CN-derived files you do **not** need to
   use the Chinese position names — `Body`/`L-Arm`/`R-Arm`/`Legs` works and
   is what a `-translation.json` override (if you ever add one) has to
   match).
2. Fill in the placeholders on each part:
   - `ID` (Body's ID is used as the mech's overall ID — the filename must
     match it), `name`, `type` (e.g. `Light`/`Medium`/`Heavy`), `quality`
   - `aircraftWeight`, `durable`, `Armor`, `fire` on every part; `output`
     and `Antiriot` on Body only; `Hit` on the arms; `Dodge` on the legs
   - `icon`, `mechaIcon`, `lihuiIcon` (Body only) — CDN image keys, see
     **Images** below
   - `AlternateSkins` (Body only, optional) — array of local skin variant
     tokens, see **Images** below
   - `introduce` — flavor text (Body only; that's what's shown on the
     detail page)
   - `ModuleCarried` — array of module objects the part can equip; the
     `manji` version supersedes base stats/modules when a mech is at max
     level, same fallback rule as pilots. A module family entirely new to
     this repo (no existing module to reuse) has no CN catalog entry, so it
     also needs a `MANUAL_MODULES` entry in `data/modules/compile.py` with
     the full per-level effect text (every level, not just the mech's
     current one) — see the comment above `MANUAL_MODULES` in that file for
     why and the exact shape.
3. Run `python3 compile.py` and confirm the mech appears in
   `data/mechs/compiled.json` under `"mechs"`.

## Images

Existing pilots/mechs load images live from Zlongame's CN CDN
(`https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/...`)
using the icon-key fields above (`PortraitHeroIcon`, `AvatarHeroIcon`,
`mechaIcon`, etc.). A pilot added after the CN source's own cutoff has no
matching CDN asset, so **the pilots pages fall back to a local copy** when
the CDN image 404s:

- `data/unlisted/pilot_images_half/<PortraitHeroIcon>.png` (the half-body
  thumbnail — grid cards, name-row avatar, `pilotstats.js` table)
- `data/unlisted/pilot_images_raw/<AvatarHeroIcon>.png` (the full portrait —
  detail-page art, including per-skin variants)

Just drop the PNGs there named exactly after the pilot's `PortraitHeroIcon`
/ `AvatarHeroIcon` values (e.g. `Pilot_13037A_half.png`,
`Pilot_13037A_Raw.png`) — no field or code changes needed, the fallback is
automatic (see `LOCAL_AVATAR_BASE`/`LOCAL_PORTRAIT_BASE` in
`js/pages/pilots.js`).

Mechs get a similar local fallback for `icon` (grid/detail thumbnail) and
the detail-page portrait:

- `data/unlisted/mechs/Icon/<Type>/<icon>.png` (e.g.
  `data/unlisted/mechs/Icon/Light/Icon_mecha_wap1002.png`)
- `data/unlisted/mechs/Raw/<Type>/<icon-with-Icon_mecha_-prefix-stripped>_SN_Raw.png`
  (e.g. `data/unlisted/mechs/Raw/Light/Icon_mecha_wap1002_SN_Raw.png`)

`<Type>` is the mech's `Light`/`Medium`/`Heavy` weight class. No field or
code changes needed, the fallback is automatic (see `mechIconSrc`/
`mechPortraitSrc` in `js/pages/sts.js`). `mechaIcon` has no local
fallback — a mech without a CN CDN asset for it will just render as a
broken image where `mechaIcon` is used (currently unused in `js/`, so this
mostly doesn't matter in practice).

Alternate skins (the swipeable variants on the detail-page portrait, same UX
as pilots' `AlternateSkins`) live under
`data/unlisted/mechs/Skins/<Type>/Img_Skin_<wap-id>_<variant>.png`, where
`<wap-id>` is the mech's `icon` field with its `Icon_mecha_` prefix stripped
(e.g. `wap1002`) and `<variant>` is an arbitrary suffix token used by the
existing scraped filenames (`01`, `02`, `S1`, ...). List each variant token
the mech has a file for in a Body-only `AlternateSkins` array (e.g.
`["01", "S1"]`) — the mech's default look ("A") always reuses the normal Raw
portrait above and needs no Skins file of its own. Mech module icons get the
same local-first treatment from `data/unlisted/mech_modules/` (flat, no
weight-class split) — see `moduleIconSrc` in `js/pages/sts.js`.

Talent/Skill/Neural icons (`SkillIcon`/`icon` on those blocks) are also
sourced from the CN CDN by key — the intake form asks for these directly
(reuse an existing icon key with a similar effect, e.g.
`Icon_skill_passive_5007`, when there's no exact match).

## Version / release ordering

`compile.py` only ever reads `version` from the `-translation.json` file
(`entry['version'] = t.get('version', '1.0')`) — it ignores any `version`
key inside the main `<ID>.json`. Since manually-added entries usually skip
the translation file, add a minimal one just for this:

```json
{ "version": "3.3" }
```

as `data/pilots/<ID>-translation.json` or `data/mechs/<ID>-translation.json`.
This drives the version filter and default sort order on the pilots/mechs
pages. Without it, the entry defaults to `"1.0"`.
