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

- Pilot ID: 10103160
- Pilot Name: Ann
- Real Name: Ann Olum
- Gender: Female
- Profession: Assault
- Occupation: Raider
- Quality: SSR
- License: Medium
- Game version introduced: 3.3

## Images
<!-- portrait is prefixed with data/unlisted/pilot_images_half/ -->
<!-- avatar is prefixed with data/unlisted/pilot_images_raw/ -->
- Portrait (half-body) file: Pilot_10103160A_half.png
- Avatar (full portrait) file: Pilot_10103160A_raw.png

## Attributes
- Ranged: 2015
- Tactical: 2329
- Assault: 5036
- Melee: 1700
- Mechanic: 1386
- Defense: 4053
- Initial Base Starting AP: 5
- Max Base Starting AP: 5
- AP Recovery: 2

## Talents
<!-- all talents, skills and neural icons are prefixed with data/unlisted/pilot_skills/ -->

### Basic Talent (Talent0_2Ability)
- Name: Dual Rookie
- Effect text: At the start of battle, enters [GKD Stance]. At the end of action, can trigger [Stance Adjustment] once. Gains 1 stack of [Collective Advantage] for each 1 stack of [Suppression] or [Instability] inflicted on enemies, up to 20 stacks.
- Icon name: Icon_skill_talent_5165.png

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: At the start of battle, enters [GKD Stance]. At the end of action, can trigger [Stance Adjustment] once. Gains 1 stack of [Collective Advantage] for each 1 stack of [Suppression] or [Instability] inflicted on enemies, up to 20 stacks.\n Heavy Machine Gun DMG dealt increases by 15%. When both hands are intact, Heavy Machine Gun range increases by +1.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->
### Skill 0 (innate)
- CEC 1 (same skill as other raiders with ID 200001)

### Skill 1
- Name: Electric Eel Penetration
- Type: EquipmentSkill <!-- EquipmentSkill / Order / passive -->
- AP cost: 32
- Cooldown:             <!-- if any -->
- Weapon type: HMG <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text: Uses a Heavy Machine Gun to attack a target, dealing 0.9x DMG. Changes to [Electric Eel Stance] before attacking. If the target has 3 or more stacks or [Instability], they cannot retaliate. Otherwise, applies 2 stacks of [Instability III] to the target, lasting for 2 turns.
- Icon name: Icon_skill_main_1127

### Skill 2
- Name: GKD Assault
- Type: SpecialAssault
- AP cost: 3
- Cooldown:
- Weapon type: HMG
- Effect text: Uses a Heavy Machine Gun to attack all targets within a fan-shaped area in front, dealing 0.45x AoE DMG. Changes to [GKD Stance] and applies [Armor Down I] to all targets before attacking. If a target has 3 or more stacks or [Suppression], upgrades [Armor Down I] to [Armor Down II]
- Icon name: Icon_skill_order_1010

### Skill 3
- Name: Concussive Shot
- Type: EquipmentSkill
- AP cost: 3
- Cooldown:
- Weapon type: HMG
- Effect text: Uses a Heavy Machine Gun to attack a target, 1.25x DMG. If the target has 5 or more stacks of [Instability] after combat, removes all stacks and inflicts [Structural Instability].
- Icon name: Icon_skill_main_1140

### Skill 4
- Name: Suppressive Fire
- Type: EquipmentSkill
- AP cost: 4
- Cooldown:
- Weapon type: HMG
- Effect text: Uses a Heavy Machine Gun to attack a target, 1.4x DMG. Inflicts 2 stacks of [Suppression] before combat. After combat, if the target has 5 or more stacks of [Suppression], additionally inflicts [GKD Mark]
- Icon name: Icon_skill_main_1179

### Skill 5
- Name: Team Rally
- Type: Order
- AP cost: 0
- Cooldown: 3
- Weapon type: HMG
- Effect text: Selects any ally to grant them [GKD Support] or [Electric Eel Support] for 2 turns. This unit enters [Pending Activation] state and gains [Activation] after selected ally takes action.
- Icon name: Icon_skill_order_5164

### Skill 6
- Name: Team Spirit
- Type: Passive
- Effect text: At the start of action, if there are other members from GKD or Electric Eel within 4 adjacent tiles, gains 5 stacks of [Collective Advantage]
- Icon name: Icon_skill_passive_5305

### Skill 7
- Name: Dual Stance Synergy
- Type: Passive
- Effect text: When other allies from GKD or Electric Eel initiates an attack, uses Heavy Machine Gun to launch a [Link Attack], dealing 0.3x DMG. This effect can trigger 2 times per turn.
- Icon name: Icon_skill_passive_5152

### Skill 8
- Name: Optimistic Side
- Type: Passive
- Effect text: When switching to a new stance, gains a random buff, lasting for 2 turns. When this effect is triggered for the first time each turn, reduces AP cost of the next active attack by 1.
- Icon name: Icon_skill_passive_5306

## Chip slots setup
<!-- Red = Attack / Blue = Dodge / Yellow = Critical-->
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
- Same as Frida's section y1

### γ2
- 1:  Ultimate Prospector 1 / Ally units from GKD or Electric Eel gains +5% DMG dealt and +5% Critical Hit chance. DMG dealt additionally increases by 5% for eac 10 stacks of [Collective Advantage] / Icon_skill_passive_5307
- 4:  AP Optimization 4 (same as other fighter pilots ID 100042)
- 7:  Power Innovation 3 (same as other fighter pilots ID 100043)
- 10: Ultimate Prospector 2 / When carrying 10 or more stacks of [Collective Advantage], HMG Final DMG dealt increases by 10%. At 20 or more stacks, AP recovery increases by +1 / Icon_skill_passive_5307
- 13: Ultimate Prospector 3 / Each 10 stacks of [Collective Advantage] increases HMG bullet count by +1 / Icon_skill_passive_5307
- 16: Ultimate Prospector 4 / When other allies inflict [Suppression] or [Instability], [Ann] also gains [Collective Advantage]. The maximum number of stacks for [Collective Advantage] increases to 30. / Icon_skill_passive_5307


### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- GKD Stance: Movement +1. After attacking, inflicts 1 stack of [Suppression] on the target, lasting for 2 turns.
- Electric Eel Stance: After actively attacking, extends the remaning duration of maximum 5 debuffs on the target by 1 turn. Also applies 1 stack of [Instability III] to the target, lasting for 2 turns.
- Collective Advantage: DMG dealt increases by 2%, Critical Hit chance increases by 1% per stack, up to 20 stacks.
- Structural Instability: When actively attacked in combat, Final DMG taken increases by 30% and the attacker ignores all standard [DMG Reduction] effects. This effect is removed upon triggering.
- GKD Mark: When actively attacked, chance of being critically hit increases by 15% and Critical DMG taken increases by 10%. The attacker recovers 1 AP after combat. This effect is removed upon triggering.
- GKD Support: Movement increases by +1. After initiating combat, inflicts 1 stack of [Suppression] on the target. This unit is considered a member of GKD for 2 turns.
- Electric Eel Support: After initiating combat, extends the remaning duration of maximum 5 debuffs on the target by 1 turn. Also applies 1 stack of [Instability III] to the target. This unit is considered a member of Electric Eel for 2 turns.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Stance Adjustment
- AP: 0
- Icon: Icon_skill_order_5137
- Effect: Switches between [GKD Stance] or [Electric Eel Stance]
