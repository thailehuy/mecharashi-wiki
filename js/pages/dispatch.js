var Pages = window.Pages || {};

var DISPATCH_GROUPS = ['Arsenal', 'InnovativE', 'GeekX', 'Sparkplug'];

// data/dispatch.json spells some names with nicer spacing/casing than the
// mech's actual site name (scraped/translated separately) — map the
// dispatch label to the real MechsData name so the link/icon still resolve.
var DISPATCH_NAME_ALIASES = {
  'Shadow Rabbit': 'Shadowrabbit',
  'Eye of Faith':  'Eye Of Faith',
  'Snowy Owl':     'Snowyowl',
  'Illusioner':    'Illusion',
  'Nemesis':       'Erinys',
};

Pages.dispatch = {
  title: 'Dispatch Table',

  render: function () {
    var rows  = (window.DispatchData || {}).dispatch || [];
    var mechs = (window.MechsData || {}).mechs || [];

    var mechByName = {};
    mechs.forEach(function (m) { mechByName[m.name] = m; });

    function cellHtml(name) {
      var m = mechByName[DISPATCH_NAME_ALIASES[name] || name];
      var nameEsc = $('<span>').text(name).html();
      if (!m) {
        return (
          '<div class="dispatch-cell dispatch-cell-unreleased">' +
            '<span class="dispatch-cell-icon dispatch-cell-icon-empty"></span>' +
            '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
          '</div>'
        );
      }
      var iconSrc  = MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png';
      var bgSrc    = MECH_QUALITY_BG[m.quality] || '';
      var rankClass = MECH_QUALITY_CLASS[m.quality] || '';
      return (
        '<a class="dispatch-cell" href="#sts/' + encodeURIComponent(m.name) + '">' +
          '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
            '<img src="' + iconSrc + '" alt="' + nameEsc + '" loading="lazy" />' +
          '</span>' +
          '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
        '</a>'
      );
    }

    var bodyRows = rows.map(function (row) {
      return (
        '<tr>' +
          '<td class="dispatch-version-cell">v' + $('<span>').text(row.cnPatch).html() + '</td>' +
          DISPATCH_GROUPS.map(function (g) {
            return '<td>' + cellHtml(row[g]) + '</td>';
          }).join('') +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="listing-header"><h1>Dispatch Table</h1></div>' +
      '<p class="dispatch-intro">All mechs deployed via Dispatch, grouped by patch version and dispatch group.</p>' +
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table">' +
          '<thead>' +
            '<tr>' +
              '<th>Version</th>' +
              DISPATCH_GROUPS.map(function (g) { return '<th>' + g + '</th>'; }).join('') +
            '</tr>' +
          '</thead>' +
          '<tbody>' + bodyRows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  destroy: function () {},
};

window.Pages = Pages;
