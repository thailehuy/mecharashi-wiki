# mecharashi-wiki

A static fan wiki for **Mecharashi**, built with Bootstrap 5 and jQuery. Hosted on GitHub Pages.

Images and icons live in a separate repo, [mecharashi-wiki-assets](https://github.com/thailehuy/mecharashi-wiki-assets), served from `https://assets.mecharashi-wiki.cc/` (`ASSET_BASE` in `index.html`), so the frequent text/translation deploys here stay small. Its paths mirror the old layout here; the page code prepends `ASSET_BASE` to them. Where we have no copy of an image, the pages and `build_pages.py` fall back to the game's CDN (`media.zlongame.com`).

| Assets path | Contents |
|---|---|
| `data/unlisted/pilot_images_half/` | Pilot half-body portraits (`<icon>.png`) |
| `data/unlisted/pilot_images_raw/` | Full pilot artwork |
| `data/unlisted/pilot_images_other/` | Extra portraits, e.g. `Pilot_13038A_half.png` (the home page's link-preview image) |
| `data/unlisted/pilot_skills/` | Pilot skill/talent icons |
| `data/unlisted/mechs/{Icon,Raw,Skins}/{Light,Medium,Heavy}/` | ST icons, full artwork and skins, by weight class |
| `data/unlisted/mech_modules/` | Module icons (color subfolders by module category) |
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
- **Glossary** — shared keyword/tooltip engine (buffs, skills, terrain, jump-links) used across all pages
- Runtime translation loading — editing a `<ID>-translation.json` file and pushing takes effect on GitHub Pages without recompiling

## Project structure

```
index.html                        # Entry point
css/style.css                     # All styles
compile.py                        # Orchestrates the full data build (see below)
build_pages.py                    # Generates per-route/per-item pages (gitignored; run in CI)
js/
  app.js                          # Path/hash router, nav (incl. "Misc." dropdown), version badge
  translations.js                 # Runtime translation loader
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
data/
  pilots/                         # compile.py, <ID>.json, <ID>-translation.json → compiled.js/json (PilotsData)
  mechs/                          # compile.py, <ID>.json, <ID>-translation.json → compiled.js/json (MechsData)
  weapons/                        # compile.py, scrape/helper scripts → compiled.js/json (WeaponsData)
  backpacks/                      # compile.py, translations → compiled.js/json (BackpacksData)
  modules/                        # compile.py, scrape-modules.js → compiled.js/json (ModulesData)
  accessories/                    # compiled.js/json; extract-chain-traits.py → chain-traits.js/json (ChainTraitsData, SSR TA/RA pairs from the mined DB)
  builder/                        # generate-index-maps.py → index-maps.js/json (BuilderIndexMaps)
  rd/                             # build_rd_totals.py → rd-totals.json (max R&D bonuses from the mined DB, for the DMG calculator)
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

### Scraping

```bash
# GL pilots (English)
curl "https://usma-activity.tentree-games.com/common/infodata/mQuery.do?appkey=1722917077707&target=pilot_data&type=detail&lang=en&query=<ID>"

# CN pilots
curl "https://ma-activity.zlongame.com/common/infodata/mQuery.do?appkey=1616148215678&target=pilot_data&type=detail&query=<ID>"

# GL mechs (English)
curl "https://usma-activity.tentree-games.com/common/infodata/mQuery.do?appkey=1722917077707&target=aircraft_data&type=detail&lang=en&query=<Name>"

# CN mechs
curl "https://ma-activity.zlongame.com/common/infodata/mQuery.do?appkey=1616148215678&target=aircraft_data&type=detail&query=<Name>"
```

Weapons, backpacks, and modules each have their own scrape/raw-data helper scripts under `data/weapons/`, `data/backpacks/`, and `data/modules/` (e.g. `scrape-ur.js`, `scrape-modules.js`).

### Compiling

Run the full pipeline from the repo root:

```bash
python3 compile.py
```

This runs, in order: `data/pilots/compile.py`, `data/mechs/compile.py`, `data/modules/compile.py`, `data/weapons/compile.py`, `data/backpacks/compile.py`, then compiles `glossary.json`/`dispatch.json`/`exskills.json` directly, and finally `data/builder/generate-index-maps.py` (which depends on IDs produced by every preceding step, so it must run last). It exits on the first subprocess failure.

Each `compile.py` merges the corresponding `<ID>-translation.json` files over the raw CN-sourced data and writes `compiled.js`/`compiled.json`.

### Adding a new pilot or ST

1. Add the ID/name to the relevant `list.json` (and `list-cn.json` if CN-only)
2. Fetch the raw detail file and save as `<ID>.json`
3. A `<ID>-translation.json` is generated automatically on the next compile run — fill in English fields for CN-only entries
4. Run `python3 compile.py` and push

### Translating a CN-only entry (no recompile)

Edit the `<ID>-translation.json` with English values and push. GitHub Pages serves the updated translation file and the detail page picks it up automatically via `fetch()`. For local testing, serve with:

```bash
python3 -m http.server 8080
```

### Using the mined game database

`data/screenshots/mined/mecharashi.db` is a SQLite database mined from the **global (EN) client**. Its `about` table records the game build and extraction date; the copy used so far is build `191_ZiLongENA`, extracted 2026-10-11. It holds English names and descriptions, stats, skills, buffs and more. `data/screenshots/*` is gitignored (the file is ~17 MB), so each contributor needs their own copy at that path. The folder also has `README.txt` and two offline HTML viewers (`Mecharashi_Wiki.html`, `Damage_Bench.html`) built from the same data.

Open it with the `sqlite3` CLI, Python's built-in `sqlite3`, or a viewer such as DB Browser for SQLite. Start with the `about` table: it describes every table and the conventions (percentages are fractions, `0.15` = 15%).

**Tables that map onto wiki data**

| Wiki data | DB table | Join on |
|---|---|---|
| Pilot (`data/pilots/<ID>.json`) | `pilots` (name, `full_name`, `bio`), `pilot_stats`, `pilot_skills` | `pilot_id` = wiki pilot ID |
| ST (`data/mechs/<ID>.json`, ID = body part) | `st_parts` → `sts` (name, `description`), `st_max` | `st_parts.part_id` = wiki ID, then `st_id` |
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
- **Write overrides to `<ID>-translation.json`, not the raw `<ID>.json`.** Pilot bios go in `Introduction`; ST descriptions go in `introduce`. Keep the file's formatting: 2-space indent, `ensure_ascii=False`, and its trailing newline (some files have one, some don't).
- **Glossary: match by exact buff ID *and* name, via `buffs`.** Don't use the name-keyed `glossary` table: one name there covers many buff IDs, so it hands out the wrong text (e.g. Short Circuit getting Stealth's description, Guts becoming "Guts (Test Use)"). The DB's text is sometimes vaguer than ours (e.g. Guard, Poised, Heroism); keep ours when it's more specific.
- **DB text is plain.** It has no `<color=#F74848>` highlights or `<buf ID=…>` links; re-add them where the existing text had them.
- **Renaming is a separate decision.** The DB uses official global names, which sometimes differ from ours (e.g. Improved Attack → Attack Enhancement). Pages resolve bare `[Name]` references through the glossary name index, so a rename must be applied everywhere the name is used (`js/pages/*.js`, `data/dispatch.json`, `data/shops.js`, weapon `pilot` fields, effect text). Some DB names are internal labels (`Bionic Computer 7`, `EVA-01 Pilot`); don't use those.
- **The DB has no image or icon keys.** Icons still come from the existing files and the assets repo.
- Run `python3 compile.py` after any change.

**R&D totals (for the DMG calculator)**

`data/rd/rd-totals.json` holds the maximum R&D bonuses, i.e. what a fully researched tree gives, exported from the DB's `rd_totals` table. Regenerate it with `python3 data/rd/build_rd_totals.py`. It is split into:

- `pilot`: by class (Fighter, Guardian, Machinist, Raider, Sniper, Tactician). Flat and % bonuses to the six attributes (`PilotBaseProperty<Attr>Add` / `Multi`).
- `mech`: Light/Medium/Heavy ST, plus a "SS Quality (Prismatic)" version of each. Per-part HP and Armor, Fire value, Dodge and Hit, crit defense.
- `weapon`: by weapon type (`HMG weapons`, `SR weapons`, …). That type's Attack and Hit value (`<Type>AttackAdd` / `HitValueAdd`), plus crit (`ActorWeaponCriticalAppendAdd`).

Each stat is `{ "total": …, "nodes": … }` (`nodes` = how many R&D nodes add up to it). `*Add` stats are flat; `*Multi` stats are fractions (`0.2` = +20%). R&D flat values go in *before* the % bonuses:

```
Pilot attribute = (Lv70 base + neurons + chips + R&D flat) × (1 + potential bonus + R&D %)
```

The individual nodes and features are in the `rd_nodes` and `rd_features` tables if the calculator needs them.

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
| Misc. pages (Dispatch, EX Skills, Shops, ST/Pilot Stats, Builder) | Home page image (`Pilot_13038A_half.png`, read from `index.html`'s `og:image`) as a small icon + summary from `MISC_DESCRIPTIONS` |
| Other list pages and the home page | `index.html`'s own generic preview, retitled |

Previews can't be seen by opening the page in a browser. To check them:

- **Locally:** inspect the generated HTML, e.g. `head -40 pilots/ada/index.html`, and look at the `og:` and `twitter:` lines.
- **After deploy:** paste the link into [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) (use "Scrape Again" to refresh its cache), or into a Discord message. Discord also caches previews for a while.

The `og:url` URLs point at `https://mecharashi-wiki.cc/` (`DEFAULT_SITE_URL` in `build_pages.py`); pass a different root as the first argument to override it. `og:image` URLs are absolute already: our copy on `https://assets.mecharashi-wiki.cc/` (`ASSET_URL` in `build_pages.py`, which must match `ASSET_BASE` in `index.html`) when the assets repo has it, otherwise the game CDN.

## Translation file schema

**Pilots** (`data/pilots/<ID>-translation.json`):
```json
{
  "version": "1.0",
  "PilotName": "...",
  "RealName": "...",
  "Gender": "...",
  "Profession": "...",
  "Occupation": "...",
  "Introduction": "...",
  "Talent0_2Ability": { "name": "...", "SpecificEffects": "..." },
  "Talent3_5Ability": { "name": "...", "SpecificEffects": "..." },
  "skills": { "<SkillID>": { "name": "...", "describe": "...", "SpecificEffects": "..." } },
  "neuralPassives": { "<PassiveID>": { "name": "...", "SpecificEffects": "..." } }
}
```

**STs** (`data/mechs/<ID>-translation.json`):
```json
{
  "version": "1.0",
  "manjiFirepower": "...",
  "name": "...",
  "introduce": "...",
  "modules": { "<ModuleID>": { "name": "...", "SpecificEffects": "..." } }
}
```
