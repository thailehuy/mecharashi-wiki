var Pages = window.Pages || {};

var MODULE_ICON_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';

var MODULE_CATEGORY_LABEL = {
  PropertyS:   'Standalone Module',
  GeneralSuit: 'Shop Module',
  SuitS:       'Producible Module',
};

// Shared level-slider widget: used both on this listing page and inline on
// each mech's detail page (js/pages/sts.js), so equipped modules with level
// data can preview every level's effect without a separate lookup.
var ModuleSlider = {
  html: function (family, currentLevel) {
    var mod = ((window.ModulesData || {}).modules || {})[family];
    if (!mod) return null;
    var max = mod.maxLevel;
    var cur = Math.min(Math.max(parseInt(currentLevel, 10) || mod.currentLevel || 1, 1), max);
    // Every module's slider spans the same track width regardless of its
    // level count, so a tick per level is the only way to tell a 4-level
    // slider from an 8-level one at a glance.
    var ticksHtml = '';
    for (var t = 0; t < max; t++) {
      ticksHtml += '<span class="module-slider-tick"></span>';
    }
    return (
      '<div class="module-slider" data-family="' + family + '">' +
        '<div class="module-slider-row">' +
          '<input type="range" class="module-slider-input" min="1" max="' + max + '" step="1" value="' + cur + '" />' +
          '<span class="module-slider-level">Lv.' + cur + '/' + max + '</span>' +
        '</div>' +
        '<div class="module-slider-ticks-row">' +
          '<div class="module-slider-ticks">' + ticksHtml + '</div>' +
          '<span class="module-slider-ticks-spacer"></span>' +
        '</div>' +
        '<div class="module-slider-effect">' + Glossary.parseEffects(mod.levels[String(cur)] || '') + '</div>' +
      '</div>'
    );
  }
};

$(document).on('input', '.module-slider-input', function () {
  var $wrap  = $(this).closest('.module-slider');
  var family = $wrap.data('family');
  var mod    = ((window.ModulesData || {}).modules || {})[family];
  if (!mod) return;
  var level = $(this).val();
  $wrap.find('.module-slider-level').text('Lv.' + level + '/' + mod.maxLevel);
  $wrap.find('.module-slider-effect').html(Glossary.parseEffects(mod.levels[level] || ''));
});

