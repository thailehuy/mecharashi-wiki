var Pages = window.Pages || {};

var BACKPACK_ICON_BASE      = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/pack/';
var BACKPACK_SKILL_BASE     = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var BACKPACK_MATERIALS_BASE = 'data/backpacks/';

var BACKPACK_QUALITY_LABEL = { SSSR: 'Special', UR: 'Composite', SSR: 'S', SR: 'A', R: 'B' };
var BACKPACK_QUALITY_CLASS = { SSSR: 'rank-sssr', UR: 'rank-ur', SSR: 'rank-s', SR: 'rank-a', R: 'rank-b' };
var BACKPACK_QUALITY_ORDER = ['SSSR', 'UR', 'SSR', 'SR', 'R'];
var BACKPACK_QUALITY_BG = {
  SSSR: 'data/background/quality-sssr.png',
  UR:   'data/background/quality-ssr.png',
  SSR:  'data/background/quality-ssr.png',
  SR:   'data/background/quality-sr.png',
  R:    'data/background/quality-r.png',
};

var BACKPACK_TYPE_LABEL = {
  Heal:            'Repair',
  PowerAdd:        'Power',
  MovePointAdd:    'Maneuver',
  Interference:    'Signal',
  Flow:            'Jet',
  EMP:             'Jammer',
  Enhance:         'Amplifier',
  Radar:           'Radar',
  Ammo:            'Ammo',
  Invisible:       'Stealth',
  BackupEquipment: 'Backup Equipment',
};

// The Raider backpack's own composite effect is DMG UP, but it's better known
// for the Weapon Switch code it grants -- display that instead.
var BACKPACK_TAG_OVERRIDE = { '60101706': 'Weapon Switcher' };

function backpackTypeTag(b) {
  if (BACKPACK_TAG_OVERRIDE[b.ID]) return BACKPACK_TAG_OVERRIDE[b.ID];

  var skillName = (b.skill && b.skill.name) || '';
  var dotIdx = skillName.indexOf(' · ');
  if (dotIdx !== -1) return skillName.slice(dotIdx + 3).trim();

  var dashIdx = b.name.indexOf(' - ');
  if (dashIdx !== -1 && (b.name.indexOf('Jammer') === 0 || b.name.indexOf('Amplifier') === 0)) {
    return b.name.slice(dashIdx + 3).trim();
  }

  return BACKPACK_TYPE_LABEL[b.BackpackMainType] || b.BackpackMainType;
}

