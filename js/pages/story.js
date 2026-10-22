var Pages = window.Pages || {};

// The Story page, in tabs: the main story's chapters and the pilots' side stories
// as pictures, each opening its own page (story/<slug>/) with every stage's text,
// cutscenes and rewards, then Border Conflict and the in-game Skynet encyclopedia's
// Geography, Factions, Incidents and Items. The event stories' stages are drawn by the
// Events page. Its data (data/story/story.js, built by scripts/build_story.py) is
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
    } else if (r.kind === 'backpack') {
      var b = kit.backpacks[r.id];
      if (b) {
        img = '<img src="' + BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png" alt="" loading="lazy" />';
        href = App.href('backpacks', backpackSlug(b));
        label += '<small class="boss-drop-q boss-drop-q-' + esc(b.quality.toLowerCase()) + '">' + esc(b.quality) + '</small>';
      }
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

  // ── Cutscenes ───────────────────────────────────────────────────────────
  // A stage's cutscenes, collapsed; their lines (data/story/dialogue/<file>.js) load when one is opened.
  _scenes: function (st, file) {
    var esc = this._esc;
    return (st.scenes || []).map(function (sc) {
      return (
        '<details class="story-scene" data-scene-file="' + file + '" data-scene-id="' + sc.id + '">' +
          '<summary><span class="story-scene-head"><i class="bi bi-chat-square-quote"></i>' +
            (sc.when === 'before' ? 'Opening cutscene' : 'Closing cutscene') +
            '<span class="story-scene-n">' + sc.n + ' lines</span></span>' +
            (sc.summary ? '<span class="story-scene-summary">' + esc(sc.summary) + '</span>' : '') +
          '</summary>' +
          '<div class="story-dlg"><div class="lore-loading">Loading…</div></div>' +
        '</details>'
      );
    }).join('');
  },

  _dialogue: function (lines) {
    var esc = this._esc;
    var hl = function (s) {
      return esc(s).replace(/&lt;yellow&gt;(.*?)&lt;\/yellow&gt;/g, '<span class="story-dlg-hl">$1</span>').replace(/&lt;\/?yellow&gt;/g, '');
    };
    return lines.map(function (l) {
      // [speaker, text]; no speaker is narration.
      return l[0] ? '<p class="story-dlg-line"><span class="story-dlg-who">' + esc(l[0]) + '</span>' + hl(l[1]) + '</p>'
        : '<p class="story-dlg-narr">' + hl(l[1]) + '</p>';
    }).join('');
  },

  _sceneFiles: {},

  _loadScene: function (el) {
    var self = this;
    var file = el.getAttribute('data-scene-file');
    var box = el.querySelector('.story-dlg');
    if (el._loaded) return;
    el._loaded = true;
    var have = window.StoryDialogue && window.StoryDialogue[file];
    var p = have ? $.Deferred().resolve().promise()
      : (this._sceneFiles[file] = this._sceneFiles[file] ||
          $.ajax({ url: 'data/story/dialogue/' + file + '.js', dataType: 'script', cache: true })
            .fail(function () { delete self._sceneFiles[file]; }));
    p.then(function () {
      box.innerHTML = self._dialogue(window.StoryDialogue[file][el.getAttribute('data-scene-id')] || []);
    }, function () {
      el._loaded = false;
      box.innerHTML = '<p class="text-danger">Couldn\'t load the dialogue. Close and reopen to try again.</p>';
    });
  },

  _stage: function (st, kit, file) {
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
    // A side story chapter that needs its pilot at a level.
    if (st.level) meta += '<span class="story-stage-meta"><i class="bi bi-person-up"></i>Pilot Lv. ' + st.level + '</span>';
    // Its map or cutscene picture, beside the text (on a chapter's or side story's page; event stages have none).
    var img = st.image ? '<img class="story-stage-img" src="' + this._img(st.image) + '" alt="" loading="lazy" />' : '';
    return (
      '<div class="story-stage skill-card story-stage--' + st.kind + '" id="story-st-' + st.id + '">' +
        '<div class="story-stage-head">' + badge + name + meta + '</div>' +
        (img || st.text ? '<div class="story-stage-body">' + img +
          (st.text ? '<div class="lore-text story-stage-text">' + this._paras(st.text) + '</div>' : '') + '</div>' : '') +
        this._scenes(st, file) +
        this._rewards(st, kit) +
      '</div>'
    );
  },

  _kit: function () {
    var kit = { pilots: {}, mechs: {}, backpacks: {}, weaponNames: {} };
    ((window.PilotsData || {}).pilots || []).forEach(function (p) { kit.pilots[p.ID] = p; });
    ((window.MechsData || {}).mechs || []).forEach(function (m) { kit.mechs[m.ID] = m; });
    ((window.BackpacksData || {}).backpacks || []).forEach(function (b) { kit.backpacks[b.ID] = b; });
    ((window.WeaponsData || {}).weapons || []).forEach(function (w) { kit.weaponNames[w.name] = true; });
    return kit;
  },

  _date: function (s) {
    var d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // A stage's or a side story chapter's picture (scripts/extract_story_images.py).
  _img: function (name) {
    return ASSET_BASE + 'data/story/' + encodeURIComponent(name) + '.jpg';
  },

  // ── Listing: a card per main story chapter and per side story ───────────
  // src: the picture's URL; also used by the Elite Battle page's chapters.
  _card: function (href, src, bust, name, sub) {
    return (
      '<div class="event-card story-card">' +
        '<a class="event-card-img" href="' + href + '">' +
          (src ? '<img src="' + src + '" alt="" loading="lazy" />' : '') +
          // A side story's pilot, standing over its first chapter's picture.
          (bust ? '<img class="story-card-bust" src="' + LOCAL_AVATAR_BASE + encodeURIComponent(bust) +
            '.png" onerror="this.remove()" alt="" loading="lazy" />' : '') +
        '</a>' +
        '<div class="event-card-body">' +
          '<a class="event-card-name" href="' + href + '">' + name + '</a>' +
          '<div class="banner-dates">' + sub + '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _chapters: function (d) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">The main story, chapter by chapter. Open one for every stage\'s briefing, ' +
        'cutscenes and first-clear rewards, the encounters between stages, the Critical Operation and the side missions.</p>' +
      '<div class="event-grid">' + d.chapters.map(function (c) {
        var n = c.stages.filter(function (s) { return s.kind === 'main'; }).length;
        return self._card(App.href('story', c.slug), c.image && self._img(c.image), null, self._esc(c.name) + ' · ' + self._esc(c.title),
          (c.date ? self._esc(c.date) + ' · ' : '') + n + ' stages');
      }).join('') + '</div>'
    );
  },

  // A main story stage by its ID, with its chapter.
  _stageAt: function (d, id) {
    for (var i = 0; i < d.chapters.length; i++) {
      var st = d.chapters[i].stages.find(function (x) { return x.id === id; });
      if (st) return { chapter: d.chapters[i], stage: st };
    }
    return null;
  },

  // What opens a side story: its banner starting, or a main story stage cleared. Some say nothing.
  _opens: function (s, d) {
    if (s.banner) {
      var banner = s.banner.name ? 'the ' + this._esc(s.banner.name) + ' banner' : 'its banner';
      return s.opens ? 'Opens ' + this._date(s.opens) + ' with ' + banner : 'Opens with ' + banner + ', not yet on global';
    }
    var at = s.unlock && this._stageAt(d, s.unlock.stage);
    return at ? 'Unlocks after Stage ' + this._esc(at.stage.code || '') + ' ' + this._esc(at.stage.name || '') : '';
  },

  _sideStories: function (d) {
    var self = this;
    return (
      '<p class="ac-section-footnote story-note">Each pilot\'s side story (Memory Pieces). Open one for every chapter\'s briefing, ' +
        'cutscenes and first-clear rewards.</p>' +
      '<div class="event-grid">' + d.sideStories.map(function (s) {
        var opens = self._opens(s, d);
        return self._card(App.href('story', s.slug), s.image && self._img(s.image), s.portrait,
          self._esc(s.name) + (s.title ? ' <span class="story-card-tagline">' + self._esc(s.title) + '</span>' : ''),
          s.stages.length + ' chapters' + (opens ? ' · ' + opens : ''));
      }).join('') + '</div>'
    );
  },

  // ── A chapter's or side story's own page (story/<slug>/) ────────────────
  _hero: function (back, title, image, intro) {
    return (
      '<a href="' + back + '" class="btn-back">&#8592; Back to Story</a>' +
      '<div class="listing-header"><h1>' + title + '</h1></div>' +
      (image ? '<img class="event-hero story-hero" src="' + this._img(image) + '" alt="" />' : '') +
      intro
    );
  },

  _chapterPage: function (c, d, kit) {
    var self = this;
    var main = c.stages.filter(function (s) { return s.kind !== 'side'; });
    var side = c.stages.filter(function (s) { return s.kind === 'side'; });
    var count = c.stages.filter(function (s) { return s.kind === 'main'; }).length;
    var i = d.chapters.indexOf(c);
    var nav = function (x, label) {
      return x ? '<a class="story-nav-link" href="' + App.href('story', x.slug) + '">' + label + '</a>' : '<span></span>';
    };
    return (
      this._hero(App.href('story'), this._esc(c.name) + ' · ' + this._esc(c.title), c.image,
        '<p class="dispatch-intro">' + (c.date ? this._esc(c.date) + ' · ' : '') + count + ' stages' +
          (side.length ? ', ' + side.length + ' side missions' : '') + '</p>' +
        (c.intro ? '<div class="story-page-intro skill-card lore-text">' + this._paras(c.intro) + '</div>' : '')) +
      '<div class="story-stages">' + main.map(function (s) { return self._stage(s, kit, 'ch-' + c.id); }).join('') + '</div>' +
      (side.length ? '<div class="story-side-title">Side Missions</div><div class="story-stages">' +
        side.map(function (s) { return self._stage(s, kit, 'ch-' + c.id); }).join('') + '</div>' : '') +
      '<div class="story-nav">' + nav(d.chapters[i - 1], '&#8592; ' + (d.chapters[i - 1] || {}).name) +
        nav(d.chapters[i + 1], (d.chapters[i + 1] || {}).name + ' &#8594;') + '</div>'
    );
  },

  _sidePage: function (s, d, kit) {
    var self = this;
    var p = kit.pilots[s.pilot];
    var pilot = p ? '<a href="' + App.href('pilots', p.PilotName) + '">' + this._esc(s.name) + '</a>' : this._esc(s.name);
    var opens = this._opens(s, d);
    var at = s.unlock && this._stageAt(d, s.unlock.stage);
    if (at) opens = '<a href="' + App.href('story', at.chapter.slug) + '#story-st-' + at.stage.id + '">' + opens + '</a>';
    return (
      // The title is a tagline for most pilots ("Pochy Battle Record: #1150907"), so it goes under the name.
      this._hero(App.href('story') + '#sidestories', this._esc(s.name), s.image,
        '<p class="dispatch-intro">' + (s.title ? '<span class="story-page-tagline">' + this._esc(s.title) + '</span>' : '') +
          pilot + '\'s side story · ' + s.stages.length + ' chapters' + (opens ? ' · ' + opens : '') + '</p>') +
      '<div class="story-stages">' + s.stages.map(function (st) { return self._stage(st, kit, 'ss-' + s.id); }).join('') + '</div>'
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

  // Tabs: Main Story, Side Stories, Border Conflict, then one per Skynet category (Lore.tabsHtml, js/lore.js).
  // The event stories are on each event's page (js/pages/events.js).
  _tabs: function (d) {
    var self = this;
    var links = {};
    d.world.forEach(function (c) { c.entries.forEach(function (e) { links[e.id] = true; }); });
    return Lore.tabsHtml([
      ['chapters', 'Main Story <small class="story-tab-n">' + d.chapters.length + '</small>', this._chapters(d)],
      ['sidestories', 'Side Stories <small class="story-tab-n">' + d.sideStories.length + '</small>', this._sideStories(d)],
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

  // The tabs, or with a slug a main story chapter's or side story's own page.
  _content: function (d, slug) {
    if (!slug) return this._tabs(d);
    var kit = this._kit();
    var c = d.chapters.find(function (x) { return x.slug === slug; });
    if (c) return this._chapterPage(c, d, kit);
    var s = d.sideStories.find(function (x) { return x.slug === slug; });
    return s ? this._sidePage(s, d, kit) : '<p class="text-danger">Story not found.</p>';
  },

  // Once drawn: the tab or stage the URL's anchor names ("story/#sidestories", "story/chapter-ii/#story-st-216").
  // app.js scrolls to it only when the page is drawn at once, not after its data loads.
  _anchor: function () {
    var id = window.location.hash.slice(1);
    var tab = id && $('#story-root [data-detail-tab="' + id + '"]');
    if (tab && tab.length) {
      Lore._show(tab.closest('.detail-tabs-wrap'), id);
      return;
    }
    var el = id && document.getElementById(id);
    if (el && $(el).closest('#story-root').length) el.scrollIntoView();
  },

  // param: a chapter's or side story's slug (its own page).
  render: function (param) {
    var self = this;
    var slug = param ? decodeURIComponent(param) : null;
    var body = window.StoryData ? this._content(window.StoryData, slug) : '<div class="lore-loading">Loading…</div>';
    if (!window.StoryData) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('story-root');
        if (!root || root.getAttribute('data-slug') !== (slug || '')) return;
        root.innerHTML = self._content(window.StoryData, slug);
        self._anchor();
      }, function () {
        var root = document.getElementById('story-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load the story. Try again later.</p>';
      });
    } else {
      setTimeout(function () { self._anchor(); }, 0);
    }
    return (
      (slug ? '' : '<div class="listing-header"><h1>Story</h1></div>' +
        '<p class="dispatch-intro">The world of Mecharashi and its stories, from the game\'s own text: every main story chapter and pilot ' +
          'side story with its stages and rewards, and the Skynet encyclopedia\'s places, factions, incidents and items. ' +
          'Event stories are on each <a href="' + App.href('events') + '">event</a>\'s page.</p>') +
      '<div id="story-root" data-slug="' + this._esc(slug || '') + '">' + body + '</div>'
    );
  },
};

// A cutscene loads its lines the first time it's opened. toggle doesn't bubble, so it's caught on the way down.
document.addEventListener('toggle', function (e) {
  if (e.target.classList && e.target.classList.contains('story-scene') && e.target.open) Pages.story._loadScene(e.target);
}, true);

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
