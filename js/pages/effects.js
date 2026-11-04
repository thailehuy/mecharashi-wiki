var Pages = window.Pages || {};

// The Effects page (a Misc. page), in three sub pages: Buffs (effects/buffs/),
// Debuffs (effects/debuffs/) and Other effects (effects/other/); effects/ shows
// Buffs. Every effect keyword of the glossary plus the effects boss skills
// explain, one per name, sorted by the game's own buff type, each with every
// pilot, ST, weapon, backpack and boss that carries it in a popup, with the
// skill it carries it through. Its data (data/effects/effects.js, built by
// scripts/build_effects.py) is fetched the first time the page opens.
var EFFECT_KINDS = [
  ['buffs', 'buff', 'Buffs'],
  ['debuffs', 'debuff', 'Debuffs'],
  ['other', 'other', 'Other effects'],
];
var EFFECT_CARRIER_TYPES = [
  ['pilot', 'Pilots', 'pilot', 'pilots'],
  ['st', 'STs', 'ST', 'STs'],
  ['weapon', 'Weapons', 'weapon', 'weapons'],
  ['backpack', 'Backpacks', 'backpack', 'backpacks'],
  ['boss', 'Bosses', 'boss', 'bosses'],
];
var EFFECT_INTROS = {
  buffs: 'Effects the game classes as buffs (its Enhance and Cure types).',
  debuffs: 'Effects the game classes as debuffs (its Weak type).',
  other: 'Effects the game classes as neither a buff nor a debuff: special states and mechanics such as Re-ATK and Guard, ' +
    'and effects missing from the global client.',
};

