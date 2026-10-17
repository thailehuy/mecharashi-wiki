<!--
Pilot intake form — fill this in and hand it back; Claude will turn it into
rows in the data/db/ tables (see data/README.md "Adding a pilot") and run
scripts/compile.py.

- Leave a field blank / delete a line if it doesn't apply (e.g. no Ascended
  Talent yet, no neural passives beyond the shared Alpha/Beta).
- Skill / Neural entries: copy the block for each one you have.
- Icon name = the `SkillIcon`/`icon` key used elsewhere in this repo (e.g.
  `Icon_skill_main_1021`, `Icon_skill_passive_5007`) — reuse an existing
  one if the effect is similar, or leave blank if you don't have one yet.
- See data/README.md for what each field means and how Alpha/Beta neural
  chips are shared per Occupation (you don't need to fill those in here —
  just confirm the Occupation and they'll be copied from an existing pilot).

Checklist for whoever (or whichever agent) turns this into table rows —
each point below came from a real mistake made while building the first
pilot from this template (10103182, Kaidan The Invincible):

1. Pick a structural template from an EXISTING pilot with the same
   Occupation, license, and (ideally) game version, then copy its
   data/db/pilot_neurons.json list wholesale and only swap in IDs/skills.
   Reuse the occupation's shared α/β partitions (`<occupation>-alpha`/
   `-beta`); only γ1/γ2 are new. The chip slot colours go in the pilot's
   `neural[].slots`.
   Different content revisions use a different number of Core Neuron slots
   (7 vs 8) — count how many numbered Skills are in this form (Skill 0 is
   the shared innate one; everything after that needs its own Core Neuron
   slot) and match a reference pilot with the same count.
2. Numbers in every SpecificEffects/describe/effect string must be wrapped
   as `<color=#F74848>NUMBER</color>` (see any existing pilot file for the
   convention) — the plain intake text above is NOT what goes into the
   table verbatim. The `%`/`+`/`-` sign stays inside the tag
   (`<color=#F74848>+15%</color>`); an `x` multiplier suffix stays OUTSIDE
   it (`<color=#F74848>1.2</color>x`).
