var Pages = window.Pages || {};

// The Expansion Ops page: the game's menu of side modes (拓展委托), a card for
// each one's own page. Those pages keep their routes and set `nav` so the
// sidebar highlights this entry while they're open.
Pages.expansionops = {
  title: 'Expansion Ops',

  _modes: [
    { page: 'elitebattle', name: 'Elite Battle', icon: 'bi-star',
      desc: 'Every chapter\'s stages with their victory, defeat and star conditions, achievements and rewards' },
    { page: 'simulatedbattle', name: 'Simulated Battle', icon: 'bi-joystick',
      desc: 'Every stage\'s modifiers, win conditions, chip algorithm unlocks and rewards' },
    { page: 'memorystorm', name: 'Memory Storm', icon: 'bi-tornado',
      desc: 'Clear drops by score tier, and every season\'s ST part pool with its SSR STs' },
    { page: 'frontiertrial', name: 'Frontier Trial', icon: 'bi-shield-shaded',
      desc: 'Every stage\'s grade conditions, and its first-clear and repeat rewards per formation type' },
  ],

  render: function () {
    return (
      '<div class="listing-header"><h1>Expansion Ops</h1></div>' +
      '<div class="home-nav-cards">' + this._modes.map(function (m) {
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
