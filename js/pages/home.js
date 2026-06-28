var Pages = window.Pages || {};

Pages.home = {
  title: 'Home',

  render: function () {
    return (
      '<div class="home-page">' +
        '<div class="home-hero">' +
          '<h1 class="home-title">Mecharashi Wiki</h1>' +
          '<p class="home-subtitle">An unofficial community reference for Mecharashi</p>' +
        '</div>' +
        '<div class="home-nav-cards">' +
          '<a href="#pilots" class="home-card">' +
            '<div class="home-card-title">Pilots</div>' +
            '<div class="home-card-desc">Browse all pilots, skills, and neural drive data</div>' +
          '</a>' +
          '<a href="#sts" class="home-card">' +
            '<div class="home-card-title">STs</div>' +
            '<div class="home-card-desc">Browse all STs, modules, and part stats</div>' +
          '</a>' +
        '</div>' +
        '<div class="home-qa">' +
          '<h2 class="home-disclaimer-title">Q&amp;A</h2>' +
          '<div class="qa-item">' +
            '<div class="qa-q">Why do you make this page?</div>' +
            '<div class="qa-a">For the love of the game and because there\'s no English wiki available. I\'m tired of using Google Translate.</div>' +
          '</div>' +
          '<div class="qa-item">' +
            '<div class="qa-q">What did it cost?</div>' +
            '<div class="qa-a">Everything. The domain cost $4 and the content cost a lot of my effort.</div>' +
          '</div>' +
          '<div class="qa-item">' +
            '<div class="qa-q">Would you ask for donation?</div>' +
            '<div class="qa-a">No, I can afford $4 a year for the domain. However I would not say no if you want to buy me some in-game credits. My game ID is <strong>1690463529181331214</strong>.</div>' +
          '</div>' +
          '<div class="qa-item">' +
            '<div class="qa-q">How frequently does this page get updated?</div>' +
            '<div class="qa-a">Any pilot/ST not released on Global will need to be translated word by word from CN by me, so it would not be quick. At maximum I can update 2&ndash;4 pilots/STs per week.</div>' +
          '</div>' +
        '</div>' +
        '<div class="home-disclaimer">' +
          '<h2 class="home-disclaimer-title">Disclaimer</h2>' +
          '<p>This site is an unofficial, fan‑made wiki and is not affiliated with, endorsed by, or sponsored by the official rights holders. It is created for informational and educational purposes only, and no copyright infringement is intended.</p>' +
          '<p>All game content, images, names, and data featured on this site are the intellectual property of <strong>Tentree Games</strong> and <strong>BlackJack Studio</strong>. All rights reserved.</p>' +
          '<p>This site is not intended for commercial use. No revenue is generated from this project.</p>' +
        '</div>' +
      '</div>'
    );
  },

  destroy: function () {}
};
