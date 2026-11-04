var Pages = window.Pages || {};

// The Glossary page: a card for each reference page. Those pages keep
// their routes and set `nav` so the sidebar highlights this entry while they're open.
Pages.glossary = {
  title: 'Glossary',

  _pages: [
    { page: 'effects', name: 'Effects', icon: 'bi-shield-plus',
      desc: 'Every buff, debuff and other effect, and each pilot, ST, weapon, backpack and boss that carries it' },
    { page: 'exskills', name: 'EX Skills', icon: 'bi-lightning-charge',
      desc: 'The universal EX skills for each weapon type' },
  ],

  render: function () {
    return (
      '<div class="listing-header"><h1>Glossary</h1></div>' +
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
