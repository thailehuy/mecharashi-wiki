var Pages = window.Pages || {};

var DISPATCH_GROUPS = ['Arsenal', 'InnovativE', 'GeekX', 'Sparkplug'];

// data/dispatch.json spells some names with nicer spacing/casing than the
// mech's actual site name (scraped/translated separately) — map the
// dispatch label to the real MechsData name so the link/icon still resolve.
var DISPATCH_NAME_ALIASES = {
  'Shadow Rabbit': 'Shadowrabbit',
  'Snowy Owl':     'Snowyowl',
  'Illusioner':    'Illusion',
  'Nemesis':       'Erinys',
};

// Two tabs: the patch × group table of dispatch STs, and the Dispatch
// Calculator (js/pages/dispatchcalc.js).
Pages.dispatch = {
  title: 'Dispatch',

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
      var iconSrc  = mechIconSrc(m);
      var bgSrc    = MECH_QUALITY_BG[m.quality] || '';
      var rankClass = MECH_QUALITY_CLASS[m.quality] || '';
      return (
        '<a class="dispatch-cell" href="' + App.href('sts', m.name) + '">' +
          '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
            '<img src="' + iconSrc + '"' + mechIconErrorAttr(m) + ' alt="' + nameEsc + '" loading="lazy" />' +
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

    var table = (
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

    return (
      '<div class="listing-header"><h1>Dispatch</h1></div>' +
      '<div class="dispatch-tabs">' +
        Lore.tabsHtml([
          ['table', 'Dispatch Table', table],
          ['calculator', 'Dispatch Calculator', DispatchCalc.render()],
        ]) +
      '</div>'
    );
  },

  destroy: function () {
    DispatchCalc.destroy();
  },
};

window.Pages = Pages;
