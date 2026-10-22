var Pages = window.Pages || {};

// The Elite Battle page: every chapter as its picture (cards as on the Story page),
// each opening its own page (elitebattle/<slug>/) with its stages' win/defeat and star
// conditions, achievements and rewards, and the chapter's star rewards. Its data
// (data/elite/elite.js, built by scripts/build_elite.py) is fetched the first
// time the page opens; reward chips are drawn as on the Story page.
Pages.elitebattle = {
  title: 'Elite Battle',
  _loading: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  // Skill names in [brackets] are the stage's enemies' skills, highlighted as on the boss pages.
  _text: function (s) {
    return this._esc(s).replace(/\[([^\[\]]+)\]/g, '<span class="boss-term">[$1]</span>');
  },

  _rewards: function (label, rewards, kit) {
    var story = Pages.story;
    return '<div class="boss-drop-list story-rewards"><span class="boss-gear-label">' + label + '</span>' +
      rewards.map(function (r) { return story._reward(r, kit); }).join('') + '</div>';
  },

  _stage: function (st, kit) {
    var self = this;
    return (
      '<div class="story-stage skill-card elite-stage" id="elite-' + this._esc(st.code) + '">' +
        '<div class="story-stage-head"><span class="story-stage-code">' + this._esc(st.code) + '</span>' +
          '<span class="story-stage-name">' + this._esc(st.name) + '</span>' +
          '<span class="story-stage-meta"><i class="bi bi-lightning-charge"></i>' + st.energy + ' energy · ' + st.daily + ' runs a day</span>' +
        '</div>' +
        '<dl class="elite-conds">' +
          '<dt class="elite-win">Victory</dt><dd>' + this._text(st.win) + '</dd>' +
          '<dt class="elite-lose">Defeat</dt><dd>' + this._text(st.lose) + '</dd>' +
          (st.stars ? '<dt class="elite-star">Stars</dt><dd><ol class="elite-stars">' + st.stars.map(function (s) {
            return '<li><i class="bi bi-star-fill"></i>' + self._text(s) + '</li>';
          }).join('') + '</ol></dd>' : '') +
        '</dl>' +
        (st.achievements.length ? '<div class="story-part-title">Achievements</div><ul class="elite-achs">' + st.achievements.map(function (a) {
          return (
            '<li><div><b>' + self._esc(a.name) + '</b> <span class="elite-ach-text">' + self._text(a.text) + '</span></div>' +
              (a.rewards.length ? self._rewards('Reward', a.rewards, kit) : '') + '</li>'
          );
        }).join('') + '</ul>' : '') +
        (st.rewards.length ? this._rewards('Clear rewards', st.rewards, kit) : '') +
      '</div>'
    );
  },

  // A chapter's picture (scripts/extract_story_images.py).
  _img: function (c) {
    return c.image ? ASSET_BASE + 'data/elite/' + encodeURIComponent(c.image) + '.jpg' : null;
  },

  _title: function (c) { return c.id + '. ' + this._esc(c.name); },

  _range: function (c) {
    return c.stages.length + ' stages · ' + this._esc(c.stages[0].code) + ' to ' + this._esc(c.stages[c.stages.length - 1].code);
  },

  // ── Listing: a card per chapter, as on the Story page ───────────────────
  _list: function (d) {
    var self = this;
    return '<div class="event-grid">' + d.chapters.map(function (c) {
      return Pages.story._card(App.href('elitebattle', c.slug), self._img(c), null, self._title(c), self._range(c));
    }).join('') + '</div>';
  },

  // ── A chapter's own page (elitebattle/<slug>/) ──────────────────────────
  _chapter: function (c, d) {
    var self = this;
    var kit = Pages.story._kit();
    var i = d.chapters.indexOf(c);
    var nav = function (x, label) {
      return x ? '<a class="story-nav-link" href="' + App.href('elitebattle', x.slug) + '">' + label + '</a>' : '<span></span>';
    };
    var img = this._img(c);
    return (
      '<a href="' + App.href('elitebattle') + '" class="btn-back">&#8592; Back to Elite Battle</a>' +
      '<div class="listing-header"><h1>' + this._title(c) + '</h1></div>' +
      (img ? '<img class="event-hero story-hero" src="' + img + '" alt="" />' : '') +
      '<p class="dispatch-intro">' + this._range(c) + '. Each stage\'s victory and defeat conditions, the three conditions that ' +
        'each earn a star, its achievements and clear rewards; 6, 12 and 18 stars across the chapter earn its star rewards.</p>' +
      (c.starRewards.length ? '<div class="skill-card elite-star-rewards"><div class="story-part-title">Star rewards</div>' +
        c.starRewards.map(function (s) {
          return self._rewards(s.stars + ' <i class="bi bi-star-fill"></i>', s.rewards, kit);
        }).join('') + '</div>' : '') +
      '<div class="story-stages">' + c.stages.map(function (st) { return self._stage(st, kit); }).join('') + '</div>' +
      '<div class="story-nav">' + nav(d.chapters[i - 1], '&#8592; ' + (d.chapters[i - 1] ? this._title(d.chapters[i - 1]) : '')) +
        nav(d.chapters[i + 1], (d.chapters[i + 1] ? this._title(d.chapters[i + 1]) : '') + ' &#8594;') + '</div>'
    );
  },

  // The chapter cards, or with a slug that chapter's own page.
  _content: function (d, slug) {
    if (!slug) return this._list(d);
    var c = d.chapters.find(function (x) { return x.slug === slug; });
    return c ? this._chapter(c, d) : '<p class="text-danger">Chapter not found.</p>';
  },

  _load: function () {
    var self = this;
    if (window.EliteData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/elite/elite.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  // param: a chapter's slug (its own page).
  render: function (param) {
    var self = this;
    var slug = param ? decodeURIComponent(param) : null;
    var body = window.EliteData ? this._content(window.EliteData, slug) : '<div class="lore-loading">Loading…</div>';
    if (!window.EliteData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('elite-root');
        if (root && root.getAttribute('data-slug') === (slug || '')) root.innerHTML = self._content(window.EliteData, slug);
      }, function () {
        var root = document.getElementById('elite-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Elite Battle. Try again later.</p>';
      });
    }
    return (
      (slug ? '' : '<div class="listing-header"><h1>Elite Battle</h1></div>' +
        '<p class="dispatch-intro">Every Elite Battle chapter, with each stage\'s victory and defeat conditions, ' +
          'the three conditions that each earn a star, its achievements and what each one gives, and its clear rewards. ' +
          'Collecting 6, 12 and 18 stars across a chapter\'s stages earns its star rewards. Open a chapter to see its stages.</p>') +
      '<div id="elite-root" data-slug="' + this._esc(slug || '') + '">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