Pages.backpacks = {
  title: 'Backpacks',

  _searchQuery: '',

  render: function (param) {
    var backpacks = (window.BackpacksData || {}).backpacks || [];
    if (param) {
      var b = backpacks.find(function (x) { return x.ID === decodeURIComponent(param); });
      return b ? this._renderDetail(b) : '<p class="text-danger mt-3">Backpack not found.</p>';
    }
    return this._renderList(backpacks);
  },

  // ── Listing ────────────────────────────────────────────────────────────────

  _renderList: function (backpacks) {
    var self = this;

    var groups = BACKPACK_QUALITY_ORDER.map(function (q) {
      return { quality: q, items: backpacks.filter(function (b) { return b.quality === q; }) };
    }).filter(function (g) { return g.items.length; });

    var qualNav = '<div class="ac-nav">' +
      groups.map(function (g) {
        return '<a class="ac-nav-item" href="#bp-' + g.quality + '">' + BACKPACK_QUALITY_LABEL[g.quality] + '</a>';
      }).join('') +
    '</div>';

    var sectionsHtml = groups.map(function (g) {
      return '<div class="ac-section" id="bp-' + g.quality + '" data-quality="' + g.quality + '">' +
        '<h2 class="ac-section-title">' + BACKPACK_QUALITY_LABEL[g.quality] + '</h2>' +
        '<div class="row g-3 backpack-grid-section"></div>' +
      '</div>';
    }).join('');

    setTimeout(function () {
      $('#backpack-page').on('click', '.ac-nav-item', function (e) {
        e.preventDefault();
        var $el = $($(this).attr('href'));
        if ($el.length) $('html, body').animate({ scrollTop: $el.offset().top - 70 }, 200);
      });

      $('#backpack-page').on('click', '#backpack-back-top', function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 200);
      });

      $('#backpack-page').on('input', '#backpack-search', function () {
        self._searchQuery = $(this).val();
        self._applyFilter();
      });

      groups.forEach(function (g) {
        var $section = $('#backpack-page .ac-section[data-quality="' + g.quality + '"]');
        var $grid = $section.find('.backpack-grid-section');

        g.items.forEach(function (b) {
          var imgSrc  = BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png';
          var bgSrc   = BACKPACK_QUALITY_BG[b.quality] || '';
          var typeTag = backpackTypeTag(b);

          var $card = $(
            '<div class="col-6 col-sm-4 col-md-3 col-xl-2 backpack-card-wrap" data-name="' + encodeURIComponent(b.name.toLowerCase()) + '">' +
              '<div class="card-item weapon-card backpack-card" data-id="' + b.ID + '">' +
                '<div class="weapon-card-img" style="background-image:url(\'' + bgSrc + '\')">' +
                  '<img src="' + imgSrc + '" alt="' + $('<span>').text(b.name).html() + '" loading="lazy" />' +
                  (b.version ? '<span class="version-badge">v' + $('<span>').text(b.version).html() + '</span>' : '') +
                  '<span class="weapon-type-badge">' + $('<span>').text(typeTag).html() + '</span>' +
                '</div>' +
                '<div class="weapon-card-body">' +
                  '<div class="weapon-card-body-text">' +
                    '<div class="card-name">' + $('<span>').text(b.name).html() + '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>'
          );
          $card.find('.backpack-card').on('click', function () {
            window.location.hash = '#backpacks/' + encodeURIComponent(b.ID);
          });
          $grid.append($card);
        });
      });

      $('#backpack-search').val(self._searchQuery);
      self._applyFilter();
    }, 0);

    return (
      '<div id="backpack-page">' +
        '<div class="listing-header"><h1>Backpacks</h1><span class="badge bg-secondary ms-3" id="backpack-count">' + backpacks.length + '</span></div>' +
        '<div class="search-box-wrap">' +
          '<input type="text" class="search-box" id="backpack-search" placeholder="Search backpacks by name..." />' +
        '</div>' +
        qualNav +
        sectionsHtml +
        '<a class="back-to-top" id="backpack-back-top" href="#">&#8593; Top</a>' +
      '</div>'
    );
  },

  _applyFilter: function () {
    var query = (this._searchQuery || '').trim().toLowerCase();
    var visibleCount = 0;
    $('#backpack-page .ac-section').each(function () {
      var $section = $(this);
      var sectionHasMatch = false;
      $section.find('.backpack-card-wrap').each(function () {
        var name = decodeURIComponent($(this).data('name') || '');
        var show = !query || name.indexOf(query) !== -1;
        $(this).toggle(show);
        if (show) { sectionHasMatch = true; visibleCount++; }
      });
      $section.toggle(sectionHasMatch);
    });
    $('#backpack-count').text(visibleCount);
  },

  // ── Detail ─────────────────────────────────────────────────────────────────

  _renderDetail: function (b) {
    var rankLabel = BACKPACK_QUALITY_LABEL[b.quality] || b.quality;
    var typeTag   = backpackTypeTag(b);
    var imgSrc    = BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png';
    var bgSrc     = BACKPACK_QUALITY_BG[b.quality] || '';

    var cnWarning = b.version && parseFloat(b.version) > GLOBAL_VERSION
      ? '<div class="cn-warning">This Backpack data is translated from CN text, there might be inaccuracy and mismatch. The actual translation will be updated when this unit is released in Global.</div>'
      : '';

    var skillHtml = '';
    if (b.skill && b.skill.name) {
      var skillIconSrc = BACKPACK_SKILL_BASE + encodeURIComponent(b.skill.icon) + '.png';
      var desc = Glossary.parseEffects(b.skill.SpecificEffects || '');
      skillHtml =
        '<div class="nd-section backpack-skill-section">' +
          '<div class="detail-talents">' +
            '<div class="talent-card">' +
              '<div class="talent-header">' +
                '<img class="talent-icon" src="' + skillIconSrc + '" alt="' + $('<span>').text(b.skill.name).html() + '" />' +
                '<div>' +
                  '<div class="talent-name">' + $('<span>').text(b.skill.name).html() + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="talent-desc">' + desc + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    return (
      cnWarning +
      '<a href="#backpacks" class="btn-back">&#8592; Back to Backpacks</a>' +
      '<h2 class="detail-name mb-3">' + $('<span>').text(b.name).html() + '</h2>' +
      '<div class="backpack-detail-row">' +
        '<div class="detail-portrait-col backpack-portrait-col">' +
          '<div class="weapon-portrait backpack-portrait-sm" style="background-image:url(\'' + bgSrc + '\')">' +
            '<img src="' + imgSrc + '" alt="' + $('<span>').text(b.name).html() + '" />' +
            '<span class="weapon-type-badge">' + $('<span>').text(typeTag).html() + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="detail-info-col">' +
          '<div class="backpack-meta-row mb-3">' +
            '<div class="backpack-meta-item"><span class="stat-label">Quality</span><span class="stat-value">' + $('<span>').text(rankLabel).html() + '</span></div>' +
            '<div class="backpack-meta-item"><span class="stat-label">Weight</span><span class="stat-value">' + $('<span>').text(String(b.weight || '')).html() + '</span></div>' +
            (b.version ? '<div class="backpack-meta-item"><span class="stat-label">Version</span><span class="stat-value">v' + $('<span>').text(b.version).html() + '</span></div>' : '') +
          '</div>' +
          skillHtml +
        '</div>' +
      '</div>' +
      this._renderCrafting(b)
    );
  },

  _renderCrafting: function (b) {
    if (!b.crafting || !b.crafting.length) return '';
    var allBackpacks = (window.BackpacksData || {}).backpacks || [];

    var compositeBadge =
      '<span class="material-composite-badge">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chevron-double-down" viewBox="0 0 16 16">' +
          '<path fill-rule="evenodd" d="M1.646 6.646a.5.5 0 0 1 .708 0L8 12.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>' +
          '<path fill-rule="evenodd" d="M1.646 2.646a.5.5 0 0 1 .708 0L8 8.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>' +
        '</svg>' +
      '</span>';

    var itemsHtml = b.crafting.map(function (m) {
      if (m.kind === 'item') {
        var ref = allBackpacks.find(function (x) { return x.ID === m.id; });
        if (!ref) return '';
        var refIconSrc = BACKPACK_ICON_BASE + encodeURIComponent(ref.icon) + '.png';
        var refBgSrc    = BACKPACK_QUALITY_BG[ref.quality] || '';
        var style = 'background-image:url(\'' + refIconSrc + '\'), url(\'' + refBgSrc + '\');' +
          'background-size: auto 100%, cover; background-position: center, center;';
        return (
          '<a class="material-item" href="#backpacks/' + encodeURIComponent(ref.ID) + '">' +
            '<div class="material-icon-wrap" style="' + style + '">' +
              (m.composite ? compositeBadge : '') +
              (m.qty > 1 ? '<span class="material-qty">x' + m.qty + '</span>' : '') +
            '</div>' +
            '<div class="material-name">' + $('<span>').text(ref.name).html() + '</div>' +
          '</a>'
        );
      }
      return (
        '<div class="material-item">' +
          '<div class="material-icon-wrap" style="background-image:url(\'' + BACKPACK_MATERIALS_BASE + m.icon + '\')">' +
            (m.composite ? compositeBadge : '') +
            (m.qty > 1 ? '<span class="material-qty">x' + m.qty + '</span>' : '') +
          '</div>' +
          '<div class="material-name">' + $('<span>').text(m.label).html() + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="nd-section">' +
        '<div class="section-heading">Crafting Material</div>' +
        '<div class="backpack-materials">' + itemsHtml + '</div>' +
      '</div>'
    );
  },

  destroy: function () {
    this._searchQuery = '';
  },
};

window.Pages = Pages;
