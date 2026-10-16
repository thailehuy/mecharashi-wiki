# mecharashi-wiki

A static fan wiki for **Mecharashi**, built with Bootstrap 5 and jQuery. Hosted on GitHub Pages.

Images and icons live in a separate repo, [mecharashi-wiki-assets](https://github.com/thailehuy/mecharashi-wiki-assets), served from `https://assets.mecharashi-wiki.cc/` (`ASSET_BASE` in `index.html`), so the frequent text deploys here stay small. Its paths mirror the old layout here; the page code prepends `ASSET_BASE` to them. Where we have no copy of an image, the pages and `build_pages.py` fall back to the game's CDN (`media.zlongame.com`).

| Assets path | Contents |
|---|---|
| `data/unlisted/pilot_images_half/` | Pilot half-body portraits (`<icon>.png`) |
| `data/unlisted/pilot_images_raw/` | Full pilot artwork |
| `data/unlisted/pilot_images_other/` | Extra portraits, e.g. `Pilot_13038A_half.png` (the home page's link-preview image) |
| `data/unlisted/pilot_skills/` | Pilot skill/talent icons |
| `data/unlisted/mechs/{Icon,Raw,Skins}/{Light,Medium,Heavy}/` | ST icons, full artwork and skins, by weight class |
| `data/unlisted/mech_modules/` | Module icons (color subfolders by module category) |
| `data/unlisted/rnd/` | R&D icons: `Icon_RnD_N_*` pilot attribute % features, `Icon_RnD_E_*` other features (Hybrid Training is `E_3031`), `Icon_RnD_F_*` matrix/port frames |
| `data/weapons/icons/<type>/` | Signature weapon icons, by weapon type (`AB`, `MG`, `SR`, …) |
| `data/backpacks/icons/`, `data/backpacks/materials/` | Backpack and crafting-material icons |
| `data/accessories/icons/` | Accessory icons |
| `data/background/` | Rarity frame backgrounds (`quality-{r,sr,ssr,sssr}.png`) |

Add new images to the matching folder in that repo; pushing its `main` deploys them.

> Fan project — not affiliated with Tentree Games / BlackJack Studio, non-commercial.

## Features

- Single-page app with path routing (`pilots/ada/`); legacy `#page/param` links still work and are rewritten to the path form
- Per-item link previews (Facebook/Discord) — `build_pages.py` generates a copy of `index.html` with its own og:/twitter: tags for every pilot/ST/weapon/backpack/module, run by the deploy workflow
- **Pilots** listing + detail — avatar, rank/version badges, filters, talents, skills, Neural Drive
- **STs (mechs)** listing + detail — avatar, rank/version badges, filters, firepower/HP/weight stats, modules
- **Weapons** listing + detail — signature (SSSR) weapons grouped by release batch, paired-pilot linking, passive skills
- **Backpacks** listing + detail — grouped by quality tier, recursive crafting-material breakdown
- **Accessories** listing — Triggers/Reactions, Clearance Ops filters
- **Modules** listing + detail — grouped by category, live level-preview slider, "carried by" ST list
- **Dispatch** table — patch-version × dispatch-group grid linking to ST detail pages
- **EX Skills** reference — universal weapon-type basic attacks/codes
- **ST Stats** table — sortable/filterable comparison of all SSR-quality STs
- **Builder** — mech loadout theorycrafting tool, incl. 4 accessory slots per weapon (at least 1 trigger TA + 1 reaction RA) with each TA + RA chain's trigger chance; state is encoded into a shareable Build UID (URL hash), not localStorage
- **R&D Bonus** — max bonuses from a fully researched R&D tree, by pilot class, ST weight class and weapon type
- **Features** — every R&D feature (pilot / ST / weapon), split by pilot class, ST weight class and weapon R&D tree, with port, effect and unlock cost
- **Bosses** — boss line-ups of every Armed Conquest season and Clearance Ops 11–17 with HP per difficulty; each Armed Conquest season has its own page (`bosses/<season>/`) listing every boss's skills from the mined DB, plus what the Armed Conquest guide adds for AC1–10 (skill cards with effects, buffs, minions, bounties, Extreme modifiers, clues)
- **DMG Calc (Beta)** — standalone page at `dmgcalc/` (linked from "Misc."): the mined Damage Bench, comparing two setups' damage per attack and attacks to kill against a boss; saved loadouts stay in the browser (localStorage)
- **Glossary** — shared keyword/tooltip engine (buffs, skills, terrain, jump-links) used across all pages
- Table-based data — all text and stats live in `data/db/` (one JSON table per entity); the deploy workflow compiles them, so an edited table goes live on push

## Project structure

```
index.html                        # Entry point
dmgcalc/                          # DMG Calc (Beta), a standalone page: index.html (markup, kept by hand), bench.js/css (generated)
css/style.css                     # All styles
compile.py                        # Builds the page bundles from data/db/ (see below)
build_pages.py                    # Generates per-route/per-item pages (gitignored; run in CI)
js/
  app.js                          # Path/hash router, nav (incl. "Misc." dropdown), version badge
  glossary.js                     # Keyword/tooltip engine shared by all pages
  pages/
    home.js                       # Landing page
    pilots.js                     # Pilots listing + detail page
    sts.js                        # STs listing + detail page
    weapons.js                    # Weapons listing + detail page
    backpacks.js                  # Backpacks listing + detail page
    accessories.js                # Accessories listing
    modules.js                    # Modules listing + detail page
    dispatch.js                   # Dispatch schedule table
    exskills.js                   # EX Skills reference
    ststats.js                    # ST stats comparison table
    builder.js                    # Mech loadout builder
    rdbonus.js                    # R&D Bonus (max R&D bonuses) tables
    features.js                   # Features (R&D features) listing
data/
  db/                             # Source tables: pilots, pilot_neurons, neural_partitions, skills, mechs, mech_parts, modules, weapons, backpacks, materials (see data/README.md)
  pilots/                         # compiled.js/json (PilotsData); check_skins.py, INTAKE_TEMPLATE.md
  mechs/                          # compiled.js/json (MechsData); INTAKE_TEMPLATE.md
  weapons/                        # compiled.js/json (WeaponsData)
  backpacks/                      # compiled.js/json (BackpacksData)
  modules/                        # compiled.js/json (ModulesData)
  accessories/                    # compiled.js/json; extract-chain-traits.py → chain-traits.js/json (ChainTraitsData, SSR TA/RA pairs from the mined DB)
  builder/                        # generate-index-maps.py → index-maps.js/json (BuilderIndexMaps)
  dmgcalc/                        # extract-bench.py → bench-data.js (BenchData) + dmgcalc/bench.js/css, from the mined Damage_Bench.html; build-icons.py → bench-icons.js (BenchIcons, dropdown icons)
  features/                       # build_features.py → features.json/js (FeaturesData, every R&D feature from the mined DB, for the Features page)
  bosses/                         # build_bosses.py → bosses.json/js (BossesData: line-ups and HP from bench-data.js, AC boss skills from the mined DB, merged with ac-guide.json)
    ac-guide.json                 # transcribed from the Armed Conquest guide PDF (data/screenshots/mined/); build_bosses.py prints where it disagrees with the DB; skill `icon`s were matched by image from the guide's screenshots to the assets repo's pilot_skills icons (DB-only skills take a same-named card's icon)
  rd/                             # build_rd_totals.py → rd-totals.json/js (RDTotalsData, max R&D bonuses from the mined DB, for the R&D Bonus page and DMG calculator)
  glossary.json                   # → GlossaryData
  dispatch.json                   # → dispatch table data
  exskills.json                   # → ExSkillsData
.github/workflows/deploy.yml      # GitHub Pages deployment on push to main
```

## Pilot detail page

- Full portrait, rank and version badges
- Occupation icon (from Profession Neuron entry)
- Basic and Upgraded talents with parsed descriptions
- Skills section — Attack (`EquipmentSkill`), Code (`Order`), Code+Attack (`SpecialAssault`), Passive — with AP and CD stats
- Neural Drive — Alpha, Beta, Gamma1, Gamma2 partitions with chip slot indicators and activation passives

## ST detail page

- Live portrait (`mechaLive` image)
- Firepower (from CN data), per-part HP, weight capacity and remaining
- Modules with level display (`Lv.X/X`) and parsed descriptions (inline `ModuleSlider` preview)

## Weapon detail page

- Stats (ATK, Shield HP, Weight, Range, Grip, Models)
- Paired pilot card linking to `#pilots/<name>`
- Passive skill list with talent-keyword auto-linking back to the owning pilot's talent
- Warning banner for CN-only versions not yet released on Global

## Backpack detail page

- Portrait, quality/weight/version meta, skill card
- "Crafting Material" section listing component items/materials (quantity + composite badge), linking recursively to other backpack detail pages

## Module detail page

- All levels stacked with parsed effect text
- "Carried By" list of STs that innately carry the module, linking to `#sts/<name>`

## Builder (`builder/`)

Mech loadout theorycrafting tool:

- Pick pilot → matching mech → 3 skills + EX skill → weapons (hand/shoulder/back) → backpack → up to 4 modules
- Computes weight budget (mech output − part weight + Power bonuses) and flags overweight builds
- Custom searchable icon dropdowns, hover tooltips, expandable detail panels
- Two-handed weapon auto-mirroring, Raider backpack extra slots, "Ascended Talent" checkbox
- State is encoded into a compact base-11 **Build UID** (via `data/builder/index-maps.json`) embedded in the URL hash — "Copy Build URL" to share, paste a UID to load; supports the legacy UID format

## Data pipeline

### Data tables

Pilot, ST, module, weapon and backpack data lives in `data/db/`: one JSON table per entity, keyed by game ID, holding the final English text. [data/README.md](data/README.md) documents every table and field, and how to add a pilot or ST. The old CN API dumps, `-translation.json` files and scrapers were removed; they are in git history under the tag `pre-db`.

### Compiling

Run the full build from the repo root:

```bash
python3 compile.py
```

It loads every `data/db/` table, checks that every referenced ID exists (it exits with a list of broken references otherwise), and joins the tables into `data/<kind>/compiled.js`/`compiled.json` for pilots, mechs, modules, weapons and backpacks. Then it compiles `glossary.json`/`dispatch.json`/`exskills.json` and finally runs `data/builder/generate-index-maps.py`, which reads the bundles and so must run last.

The deploy workflow runs `compile.py` before `build_pages.py`, so a pushed table edit is deployed even if it wasn't compiled locally. Commit the regenerated bundles anyway, since the local server reads them.

### Editing text

Edit the row in the relevant `data/db/` table (e.g. a skill's text in `skills.json`, a pilot's bio in `pilots.json` → `introduction`) and push. Shared IDs have one row, so a fix to a class-wide skill applies to every pilot that has it.

### Using the mined game database

`data/screenshots/mined/mecharashi.db` is a SQLite database mined from the **global (EN) client**. Its `about` table records the game build and extraction date; the copy used so far is build `191_ZiLongENA`, extracted 2026-10-11. It holds English names and descriptions, stats, skills, buffs and more. `data/screenshots/*` is gitignored (the file is ~17 MB), so each contributor needs their own copy at that path. The folder also has `README.txt` and two offline HTML viewers (`Mecharashi_Wiki.html`, `Damage_Bench.html`) built from the same data.

Open it with the `sqlite3` CLI, Python's built-in `sqlite3`, or a viewer such as DB Browser for SQLite. Start with the `about` table: it describes every table and the conventions (percentages are fractions, `0.15` = 15%).

**Tables that map onto wiki data**

| Wiki data | DB table | Join on |
|---|---|---|
| Pilot (`data/db/pilots.json`) | `pilots` (name, `full_name`, `bio`), `pilot_stats`, `pilot_skills` | `pilot_id` = wiki pilot ID |
| ST (`data/db/mechs.json`, ID = body part; parts in `mech_parts.json`) | `st_parts` → `sts` (name, `description`), `st_max` | `st_parts.part_id` = wiki ID, then `st_id` |
| Glossary `buf` entries (`data/glossary.json`) | `buffs` (`name`, `description`) | `buff_id` = glossary key |
| Weapons, modules, backpacks, chips, accessories | `weapons`, `modules`, `backpacks`, `chips`, `wep_components` | their own IDs |

```bash
# ST name + description for a wiki mech ID
sqlite3 data/screenshots/mined/mecharashi.db \
  "select s.name, s.description from st_parts p join sts s using (st_id) where p.part_id = 30030102"
```

**Stat conventions (verified against the wiki)**

- Pilot stats on the wiki = potential 5 + Bionic Computer neurons: `(pilot_stats.<attr> at potential 0 + neural_<attr>) × 1.10`. DB column names differ: Combat = `melee`, Shooting = `ranged`, Tactics = `tactical`, Engineering = `mechanics`.
  - Exception: Kaidan, Dana and Grant are ~7.2% above this formula, which doesn't model their quality ascension (A → S). Keep the wiki values for them.
- ST stats on the wiki = the top-grade row of `st_max` (highest `grade_step`). `st_max.arm_hit` is the **left** arm only. For STs whose arms differ (e.g. Dreadtalon, Wolverine), scale the right arm by its `st_parts.base_hit` ratio.

**Rules for updating wiki data from the DB**

- **Global is behind CN.** The DB covers Global only up to **v2.5**: every pilot and ST up to v2.5 is in it, and none from v2.6 on. v2.6–3.2 are CN-only (not on Global yet) and v3.3+ will come with a future extraction, so these keep the wiki's own data, and v3.3+ still need manual entry ([data/README.md](data/README.md)). When joining wiki data to the DB, expect v2.6+ entries to have no match. Don't add new pilots/STs from the DB without deciding to.
- **Never overwrite English text.** To tell Chinese from English, look for CJK characters (`[　-鿿＀-￯]`), not "any non-ASCII": English text often contains em-dashes, curly quotes or accents (Fenrisúlfr).
- **Write changes to the `data/db/` tables.** Pilot bios go in `pilots.json` → `introduction`; ST descriptions go in `mechs.json` → `introduce`; skill text in `skills.json`. Keep the tables' formatting: 2-space indent, `ensure_ascii=False`, trailing newline.
- **Glossary: match by exact buff ID *and* name, via `buffs`.** Don't use the name-keyed `glossary` table: one name there covers many buff IDs, so it hands out the wrong text (e.g. Short Circuit getting Stealth's description, Guts becoming "Guts (Test Use)"). The DB's text is sometimes vaguer than ours (e.g. Guard, Poised, Heroism); keep ours when it's more specific.
- **DB text is plain.** It has no `<color=#F74848>` highlights or `<buf ID=…>` links; re-add them where the existing text had them.
- **Renaming is a separate decision.** The DB uses official global names, which sometimes differ from ours (e.g. Improved Attack → Attack Enhancement). Pages resolve bare `[Name]` references through the glossary name index, so a rename must be applied everywhere the name is used (`js/pages/*.js`, `data/dispatch.json`, `data/shops.js`, weapon `pilot` fields, effect text). Some DB names are internal labels (`Bionic Computer 7`, `EVA-01 Pilot`); don't use those.
- **The DB has no image or icon keys.** Icons still come from the existing files and the assets repo.
- Run `python3 compile.py` after any change.

**R&D features**

`data/features/features.json` lists every R&D feature from the DB's `rd_features` table, grouped as `pilot` (by class), `st` (Light/Medium/Heavy) and `weapon` (by the R&D tree that unlocks it: Melee, Assault, Ranged, Tactical, Shield; the feature ID's second digit). Regenerate it with `python3 data/features/build_features.py`, which also writes `features.js` for the Features page (Misc. → Features). For filtering in a loadout picker (e.g. the Builder), each feature has `slots` (the feature ports it fits), `for` (pilot class, or ST weight class / `any`), `weapon_types` (weapon features: the `WeaponType2` codes it affects, `null` = every weapon) and, on Basic features, a `basic` key (a feature and its II version can't be equipped together); `pilot_classes` maps the wiki's pilot `Profession` (Striker, …) to the R&D class (Fighter, …). The script reads the DMG calc's `bench-data.js` for the weapon types and `data/pilots/compiled.json` for the classes. The mined data has no icon field, so the script assigns them: pilot attribute % features by attribute (`ATTR_ICONS`, `Icon_RnD_N_*`; Hybrid Training `E_3031`), ST refits by type and weight class (`ST_ICONS`), and the rest by feature ID (`FEATURE_ICONS`). Some are confirmed, the rest worked out from the icon art (comments in the script say which); a few reuse a pilot passive or module icon (full asset path in `FEATURE_ICONS`).

**R&D totals (for the DMG calculator)**

`data/rd/rd-totals.json` holds the maximum R&D bonuses, i.e. what a fully researched tree gives, exported from the DB's `rd_totals` table. Regenerate it with `python3 data/rd/build_rd_totals.py`, which also writes `rd-totals.js` for the R&D Bonus page (Misc. → R&D Bonus). It is split into:

- `pilot`: by class (Fighter, Guardian, Machinist, Raider, Sniper, Tactician). Flat and % bonuses to the six attributes (`PilotBaseProperty<Attr>Add` / `Multi`).
- `mech`: Light/Medium/Heavy ST, plus a "SS Quality (Prismatic)" version of each. Per-part HP and Armor, Fire value, Dodge and Hit, crit defense.
- `weapon`: by weapon type (`HMG weapons`, `SR weapons`, …). That type's Attack and Hit value (`<Type>AttackAdd` / `HitValueAdd`), plus crit (`ActorWeaponCriticalAppendAdd`).

Each stat is `{ "total": …, "nodes": … }` (`nodes` = how many R&D nodes add up to it). `*Add` stats are flat; `*Multi` stats are fractions (`0.2` = +20%). R&D flat values go in *before* the % bonuses:

```
Pilot attribute = (Lv70 base + neurons + chips + R&D flat) × (1 + potential bonus + R&D %)
```

The individual nodes and features are in the `rd_nodes` and `rd_features` tables if the calculator needs them.

**DMG Calc (`dmgcalc/`)**

The DMG Calc page is the mined `Damage_Bench.html`, split into files the site serves. The calculation is final, so updates should only bring new data (e.g. new pilots). To update it after a new extraction:

1. Put the new mined files in `data/screenshots/mined/` (the script reads `Damage_Bench.html`).
2. Run `python3 data/dmgcalc/extract-bench.py`. It regenerates:
   - `dmgcalc/bench.css`: the bench's `<style>` block.
   - `dmgcalc/bench.js`: the bench's script, with its embedded `const D = {...}` replaced by `const D = window.BenchData;`.
   - `data/dmgcalc/bench-data.js`: `window.BenchData = {...}` (~1.8 MB, loaded only by this page).

   It prints the game build and data date, and warns if `dmgcalc/index.html` is missing an element id the script looks up.

   Then run `python3 data/dmgcalc/build-icons.py`. It writes `data/dmgcalc/bench-icons.js` (`window.BenchIcons`): an icon for each ST, pilot, weapon, skill, module, feature, backpack, accessory and boss in the bench data, matched by ID or name to the wiki's compiled data. `bench.js` draws dropdowns whose options have icons as a button and list in place of the native `<select>` (`iconSelects`). Items it can't match just show no icon.
3. If it warned, copy the changed markup from `Damage_Bench.html` into `dmgcalc/index.html`. That file is kept by hand: it's the bench's markup plus the page title, the "DMG Calc · Beta" heading, the "← Mecharashi Wiki" link and the two `<script>` tags. Don't overwrite it wholesale.
4. Open `dmgcalc/` locally (see Running locally) and check the console for errors, then commit the three generated files.

Don't take the data from the DB's `bench_data` table: it lacks some weapons, accessories and effects that the HTML has, and its helper sections differ (`alias_src` / `impr_tbl` / `fixed_ids` instead of `alias` / `units` / `meta`). Like the DB, the bench data covers Global only up to v2.5, so newer pilots, STs and weapons aren't in the calculator yet.

### Running locally

Clone [mecharashi-wiki-assets](https://github.com/thailehuy/mecharashi-wiki-assets) next to this repo (`../mecharashi-wiki-assets`): `build_pages.py` reads its file listing to pick link-preview images (or set `ASSETS_DIR` to point elsewhere). Images themselves load from the live `assets.mecharashi-wiki.cc` even when running locally.

From the repo root:

```bash
python3 build_pages.py        # generate the per-route/per-item pages
python3 -m http.server 8080
```

Then open `http://localhost:8080/`, or an item page directly, e.g. `http://localhost:8080/pilots/ada/` or `http://localhost:8080/sts/fenrisulfr/`.

- `build_pages.py` is only needed for loading or reloading path URLs like `/pilots/ada/` — without it those 404, since the files only exist after the build. Opening `http://localhost:8080/` and clicking around (or using `#pilots/Ada`-style links) works without it.
- Re-run `build_pages.py` after `compile.py` or after editing `index.html`, since each generated page is a copy of `index.html` filled in from the compiled data.
- `python3 build_pages.py --clean` removes the generated folders. They're gitignored, so leaving them is harmless — the deploy workflow regenerates them on every push.

### Link previews

Facebook/Discord don't run JavaScript and ignore the `#...` part of a URL, so the preview card comes from the `og:`/`twitter:` meta tags in each generated page's static HTML. `build_pages.py` writes those per page:

| Page | Preview |
|---|---|
| Pilot / ST / Weapon / Backpack / Module | Item icon (`twitter:card=summary`) + two-line description, e.g. `v3.6 S-rank Tactician (Medium License)` then the basic talent |
| Armed Conquest season (`bosses/<season>/`) | Last boss's portrait + `Armed Conquest season 13 (v2.5)` then the bosses by stage |
| Misc. pages (Dispatch, EX Skills, Shops, ST/Pilot Stats, Builder, R&D Bonus, Features, Bosses) | Home page image (`Pilot_13038A_half.png`, read from `index.html`'s `og:image`) as a small icon + summary from `MISC_DESCRIPTIONS` |
| Other list pages and the home page | `index.html`'s own generic preview, retitled |

Previews can't be seen by opening the page in a browser. To check them:

- **Locally:** inspect the generated HTML, e.g. `head -40 pilots/ada/index.html`, and look at the `og:` and `twitter:` lines.
- **After deploy:** paste the link into [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) (use "Scrape Again" to refresh its cache), or into a Discord message. Discord also caches previews for a while.

The `og:url` URLs point at `https://mecharashi-wiki.cc/` (`DEFAULT_SITE_URL` in `build_pages.py`); pass a different root as the first argument to override it. `og:image` URLs are absolute already: our copy on `https://assets.mecharashi-wiki.cc/` (`ASSET_URL` in `build_pages.py`, which must match `ASSET_BASE` in `index.html`) when the assets repo has it, otherwise the game CDN.
