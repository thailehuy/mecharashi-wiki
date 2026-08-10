window.ShopsData = {
  // CN datamine data — patch numbers are approximate and rotation order/timing
  // may not exactly match Global.
  note: 'Compiled from CN datamine records. CN version numbers are approximate — Global timing and order may differ.',

  // Shop listing names that differ from the mod's actual translated name in
  // data/modules/compiled.json (these are STs' innate 8/8 mods, plus
  // Overhaul Mod which is the same module as the already-catalogued
  // Maintenance Mod — same icon, same Repair AMT progression).
  modAliases: {
    'Standby Mod': 'Opportunist Mod',
    'Bombing Mod': 'Bombardment Mod',
    'Violent Mod': 'Berserk Mod',
    'Overhaul Mod': 'Maintenance Mod'
  },

  rotations: [
    { shop: 'border', version: null, st: 'Blue Bird',     lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],           lv4: ['MG Mod', 'Overhaul Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'arena',  version: null, st: 'Dias',          lv8: ['Kinetic Mod', 'Combo Mod', 'Suppression Mod', 'Surmount Mod'],           lv4: ['Power Mod', 'Dodge Mod', 'Crit Rate Mod', 'Accuracy Mod'] },
    { shop: 'border', version: null, st: 'SEFAS',         lv8: ['Repair Mod', 'Fortification Mod', 'Matching Mod', 'Execution Mod'],      lv4: ['Polearm Mod', 'Blade Mod', 'HMG Mod', 'Anti-Melee Mod'] },
    { shop: 'arena',  version: '2.1', st: 'Eye Of Faith', lv8: ['Poke Mod', 'Mitigation Mod', 'Vigilant Mod', 'Safeguard Mod'],           lv4: ['ML Mod', 'Crit RES Mod', 'PB Mod', 'Anti-Tactical Mod'] },
    { shop: 'border', version: '2.2', st: 'Arcus',        lv8: ['Urgent Repair Mod', 'Retaliation Mod', 'Adaptive Mod', 'Breaker Mod'],   lv4: ['Tending Mod', 'DMG Taken Mod', 'Armor Mod', 'HP Mod'] },
    { shop: 'border', version: '2.3', st: 'Aurora',       lv8: ['Mass Repair Mod', 'Defender Mod', 'Crusher Mod', 'Accumulator Mod'],     lv4: ['Chainsaw Mod', 'Flamethrower Mod', 'Rocket Mod', 'Anti-Sniper Mod'] },
    { shop: 'arena',  version: '2.3', st: 'Glasya',       lv8: ['Kinetic Mod', 'Combo Mod', 'Suppression Mod', 'Surmount Mod'],           lv4: ['Power Mod', 'Dodge Mod', 'Crit Rate Mod', 'Accuracy Mod'] },
    { shop: 'border', version: '2.5', st: 'Dreadtalon',   lv8: ['Standby Mod', 'Bombing Mod', 'Violent Mod', 'Focus Mod'],                lv4: ['MG Mod', 'Overhaul Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'arena',  version: '2.6', st: 'Kong',         lv8: ['Poke Mod', 'Mitigation Mod', 'Vigilant Mod', 'Safeguard Mod'],           lv4: ['ML Mod', 'Crit Rate Mod', 'PB Mod', 'Anti-Tactical Mod'] },
    { shop: 'border', version: '2.7', st: 'Malthus',      lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],            lv4: ['MG Mod', 'Overhaul Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'border', version: '3.0', st: 'Rex',          lv8: ['Mass Repair Mod', 'Defender Mod', 'Crusher Mod', 'Accumulator Mod'],     lv4: ['Chainsaw Mod', 'Flamethrower Mod', 'Rocket Mod', 'Anti-Sniper Mod'] },
    { shop: 'arena',  version: '3.0', st: 'Mithril',      lv8: ['Repair Mod', 'Matching Mod', 'Fortification Mod', 'Execution Mod'],      lv4: ['Polearm Mod', 'Blade Mod', 'HMG Mod', 'Anti-Melee Mod'] },
    { shop: 'border', version: '3.2', st: 'Heracles',     lv8: ['Standby Mod', 'Bombing Mod', 'Violent Mod', 'Focus Mod'],                lv4: ['MG Mod', 'Overhaul Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'border', version: '3.4', st: 'Igniter',      lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],            lv4: ['MG Mod', 'Overhaul Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] }
  ]
};
