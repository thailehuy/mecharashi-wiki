var Pages = window.Pages || {};

// The game's "GameMoney" unlock currency.
var FEATURE_MONEY = 'GameMoney';

Pages.features = {
  title: 'Features',

  _esc: function (s) { return $('<span>').text(s).html(); },

  _cost: function (cost) {
    return cost.map(function (c) {
      var item = c[1] === FEATURE_MONEY ? 'Credits' : c[1];
      return '<span class="feat-cost-item"><b>' + c[0].toLocaleString('en-US') + '</b> ' + this._esc(item) + '</span>';
    }, this).join('');
  },

  _row: function (f) {
    var esc  = this._esc;
    var tags = (f.for === 'any' ? '<span class="tag">Any ST</span>' : '') +
      (f.basic ? '<span class="tag" title="' + esc(f.rule) + '">Basic</span>' : '');
    return (
      '<tr>' +
        '<td class="feat-name">' +
          (f.icon ? '<img class="feat-icon" src="' + ASSET_BASE + f.icon + '" alt="" loading="lazy" />' : '') +
          '<span>' + esc(f.name) + (tags ? '<span class="feat-tags">' + tags + '</span>' : '') + '</span>' +
        '</td>' +
        '<td class="feat-port">' + (f.slots.length === 3 ? 'Any' : f.slots[0]) + '</td>' +
        '<td class="feat-effect">' + Glossary.parseEffects(f.effect) + '</td>' +
        '<td class="feat-cost">' + this._cost(f.cost) + '</td>' +
      '</tr>'
    );
  },

  _group: function (id, title, features) {
    return (
      '<div class="boss-group feat-group" id="' + id + '">' +
        '<div class="boss-group-head"><h3>' + this._esc(title) + '</h3>' +
          '<span class="boss-group-sub">' + features.length + ' features</span></div>' +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table feat-table">' +
            '<thead><tr><th>Feature</th><th>Port</th><th>Effect</th><th>Unlock cost</th></tr></thead>' +
            '<tbody>' + features.map(this._row, this).join('') + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  },

  // One section per port type, one group per class / R&D tree, with a jump bar.
  _section: function (key, title, note, groups, label) {
    var self = this;
    var names = Object.keys(groups || {});
    var gid = function (n) { return 'feat-' + key + '-' + n.toLowerCase(); };
    return (
      '<h2 class="boss-section" id="feat-' + key + '">' + title + '</h2>' +
      '<p class="ac-section-footnote feat-note">' + note + '</p>' +
      '<div class="ac-nav">' + names.map(function (n) {
        return '<a class="ac-nav-item" href="#' + gid(n) + '">' + self._esc(label(n)) + '</a>';
      }).join('') + '</div>' +
      names.map(function (n) { return self._group(gid(n), label(n), groups[n]); }).join('')
    );
  },

  render: function () {
    var d = window.FeaturesData || {};
    var same = function (n) { return n; };
    return (
      '<div class="listing-header"><h1>Features</h1></div>' +
      '<p class="dispatch-intro">Every R&amp;D feature, unlocked from the R&amp;D trees and equipped in the ST loadout\'s feature ports: ' +
        'three for the pilot, three for the ST and three for the weapons. <b>Port</b> is the feature port it fits (I, II or III). ' +
        'Only one <b>Basic</b> feature of the same type can be equipped at a time.</p>' +
      '<div class="boss-jump"><a href="#feat-pilot">Pilot</a><a href="#feat-st">ST</a><a href="#feat-weapon">Weapon</a></div>' +
      this._section('pilot', 'Pilot Features', 'By pilot class. A pilot can only equip their own class\'s features.', d.pilot, same) +
      this._section('st', 'ST Features', 'By ST weight class. Features marked <b>Any ST</b> are unlocked in that class\'s tree but fit every ST.', d.st,
        function (n) { return n + ' ST'; }) +
      this._section('weapon', 'Weapon Features', 'By the weapon R&amp;D tree that unlocks them. Any weapon feature port can take any of them.', d.weapon,
        function (n) { return n + ' Weapons'; })
    );
  },
};

window.Pages = Pages;
