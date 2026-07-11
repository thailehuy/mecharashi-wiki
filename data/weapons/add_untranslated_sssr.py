"""One-off script: add English translations for the 20 previously-untranslated
SSSR weapons, matched to their pilot via exact content cross-reference between
the CN raw skill text (sssr-raw.json) and the rough EN translations in
excel-copy.txt (rows 21-40, AC9-AC18). Two weapons (Martini AC19 Pile Bunker,
Matilda AC19 Heavy Machine Gun) could not be matched -- the raw dataset's two
remaining SSSR items at that ID range are an unrelated pair of backpack-fused
railguns ("裁决者"/"糖衣毁灭者"), not pilot signature weapons, so those two
pilots' actual weapons are simply not present in sssr-raw.json yet.
"""
import json
import os

DIR = os.path.dirname(os.path.abspath(__file__))

ENTRIES = {
    "10815121": {
        "name": "Z15 Kinetic Axe",
        "pilot": "Dean",
        "ac": 9,
        "skills": {
            "53062": {
                "name": "Overpowered Cutter",
                "SpecificEffects": "When attacking with a Chainsaw, for every <color=#F74848>1</color> part broken, gains <color=#F74848>1</color> stack of <buf ID=530622>[Chainsaw Heat Up]</buf>, up to <color=#F74848>3</color> stacks. At the end of action, removes <color=#F74848>1</color> stack.",
            },
            "53063": {
                "name": "Courage Burst",
                "SpecificEffects": "Enhanced [Courage Burst]: <buf ID=1013503>[Vigor]</buf> stack cap increased by <color=#F74848>5</color>. At the start of battle, gains <color=#F74848>5</color> stacks of <buf ID=1013503>[Vigor]</buf>. After actively attacking, if possessing <color=#F74848>10</color> or more stacks of <buf ID=1013503>[Vigor]</buf>, restores <color=#F74848>1</color> AP after combat. Can trigger <color=#F74848>1</color> time per turn.",
            },
            "53061": {
                "name": "Shattering Strike",
                "SpecificEffects": "When attacking, if the part hit does not have full HP, DMG Dealt <color=#F74848>+20%</color> to that part.",
            },
        },
    },
    "20315122": {
        "name": "Jungle Calamity",
        "pilot": "Frida",
        "ac": 9,
        "skills": {
            "53056": {
                "name": "Outta My Way!",
                "SpecificEffects": "When initiating combat with a Shotgun, if the target is <color=#F74848>1</color> tile away, DMG <color=#F74848>+25%</color>.",
            },
            "53057": {
                "name": "Take This!",
                "SpecificEffects": "Enhanced [Secret Execution]: When inflicting <buf ID=1004412>[Instability II]</buf>, instead inflict [Instability III]. For each stack, target DMG Dealt <color=#F74848>-3%</color>. When initiating combat with a Shotgun, if the target has <color=#F74848>3</color> or more stacks of <buf ID=900034>[Instability]</buf>, uses all Shotguns to launch <buf ID=900001>[Flurry Strike]</buf>, dealing <color=#F74848>0.15x</color> DMG.",
            },
            "53055": {
                "name": "Come at Me!",
                "SpecificEffects": "When initiating combat, ignores <color=#F74848>30%</color> of the target's Armor.",
            },
        },
    },
    "50115122": {
        "name": "Strawberry Macaroni",
        "pilot": "Fia",
        "ac": 10,
        "skills": {
            "53068": {
                "name": "Piercing Pulse",
                "SpecificEffects": "When actively attacking with a Rail Gun, DMG dealt to targets carrying a debuff <color=#F74848>+20%</color>.",
            },
            "53069": {
                "name": "Total Sweep",
                "SpecificEffects": "Enhanced [Perfectionism]: When deploying a <buf ID=900085>[Tokamak Sphere]</buf>, the redirect direction expands to the selected direction and the <color=#F74848>2</color> adjacent directions, and the redirected attack's DMG multiplier <color=#F74848>+0.2</color>. When actively attacking, if the target carries <color=#F74848>5</color> or more debuffs, inflicts <buf ID=1009083>[Intimidation]</buf> after combat, lasting <color=#F74848>1</color> turn. When actively attacking, for every <color=#F74848>15</color> debuffs inflicted (cumulative), immediately gains <color=#F74848>1</color> AP.",
            },
            "53067": {
                "name": "Ammo Regeneration",
                "SpecificEffects": "When actively attacking with a Rail Gun, if <color=#F74848>3</color> or more targets are hit, restores <color=#F74848>1</color> Ammo after combat. This effect can trigger again after an interval of <color=#F74848>2</color> turns.",
            },
        },
    },
    "10415123": {
        "name": "Vow of Protection",
        "pilot": "Rei",
        "ac": 10,
        "skills": {
            "53065": {
                "name": "Regenerative Arm Plating",
                "SpecificEffects": "After combat, if the shield-carrying Arm is destroyed, immediately repairs it and restores <color=#F74848>50%</color> HP. Can trigger again after an interval of <color=#F74848>3</color> turns.",
            },
            "53066": {
                "name": "Oath",
                "SpecificEffects": "Enhanced [First Qualified Pilot]: Allies within <buf ID=900022>[Guard]</buf> range take <color=#F74848>25%</color> less DMG from Code and AoE attacks. When <buf ID=1014820>[Sync Ratio]</buf> is above <color=#F74848>65%</color>, DMG Dealt and <buf ID=900017>[Fixed DMG]</buf> Dealt <color=#F74848>+25%</color>.",
            },
            "53064": {
                "name": "Reinforced Alloy",
                "SpecificEffects": "The base HP provided by the Shield increases by <color=#F74848>100%</color>.",
            },
        },
    },
    "10915121": {
        "name": "Δ-09",
        "pilot": "Ophelia",
        "ac": 11,
        "skills": {
            "53071": {
                "name": "Dominance",
                "SpecificEffects": "After triggering <buf ID=900109>[Execution]</buf>, inflicts <buf ID=7101203>[DMG Down II]</buf> and <buf ID=7101803>[DMG Taken UP II]</buf> on the target and enemies within <color=#F74848>1</color> tile, lasting <color=#F74848>1</color> turn.",
            },
            "53072": {
                "name": "Σ-04Ω",
                "SpecificEffects": "Enhanced [Σ-04]: When using an Alter-Blade to chain-attack the same target, Hit Weighting on the first part hit <color=#F74848>+50</color>; this effect is removed once the target acts. At the start of action, only <color=#F74848>1</color> stack of <buf ID=900100>[Critical Sense]</buf> is removed. While carrying <color=#F74848>3</color> stacks of <buf ID=900100>[Critical Sense]</buf>, DMG <color=#F74848>+15%</color> and DMG Taken <color=#F74848>-15%</color>.",
            },
            "53070": {
                "name": "Repeat Slash",
                "SpecificEffects": "When triggering <buf ID=900004>[Re-ATK]</buf>, DMG and Hit Rate <color=#F74848>+10%</color>.",
            },
        },
    },
    "20115122": {
        "name": "Dusk Star Continuity",
        "pilot": "Cassha",
        "ac": 11,
        "skills": {
            "53074": {
                "name": "Defiance",
                "SpecificEffects": "After retaliating with a Machine Gun, gains <buf ID=530742>[Momentum]</buf>.",
            },
            "53075": {
                "name": "Sudden Surge",
                "SpecificEffects": "Enhanced [Veiled Razor]: While carrying <buf ID=2015509>[Retaliation Enhancement]</buf> and both Arms are intact, can trigger <buf ID=900022>[Guard]</buf>, protecting allies within <color=#F74848>1</color> adjacent tile from Assault, Ranged, and Melee attacks. If also carrying <buf ID=2015081>[Turning Point]</buf>, <buf ID=900022>[Guard]</buf> range increases to <color=#F74848>2</color> tiles. If equipped with two Machine Guns, when triggering <buf ID=900096>[Retaliation]</buf> or <buf ID=900023>[Quick Draw]</buf>, for every <color=#F74848>1</color> stack of <buf ID=2015509>[Retaliation Enhancement]</buf>, gains a <color=#F74848>20%</color> chance to use all Machine Guns to trigger <buf ID=900028>[Add Strike]</buf>, dealing <color=#F74848>0.35x</color> DMG.",
            },
            "53073": {
                "name": "Fire of Retaliation",
                "SpecificEffects": "When retaliating, Crit Rate and Hit Rate <color=#F74848>+15%</color>.",
            },
        },
    },
    "10515123": {
        "name": "Parting Song Prism",
        "pilot": "Melissa",
        "ac": 12,
        "skills": {
            "53080": {
                "name": "Practice Makes Perfect",
                "SpecificEffects": "After actively repairing <color=#F74848>3</color> cumulative times, gains <color=#F74848>1</color> AP and <buf ID=500923>[Renovate II]</buf>, lasting <color=#F74848>1</color> turn.",
            },
            "53081": {
                "name": "Goldfinch's Cry",
                "SpecificEffects": "Enhanced [Auto-Module]: <skill mainSkill=500406>[Repair Synergy]</skill> and <skill mainSkill=500408>[Full-Line Maintenance]</skill> can additionally dispel <color=#F74848>1</color> debuff from the repair target. Every time <buf ID=900038>[Regular Repair]</buf> triggers, dispels <color=#F74848>1</color> debuff.",
            },
            "53079": {
                "name": "In Kind",
                "SpecificEffects": "When the shield-carrying Arm is attacked, inflicts <buf ID=7101003>[Hit Rate Down II]</buf> and <buf ID=7101303>[Crit Rate Down II]</buf> on the enemy after combat, lasting <color=#F74848>1</color> turn.",
            },
        },
    },
    "20215122": {
        "name": "Gaius",
        "pilot": "Shinji",
        "ac": 12,
        "skills": {
            "53077": {
                "name": "Resonant Mechanism",
                "SpecificEffects": "When actively attacking with a Heavy Machine Gun, if a part is broken, gains <color=#F74848>1</color> random buff after combat, lasting <color=#F74848>2</color> turns. Can trigger up to <color=#F74848>3</color> times per turn.",
            },
            "53078": {
                "name": "Gospel of Hope",
                "SpecificEffects": "Enhanced [Third Qualified Pilot]: Heavy Machine Gun range <color=#F74848>+1</color>, <buf ID=1014820>[Sync Ratio]</buf> correction effect <color=#F74848>+25%</color>. Every time <buf ID=900004>[Re-ATK]</buf> is triggered, <buf ID=1014820>[Sync Ratio]</buf> <color=#F74848>+3%</color>. After actively attacking, gains <buf ID=530786>[Sync Miracle]</buf>. Effective up to <color=#F74848>1</color> time per turn.",
            },
            "53076": {
                "name": "Superior Firepower",
                "SpecificEffects": "When actively attacking, DMG <color=#F74848>+15%</color>. Starting from <color=#F74848>1</color> tile, for every additional <color=#F74848>1</color> tile away from the target, DMG <color=#F74848>+5%</color>, up to <color=#F74848>25%</color>.",
            },
        },
    },
    "40115122": {
        "name": "Backfire Meteor",
        "pilot": "Arthur",
        "ac": 13,
        "skills": {
            "53086": {
                "name": "Extended Range Effect",
                "SpecificEffects": "When attacking with a Missile Launcher, if distance from target is <color=#F74848>4</color> or more tiles, DMG <color=#F74848>+30%</color>.",
            },
            "53087": {
                "name": "Restless Spirit",
                "SpecificEffects": "Enhanced [Burning Heart]: Upon deployment, gains <color=#F74848>5</color> stacks of <buf ID=530872>[Burning Intent]</buf>. After the talent triggers <buf ID=900002>[Link Attack]</buf>, or after actively attacking, for every <color=#F74848>1</color> Ammo consumed, gains <color=#F74848>1</color> stack of <buf ID=530872>[Burning Intent]</buf>, up to <color=#F74848>15</color> stacks. While carrying <color=#F74848>10</color> or more stacks, AP Regen <color=#F74848>+1</color>. <buf ID=4008509>[Lock]</buf> increases DMG multiplier of Arthur's active attacks and all <buf ID=900002>[Link Attacks]</buf> against the target by <color=#F74848>+0.1</color>.",
            },
            "53085": {
                "name": "Reserve Magazine",
                "SpecificEffects": "After actively attacking with a Missile Launcher, randomly reloads Ammo to carried Missile Launchers equal to the amount spent this action. Can trigger again after an interval of <color=#F74848>1</color> turn.",
            },
        },
    },
    "10415124": {
        "name": "Glory's Ward",
        "pilot": "Tiphys",
        "ac": 13,
        "skills": {
            "53083": {
                "name": "Command of the Field",
                "SpecificEffects": "Before being actively attacked, if on allied terrain, immediately restores <color=#F74848>1</color> AP. Can trigger <color=#F74848>1</color> time per turn.",
            },
            "53084": {
                "name": "Battle-Hardened Commander",
                "SpecificEffects": "Enhanced [Twilight Yet to Come]: <terrian ID=6008501 /> area expands to the selected tile and its surrounding <color=#F74848>2</color> tiles. Movement cost within <terrian ID=6008501 /> reduces by <color=#F74848>50%</color>. All allied units within <terrian ID=6008501 /> gain DMG <color=#F74848>+20%</color>, and when actively attacked, no part can take more than <color=#F74848>85%</color> of its Max HP in damage.",
            },
            "53082": {
                "name": "Total Defense",
                "SpecificEffects": "When the shield-carrying Arm takes damage, DMG Taken <color=#F74848>-10%</color> and Crit DMG Taken <color=#F74848>-20%</color>.",
            },
        },
    },
    "20415122": {
        "name": "Mirage Haze",
        "pilot": "Fregata",
        "ac": 14,
        "skills": {
            "53092": {
                "name": "Crimson Flame Circuit",
                "SpecificEffects": "When actively attacking with a Flamethrower, for every <color=#F74848>1</color> buff carried, DMG <color=#F74848>+7.5%</color>, up to <color=#F74848>30%</color>.",
            },
            "53093": {
                "name": "ND Amplifier",
                "SpecificEffects": "Enhanced [Kalavinka]: Upon deployment, gains <color=#F74848>2</color> stacks of <buf ID=2016503>[Dual Gun Efficiency]</buf>. When in combat with a target within <buf ID=900011>[Ideal Range]</buf> using two Assault Weapons, Final DMG <color=#F74848>+15%</color>. After actively attacking, if carrying <color=#F74848>5</color> or more buffs, immediately restores <color=#F74848>1</color> AP. Can trigger <color=#F74848>1</color> time per turn.",
            },
            "53091": {
                "name": "Calibration Unit",
                "SpecificEffects": "When in combat with a target within <buf ID=900011>[Ideal Range]</buf>, Crit Rate and Hit Rate <color=#F74848>+15%</color>.",
            },
        },
    },
    "10315123": {
        "name": "Godslayer",
        "pilot": "Asuka",
        "ac": 14,
        "skills": {
            "53089": {
                "name": "Chained Stars",
                "SpecificEffects": "When attacking with a Polearm, for every <color=#F74848>1</color> target within the attack range, DMG <color=#F74848>+7.5%</color>, up to <color=#F74848>30%</color>.",
            },
            "53090": {
                "name": "Will of Tomorrow",
                "SpecificEffects": "Enhanced [Second Qualified Pilot]: After actively attacking, if no damage was taken, the next active attack's DMG bonus increases to <color=#F74848>30%</color>, and is granted immediately upon deployment. When actively attacking, for every <color=#F74848>1</color> target destroyed, <buf ID=1014820>[Sync Ratio]</buf> additionally <color=#F74848>+1%</color>. Once <buf ID=1014820>[Sync Ratio]</buf> reaches <color=#F74848>80%</color>, Polearm skill multiplier <color=#F74848>+0.1</color> and Code Skill range <color=#F74848>+1</color>, Machine Gun skill multiplier <color=#F74848>+0.05</color>.",
            },
            "53088": {
                "name": "Fleeting Shadow",
                "SpecificEffects": "When an attack misses, still deals <color=#F74848>40%</color> of the original DMG.",
            },
        },
    },
    "30215123": {
        "name": "Firework Scalpel",
        "pilot": "Paloma",
        "ac": 15,
        "skills": {
            "53098": {
                "name": "Flash of Inspiration",
                "SpecificEffects": "When actively attacking with a Sniper Rifle, if a critical hit is triggered, restores <color=#F74848>1</color> AP after combat. Can trigger <color=#F74848>1</color> time per turn.",
            },
            "53099": {
                "name": "Iterative Theory",
                "SpecificEffects": "Enhanced [Experimental Observation]: <buf ID=900112>[Positional Advantage]</buf> stack cap increases by <color=#F74848>4</color>. While in <buf ID=900111>[Directional Rack]</buf> and attacking with a Sniper Rifle, gains <color=#F74848>1</color> additional stack of <buf ID=900112>[Positional Advantage]</buf> per critical hit. Every <color=#F74848>4</color> stacks of <buf ID=900112>[Positional Advantage]</buf> grants Sniper Rifle DMG multiplier <color=#F74848>+0.05</color>. Upon exiting <buf ID=900111>[Directional Rack]</buf>, only <color=#F74848>8</color> stacks of <buf ID=900112>[Positional Advantage]</buf> are removed.",
            },
            "53097": {
                "name": "Stay Back!",
                "SpecificEffects": "When actively attacking, if <color=#F74848>3</color> or more tiles from the target, Hit Rate and Crit Rate <color=#F74848>+15%</color>.",
            },
        },
    },
    "10515124": {
        "name": "Delicate",
        "pilot": "Smith",
        "ac": 15,
        "skills": {
            "53095": {
                "name": "Advance and Assault",
                "SpecificEffects": "If the pilot is a Machinist, <buf ID=900002>[Link Attack]</buf> trigger chance and range <color=#F74848>+1</color>.",
            },
            "53096": {
                "name": "Now You See It",
                "SpecificEffects": "Enhanced [False Front]: When actively repairing an ally, grants them <buf ID=530962>[Code DMG Reduction]</buf>, removed after triggering once. When triggering <buf ID=900002>[Link Attack]</buf>, gains <color=#F74848>1</color> stack of <buf ID=530965>[No Time to Lose]</buf>, up to <color=#F74848>3</color> stacks. While <buf ID=900151>[False Front]</buf> is available to trigger, allied ST bodies are immune to <buf ID=900109>[Execution]</buf>.",
            },
            "53094": {
                "name": "Opportunist",
                "SpecificEffects": "When the shield-carrying Arm is attacked in combat, for every <color=#F74848>1</color> debuff the enemy carries, DMG Taken <color=#F74848>-10%</color>, up to <color=#F74848>-30%</color>.",
            },
        },
    },
    "40215122": {
        "name": "Veto",
        "pilot": "Rosemary",
        "ac": 16,
        "skills": {
            "53101": {
                "name": "Consensus of Annihilation",
                "SpecificEffects": "When both Shoulders are equipped with Rocket Launchers, active attacks with a Rocket Launcher gain DMG and Hit Rate <color=#F74848>+20%</color>.",
            },
            "53102": {
                "name": "Decision Maker",
                "SpecificEffects": "Enhanced [Helmsman]: <buf ID=900123>[Intel]</buf> initial and max stacks <color=#F74848>+5</color>. When actively attacking with a Rocket Launcher, if carrying <color=#F74848>15</color> or more stacks of <buf ID=900123>[Intel]</buf> before the attack, restores <color=#F74848>1</color> AP after combat. Can trigger <color=#F74848>1</color> time per turn. Each stack of <buf ID=900123>[Intel]</buf> grants Crit Rate <color=#F74848>+0.4%</color>.",
            },
            "53100": {
                "name": "Breaker of the Unyielding",
                "SpecificEffects": "When actively attacking with a Rocket Launcher, DMG to parts at <color=#F74848>100%</color> HP <color=#F74848>+20%</color>.",
            },
        },
    },
    "20115123": {
        "name": "Peace Function",
        "pilot": "Sapientia",
        "ac": 16,
        "skills": {
            "53104": {
                "name": "Optimized Posture",
                "SpecificEffects": "When in combat, if equipped with a Machine Gun and a Small Shield, Machine Gun Final DMG <color=#F74848>+10%</color>, and Final DMG Taken <color=#F74848>-15%</color>.",
            },
            "53105": {
                "name": "Perfect Partner",
                "SpecificEffects": "Enhanced [Coexistence Theory]: All parts of [GuGu] gain Max HP <color=#F74848>+15%</color>, and gains Code Skill <skill mainSkill=500894>[GuGuts Hero!]</skill>. [GuGu] also gains this weapon's <skill passiveSkill=53103>[Malfunction Implant]</skill> and <skill passiveSkill=53104>[Optimized Posture]</skill> effects.",
            },
            "53103": {
                "name": "Malfunction Implant",
                "SpecificEffects": "When attacking with a Machine Gun, inflicts <color=#F74848>1</color> stack of <buf ID=531032>[Fire Control Delay]</buf> on the target, up to <color=#F74848>5</color> stacks.",
            },
        },
    },
    "50215122": {
        "name": "Thousand Legion",
        "pilot": "Collin",
        "ac": 17,
        "skills": {
            "53110": {
                "name": "Momentum Union",
                "SpecificEffects": "Cutter Max Ammo <color=#F74848>+1</color>. If the Cutter has attacked <color=#F74848>3</color> times in the same turn, restores <color=#F74848>1</color> Ammo at the end of the turn.",
            },
            "53111": {
                "name": "Perfected Edge",
                "SpecificEffects": "Enhanced [Strategize]: For every <color=#F74848>1</color> ally on the field carrying <buf ID=4011502>[Appointment]</buf>, own Cutter skill multiplier <color=#F74848>+0.07</color>. When an ally carrying <buf ID=4011502>[Appointment]</buf> initiates combat, inflicts <buf ID=4011041>[Subtask - Attack]</buf> on them beforehand. Can trigger <color=#F74848>1</color> time per turn. If not triggered by the end of own action, grants <buf ID=4011043>[Subtask - Defense]</buf> to the lowest-HP ally carrying <buf ID=4011502>[Appointment]</buf>.",
            },
            "53109": {
                "name": "Piercing Distance",
                "SpecificEffects": "When attacking with a Cutter, ignores <color=#F74848>35%</color> of the target's Armor. For every <color=#F74848>1</color> tile of distance from the target, DMG <color=#F74848>+5%</color>, up to <color=#F74848>20%</color>.",
            },
        },
    },
    "30115122": {
        "name": "Arbiter of Fate",
        "pilot": "Veronica",
        "ac": 17,
        "skills": {
            "53107": {
                "name": "Silent Arbitration",
                "SpecificEffects": "After using a Light Rifle to launch an active attack with <buf ID=900014>[Aiming]</buf>, restores <color=#F74848>1</color> AP. Can trigger <color=#F74848>1</color> time per turn.",
            },
            "53108": {
                "name": "Trauma Collapse",
                "SpecificEffects": "Enhanced [Trauma Profiling]: Active attack skills usable with <buf ID=900014>[Aiming]</buf> gain skill multiplier <color=#F74848>+0.25</color> and Crit Rate <color=#F74848>+15%</color>. When actively attacking a target with [Battle Damage], the target cannot retaliate; effective <color=#F74848>1</color> time per turn for each target. Restores <color=#F74848>1</color> AP after the first active attack each turn.",
            },
            "53106": {
                "name": "Draining Metabolism",
                "SpecificEffects": "When actively attacking, for every <color=#F74848>1</color> debuff the target carries, DMG Taken by the target <color=#F74848>+5%</color>, up to <color=#F74848>25%</color>.",
            },
        },
    },
    "50115123": {
        "name": "Codex of Sin",
        "pilot": "Verna",
        "ac": 18,
        "skills": {
            "53113": {
                "name": "Boundless Bestowal",
                "SpecificEffects": "Rail Gun Ammo capacity <color=#F74848>+1</color>. When attacking with a Rail Gun, Crit Rate <color=#F74848>+20%</color>.",
            },
            "53114": {
                "name": "Glory of Sin",
                "SpecificEffects": "Enhanced [Doctrine of Sin]: When another ally is actively attacked, inflicts <buf ID=6010502>[Magnetic Lock-On]</buf> on the attacker. Can trigger <color=#F74848>2</color> times per turn. When actively attacking with a Rail Gun, for every <color=#F74848>1</color> target destroyed, restores <color=#F74848>1</color> Rail Gun Ammo, up to <color=#F74848>3</color> times per turn. For every <color=#F74848>1</color> time <buf ID=6010502>[Magnetic Lock-On]</buf> is inflicted, gains <color=#F74848>1</color> stack of <buf ID=531145>[Magnetic Buff]</buf>, up to <color=#F74848>10</color> stacks.",
            },
            "53112": {
                "name": "Arc Bargain",
                "SpecificEffects": "When attacking with a Rail Gun, for every <color=#F74848>1</color> Ammo remaining, DMG and Hit Rate <color=#F74848>+4%</color>, up to <color=#F74848>20%</color>.",
            },
        },
    },
    "10815122": {
        "name": "Shattered Fang",
        "pilot": "Wyatt",
        "ac": 18,
        "skills": {
            "53116": {
                "name": "Savage Rhythm",
                "SpecificEffects": "When attacking with a Chainsaw, if own overall HP percentage is below <color=#F74848>70%</color>, Chainsaw combo count <color=#F74848>+1</color>. For every additional <color=#F74848>20%</color> HP lost, combo count <color=#F74848>+1</color> more, up to an additional <color=#F74848>+2</color>.",
            },
            "53117": {
                "name": "Battle-Tested Instinct",
                "SpecificEffects": "Enhanced [Seasoned Veteran]: <buf ID=900127>[Invigorate]</buf> stack cap <color=#F74848>+1</color>; gains <color=#F74848>1</color> stack for every <color=#F74848>8.5%</color> HP lost. Each stack of <buf ID=900127>[Invigorate]</buf> increases Retaliation and <buf ID=900009>[Pursuit Retaliation]</buf> DMG by <color=#F74848>4%</color>, and reduces DMG Taken by <color=#F74848>2%</color>.",
            },
            "53115": {
                "name": "Single-Handed Might",
                "SpecificEffects": "Wielding a Chainsaw one-handed no longer reduces Hit Rate.",
            },
        },
    },
}


def main():
    path = os.path.join(DIR, 'sssr-translations.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    added = 0
    for weapon_id, entry in ENTRIES.items():
        if weapon_id not in data:
            print(f'WARNING: {weapon_id} not found in sssr-translations.json, skipping')
            continue
        data[weapon_id] = {
            'name': entry['name'],
            'passiveSkills': entry['skills'],
            'pilot': entry['pilot'],
            'ac': entry['ac'],
        }
        added += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'Added translations for {added} weapons.')


if __name__ == '__main__':
    main()
