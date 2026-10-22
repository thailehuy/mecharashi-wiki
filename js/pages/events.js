var Pages = window.Pages || {};

// The Events page: every limited-time story event as a picture, newest first (a
// rerun is listed again, since its missions and shop are new). Each opens its own
// page (events/<slug>/) with tabs for its story, stage rewards, achievements,
// milestones, currencies and shop. Its data (data/events/events.js, built by
// scripts/build_events.py) is fetched the first time the page opens, with the
// Story page's (the story's briefings and cutscenes); reward chips are drawn as
// on the Story page.
Pages.events = {
  title: 'Events',
  _loading: null,

  _esc: function (s) { return $('<span>').text(s).html(); },

  // Mission titles mark stage names like "Clear <Champion>": highlighted as in the cutscenes.
  _text: function (s) {
    return this._esc(s).replace(/&lt;(.+?)&gt;/g, '<span class="story-dlg-hl">$1</span>');
  },

  _img: function (e) {
    return ASSET_BASE + 'data/events/' + encodeURIComponent(e.image) + '.jpg';
  },

  _when: function (e) {
    var story = Pages.story;
    if (!e.start) return 'Not yet run on global';
    if (e.permanent) return 'Permanent in Chronicles since ' + story._date(e.start);
    return story._date(e.start) + ' – ' + story._date(e.end);
  },

  _title: function (e) {
    return this._esc(e.name) + (e.rerun ? ' <span class="event-rerun">' + (e.rerun > 1 ? 'Rerun ' + e.rerun : 'Rerun') + '</span>' : '');
  },

  _rewards: function (label, rewards, kit) {
    var story = Pages.story;
    return '<div class="boss-drop-list story-rewards"><span class="boss-gear-label">' + label + '</span>' +
      rewards.map(function (r) { return story._reward(r, kit); }).join('') + '</div>';
  },

  _currencyIcon: function (c) {
    return c && c.icon ? '<img class="event-cur-icon" src="' + ASSET_BASE + 'data/items/' + encodeURIComponent(c.icon) +
      '.png" onerror="this.remove()" alt="" title="' + this._esc(c.name) + '" loading="lazy" />' : '';
  },

  // ── Listing ──────────────────────────────────────────────────────────────
  _card: function (e) {
    var href = App.href('events', e.slug);
    return (
      '<div class="event-card">' +
        '<a class="event-card-img" href="' + href + '">' +
          (e.image ? '<img src="' + this._img(e) + '" alt="' + this._esc(e.name) + '" loading="lazy" />' : '') +
          (!e.start ? '<span class="event-card-badge">Upcoming</span>'
            : e.permanent ? '<span class="event-card-badge event-card-badge-permanent">Permanent</span>' : '') +
        '</a>' +
        '<div class="event-card-body">' +
          '<a class="event-card-name" href="' + href + '">' + this._title(e) + '</a>' +
          '<div class="banner-dates">' + this._when(e) + '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _list: function (d) {
    var self = this;
    // Not yet run first, then newest first.
    var events = d.events.slice().sort(function (a, b) {
      return (b.start || '9999').localeCompare(a.start || '9999') || b.id - a.id;
    });
    return '<div class="event-grid">' + events.map(function (e) { return self._card(e); }).join('') + '</div>';
  },

  // ── An event ─────────────────────────────────────────────────────────────
  // The story's stages from the Story page's data (reruns are merged there by name), without the rewards,
  // which have their own tab.
  _story: function (e, kit) {
    var s = ((window.StoryData || {}).events || []).find(function (x) { return x.name === e.name; });
    if (!s) return '';
    var story = Pages.story;
    return (
      '<p class="ac-section-footnote story-note">Each stage\'s briefing and cutscenes. See also ' +
        '<a href="' + App.href('story') + '">Story</a>, with the main story and the pilots\' side stories.</p>' +
      s.parts.map(function (p) {
        return (s.parts.length > 1 ? '<div class="story-side-title">' + story._esc(p.name) + '</div>' : '') +
          '<div class="story-stages">' + p.stages.map(function (st) {
            var bare = $.extend({}, st);
            delete bare.rewards;
            delete bare.tiers;
            return story._stage(bare, kit, 'ev-' + s.id);
          }).join('') + '</div>';
      }).join('')
    );
  },

  _stageHead: function (st) {
    var esc = this._esc;
    return (
      '<div class="story-stage-head">' +
        (st.code ? '<span class="story-stage-code">' + esc(st.code) + '</span>' : '') +
        '<span class="story-stage-name">' + esc(st.name) + '</span>' +
        (st.location ? '<span class="story-stage-meta"><i class="bi bi-geo-alt"></i>' + esc(st.location) + '</span>'
          : st.subtitle ? '<span class="story-stage-meta">' + esc(st.subtitle) + '</span>' : '') +
      '</div>'
    );
  },

  // Stage groups ("Story Stages", "Challenge Stages"...), each stage drawn by `body`; stages it draws nothing for are left out.
  _groups: function (e, body) {
    var self = this;
    return e.stages.map(function (g) {
      var stages = g.stages.map(function (st) {
        var html = body(st);
        return html ? '<div class="story-stage skill-card">' + self._stageHead(st) + html + '</div>' : '';
      }).join('');
      return stages ? '<div class="story-side-title">' + self._esc(g.name) + '</div><div class="story-stages">' + stages + '</div>' : '';
    }).join('');
  },

  _stageRewards: function (e, kit) {
    var self = this;
    return this._groups(e, function (st) {
      return (st.tiers || []).filter(function (t) { return t.rewards.length; }).map(function (t) {
        return self._rewards(t.name ? self._esc(t.name) : 'Clear rewards', t.rewards, kit);
      }).join('');
    });
  },

  _achievements: function (e, kit) {
    var self = this;
    return this._groups(e, function (st) {
      return (st.tiers || []).filter(function (t) { return t.achievements.length; }).map(function (t) {
        return (t.name ? '<div class="story-part-title">' + self._esc(t.name) + '</div>' : '') +
          '<ul class="elite-achs">' + t.achievements.map(function (a) {
            return (
              '<li><div><b>' + self._esc(a.name) + '</b> <span class="elite-ach-text">' + self._esc(a.text) + '</span></div>' +
                (a.rewards.length ? self._rewards('Reward', a.rewards, kit) : '') + '</li>'
            );
          }).join('') + '</ul>';
      }).join('');
    });
  },

  _milestones: function (e, kit) {
    var self = this;
    return e.milestones.map(function (g, i) {
      return (
        '<details class="story-chapter"' + (i ? '' : ' open') + '>' +
          '<summary class="boss-group-head"><h3>' + self._esc(g.name) + '</h3>' +
            '<span class="story-chapter-sub">' + (g.level ? 'Unlocks at Command Lv. ' + g.level + ' · ' : '') +
              g.missions.length + ' missions</span></summary>' +
          '<ul class="elite-achs event-missions">' + g.missions.map(function (m) {
            return (
              '<li class="skill-card"><div><b>' + self._text(m.title) + '</b>' +
                (m.text ? ' <span class="elite-ach-text">' + self._text(m.text) + '</span>' : '') + '</div>' +
                (m.steps ? '<ul class="event-steps">' + m.steps.map(function (s) { return '<li>' + self._text(s) + '</li>'; }).join('') + '</ul>' : '') +
                (m.rewards.length ? self._rewards('Reward', m.rewards, kit) : '') + '</li>'
            );
          }).join('') + '</ul>' +
        '</details>'
      );
    }).join('');
  },

  _currencies: function (e) {
    var self = this;
    return '<div class="event-currencies">' + e.currencies.map(function (c) {
      return (
        '<div class="skill-card event-currency">' +
          self._currencyIcon(c) +
          '<div><div class="event-currency-name">' + self._esc(c.name) + '</div>' +
            (c.use ? '<div class="event-currency-use">' + self._esc(c.use) + '</div>' : '') +
            (c.text ? '<div class="event-currency-text">' + self._esc(c.text) + '</div>' : '') +
          '</div>' +
        '</div>'
      );
    }).join('') + '</div>';
  },

  _shops: function (e, kit) {
    var self = this;
    var cur = {};
    e.currencies.forEach(function (c) { cur[c.type] = c; });
    var num = function (n) { return n.toLocaleString('en-US'); };
    return e.shops.map(function (s) {
      var rows = s.items.map(function (it) {
        var c = cur[it.currency];
        var limit = it.limit ? num(it.limit) + (it.resets ? ' <small>(' + it.resets + ')</small>' : '') : '—';
        return (
          '<tr>' +
            (s.random ? '<td>' + (it.pool || '') + '</td>' : '') +
            '<td class="shop-mods-cell"><div class="boss-drop-list">' + Pages.story._reward(it.item, kit) + '</div></td>' +
            '<td class="event-price">' + self._currencyIcon(c) + num(it.price) + (c && !c.icon ? ' ' + self._esc(c.name) : '') + '</td>' +
            '<td>' + limit + '</td>' +
          '</tr>'
        );
      }).join('');
      var refresh = s.refresh && cur[s.refresh];
      return (
        '<div class="ac-section">' +
          '<h2 class="ac-section-title shop-section-title">' + self._esc(s.name) + '</h2>' +
          (s.random ? '<p class="dispatch-intro">' + (s.text ? self._esc(s.text) + ' ' : '') +
            'Each refresh offers one B-Box from each pool' + (refresh ? '; refreshing costs ' + self._esc(refresh.name) : '') + '.</p>' : '') +
          '<div class="dispatch-table-wrap"><table class="dispatch-table event-shop">' +
            '<thead><tr>' + (s.random ? '<th>Pool</th>' : '') + '<th>Item</th><th>Price</th><th>Limit</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table></div>' +
        '</div>'
      );
    }).join('');
  },

  _detail: function (e) {
    var kit = Pages.story._kit();
    var count = function (n, what) { return what + ' <small class="story-tab-n">' + n + '</small>'; };
    var achs = 0, missions = 0;
    e.stages.forEach(function (g) {
      g.stages.forEach(function (st) { (st.tiers || []).forEach(function (t) { achs += t.achievements.length; }); });
    });
    e.milestones.forEach(function (g) { missions += g.missions.length; });
    return Lore.tabsHtml([
      ['story', 'Story', this._story(e, kit)],
      ['rewards', 'Rewards', this._stageRewards(e, kit)],
      ['achievements', count(achs, 'Achievements'), achs ? this._achievements(e, kit) : ''],
      ['milestones', count(missions, 'Milestones'), missions ? this._milestones(e, kit) : ''],
      ['currency', 'Currency', e.currencies.length ? this._currencies(e) : ''],
      ['shop', 'Shop', e.shops.length ? this._shops(e, kit) : ''],
    ]);
  },

  _head: function (e) {
    return (
      '<a href="' + App.href('events') + '" class="btn-back">&#8592; Back to Events</a>' +
      '<div class="listing-header"><h1>' + this._title(e) + '</h1></div>' +
      (e.image ? '<img class="event-hero" src="' + this._img(e) + '" alt="" />' : '') +
      '<p class="dispatch-intro">' + this._when(e) + '. The event\'s story, every stage\'s clear rewards and achievements, ' +
        'its missions and what each gives, its currencies and its shop.</p>'
    );
  },

  _load: function () {
    var self = this;
    if (window.EventsData && window.StoryData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      var own = window.EventsData ? $.Deferred().resolve().promise()
        : $.ajax({ url: 'data/events/events.js', dataType: 'script', cache: true });
      this._loading = $.when(own, Pages.story._load()).fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  // param: an event's slug (its own page).
  render: function (param) {
    var self = this;
    var slug = param ? decodeURIComponent(param) : null;
    var content = function () {
      if (!slug) return self._list(window.EventsData);
      var e = window.EventsData.events.find(function (x) { return x.slug === slug; });
      return e ? self._head(e) + self._detail(e) : '<p class="text-danger">Event not found.</p>';
    };
    var ready = window.EventsData && window.StoryData;
    if (!ready) {
      // The page may have moved on by the time the data arrived.
      this._load().then(function () {
        var root = document.getElementById('events-root');
        if (root && root.getAttribute('data-slug') === (slug || '')) root.innerHTML = content();
      }, function () {
        var root = document.getElementById('events-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load the events. Try again later.</p>';
      });
    }
    var body = ready ? content() : '<div class="lore-loading">Loading…</div>';
    return (
      (slug ? '' : '<div class="listing-header"><h1>Events</h1></div>' +
        '<p class="dispatch-intro">Every limited-time story event, newest first. A rerun is listed again, with its own missions and shop. ' +
          'Open one for its story, stage rewards, achievements, milestones, currencies and shop.</p>') +
      '<div id="events-root" data-slug="' + this._esc(slug || '') + '">' + body + '</div>'
    );
  },
};

window.Pages = Pages;
