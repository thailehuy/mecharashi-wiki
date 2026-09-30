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

- Pilot ID: 10103185
- Pilot Name: Alena
- Real Name: Alena Vera
- Gender: Female
- Profession: Assault
- Occupation: Raider <!-- Use the correct profession icon -->
- Quality: SSR
- License: Heavy
- Game version introduced: 3.5

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103185A_half.png
- Avatar (full portrait) file: Pilot_10103185A_raw.png

## Attributes
- Ranged: 1386
- Tactical: 2172
- Assault: 5100
- Melee: 1858
- Mechanic: 2015
- Defense: 4023
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Snowfield Afterglow
- Effect text: When equipped with Flamethrower and Large Shield, can use command skill [Bunker Down]. At the start of turn, if in [Bunker] state, immediately uses Flamethrower to attack all enemies within range, dealing 0.5x DMG. When attacking with Flamethrower, gains 1 stack of [War Flame] for each 1 target hit.
- Icon name: Icon_skill_talent_5168

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: When equipped with Flamethrower and Large Shield, can use command skill [Bunker Down]. At the start of turn, if in [Bunker] state, immediately uses Flamethrower to attack all enemies within range, dealing 0.5x DMG. When attacking with Flamethrower, gains 1 stack of [War Flame] for each 1 target hit.\nGains 3 stacks of [War Flame] upon deployment. Gains +1 AP after using [Rapid Raid].

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- CEC 1 (same skill as other Raiders)

### Skill 1
- Name: Scorch Earth
- Type: EquipmentSkill <!-- EquipmentSkill / Order / passive -->
- AP cost: 3
- Cooldown:             <!-- if any -->
- Weapon type: LS <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Uses a Large Shield to attack a target, dealing [Fixed DMG] equal to 50% max HP of current arm. Applies [Burning Terrain] to all tiles within 1 ring around the target for 2 turns. If possesses 2 or more stacks of [War Flame], consumes 2 stacks to additionally deal [Fixed DMG] equal to 20% of own max HP to the target and all enemy units within 1 ring around the target.
- Icon name: Icon_skill_main_1179

### Skill 2
- Name: Blazing Wind
- Type: SpecialAssault
- AP cost: 2
- Cooldown:
- Weapon type: FL
- Effect text: Uses a Flamethrower to attack all enemies along the path within range, dealing 0.7x DMG.
- Icon name: Icon_skill_order_1127

### Skill 3
- Name: Converging Flame
- Type: EquipmentSkill
- AP cost: 3
- Cooldown:
- Weapon type: FL
- Effect text: Uses a Flamethrower to attack a target, dealing 1.2x DMG and 20% [Fire DMG] to other targets along the path. When in [Bunker] state, applies 2 stacks of [Flame Fusion] to self.
- Icon name: Icon_skill_main_1024

### Skill 4
- Name: Incinerate
- Type: EquipmentSkill
- AP cost: 4
- Cooldown:
- Weapon type: LS
- Effect text: Uses Large Shield to attack a target, consuming all [War Flame] stacks, dealing [Fixed DMG] equal to 70% current arm max HP, additionally increases by 10% for each 1 stack of [War Flame] consumed. This attack always hit the body and deals 50% Splash DMG to other parts. If 4 or more stacks of [War Flame] are consumed, inflicts [Thermal Corrosion] to the target.
- Icon name: Icon_skill_main_1180

### Skill 5
- Name: Fearless Scorch
- Type: Passive
- AP cost:
- Cooldown:
- Weapon type: FL
- Effect text: At the start of turn, deals [Percentage HP Reduction] equal to 5% max HP to all parts of self. Applies [Burning Terrain] to all tiles within 1 ring around this unit for 2 turns. Gains 2 stacks of [War Flame]
- Icon name: Icon_skill_passive_5322

### Skill 6
- Name: Ice Shield
- Type: Passive
- Effect text: Reduces percentage [Fixed DMG] taken by allies by 10%.
- Icon name: Icon_skill_passive_2124

### Skill 7
- Name: Flame Forged Blood
- Type: Passive
- Resouce: PP
- Effect text: When shield arm is destroyed, spend 1 PP after combat to restore the arm to 60% of max HP and gains 3 stacks of [War Flame]. Gains 2 PP at the start of battle
- Icon name: Icon_skill_pp_1109

### Skill 8
- Name: Blazing Barrier
- Type: Passive
- Effect text: At the start of battle, if equipped with Large Shield, grants Temporary HP equal to 10% of [Alena]'s body max HP to all bodies of allies within 2 adjacent tiles and applies [Blazing Barrier] to them
- Icon name: Icon_skill_passive_5286

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
- Same as Frida's gamma 1 section

### γ2
- 1:  Frostfire Sentinel 1 / Flamethrower bullet count +2. This effect is doubled in [Bunker] state / Icon_skill_passive_5315
- 4: (same as other pilots same occupation)
- 7: (same as other pilots with same occupation)
- 10: Theory Of Everything 2 / Attack multiplier of this unit talent's attack and [Link attack] increase by 0.15 / Icon_skill_passive_5315
- 13: Theory Of Everything 3 / Max HP increase by 15% / Icon_skill_passive_5315
- 16: Theory Of Everything 4 / After actively attacking with Large Shield, gains 2 stacks of [Flame Surge] and can continue to act with remaining AP. This effect can trigger 1 time per turn. / Icon_skill_passive_5315


### Glossary buf
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Bunker: Cannot move. Final DMG taken and percentage [Fixed DMG] taken are reduced by 10%. Flamethrower ATK increases by 15%. Flamethrower attack range becomes a fixed-direction 5-tile fan shaped area and all tiles are treated as [Ideal Range]. This state ends automatically if an arm is destroyed
- War Flame: DMG taken reduces by 3%, stacking up to 6 times. When possessing 4 or more stacks, can use command skill [Rapid Raid].
- Flame Fusion: While in [Bunker] state, can use Flamethrower to launch [Link Attack], dealing 0.3x DMG. 1 stack is removed upon triggering. Can stack up to 2 times.
- Thermal Corrosion: When actively attacked, this unit takes [Fixed DMG] equal to 15% of attacking arm max HP to all parts after combat. This effect can trigger up to 5 times and is removed after 1 turn.
- Blazing Barrier: DMG taken reduces by 10%. When attacked, deals [Fixed DMG] equal to 10% max HP of self to all parts of the attacker and grants [Alena] 1 stack of [War Flame]. This effect is removed after triggering
- Flame Surge: Reduces AP cost of Flamethrower active attack by 1, to a minimum of 1 AP. Consumes 1 stack upon triggering. Stacks up to 2 times.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Bunker Down
- AP: 0
- CD: 1
- Effect: Enters [Bunker] state. This state is cancelled if arm is destroyed. Attacks can be made in this state. Can use command skill [Disengage].
- Icon: Icon_skill_order_5169

### Glossary skill 2
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Disengage
- AP: 0
- CD: 0
- Effect: Exits [Bunker] state. Can continue to move with remaining movement
- Icon: Icon_skill_order_5169

### Glossary skill 3
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Rapid Raid
- AP: 0
- CD: 0
- Effect: Selects an empty tile within 5 adjacent tiles and jumps to it, then trigger [Re-Act]. If in [Bunker] state, exits the state and reset [Bunker Down] CD. This skill can only be used 1 time per turn and when legs are intact.
- Icon: Icon_skill_order_5170
