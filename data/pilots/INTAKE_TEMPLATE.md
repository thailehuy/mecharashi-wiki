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

- Portrait (half-body) file: data/unlisted/pilot_images_half/Pilot_10103182A_half.png
- Avatar (full portrait) file: data/unlisted/pilot_images_raw/Pilot_10103182A_raw.png

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

### Basic Talent (Talent0_2Ability)
- Name: GKD One
- Effect text: At the start of action, or after destroying a part, inflicts 1 stack of [Suppression] on all enemy units within a 3-tile radius. When performing an active attack, follow up with [Boundless Hunt]
- Icon name: data/unlisted/pilot_skills/Icon_skill_talent_5164.png

### Ascended Talent (Talent3_5Ability)
<!-- Ascended talent has same name and icon as basic one, with a line split -->
- Effect text: At the start of action, or after destroying a part, inflicts 1 stack of [Suppression] on all enemy units within a 3-tile radius. When performing an active attack, follow up with [Boundless Hunt].\nAfter actively attacking with a Melee weapon, the AP cost of next Assault weapon attack is reduced by 1. Inversely, after actively attacking with an Assault weapon, the AP cost of next Melee weapon attack is reduced by 1. Each effect can reduce cost to a minimum of 1 AP and can trigger 1 times per turn.

## Skills

<!-- Each skill the pilot uses on their neuron board (Core Neuron slots).
     type = EquipmentSkill (weapon attack) / Order (self-buff) / passive -->

### Skill 1
- Name:
- Type:                <!-- EquipmentSkill / Order / passive -->
- AP cost:
- Cooldown:             <!-- if any -->
- Weapon type:          <!-- if EquipmentSkill, e.g. SG / AR / SR / MG / Melee -->
- Effect text:
- Icon name:

### Skill 2
- Name:
- Type:
- AP cost:
- Cooldown:
- Weapon type:
- Effect text:
- Icon name:

<!-- add more "### Skill N" blocks as needed -->

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
### γ1
- 1:  Name / Effect text / Icon name:
- 4:  Name / Effect text / Icon name:
- 7:  Name / Effect text / Icon name:
- 10: Name / Effect text / Icon name:
- 13: Name / Effect text / Icon name:
- 16: Name / Effect text / Icon name:

### γ2
- 1:  Name / Effect text / Icon name:
- 4:  Name / Effect text / Icon name:
- 7:  Name / Effect text / Icon name:
- 10: Name / Effect text / Icon name:
- 13: Name / Effect text / Icon name:
- 16: Name / Effect text / Icon name:


### Glossary buf 1
<!-- Pick a random unique ID for this in the <buf> tag and add the tag to all referenced text from this pilot -->
- Suppression: Armor reduced by 4%, chance of receiving a critical hit increased by 2%, stacking up to 5 times, lasting for 2 turns.

### Glossary skill 1
<!-- Pick a random unique ID for this in the <skill> tag and add the tag to all referenced text from this pilot -->
<!-- Also scan the skill text itself and link necessary tags -->
- Name: Boundless Hunt
- AP: 0
- Icon: Icon_skill_order_1107
- Effect: Uses a Shotgun to launch an [Extra Strike], dealing 0.75x DMG to all targets within a 2-tile radius affected by [Suppression]. This attack can also trigger the [Re-ATK] effect of [Mobile Warfare].