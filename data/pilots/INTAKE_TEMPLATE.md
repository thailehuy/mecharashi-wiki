<!--
Pilot intake form — fill this in and hand it back; Claude will turn it into
data/pilots/<ID>.json (+ TEMPLATE.json structure) and run compile.py.

- Leave a field blank / delete a line if it doesn't apply (e.g. no Ascended
  Talent yet, no neural passives beyond the shared Alpha/Beta).
- Skill / Neural entries: copy the block for each one you have.
- Icon name = the `SkillIcon`/`icon` key used elsewhere in this repo (e.g.
  `Icon_skill_main_1021`, `Icon_skill_passive_5007`) — reuse an existing
  one if the effect is similar, or leave blank if you don't have one yet.
- See data/README.md for what each field means and how Alpha/Beta neural
  chips are shared per Occupation (you don't need to fill those in here —
  just confirm the Occupation and they'll be copied from an existing pilot).

Checklist for whoever (or whichever agent) turns this into the JSON file —
each point below came from a real mistake made while building the first
pilot from this template (10103182, Kaidan The Invincible):

1. Pick a structural template from an EXISTING pilot with the same
   Occupation, license, and (ideally) game version, then copy its
   `biomimetic_computer_data` wholesale and only swap in IDs/names/skills.
   Different content revisions use a different number of Core Neuron slots
   (7 vs 8) — count how many numbered Skills are in this form (Skill 0 is
   the shared innate one; everything after that needs its own Core Neuron
   slot) and match a reference pilot with the same count.
2. Numbers in every SpecificEffects/describe/effect string must be wrapped
   as `<color=#F74848>NUMBER</color>` (see any existing pilot file for the
   convention) — the plain intake text above is NOT what goes into the
   JSON verbatim. The `%`/`+`/`-` sign stays inside the tag
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
   the pilot's own file is not enough, the popup looks it up there. Only
   give a glossary entry an `icon` field if one was explicitly specified
   for it in this form; don't borrow another skill's icon just to avoid a
   blank slot, or the popup shows a broken image.
5. `Type: Passive` core-neuron skills use `SpecificEffects` (not
   `describe`) and omit the `type` key entirely. `Resource: PP` must
   become `"resource": "PP"` on the skill object (that's what the site
   checks to show the PP badge) in addition to it being mentioned in the
   effect text. A skill that moves the unit as part of the attack (a dash/
   charge) is `type: "SpecialAssault"`, not `"Order"`, and still needs a
   `matchingWeaponType`.
6. Icons: every icon name referenced (talent/skill/neural/glossary) should
   already exist as a file under data/unlisted/pilot_skills/ — check with
   `ls` before using one. The site tries the local file first and only
   falls back to the CN CDN if that 404s, so a wrong/missing local
   filename means a broken icon even if the CDN also doesn't have it.
7. After writing the JSON (+ a `<ID>-translation.json` with just
   `{ "version": "X.Y" }`), run `python3 compile.py` and confirm the pilot
   shows up in `data/pilots/compiled.json`, and add the pilot's name to
   `PILOT_RELEASE_ORDER` in `js/pages/pilots.js` if it's a new release.
-->

## Basics

- Pilot ID: 10103181
- Pilot Name: Sonya
- Real Name: Sonya Volokova
- Gender: Female
- Profession: Striker
- Occupation: Fighter <!-- Use the correct profession icon -->
- Quality: SSR
- License: Light
- Game version introduced: 3.7

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103181A_half.png
- Avatar (full portrait) file: Pilot_10103181A_raw.png

## Attributes
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

### Basic Talent (Talent0_2Ability)
- Name: Frost Gaze Flame Heart
- Effect text: At the start of action, inflicts [Opening] in a random direction to all enemies not carrying [Opening], and inflicts [Opening] in the direction facing this unit to the closest enemy, lasting for 1 turn. Gains 1 stack of [Fighting Spirit] for each 1 stack of [Opening] inflicted.
- Icon name: Icon_skill_talent_5172

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: At the start of action, inflicts [Opening] in a random direction to all enemies not carrying [Opening], and inflicts [Opening] in the direction facing this unit to the closest enemy, lasting for 1 turn. Gains 1 stack of [Fighting Spirit] for each 1 stack of [Opening] inflicted.\nGains 4 stacks of [Fighting Spirit] at the start of battle. Skill multiplier increases by +0.1 when attacking [Opening].

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Mobile Warfare 1: same as other fighters

### Skill 1
- Name: Glacial Gleam
- Type: EquipmentSkill <!-- EquipmentSkill / Order / passive -->
- AP cost: 3
- Cooldown:             <!-- if any -->
- Weapon type: AB <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Uses Alter-Blades to attack a target, dealing 2x0.6 DMG, prioritizing the body part. Can consume up to 2 stacks of [Fighting Spirit] to increase the skill multiplier by +0.1 per stack consumed.
- Icon name: Icon_skill_main_1161

### Skill 2
- Name: Soaring Swan
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: AB
- Effect text: Dashes 3 tiles forward in a selected direction with both Alter-Blades, dealing 1.5x DMG to all targets hit. Enters [Aiming] Mode before attacking. Inflicts [Opening] to all targets hit.
- Icon name: Icon_skill_order_1174

### Skill 3
- Name: Nightfall
- Type: SpecialAssault
- AP cost: 3
- Cooldown: 0
- Weapon type: AB
- Effect text: Selects <color=#F74848>1</color> target within <color=#F74848>4</color> adjacent tiles (including flying targets) and strikes using Alter-Blades to deal <color=#F74848>1.2x</color> DMG. Can enter <buf ID=900014>[Aiming]</buf> Mode before attacking, then remains on a random empty tile within <color=#F74848>1</color> ring around the target after hitting. Critical Hit DMG increases by 20% for this attack
- Icon name: Icon_skill_order_1172

### Skill 4
- Name: Frostmark
- Type: Order
- AP cost: 0
- Cooldown:
- Weapon type: AB
- Effect text: Selects 1 target within 4 adjacent tiles, inflicts [Opening] in the direction facing [Sonya] to that target. Can continue to act with remaining movement. This skill can only be used 1 time per turn.
- Icon name: Icon_skill_order_5180

### Skill 5
- Name: Moon Splitter
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: AB
- Effect text: Selects 1 target within 4 adjacent tiles and attacks 2 times with both Alter-Blades, dealing 0.7x DMG each, prioritizing body part. Before attacking, consumes all stacks of [Fighting Spirit]. For each 2 stacks consumed, perform 1 addtional attack on a random target within 1 ring around the target, prioritizing targets that have not been attacked.
- Icon name: Icon_skill_order_1173

### Skill 6
- Name: Opening Guard
- Type: Passive
- AP Cost:
- Cooldown:
- Effect text: When attacked by Melee or Ranged Weapons, if equipped with two Alter-Blades and both Arms are undestroyed, triggers <buf ID=900136>[Critical Sense]</buf>, dealing <color=#F74848>1.2x</color> DMG. Can only trigger <color=#F74848>1</color> time per turn.
- Icon name: Icon_skill_passive_5238

### Skill 7
- Name: Ice Stride
- Type: Passive
- Effect text: At the start of turn, dispels 2 debuffs from self
- Icon name: Icon_skill_passive_3124

### Skill 8
- Name: Combat Flow
- Type: Passive
- Resource: PP
- Effect text: From turn 2, at the start of turn, if possesses 2 or less stacks of [Fighting Spirit], consumes 1 PP to gains 3 stacks of [Fighting Spirit]. Gains 2 PP at the start of battle
- Icon name: Icon_skill_pp_1112

## Chip slots setup
<!-- Red = Attack / Blue = Critical / Yellow = Dodge (verified: Eileen β is red/blue/blue in game = Attack/Critical/Critical in CN data; matches .slot-* colors in css/style.css) -->
- Alpha: red/yellow/yellow
- Beta: red/yellow/blue
- Gamma 1: red/yellow/blue
- Gamma 2: red/yellow/yellow

## Neural passives (Gamma partition — pilot-specific)

<!-- The γ chip is split into two sections, γ1 and γ2, each with exactly 6
     unlocks at fixed chip-point thresholds: 1 / 4 / 7 / 10 / 13 / 16.
     Fill in Name / Effect text / Icon name for all 12 (6 per section). -->
<!-- Some pilots will share same threshold effects -->
<!-- Alpha and Beta section will be the same with other pilots in same class -->

### γ1
<!-- Name / Effect text / Icon name -->
- Same as Ada

### γ2
- 1:  Ice Blossom Blade 1 / When triggering [Opening], gains 1 AP and 1 stack of [Fighting Spirit]. / Icon_skill_passive_5330
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Ice Blossom Blade 2 / When triggering [Opening] on a Boss unit, [Weakness] is regenerated after combat. This effect can trigger 1 time per turn. DMG Dealt increases by 25% against Boss unit. / Icon_skill_passive_5330
- 13: Ice Blossom Blade 3 / After [Opening] is triggered, gains 1 AP and trigger [Re-Act]. This effect can trigger 1 time per turn. / Icon_skill_passive_5330
- 16: Ice Blossom Blade 4 / Final DMG Dealt increases by 25%. This effect is decreased by 4% after each ally's action, and resets at the start of turn. / Icon_skill_passive_5330


### Glossary buf
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Opening: When [Sonya] uses a melee weapon to attack this target from the direction indicated by this debuff and landing a hit, DMG Dealt increases by 20% and the attack will score a Critical Hit. This effect is removed after combat.
- Fighting Spirit: DMG Dealt increases by 4%, stacking up to 6 times. Can be consumed to enhance [Sonya]'s skills.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
