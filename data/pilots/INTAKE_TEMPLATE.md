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

- Pilot ID:                 <!-- new 8-digit ID, or leave blank to auto-pick -->
- Pilot Name:
- Real Name:
- Gender:
- Profession:                <!-- Assault / Defender / Mechanic / Striker / Gunner / Launcher / Shifter -->
- Occupation:                <!-- e.g. Raider, Guardian, Machinist, Fighter, Sniper, Tactician -->
- Quality:                   <!-- SSR / SR / R -->
- License:                   <!-- Light / Medium / Heavy -->
- Game version introduced:   <!-- e.g. 3.3 -->

## Images

- Portrait (half-body) file: data/unlisted/pilot_images_half/____________.png
- Avatar (full portrait) file: data/unlisted/pilot_images_raw/____________.png

## Talents

### Basic Talent (Talent0_2Ability)
- Name:
- Effect text:
- Icon name:

### Ascended Talent (Talent3_5Ability)
- Name:
- Effect text:
- Icon name:

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

## Neural passives (Gamma partition — pilot-specific)

<!-- The γ chip is split into two sections, γ1 and γ2, each with exactly 6
     unlocks at fixed chip-point thresholds: 1 / 4 / 7 / 10 / 13 / 16.
     Fill in Name / Effect text / Icon name for all 12 (6 per section). -->

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
