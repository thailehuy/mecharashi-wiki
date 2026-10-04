# mecharashi-wiki

A static fan wiki for **Mecharashi**, built with Bootstrap 5 and jQuery. Hosted on GitHub Pages.

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
- **Builder** — mech loadout theorycrafting tool; state is encoded into a shareable Build UID (URL hash), not localStorage
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
  backpacks/                      # compile.py, materials/, translations → compiled.js/json (BackpacksData)
  modules/                        # compile.py, scrape-modules.js → compiled.js/json (ModulesData)
  accessories/                    # compiled.js/json, icons/
  builder/                        # generate-index-maps.py → index-maps.js/json (BuilderIndexMaps)
  background/                     # quality-rank background images (R/SR/SSR/SSSR)
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

### Running locally

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
| Misc. pages (Dispatch, EX Skills, Shops, ST/Pilot Stats, Builder) | Home page portrait as a small icon + summary from `MISC_DESCRIPTIONS` |
| Other list pages and the home page | `index.html`'s own generic preview, retitled |

Previews can't be seen by opening the page in a browser. To check them:

- **Locally:** inspect the generated HTML, e.g. `head -40 pilots/ada/index.html`, and look at the `og:` and `twitter:` lines.
- **After deploy:** paste the link into [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) (use "Scrape Again" to refresh its cache), or into a Discord message. Discord also caches previews for a while.

The `og:url`/`og:image` URLs point at `https://mecharashi-wiki.cc/` (`DEFAULT_SITE_URL` in `build_pages.py`); pass a different root as the first argument to override it.

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
