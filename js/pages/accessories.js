var Pages = window.Pages || {};

var ACC_SKILL_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var ACC_ICON_BASE  = 'data/accessories/icons/';

var ACC_TAG_LABEL = {
  '戰後效果': 'Post-Combat',
  '戰中效果': 'Mid-Combat',
  '攻擊方式': 'Attack Method',
  '耐久相關': 'Durability',
  '特殊效果': 'Special Effect',
  '距離相關': 'Range',
  '移動相關': 'Movement',
  '攻擊結果': 'Attack Result',
  'AP相關':   'AP',
  '命中相關': 'Hit Rate',
  '受擊相關': 'Hit Received',
};

Pages.accessories = {
  title: 'Accessories',

  _activeCO: null,
  _activeW: false,
  _searchQuery: '',

  render: function () {
    var self = this;
    var all = (window.AccessoriesData || {}).accessories || [];

    var triggers  = all.filter(function (a) { return a.type === '觸元件'; });
    var reactions = all.filter(function (a) { return a.type === '應元件'; });

    var allCOs = [];
    all.forEach(function (a) {
      (a.cos || []).forEach(function (c) {
        if (allCOs.indexOf(c) === -1) allCOs.push(c);
      });
    });
    allCOs.sort(function (a, b) { return a - b; });

    var coFilterHtml =
      '<div class="acc-co-filter">' +
        '<span class="filter-label">Clearance Ops</span>' +
        allCOs.map(function (co) {
          return '<button class="filter-btn acc-co-btn' + (self._activeCO === co ? ' active' : '') + '" data-co="' + co + '">CO' + co + '</button>';
        }).join('') +
      '</div>';

    var typeFilterHtml =
      '<div class="acc-type-filter">' +
        '<span class="filter-label">Type</span>' +
        '<button class="filter-btn acc-w-btn' + (self._activeW ? ' active' : '') + '" data-w="1">W</button>' +
      '</div>';

    var acNav =
      '<div class="ac-nav">' +
        '<a class="ac-nav-item" href="#acc-triggers">Triggers</a>' +
        '<a class="ac-nav-item" href="#acc-reactions">Reactions</a>' +
      '</div>';

    var sectionsHtml =
      this._renderSection('Triggers', triggers) +
      this._renderSection('Reactions', reactions);

    setTimeout(function () {
      $('#acc-page').on('click', '.ac-nav-item', function (e) {
        e.preventDefault();
        var $el = $($(this).attr('href'));
        if ($el.length) $('html, body').animate({ scrollTop: $el.offset().top - 70 }, 200);
      });

      $('#acc-page').on('click', '#acc-back-top', function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 200);
      });

      $('#acc-page').on('click', '.acc-co-btn', function () {
        var co = parseInt($(this).data('co'));
        if (self._activeCO === co) {
          self._activeCO = null;
        } else {
          self._activeCO = co;
        }
        $('.acc-co-btn').removeClass('active');
        if (self._activeCO !== null) {
          $('.acc-co-btn[data-co="' + self._activeCO + '"]').addClass('active');
        }
        self._applyFilter();
      });

      $('#acc-page').on('click', '.acc-w-btn', function () {
        self._activeW = !self._activeW;
        $(this).toggleClass('active', self._activeW);
        self._applyFilter();
      });

      $('#acc-page').on('input', '#acc-search', function () {
        self._searchQuery = $(this).val();
        self._applyFilter();
      });

      $('#acc-search').val(self._searchQuery);
      self._applyFilter();
    }, 0);

    return (
      '<div id="acc-page">' +
        '<div class="listing-header">' +
          '<h1>Accessories</h1>' +
          '<span class="badge bg-secondary ms-3">' + all.length + '</span>' +
        '</div>' +
        '<div class="search-box-wrap">' +
          '<input type="text" class="search-box" id="acc-search" placeholder="Search accessories by name..." />' +
        '</div>' +
        coFilterHtml +
        typeFilterHtml +
        acNav +
        sectionsHtml +
        '<a class="back-to-top" id="acc-back-top" href="#">&#8593; Top</a>' +
      '</div>'
    );
  },

  _applyFilter: function () {
    var co    = this._activeCO;
    var w     = this._activeW;
    var query = (this._searchQuery || '').trim().toLowerCase();
    $('#acc-page .ac-section').each(function () {
      var $section = $(this);
      var sectionHasMatch = false;
      $section.find('.acc-card-wrap').each(function () {
        var cos  = $(this).data('cos');
        var name = decodeURIComponent($(this).data('name') || '');
        var isW  = $(this).data('w') === 1;
        var coOk     = co === null || (cos && cos.indexOf(co) !== -1);
        var wOk      = !w || isW;
        var searchOk = !query || name.indexOf(query) !== -1;
        var show = coOk && wOk && searchOk;
        $(this).toggle(show);
        if (show) sectionHasMatch = true;
      });
      $section.toggle(sectionHasMatch);
    });
  },

  _renderSection: function (title, items) {
    var anchorId = title === 'Triggers' ? 'acc-triggers' : 'acc-reactions';
    var sorted = items.slice().sort(function (a, b) {
      var la = a.en_type || (a.tags.map(function (t) { return ACC_TAG_LABEL[t] || t; }).join(', '));
      var lb = b.en_type || (b.tags.map(function (t) { return ACC_TAG_LABEL[t] || t; }).join(', '));
      if (la < lb) return -1;
      if (la > lb) return 1;
      var na = a.en_name || a.name;
      var nb = b.en_name || b.name;
      return na < nb ? -1 : na > nb ? 1 : 0;
    });
    var cards = sorted.map(function (a) {
      var stateIcon = ACC_ICON_BASE + 'statetype_' + a.statetype + '.png';
      var skillIcon = ACC_SKILL_BASE + encodeURIComponent(a.icon) + '.png';

      var displayName = a.en_name || a.name.replace(/^[應觸]元件W?[-—]/, '');
      var isW = a.statetype.indexOf('_W') !== -1;

      var tagLabel = a.en_type || (a.tags.map(function (t) { return ACC_TAG_LABEL[t] || t; }).join(', '));
      var tagsHtml = tagLabel ? '<span class="acc-tag">' + $('<span>').text(tagLabel).html() + '</span>' : '';

      var cosHtml = (a.cos || []).map(function (c) {
        return '<span class="acc-co-badge">CO' + c + '</span>';
      }).join('');

      var cosAttr = JSON.stringify(a.cos || []);
      var nameAttr = encodeURIComponent(displayName.toLowerCase());

      return (
        '<div class="col-12 col-sm-6 col-lg-4 col-xl-3 acc-card-wrap" data-cos=\'' + cosAttr + '\' data-name="' + nameAttr + '" data-w="' + (isW ? 1 : 0) + '">' +
          '<div class="acc-card">' +
            '<div class="acc-card-icon">' +
              '<img class="acc-statetype-icon" src="' + stateIcon + '" alt="" />' +
              '<img class="acc-skill-icon' +
                (a.statetype === 'Condition_W' ? ' acc-skill-icon--trigger-w' : '') +
                (a.statetype === 'Function_W'  ? ' acc-skill-icon--reaction-w' : '') +
              '" src="' + skillIcon + '" alt="" />' +
            '</div>' +
            '<div class="acc-card-body">' +
              '<div class="acc-card-header">' +
                '<span class="acc-name">' + $('<span>').text(displayName).html() + '</span>' +
                (isW ? '<span class="acc-w-badge">W</span>' : '') +
                '<span class="acc-level">' + (a.level || '') + '</span>' +
              '</div>' +
              (tagsHtml ? '<div class="acc-tags">' + tagsHtml + '</div>' : '') +
              '<p class="acc-desc">' + Glossary.parseEffects(a.en_describe || a.describe) + '</p>' +
              (cosHtml ? '<div class="acc-tags acc-co-tags">' + cosHtml + '</div>' : '') +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="ac-section" id="' + anchorId + '">' +
        '<h2 class="ac-section-title">' + title + ' <span class="badge bg-secondary ms-2" style="font-size:0.7rem">' + items.length + '</span></h2>' +
        '<div class="row g-3">' + cards + '</div>' +
      '</div>'
    );
  },

  destroy: function () {
    this._activeCO = null;
    this._activeW = false;
    this._searchQuery = '';
  },
};
