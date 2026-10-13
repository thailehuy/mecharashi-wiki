var Pages = window.Pages || {};

// Game attribute keys (PilotBaseProperty<Key>) → wiki labels. The game's
// "Snipe" is the wiki's Ranged and its "Ranged" is Tactical.
var RD_PILOT_ATTRS = [
  { key: 'Melee',    label: 'Melee' },
  { key: 'Snipe',    label: 'Ranged' },
  { key: 'Assault',  label: 'Assault' },
  { key: 'Ranged',   label: 'Tactical' },
  { key: 'Mechanic', label: 'Mechanic' },
  { key: 'Defense',  label: 'Defense' },
];

var RD_MECH_CLASSES = ['Light ST', 'Medium ST', 'Heavy ST'];

var RD_MECH_STATS = [
  { label: 'Firepower',  add: 'WapFireValueAdd',                  multi: 'WapFireValueMulti' },
  { label: 'Arm Hit',    add: 'ActorWapPartHitValueAdd',          multi: 'ActorWapPartHitValueMulti' },
  { label: 'Dodge',      add: 'ActorWapPartDodgeAdd',             multi: 'ActorWapPartDodgeMulti' },
  { label: 'Crit RES',   add: 'DefenderActorCriticalAppendValue', multi: 'DefenderActorCriticalAppendValueMulti' },
  { label: 'Body HP',    add: 'WapBodyHPMaxAdd',                  multi: 'WapBodyHPMaxMulti' },
  { label: 'L-Arm HP',   add: 'WapLArmHPMaxAdd',                  multi: 'WapLArmHPMaxMulti' },
  { label: 'R-Arm HP',   add: 'WapRArmHPMaxAdd',                  multi: 'WapRArmHPMaxMulti' },
  { label: 'Legs HP',    add: 'WapLegHPMaxAdd',                   multi: 'WapLegHPMaxMulti' },
  { label: 'Body DEF',   add: 'WapBodyArmorAdd',                  multi: 'WapBodyArmorMulti' },
  { label: 'L-Arm DEF',  add: 'WapLArmArmorAdd',                  multi: 'WapLArmArmorMulti' },
  { label: 'R-Arm DEF',  add: 'WapRArmArmorAdd',                  multi: 'WapRArmArmorMulti' },
  { label: 'Legs DEF',   add: 'WapLegArmorAdd',                   multi: 'WapLegArmorMulti' },
];

// rd-totals.json weapon target → the weapon type its own stats are keyed by, and its label.
// A tree also lists small bonuses to sibling types; only the target's own
// stats are shown.
var RD_WEAPON_TYPES = [
  ['KN weapons',           'Knuckle',          'Knuckles'],
  ['PB weapons',           'PileBunker',       'Pile Bunker'],
  ['Alter-Blade weapons',  'Blade',            'Alter-Blade'],
  ['Polearm weapons',      'Rod',              'Polearm'],
  ['Chainsaw weapons',     'Saw',              'Chainsaw'],
  ['SS weapons',           'Buckler',          'Small Shield'],
  ['MG weapons',           'MachineGun',       'Machine Gun'],
  ['HMG weapons',          'HeavyMachineGun',  'Heavy Machine Gun'],
  ['SG weapons',           'ShotGun',          'Shotgun'],
  ['Flamethrower weapons', 'Flamethrower',     'Flamethrower'],
  ['LR weapons',           'LightSniper',      'Light Rifle'],
  ['SR weapons',           'HeavySniper',      'Sniper Rifle'],
  ['LS weapons',           'Shield',           'Large Shield'],
  ['ML weapons',           'Missile',          'Missile'],
  ['RL weapons',           'Rocket',           'Rocket'],
  ['RG weapons',           'RailGun',          'Rail Gun'],
  ['Cutter weapons',       'Funnel',           'Cutter'],
];

