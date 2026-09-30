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

- Pilot ID: 10103175
- Pilot Name: Niall
- Real Name: Niall Kunschteit
- Gender: Female
- Profession: Launcher
- Occupation: Tactician <!-- Use the correct profession icon -->
- Quality: SSR
- License: Medium
- Game version introduced: 3.4

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103175A_half.png
- Avatar (full portrait) file: Pilot_10103175A_raw.png

## Attributes
- Ranged: 1592
- Tactical: 4865
- Assault: 1916
- Melee: 2408
- Mechanic: 1749
- Defense: 4013
- Initial Base Starting AP: 5
- Max Base Starting AP: 6
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Truth Seeker
- Effect text: When any unit on the field tkes non-percentage [Fixed DMG], gains 2 stacks of [Effective Data]. When an ally triggers [Percentage HP Reduction], gains 4 stacks of [Effective Data].
- Icon name: Icon_skill_talent_5167

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: When any unit on the field tkes non-percentage [Fixed DMG], gains 2 stacks of [Effective Data]. When an ally triggers [Percentage HP Reduction], gains 4 stacks of [Effective Data].\nMissile range +1. Final DMG dealt increases by 10%.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Strategic Bombing 1 (same skill as other Tactician with ID 400001)

### Skill 1
- Name: Self Sampling
- Type: SpecialAssault <!-- EquipmentSkill / Order / passive -->
- AP cost: 2
- Cooldown:             <!-- if any -->
- Weapon type: ML <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Deals 10% [Percentage HP Reduction] to all self parts. This effect will not destroy parts. Then uses Missile Launcher to attack a target, dealing 0.9x DMG to the part hit and 50% Splash DMG to other parts. Upon hitting, deals [Fixed DMG] equal to 10% max HP to all parts of all enemy units within 1-tile cross-shaped area around the original target.
- Icon name: Icon_skill_order_1139

### Skill 2
- Name: Contained Fission
- Type: SpecialAssault
- AP cost: 3
- Cooldown:
- Weapon type: ML
- Effect text: Uses Missile Launcher to attack a target, dealing 1.2x DMG to the part hit and 50% Splash DMG to other parts. Inflicts [Retaliation Disabled] on the target after combat, this effect is removed after triggering. If possesses 10 or more stacks of [Effective Data], consumes 10 stacks to increase Splash DMG percentage by 35%.
- Icon name: Icon_skill_order_1129

### Skill 3
- Name: Data Readjustment
- Type: Order
- AP cost: 0
- Cooldown: 2
- Weapon type: ML
- Effect text: Selects up to 4 allies within 4 adjacent tiles. Inflicts [Percentage HP Reduction] equal to 10% max HP to all selected allies. This effect will not destroy parts. For each 1 ally selected, restores 2 rounds of ammo for Missile Launcher and gains 1 AP. Can continue to act with remaining movement.
- Icon name: Icon_skill_order_5168

### Skill 4
- Name: System Disintegration
- Type: SpecialAssault
- AP cost: 5
- Cooldown:
- Weapon type: ML
- Effect text: Uses both Missile Launcher to attack a target, dealing 2x0.8 DMG to the part hit and 50% Splash DMG to other parts. If possesses 10 or more stacks of [Effective Data], consumes 10 stacks to deal 15% of target max HP as [Fixed DMG] to all target's parts. [Fixed DMG] dealt increases by 35% for this attack.
- Icon name: Icon_skill_order_1162

### Skill 5
- Name: Chain Collapse
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: ML
- Effect text: Uses both Missile Launcher to attack a target 2 times, each time dealing 2x0.3 DMG to the part hit and 50% Splash DMG to other parts. If possesses 5 or more stacks of [Effective Data], consumes 5 stacks to add 1 extra attack, up to a maximum of 3 extra attack. These extra attacks do not consume AP nor ammo.
- Icon name: Icon_skill_order_1163

