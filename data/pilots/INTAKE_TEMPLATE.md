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
- Gender: Male
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
- Ranged: 2270
- Tactical: 1808
- Assault: 4773
- Melee: 1504
- Mechanic: 1651
- Defense: 4548
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Punisher
- Effect text: Can use command skill [Limit Break]. Carries [Assault Field] aura.
- Icon name: Icon_skill_talent_5166.png

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: Can use command skill [Limit Break]. Carries [Assault Field] aura.\n[Guard] range increases to 2 tile. Using [Limit Break] additionally grants [Rampage] effect.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- Entrenched 1 (same skill as other Guardian with ID 600001)

### Skill 1
- Name: Formation Guard
- Type: Order <!-- EquipmentSkill / Order / passive -->
- AP cost: 1
- Cooldown: 2            <!-- if any -->
- Weapon type: MG <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Protects allies within 2 adjacent tiles from Assault and Ranged attacks. Triggers up to 2 times per turn and lasts 2 turns. Additionally, gains 1 stack [Undying].
- Icon name: Icon_skill_order_5110

### Skill 2
- Name: Strike Back
- Type: EquipmentSkill
- AP cost: 0
- Cooldown:
- Weapon type: MG
- Effect text: Uses Machine Gun to attack a target, dealing 1.2x DMG and inflicts 1 random debuff for 2 turns. Before combat, deals DMG to all self parts equal to 20% of their max HP. This effect will not destroy parts. This skill cannot be used if own HP percentage is less than 30%
- Icon name: Icon_skill_main_1123

### Skill 3
- Name: Final Burial
- Type: EquipmentSkill
- AP cost: 3
- Cooldown:
- Weapon type: MG
- Effect text: Uses both Machine Gun to attack a target, dealing 2x0.5 DMG. Inflicts one random debuff on the target for 2 turns before combat. This skill multiplier increases by 0.075 for each debuff the target carries, to a maximum of 2x1.1. While [Fate Hunt] is active, additionally inflicts [Intimidation] on the target for 1 turn.
- Icon name: Icon_skill_main_1178

### Skill 4
- Name: Kill Zone
- Type: SpecialAssault
- AP cost: 4
- Cooldown:
- Weapon type: MG
- Effect text: Uses both Machine Gun to attack, dealing 2x0.4 DMG to all targets within range. Before combat, inflicts 3 random debuffs on all targets for 2 turns. This skill multiplier increases by 0.15 against units carrying 5 or more debuffs. While under the effect of [Fate Hunt], this skill ignores enemy armor.
- Icon name: Icon_skill_order_1161

### Skill 5
- Name: Judgment Of The Damned
- Type: Passive
- Effect text: When an ally initiated combat against an enemy unit within [Assault Field], if the target is afflicted with 3 or more debuffs after combat, uses Machine Gun to launch an attack against that target, dealing 0.4x DMG and inflicts 1 random debuff on the target for 2 turns. This effect can trigger 2 times per turn
- Icon name: Icon_skill_assive_5224

### Skill 6
- Name: Reversal Cage
- Type: Passive
- Effect text: After being actively attacked, reflects up to 5 dispellable debuffs on self to the attacker. This effect can trigger 1 time per turn
- Icon name: Icon_skill_passive_1069

### Skill 7
- Name: Undying Soldier
- Type: Passive
- Resource: PP
- Effect text: When any part is destroyed, consumes 1 PP to restore that part to max HP after combat. Gains 2 PP at the start of battle.
- Icon name: Icon_skill_pp_1108

### Skill 8
- Name: Banishment
- Type: Passive
- Effect text: All enemies within the range of [Assault Field] cannot trigger [Re-ATK], [Re-Act] or [Move Again]. This effect is not applied to targets immune to [Re-Act Prohibition]
- Icon name: Icon_skill_passive_5308

## Chip slots setup
<!-- Red = Attack / Blue = Dodge / Yellow = Critical-->
- Alpha: red/yellow/blue
- Beta: red/yellow/blue
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
- Same as Rei Ayanami's section y1

### γ2
- 1:  Undertaker 1 / When not affected by [Fate Hunt], Final DMG Taken reduces by 20%, AP recovery increases by +1. [Guard] can additionally block Melee attack / Icon_skill_passive_5309
- 4:  AP Optimization 4 (same as other Guardian pilots ID 600042)
- 7:  Entrenched 4 (same as other Guardian pilots ID 600043)
- 10: Undertaker 2 / Gains 1 stack of [Undying] at the start of battle. Gainst 1 stack of [Undying] for each 4 Machine Gun attack. This effect can trigger 2 times per turn / Icon_skill_passive_5309
- 13: Undertaker 3 / DMG Dealt increases by 30% to enemy units within [Assault Field] / Icon_skill_passive_5309
- 16: Undertaker 4 / For each 1 attack launched with Machine Gun, Machine Gun bullet count +1, up to a maximum of 4 / Icon_skill_passive_5309


### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Fate Hunt: Active attacks cannot be retaliated. Hit Rate increases by 15%. After attacking, restores HP equal to 25% DMG dealt to all intact parts. This effect is removed at the start of next turn.
- Chain Execution: After actively attacking, can launch a [Re-ATK], allowing movement of 1 tile before attacking. This effect can trigger 1 time per turn and is removed at the start of next turn.
- Re-ATK: Allows launching another active attack
- Assault Field: An aura around self which reduces DMG dealt of enemy units within 3 adjacent tiles by 10% and increaes the movement cost to exit [Assault Field] by 2. If an enemy remains within [Assault Field] after action, uses Machine Gun to launch an [Suppression Attack] dealing 0.4x DMG and inflicts a random debuff to the targetfor 2 turns (this effect can trigger 3 times per turn).
- Suppression Attack: Launches an attack against an enemy after they complete their action
- Rampage: Final DMG dealt increases by 30%. This effect is removed at the start of next turn.
- Undying: Body is immune to [Execution] effect. When the Body suffers overdamage, triggers [Guts], locking at 1 HP. Consumes 1 stack upon activation. Stacks up to maximum 3 times.
- Move Again: Can move again with remaining movement. Cannot attack after moving
- Re-Act Prohibition: Cannot trigger [Re-ATK] or [Re-Act]

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Limit Break
- AP: 3
- CD: 1
- Icon: Icon_skill_order_1165
- Effect: If not affected by [Fate Hunt], this skill AP cost is reduced by 3, reset after use. This skill can only be activated when legs are intact. Jumps to an empty tile within 4 adjacent tiles and gains [Fate Hunt], [Rampage] and [Chain Execution]. The trigger count for [Suppression Attack] increases by 3, and remaining movement can be used to launch a [Re-ATK]. This skill can be used 1 time per turn
