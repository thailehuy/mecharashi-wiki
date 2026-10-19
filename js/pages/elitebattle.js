var Pages = window.Pages || {};

// The Elite Battle page: every chapter's stages with their win/defeat and star
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

  _chapter: function (c, kit) {
    var self = this;
    return (
      '<details class="story-chapter" id="elite-ch-' + c.id + '">' +
        '<summary class="boss-group-head"><h3>' + c.id + '. ' + this._esc(c.name) + '</h3>' +
          '<span class="story-chapter-sub">' + c.stages.length + ' stages · ' +
            this._esc(c.stages[0].code) + ' to ' + this._esc(c.stages[c.stages.length - 1].code) + '</span></summary>' +
        (c.starRewards.length ? '<div class="skill-card elite-star-rewards"><div class="story-part-title">Star rewards</div>' +
          c.starRewards.map(function (s) {
            return self._rewards(s.stars + ' <i class="bi bi-star-fill"></i>', s.rewards, kit);
          }).join('') + '</div>' : '') +
        '<div class="story-stages">' + c.stages.map(function (st) { return self._stage(st, kit); }).join('') + '</div>' +
      '</details>'
    );
  },

  _content: function (d) {
    var self = this;
    var kit = Pages.story._kit();
    return d.chapters.map(function (c) { return self._chapter(c, kit); }).join('');
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

  render: function () {
    var self = this;
    var body = window.EliteData ? this._content(window.EliteData) : '<div class="lore-loading">Loading…</div>';
    if (!window.EliteData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('elite-root');
        if (root) root.innerHTML = self._content(window.EliteData);
      }, function () {
        var root = document.getElementById('elite-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Elite Battle. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Elite Battle</h1></div>' +
      '<p class="dispatch-intro">Every Elite Battle chapter, with each stage\'s victory and defeat conditions, ' +
        'the three conditions that each earn a star, its achievements and what each one gives, and its clear rewards. ' +
        'Collecting 6, 12 and 18 stars across a chapter\'s stages earns its star rewards. Open a chapter to see its stages.</p>' +
      '<div id="elite-root">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