### Skill 6
- Name: Balance the Scale
- Type: Passive
- Effect text: At the start of action, deals [Percentage HP Reduction] equal to 5% max HP to all self parts and gains 1 random buff lasting for 2 turns. This effect will not destroy parts.
- Icon name: Icon_skill_passive_5310

### Skill 7
- Name: Unstable Strain
- Type: Passive
- Effect text: When HP is not full, DMG dealt increases by 10% and DMG taken reduces by 10%.
- Icon name: Icon_skill_passive_1157

### Skill 8
- Name: Optimized Program
- Type: Passive
- Effect text: Increases Critifcal Hit chance and Critical Hit DMG of missile attacks that consume [Effective Data] by 10%.
- Icon name: Icon_skill_passive_4132

## Chip slots setup
<!-- Red = Attack / Blue = Critical / Yellow = Dodge (verified: Eileen β is red/blue/blue in game = Attack/Critical/Critical in CN data; matches .slot-* colors in css/style.css) -->
- Alpha: red/yellow/yellow
- Beta: red/blue/blue
- Gamma 1: red/blue/blue
- Gamma 2: red/yellow/yellow

## Neural passives (Gamma partition — pilot-specific)

<!-- The γ chip is split into two sections, γ1 and γ2, each with exactly 6
     unlocks at fixed chip-point thresholds: 1 / 4 / 7 / 10 / 13 / 16.
     Fill in Name / Effect text / Icon name for all 12 (6 per section). -->
<!-- Some pilots will share same threshold effects -->
<!-- Alpha and Beta section will be the same with other pilots in same class -->
### γ1
<!-- Name / Effect text / Icon name -->
- 1:  Tactical Firepower 1 / After the first attack with a Tactical Weapon each turn, [Re-ATK] can be triggered, effective up to 1 time per turn. Unable to move before attacking. / Icon_skill_passive_5023
- 4:  AP Optimization 4 (same as other Tactician pilots ID 400032)
- 7:  Strategic Bombing 4 (same as other Tactician pilots ID 400033)
- 10: Tactical Firepower 2 / When [Tactical Firepower 1] effect triggers, gains 1 AP / Icon_skill_passive_5023
- 13: Tactical Firepower 3 / When [Tactical Firepower 1] effect triggers, DMG dealt and Critical Hit chance of next active attack increase by 20% / Icon_skill_passive_5023
- 16: Tactical Firepower 4 / When [Tactical Firepower 1] effect triggers, AP cost of next active attack is reduced by 1 (to a minimum of 1) and Final DMG dealt increases by 15% / Icon_skill_passive_5023

### γ2
- 1:  Theory Of Everything 1 / At the end of turn, if 10 or more stacks of [Effective Data] were consumed during the turn, restores 1 AP and 1 ammo of Missile Launcher / Icon_skill_passive_5311
- 4:  AP Optimization 4 (same as other Tactician pilots ID 100042)
- 7:  Power Innovation 3 (same as other Tactician pilots ID 100043)
- 10: Theory Of Everything 2 / If an attack consuming [Effective Data] triggers a Critical hit, 3 stacks of [Effective Data] are refunded after the attack / Icon_skill_passive_5311
- 13: Theory Of Everything 3 / Missile DMG dealt and Hit Rate increase by 15% / Icon_skill_passive_5311
- 16: Theory Of Everything 4 / When actively attacking, for each 5 stacks of [Effective Data] consumed, Final DMG dealt increases by 7.5% / Icon_skill_passive_5311


### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Effective Data: Can be comsume to enhance [Niall]'s skill effects. For each stack concumed, the attack's DMG dealt and Critical Hit chance increase by 2.5%, stacking up to 30 times.
- DMG Immunity: Negates DMG dealt from a single attack. This effect is removed after triggering
- Percentage HP Reduction: Directly reduces HP by a percentage. This effect is not affected by [Fixed DMG] modifiers or [DMG Immunity] effects.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
