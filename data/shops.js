window.ShopsData = {
  // CN datamine data — patch numbers are approximate and rotation order/timing
  // may not exactly match Global.
  note: 'Compiled from CN datamine records. CN version numbers are approximate — Global timing and order may differ.',

  // Nostalgic Challenge Store (Covert Phantom's Refactor-in-Crisis): two pilot
  // pledges per version, only one of which can be bought.
  crisis: [
    { version: '2.4', pilots: ['Kelly', 'Naomi'] },
    { version: '2.5', pilots: ['Hong', 'Eileen'] },
    { version: '2.6', pilots: ['Frida', 'Camilla'] },
    { version: '2.8', pilots: ['Arthur', 'Melissa'] },
    { version: '3.1', pilots: ['Lorna', 'Diracca'] },
    { version: '3.3', pilots: ['Fregata', 'Erisa'] },
    { version: '3.6', pilots: ['Paloma', 'Anderson'] }
  ],

  // The store's other items (ConfigDataFixedShopItemInfo, shop 115), paid
  // in Reconstruction Logs. Limits are lifetime caps that grow by the same
  // amount each season: global has 2 seasons' worth, CN 7.
  crisisItems: [
    { name: 'Transit Voucher',  icon: 'Icon_item_11100000',      count: 1,     price: 80,  global: 10, cn: 35 },
    { name: 'Recruit Voucher',  icon: 'Icon_item_11000000',      count: 1,     price: 80,  global: 10, cn: 35 },
    { name: 'Bulk Voucher',     icon: 'Icon_item_11100001',      count: 1,     price: 160, global: 10, cn: 35 },
    { name: 'Memory Fragment',  icon: 'Icon_item_10210001',      count: 50,    price: 50,  global: 16, cn: 56 },
    { name: 'Bay Bits',         icon: 'Icon_currency_DrawToken', count: 50,    price: 200, global: 8,  cn: 28 },
    { name: 'Expansive Flash',  icon: 'Icon_item_11800000',      count: 1,     price: 50,  global: 20, cn: 70 },
    { name: 'EN Container',     icon: 'Icon_item_10100010',      count: 1,     price: 20,  global: 20, cn: 70 },
    { name: 'Milkhama Dollar',  icon: 'Icon_currency_001',       count: 10000, price: 50,  global: 20, cn: 70 }
  ],

  rotations: [
    { shop: 'border', version: null, st: 'Blue Bird',     lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],           lv4: ['MG Mod', 'Maintenance Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'arena',  version: null, st: 'Dias',          lv8: ['Kinetic Mod', 'Combo Mod', 'Suppression Mod', 'Surmount Mod'],           lv4: ['Power Mod', 'Dodge Mod', 'Crit Rate Mod', 'Accuracy Mod'] },
    { shop: 'border', version: null, st: 'SEFAS',         lv8: ['Repair Mod', 'Fortification Mod', 'Matching Mod', 'Execution Mod'],      lv4: ['Polearm Mod', 'Blade Mod', 'HMG Mod', 'Anti-Melee Mod'] },
    { shop: 'arena',  version: '2.1', st: 'Eye of Faith', lv8: ['Poke Mod', 'Mitigation Mod', 'Vigilant Mod', 'Safeguard Mod'],           lv4: ['ML Mod', 'Crit RES Mod', 'PB Mod', 'Anti-Tactical Mod'] },
    { shop: 'border', version: '2.2', st: 'Arcus',        lv8: ['Urgent Repair Mod', 'Retaliation Mod', 'Adaptive Mod', 'Breaker Mod'],   lv4: ['Tending Mod', 'DMG Taken Mod', 'Armor Mod', 'HP Mod'] },
    { shop: 'border', version: '2.5', st: 'Aurora',       lv8: ['Mass Repair Mod', 'Defender Mod', 'Crusher Mod', 'Accumulator Mod'],     lv4: ['Chainsaw Mod', 'Flamethrower Mod', 'Rocket Mod', 'Anti-Sniper Mod'] },
    { shop: 'arena',  version: '2.5', st: 'Glasya',       lv8: ['Kinetic Mod', 'Combo Mod', 'Suppression Mod', 'Surmount Mod'],           lv4: ['Power Mod', 'Dodge Mod', 'Crit Rate Mod', 'Accuracy Mod'] },
    { shop: 'border', version: '2.7', st: 'Dreadtalon',   lv8: ['Opportunist Mod', 'Bombardment Mod', 'Matrix Mod', 'Focus Mod'],                lv4: ['MG Mod', 'Maintenance Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'arena',  version: '2.8', st: 'Kong',         lv8: ['Poke Mod', 'Mitigation Mod', 'Vigilant Mod', 'Safeguard Mod'],           lv4: ['ML Mod', 'Crit Rate Mod', 'PB Mod', 'Anti-Tactical Mod'] },
    { shop: 'border', version: '2.9', st: 'Malthus',      lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],            lv4: ['MG Mod', 'Maintenance Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'border', version: '3.2', st: 'Rex',          lv8: ['Mass Repair Mod', 'Defender Mod', 'Crusher Mod', 'Accumulator Mod'],     lv4: ['Chainsaw Mod', 'Flamethrower Mod', 'Rocket Mod', 'Anti-Sniper Mod'] },
    { shop: 'arena',  version: '3.2', st: 'Mithril',      lv8: ['Repair Mod', 'Matching Mod', 'Fortification Mod', 'Execution Mod'],      lv4: ['Polearm Mod', 'Blade Mod', 'HMG Mod', 'Anti-Melee Mod'] },
    { shop: 'border', version: '3.4', st: 'Heracles',     lv8: ['Opportunist Mod', 'Bombardment Mod', 'Matrix Mod', 'Focus Mod'],                lv4: ['MG Mod', 'Maintenance Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] },
    { shop: 'border', version: '3.6', st: 'Igniter',      lv8: ['Combo Mod', 'Aim Afar Mod', 'Flawless Mod', 'Fortitude Mod'],            lv4: ['MG Mod', 'Maintenance Mod', 'Crit DMG Mod', 'Anti-Assault Mod'] }
  ]
};
