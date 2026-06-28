var Pages = window.Pages || {};

var MECH_QUALITY_LABEL = { R: 'B-rank', SR: 'A-rank', SSR: 'S-rank' };
var MECH_QUALITY_CLASS  = { R: 'rank-b',  SR: 'rank-a',  SSR: 'rank-s'  };
var MECH_AVATAR_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/mecha/';
var MECH_PORTRAIT_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/mechaLive/';
var MODULE_ICON_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';

Pages.sts = {
  title: 'STs',

  _activeRanks:    {},
  _activeTypes:    {},
  _activeVersions: {},
  _enOnly:         true,
  _lastViewed:     null,

  // ── Routing entry point ────────────────────────────────────────────────────
  render: function (param) {
    var mechs = (window.MechsData || {}).mechs || [];
    if (param) {
      var mech = mechs.find(function (m) {
        return m.name.toLowerCase() === decodeURIComponent(param).toLowerCase();
      });
      return mech ? this._renderDetail(mech) : '<p class="text-danger mt-3">ST not found.</p>';
    }
    return this._renderList(mechs);
  },

  // ── Listing page ───────────────────────────────────────────────────────────
  _renderList: function (mechs) {
    var types    = [...new Set(mechs.map(function (m) { return m.type;    }))].sort();
    var versions = [...new Set(mechs.map(function (m) { return m.version; }))].sort();

    var rankButtons = ['SSR', 'SR', 'R'].map(function (q) {
      var suffix = MECH_QUALITY_CLASS[q].replace('rank-', '');
      return '<button class="filter-btn filter-rank-' + suffix + '" data-filter-rank="' + q + '">' + MECH_QUALITY_LABEL[q] + '</button>';
    }).join('');

    var typeButtons = types.map(function (t) {
      return '<button class="filter-btn filter-occ" data-filter-type="' + t + '">' + t + '</button>';
    }).join('');

    var verButtons = versions.map(function (v) {
      return '<button class="filter-btn filter-ver" data-filter-ver="' + v + '">v' + v + '</button>';
    }).join('');

    var html = (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>STs</h1>' +
        '<span class="badge bg-secondary ms-3" id="mech-count">' + mechs.length + '</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-group"><span class="filter-label">Rank</span>' + rankButtons + '</div>' +
        '<div class="filter-group"><span class="filter-label">Type</span>' + typeButtons + '</div>' +
        '<div class="filter-group"><span class="filter-label">Version</span>' + verButtons + '</div>' +
        '<div class="filter-group ms-auto"><button class="filter-btn filter-en" id="toggle-en-sts">EN Only</button></div>' +
      '</div>' +
      '<div class="row g-3" id="mech-grid"></div>'
    );

    var self = this;
    setTimeout(function () {
      self._renderGrid(mechs);

      $(document).on('click.sts', '[data-filter-rank]', function () {
        var q = $(this).data('filter-rank');
        self._activeRanks[q] = !self._activeRanks[q];
        $(this).toggleClass('active', !!self._activeRanks[q]);
        self._renderGrid(mechs);
      });
      $(document).on('click.sts', '[data-filter-type]', function () {
        var t = $(this).data('filter-type');
        self._activeTypes[t] = !self._activeTypes[t];
        $(this).toggleClass('active', !!self._activeTypes[t]);
        self._renderGrid(mechs);
      });
      $(document).on('click.sts', '[data-filter-ver]', function () {
        var v = $(this).data('filter-ver');
        self._activeVersions[v] = !self._activeVersions[v];
        $(this).toggleClass('active', !!self._activeVersions[v]);
        self._renderGrid(mechs);
      });
      $('#toggle-en-sts').toggleClass('active', self._enOnly);
      $(document).on('click.sts', '#toggle-en-sts', function () {
        self._enOnly = !self._enOnly;
        $(this).toggleClass('active', self._enOnly);
        self._renderGrid(mechs);
      });
    }, 0);

    return html;
  },

  _renderGrid: function (mechs) {
    var activeRanks = Object.keys(this._activeRanks).filter(k => this._activeRanks[k]);
    var activeTypes = Object.keys(this._activeTypes).filter(k => this._activeTypes[k]);
    var activeVers  = Object.keys(this._activeVersions).filter(k => this._activeVersions[k]);

    var enOnly = this._enOnly;
    var filtered = mechs.filter(function (m) {
      var rankOk = activeRanks.length === 0 || activeRanks.indexOf(m.quality)  !== -1;
      var typeOk = activeTypes.length === 0 || activeTypes.indexOf(m.type)     !== -1;
      var verOk  = activeVers.length  === 0 || activeVers.indexOf(m.version)   !== -1;
      var enOk   = !enOnly || m.enTranslation;
      return rankOk && typeOk && verOk && enOk;
    }).slice().sort(function (a, b) {
      return parseFloat(b.version) - parseFloat(a.version);
    });

    var cards = filtered.map(function (m) {
      var rankLabel = MECH_QUALITY_LABEL[m.quality] || m.quality;
      var rankClass = MECH_QUALITY_CLASS[m.quality] || '';
      var imgSrc    = MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png';

      return (
        '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
          '<div class="pilot-card" data-mech="' + encodeURIComponent(m.name) + '">' +
            '<div class="pilot-avatar">' +
              '<img src="' + imgSrc + '" alt="' + $('<span>').text(m.name).html() + '" loading="lazy" />' +
              '<span class="version-badge">v' + $('<span>').text(m.version).html() + '</span>' +
              '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
            '</div>' +
            '<div class="pilot-info">' +
              '<div class="pilot-name">' + $('<span>').text(m.name).html() + '</div>' +
              '<div class="pilot-tags">' +
                '<span class="tag">' + $('<span>').text(m.type).html() + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    $('#mech-grid').html(cards || '<p class="text-secondary ms-2 mt-2">No STs match the selected filters.</p>');
    $('#mech-count').text(filtered.length);

    if (this._lastViewed) {
      var $card = $('[data-mech="' + encodeURIComponent(this._lastViewed) + '"]');
      if ($card.length) $card[0].scrollIntoView({ block: 'center' });
      this._lastViewed = null;
    }

    var self = this;
    $(document).on('click.sts', '.pilot-card[data-mech]', function () {
      var name = decodeURIComponent($(this).data('mech'));
      self._lastViewed = name;
      window.location.hash = '#sts/' + encodeURIComponent(name);
    });
  },

  // ── Detail page ────────────────────────────────────────────────────────────
  _renderDetail: function (m) {
    var self = this;
    Translations.loadMech(m, function (merged) { return self._buildDetail(merged); });
    return this._buildDetail(m);
  },

  _buildDetail: function (m) {
    var rankLabel   = MECH_QUALITY_LABEL[m.quality] || m.quality;
    var rankClass   = MECH_QUALITY_CLASS[m.quality] || '';
    var portraitSrc = MECH_PORTRAIT_BASE + encodeURIComponent(m.lihuiIcon) + '.jpg';

    // Weight
    var bodyOutput  = parseInt(m.output, 10) || 0;
    var partsWeight = (m.parts || []).reduce(function (sum, p) { return sum + (parseInt(p.aircraftWeight, 10) || 0); }, 0);
    var remaining   = bodyOutput - partsWeight;

    // Per-part HP stats
    var POSITION_EN = { '躯干': 'Body', '左臂': 'L-Arm', '右臂': 'R-Arm', '腿部': 'Legs' };
    var hpStats = (m.parts || []).map(function (p) {
      var pos = POSITION_EN[p.position] || p.position;
      return '<div class="mech-stat mech-stat-hp"><span class="mech-stat-label">' + pos + ' HP</span><span class="mech-stat-value">' + p.maxHp + '</span></div>';
    }).join('');

    // Weight stats
    var weightStats = (
      '<div class="mech-stat mech-stat-weight"><span class="mech-stat-label">Weight Cap</span><span class="mech-stat-value">' + bodyOutput + '</span></div>' +
      '<div class="mech-stat mech-stat-weight"><span class="mech-stat-label">Used</span><span class="mech-stat-value">' + partsWeight + '</span></div>' +
      '<div class="mech-stat mech-stat-weight' + (remaining < 0 ? ' mech-stat-over' : '') + '"><span class="mech-stat-label">Remaining</span><span class="mech-stat-value">' + remaining + '</span></div>'
    );

    // Modules
    var moduleCards = (m.modules || []).map(function (mod) {
      var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.SkillIcon || mod.icon) + '.png';
      var desc    = Pages.sts._parseEffects(mod.SpecificEffects || '');
      var lv      = mod.level || '';
      return (
        '<div class="talent-card">' +
          '<div class="talent-header">' +
            '<img class="talent-icon" src="' + iconSrc + '" alt="' + $('<span>').text(mod.name).html() + '" />' +
            '<div>' +
              '<div class="talent-name">' +
                $('<span>').text(mod.name).html() +
                (lv ? '<span class="module-level">Lv.' + lv + '/' + lv + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="talent-desc">' + desc + '</div>' +
        '</div>'
      );
    }).join('') || '<p class="text-secondary" style="font-size:0.8rem">No modules.</p>';

    var hiddenCards = (m.hiddenModules || []).map(function (mod) {
      var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.icon || 'Icon_entry_10086') + '.png';
      var desc    = Pages.sts._parseEffects(mod.SpecificEffects || '');
      var partTag = mod.part ? '<span class="module-level">' + $('<span>').text(mod.part).html() + '</span>' : '';
      return (
        '<div class="talent-card">' +
          '<div class="talent-header">' +
            '<img class="talent-icon" src="' + iconSrc + '" alt="' + $('<span>').text(mod.name).html() + '" />' +
            '<div>' +
              '<div class="talent-name">' + $('<span>').text(mod.name).html() + partTag + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="talent-desc">' + desc + '</div>' +
        '</div>'
      );
    }).join('');

    var cnWarning = parseFloat(m.version) > GLOBAL_VERSION
      ? '<div class="cn-warning">This ST data is translated from CN text, there might be inaccuracy and mismatch. The actual translation will be updated when this unit is released in Global.</div>'
      : '';

    return (
      cnWarning +
      '<a href="#sts" class="btn-back">&#8592; Back to STs</a>' +

      // ── Top: portrait + info side by side
      '<div class="detail-layout">' +
        '<div class="detail-portrait-col">' +
          '<div class="detail-portrait">' +
            '<img src="' + portraitSrc + '" alt="' + $('<span>').text(m.name).html() + '" />' +
            '<span class="version-badge">v' + $('<span>').text(m.version).html() + '</span>' +
            '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="detail-info-col">' +
          '<h2 class="detail-name">' + $('<span>').text(m.name).html() + '</h2>' +
          '<div class="detail-tags mb-3">' +
            '<span class="tag">' + $('<span>').text(m.type).html() + '</span>' +
          '</div>' +
          '<div class="mech-stats">' +
            '<div class="mech-stat mech-stat-fire"><span class="mech-stat-label">Firepower</span><span class="mech-stat-value">' + (m.manjiFirepower || m.fire) + '</span></div>' +
          '</div>' +
          '<div class="mech-stats">' + hpStats + '</div>' +
          '<div class="mech-stats">' + weightStats + '</div>' +
        '</div>' +
      '</div>' +

      // ── Below: modules full width
      '<div class="nd-section">' +
        '<div class="section-heading">Modules</div>' +
        '<div class="detail-talents">' + moduleCards + '</div>' +
      '</div>' +
      (hiddenCards ? (
        '<div class="nd-section">' +
          '<div class="section-heading">Additional Mods</div>' +
          '<div class="detail-talents">' + hiddenCards + '</div>' +
        '</div>'
      ) : '')
    );
  },

  _parseEffects: function (text) {
    return Glossary.parseEffects(text);
  },

  destroy: function () {
    $(document).off('click.sts');
    this._activeRanks    = {};
    this._activeTypes    = {};
    this._activeVersions = {};
  }
};

window.Pages = Pages;
