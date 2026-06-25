# mecharashi-wiki

A static fan wiki for **Mecharashi**, built with Bootstrap 5 and jQuery. Hosted on GitHub Pages.

## Features

- Single-page app with hash-based routing (`#pilots`, `#pilots/Name`, `#sts`, `#sts/Name`)
- **Pilots** listing with avatar, rank badge (S/A/B), version badge, and filters for Rank, Occupation, and Version
- **STs (mechs)** listing with avatar, rank badge, version badge, and filters for Rank, Type, and Version
- Detail pages for both Pilots and STs
- Runtime translation loading — editing a `<ID>-translation.json` file and pushing takes effect on GitHub Pages without recompiling

## Project structure

```
index.html                        # Entry point
css/style.css                     # All styles
js/
  app.js                          # Hash router
  translations.js                 # Runtime translation loader
  pages/
    pilots.js                     # Pilots listing + detail page
    sts.js                        # STs listing + detail page
data/
  pilots/
    list.json                     # GL pilot index
    list-cn.json                  # CN pilot index
    <ID>.json                     # Raw pilot detail (GL or CN)
    <ID>-translation.json         # Display-field overrides (edit to translate)
    compiled.js                   # Bundled pilot data loaded by index.html
    compiled.json                 # Source for compiled.js
    compile.py                    # Rebuild compiled.js from raw + translation files
  mechs/
    list.json                     # GL mech index
    list-cn.json                  # CN mech index
    <ID>.json                     # Raw mech detail (GL or CN)
    <ID>-translation.json         # Display-field overrides (edit to translate)
    compiled.js                   # Bundled mech data loaded by index.html
    compiled.json                 # Source for compiled.js
    compile.py                    # Rebuild compiled.js from raw + translation files
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
- Modules with level display (`Lv.X/X`) and parsed descriptions

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

### Compiling

```bash
python3 data/pilots/compile.py
python3 data/mechs/compile.py
```

The compile scripts merge `<ID>-translation.json` over the raw data and write `compiled.js`.

### Adding a new pilot or ST

1. Add the ID/name to the relevant `list.json` (and `list-cn.json` if CN-only)
2. Fetch the raw detail file and save as `<ID>.json`
3. A `<ID>-translation.json` is generated automatically on the next compile run — fill in English fields for CN-only entries
4. Run the compile script and push

### Translating a CN-only entry (no recompile)

Edit the `<ID>-translation.json` with English values and push. GitHub Pages serves the updated translation file and the detail page picks it up automatically via `fetch()`. For local testing, serve with:

```bash
python3 -m http.server 8080
```

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
