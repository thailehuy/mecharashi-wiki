var Pages = window.Pages || {};

var SHOP_LABEL = { arena: 'Arena Shop', border: 'Border FTZ' };

// Strips markup (<color=..>, <buf ID=..>[Name]</buf>, etc.) down to plain
// text for use in a hover title attribute, where HTML tags render literally.
function shopPlainText(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

Pages.shops = {
  title: 'Shops',

  render: function () {
    var self = this;
    var rotations = (window.ShopsData || {}).rotations || [];
    var note = (window.ShopsData || {}).note || '';

    var order = ['arena', 'border'];
    var sectionsHtml = order.map(function (shopKey) {
      return self._renderSection(shopKey, rotations.filter(function (r) { return r.shop === shopKey; }));
    }).join('');

    return (
      '<div class="listing-header"><h1>Shops</h1></div>' +
      '<p class="dispatch-intro">' + $('<span>').text(note).html() + '</p>' +
      self._renderCrisisSection((window.ShopsData || {}).crisis || [], (window.ShopsData || {}).crisisItems || []) +
      sectionsHtml
    );
  },

  _renderCrisisSection: function (entries, items) {
    var self = this;
    var esc = function (s) { return $('<span>').text(s).html(); };
    var num = function (n) { return n.toLocaleString('en-US'); };

    var itemRows = items.map(function (it) {
      return (
        '<tr>' +
          '<td class="shop-mods-cell">' +
            '<span class="shop-mod-chip">' +
              '<img class="shop-mod-chip-icon" src="' + ASSET_BASE + 'data/items/' + encodeURIComponent(it.icon) + '.png" onerror="this.style.visibility=\'hidden\'" alt="" loading="lazy" />' +
              '<span class="shop-mod-chip-name">' + esc(it.name) + (it.count > 1 ? ' ×' + num(it.count) : '') + '</span>' +
            '</span>' +
          '</td>' +
          '<td>' + num(it.price) + '</td>' +
          '<td>' + it.global + '</td>' +
          '<td>' + it.cn + '</td>' +
        '</tr>'
      );
    }).join('');

    var bodyRows = entries.map(function (e) {
      return (
        '<tr>' +
          '<td class="shop-version-cell">v' + $('<span>').text(e.version).html() + '</td>' +
          '<td><div class="shop-pilot-list">' + e.pilots.map(function (n) { return self._pilotCellHtml(n); }).join('') + '</div></td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="ac-section" id="nostalgic-challenge-store">' +
        '<h2 class="ac-section-title shop-section-title">Nostalgic Challenge Store</h2>' +
        '<p class="dispatch-intro">Refactor-in-Crisis\'s own store, paid in Reconstruction Logs. ' +
          'Each version adds a RiC Pilot Conscription Order (3,000 Logs) that lets you pick 1 of its 2 pilots.</p>' +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table">' +
            '<thead><tr>' +
              '<th>Version</th>' +
              '<th>Pilots</th>' +
            '</tr></thead>' +
            '<tbody>' + bodyRows + '</tbody>' +
          '</table>' +
        '</div>' +
        '<p class="dispatch-intro">Other items. Purchase limits never reset, but each new season raises them by the same amount, ' +
          'so CN (7 seasons) allows more than Global (2 seasons).</p>' +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table">' +
            '<thead><tr>' +
              '<th>Item</th>' +
              '<th>Price (Logs)</th>' +
              '<th>Limit (Global)</th>' +
              '<th>Limit (CN)</th>' +
            '</tr></thead>' +
            '<tbody>' + itemRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  },

  _pilotCellHtml: function (name) {
    var pilot = ((window.PilotsData || {}).pilots || []).find(function (p) { return p.PilotName === name; });
    var nameEsc = $('<span>').text(name).html();

    if (!pilot) {
      return (
        '<div class="dispatch-cell dispatch-cell-unreleased">' +
          '<span class="dispatch-cell-icon dispatch-cell-icon-empty"></span>' +
          '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
        '</div>'
      );
    }

    var rankClass = QUALITY_CLASS[pilot.quality] || '';
    var bgSrc = QUALITY_BG[pilot.quality] || '';
    return (
      '<a class="dispatch-cell" href="' + App.href('pilots', pilot.PilotName) + '">' +
        '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
          '<img src="' + pilotAvatarSrc(pilot) + '"' + pilotAvatarErrorAttr(pilot) + ' alt="' + nameEsc + '" loading="lazy" />' +
        '</span>' +
        '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
      '</a>'
    );
  },

  _renderSection: function (shopKey, rotations) {
    var self = this;

    var bodyRows = rotations.map(function (r) {
      return (
        '<tr>' +
          '<td class="shop-version-cell">' + (r.version ? 'v' + $('<span>').text(r.version).html() : '—') + '</td>' +
          '<td>' + self._stCellHtml(r.st) + '</td>' +
          '<td class="shop-mods-cell">' + self._modListHtml(r.lv8) + '</td>' +
          '<td class="shop-mods-cell">' + self._modListHtml(r.lv4) + '</td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="ac-section" id="' + shopKey + '-shop">' +
        '<h2 class="ac-section-title shop-section-title">' + SHOP_LABEL[shopKey] + '</h2>' +
        (shopKey === 'border' ? '<p class="dispatch-intro">Shared with Covert Phantom, Border Conflict\'s upgraded roguelike mode.</p>' : '') +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table">' +
            '<thead><tr>' +
              '<th>Version</th>' +
              '<th>ST</th>' +
              '<th>Lv 8/8 Mods</th>' +
              '<th>Lv 4/4 Mods</th>' +
            '</tr></thead>' +
            '<tbody>' + bodyRows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  },

  _stCellHtml: function (name) {
    var mech = ((window.MechsData || {}).mechs || []).find(function (m) { return m.name === name; });
    var nameEsc = $('<span>').text(name).html();

    if (!mech) {
      return (
        '<div class="dispatch-cell dispatch-cell-unreleased">' +
          '<span class="dispatch-cell-icon dispatch-cell-icon-empty"></span>' +
          '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
        '</div>'
      );
    }

    var iconSrc = mechIconSrc(mech);
    var bgSrc = MECH_QUALITY_BG[mech.quality] || '';
    var rankClass = MECH_QUALITY_CLASS[mech.quality] || '';
    return (
      '<a class="dispatch-cell" href="' + App.href('sts', mech.name) + '">' +
        '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
          '<img src="' + iconSrc + '"' + mechIconErrorAttr(mech) + ' alt="' + nameEsc + '" loading="lazy" />' +
        '</span>' +
        '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
      '</a>'
    );
  },

  _modListHtml: function (names) {
    var self = this;
    return '<div class="shop-mod-list">' + names.map(function (n) { return self._modChipHtml(n); }).join('') + '</div>';
  },

  _modChipHtml: function (name) {
    var modules = ((window.ModulesData || {}).modules || {});
    var family = Object.keys(modules).find(function (fam) { return modules[fam].name === name; });
    var nameEsc = $('<span>').text(name).html();

    var icon = null;
    var titleText = '';

    if (family) {
      var mod = modules[family];
      icon = mod.icon;
      titleText = shopPlainText(mod.levels[String(mod.maxLevel)] || '');
    }

    var iconHtml = icon
      ? '<img class="shop-mod-chip-icon" src="' + moduleIconSrc(icon) + '"' + moduleIconErrorAttr(icon) + ' alt="" />'
      : '<span class="shop-mod-chip-icon shop-mod-chip-icon-empty"></span>';

    if (family) {
      return (
        '<a class="shop-mod-chip" href="' + App.href('modules', name.toLowerCase()) + '" title="' + $('<span>').text(titleText).html() + '">' +
          iconHtml +
          '<span class="shop-mod-chip-name">' + nameEsc + '</span>' +
        '</a>'
      );
    }

    return (
      '<span class="shop-mod-chip shop-mod-chip-static" title="' + $('<span>').text(titleText).html() + '">' +
        iconHtml +
        '<span class="shop-mod-chip-name">' + nameEsc + '</span>' +
      '</span>'
    );
  },

  destroy: function () {},
};

window.Pages = Pages;