Pages.effects = {
  title: 'Effects',
  nav: 'glossary',
  _loading: null,
  _query: '',
  _types: {},
  _tab: 'buffs',

  _esc: function (s) { return $('<span>').text(s == null ? '' : s).html(); },

  _load: function () {
    var self = this;
    if (window.EffectsData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/effects/effects.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  _kind: function () {
    var tab = this._tab;
    return EFFECT_KINDS.find(function (k) { return k[0] === tab; });
  },

  // "12 pilots · 3 STs" for a row.
  _counts: function (b) {
    var n = {};
    b.carriers.forEach(function (c) { n[c.t] = (n[c.t] || 0) + 1; });
    var parts = EFFECT_CARRIER_TYPES.filter(function (t) { return n[t[0]]; }).map(function (t) {
      return '<span class="buff-count"><b>' + n[t[0]] + '</b> ' + (n[t[0]] === 1 ? t[2] : t[3]) + '</span>';
    });
    return parts.length ? parts.join('') : '<span class="buff-none">—</span>';
  },

  _visible: function (b) {
    if (b.kind !== this._kind()[1]) return false;
    var q = this._query.trim().toLowerCase();
    if (q && b.name.toLowerCase().indexOf(q) === -1) return false;
    var types = Object.keys(this._types).filter(function (k) { return this._types[k]; }, this);
    if (types.length && !b.carriers.some(function (c) { return types.indexOf(c.t) !== -1; })) return false;
    return true;
  },

  // An effect's text, and the other wordings it has under other buff IDs.
  _effect: function (b) {
    return Glossary.parseEffects(b.effect || '') + (b.variants ? b.variants.map(function (v) {
      return '<div class="buff-variant"><span class="buff-variant-label">Variant</span> ' + Glossary.parseEffects(v) + '</div>';
    }).join('') : '');
  },

  // A row per effect; an effect's numbered versions sit together, joined by a bar on the left.
  _rows: function (all) {
    var self = this;
    var shown = all.filter(this._visible, this);
    $('#buff-count').text(shown.length);
    if (!shown.length) return '<tr><td colspan="3" class="buff-empty">No effect matches.</td></tr>';
    return shown.map(function (b, i) {
      var prev = shown[i - 1], next = shown[i + 1];
      var fam = b.fam ? ' buff-fam' +
        (prev && prev.fam === b.fam ? '' : ' buff-fam-first') +
        (next && next.fam === b.fam ? '' : ' buff-fam-last') : '';
      return (
        '<tr class="buff-row' + fam + (b.carriers.length ? ' buff-row-open' : '') + '" data-effect="' + all.indexOf(b) + '"' +
          (b.carriers.length ? ' tabindex="0" role="button"' : '') + '>' +
          '<td class="buff-name"><span>' + self._esc(b.name) + '</span>' +
            (b.boss ? '<span class="tag buff-boss-tag" title="Explained by a boss skill; not in the glossary">Boss</span>' : '') + '</td>' +
          '<td class="buff-effect">' + self._effect(b) + '</td>' +
          '<td class="buff-carriers">' + self._counts(b) + '</td>' +
        '</tr>'
      );
    }).join('');
  },

  // ── The popup ──────────────────────────────────────────────────────────
  _unitHead: function (c) {
    var esc = this._esc, img = '', href = null;
    if (c.t === 'pilot') {
      var p = ((window.PilotsData || {}).pilots || []).find(function (x) { return x.PilotName === c.u; });
      if (p) { img = LOCAL_AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png'; href = App.href('pilots', c.u); }
    } else if (c.t === 'st') {
      var m = ((window.MechsData || {}).mechs || []).find(function (x) { return x.name === c.u; });
      if (m) { img = mechIconSrc(m); href = App.href('sts', c.u); }
    } else if (c.t === 'weapon') {
      var w = ((window.WeaponsData || {}).weapons || []).find(function (x) { return x.name === c.u; });
      if (w) { img = weaponIconSrc(w); href = App.href('weapons', c.u); }
    } else if (c.t === 'backpack') {
      var bp = ((window.BackpacksData || {}).backpacks || []).find(function (x) { return x.name === c.u; });
      if (bp) { img = BACKPACK_ICON_BASE + encodeURIComponent(bp.icon) + '.png'; href = App.href('backpacks', backpackSlug(bp)); }
    } else if (c.t === 'boss') {
      var boss = ((window.BossesData || {}).bosses || {})[c.u];
      if (boss && boss.portrait) img = ASSET_BASE + boss.portrait;
    }
    var name = href ? '<a href="' + href + '">' + esc(c.u) + '</a>' : esc(c.u);
    return (img ? '<img class="buff-unit-img buff-unit-img-' + c.t + '" src="' + img + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'" />' : '') +
      '<span class="buff-unit-name">' + name + '</span>';
  },

  _where: function (w) {
    var page = w.m === 'AC' ? 'armedconquest' : 'clearanceops';
    return '<a class="buff-where" href="' + App.href(page, w.name) + '#stage-' + w.slot + '" title="' + this._esc(w.name) + '">' +
      w.m + w.n + '</a>';
  },

  _unit: function (c) {
    var self = this;
    return (
      '<li class="buff-unit">' +
        '<div class="buff-unit-head">' + this._unitHead(c) + '</div>' +
        '<ul class="buff-unit-skills">' + c.s.map(function (s) {
          return '<li><span class="buff-src">' + self._esc(s.k) + '</span> ' + self._esc(s.n) +
            (s.w ? ' <span class="buff-wheres">' + s.w.map(self._where, self).join('') + '</span>' : '') + '</li>';
        }).join('') + '</ul>' +
      '</li>'
    );
  },

  _popup: function (b) {
    var self = this;
    var body = EFFECT_CARRIER_TYPES.map(function (t) {
      var units = b.carriers.filter(function (c) { return c.t === t[0]; });
      if (!units.length) return '';
      return '<div class="buff-pop-group"><h6>' + t[1] + ' <span class="buff-pop-n">' + units.length + '</span></h6>' +
        '<ul class="buff-units">' + units.map(self._unit, self).join('') + '</ul></div>';
    }).join('');

    var $modal = $('#effect-modal');
    if (!$modal.length) {
      $modal = $(
        '<div class="modal fade buff-modal" id="effect-modal" tabindex="-1" aria-hidden="true" data-bs-theme="dark">' +
          '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<h5 class="modal-title"></h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
              '</div>' +
              '<div class="modal-body"></div>' +
            '</div>' +
          '</div>' +
        '</div>'
      ).appendTo('body');
      // A link inside goes to another page: close first so the backdrop doesn't stay.
      $modal.on('click', 'a[href]', function () { bootstrap.Modal.getOrCreateInstance($modal[0]).hide(); });
    }
    $modal.find('.modal-title').text(b.name);
    $modal.find('.modal-body').html('<div class="buff-pop-effect">' + this._effect(b) + '</div>' + body);
    bootstrap.Modal.getOrCreateInstance($modal[0]).show();
  },

  // ── Page ───────────────────────────────────────────────────────────────
  _content: function (d) {
    var self = this;
    var typeBtns = EFFECT_CARRIER_TYPES.map(function (t) {
      return '<button class="filter-btn filter-occ' + (self._types[t[0]] ? ' active' : '') + '" data-effect-type="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    return (
      '<div class="search-box-wrap">' +
        '<input type="text" class="search-box" id="effect-search" placeholder="Search by name..." value="' + this._esc(this._query) + '" />' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-group"><span class="filter-label">Carried by</span><div class="filter-values">' + typeBtns + '</div></div>' +
      '</div>' +
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table buff-table">' +
          '<thead><tr><th>Name</th><th>Effect</th><th>Carried by</th></tr></thead>' +
          '<tbody id="effect-rows">' + this._rows(d.effects) + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  _bind: function () {
    var self = this;
    var all = function () { return window.EffectsData.effects; };
    var redraw = function () { $('#effect-rows').html(self._rows(all())); };
    $(document).off('.effects');
    $(document).on('input.effects', '#effect-search', function () { self._query = $(this).val(); redraw(); });
    $(document).on('click.effects', '[data-effect-type]', function () {
      var t = $(this).data('effect-type');
      self._types[t] = !self._types[t];
      $(this).toggleClass('active', self._types[t]);
      redraw();
    });
    $(document).on('click.effects keydown.effects', '.buff-row-open', function (e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if ($(e.target).closest('a, .kw').length) return;
      e.preventDefault();
      self._popup(all()[+$(this).data('effect')]);
    });
  },

  _filled: function () {
    var root = document.getElementById('effect-root');
    if (!root || root.getAttribute('data-tab') !== this._tab) return;
    root.innerHTML = this._content(window.EffectsData);
    $('#buff-count').text(window.EffectsData.effects.filter(this._visible, this).length);
    this._bind();
  },

  // param: the sub page (buffs, debuffs or other); none is Buffs.
  render: function (param) {
    var self = this;
    var tab = param ? decodeURIComponent(param) : 'buffs';
    if (!EFFECT_KINDS.some(function (k) { return k[0] === tab; })) {
      return '<p class="text-danger">Page not found. <a href="' + App.href('effects') + '">Back to Effects</a></p>';
    }
    this._tab = tab;
    var kind = this._kind();
    var tabs = EFFECT_KINDS.map(function (k) {
      return '<a class="effect-tab' + (k[0] === tab ? ' active' : '') + '" href="' + App.href('effects', k[0]) + '">' + k[2] + '</a>';
    }).join('');

    if (window.EffectsData) {
      setTimeout(function () { self._bind(); });
    } else {
      this._load().then(function () { self._filled(); }, function () {
        var root = document.getElementById('effect-root');
        if (root) root.innerHTML = '<p class="text-danger">Couldn\'t load the effects. Try again later.</p>';
      });
    }
    return (
      '<a href="' + App.href('glossary') + '" class="btn-back">&#8592; Back to Glossary</a>' +
      '<div class="listing-header d-flex align-items-center"><h1>Effects</h1></div>' +
      '<nav class="effect-tabs">' + tabs + '</nav>' +
      '<p class="dispatch-intro">' + EFFECT_INTROS[tab] + ' One row per name, from the glossary\'s keywords and the effects ' +
        'only boss skills explain (tagged Boss). Numbered versions sit together, joined by a bar on the left. ' +
        'Click a row to see every pilot, ST, weapon, backpack and boss that carries it, and through which skill.</p>' +
      '<h2 class="effect-sub-title">' + kind[2] + ' <span class="badge bg-secondary" id="buff-count">' +
        (window.EffectsData ? window.EffectsData.effects.filter(this._visible, this).length : '') + '</span></h2>' +
      '<div id="effect-root" data-tab="' + tab + '">' +
        (window.EffectsData ? this._content(window.EffectsData) : '<div class="lore-loading">Loading…</div>') + '</div>'
    );
  },

  destroy: function () {
    $(document).off('.effects');
    var modal = document.getElementById('effect-modal');
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
  },
};

window.Pages = Pages;
