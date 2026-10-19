var Pages = window.Pages || {};

// The Simulated Battle page: every chapter's stages with their modifiers,
// victory/defeat conditions (each battle's, for a Chain Sim), the chip algorithm
// a first clear unlocks and the clear rewards. Its data (data/sim/sim.js, built
// by scripts/build_sim.py) is fetched the first time the page opens; reward
// chips are drawn as on the Story page.
Pages.simulatedbattle = {
  title: 'Simulated Battle',
  _loading: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  _sides: { enemies: 'Enemies', allies: 'Your team', both: 'Both sides' },

  _modifier: function (m) {
    var tags = (m.battle ? '<span class="tag">Battle ' + m.battle + '</span>' : '') +
      (m.side ? '<span class="tag sim-side-' + m.side + '">' + this._sides[m.side] + '</span>' : '');
    return (
      '<li class="sim-mod">' +
        '<img class="boss-skill-icon" src="' + ASSET_BASE + 'data/unlisted/pilot_skills/' + encodeURIComponent(m.icon) + '.png" onerror="this.remove()" alt="" loading="lazy" />' +
        '<div><div class="sim-mod-head"><b>' + this._esc(m.name) + '</b>' + tags + '</div>' +
          '<div class="sim-mod-text">' + Glossary.parseEffects(m.text) + '</div></div>' +
      '</li>'
    );
  },

  _conds: function (b, label) {
    return (
      (label ? '<dt class="sim-battle">' + label + '</dt>' : '') +
      '<dt class="elite-win">Victory</dt><dd>' + this._esc(b.win) + '</dd>' +
      '<dt class="elite-lose">Defeat</dt><dd>' + this._esc(b.lose) + '</dd>'
    );
  },

  _stage: function (st, kit) {
    var self = this;
    var chain = st.battles.length > 1;
    var u = st.unlocks;
    return (
      '<div class="story-stage skill-card elite-stage" id="sim-' + this._esc(st.code) + '">' +
        '<div class="story-stage-head"><span class="story-stage-code">' + this._esc(st.code) + '</span>' +
          '<span class="story-stage-name">' + this._esc(st.name) + '</span>' +
          '<span class="story-stage-meta"><i class="bi bi-lightning-charge"></i>' + st.energy + ' energy' +
            (chain ? ' · ' + st.battles.length + ' battles in a row' : '') + '</span>' +
        '</div>' +
        (st.modifiers.length ? '<div class="story-part-title">Modifiers</div><ul class="sim-mods">' +
          st.modifiers.map(function (m) { return self._modifier(m); }).join('') + '</ul>' : '') +
        '<dl class="elite-conds">' + st.battles.map(function (b, i) {
          return self._conds(b, chain ? 'Battle ' + (i + 1) + ' (' + b.energy + ' energy)' : null);
        }).join('') + '</dl>' +
        (u ? '<div class="sim-unlock"><i class="bi bi-unlock"></i>First clear unlocks the <b>' + this._esc(u.algorithm) +
          ' Chip Algorithm</b> at power ' + u.power + ' for <span class="boss-drop-q boss-drop-q-' + u.quality.toLowerCase() + '">' +
          this._esc(u.quality) + '</span> chips</div>' : '') +
        (st.rewards.length ? Pages.elitebattle._rewards('Clear rewards', st.rewards, kit) : '') +
      '</div>'
    );
  },

  _chapter: function (c, kit) {
    var self = this;
    return (
      '<details class="story-chapter" id="sim-ch-' + c.id + '">' +
        '<summary class="boss-group-head"><h3>Simulated Battle ' + c.id + '</h3>' +
          '<span class="story-chapter-sub">' + c.stages.length + ' stages · ' +
            this._esc(c.stages[0].code) + ' to ' + this._esc(c.stages[c.stages.length - 1].code) +
            (c.algorithm ? ' · ' + this._esc(c.algorithm) + ' Chip Algorithm' : '') + '</span></summary>' +
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
    if (window.SimData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/sim/sim.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    var body = window.SimData ? this._content(window.SimData) : '<div class="lore-loading">Loading…</div>';
    if (!window.SimData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('sim-root');
        if (root) root.innerHTML = self._content(window.SimData);
      }, function () {
        var root = document.getElementById('sim-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Simulated Battle. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Simulated Battle</h1></div>' +
      '<p class="dispatch-intro">Every Simulated Battle chapter, with each stage\'s modifiers (and who they affect), ' +
        'its victory and defeat conditions and its clear rewards. A Chain Sim fights its battles one after another. ' +
        'Some stages\' first clear unlocks a chip algorithm (α, β, γ, γ+) at a higher power; ' +
        'the chips an algorithm gives are decided by the server, so they aren\'t listed. Open a chapter to see its stages.</p>' +
      '<div id="sim-root">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
