"""One-off generator for SSSR backpack translation files, derived from mapping
excel-copy.txt's rough EN descriptions against detail-cn.json. Not meant to be
re-run as part of the normal pipeline -- kept for reference/reproducibility."""
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))

ENTRIES = {
    "60701106": {
        "name": "Savior",
        "ac": 9,
        "skillId": "62303",
        "skillName": "Savior Drive · Attack",
        "effect": (
            "At the start of action, performs <color=#F74848>1</color> repair on self and allies "
            "within <color=#F74848>1</color> ring, equal to <color=#F74848>0.6</color>x Manipulator "
            "Repair AMT. Cannot repair destroyed parts.\n"
            "When in combat, enemy DMG Dealt is reduced by <color=#F74848>10%</color>."
        ),
    },
    "60701406": {
        "name": "Guardian",
        "ac": 15,
        "skillId": "62314",
        "skillName": "Guardian Drive · Anti-Crit",
        "effect": (
            "At the start of action, randomly selects <color=#F74848>3</color> allies within "
            "<color=#F74848>3</color> tiles to perform <buf ID=900018>[Passive Repair]</buf>, equal to "
            "<color=#F74848>0.4</color>x Manipulator Repair AMT. Cannot repair destroyed parts.\n"
            "When in combat, enemy Crit Rate is reduced by <color=#F74848>10%</color>."
        ),
    },
    "60201606": {
        "name": "Conqueror",
        "ac": 6,
        "skillId": "62207",
        "skillName": "Conqueror Drive · Armor",
        "effect": (
            "No ST type restriction.\n"
            "ST Movement <color=#F74848>+1</color>.\n"
            "When in combat, enemy Armor is reduced by <color=#F74848>50%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60302506": {
        "name": "Custodian",
        "ac": 6,
        "skillId": "62179",
        "skillName": "Custodian Field · Retaliation",
        "effect": (
            "Activates Aura: Allies within <color=#F74848>1</color> adjacent tile take "
            "<color=#F74848>25%</color> less DMG from Tactical attacks. Similar effects cannot stack.\n"
            "When allies within <color=#F74848>1</color> adjacent tile are hit by a Missile attack, the "
            "<color=#F74848>1st</color> missile is unable to hit. This effect can only trigger "
            "<color=#F74848>1</color> time per sortie.\n"
            "When retaliating, DMG <color=#F74848>+15%</color> and Crit Rate <color=#F74848>+10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color>."
        ),
    },
    "61001706": {
        "name": "Concealer",
        "ac": 7,
        "skillId": "62301",
        "skillName": "Concealer Drive · DMG UP",
        "effect": (
            "At the end of action, if there are no enemies within <color=#F74848>2</color> tiles, gains "
            "<buf ID=3004502>[Stealth I]</buf>, lasting <color=#F74848>2</color> turns. This effect has a "
            "<color=#F74848>3</color>-turn trigger interval.\n"
            "At the start of action, if in <buf ID=900033>[Stealth]</buf>, immediately recovers "
            "<color=#F74848>1</color> AP.\n"
            "When in combat, enemy DMG Taken <color=#F74848>+10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60402406": {
        "name": "Dominator",
        "ac": 9,
        "skillId": "62302",
        "skillName": "Dominator Drive · First Strike",
        "effect": (
            "ST movement type changes to Levitating, enabling it to pass over low obstacles.\n"
            "When initiating combat, if the target is on the movement path, will always Dodge when "
            "retaliated against. Can trigger <color=#F74848>1</color> time per turn.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60101706": {
        "name": "Raider",
        "ac": 10,
        "skillId": "62304",
        "skillName": "Raider Drive · DMG UP",
        "effect": (
            "Gains Code <skill mainSkill=62304>[Weapon Switch]</skill>, usable up to <color=#F74848>1</color> "
            "time per turn. At the end of action, if both arms are intact, can additionally use "
            "<skill mainSkill=62304>[Weapon Switch]</skill>, usable up to <color=#F74848>1</color> time every "
            "<color=#F74848>2</color> turns.\n"
            "When in combat, enemy DMG Taken <color=#F74848>+10%</color>.\n"
            "ST gains an additional <color=#F74848>300</color> Power, Body HP <color=#F74848>+10%</color> and "
            "DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60802406": {
        "name": "Navigator",
        "ac": 10,
        "skillId": "62305",
        "skillName": "Navigator Drive · First Strike",
        "effect": (
            "Enables the ST's adjacent <color=#F74848>2</color>-tile area to become a valid attack zone for "
            "allied Missile Launcher and Rocket Launcher attacks. Attacks directed by this effect gain Hit "
            "Rate <color=#F74848>+25%</color>.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60902106": {
        "name": "Quartermaster",
        "ac": 11,
        "skillId": "62306",
        "skillName": "Quartermaster Drive · Re-ATK",
        "effect": (
            "Tactical Weapon Ammo Capacity <color=#F74848>+2</color>.\n"
            "When re-attacking, Hit Rate <color=#F74848>+10%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "Gains Code <skill mainSkill=62306>[Quick Load]</skill>, sharing cooldown with other Ammo Reload "
            "skills.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60301106": {
        "name": "Resistor",
        "ac": 11,
        "skillId": "62307",
        "skillName": "Resistor Drive · Attack",
        "effect": (
            "No ST type restriction.\n"
            "When hit by a Tactical attack, DMG Taken <color=#F74848>-25%</color>. Similar effects cannot "
            "stack.\n"
            "Whenever any enemy on the battlefield actively attacks with a Tactical Weapon, gains "
            "<color=#F74848>1</color> stack of <buf ID=623076>[Counter Charge]</buf> before combat; if self "
            "is the attack target, gains an additional <color=#F74848>1</color> stack. Upon reaching "
            "<color=#F74848>6</color> stacks of <buf ID=623076>[Counter Charge]</buf>, repairs "
            "<color=#F74848>15%</color> HP to all parts and restores <color=#F74848>1</color> AP after "
            "combat, then removes all stacks and cannot gain <buf ID=623076>[Counter Charge]</buf> again "
            "this turn.\n"
            "When in combat, enemy DMG Dealt <color=#F74848>-10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color>."
        ),
    },
    "61002406": {
        "name": "Shadow Hunter",
        "ac": 12,
        "skillId": "62308",
        "skillName": "Shadow Hunter Drive · First Strike",
        "effect": (
            "Upon deployment, immediately gains <buf ID=3004412>[Stealth II]</buf>, lasting "
            "<color=#F74848>2</color> turns.\n"
            "At the end of action, if there are no enemies within <color=#F74848>1</color> tile, gains "
            "<buf ID=3004412>[Stealth II]</buf>, lasting <color=#F74848>2</color> turns. This effect has a "
            "<color=#F74848>3</color>-turn trigger interval.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60202106": {
        "name": "Striker",
        "ac": 12,
        "skillId": "62309",
        "skillName": "Striker Drive · Re-ATK",
        "effect": (
            "When actively attacking, if having moved <color=#F74848>4</color> or more tiles, gains "
            "<buf ID=7100901>[Movement UP]</buf>, lasting <color=#F74848>1</color> turn.\n"
            "ST Movement <color=#F74848>+1</color>.\n"
            "When re-attacking, Hit Rate <color=#F74848>+10%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60401706": {
        "name": "Predator",
        "ac": 13,
        "skillId": "62310",
        "skillName": "Predator Drive · DMG UP",
        "effect": (
            "ST Movement <color=#F74848>+1</color>.\n"
            "ST movement type changes to Levitating, enabling it to pass over low obstacles.\n"
            "When in combat, enemy DMG Taken <color=#F74848>+10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60202406": {
        "name": "Pioneer",
        "ac": 14,
        "skillId": "62311",
        "skillName": "Pioneer Drive · First Strike",
        "effect": (
            "No ST type restriction.\n"
            "ST Movement <color=#F74848>+1</color>.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60801706": {
        "name": "Scout",
        "ac": 14,
        "skillId": "62312",
        "skillName": "Scout Drive · DMG UP",
        "effect": (
            "View distance <color=#F74848>+1</color> in Arashi Fog stages.\n"
            "Can use Code <skill mainSkill=62312>[Radar Detection]</skill>: removes "
            "<buf ID=900033>[Stealth]</buf> from all enemy STs within <color=#F74848>4</color> tiles. "
            "Triggers <buf ID=900004>[Re-ATK]</buf> in place afterward.\n"
            "Enables the ST's adjacent <color=#F74848>2</color>-tile area to become a valid attack zone for "
            "allied Missile Launcher and Rocket Launcher attacks.\n"
            "When in combat, enemy DMG Taken <color=#F74848>+10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60902406": {
        "name": "Sustainer",
        "skillId": "62313",
        "skillName": "Sustainer Drive · First Strike",
        "effect": (
            "At the start of action, reloads <color=#F74848>1</color> Ammo into a random non-exhausted "
            "Tactical Weapon.\n"
            "Tactical Weapon Ammo Capacity <color=#F74848>+2</color>.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60301506": {
        "name": "Suppressor",
        "ac": 16,
        "skillId": "62315",
        "skillName": "Suppressor Drive · Crit DMG",
        "effect": (
            "After being actively attacked by a Tactical Weapon, inflicts "
            "<buf ID=623152>[Ammo Jam]</buf> on the attacker. Can only trigger again after "
            "<color=#F74848>1</color> turn.\n"
            "When hit by a Tactical attack, DMG Taken <color=#F74848>-25%</color>. Similar effects cannot "
            "stack.\n"
            "When in combat, enemy Crit DMG <color=#F74848>-10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color>."
        ),
    },
    "61002416": {
        "name": "Executioner",
        "ac": 16,
        "skillId": "62316",
        "skillName": "Executioner Drive · First Strike",
        "effect": (
            "When actively attacking, if in <buf ID=900033>[Stealth]</buf>, this attack's Crit Rate "
            "<color=#F74848>+50%</color>. This effect can only trigger <color=#F74848>1</color> time per "
            "sortie.\n"
            "At the end of action, if there are no enemies within <color=#F74848>2</color> tiles, gains "
            "<buf ID=3004502>[Stealth I]</buf>, lasting <color=#F74848>2</color> turns. This effect has a "
            "<color=#F74848>3</color>-turn trigger interval.\n"
            "When actively attacking for the <color=#F74848>1st</color> time each turn, DMG "
            "<color=#F74848>+7.5%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "61002106": {
        "name": "Trickster",
        "ac": 17,
        "skillId": "62317",
        "skillName": "Trickster Drive · Re-ATK",
        "effect": (
            "At the end of action, if there are no enemies within <color=#F74848>2</color> tiles, gains "
            "<buf ID=900033>[Stealth]</buf>, lasting <color=#F74848>2</color> turns. This effect has a "
            "<color=#F74848>3</color>-turn trigger interval.\n"
            "Gains Code <skill mainSkill=62317>[Concealment]</skill>: causes self and <color=#F74848>1</color> "
            "chosen ally within <color=#F74848>4</color> tiles to enter <buf ID=3004412>[Stealth II]</buf>, "
            "lasting <color=#F74848>2</color> turns.\n"
            "When re-attacking, Hit Rate <color=#F74848>+10%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60301116": {
        "name": "Sentinel",
        "ac": 17,
        "skillId": "62318",
        "skillName": "Sentinel Drive · Attack",
        "effect": (
            "Heavy STs only.\n"
            "When hit by a Tactical Weapon attack, DMG Taken <color=#F74848>-25%</color>. Similar effects "
            "cannot stack.\n"
            "Allies within Guard range take <color=#F74848>15%</color> less DMG from Code attacks. Similar "
            "effects cannot stack.\n"
            "After self takes damage from a Code attack, repairs <color=#F74848>15%</color> of Max HP to "
            "intact parts. This effect can trigger again after <color=#F74848>1</color> turn.\n"
            "When in combat, enemy DMG Dealt <color=#F74848>-10%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color>."
        ),
    },
    "60802106": {
        "name": "Guide",
        "ac": 18,
        "skillId": "62319",
        "skillName": "Guide Drive · Re-ATK",
        "effect": (
            "Gains Code <skill mainSkill=62319>[Tracer Coating]</skill>.\n"
            "Enables the ST's adjacent <color=#F74848>2</color>-tile area to become a valid attack zone for "
            "allied Missile Launcher and Rocket Launcher attacks.\n"
            "When re-attacking, Hit Rate <color=#F74848>+10%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
    "60402106": {
        "name": "Enforcer",
        "ac": 18,
        "skillId": "62320",
        "skillName": "Enforcer Drive · Re-ATK",
        "effect": (
            "When initiating combat, if the target is on the movement path and a part is destroyed, "
            "inflicts <buf ID=1009083>[Intimidation]</buf> on the target, lasting <color=#F74848>1</color> "
            "turn. Can trigger <color=#F74848>1</color> time per turn.\n"
            "ST movement type changes to Levitating, enabling it to pass over low obstacles.\n"
            "When re-attacking, Hit Rate <color=#F74848>+10%</color> and Crit Rate <color=#F74848>+5%</color>.\n"
            "ST Body HP <color=#F74848>+10%</color> and DMG Dealt <color=#F74848>+5%</color>."
        ),
    },
}


def main():
    for backpack_id, entry in ENTRIES.items():
        out = {"name": entry["name"]}
        if "ac" in entry:
            out["ac"] = entry["ac"]
        out["skills"] = {
            entry["skillId"]: {
                "name": entry["skillName"],
                "SpecificEffects": entry["effect"],
            }
        }
        path = os.path.join(DIR, f"{backpack_id}-translation.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
            f.write("\n")
    print(f"Wrote {len(ENTRIES)} translation files.")


if __name__ == "__main__":
    main()
