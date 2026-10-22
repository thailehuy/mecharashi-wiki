var Pages = window.Pages || {};

// The Frontier Trial page (an Expansion Ops mode, the game's "Scoring" levels):
// every stage's two phases, the condition for each grade and what a first
// clear and a repeat run give at that grade. A repeat run's rewards depend on
// the team's formation type, picked with a floating toggle on the right. Its
// data (data/frontier/frontier.js, built by scripts/build_frontier.py) is
// fetched the first time the page opens; reward chips are drawn as on the
// Story page.
Pages.frontiertrial = {
  title: 'Frontier Trial',
  nav: 'expansionops',
  _loading: null,
  _formation: 'light',

  _formations: [['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy'], ['mixed', 'Mixed']],

  _esc: function (s) { return $('<span>').text(s).html(); },

  _chips: function (rewards, kit) {
    var story = Pages.story;
    return '<div class="boss-drop-list story-rewards">' +
      rewards.map(function (r) { return story._reward(r, kit); }).join('') + '</div>';
  },

  _unlock: function (u) {
    var parts = [];
    if (u.permit) parts.push(this._esc(u.permit));
    if (u.stage) {
      parts.push('<a href="' + App.href('story', u.stage.slug) + '">' + this._esc(u.stage.chapter) + '</a> ' +
        (u.stage.code ? this._esc(u.stage.code) + ' ' : '') + '[' + this._esc(u.stage.name) + ']');
    }
    return parts.length ? 'Unlocks at ' + parts.join(' and after ') : 'Open from the start';
  },

  _grades: function (st, kit) {
    var self = this;
    return (
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table storm-table">' +
          '<thead><tr><th>Grade</th><th>Condition</th><th>First clear</th><th>Repeat run</th></tr></thead>' +
          '<tbody>' + st.grades.map(function (g) {
            return (
              '<tr>' +
                '<td class="storm-tier">' + self._esc(g.grade) + '</td>' +
                '<td data-label="Condition">' + (g.cond ? self._esc(g.cond) : 'Meet Phase 1\'s victory condition') + '</td>' +
                '<td data-label="First clear">' + self._chips(g.first, kit) + '</td>' +
                '<td data-label="Repeat run">' + self._formations.map(function (f) {
                  return '<div data-ft-formation="' + f[0] + '"' + (f[0] !== self._formation ? ' hidden' : '') + '>' +
                    self._chips(g.normal[f[0]], kit) + '</div>';
                }).join('') + '</td>' +
              '</tr>'
            );
          }).join('') + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  _stage: function (st, kit) {
    return (
      '<details class="story-chapter" id="ft-' + st.id + '">' +
        '<summary class="boss-group-head"><h3>' + this._esc(st.name) + '</h3>' +
          '<span class="story-chapter-sub">' + this._unlock(st.unlock) + ' · ' + st.turns + ' turns</span></summary>' +
        '<div class="skill-card">' +
          '<dl class="elite-conds">' +
            '<dt class="sim-battle">Phase 1</dt>' +
            '<dt class="elite-win">Victory</dt><dd>' + this._esc(st.win) + '</dd>' +
            '<dt class="elite-lose">Defeat</dt><dd>' + this._esc(st.lose) + '</dd>' +
            '<dt class="sim-battle">Phase 2, up to turn ' + st.turns + '</dt>' +
            '<dt class="elite-win">Goal</dt><dd>' + this._esc(st.win2) + '</dd>' +
            '<dt class="elite-lose">Ends</dt><dd>' + this._esc(st.lose2) + '</dd>' +
          '</dl>' +
          '<p class="ac-section-footnote">' + st.exp + ' pilot EXP a run · sweeping costs ' + st.sweep + ' ticket</p>' +
        '</div>' +
        this._grades(st, kit) +
      '</details>'
    );
  },

  _section: function (title, note, stages, kit) {
    var self = this;
    return (
      '<div class="ac-section"><h2 class="ac-section-title">' + title + '</h2>' +
        '<p class="ac-section-footnote">' + note + '</p>' +
        stages.map(function (st) { return self._stage(st, kit); }).join('') +
      '</div>'
    );
  },

  _content: function (d) {
    var self = this;
    var kit = Pages.story._kit();
    var of = function (kind) { return d.stages.filter(function (s) { return s.kind === kind; }); };
    return (
      '<div class="boss-diff-float">' + this._formations.map(function (f) {
        return '<button type="button" class="filter-btn filter-occ' + (f[0] === self._formation ? ' active' : '') +
          '" data-ft-pick="' + f[0] + '">' + f[1] + '</button>';
      }).join('') + '</div>' +
      this._section('ST part materials', 'ST Components for enhancing ST parts.', of('parts'), kit) +
      this._section('R&amp;D materials', 'Arashi Substrate and Depth, for R&amp;D.', of('rnd'), kit)
    );
  },

  _bind: function () {
    var self = this;
    $(document).off('click.ft').on('click.ft', '[data-ft-pick]', function () {
      var f = $(this).attr('data-ft-pick');
      self._formation = f;
      var root = document.getElementById('ft-root');
      if (!root) return;
      $(root).find('[data-ft-pick]').each(function () { $(this).toggleClass('active', this.getAttribute('data-ft-pick') === f); });
      $(root).find('[data-ft-formation]').each(function () { this.hidden = this.getAttribute('data-ft-formation') !== f; });
    });
  },

  _load: function () {
    var self = this;
    if (window.FrontierData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/frontier/frontier.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    var d = window.FrontierData;
    var body = d ? this._content(d) : '<div class="lore-loading">Loading…</div>';
    if (!d) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('ft-root');
        if (root) root.innerHTML = self._content(window.FrontierData);
      }, function () {
        var root = document.getElementById('ft-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Frontier Trial. Try again later.</p>';
      });
    }
    this._bind();
    return (
      '<a href="' + App.href('expansionops') + '" class="btn-back">&#8592; Back to Expansion Ops</a>' +
      '<div class="listing-header"><h1>Frontier Trial</h1></div>' +
      '<p class="dispatch-intro">Hold ground, crush enemy waves. Unlocks after Stage 2-2 [Outsourcing Order]. ' +
        'Each stage is fought in two phases: meet the first phase\'s victory condition, then keep going until the turn limit ' +
        'to reach a higher grade. Each grade has its own condition, first-clear rewards and repeat-run rewards; ' +
        'the repeat-run rewards depend on your team\'s formation type, picked on the right. ' +
        'Event-time bonus drops aren\'t listed.</p>' +
      '<div id="ft-root">' + body + '</div>'
    );
  },

  destroy: function () {
    $(document).off('click.ft');
  },
};

window.Pages = Pages;
