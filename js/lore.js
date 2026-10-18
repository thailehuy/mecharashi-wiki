// Detail-page tabs (Skills / Neural Drive / Lore on pilots, Modules / Lore on
// STs) and the Lore tab itself. Lore lives in its own bundle per kind
// (data/<kind>/lore.js, built by scripts/compile.py), fetched the first time
// a Lore tab is opened.
var Lore = {
  BUNDLES: { pilots: 'PilotLoreData', mechs: 'MechLoreData' },
  _loading: {},

  // tabs: [[key, label, html], ...]; tabs with no html are left out. The
  // first tab is open. lore: { kind, id } for the Lore tab's content.
  tabsHtml: function (tabs, lore) {
    tabs = tabs.filter(function (t) { return t[2]; });
    return (
      '<div class="detail-tabs-wrap">' +
        '<div class="detail-tabs" role="tablist">' + tabs.map(function (t, i) {
          return '<button type="button" class="detail-tab' + (i ? '' : ' active') + '" role="tab" data-detail-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') + '</div>' +
        tabs.map(function (t, i) {
          var loreAttr = t[0] === 'lore' ? ' data-lore-kind="' + lore.kind + '" data-lore-id="' + lore.id + '"' : '';
          return '<div class="detail-tab-pane" role="tabpanel" data-detail-pane="' + t[0] + '"' + loreAttr + (i ? ' hidden' : '') + '>' + t[2] + '</div>';
        }).join('') +
      '</div>'
    );
  },

  loadingHtml: '<div class="lore-loading">Loading…</div>',

  _show: function ($wrap, tab) {
    $wrap.find('[data-detail-tab]').each(function () { $(this).toggleClass('active', this.getAttribute('data-detail-tab') === tab); });
    $wrap.find('[data-detail-pane]').each(function () { this.hidden = this.getAttribute('data-detail-pane') !== tab; });
    var pane = $wrap.find('[data-detail-pane="' + tab + '"]')[0];
    if (pane && pane.hasAttribute('data-lore-kind')) this._fill(pane);
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
      pane.innerHTML = self.render((window[self.BUNDLES[kind]] || {})[id]);
    }, function () {
      if (pane.isConnected) pane.innerHTML = '<p class="text-danger">Couldn\'t load the lore. Try again later.</p>';
    });
  },

  render: function (lore) {
    function esc(s) { return $('<span>').text(s).html(); }
    function paras(s) {
      return s.split(/\n+/).filter(Boolean).map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }
    if (!lore) return '<p class="lore-empty">No lore for this one yet.</p>';

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

    return (
      '<div class="lore-top">' + profileHtml + introHtml + '</div>' +
      (storiesHtml ? '<div class="section-heading lore-heading">Stories</div><div class="lore-stories">' + storiesHtml + '</div>' : '')
    );
  }
};

$(document).on('click', '[data-detail-tab]', function () {
  Lore._show($(this).closest('.detail-tabs-wrap'), this.getAttribute('data-detail-tab'));
});

window.Lore = Lore;
