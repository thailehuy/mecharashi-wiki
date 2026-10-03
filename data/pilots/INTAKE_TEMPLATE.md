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

- Pilot ID: 10103183
- Pilot Name: Sylar
- Real Name: Sylar Valencia
- Gender: Female
- Profession: Tactician
- Occupation: Tactician <!-- Use the correct profession icon -->
- Quality: SSR
- License: Medium
- Game version introduced: 3.6

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103183A_half.png
- Avatar (full portrait) file: Pilot_10103183A_raw.png

## Attributes
- Ranged: 2084
- Tactical: 4904
- Assault: 1425
- Melee: 1916
- Mechanic: 2241
- Defense: 3972
- Initial Base Starting AP: 5
- Max Base Starting AP: 6
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Eternal Shadowwalker
- Effect text: Can use command skill [Resonance Link]. When equipped with Rail Gun, can use command skill [Hunter Mode].
- Icon name: Icon_skill_talent_5170

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: Can use command skill [Resonance Link]. When equipped with Rail Gun, can use command skill [Hunter Mode].\nWhile in [Hunter Mode], Final DMG Dealt increases by 15%.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Strategic Bombing 1: same as other tacticians

### Skill 1
- Name: Breathtaking Lightray
- Type: SpecialAssault <!-- EquipmentSkill / Order / passive -->
- AP cost: 3
- Cooldown:             <!-- if any -->
- Weapon type: RG <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Uses Rail Gun to attack all enemies within a cross-shaped area around a target within 5 adjacent tile, dealing 0.5x DMG. DMG multiplier increases to 0.9x against the target in the center. Enters [Aiming] Mode before attacking. This attack can target [Resonance Node].
- Icon name: Icon_skill_order_1108

### Skill 2
- Name: Thunder Sweep
- Type: SpecialAssault
- AP cost: 2
- Cooldown:
- Weapon type: RG
- Effect text: Uses Rail Gun to attack all targets within a 3x5 area in front, dealing 0.75x AoE DMG and knocking them back by 2 tiles. If a target is blocked by obstacles during knock back, inflicts [Movement Inhibition II] for 1 turn. Triggers [Re-ATK] in place after combat. This skill can only be used 1 time per turn.
- Icon name: Icon_skill_order_1109

### Skill 3
- Name: Steady Calibration
- Type: Order
- AP cost: 0
- Cooldown: 3
- Weapon type: RG
- Effect text: Fully reloads all Rail Gun ammo. Next active attack multiplier increases by +0.2x. Triggers [Re-ATK] in place after use.
- Icon name: Icon_skill_order_5160

### Skill 4
- Name: Dawn Annihilation
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: RG
- Effect text: Consumes 2 Rail Gun ammo, uses Rail Gun to attack all targets within a 3x5 area in front, dealing 0.85x AoE DMG. Enters [Aiming] Mode before attacking.
- Icon name: Icon_skill_order_1168

### Skill 5
- Name: ND Maneuver
- Type: Order
- AP cost: 1
- Cooldown: 2
- Weapon type: RG
- Effect text: Selects an empty tile within 4 adjacent tiles of [Resonance Node] and teleports to the selected tile. Can continue to act with remaining movement.
- Icon name: Icon_skill_order_5175

### Skill 6
- Name: Petal Storm
- Type: SpecialAssault
- AP Cost: 4
- Cooldown:
- Effect text: Consumes 2 Rail Gun ammo, uses Rail Gun to attack all targets within 2 adjacent tiles of the target, dealing 1.1x AoE DMG. This attack ignores low obstacles and always hits the body. This skill can target any tile within 4 adjacent tile of [Resonance Node]. Grants [Attraction Beacon] skill to [Resonance Node]
- Icon name: Icon_skill_main_1169

### Skill 7
- Name: Resonance Anchor
- Type: Passive
- Effect text: Outside of ally turn, this unit and [Resonance Node] are immune to all displacement effects.
- Icon name: Icon_skill_passive_1013

### Skill 8
- Name: Vow Of Tomorrow
- Type: Passive
- Effect text: When [Resonance Node] takes fatal DMG, restores all their parts to 50% of max HP, inflicts [System Failure] and teleports them to [Sylar]'s side. This effect can trigger 1 time per battle.
- Icon name: Icon_skill_passive_5325

## Chip slots setup
<!-- Red = Attack / Blue = Critical / Yellow = Dodge (verified: Eileen β is red/blue/blue in game = Attack/Critical/Critical in CN data; matches .slot-* colors in css/style.css) -->
- Alpha: red/yellow/blue
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
- Same as Niall

### γ2
- 1:  Legacy Of Ophiuchus 1 / At the start of action, if this unit was not attacked in previous turn, gains 1 AP and 1 Rail Gun ammo. / Icon_skill_passive_5326
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Legacy Of Ophiuchus 2 / When actively attacking with Rail Gun, if [Resonance Node] is within skill range, or if the attack destroys a target, gains 1 Rail Gun ammo after combat. This effect can trigger 2 times per turn. / Icon_skill_passive_5326
- 13: Legacy Of Ophiuchus 3 / When actively attacking with Rail Gun, for each 1 enemy unit or [Resonance Node] within the skill range, DMG Dealt and Critical Hit chance increase by 5%, up to 15%. / Icon_skill_passive_5326
- 16: Legacy Of Ophiuchus 4 / If there are no enemies within 2 adjacent tiles, Final DMG Dealt increases by +25%. / Icon_skill_passive_5326


### Glossary buf
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Resonance Node: Desinated unit to assist [Sylar]. When this unit is within [Sylar]'s Rail Gun skill range, [Sylar]'s attack ignores the target's standard [DMG Reduction] effect, and DMG Dealt and Hit Rate are increased by 10%.
- Hunter Mode: DMG Dealt increases by 30% and Critical Hit chance increases by 20% while using Rail Gun. Critical Hit chance additionally increases by 20% against Boss units. Rail Gun skill range and AoE increase by +2 (+1 for [Petal Storm] and [Death Ray]). Movement decreases by -2 and Final DMG Taken increases by +100%.
- System Failure: Incapacitated, cannot move or attack.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Resonance Link
- AP: 0
- CD:
- Effect: Desinates 1 ally within 4 adjacent tile as [Resonance Node]. Can continue to act with remaining movement. This skill can only be used 1 time per battle.
- Icon: Icon_skill_order_5176

### Glossary skill 2
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Hunter Mode
- AP: 0
- CD: 1
- Effect: Gains 1 AP and enters [Hunter Mode]. Triggers [Re-ATK] after activation. While in [Hunter Mode], can use command skill [Tactical Reboot].
- Icon: Icon_skill_order_5177

### Glossary skill 3
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Tactical Reboot
- AP: 0
- CD: 0
- Effect: Exits [Hunter Mode]. Can continue to move with remaining movement. Movement +2 for this action. Reloads all Rail Gun ammo at the start of next action.
- Icon: Icon_skill_order_5175

### Glossary skill 4
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Attraction Beacon
- AP: 1
- CD: 1
- Effect: [Sylar] uses [Petal Storm] at the selected tile, with skill multiplier reduced by -0.4x. This attack does not consume AP or Rail Gun ammo and is treated as an active attack by [Sylar]. Can continue to act with remaining movement.
- Icon: Icon_skill_order_1711
