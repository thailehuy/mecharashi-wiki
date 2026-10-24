var Pages = window.Pages || {};

// The Refactor-in-Crisis page (the game's ProtagonistPilotChallenge): a tab per
// theme with its two protagonists' Resolution Degree perks, its endings, its
// ten stages (conditions, difficulty tiers and every unit the map places) and
// its missions. What every theme shares (how Data is earned, the Resolution
// Degree curve) is shown once above the tabs. Its data (data/crisis/crisis.js,
// built by scripts/build_crisis.py) is fetched the first time the page opens;
// reward chips are drawn as on the Story page. Themes not yet on global come
// from the CN client, their text fan-translated where global has no wording.
Pages.refactorincrisis = {
  title: 'Refactor-in-Crisis',
  _loading: null,

  _sides: [
    ['you', 'Your side'],
    ['ally', 'Allies'],
    ['enemy', 'Enemies'],
    ['third', 'Third side'],
    ['env', 'Environment'],
  ],

  _esc: function (s) { return $('<span>').text(s).html(); },

  _num: function (n) { return n.toLocaleString('en-US'); },

  _img: function (name, folder) {
    return ASSET_BASE + 'data/' + folder + '/' + encodeURIComponent(name) + '.jpg';
  },

  _pilot: function (id, kit) {
    var p = kit.pilots[id];
    return p ? '<a href="' + App.href('pilots', p.PilotName) + '">' + this._esc(p.PilotName) + '</a>' : this._esc(id);
  },

  _st: function (name, id, kit) {
    var m = id && kit.mechs[id];
    return m ? '<a href="' + App.href('sts', m.name) + '">' + this._esc(name) + '</a>' : this._esc(name || '');
  },

  // "Resolution Tier Ⅰ–Ⅴ", "Chaos Index λ1–λ50", or the one difficulty of a Regular Block.
  _tierRange: function (s, d) {
    var first = d.tiers[s.tiers[0]], last = d.tiers[s.tiers[s.tiers.length - 1]];
    if (s.tiers.length === 1) return 'One difficulty';
    var label = s.kind === 'final' ? 'Chaos Index ' : 'Resolution Tier ';
    return label + this._esc(first.name) + '–' + this._esc(last.name);
  },

  _tiers: function (s, d) {
    var self = this;
    var names = {};
    s.tiers.forEach(function (id) { names[id] = d.tiers[id].name; });
    var unlocks = s.tiers.some(function (id) { return d.tiers[id].after; });
    var data = s.tiers.some(function (id) { return d.tiers[id].data; });
    return (
      '<details class="ric-tiers">' +
        '<summary>' + (s.kind === 'final' ? 'Chaos Index' : 'Resolution Tiers') + ' <span class="cp-muted">(' +
          s.tiers.length + ')</span></summary>' +
        '<div class="dispatch-table-wrap"><table class="dispatch-table ric-tier-table">' +
          '<thead><tr><th>Tier</th><th>Enemies</th>' + (data ? '<th>Data</th>' : '') +
            (unlocks ? '<th>Unlocks after</th>' : '') + '</tr></thead>' +
          '<tbody>' + s.tiers.map(function (id) {
            var t = d.tiers[id];
            return (
              '<tr><td class="ric-tier-name">' + self._esc(t.name) + '</td>' +
                '<td>' + self._esc(t.text) + '</td>' +
                (data ? '<td>' + (t.data ? self._num(t.data) : '') + '</td>' : '') +
                (unlocks ? '<td>' + (t.after ? self._esc(names[t.after] || d.tiers[t.after].name) : '') + '</td>' : '') +
              '</tr>'
            );
          }).join('') + '</tbody>' +
        '</table></div>' +
      '</details>'
    );
  },

  _unit: function (u, kit) {
    var esc = this._esc;
    var tags = (u.rank ? '<span class="tag ric-tag-' + u.rank.toLowerCase() + '" title="Data a protagonist gets for defeating it">' +
        esc(u.rank) + ' · ' + u.data + ' Data</span>' : '') +
      (u.device ? '<span class="tag cp-tag-device" title="A turret, beacon or vehicle, not a pilot in an ST">Device</span>' : '') +
      (u.summoned ? '<span class="tag cp-tag-summon" title="Joins mid-battle">Reinforcement</span>' : '');
    return (
      '<li>' +
        '<span class="cp-enemy-n">' + u.n + '×</span>' +
        '<span class="cp-enemy-name">' + esc(u.name) + '</span>' +
        (u.st ? '<span class="cp-enemy-st">' + this._st(u.st, u.mech, kit) + '</span>' : '') +
        (u.lv ? '<span class="cp-enemy-lv">Lv ' + u.lv + '</span>' : '') +
        tags +
      '</li>'
    );
  },

  _units: function (s, kit) {
    var self = this;
    if (!s.units.length) return '<p class="ac-section-footnote">The game files place no units on this map.</p>';
    return this._sides.map(function (side) {
      var units = s.units.filter(function (u) { return u.side === side[0]; });
      if (!units.length) return '';
      return '<div class="story-part-title">' + side[1] + '</div><ul class="cp-enemies">' +
        units.map(function (u) { return self._unit(u, kit); }).join('') + '</ul>';
    }).join('');
  },

  _stage: function (s, d, kit) {
    var esc = this._esc;
    var img = s.image ? '<img class="story-stage-img" src="' + this._img(s.image, 'story') + '" onerror="this.remove()" alt="" loading="lazy" />' : '';
    return (
      '<div class="story-stage skill-card ric-stage ric-stage--' + s.kind + '">' +
        '<div class="story-stage-head"><span class="story-stage-code">' + (s.n < 10 ? '0' : '') + s.n + '</span>' +
          '<span class="story-stage-name">' + esc(s.name) + '</span>' +
          '<span class="story-stage-meta">' + this._tierRange(s, d) + '</span></div>' +
        '<div class="story-stage-body">' + img +
          '<div class="ric-stage-main">' +
            (s.text ? '<p class="ric-stage-text">' + esc(s.text) + '</p>' : '') +
            '<dl class="elite-conds">' +
              '<dt class="elite-win">Victory</dt><dd>' + esc(s.win) + '</dd>' +
              '<dt class="elite-lose">Defeat</dt><dd>' + esc(s.lose) + '</dd>' +
            '</dl>' +
          '</div>' +
        '</div>' +
        this._tiers(s, d) +
        this._units(s, kit) +
      '</div>'
    );
  },

  _protagonist: function (p, t, kit) {
    var esc = this._esc;
    var pilot = kit.pilots[p.id];
    var ride = t.support.filter(function (s) { return s.pilot === p.id; })[0];
    return (
      '<div class="skill-card ric-pro"' + (p.color ? ' style="border-top-color:' + esc(p.color) + '"' : '') + '>' +
        '<div class="ric-pro-head">' +
          (pilot ? '<img class="cp-mastery-avatar" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(pilot.PortraitHeroIcon) +
            '.png" onerror="this.style.visibility=\'hidden\'" alt="" loading="lazy" />' : '') +
          '<div><h3>' + this._pilot(p.id, kit) + '</h3>' +
            (ride ? '<div class="ric-pro-ride">Fights in ' + this._st(ride.st, ride.mech, kit) + (ride.lv ? ' (Lv ' + ride.lv + ')' : '') + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<p class="ac-section-footnote">Every Resolution Degree adds to ' + esc(p.bonus.replace(/\s*\+\d+%\.?$/, '')) +
          ', up to ' + esc((p.bonus.match(/\+\d+%/) || [''])[0]) + ' at RD ' + kit.maxRd + '.</p>' +
        '<ul class="ric-perks">' + p.perks.map(function (k) {
          return '<li><span class="ric-rd">RD ' + k.rd + '</span><div class="sim-mod-text">' + Glossary.parseEffects(k.text) + '</div></li>';
        }).join('') + '</ul>' +
        (p.terms.length ? '<div class="ric-terms">' + p.terms.map(function (x) {
          return '<div><b>[' + esc(x.name) + ']</b> ' + Glossary.parseEffects(x.text).replace(/\n/g, '<br />') + '</div>';
        }).join('') + '</div>' : '') +
      '</div>'
    );
  },

  _endings: function (t, kit) {
    var self = this;
    return '<ul class="skill-card ric-endings">' + t.endings.map(function (e) {
      var who = e.rd20.length === 2 ? 'both protagonists reach RD 20'
        : 'only ' + e.rd20.map(function (id) { return self._pilot(id, kit); }).join(', ') + ' reaches RD 20';
      return '<li><b>' + self._esc(e.name) + '</b> <span class="cp-muted">' + who + '</span></li>';
    }).join('') + '</ul>';
  },

  _missions: function (t, kit) {
    var story = Pages.story;
    var logs = 0;
    t.missions.forEach(function (m) { m.rewards.forEach(function (r) { if (r.count) logs += r.count; }); });
    return (
      '<p class="ac-section-footnote">' + this._num(logs) + ' Reconstruction Logs in all, and a medal for each challenge.</p>' +
      '<div class="dispatch-table-wrap"><table class="dispatch-table ric-missions">' +
        '<thead><tr><th>Mission</th><th>Reward</th></tr></thead>' +
        '<tbody>' + t.missions.map(function (m) {
          return (
            '<tr><td>' + (m.challenge ? '<span class="tag ric-tag-challenge">Challenge</span> ' : '') + this._esc(m.text) + '</td>' +
              '<td><div class="boss-drop-list story-rewards">' +
                m.rewards.map(function (r) { return story._reward(r, kit); }).join('') + '</div></td></tr>'
          );
        }, this).join('') + '</tbody>' +
      '</table></div>'
    );
  },

  _theme: function (t, d, kit) {
    var self = this;
    var esc = this._esc;
    var when = t.opens ? 'On global since ' + Pages.story._date(t.opens) : '<span class="tag storm-upcoming">Not yet on global</span>';
    var cn = t.cnOpens ? 'CN ' + (t.version ? 'v' + esc(t.version) + ', ' : '') + Pages.story._date(t.cnOpens) : '';
    return (
      (t.image ? '<img class="event-hero ric-hero" src="' + this._img(t.image, 'crisis') + '" onerror="this.remove()" alt="" />' : '') +
      '<div class="skill-card ric-head"><div class="storm-season-head"><h2>' + esc(t.name) + '</h2>' +
        '<span class="story-chapter-sub">' + esc(t.code) + '</span></div>' +
      '<p class="ric-when">' + when + (cn ? ' · ' + cn : '') +
        (t.fan ? ' <span class="storm-fan">(text from the CN client; names fan-translated where global has no official wording: ' +
          esc(t.cnName) + ')</span>' : '') + '</p></div>' +
      // The theme's own tabs, inside its tab of the theme tabs.
      '<div class="ric-theme">' + Lore.tabsHtml([
        ['pros-' + t.id, 'Protagonists',
          '<div class="ric-pros">' + t.protagonists.map(function (p) { return self._protagonist(p, t, kit); }).join('') + '</div>'],
        ['stages-' + t.id, 'Stages <small class="story-tab-n">' + t.stages.length + '</small>',
          '<div class="story-stages">' + t.stages.map(function (s) { return self._stage(s, d, kit); }).join('') + '</div>'],
        ['missions-' + t.id, 'Missions <small class="story-tab-n">' + t.missions.length + '</small>', this._missions(t, kit)],
        ['endings-' + t.id, 'Endings <small class="story-tab-n">' + t.endings.length + '</small>',
          '<p class="ac-section-footnote">Which ending plays depends on the protagonists\' Resolution Degrees when the theme ends.</p>' +
          this._endings(t, kit)],
      ]) + '</div>'
    );
  },

  _levels: function (d) {
    var self = this;
    return (
      '<details class="ric-tiers">' +
        '<summary>Data needed per Resolution Degree</summary>' +
        '<div class="ric-levels">' + d.levels.map(function (l) {
          return '<div><span class="ric-rd">RD ' + l.rd + '</span> ' + self._num(l.data) + '</div>';
        }).join('') + '</div>' +
      '</details>'
    );
  },

  _content: function (d) {
    var self = this;
    var kit = Pages.story._kit();
    kit.maxRd = d.levels[d.levels.length - 1].rd;
    return (
      '<div class="ac-section"><h2 class="ac-section-title">Data and Resolution</h2>' +
        '<p class="ac-section-footnote">' + (d.unlock ? this._esc(d.unlock) + '. ' : '') +
          'A protagonist earns Data in battle, which raises their Resolution Degree (RD) from 1 to ' + kit.maxRd +
          ': each degree adds a little to their stats, and a few unlock a perk. Every protagonist needs the same Data.</p>' +
        '<div class="skill-card"><ul class="ric-ways">' + d.dataWays.map(function (w) { return '<li>' + self._esc(w) + '</li>'; }).join('') + '</ul>' +
        this._levels(d) + '</div>' +
      '</div>' +
      Lore.tabsHtml(d.themes.map(function (t) {
        return ['theme-' + t.id, '<small class="story-tab-n">' + (t.id < 10 ? '0' : '') + t.id + '</small> ' + self._esc(t.name),
          self._theme(t, d, kit)];
      }))
    );
  },

  _load: function () {
    var self = this;
    if (window.CrisisData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/crisis/crisis.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    var body = window.CrisisData ? this._content(window.CrisisData) : '<div class="lore-loading">Loading…</div>';
    if (!window.CrisisData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('ric-root');
        if (root) root.innerHTML = self._content(window.CrisisData);
      }, function () {
        var root = document.getElementById('ric-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Refactor-in-Crisis. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Refactor-in-Crisis</h1></div>' +
      '<p class="dispatch-intro">A Chronicles mode that revisits a story through two protagonist pilots. Each theme has ten stages: ' +
        'Chaotic Blocks (stages 1, 3, 5, 7 and 9), whose Resolution Tiers make the enemies stronger for more Data; ' +
        'Regular Blocks (2, 4, 6 and 8), story battles with one difficulty; and the Final Battle (10), with its Chaos Index. ' +
        'Which protagonists reach RD 20 decides the theme\'s ending. Missions pay Reconstruction Logs, spent at the ' +
        '<a href="' + App.href('shops') + '#nostalgic-challenge-store">Nostalgic Challenge Store</a>. ' +
        'Themes not yet on global come from the CN client.</p>' +
      '<div id="ric-root">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
