var Pages = window.Pages || {};

var SHOP_LABEL = { arena: 'Arena Shop', border: 'Border Conflict Shop' };

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
      sectionsHtml
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
      '<div class="ac-section">' +
        '<h2 class="ac-section-title">' + SHOP_LABEL[shopKey] + '</h2>' +
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

    var iconSrc = MECH_AVATAR_BASE + encodeURIComponent(mech.icon) + '.png';
    var bgSrc = MECH_QUALITY_BG[mech.quality] || '';
    var rankClass = MECH_QUALITY_CLASS[mech.quality] || '';
    return (
      '<a class="dispatch-cell" href="#sts/' + encodeURIComponent(mech.name) + '">' +
        '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
          '<img src="' + iconSrc + '" alt="' + nameEsc + '" loading="lazy" />' +
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
    var aliases = (window.ShopsData || {}).modAliases || {};
    var lookupName = aliases[name] || name;
    var family = Object.keys(modules).find(function (fam) { return modules[fam].name === lookupName; });
    var nameEsc = $('<span>').text(name).html();

    var icon = null;
    var titleText = '';

    if (family) {
      var mod = modules[family];
      icon = mod.icon;
      titleText = shopPlainText(mod.levels[String(mod.maxLevel)] || '');
    }

    var iconHtml = icon
      ? '<img class="shop-mod-chip-icon" src="' + MODULE_ICON_BASE + encodeURIComponent(icon) + '.png" alt="" />'
      : '<span class="shop-mod-chip-icon shop-mod-chip-icon-empty"></span>';

    if (family) {
      return (
        '<a class="shop-mod-chip" href="#modules/' + encodeURIComponent(lookupName.toLowerCase()) + '" title="' + $('<span>').text(titleText).html() + '">' +
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
