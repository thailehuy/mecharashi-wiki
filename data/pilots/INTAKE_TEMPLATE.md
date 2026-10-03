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

- Pilot ID: 10103184
- Pilot Name: Cosette
- Real Name: Cosette Cecil
- Gender: Female
- Profession: Striker
- Occupation: Fighter <!-- Use the correct profession icon -->
- Quality: SSR
- License: Medium
- Game version introduced: 3.6

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_11021A_half.png
- Avatar (full portrait) file: Pilot_11021A_raw.png

## Attributes
- Ranged: 1799
- Tactical: 1956
- Assault: 1337
- Melee: 5281
- Mechanic: 2103
- Defense: 4062
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Feather Of Tomorrow
- Effect text: When equipped with Chainsaw, gains 1 stack of [Edge Momentum] for each 1 tile moved, up to 5 stacks per action. Upon consuming [Edge Momentum] to trigger active skill [Breakthrough], gains [Razor Feather] and triggers [Re-ATK], allowing movement of 2 tiles before attacking. This effect can trigger 1 time per turn.
- Icon name: Icon_skill_talent_1126

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: When equipped with Chainsaw, gains 1 stack of [Edge Momentum] for each 1 tile moved, up to 5 stacks per action. Upon consuming [Edge Momentum] to trigger active skill [Breakthrough], gains [Razor Feather] and triggers [Re-ATK], allowing movement of 2 tiles before attacking. This effect can trigger 1 time per turn.\nAt the start of battle, gains 5 stack of [Edge Momentum] and increases maximum stack limit by +5. For each 50 surplus power, DMG Dealt increases by +1%, up to 20%.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Mobile Warfare 1: same as other fighters

### Skill 1
- Name: Whirling Sweep
- Type: SpecialAssault <!-- EquipmentSkill / Order / passive -->
- AP cost: 2
- Cooldown:             <!-- if any -->
- Weapon type: CS <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Uses Chainsaw to attack all enemies within 3-tile horizontal area in front, dealing 0.8x AoE DMG. When [Edge Momentum] is at 8 stacks or more, this skill multiplier increases by +0.1. Can consume 5 stacks of [Edge Momentum] to increase Critical Hit DMG of this attack by +15% and expand the area to half circle in front, prioritizing the part with lowest HP.
- Icon name: Icon_skill_order_1102

### Skill 2
- Name: Azure Blitz
- Type: SpecialAssault
- AP cost: 3
- Cooldown:
- Weapon type: CS
- Effect text: Selects a tile in a straight direction, then selects an end tile in 3 possible directions, covering up to 4 tiles. Uses Chainsaw to attack all enemies along the path, dealing 1.2x AoE DMG. This attack prioritizes the part with lowest HP. When [Edge Momentum] is at 8 stacks or more, this skill multiplier increases by +0.2. Can consume 5 stacks of [Edge Momentum] to increase the number of selectable tiles by +2 and change the priority to the part with highest HP.
- Icon name: Icon_skill_order_1167

### Skill 3
- Name: Raging Tide
- Type: Order
- AP cost: 1
- Cooldown: 2
- Weapon type: CS
- Effect text: Gains 3 stacks of [Edge Momentum] as well as [Phantom] for 2 turns. Movement increases by +1 for this turn. Can continue to act with full movement. When [Edge Momentum] is at 8 stacks or more, additionally gains 2 stacks of [Edge Momentum] and +1 extra movement for the current turn.
- Icon name: Icon_skill_order_5174

### Skill 4
- Name: Radiant Cleave
- Type: EquipmentSkill
- AP cost: 3
- Cooldown:
- Weapon type: CS
- Effect text: Uses Chainsaw to attack a main target, dealing 1.0x DMG, then attacks all enemies within 1 ring AoE around the target, dealing 0.6x AoE DMG. When [Edge Momentum] is at 8 stacks or more, this skill multiplier increases by +0.1. Can consume 5 stacks of [Edge Momentum] to make this attack always hits body, and if the main target's body is at 50% or higher, additionally deals [Fixed DMG] equal to 15% of [Cosette]'s body max HP to all hit enemies' bodies after combat. This [Fixed DMG] effect can trigger [Mobile Warfare 1] [Re-ATK] effect.
- Icon name: Icon_skill_main_1181

### Skill 5
- Name: Sharpened Momentum
- Type: Passive
- AP cost: 
- Cooldown: 
- Weapon type: CS
- Effect text: When actively attacking with Chainsaw, gains 1 stack of [Edge Momentum]. This effect can trigger 2 times per turn.
- Icon name: Icon_skill_order_5169

### Skill 6
- Name: Mercenary Tempo
- Type: Passive
- AP Cost: 
- Cooldown:
- Effect text: If [Edge Momentum] is at 6 stacks or more after an action, gains 1 AP. This effect can trigger 1 time per turn
- Icon name: Icon_skill_main_1065

### Skill 7
- Name: Rending Chain
- Type: Passive
- Effect text: When actively attacking, if [Edge Momentum] is at 8 stacks or more, inflicts [Laceration] to the primary target hit.
- Icon name: Icon_skill_passive_5279

### Skill 8
- Name: Tactical Compensation
- Type: Passive
- Effect text: After consuming [Edge Momentum] to trigger [Breakthrough], [Edge Momentum] will not be reduced at the end of turn.
- Icon name: Icon_skill_passive_5323

## Chip slots setup
<!-- Red = Attack / Blue = Critical / Yellow = Dodge (verified: Eileen β is red/blue/blue in game = Attack/Critical/Critical in CN data; matches .slot-* colors in css/style.css) -->
- Alpha: red/yellow/blue
- Beta: red/yellow/yellow
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
- Same as Hong

### γ2
- 1:  Heir Of Danube 1 / Maximum [Edge Momentum] stacks gain per action increases to 8. Talent [Re-ATK] effect is upgraded to [Re-Act]. / Icon_skill_passive_5324
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Heir Of Danube 2 / When actively attacking, if the target's body is at full HP, ignores 25% target's Armor and Critical Hit chance increases by 10%. / Icon_skill_passive_5324
- 13: Heir Of Danube 3 / Chainsaw Final DMG Dealt increases by 10%. When possessing 3 or more stacks of [Razor Feather], Chainsaw Final DMG Dealt additionally increases by 15%. / Icon_skill_passive_5324
- 16: Heir Of Danube 4 / When possessing 5 or more stacks of [Edge Momentum], if AP is insufficient to cast any skill, can consumes 5 stacks of [Edge Momentum] to pay for 1 AP cost. This effect can trigger 2 times per turn. / Icon_skill_passive_5324


### Glossary buf
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Edge Momentum: Holding 8 stacks or more to enhance active skills effect. Can consume 5 stacks to trigger [Breakthough] for active skills. Stacks up to 15 times. 3 stacks are removed at the end of turn.
- Razor Feather: Chainsaw DMG Dealt increases by 5%, stacking up to 5 times.
- Breakthrough: Greatly improves active skills effect.
- Laceration: DMG Taken from Chainsaw attack increases by 5%, stacking up to 4 times. This effect is removed at the end of turn.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
