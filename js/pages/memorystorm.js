var Pages = window.Pages || {};

// The Memory Storm page: the clear drops of each score tier and every season's
// part pool, its S-grade (SSR) STs first. Its data (data/storm/storm.js, built by
// scripts/build_storm.py) is fetched the first time the page opens; reward chips
// are drawn as on the Story page. What every season shares is shown once. Seasons
// not yet on global come from the CN client, their names fan-translated.
Pages.memorystorm = {
  title: 'Memory Storm',
  _loading: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  _same: function (seasons, get) {
    var first = JSON.stringify(get(seasons[0]));
    return seasons.every(function (s) { return JSON.stringify(get(s)) === first; });
  },

  _chips: function (rewards, kit) {
    var story = Pages.story;
    return '<div class="boss-drop-list story-rewards">' +
      rewards.map(function (r) { return story._reward(r, kit); }).join('') + '</div>';
  },

  _score: function (t) {
    var n = function (x) { return x.toLocaleString('en-US'); };
    return t.max ? n(t.min) + '–' + n(t.max) : n(t.min) + '+';
  },

  _tiers: function (tiers, kit) {
    var self = this;
    return (
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table storm-table">' +
          '<thead><tr><th>Tier</th><th>Score</th><th>First clear</th><th>Bonus run</th><th>Normal run</th></tr></thead>' +
          '<tbody>' + tiers.map(function (t) {
            return (
              '<tr>' +
                '<td class="storm-tier">' + self._esc(t.name) + '</td>' +
                '<td class="storm-score" data-label="Score">' + self._score(t) + '</td>' +
                '<td data-label="First clear">' + self._chips(t.first, kit) + '</td>' +
                '<td data-label="Bonus run">' + self._chips(t.bonus, kit) + '</td>' +
                '<td data-label="Normal run">' + self._chips(t.normal, kit) + '</td>' +
              '</tr>'
            );
          }).join('') + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  _pool: function (label, sts, kit) {
    var story = Pages.story;
    return '<div class="boss-drop-list story-rewards"><span class="boss-gear-label">' + label + '</span>' +
      sts.map(function (r) { return story._reward(r, kit); }).join('') + '</div>';
  },

  _sharedPool: function (s, kit) {
    return this._pool('A-grade (SR) · ' + s.rates.a + '%', s.pool.a, kit) +
      this._pool('B-grade (R) · ' + s.rates.b + '%', s.pool.b, kit);
  },

  _season: function (s, kit, opts) {
    var when = s.opens ? 'Opened ' + Pages.story._date(s.opens) : 'Not yet on global';
    if (s.version) when = 'v' + this._esc(s.version) + ' · ' + when;
    return (
      '<div class="ac-section storm-season" id="storm-' + s.id + '">' +
        '<div class="skill-card">' +
          '<div class="storm-season-head"><h2>' + this._esc(s.name) + '</h2>' +
            (s.closed ? '<span class="tag storm-closed">Closed</span>' : '') +
            (s.opens ? '' : '<span class="tag storm-upcoming">Upcoming</span>') +
            '<span class="story-chapter-sub">' + when + '</span></div>' +
          (s.text ? '<p class="storm-text">' + this._esc(s.text) +
            (s.fan ? ' <span class="storm-fan">(fan translation from the CN client)</span>' : '') + '</p>' : '') +
          '<div class="story-part-title">SSR part pool</div>' +
          this._pool('S-grade (SSR)', s.pool.s, kit) +
          (opts.sharedPool ? '' : this._sharedPool(s, kit)) +
        '</div>' +
        (opts.sharedTiers ? '' : '<div class="story-part-title">Clear drops</div>' + this._tiers(s.tiers, kit)) +
      '</div>'
    );
  },

  _content: function (d) {
    var self = this;
    var kit = Pages.story._kit();
    var seasons = d.seasons;
    var s0 = seasons[0];
    var opts = {
      sharedTiers: this._same(seasons, function (s) { return s.tiers; }),
      sharedPool: this._same(seasons, function (s) { return [s.rates, s.pool.a, s.pool.b]; }),
    };
    var normal = s0.normalEnergy.map(function (c, i) {
      var from = i ? s0.normalEnergy[i - 1].upTo + 1 : 1;
      return c.cost + (c.upTo ? ' (runs ' + from + '–' + c.upTo + ')' : ' after that');
    }).join(', ');
    return (
      '<p class="dispatch-intro">' +
        (d.unlock ? 'Unlocks after: ' + this._esc(d.unlock) + '. ' : '') +
        'A bonus run costs ' + s0.bonusEnergy + ' energy' + (d.dailyBonus ? ', up to ' + d.dailyBonus + ' a day' : '') +
        ', and gives ' + s0.parts + ' random ST parts on top of its tier\'s drops. ' +
        'A normal run costs energy ' + normal + ', and gives only money and Memory Fragments. ' +
        'Every run gives ' + s0.exp + ' pilot EXP. The score of the run sets its tier.</p>' +
      (opts.sharedTiers ? '<div class="ac-section"><h2 class="ac-section-title">Clear drops</h2>' +
        (seasons.length > 1 ? '<p class="ac-section-footnote">The same in every season.</p>' : '') +
        this._tiers(s0.tiers, kit) + '</div>' : '') +
      (opts.sharedPool ? '<div class="ac-section"><h2 class="ac-section-title">Part pool</h2>' +
        '<p class="ac-section-footnote">Each part of a bonus run is A-grade or B-grade at these rates, then one of that grade\'s STs. ' +
          'The same in every season; each season\'s S-grade (SSR) STs are listed under it below. ' +
          'The game files give no rate for S-grade parts.</p>' +
        '<div class="skill-card">' + this._sharedPool(s0, kit) + '</div></div>' : '') +
      seasons.map(function (s) { return self._season(s, kit, opts); }).join('')
    );
  },

  _load: function () {
    var self = this;
    if (window.StormData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/storm/storm.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    var body = window.StormData ? this._content(window.StormData) : '<div class="lore-loading">Loading…</div>';
    if (!window.StormData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('storm-root');
        if (root) root.innerHTML = self._content(window.StormData);
      }, function () {
        var root = document.getElementById('storm-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Memory Storm. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Memory Storm</h1></div>' +
      '<div id="storm-root">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
