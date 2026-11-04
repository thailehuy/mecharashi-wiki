var Pages = window.Pages || {};

// The Upgrades page: a card for each stats and R&D page. Those pages keep
// their routes and set `nav` so the sidebar highlights this entry while they're open.
Pages.upgrades = {
  title: 'Upgrades',

  _pages: [
    { page: 'ststats', name: 'ST Stats Table', icon: 'bi-table',
      desc: 'Sortable comparison of firepower, HP and weight for every S-rank ST' },
    { page: 'pilotstats', name: 'Pilot Stats Table', icon: 'bi-person-lines-fill',
      desc: 'Sortable comparison of combat stats for every pilot' },
    { page: 'rdbonus', name: 'R&amp;D Bonus', icon: 'bi-graph-up-arrow',
      desc: 'Maximum R&amp;D bonuses for pilots, STs and weapons from a fully researched tree' },
    { page: 'features', name: 'Features', icon: 'bi-diagram-3',
      desc: 'Every R&amp;D feature for pilots, STs and weapons, by class and R&amp;D tree' },
  ],

  render: function () {
    return (
      '<div class="listing-header"><h1>Upgrades</h1></div>' +
      '<div class="home-nav-cards">' + this._pages.map(function (m) {
        return (
          '<a href="' + App.href(m.page) + '" class="home-card">' +
            '<div class="home-card-title"><i class="bi ' + m.icon + '"></i> ' + m.name + '</div>' +
            '<div class="home-card-desc">' + m.desc + '</div>' +
          '</a>'
        );
      }).join('') + '</div>'
    );
  },

  destroy: function () {}
};

window.Pages = Pages;
