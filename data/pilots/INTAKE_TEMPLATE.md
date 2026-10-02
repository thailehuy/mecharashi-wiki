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

- Pilot ID: 10103173
- Pilot Name: Lustre
- Real Name: Yao
- Gender: Female
- Profession: Shifter
- Occupation: Shifter <!-- Use the correct profession icon -->
- Quality: SSR
- License: Light
- Game version introduced: 3.5

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103173A_half.png
- Avatar (full portrait) file: Pilot_10103173A_raw.png

## Attributes
- Ranged: 2005
- Tactical: 2152
- Assault: 5216
- Melee: 5216
- Mechanic: 1396
- Defense: 3942
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Mystic Shifting
- Effect text: Can switch piloted ST between [Mech Form] and [Cruise Form], granting unique effects for each. Gains 2 stacks of [Shift Energy] at the start of turn and at the start of combat.
- Icon name: Icon_skill_talent_5169

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: an switch piloted ST between [Mech Form] and [Cruise Form], granting unique effects for each. Gains 2 stacks of [Shift Energy] at the start of turn and at the start of combat.\nWhile possessing [Shift Energy], Final DMG Dealt increases by 15%.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Configuration Shift 1: Can use command skill [Configuration Shift] after taking an action.
- Icon Name: Icon_skill_passive_5205

### Skill 1
- Name: Tainted Blade / Shadow Ray
- Type: EquipmentSkill <!-- EquipmentSkill / Order / passive -->
- AP cost: 3
- Cooldown:             <!-- if any -->
- Weapon type: MG/AB <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Chooses to use either [Tainted Sword] or [Shadow Ray]
- Icon name: Icon_skill_main_1179

### Skill 2
- Name: Star Chaser / Moon Raker
- Type: SpecialAssault
- AP cost: 3
- Cooldown:
- Weapon type: MG/AB
- Effect text: Changes to [Star Chaser] in [Mech Form] and [Moon Raker] in [Cruise Form]
- Icon name: Icon_skill_order_1164

### Skill 3
- Name: Reflective Link
- Type: Passive
- AP cost:
- Cooldown:
- Weapon type: MB/AB
- Effect text: When equipped with both Alter-Blade and Machine Gun, 25% of Machine Gun's weapon crit are added to Alter-Blade, and 25% of Alter-Blade's weapon hit are added to Machine Gun.
- Icon name: Icon_skill_passive_4135

### Skill 4
- Name: Shadow Evasion
- Type: Passive
- AP cost:
- Cooldown:
- Weapon type:
- Effect text: In [Cruise Form], when actively attacked by Ranged weapon or Missile, completely dodge the attack. This effect can trigger 1 time per turn.
- Icon name: Icon_skill_passive_4134

### Skill 5
- Name: Void Crown / Falling Sky
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: AB/MG
- Effect text: Chooses to use either [Void Crown] or [Falling Sky]
- Icon name: Icon_skill_order_1165

