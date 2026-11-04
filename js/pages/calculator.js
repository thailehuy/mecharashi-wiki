var Pages = window.Pages || {};

// The Calculator page: a card for each calculator. Builder keeps its route and
// sets `nav`; DMG Calc is a standalone page, and the Dispatch Calculator stays a
// tab of the Dispatch page (its card opens that tab).
Pages.calculator = {
  title: 'Calculator',

  _pages: [
    { href: 'builder/', name: 'Builder', icon: 'bi-tools',
      desc: 'Theorycraft an ST loadout (pilot, skills, weapons, backpack and modules) and share it as a link' },
    { href: 'dmgcalc/', name: 'DMG Calc (Beta)', icon: 'bi-calculator',
      desc: 'Compare two setups’ damage per attack and attacks to kill against a boss' },
    { href: 'dispatch/#calculator', name: 'Dispatch Calculator', icon: 'bi-calendar3',
      desc: 'The day your next dispatch ST completes (on the Dispatch page)' },
  ],

  render: function () {
    return (
      '<div class="listing-header"><h1>Calculator</h1></div>' +
      '<div class="home-nav-cards">' + this._pages.map(function (m) {
        return (
          '<a href="' + m.href + '" class="home-card">' +
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