Pages.rdbonus = {
  title: 'R&D Bonus',

  _flat: function (stat) {
    return stat ? '+' + Math.round(stat.total).toLocaleString('en-US') : '–';
  },

  _pct: function (stat) {
    return stat ? '+' + +(stat.total * 100).toFixed(1) + '%' : '–';
  },

  _cell: function (bucket, add, multi) {
    var a = bucket[add], m = multi && bucket[multi];
    if (!a && !m) return '<td class="rd-cell rd-empty">–</td>';
    return '<td class="rd-cell">' +
      (a ? '<span class="rd-flat">' + this._flat(a) + '</span>' : '') +
      (m ? '<span class="rd-pct">' + this._pct(m) + '</span>' : '') +
    '</td>';
  },

  _table: function (head, rows) {
    return (
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table rd-table">' +
          '<thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' +
          '<tbody>' + rows.join('') + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  _section: function (id, title, note, body) {
    return (
      '<div class="ac-section" id="' + id + '">' +
        '<h2 class="ac-section-title">' + title + '</h2>' +
        (note ? '<p class="ac-section-footnote rd-section-note">' + note + '</p>' : '') +
        body +
      '</div>'
    );
  },

  _pilotSection: function (data) {
    var self = this;
    var rows = Object.keys(data).sort().map(function (cls) {
      return '<tr><td class="rd-row-label">' + cls + '</td>' +
        RD_PILOT_ATTRS.map(function (a) {
          return self._cell(data[cls], 'PilotBaseProperty' + a.key + 'Add', 'PilotBaseProperty' + a.key + 'Multi');
        }).join('') +
      '</tr>';
    });
    return this._section('rd-pilot', 'Pilot R&amp;D', 'By pilot class.',
      this._table(['Class'].concat(RD_PILOT_ATTRS.map(function (a) { return a.label; })), rows));
  },

  _mechSection: function (data) {
    var self = this;
    var ss = function (cls) { return data['SS Quality (Prismatic) ' + cls] || {}; };
    var rows = RD_MECH_STATS.map(function (s) {
      return '<tr><td class="rd-row-label">' + s.label + '</td>' +
        RD_MECH_CLASSES.map(function (cls) { return self._cell(data[cls] || {}, s.add, s.multi); }).join('') +
        RD_MECH_CLASSES.map(function (cls) { return self._cell(ss(cls), s.add); }).join('') +
      '</tr>';
    });
    var head = ['Stat']
      .concat(RD_MECH_CLASSES.map(function (c) { return c.replace(' ST', ''); }))
      .concat(RD_MECH_CLASSES.map(function (c) { return c.replace(' ST', '') + ' <span class="rd-th-sub">SS Prismatic</span>'; }));
    return this._section('rd-mech', 'ST R&amp;D', 'By ST weight class. The SS Prismatic columns are the extra bonus for SS Quality (Prismatic) STs, on top of the base tree.',
      this._table(head, rows));
  },

  _weaponSection: function (data) {
    var self = this;
    var rows = RD_WEAPON_TYPES.filter(function (w) { return data[w[0]]; }).map(function (w) {
      var b = data[w[0]], t = w[1];
      return '<tr><td class="rd-row-label">' + w[2] + '</td>' +
        self._cell(b, t + 'AttackAdd') +
        self._cell(b, t + 'HitValueAdd') +
        self._cell(b, 'ActorWeaponCriticalAppendAdd') +
        self._cell(b, 'ShieldHPAdd') +
      '</tr>';
    });
    return this._section('rd-weapon', 'Weapon R&amp;D', 'By weapon type.',
      this._table(['Weapon', 'Attack', 'Hit', 'Crit', 'Shield HP'], rows));
  },

  render: function () {
    var d = window.RDTotalsData || {};
    var nav =
      '<div class="ac-nav">' +
        '<a class="ac-nav-item" href="#rd-pilot">Pilot</a>' +
        '<a class="ac-nav-item" href="#rd-mech">ST</a>' +
        '<a class="ac-nav-item" href="#rd-weapon">Weapon</a>' +
      '</div>';

    return (
      '<div id="rd-page">' +
        '<div class="listing-header"><h1>R&amp;D Bonus</h1></div>' +
        '<p class="ac-section-footnote rd-intro">Maximum bonuses from a fully researched R&amp;D tree. Flat values are added before percentage bonuses.</p>' +
        nav +
        this._pilotSection(d.pilot || {}) +
        this._mechSection(d.mech || {}) +
        this._weaponSection(d.weapon || {}) +
      '</div>'
    );
  },
};

window.Pages = Pages;
