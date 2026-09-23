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

- Pilot ID: 10103182
- Pilot Name: Kaidan The Invincible
- Real Name: Kaidan Newman
- Gender: Male
- Profession: Striker
- Occupation: Fighter
- Quality: SSR
- License: Light
- Game version introduced: 3.3

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103182A_half.png
- Avatar (full portrait) file: Pilot_10103182A_raw.png

## Attributes
- Ranged: 668
- Tactical: 934
- Assault: 5193
- Melee: 5365
- Mechanic: 609
- Defense: 4059
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: GKD One
- Effect text: At the start of action, or after destroying a part, inflicts 1 stack of [Suppression] on all enemy units within a 3-tile radius. When performing an active attack, follow up with [Boundless Hunt]
- Icon name: Icon_skill_talent_5164.png

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: At the start of action, or after destroying a part, inflicts 1 stack of [Suppression] on all enemy units within a 3-tile radius. When performing an active attack, follow up with [Boundless Hunt].\nAfter actively attacking with a Melee weapon, the AP cost of next Assault weapon attack is reduced by 1. Inversely, after actively attacking with an Assault weapon, the AP cost of next Melee weapon attack is reduced by 1. Each effect can reduce cost to a minimum of 1 AP and can trigger 1 times per turn.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Mobile Warfare 1 (same skill as other fighters with ID 100001)

### Skill 1
- Name: Raging Gale
- Type: Order <!-- EquipmentSkill / Order / passive -->
- AP cost: 3
- Cooldown:             <!-- if any -->
- Weapon type: Melee <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Dash 3 tiles in a selected direction using a Knuckle or Pile Bunker, dealing 1.2x AoE DMG to all targets hit. Enters [Aiming] Mode before attacking. Inflicts 1 stack of [Suppression] to all targets hit as well as all enemy units within 2 adjacent tile of this unit at the end of the movement.
- Icon name: Icon_skill_order_1160

### Skill 2
- Name: Shield Breaker
- Type: EquipmentSkill
- AP cost: 2
- Cooldown:
- Weapon type: SG
- Effect text: Uses a Shotgun firing a slug or a Melee weapon to attack a target, dealing 0.45x or 1.1x DMG accordingly. Enters [Aiming] Mode before attacking.
- Icon name: Icon_skill_main_1174

### Skill 3
- Name: Total Annihilation
- Type: EquipmentSkill
- AP cost: 4
- Cooldown:
- Weapon type: SG
- Effect text: Uses a Shotgun to attack a target, 1.3x DMG. For each 1 stack of [Suppression] carried by enemy units within 3 adjacent tiles of this unit, performs 1 additional attack, dealing 0.2x DMG, up to 5 additional attacks.
- Icon name: Icon_skill_main_1175

### Skill 4
- Name: Burst Strike
- Type: EquipmentSkill
- AP cost: 5
- Cooldown:
- Weapon type: Melee/SG
- Effect text: Uses a Melee weapon to attack a target, 1.6x DMG. This attack always hits the body. Then follows up with a Shotgun slug shot, dealing 0.5x DMG, prioritizing the part with lowest HP percentage. Critical hit rate increases by 20% for this attack. Inflicts 2 stacks of [Suppression] on the target before combat. This skill requires both a Melee weapon and a Shotgun to be used.
- Icon name: Icon_skill_main_1176

### Skill 5
- Name: Ultimate Mastery (same skill as Rosa: Judgment)

### Skill 6
- Name: Fleeting Shadow
- Type: Passive
- Effect text: At the end of turn, if there are no enemies carrying [Suppression] within 3 adjacent tiles, gains [Movement UP] and [Phantom] for 2 turns
- Icon name: Icon_skill_passive_5123

### Skill 7
- Name: Weakness Hunt
- Type: Passive
- Effect text: When attacking target carrying [Suppression], if there is a part with less than 50% max HP, ignores all target's DMG Reduction effects.
- Icon name: Icon_skill_passive_5317

### Skill 8
- Name: Tranquil Heart
- Type: Passive
- Resource: PP
- Effect text: After actively attacking an enemy carrying [Suppression], if possesses 4 or less AP, consumes 1 PP to recover 3 AP. This effect can trigger 1 time per turn. Gains 2 PP at the start of battle.
- Icon name: Icon_skill_pp_1107


## Chip slots setup
- Alpha: red/yellow/yellow
- Beta: red/yellow/blue
- Gamma 1: red/yellow/yellow
- Gamma 2: red/yellow/blue

## Neural passives (Gamma partition — pilot-specific)

<!-- The γ chip is split into two sections, γ1 and γ2, each with exactly 6
     unlocks at fixed chip-point thresholds: 1 / 4 / 7 / 10 / 13 / 16.
     Fill in Name / Effect text / Icon name for all 12 (6 per section). -->
<!-- Some pilots will share same threshold effects -->
<!-- Alpha and Beta section will be the same with other pilots in same class -->
### γ1
<!-- Name / Effect text / Icon name -->
- 1:  Gun Heart, Blade Soul 1 / When initiating combat, if a Critical hit occurs, uses the opposite arm to launch a [Flurry Strike], dealing 0.5x DMG / Icon_skill_passive_5303
- 4:  AP Optimization 3 (same as other fighter pilots ID 100032)
- 7:  Mobile Warfare 4 (same as other fighter pilots ID 100033)
- 10: Gun Heart, Blade Soul 2 / When initiating combat, if second weapon [Type] is used, increases DMG dealt by 20% for that weapon. / Icon_skill_passive_5303
- 13: Gun Heart, Blade Soul 3 / When attacked by Melee or Assault weapons, DMG taken is reduced by 20% and Critical Hit DMG taken is reduced by 15% / Icon_skill_passive_5303
- 16: Gun Heart, Blade Soul 4 / The [Flurry Strike] multiplier of [Gun Heart, Blade Soul 1] effect increases to 1x / Icon_skill_passive_5303

### γ2
- 1:  Prototype Hyper-Aptamer 1 / [Boundless Hunt] DMG multiplier increases to 0.5x / Icon_skill_passive_5304
- 4:  AP Optimization 4 (same as other fighter pilots ID 100042)
- 7:  Power Innovation 3 (same as other fighter pilots ID 100043)
- 10: Prototype Hyper-Aptamer 2 / When attacking target carrying [Suppression], Hit Chance increases by 10% and Final DMG dealt increases by 15%. The target cannot be affected by [Guard] or Large Shield [Target Shift] during this skirmish / Icon_skill_passive_5304
- 13: Prototype Hyper-Aptamer 3 / [Boundless Hunt] DMG multiplier increases to 0.75x / Icon_skill_passive_5304
- 16: Prototype Hyper-Aptamer 4 / After initiating combat, if [Re-ATK] is not triggered and there are enemy units within 3 adjacent tiles, inflicts 1 stack of [Suppression] to all those enemies and gains 1 AP for each 1 stack applied, up to 3 AP, then triggers [Re-Act]. This effect can trigger 1 time per turn. / Icon_skill_passive_5304


### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Suppression: Armor reduced by 4%, chance of receiving a critical hit increased by 2%, stacking up to 5 times, lasting for 2 turns.
- Phantom: Ignores unit obstruction when moving.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Boundless Hunt
- AP: 0
- Icon: Icon_skill_order_1107
- Effect: Uses a Shotgun to launch an [Extra Strike], dealing 0.25x DMG to all targets within a 2-tile radius affected by [Suppression]. This attack can also trigger the [Re-ATK] effect of [Mobile Warfare].