3. Every `[BracketedName]` in the effect text must become a real
   `<buf ID=...>`/`<skill ID=...>` tag — but check data/glossary.json FIRST
   for an ID that already has that exact name (e.g. Guard, Target Shift,
   Movement UP, Re-ATK) rather than inventing a new one; reusing an
   unrelated existing ID by guesswork will silently point the tooltip at
   the wrong entry. Don't tag generic placeholder text that isn't actually
   a named buf/skill (e.g. a literal "[Type]" meaning "whichever weapon
   type" is not a tag).
4. Any genuinely new buf/skill introduced by "Glossary buf 1"/"Glossary
   skill 1" below must ALSO be added as its own entry in
   data/glossary.json (top-level `buf`/`skill` maps) — adding the tag to
   the pilot's skill text is not enough, the popup looks it up there. Only
   give a glossary entry an `icon` field if one was explicitly specified
   for it in this form; don't borrow another skill's icon just to avoid a
   blank slot, or the popup shows a broken image.
5. `Type: Passive` core-neuron skills use `effect` (not `describe`) and
   omit the `type` key entirely in data/db/skills.json. `Resource: PP` must
   become `"resource": "PP"` on the skill row (that's what the site checks
   to show the PP badge) in addition to it being mentioned in the effect
   text. A skill that moves the unit as part of the attack (a dash/charge)
   is `type: "SpecialAssault"`, not `"Order"`.
6. Icons: every icon name referenced (talent/skill/neural/glossary) should
   already exist as a file under data/unlisted/pilot_skills/ — check with
   `ls` before using one. The site tries the local file first and only
   falls back to the CN CDN if that 404s, so a wrong/missing local
   filename means a broken icon even if the CDN also doesn't have it.
7. Set `version` on the pilots.json row, run `python3 scripts/compile.py` (it
   fails on any broken ID reference) and confirm the pilot shows up in
   `data/pilots/compiled.json`, and add the pilot's name to
   `PILOT_RELEASE_ORDER` in `js/pages/pilots.js` if it's a new release.
-->

## Basics
<!-- → data/db/pilots.json row, keyed by Pilot ID -->

- Pilot ID: 10103187
- Pilot Name: Morgana                  <!-- name -->
- Real Name: Morgana Slyce         <!-- real_name -->
- Gender: Female                    <!-- gender -->
- Profession: Assault               <!-- profession -->
- Occupation: Raider <!-- occupation; also picks the shared α/β partitions and the innate Profession Neuron icon -->
- Quality: SSR                      <!-- quality -->
- License: Heavy                    <!-- license -->
- Game version introduced: 3.7      <!-- version -->

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_13038A_half.png  <!-- portrait_icon (without .png) -->
- Avatar (full portrait) file: Pilot_13038A_raw.png <!-- avatar_icon (without .png) -->

## Attributes
<!-- → the pilots.json row's `stats`: Ranged → shooting, Tactical → tactics,
     Assault → assault, Melee → combat, Mechanic → engineering,
     Defense → defense, the AP lines → ap_init / ap_max / ap_regen -->
- Ranged: 0
- Tactical: 0
- Assault: 0
- Melee: 0
- Mechanic: 0
- Defense: 0
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->
<!-- Each talent → a data/db/skills.json row (kind "talent", `effect`);
     the pilots.json row's `talents` is [basic ID, ascended ID] -->

### Basic Talent
- Name: Deathbound Wanderer
- Effect text: When eqipped with 2 Shotguns, can perform [Dual Shotgun Attack], [Dual Shotgun Flurry Strike], [Dual Shotgun Retaliation] and [Dual Shotgun Link Attack]. Each attack grants 1 stack of [Predation], up to 30 stacks. When initiating combat, if the distance to the target is 1 tile, can trigger [Re-Act] after combat (up to 1 time per turn).
- Icon name: Icon_skill_talent_5171

### Ascended Talent
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: When eqipped with 2 Shotguns, can perform [Dual Shotgun Attack], [Dual Shotgun Flurry Strike], [Dual Shotgun Retaliation] and [Dual Shotgun Link Attack]. Each attack grants 1 stack of [Predation], up to 30 stacks. When initiating combat, if the distance to the target is 1 tile, can trigger [Re-Act] after combat (up to 1 time per turn).\nAt the start of battle, gains 5 stacks of [Predation]. Movement ignores unit collision.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     Each → a data/db/skills.json row (kind "skill"), referenced by a
     neuron's `skill` in data/db/pilot_neurons.json.
     Type → `type`: EquipmentSkill (weapon attack) / Order (code) /
     SpecialAssault (code + attack, incl. dashes); passives have no `type`.
     Actives put their text in `describe`, passives in `effect`.
     AP cost → `ap`, Cooldown → `cd`, Resource: PP → `resource: "PP"`. -->
### Skill 0 (innate)
- CEC 1: same as other raiders

### Skill 1
- Name: No Forgiveness - No Mercy
- Type: EquipmentSkill <!-- EquipmentSkill / Order / passive -->
- AP cost: 4
- Cooldown:             <!-- if any -->
- Weapon type: SG <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee; not stored, the effect text names the weapon -->
- Effect text: Uses both Shotgun to simultaneously attack a target, dealing 2x0.65 DMG. For each 1 stack of [Predation], this skill multiplier is increased by 0.01x. For each 1 [Basic Attack] performed during current turn, this skill AP cost is reduced by -1, to a minimum of 1. This AP cost is reset after used.
- Icon name: Icon_skill_main_1182

### Skill 2
- Name: Predator Rite
- Type: Order
- AP cost: 0
- Cooldown: 3
- Weapon type: SG
- Effect text: Gains 5 stacks of [Predation] as well as 2 AP. Can move up to 2 tiles after use and can attack after moving.
- Icon name: Icon_skill_order_5178

### Skill 3
- Name: Blood Oath
- Type: Order
- AP cost: 0
- Cooldown: 2
- Weapon type: SG
- Effect text: Gains [Blood Pact] for 1 turn. Can continue to act with remaining movement.
- Icon name: Icon_skill_order_5179

### Skill 4
- Name: Calamity Covenant
- Type: Passive
- AP cost: 0
- Cooldown:
- Weapon type: SG
- Effect text: For each 15% HP lost before the attack, DMG Dealt increases by 10%, up to 40%.
- Icon name: Icon_skill_order_5320

### Skill 5
- Name: Shadow Raven Stride
- Type: Passive
- AP cost: 0
- Cooldown:
- Weapon type: SG
- Effect text: When a [Basic Attack] lands a Critical Hit, gains Movement +1 for 2 turns, stacking up to 2 times.
- Icon name: Icon_skill_passive_5329

### Skill 6
- Name: Piercing Mastery
- Type: Passive
- AP Cost:
- Cooldown:
- Effect text: After performing [Basic Attack], Critical Hit DMG +5%, stacking up to 5 times. Stacks last till the end of action.
- Icon name: Icon_skill_passive_5238

### Skill 7
- Missing

### Skill 8
- Name: Final Pursuit
- Type: Passive
- Resource: PP
- Effect text: When body takes over damage, consumes 1 PP to restores body to 20% of max HP, recovers 5 AP and gains [Last Whisper]. This effect has a 3 turns trigger interval. Gains 2 PP at the start of battle.
- Icon name: Icon_skill_pp_1111

## Chip slots setup
<!-- → `slots` on each entry of the pilots.json row's `neural` list, e.g.
     red/yellow/yellow = "Attack/Dodge/Dodge".
     Red = Attack / Blue = Critical / Yellow = Dodge (verified: Eileen β is red/blue/blue in game = Attack/Critical/Critical; matches .slot-* colors in css/style.css) -->
- Alpha: red/yellow/blue
- Beta: red/yellow/yellow
- Gamma 1: red/yellow/yellow
- Gamma 2: red/yellow/blue

## Neural passives (Gamma partition — pilot-specific)

<!-- The γ chip is split into two sections, γ1 and γ2, each with exactly 6
     unlocks at fixed chip-point thresholds: 1 / 4 / 7 / 10 / 13 / 16.
     Fill in Name / Effect text / Icon name for all 12 (6 per section). -->
<!-- Some pilots will share same threshold effects (reuse their skills.json IDs) -->
<!-- Alpha and Beta are shared per class: reference `<occupation>-alpha` /
     `<occupation>-beta` in data/db/neural_partitions.json. γ1/γ2 become new
     partitions `<pilotID>-gamma1` / `<pilotID>-gamma2` (type "Gamma"), each
     effect a skills.json row (kind "neural", `effect`). -->

### γ1
<!-- Name / Effect text / Icon name -->
- Same as Frida

### γ2
- 1:  Predator Elite 1 / Talent's [Re-Act] trigger count +1. / Icon_skill_passive_5329
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Predator Elite 2 / When initiating combat, if the distance to target is 1 tile, triggers [Dual Shotgun Flurry Strike], up to 2 times per turn / Icon_skill_passive_5329
- 13: Predator Elite 3 / Each stack of [Predation] additionally grants 1% Critical Hit chance. / Icon_skill_passive_5329
- 16: Predator Elite 4 / After performing 2 [Basic Attack], AP cost for [Basic Attack] reduces by -1 for that turn, to a minimum of 1 AP. This effect is reset at the end of action. / Icon_skill_passive_5329


### Glossary buf
<!-- Pick an unused ID for the <buf> tag, add the entry to data/glossary.json (`buf`), and tag every reference in this pilot's text -->
- Predation: Hit Chance increases by 0.5% and DMG Dealt increases by 1% per stack, up to 30 stacks.
- Blood Pact: Increases Hit Weighting of own body part by +45. After each [Basic Attack], suffers [Percentage HP Reduction] equal to 10% max HP to all parts. This effect will not destroy parts. Shotgun bullets +2.
- Last Whisper: Immunes to all DMG. After each active attack, triggers [Re-ATK], allowing movement of 1 tile before attacking. This effect has no trigger limit while active and is removed at the end of turn. Gains [Energy Blockade] for 1 turn after this effect is removed.
- Energy Blockage: Cannot gain AP.

### Glossary skill 1
<!-- Pick an unused ID for the <skill> tag, add the entry to data/glossary.json (`skill`), and tag every reference in this pilot's text -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Dual Shotgun Attack
- AP: 2
- CD: 0
- Icon: Icon_skill_main_1064
- Effect: Uses both Shotgun to simultaneously attack a target, dealing 2x0.55 DMG.

### Glossary skill 2
<!-- Pick an unused ID for the <skill> tag, add the entry to data/glossary.json (`skill`), and tag every reference in this pilot's text -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Dual Shotgun Flurry Strike
- AP: 0
- CD: 0
- Icon: Icon_skill_main_1064
- Effect: Uses both Shotgun to simultaneously attack a target, dealing 2x0.2 DMG.

### Glossary skill 3
<!-- Pick an unused ID for the <skill> tag, add the entry to data/glossary.json (`skill`), and tag every reference in this pilot's text -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Dual Shotgun Retaliation
- AP: 0
- CD: 0
- Icon: Icon_skill_main_1064
- Effect: Uses both Shotgun to simultaneously retaliate to a target, dealing 2x0.4 DMG.

### Glossary skill 4
<!-- Pick an unused ID for the <skill> tag, add the entry to data/glossary.json (`skill`), and tag every reference in this pilot's text -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Dual Shotgun Link Attack
- AP: 0
- CD: 0
- Icon: Icon_skill_main_1064
- Effect: After an ally launches an attack, use two Shotguns to launch a [Link Attack] on the target they attacked. dealing 2x0.1 DMG.
