var Pages = window.Pages || {};

// The Story page, in tabs: the main story's chapters with every stage's text
// and rewards, the event stories, then the in-game Skynet encyclopedia's
// Geography, Factions, Incidents and Items. Its data (data/story/story.js, built by scripts/build_story.py) is
// fetched the first time the page opens.
Pages.story = {
  title: 'Story',
  _loading: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  _paras: function (s, links) {
    var esc = this._esc;
    return s.split(/\n+/).filter(Boolean).map(function (l) {
      l = esc(l);
      // <link type=ID>Name</link>: a jump link to that Skynet entry when we have it.
      if (links) {
        l = l.replace(/&lt;link type=(\d+)&gt;(.*?)&lt;\/link&gt;/g, function (_, id, name) {
          return links[id] ? '<a class="story-link" href="#story-w-' + id + '" data-story-open>' + name + '</a>' : name;
        });
      }
      return '<p>' + l + '</p>';
    }).join('');
  },

  // ── Skynet categories ───────────────────────────────────────────────────────
  _entry: function (e, links) {
    var self = this;
    var multi = e.parts.length > 1;
    return (
      '<details class="story-entry skill-card" id="story-w-' + e.id + '">' +
        '<summary><span class="story-entry-name">' + this._esc(e.name) + '</span>' +
          (e.brief ? '<span class="story-entry-brief">' + this._esc(e.brief) + '</span>' : '') + '</summary>' +
        '<div class="lore-text">' + e.parts.map(function (p) {
          return (multi ? '<div class="story-part-title">' + self._esc(p.title) + '</div>' : '') + self._paras(p.text, links);
        }).join('') + '</div>' +
      '</details>'
    );
  },

  // One Skynet category's tab: its entries.
  _category: function (c, links) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">From the in-game Skynet encyclopedia. Entries with several parts unlock them as the story goes on.</p>' +
      '<div class="story-entries">' + c.entries.map(function (e) { return self._entry(e, links); }).join('') + '</div>'
    );
  },

  // ── Chapters ─────────────────────────────────────────────────────────────
  _reward: function (r, kit) {
    var esc = this._esc;
    var img = '', href = null, label = esc(r.name);
    if (r.kind === 'weapon') {
      var cdn = WEAPON_IMG_BASE + encodeURIComponent(r.icon) + '.png';
      img = '<img src="' + weaponIconSrc({ ID: r.id, icon: r.icon, type: r.type }) + '" onerror="this.onerror=null;this.src=\'' + cdn + '\';" alt="" loading="lazy" />';
      label += '<small class="boss-drop-q boss-drop-q-' + esc(r.quality.toLowerCase()) + '">' + esc(r.quality) + '</small>';
      if (kit.weaponNames[r.name]) href = App.href('weapons', r.name);
    } else if (r.kind === 'pilot') {
      var p = kit.pilots[r.id];
      if (p) {
        img = '<img class="story-reward-portrait" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png" alt="" loading="lazy" />';
        href = App.href('pilots', p.PilotName);
      }
      label += '<small class="boss-drop-q">Pilot</small>';
    } else if (r.kind === 'st') {
      var m = kit.mechs[r.id];
      if (m) {
        img = '<img src="' + mechIconSrc(m) + '"' + mechIconErrorAttr(m) + ' alt="" loading="lazy" />';
        href = App.href('sts', m.name);
      }
      label += '<small class="boss-drop-q">ST</small>';
    } else if (r.icon) {
      // Accessories use a pilot skill icon; other items were extracted into the assets repo's data/items/.
      var dir = /^Icon_skill_/.test(r.icon) ? 'data/unlisted/pilot_skills/' : 'data/items/';
      img = '<img src="' + ASSET_BASE + dir + encodeURIComponent(r.icon) + '.png" onerror="this.remove()" alt="" loading="lazy" />';
    }
    if (r.count) label += ' <span class="story-reward-n">×' + r.count.toLocaleString('en-US') + '</span>';
    var inner = img + '<span>' + label + '</span>';
    return href ? '<a class="boss-gear-item" href="' + href + '">' + inner + '</a>' : '<span class="boss-gear-item">' + inner + '</span>';
  },

  _rewards: function (st, kit) {
    var self = this;
    var list = function (label, rewards) {
      return '<div class="boss-drop-list story-rewards"><span class="boss-gear-label">' + self._esc(label) + '</span>' +
        rewards.map(function (r) { return self._reward(r, kit); }).join('') + '</div>';
    };
    // Event stages played at several difficulties: one row per difficulty.
    if (st.tiers) return st.tiers.map(function (t) { return list(t.name, t.rewards); }).join('');
    return st.rewards ? list('Rewards', st.rewards) : '';
  },

  _stage: function (st, kit) {
    var esc = this._esc;
    var badge = st.kind === 'critical' ? '<span class="story-stage-code story-stage-critical">Critical Operation</span>'
      : st.kind === 'encounter' ? '<span class="story-stage-code story-stage-encounter">Encounter</span>'
      : st.code ? '<span class="story-stage-code">' + esc(st.code) + '</span>' : '';
    // Encounters are mostly named "Encounter"; their badge already says so.
    var name = st.kind === 'encounter' && st.name === 'Encounter' ? '' : '<span class="story-stage-name">' + esc(st.name || '') + '</span>';
    var meta = st.location ? '<span class="story-stage-meta"><i class="bi bi-geo-alt"></i>' + esc(st.location) + '</span>'
      : st.giver ? '<span class="story-stage-meta"><i class="bi bi-person"></i>' + esc(st.giver) + '</span>'
      : st.date ? '<span class="story-stage-meta"><i class="bi bi-calendar3"></i>' + esc(st.date) + '</span>'
      : st.subtitle ? '<span class="story-stage-meta">' + esc(st.subtitle) + '</span>' : '';
    return (
      '<div class="story-stage skill-card story-stage--' + st.kind + '">' +
        '<div class="story-stage-head">' + badge + name + meta + '</div>' +
        (st.text ? '<div class="lore-text story-stage-text">' + this._paras(st.text) + '</div>' : '') +
        this._rewards(st, kit) +
      '</div>'
    );
  },

  _chapter: function (c, kit) {
    var self = this;
    var main = c.stages.filter(function (s) { return s.kind !== 'side'; });
    var side = c.stages.filter(function (s) { return s.kind === 'side'; });
    var count = c.stages.filter(function (s) { return s.kind === 'main'; }).length;
    return (
      '<details class="story-chapter" id="story-ch-' + c.id + '">' +
        '<summary class="boss-group-head">' +
          '<h3>' + this._esc(c.name) + ' · ' + this._esc(c.title) + '</h3>' +
          '<span class="story-chapter-sub">' + (c.date ? this._esc(c.date) + ' · ' : '') + count + ' stages' +
            (side.length ? ', ' + side.length + ' side missions' : '') + '</span>' +
          // In the head, on its background; shown only while the chapter is open (css).
          (c.intro ? '<div class="story-chapter-intro lore-text">' + this._paras(c.intro) + '</div>' : '') +
        '</summary>' +
        '<div class="story-stages">' + main.map(function (s) { return self._stage(s, kit); }).join('') + '</div>' +
        (side.length ? '<div class="story-side-title">Side Missions</div><div class="story-stages">' +
          side.map(function (s) { return self._stage(s, kit); }).join('') + '</div>' : '') +
      '</details>'
    );
  },

  _kit: function () {
    var kit = { pilots: {}, mechs: {}, weaponNames: {} };
    ((window.PilotsData || {}).pilots || []).forEach(function (p) { kit.pilots[p.ID] = p; });
    ((window.MechsData || {}).mechs || []).forEach(function (m) { kit.mechs[m.ID] = m; });
    ((window.WeaponsData || {}).weapons || []).forEach(function (w) { kit.weaponNames[w.name] = true; });
    return kit;
  },

  _chapters: function (d, kit) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">The main story, chapter by chapter: every stage\'s briefing and its first-clear rewards, ' +
        'the encounters between stages, the Critical Operation and the side missions.</p>' +
      d.chapters.map(function (c) { return self._chapter(c, kit); }).join('')
    );
  },

  // ── Events ──────────────────────────────────────────────────────────────
  _date: function (s) {
    var d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  _event: function (e, kit) {
    var self = this;
    var count = e.parts.reduce(function (n, p) { return n + p.stages.length; }, 0);
    var when = e.start ? this._date(e.start) + ' – ' + this._date(e.end) : 'Not yet run on global';
    if (e.rerun) when += ', rerun ' + this._date(e.rerun);
    return (
      '<details class="story-chapter" id="story-ev-' + e.id + '">' +
        '<summary class="boss-group-head">' +
          '<h3>' + this._esc(e.name) + '</h3>' +
          '<span class="story-chapter-sub">' + when + ' · ' + count + ' stages</span>' +
        '</summary>' +
        e.parts.map(function (p) {
          // An event with several story arcs titles each; a lone arc is usually just the event again.
          return (e.parts.length > 1 ? '<div class="story-side-title">' + self._esc(p.name) + '</div>' : '') +
            '<div class="story-stages">' + p.stages.map(function (s) { return self._stage(s, kit); }).join('') + '</div>';
        }).join('') +
      '</details>'
    );
  },

  _events: function (d, kit) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">The limited-time events\' stories: every stage\'s briefing and its first-clear rewards. ' +
        'Reruns are listed once, with the rerun\'s rewards.</p>' +
      d.events.map(function (e) { return self._event(e, kit); }).join('')
    );
  },

  // ── Border Conflict ─────────────────────────────────────────────────────
  _bcGroup: function (title, sub, body) {
    return (
      '<details class="story-chapter">' +
        '<summary class="boss-group-head"><h3>' + this._esc(title) + '</h3>' +
          '<span class="story-chapter-sub">' + sub + '</span></summary>' +
        body +
      '</details>'
    );
  },

  _bcBoss: function (b) {
    var self = this;
    return (
      '<details class="story-entry skill-card">' +
        '<summary><span class="story-entry-name">' + this._esc(b.name) + '</span>' +
          '<span class="story-entry-brief">' + this._esc(b.text) + '</span></summary>' +
        '<div class="lore-text">' + b.foes.map(function (f) {
          // A faction fought as one foe at every tier ("Border Bandits") isn't named again.
          var head = (f.name === b.name ? '' : self._esc(f.name) + ' · ') + self._esc(f.tiers.join(', '));
          // The foe's bust (scripts/extract_item_icons.py), beside its write-up.
          var img = f.portrait ? '<img class="story-bc-portrait" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(f.portrait) +
            '.png" onerror="this.remove()" alt="" loading="lazy" />' : '';
          return '<div class="story-bc-foe">' + img + '<div class="story-bc-foe-body">' +
            '<div class="story-part-title">' + head + '</div>' + self._paras(f.text) +
            (f.found ? '<div class="story-bc-found"><span class="story-bc-found-name"><i class="bi bi-search"></i>' +
              self._esc(f.found.name) + '</span>' + self._paras(f.found.text) + '</div>' : '') +
          '</div></div>';
        }).join('') + '</div>' +
      '</details>'
    );
  },

  _bcEncounter: function (e) {
    var self = this;
    return (
      '<details class="story-entry skill-card">' +
        '<summary><span class="story-entry-name">' + this._esc(e.name) + '</span></summary>' +
        '<div class="lore-text">' + e.steps.map(function (s) {
          return (s.label ? '<div class="story-part-title">' + self._esc(s.label) + '</div>' : '') + self._paras(s.text) +
            (s.options && s.options.length ? '<ul class="story-bc-options">' + s.options.map(function (o) {
              return '<li><span class="story-bc-choice">' + self._esc(o.text) + '</span>' +
                (o.effect ? ' <span class="story-bc-effect">' + self._esc(o.effect) + '</span>' : '') +
                (o.outcome ? self._paras(o.outcome) : '') + '</li>';
            }).join('') + '</ul>' : '');
        }).join('') + '</div>' +
      '</details>'
    );
  },

  _borderConflict: function (bc) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">Border Conflict\'s story: the bosses you hunt through the Fast Desert ' +
        'and what you find on them, the encounters along the way with every choice and how it plays out, and the map\'s discoveries.</p>' +
      this._bcGroup('Bosses', bc.bosses.length + ' factions',
        '<div class="story-entries">' + bc.bosses.map(function (b) { return self._bcBoss(b); }).join('') + '</div>') +
      this._bcGroup('Encounters', bc.encounters.length + ' encounters',
        '<div class="story-entries">' + bc.encounters.map(function (e) { return self._bcEncounter(e); }).join('') + '</div>') +
      this._bcGroup('Discoveries', bc.discoveries.length + ' discoveries',
        '<div class="story-stages">' + bc.discoveries.map(function (x) {
          return '<div class="story-stage skill-card"><div class="story-stage-head"><span class="story-stage-name">' +
            self._esc(x.name) + '</span></div><div class="lore-text story-stage-text">' + self._paras(x.text) + '</div></div>';
        }).join('') + '</div>')
    );
  },

  // Tabs: Main Story, Event Stories, Border Conflict, then one per Skynet category (Lore.tabsHtml, js/lore.js).
  _content: function (d) {
    var self = this;
    var links = {};
    var kit = this._kit();
    d.world.forEach(function (c) { c.entries.forEach(function (e) { links[e.id] = true; }); });
    return Lore.tabsHtml([
      ['chapters', 'Main Story <small class="story-tab-n">' + d.chapters.length + '</small>', this._chapters(d, kit)],
      ['eventstories', 'Event Stories <small class="story-tab-n">' + d.events.length + '</small>', this._events(d, kit)],
      ['borderconflict', 'Border Conflict', this._borderConflict(d.borderConflict)],
    ].concat(d.world.map(function (c) {
      return [c.key, self._esc(c.name) + ' <small class="story-tab-n">' + c.entries.length + '</small>', self._category(c, links)];
    })));
  },

  _load: function () {
    var self = this;
    if (window.StoryData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/story/story.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  render: function () {
    var self = this;
    var body = window.StoryData ? this._content(window.StoryData) : '<div class="lore-loading">Loading…</div>';
    if (!window.StoryData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('story-root');
        if (root) root.innerHTML = self._content(window.StoryData);
      }, function () {
        var root = document.getElementById('story-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load the story. Try again later.</p>';
      });
    }
    return (
      '<div class="listing-header"><h1>Story</h1></div>' +
      '<p class="dispatch-intro">The world of Mecharashi and its stories, from the game\'s own text: ' +
        'every main story chapter\'s and event\'s stages with their rewards, and the Skynet encyclopedia\'s places, factions, incidents and items.</p>' +
      '<div id="story-root">' + body + '</div>'
    );
  },
};

// A jump link to a Skynet entry or a chapter switches to its tab and opens it
// before scrolling there. Bound before app.js's hash-link handler, which
// skips prevented clicks.
$(document).on('click', 'a[data-story-open]', function (e) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var el = document.getElementById(this.getAttribute('href').slice(1));
  if (!el) return;
  e.preventDefault();
  var pane = $(el).closest('[data-detail-pane]');
  if (pane.length && pane[0].hidden) Lore._show(pane.closest('.detail-tabs-wrap'), pane.attr('data-detail-pane'));
  el.open = true;
  el.scrollIntoView();
});

window.Pages = Pages;
