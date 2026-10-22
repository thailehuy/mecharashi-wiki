var Pages = window.Pages || {};

// The Covert Phantom page (Border Conflict's roguelike mode): every area's
// bosses and battles with their enemies, the Alert Levels of Max difficulty,
// the tech tree and the pilot masteries. A floating toggle on the right picks
// the difficulty, as on an Armed Conquest season: what's only on some
// difficulties carries them in data-diffs and follows it. Its data
// (data/covert/covert.js, built by scripts/build_covert.py) is fetched the
// first time the page opens; reward chips are drawn as on the Story page.
Pages.covertphantom = {
  title: 'Covert Phantom',
  _loading: null,
  _diff: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  // Shown only on these difficulties (all of them: no attribute).
  _diffsAttr: function (diffs, all) {
    if (!diffs || diffs.length === all.length) return '';
    return ' data-diffs="' + this._esc(diffs.join('|')) + '"' + (diffs.indexOf(this._diff) === -1 ? ' hidden' : '');
  },

  // A value that changes with the difficulty ({difficulty: value}): one span each.
  _perDiff: function (v, fmt) {
    var self = this;
    if (v === null || typeof v !== 'object') return fmt(v);
    return Object.keys(v).map(function (d) {
      return '<span data-diffs="' + self._esc(d) + '"' + (d !== self._diff ? ' hidden' : '') + '>' + fmt(v[d]) + '</span>';
    }).join('');
  },

  _stars: function (n) {
    return n + '<i class="bi bi-star-fill cp-star"></i>';
  },

  _enemy: function (e, all) {
    var esc = this._esc;
    var st = e.mech ? '<a href="' + App.href('sts', e.mech) + '">' + esc(e.st) + '</a>' : esc(e.st || '');
    var tags = (e.device ? '<span class="tag cp-tag-device" title="A turret, beacon or vehicle, not a pilot in an ST">Device</span>' : '') +
      (e.capture ? '<span class="tag cp-tag-capture" title="This unit can be captured">Capture</span>' : '') +
      (e.roaming ? '<span class="tag cp-tag-roaming" title="May be called in mid-battle; its level is set by the run">Roaming boss</span>'
        : e.summoned ? '<span class="tag cp-tag-summon" title="Joins mid-battle">Reinforcement</span>' : '');
    return (
      '<li' + this._diffsAttr(e.diffs, all) + '>' +
        '<span class="cp-enemy-n">' + e.n + '×</span>' +
        '<span class="cp-enemy-name">' + esc(e.name) + '</span>' +
        (e.st ? '<span class="cp-enemy-st">' + st + '</span>' : '') +
        (e.lv ? '<span class="cp-enemy-lv">' + this._perDiff(e.lv, function (l) { return 'Lv ' + l; }) + '</span>' : '') +
        tags +
      '</li>'
    );
  },

  _battleBody: function (b) {
    var self = this;
    return (
      '<dl class="elite-conds">' +
        '<dt class="elite-win">Victory</dt><dd>' + this._esc(b.win) + '</dd>' +
        '<dt class="elite-lose">Defeat</dt><dd>' + this._esc(b.lose) + '</dd>' +
      '</dl>' +
      (b.enemies.length ? '<div class="story-part-title">Enemies</div><ul class="cp-enemies">' +
        b.enemies.map(function (e) { return self._enemy(e, b.diffs); }).join('') + '</ul>' : '')
    );
  },

  _battle: function (entry, d, all) {
    var b = d.battles[entry.id];
    return (
      '<div class="story-stage skill-card cp-battle"' + this._diffsAttr(entry.diffs, all) + '>' +
        '<div class="story-stage-head"><span class="story-stage-name">' + this._esc(b.name) + '</span>' +
          '<span class="story-stage-meta">' + entry.stars.map(this._stars).join(' · ') + ' nodes</span></div>' +
        this._battleBody(b) +
      '</div>'
    );
  },

  _tier: function (t, d, kit) {
    var self = this;
    var b = d.battles[t.battle];
    var img = t.portrait ? '<img class="story-bc-portrait" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(t.portrait) +
      '.png" onerror="this.remove()" alt="" loading="lazy" />' : '';
    return (
      '<div class="story-stage skill-card cp-tier">' +
        '<div class="story-stage-head"><span class="story-stage-code">' + this._esc(t.tier) + '</span>' +
          '<span class="story-stage-name">' + this._esc(t.foe) + '</span>' +
          '<span class="story-stage-meta">' + (t.stars ? 'Needs ' + this._stars(t.stars) : 'Always open') +
            ' · <i class="bi bi-geo-alt"></i>' + this._esc(b.name) + '</span></div>' +
        (t.text || img ? '<div class="story-bc-foe">' + img + '<div class="story-bc-foe-body">' +
          (t.text ? '<p>' + this._esc(t.text) + '</p>' : '') + '</div></div>' : '') +
        this._battleBody(b) +
        Object.keys(t.rewards).map(function (df) {
          return '<div data-diffs="' + self._esc(df) + '"' + (df !== self._diff ? ' hidden' : '') + '>' +
            Pages.elitebattle._rewards('Rewards', t.rewards[df], kit) + '</div>';
        }).join('') +
      '</div>'
    );
  },

  _boss: function (g, d, kit, all) {
    var self = this;
    return (
      '<div class="cp-boss"' + this._diffsAttr(g.diffs, all) + '>' +
        '<div class="cp-boss-head"><h4>' + this._esc(g.name) + '</h4><span>' + this._esc(g.text) + '</span></div>' +
        '<div class="story-stages">' + g.tiers.map(function (t) { return self._tier(t, d, kit); }).join('') + '</div>' +
      '</div>'
    );
  },

  _area: function (a, d, kit) {
    var self = this;
    var all = d.difficulties.map(function (x) { return x.name; });
    var byStar = {};
    a.battles.forEach(function (b) { (byStar[b.stars[0]] = byStar[b.stars[0]] || []).push(b); });
    return (
      '<details class="story-chapter cp-area"' + this._diffsAttr(a.diffs, all) + '>' +
        '<summary class="boss-group-head"><h3>' + this._esc(a.name) + '</h3>' +
          '<span class="story-chapter-sub">' +
            (a.picks ? 'one of ' + a.picks.map(this._esc).join(', ') + ' · ' : '') +
            a.ap + ' action points · up to ' + this._stars(a.stars) +
            (a.next ? ' · then ' + this._esc([].concat(a.next).join(', ')) : ' · last area') +
          '</span></summary>' +
        '<div class="cp-panel">' +
        (a.picks ? '<p class="ac-section-footnote">The route picks one of these areas. They differ only in their map layout: ' +
          'their bosses and battles are the same.</p>' : '') +
        '<div class="story-part-title cp-section">Bosses</div>' +
        '<p class="ac-section-footnote">Each area has its boss fight. Collecting stars in the area opens its harder tiers.</p>' +
        a.bosses.map(function (g) { return self._boss(g, d, kit, all); }).join('') +
        '<div class="story-part-title cp-section">Battles</div>' +
        '<p class="ac-section-footnote">The battles the area\'s nodes can roll, by the lowest star tier of node they\'re on.</p>' +
        Object.keys(byStar).sort().map(function (s) {
          return '<div class="cp-star-group"><div class="cp-star-head">' + self._stars(s) + ' nodes</div>' +
            '<div class="story-stages">' + byStar[s].map(function (b) { return self._battle(b, d, all); }).join('') + '</div></div>';
        }).join('') +
        '</div>' +
      '</details>'
    );
  },

  _difficulty: function (x) {
    var esc = this._esc;
    return (
      '<dl class="elite-conds skill-card cp-diff-info" data-diffs="' + esc(x.name) + '"' + (x.name !== this._diff ? ' hidden' : '') + '>' +
        '<dt>Difficulty</dt><dd>' + esc(x.name) + ' <span class="cp-muted">(' + esc(x.label) + ')</span></dd>' +
        '<dt>Your units</dt><dd>STs Lv ' + x.level + ', weapons Lv ' + x.weaponLevel + '</dd>' +
        '<dt>Enemies</dt><dd>Lv ' + x.enemyLevel + ' (bosses can be a little higher)</dd>' +
        '<dt>Unlock</dt><dd>' + esc(x.unlock) + '</dd>' +
      '</dl>'
    );
  },

  _tag: function (t) {
    return (
      '<li class="sim-mod">' +
        '<div><div class="sim-mod-head"><b>' + this._esc(t.name) + '</b>' +
          (t.alert ? '<span class="tag cp-tag-alert" title="Alert it adds">+' + t.alert + ' Alert</span>' : '') + '</div>' +
          '<div class="sim-mod-text">' + this._esc(t.text) + '</div></div>' +
      '</li>'
    );
  },

  _alertLevels: function (d) {
    var self = this;
    return (
      '<section class="cp-block" data-diffs="Max"' + (this._diff !== 'Max' ? ' hidden' : '') + '>' +
        '<h2 class="cp-h2">Alert Levels</h2>' +
        '<p class="ac-section-footnote">On Max difficulty, each Alert Level adds fixed modifiers and lets you take on optional ones.</p>' +
        d.alertLevels.map(function (l) {
          return (
            '<details class="story-chapter">' +
              '<summary class="boss-group-head"><h3>' + self._esc(l.name) + '</h3>' +
                '<span class="story-chapter-sub">' + l.fixed.length + ' fixed modifiers' +
                  (l.groups.length ? ' · ' + l.groups.length + ' optional groups' : '') + '</span></summary>' +
              '<div class="cp-panel cp-alert">' +
                '<div class="story-part-title">Fixed modifiers</div><ul class="sim-mods">' +
                  l.fixed.map(function (t) { return self._tag(t); }).join('') + '</ul>' +
                l.groups.map(function (g) {
                  return '<div class="story-part-title">Optional: ' + self._esc(g.name) + '</div><ul class="sim-mods">' +
                    g.tags.map(function (t) { return self._tag(t); }).join('') + '</ul>';
                }).join('') +
              '</div>' +
            '</details>'
          );
        }).join('') +
      '</section>'
    );
  },

  // The tech tree top to bottom: each row unlocks after the row above it.
  _tech: function (d) {
    var esc = this._esc;
    var unit = function (u) {
      return '<div class="skill-card cp-tech-unit"><b>' + esc(u.name) + '</b>' + u.levels.map(function (l, i) {
        return '<div class="cp-tech-level">' + (u.levels.length > 1 ? '<span class="cp-muted">Lv ' + (i + 1) + '</span> ' : '') +
          esc(l.text) + '</div>';
      }).join('') +
        '<div class="cp-cost">' + u.levels.map(function (l) { return l.cost; }).join(' / ') + ' ' + esc(u.currency) + '</div>' +
      '</div>';
    };
    return (
      '<p class="ac-section-footnote">Permanent upgrades for every run, the same on every difficulty. ' +
        'Each row unlocks after the row above it; the last rows cost Secret Battlefield Reports instead of Tech Coins.</p>' +
      '<div class="cp-tech">' + d.tech.map(function (r, i) {
        return (
          (i ? '<div class="cp-tech-link"><i class="bi bi-arrow-down"></i>' +
            (r.after.length > 1 ? 'after ' + esc(r.after.join(', ')) : 'after ' + esc(r.after[0])) +
            (r.afterLevel ? ' (Lv ' + r.afterLevel + ')' : '') + '</div>' : '') +
          '<div class="cp-tech-row">' + r.units.map(unit).join('') + '</div>'
        );
      }).join('') + '</div>'
    );
  },

  _masteries: function (d) {
    var esc = this._esc;
    return (
      '<p class="ac-section-footnote">Sold during a run: the pilot learns the skill until the run ends.</p>' +
      '<div class="cp-masteries">' + d.masteries.map(function (m) {
        var sk = m.skill;
        return (
          '<div class="skill-card cp-mastery">' +
            '<img class="cp-mastery-avatar" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(m.portrait) +
              '.png" onerror="this.style.visibility=\'hidden\'" alt="' + esc(m.pilot) + '" loading="lazy" />' +
            '<div class="cp-mastery-body">' +
              '<div class="cp-mastery-head"><b>' + esc(m.pilot) + '</b>' +
                '<small class="boss-drop-q boss-drop-q-' + esc(m.rarity.toLowerCase()) + '">' + esc(m.rarity) + '</small></div>' +
              (sk ? '<div class="sim-mod">' +
                '<img class="boss-skill-icon" src="' + ASSET_BASE + 'data/unlisted/pilot_skills/' + encodeURIComponent(sk.icon) +
                  '.png" onerror="this.remove()" alt="" loading="lazy" />' +
                '<div><b>' + esc(sk.name) + '</b><div class="sim-mod-text">' + Glossary.parseEffects(sk.text) + '</div></div></div>' : '') +
            '</div>' +
          '</div>'
        );
      }).join('') + '</div>'
    );
  },

  _areasTab: function (d, kit) {
    var self = this;
    return (
      d.difficulties.map(function (x) { return self._difficulty(x); }).join('') +
      d.areas.map(function (a) { return self._area(a, d, kit); }).join('') +
      this._alertLevels(d)
    );
  },

  _content: function (d) {
    var self = this;
    var kit = Pages.story._kit();
    var names = d.difficulties.map(function (x) { return x.name; });
    if (names.indexOf(this._diff) === -1) this._diff = names[0];
    var techUnits = d.tech.reduce(function (n, r) { return n + r.units.length; }, 0);
    // The difficulty toggle only changes the Areas tab, so it shows only there.
    return (
      '<div class="boss-diff-float">' + names.map(function (n) {
        return '<button type="button" class="filter-btn filter-occ' + (n === self._diff ? ' active' : '') +
          '" data-cp-diff="' + self._esc(n) + '">' + self._esc(n) + '</button>';
      }).join('') + '</div>' +
      Lore.tabsHtml([
        ['areas', 'Areas <small class="story-tab-n">' + d.areas.length + '</small>', this._areasTab(d, kit)],
        ['tech', 'Tech Tree <small class="story-tab-n">' + techUnits + '</small>', this._tech(d)],
        ['masteries', 'Pilot Masteries <small class="story-tab-n">' + d.masteries.length + '</small>', this._masteries(d)],
      ])
    );
  },

  _bind: function () {
    var self = this;
    $(document).off('click.cp').on('click.cp', '[data-cp-diff]', function () {
      var diff = $(this).attr('data-cp-diff');
      self._diff = diff;
      var root = document.getElementById('cp-root');
      if (!root) return;
      $(root).find('[data-cp-diff]').each(function () { $(this).toggleClass('active', this.getAttribute('data-cp-diff') === diff); });
      $(root).find('[data-diffs]').each(function () { this.hidden = this.getAttribute('data-diffs').split('|').indexOf(diff) === -1; });
    }).on('click.cp', '#cp-root [data-detail-tab]', function () {
      $('#cp-root .boss-diff-float').prop('hidden', this.getAttribute('data-detail-tab') !== 'areas');
    });
  },

  _load: function () {
    var self = this;
    if (window.CovertData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/covert/covert.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    this._bind();
    var body = window.CovertData ? this._content(window.CovertData) : '<div class="lore-loading">Loading…</div>';
    if (!window.CovertData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('cp-root');
        if (root) root.innerHTML = self._content(window.CovertData);
      }, function () {
        var root = document.getElementById('cp-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load Covert Phantom. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Covert Phantom</h1></div>' +
      '<p class="dispatch-intro">Border Conflict\'s roguelike mode. A run crosses four areas, each ending in a boss fight. ' +
        'Pick a difficulty on the right: the enemies\' levels, the bosses\' rewards and the battles only on some difficulties follow it. ' +
        'On 30 to 70 the battles and bosses are the same, only stronger; Max adds its own battles, bosses and Alert Levels. ' +
        'The random events and their story are on the <a href="' + App.href('story') + '">Story</a> page\'s Border Conflict tab. ' +
        'It shares Border Conflict\'s store: see the <a href="' + App.href('shops') + '#border-shop">Border FTZ</a> on the Shops page.</p>' +
      '<div id="cp-root" class="boss-group">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