### Skill 6
- Name: Sky's Edge / Night Requiem
- Type: Equipment Skill
- AP Cost: 4
- Cooldown:
- Effect text: Changes to [Night Requiem] in [Mech Form] and [Sky's Edge] in [Cruise Form].
- Icon name: Icon_skill_main_1150

### Skill 7
- Name: Reversion
- Type: Passive
- Resouce: PP
- Effect text: When any part is destroyed, after combat, consumes 1 PP to restore that part to 50% of max HP and gains [Steady Guard]. Gains 2 PP at the start of battle
- Icon name: Icon_skill_pp_1110

### Skill 8
- Name: Shifting Radiance
- Type: Passive
- Effect text: After each [Configuration Shift], [Mech Form] gains [Offense Boost] and [Cruise Form] gains [Evasion Boost]
- Icon name: Icon_skill_passive_4127

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
### Alpha
- 1: Configuration Shift 2 / Gains 2 AP when [Configuration Shift] is used / Icon_skill_passive_5205
- 4: Same as other alpha sections
- 7: Same as other alpha sections

### Beta
- 1: Configuration Shift 3 / When breaking a part with an active attack, gains 1 [Shift Energy]. This effect can trigger 2 times per turn / Icon_skill_passive_5205
- 4: Same as other beta sections
- 7: Same as other beta sections

### γ1
<!-- Name / Effect text / Icon name -->
- 1: Storm Symbiosis 1 / After actively attacking with Alter-Blade or [Mystic Arc], if the part hit is below 15% HP, triggers the <buf ID=900109>[Execution]</buf> effect, directly destroying that part after combat. / Icon_skill_passive_5316
- 4: (same as other pilots same occupation)
- 7: Configuration Shift 4 / [Configuration Shift 3] trigger count increases by +1 time per turn. When attacking, DMG calculation uses the highest pilot attributes / Icon_skill_passive_5205
- 10: Storm Symbiosis 2 / [Storm Symbiosis 1] part destruction effect threshold increased to 25% HP. / Icon_skill_passive_5316
- 13: Storm Symbiosis 3 / Critical Hit chance and Critical Hit DMG of Alter-Blade and [Mystic Arc] increase by 10% / Icon_skill_passive_5316
- 16: Storm Symbiosis 4 / After using [Configuration Shift], refunds 1 [Shift Energy]. This effect can trigger 2 times per turn / Icon_skill_passive_5316

### γ2
- 1:  Star Miracle 1 / Machine Gun and [Night Ember] bullet count +1, which additionally increases by +1 after each action. This effect is reset at the end of turn. / - Icon_skill_passive_5317
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Star Miracle 2 / Machine Gun and [Night Ember] range +1. While in [Cruise Form], [Night Ember] attack ignores low obstacle / Icon_skill_passive_5317
- 13: Star Miracle 3 / Machine Gun and [Night Ember] Final DMG Dealt increases by 10%. / Icon_skill_passive_5317
- 16: Star Miracle 4 / After action, the AP cost of next action is reduced by 1, to a minimum of 1. This effect can trigger 2 times per turn. / Icon_skill_passive_5317


### Glossary buf
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Mech Form: Can only use Assault, Melee and Ranged weapons. DMG Dealt increases by +20%, DMG taken reduces by 20%, Critical Hit chance increases by 10%.
- Cruise Form: Weapons are fixed to [Night Ember] and [Mystic Arc]. Cannot change weapon loadout. Movement type become [Flying]. Movement +1, Dodge Rate increases by 20%.
- Flying: Ignores low obstacles and unit collision while moving. Can stop over low obstacles. Melee weapon can attack flying targets. Immune to melee attacks. Does not trigger ground-based Terrain effect. Vision can span over low obstacles in Mist Mode.
- Shift Energy: Can be used for [Configuration Shift]. Stacks up to 5 times.
- Configuration Shift: Shift the ST form based on the situation. Can use [Mech Form Shift] or [Cruise Form Shift] at the end of action.
- Steady Guard: Final DMG Taken reduces by 50%. This effect is removed after triggering.
- Offense Boost: DMG Dealt increases by 25% for this action. This effect is removed after this action.
- Evasion Boost: Dodge Rate increases by 15% for this action. This effect is removed after this action.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Shadow Ray
- AP: 3
- CD:
- Effect: Uses Machine Gun to attack a target, dealing 1.25x DMG. Critical Hit chance increases by 20% for this attack
- Icon: Icon_skill_main_1118

### Glossary skill 2
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Tainted Blade
- AP: 3
- CD: 0
- Effect: Uses Alter-Blade to attack a target, dealing 1.6x DMG. This attack will hit the part with highest HP.
- Icon: Icon_skill_main_1162

### Glossary skill 3
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Star Chaser
- AP: 3
- CD: 0
- Effect: Uses Alter-Blade to attack a target within 4 adjacent tiles, dealing 1.3x DMG. Enters [Aiming] Mode before attacking. Selects and warps back to an ally within 4 adjacentile after the attack.
- Icon: Icon_skill_order_1164

### Glossary skill 4
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Moon Raker
- AP: 3
- CD: 0
- Effect: Dashes 4 tiles in the selected direction using [Mystic Arc], dealing 1.2x AoE DMG to all targets hit (including flying units). This attack prioritizes hitting the body. Before activation, selects an ally within 2 adjacent tiles to warp them to this unit's side after the dash. This skill can only be used 1 time per turn
- Icon: Icon_skill_order_1164

### Glossary skill 5
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Void Crown
- AP: 4
- CD: 0
- Effect: Uses Alter-Blade to attack all targets within an <range type=2>I-shaped (3x1-tile)</range> area or <range type=2>L-shaped (3x1-tile)</range> area ahead. Before attacking, can Aim at all targets separately, dealing 1.6x AoE DMG. If this attack destroys a part, gains 1 [Shift Energy].
- Icon: Icon_skill_order_1165

### Glossary skill 6
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Falling Sky
- AP: 4
- CD: 0
- Effect: Uses Machine Gun to attack a target, dealing 1.45x DMG. Hit weighting of part with lowest HP increases by +50. If this attack destroys a part, gains 1 [Shift Energy].
- Icon: Icon_skill_main_1129

### Glossary skill 7
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Night Requiem
- AP: 4
- CD: 0
- Effect: Uses Machine Gun to attack a target, dealing 1.2x DMG. Enters [Aiming] Mode before combat. This attack prioritizes the same aimed part. If this unit is not destroyed after combat, all parts are restored to pre-combat HP and the target suffers [Fixed DMG] equal to the DMG this unit took during combat.
- Icon: Icon_skill_main_1049

### Glossary skill 8
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Sky's Edge
- AP: 4
- CD: 0
- Effect: Selects a target within 4 tiles in a straight line and dashes toward it. Uses [Mystic Arc] to deal 1.4x AoE DMG to the target's body. This attack cannot miss and deals 35% of the aforementioned DMG as [Fixed DMG] to all enemy units' bodies within 2 adjacent tiles of the target. The AP cost of this skill increases by 1 after each use, and reset when shifting to another form.
- Icon: Icon_skill_order_1166

### Glossary skill 9
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Mech Form Shift
- AP: 0
- CD: 0
- Effect: Consumes 2 [Shift Energy] to shift to [Mech Form], allowing another action with full Movement
- Icon: Icon_skill_order_5171

### Glossary skill 10
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Cruise Form Shift
- AP: 0
- CD: 0
- Effect: Consumes 2 [Shift Energy] to shift to [Cruise Form], allowing another action with full Movement
- Icon: Icon_skill_order_5172
