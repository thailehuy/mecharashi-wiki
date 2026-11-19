// Detail-page tabs (Skills / Neural Drive / Lore / Voice Lines on pilots,
// Modules / Color Scheme / Lore on STs) and the Lore and Color Scheme tabs
// themselves. Lore lives in its own bundle per kind (data/<kind>/lore.js, built
// by scripts/compile.py), fetched the first time a Lore tab is opened; an ST's
// entry there also holds its default paint for the Color Scheme tab. The Voice
// Lines tab (js/voice.js) loads the same way from data/pilots/voice.js.
var Lore = {
  BUNDLES: { pilots: 'PilotLoreData', mechs: 'MechLoreData' },
  _loading: {},

  // tabs: [[key, label, html], ...]; tabs with no html are left out. The
  // first tab is open. lore: { kind, id } for the Lore and Voice Lines tabs'
  // content.
  tabsHtml: function (tabs, lore) {
    tabs = tabs.filter(function (t) { return t[2]; });
    return (
      '<div class="detail-tabs-wrap">' +
        '<div class="detail-tabs" role="tablist">' + tabs.map(function (t, i) {
          return '<button type="button" class="detail-tab' + (i ? '' : ' active') + '" role="tab" data-detail-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        tabs.map(function (t, i) {
          var loreAttr = t[0] === 'lore' || t[0] === 'paint' || t[0] === 'links' ? ' data-lore-kind="' + lore.kind + '" data-lore-id="' + lore.id + '" data-lore-view="' + t[0] + '"' :
                         t[0] === 'voice' ? ' data-voice-id="' + lore.id + '"' : '';
          return '<div class="detail-tab-pane" role="tabpanel" data-detail-pane="' + t[0] + '"' + loreAttr + (i ? ' hidden' : '') + '>' + t[2] + '</div>';
        }).join('') +
      '</div>'
    );
  },

  loadingHtml: '<div class="lore-loading">Loading…</div>',

  _show: function ($wrap, tab) {
    // Only this tab set's own tabs and panes: a pane can hold tabs of its own (Refactor-in-Crisis's themes).
    var own = function () { return $(this).closest('.detail-tabs-wrap')[0] === $wrap[0]; };
    $wrap.find('[data-detail-tab]').filter(own).each(function () { $(this).toggleClass('active', this.getAttribute('data-detail-tab') === tab); });
    $wrap.find('[data-detail-pane]').filter(own).each(function () { this.hidden = this.getAttribute('data-detail-pane') !== tab; });
    var pane = $wrap.find('[data-detail-pane="' + tab + '"]').filter(own)[0];
    if (pane && pane.hasAttribute('data-lore-kind')) this._fill(pane);
    if (pane && pane.hasAttribute('data-voice-id')) Voice.fill(pane);
    // Leaving the Voice Lines tab stops whatever it was playing.
    if (window.Voice) Voice.stop();
  },

  _load: function (kind) {
    var self = this;
    if (window[this.BUNDLES[kind]]) return $.Deferred().resolve().promise();
    if (!this._loading[kind]) {
      this._loading[kind] = $.ajax({ url: 'data/' + kind + '/lore.js', dataType: 'script', cache: true })
        .fail(function () { self._loading[kind] = null; });
    }
    return this._loading[kind];
  },

  _fill: function (pane) {
    var self = this;
    if (pane.hasAttribute('data-filled')) return;
    var kind = pane.getAttribute('data-lore-kind');
    var id   = pane.getAttribute('data-lore-id');
    this._load(kind).then(function () {
      // The page may have moved on by the time the bundle arrived.
      if (!pane.isConnected) return;
      pane.setAttribute('data-filled', '');
      var entry = (window[self.BUNDLES[kind]] || {})[id];
      var view = pane.getAttribute('data-lore-view');
      pane.innerHTML = view === 'paint' ? self.renderPaint(entry && entry.paint) :
                       view === 'links' ? self.renderLinks(entry && entry.links) : self.render(entry);
    }, function () {
      if (pane.isConnected) pane.innerHTML = '<p class="text-danger">Couldn\'t load this tab. Try again later.</p>';
    });
  },

  render: function (lore) {
    function esc(s) { return $('<span>').text(s).html(); }
    function paras(s) {
      return s.split(/\n+/).filter(Boolean).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }
    // An ST entry can hold just its paint (lore.paint), with no lore of its own.
    if (!lore || !lore.profile) return '<p class="lore-empty">No lore for this one yet.</p>';

    var profileHtml = (lore.profile || []).length
      ? '<dl class="lore-profile skill-card">' + lore.profile.map(function (r) {
          return '<div class="lore-profile-row"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>';
        }).join('') + '</dl>'
      : '';

    var introHtml = lore.introduction
      ? '<div class="lore-intro skill-card"><div class="lore-card-title">Introduction</div><div class="lore-text">' + paras(lore.introduction) + '</div></div>'
      : '';

    var pilots = (window.PilotsData || {}).pilots || [];
    var storiesHtml = (lore.stories || []).map(function (st, i) {
      var c = st.comment;
      var byHtml = '';
      if (c && c.by) {
        var by = pilots.find(function (pl) { return pl.PilotName === c.by; });
        byHtml = '<div class="lore-comment-by">— ' + (by ? '<a href="' + App.href('pilots', by.PilotName) + '">' + esc(c.by) + '</a>' : esc(c.by)) + '</div>';
      }
      return (
        '<div class="lore-story skill-card">' +
          '<div class="lore-card-title"><span class="lore-story-num">' + (i + 1) + '</span>' + esc(st.title) + '</div>' +
          '<div class="lore-text">' + paras(st.text) + '</div>' +
          (c ? '<blockquote class="lore-comment">' + paras(c.text) + byHtml + '</blockquote>' : '') +
        '</div>'
      );
    }).join('');

    var cnHtml = lore.cn ? '<p class="lore-note">Not on Global yet: the text is the CN client\'s, untranslated.</p>' : '';

    return (
      cnHtml +
      '<div class="lore-top">' + profileHtml + introHtml + '</div>' +
      (storiesHtml ? '<div class="section-heading lore-heading">Stories</div><div class="lore-stories">' + storiesHtml + '</div>' : '')
    );
  },

  // A pilot's Link tab (CN v4.0, data/db/pilot_links.json via scripts/build_links.py):
  // the pilot's Storm Particle Tide, the pilot's Link with its three
  // conversations (answered in order to activate it), and the Resonance
  // Interface board (the same 15 nodes for every pilot that has one).
  LINK_BOARD: [
    ['Parameter Upgrade 1', 'All six pilot attributes +1%.', 20, 0],
    ['Aptitude Activation 1', 'Tide aptitude 1: on a map with the pilot\'s Storm Particle Tide, Tide damage bonus 5% and Tide damage reduction 5%.', 100, 0],
    ['Parameter Upgrade 2', 'All six pilot attributes +1%.', 30, 0],
    ['Link Connection 1', 'Unlocks a Link slot.', 0, 100],
    ['Parameter Upgrade 3', 'All six pilot attributes +1%.', 40, 0],
    ['Parameter Upgrade 4', 'All six pilot attributes +1%.', 50, 0],
    ['Parameter Upgrade 5', 'All six pilot attributes +1%.', 60, 0],
    ['Skill Expansion', 'The pilot\'s R&D skill slot can equip the pilot\'s own skills.', 0, 100],
    ['Parameter Upgrade 6', 'All six pilot attributes +1%.', 70, 0],
    ['Aptitude Activation 2', 'Tide aptitude 2: on a map with the pilot\'s Storm Particle Tide, Tide damage bonus 10% and Tide damage reduction 10%.', 350, 0],
    ['Parameter Upgrade 7', 'All six pilot attributes +1%.', 80, 0],
    ['Link Connection 2', 'Unlocks a second Link slot.', 0, 100],
    ['Parameter Upgrade 8', 'All six pilot attributes +1%.', 100, 0],
    ['Parameter Upgrade 9', 'All six pilot attributes +1%.', 200, 0],
    ['Parameter Upgrade 10', 'All six pilot attributes +1%.', 300, 0]
  ],

  renderLinks: function (links) {
    function esc(s) { return $('<span>').text(s).html(); }
    function paras(s) {
      return s.split(/\n+/).filter(Boolean).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }
    if (!links) return '<p class="lore-empty">No Link for this pilot.</p>';
    var html = '<p class="lore-note">CN v4.0, not on Global yet. Link names, items, stories and conversations are the CN client\'s, untranslated.</p>';

    if (links.tide) {
      html += '<p class="link-tide">Storm Particle Tide aptitude: <strong>' + esc(links.tide) + '</strong></p>';
    }

    var boardHtml = '';
    if (links.board) {
      var rows = this.LINK_BOARD.map(function (n, i) {
        var cost = n[2] ? n[2] + ' Resonance Base Part' : n[3] + ' Resonance Core';
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(n[0]) + '</td><td>' + esc(n[1]) + '</td><td class="text-nowrap">' + esc(cost) + '</td></tr>';
      }).join('');
      boardHtml =
        '<div class="section-heading lore-heading">Resonance Interface</div>' +
        '<p class="link-hint">Opens when the pilot\'s chip boost reaches 120%. Nodes unlock in order. Total: 1,400 Resonance Base Parts and 300 Resonance Cores.</p>' +
        '<div class="table-responsive skill-card"><table class="table table-dark table-sm link-board mb-0"><thead><tr><th>#</th><th>Node</th><th>Effect</th><th>Cost</th></tr></thead><tbody>' +
        rows + '</tbody></table></div>';
    }

    var l = links.link;
    if (l) {
      var lv = l.levels.map(function (e, i) {
        return '<div class="link-level"><span class="link-level-num">' + (l.levels.length > 1 ? 'Lv ' + (i + 1) : 'Effect') + '</span>' +
          '<span class="link-level-name">' + esc(e.name) + '</span> ' + esc(e.text) + '</div>';
      }).join('');
      var talks = l.talks.map(function (t, i) {
        return (
          '<div class="link-talk skill-card">' +
            '<div class="lore-card-title"><span class="lore-story-num">' + (i + 1) + '</span>Conversation ' + (i + 1) + '</div>' +
            '<div class="lore-text">' + t.lines.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>' +
            '<ul class="link-options">' + t.options.map(function (o) {
              return '<li class="link-option' + (o.correct ? ' link-option-correct' : '') + '">' +
                '<div class="link-option-text">' + (o.correct ? '<i class="bi bi-check-circle-fill"></i> ' : '<i class="bi bi-x-circle"></i> ') + esc(o.text) + '</div>' +
                '<div class="link-option-reply">' + o.reply.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div></li>';
            }).join('') + '</ul>' +
          '</div>'
        );
      }).join('');
      html +=
        '<div class="section-heading lore-heading">' + esc(l.name) + '</div>' +
        '<div class="lore-top">' +
          '<div class="skill-card">' +
            '<div class="lore-card-title">' + esc(l.item) + '</div>' +
            lv +
            '<div class="link-cost">Activation: 1 ' + l.cost.map(esc).join(' or 1 ') + '</div>' +
          '</div>' +
          '<div class="skill-card"><div class="lore-card-title">Item Story</div><div class="lore-text">' + paras(l.story) + '</div></div>' +
        '</div>' +
        boardHtml +
        '<div class="section-heading lore-heading">Activation</div>' +
        '<p class="link-hint">Answer the three conversations in order to activate the Link.</p>' +
        '<div class="lore-stories">' + talks + '</div>';
    } else {
      html += boardHtml;
    }

    return html;
  },

  // An ST's default paint (data/db/mech_paint.json): one card per scheme (the
  // ST's own, then the weapons' and the backpack's shared factory finish), a
  // row per part and a column per coloring zone.
  renderPaint: function (paint) {
    function esc(s) { return $('<span>').text(s).html(); }
    if (!paint) return '<p class="lore-empty">No color scheme for this one yet.</p>';
    var groups = paint.groups.map(function (g) {
      var zones = Math.max.apply(null, g.parts.map(function (p) { return p.colors.length; }));
      var head = '<th scope="col">Part</th>';
      for (var i = 1; i <= zones; i++) head += '<th scope="col">Zone ' + i + '</th>';
      var rows = g.parts.map(function (p) {
        var cells = '';
        for (var i = 0; i < zones; i++) cells += '<td>' + (p.colors[i] ? esc(p.colors[i]) : '') + '</td>';
        return '<tr><th scope="row">' + esc(p.part) + '</th>' + cells + '</tr>';
      }).join('');
      return (
        '<div class="paint-group skill-card">' +
          '<div class="lore-card-title">' + esc(g.kind) + (g.scheme ? '<span class="paint-scheme">' + esc(g.scheme) + '</span>' : '') + '</div>' +
          (g.desc ? '<div class="lore-text"><p>' + esc(g.desc) + '</p></div>' : '') +
          '<div class="paint-table-wrap"><table class="paint-table"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '</div>'
      );
    }).join('');
    var cnHtml = paint.cn ? '<p class="lore-note">Not on Global yet: these are the CN client\'s, and colors Global doesn\'t have yet are untranslated.</p>' : '';
    return cnHtml + '<div class="paint-groups">' + groups + '</div>';
  }
};

$(document).on('click', '[data-detail-tab]', function () {
  Lore._show($(this).closest('.detail-tabs-wrap'), this.getAttribute('data-detail-tab'));
});

window.Lore = Lore;