Pages.modules = {
  title: 'Modules',

  _searchQuery: '',

  render: function (param) {
    var modules = ((window.ModulesData || {}).modules || {});
    if (param) {
      var target = decodeURIComponent(param).toLowerCase();
      var family = Object.keys(modules).find(function (fam) {
        return modules[fam].name.toLowerCase() === target;
      });
      return family ? this._renderDetail(family, modules[family]) : '<p class="text-danger mt-3">Module not found.</p>';
    }
    return this._renderList(modules);
  },

  _renderList: function (modules) {
    var self = this;
    var families = Object.keys(modules);

    var groups = {};
    families.forEach(function (fam) {
      var cat = modules[fam].category;
      (groups[cat] = groups[cat] || []).push(fam);
    });

    var order = ['PropertyS', 'GeneralSuit', 'SuitS'];
    var sectionsHtml = order.filter(function (cat) { return groups[cat]; }).map(function (cat) {
      return self._renderSection(cat, groups[cat], modules);
    }).join('');

    setTimeout(function () {
      $('#module-page').on('click', '#module-back-top', function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 200);
      });

      $('#module-page').on('input', '#module-search', function () {
        self._searchQuery = $(this).val();
        self._applyFilter();
      });

      $('#module-page').on('click', '.module-card-header', function () {
        window.location.hash = '#modules/' + ($(this).closest('.module-card-wrap').data('name') || '');
      });

      $('#module-search').val(self._searchQuery);
      self._applyFilter();
    }, 0);

    return (
      '<div id="module-page">' +
        '<div class="listing-header">' +
          '<h1>Modules</h1>' +
          '<span class="badge bg-secondary ms-3">' + families.length + '</span>' +
        '</div>' +
        '<div class="search-box-wrap">' +
          '<input type="text" class="search-box" id="module-search" placeholder="Search modules by name..." />' +
        '</div>' +
        sectionsHtml +
        '<a class="back-to-top" id="module-back-top" href="#">&#8593; Top</a>' +
      '</div>'
    );
  },

  _applyFilter: function () {
    var query = (this._searchQuery || '').trim().toLowerCase();
    $('#module-page .ac-section').each(function () {
      var $section = $(this);
      var sectionHasMatch = false;
      $section.find('.module-card-wrap').each(function () {
        var name = decodeURIComponent($(this).data('name') || '');
        var show = !query || name.indexOf(query) !== -1;
        $(this).toggle(show);
        if (show) sectionHasMatch = true;
      });
      $section.toggle(sectionHasMatch);
    });
  },

  _renderSection: function (category, familyIds, modules) {
    var self = this;
    var sorted = familyIds.slice().sort(function (a, b) {
      return modules[a].name < modules[b].name ? -1 : modules[a].name > modules[b].name ? 1 : 0;
    });

    var cards = sorted.map(function (fam) {
      var mod = modules[fam];
      var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.icon) + '.png';
      // mod.currentLevel is just whichever mech instance happened to supply
      // the translation template at compile time — meaningless as a default
      // here (no specific mech to be "current" for), so default to max level.
      var sliderHtml = ModuleSlider.html(fam, mod.maxLevel);
      // Standalone (weapon-type) modules are player-equipped independently —
      // they aren't part of any specific mech's fixed kit.
      var mechIconsHtml = mod.category === 'PropertyS' ? '' : self._mechIconsHtml(fam);

      return (
        '<div class="col-12 col-sm-6 col-lg-4 col-xl-3 module-card-wrap" data-name="' + encodeURIComponent(mod.name.toLowerCase()) + '">' +
          '<div class="module-card">' +
            '<div class="module-card-header">' +
              '<img class="module-card-icon" src="' + iconSrc + '" alt="" />' +
              '<span class="module-card-name">' + $('<span>').text(mod.name).html() + '</span>' +
            '</div>' +
            mechIconsHtml +
            (sliderHtml || '') +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="ac-section">' +
        '<h2 class="ac-section-title">' + (MODULE_CATEGORY_LABEL[category] || category) +
          ' <span class="badge bg-secondary ms-2" style="font-size:0.7rem">' + familyIds.length + '</span></h2>' +
        '<div class="row g-3">' + cards + '</div>' +
      '</div>'
    );
  },

  // Small mech-icon row shown on listing cards: quality background behind
  // the icon, quality-colored border, and the mech name shown via a custom
  // CSS hover tooltip (native title tooltips are slow/unreliable to trigger).
  _mechIconsHtml: function (family) {
    var mechs = ((window.MechsData || {}).mechs || []).filter(function (m) {
      return (m.modules || []).some(function (carried) { return carried.id === family; });
    });
    if (!mechs.length) return '';
    return (
      '<div class="module-card-mechs">' +
        mechs.map(function (m) {
          var iconSrc  = MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png';
          var bgSrc    = MECH_QUALITY_BG[m.quality] || '';
          var rankClass = MECH_QUALITY_CLASS[m.quality] || '';
          var nameEsc  = $('<span>').text(m.name).html();
          return (
            '<a class="module-card-mech-icon-wrap" href="#sts/' + encodeURIComponent(m.name) + '">' +
              '<span class="module-card-mech-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
                '<img src="' + iconSrc + '" alt="' + nameEsc + '" />' +
              '</span>' +
              '<span class="module-card-mech-tooltip">' + nameEsc + '</span>' +
            '</a>'
          );
        }).join('') +
      '</div>'
    );
  },

  // ── Detail ─────────────────────────────────────────────────────────────────

  _renderDetail: function (family, mod) {
    var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.icon) + '.png';

    var levelsHtml = '';
    for (var lv = 1; lv <= mod.maxLevel; lv++) {
      levelsHtml +=
        '<div class="talent-card">' +
          '<div class="talent-header"><div class="talent-name">Lv.' + lv + '/' + mod.maxLevel + '</div></div>' +
          '<div class="talent-desc">' + Glossary.parseEffects(mod.levels[String(lv)] || '') + '</div>' +
        '</div>';
    }

    // Standalone (weapon-type) modules are player-crafted and equipped
    // independently — they aren't part of any specific mech's fixed kit.
    var carriedByHtml;
    if (mod.category !== 'PropertyS') {
      var mechs = ((window.MechsData || {}).mechs || []).filter(function (m) {
        return (m.modules || []).some(function (carried) { return carried.id === family; });
      });
      carriedByHtml =
        '<span class="module-carried-by-label">Carried By</span>' +
        '<div class="module-mech-list">' +
          (mechs.length
            ? mechs.map(function (m) {
                var mImgSrc = MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png';
                return (
                  '<a class="module-mech-card" href="#sts/' + encodeURIComponent(m.name) + '">' +
                    '<img class="module-mech-avatar" src="' + mImgSrc + '" alt="' + $('<span>').text(m.name).html() + '" />' +
                    '<div class="module-mech-name">' + $('<span>').text(m.name).html() + '</div>' +
                  '</a>'
                );
              }).join('')
            : '<p class="text-secondary" style="font-size:0.8rem">No STs currently carry this module.</p>') +
        '</div>';
    } else {
      carriedByHtml = '<p class="text-secondary" style="font-size:0.8rem">Standalone module — not tied to any specific ST.</p>';
    }

    return (
      '<a href="#modules" class="btn-back">&#8592; Back to Modules</a>' +

      '<div class="module-detail-header">' +
        '<div class="module-detail-portrait">' +
          '<img src="' + iconSrc + '" alt="' + $('<span>').text(mod.name).html() + '" />' +
        '</div>' +
        '<div class="module-header-name-row">' +
          '<h2 class="detail-name">' + $('<span>').text(mod.name).html() + '</h2>' +
          '<div class="detail-tags">' +
            '<span class="tag tag-wtype">' + (MODULE_CATEGORY_LABEL[mod.category] || mod.category) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="module-header-carried-row">' + carriedByHtml + '</div>' +
      '</div>' +

      '<div class="nd-section">' +
        '<div class="section-heading">All Levels</div>' +
        '<div class="detail-talents">' + levelsHtml + '</div>' +
      '</div>'
    );
  },

  destroy: function () {
    this._searchQuery = '';
  },
};
