var Pages = window.Pages || {};

var ACC_SKILL_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var ACC_ICON_BASE  = ASSET_BASE + 'data/accessories/icons/';

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
  _activeType: null,
  _searchQuery: '',
  _activeSections: {},
  _sortKey: null,
  _sortDir: -1,

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
      '<div class="filter-group">' +
        '<span class="filter-label">Clearance Ops</span>' +
        '<div class="filter-values">' +
          allCOs.map(function (co) {
            return '<button class="filter-btn acc-co-btn' + (self._activeCO === co ? ' active' : '') + '" data-co="' + co + '">CO' + co + '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    var allTypes = [];
    all.forEach(function (a) {
      var t = self._typeLabel(a);
      if (t && allTypes.indexOf(t) === -1) allTypes.push(t);
    });
    allTypes.sort();

    var typeFilterHtml =
      '<div class="filter-group">' +
        '<span class="filter-label">Type</span>' +
        '<div class="filter-values">' +
          allTypes.map(function (t) {
            return '<button class="filter-btn acc-cat-btn' + (self._activeType === t ? ' active' : '') + '" data-type="' + encodeURIComponent(t) + '">' + $('<span>').text(t).html() + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<div class="filter-group">' +
        '<span class="filter-label">Variant</span>' +
        '<div class="filter-values">' +
          '<button class="filter-btn acc-w-btn' + (self._activeW ? ' active' : '') + '" data-w="1">W</button>' +
        '</div>' +
      '</div>';

    var acNav =
      '<div class="filter-group">' +
        '<span class="filter-label">Slot</span>' +
        '<div class="filter-values">' +
          '<button class="filter-btn filter-occ" data-filter-section="acc-triggers">Triggers</button>' +
          '<button class="filter-btn filter-occ" data-filter-section="acc-reactions">Reactions</button>' +
        '</div>' +
      '</div>';

    var sectionsHtml =
      this._renderSection('Triggers', triggers, allCOs) +
      this._renderSection('Reactions', reactions, allCOs);

    setTimeout(function () {
      $('#acc-page').css('--acc-sticky-top', ($('.navbar').outerHeight() || 0) + 'px');

      $('#acc-page').on('click', '[data-filter-section]', function () {
        var key = $(this).data('filter-section');
        self._activeSections[key] = !self._activeSections[key];
        $(this).toggleClass('active', !!self._activeSections[key]);
        self._applyFilter();
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

      $('#acc-page').on('click', '.acc-th-sortable', function () {
        var key = $(this).data('sort-key');
        self._sortDir = self._sortKey === key ? -self._sortDir : -1;
        self._sortKey = key;
        self._applySort();
      });

      $('#acc-page').on('click', '.acc-cat-btn', function () {
        var t = decodeURIComponent($(this).data('type'));
        self._activeType = self._activeType === t ? null : t;
        $('.acc-cat-btn').removeClass('active');
        if (self._activeType !== null) $(this).addClass('active');
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
      self._applySort();
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
        '<div class="filter-bar">' +
          coFilterHtml +
          typeFilterHtml +
          acNav +
        '</div>' +
        '<p class="ac-section-footnote acc-co-note">The numbers in the CO columns mean the number of weapons carrying that could drop that accessory. The real drop chance is unknown.</p>' +
        sectionsHtml +
        '<a class="back-to-top" id="acc-back-top" href="#">&#8593; Top</a>' +
      '</div>'
    );
  },

  _sectionOk: function (id) {
    var active = this._activeSections;
    var any = Object.keys(active).some(function (k) { return active[k]; });
    return !any || !!active[id];
  },

  _applyFilter: function () {
    var co    = this._activeCO;
    var w     = this._activeW;
    var type  = this._activeType;
    var query = (this._searchQuery || '').trim().toLowerCase();
    var self = this;
    $('#acc-page .ac-section').each(function () {
      var $section = $(this);
      if (!self._sectionOk(this.id)) { $section.hide(); return; }
      var sectionHasMatch = false;
      $section.find('.acc-row').each(function () {
        var cos  = $(this).data('cos');
        var name = decodeURIComponent($(this).data('name') || '');
        var isW  = $(this).data('w') === 1;
        var typeOk   = type === null || decodeURIComponent($(this).data('type')) === type;
        var coOk     = co === null || (cos && cos.indexOf(co) !== -1);
        var wOk      = !w || isW;
        var searchOk = !query || name.indexOf(query) !== -1;
        var show = coOk && wOk && typeOk && searchOk;
        $(this).toggle(show);
        if (show) sectionHasMatch = true;
      });
      $section.toggle(sectionHasMatch);
    });
    $('#acc-page .acc-col-co').removeClass('acc-col-active');
    if (co !== null) $('#acc-page .acc-col-co[data-co="' + co + '"]').addClass('acc-col-active');
  },

  _applySort: function () {
    var key = this._sortKey;
    var dir = this._sortDir;
    $('#acc-page .acc-th-sortable').removeClass('acc-sort-asc acc-sort-desc');
    if (key) {
      $('#acc-page .acc-th-sortable[data-sort-key="' + key + '"]').addClass(dir === 1 ? 'acc-sort-asc' : 'acc-sort-desc');
    }
    $('#acc-page .acc-table tbody').each(function () {
      var $rows = $(this).children('.acc-row').get();
      $rows.sort(function (a, b) {
        if (key) {
          var va = $(a).data('sort-' + key) || 0;
          var vb = $(b).data('sort-' + key) || 0;
          if (va !== vb) return (va - vb) * dir;
        }
        return $(a).data('order') - $(b).data('order');
      });
      $(this).append($rows);
    });
  },

  _typeLabel: function (a) {
    return a.en_type || a.tags.map(function (t) { return ACC_TAG_LABEL[t] || t; }).join(', ');
  },

  _renderSection: function (title, items, allCOs) {
    var self = this;
    var anchorId = title === 'Triggers' ? 'acc-triggers' : 'acc-reactions';
    var sorted = items.slice().sort(function (a, b) {
      var la = self._typeLabel(a);
      var lb = self._typeLabel(b);
      if (la < lb) return -1;
      if (la > lb) return 1;
      var na = a.en_name || a.name;
      var nb = b.en_name || b.name;
      if (na !== nb) return na < nb ? -1 : 1;
      // W variant first
      return (b.statetype.indexOf('_W') !== -1) - (a.statetype.indexOf('_W') !== -1);
    });

    var headHtml =
      '<th class="acc-th-name">Name</th>' +
      '<th class="acc-th-type">Type</th>' +
      allCOs.map(function (co) {
        return '<th class="acc-th-sortable acc-col-co" data-co="' + co + '" data-sort-key="co' + co + '">CO' + co + '<span class="acc-sort-arrow"></span></th>';
      }).join('');

    var rows = sorted.map(function (a, i) {
      var stateIcon = ACC_ICON_BASE + 'statetype_' + a.statetype + '.png';
      var skillIcon = ACC_SKILL_BASE + encodeURIComponent(a.icon) + '.png';

      var displayName = a.en_name || a.name.replace(/^[應觸]元件W?[-—]/, '');
      var isW = a.statetype.indexOf('_W') !== -1;
      var tagLabel = self._typeLabel(a);
      var lv = parseInt((a.level || '').replace(/\D/g, ''), 10) || 0;

      var occ = a.occurrence || {};
      var sortAttrs = '';
      var coCells = allCOs.map(function (co) {
        var n = occ[co] || 0;
        sortAttrs += ' data-sort-co' + co + '="' + n + '"';
        return '<td class="acc-col-co acc-occ' + (n ? '' : ' acc-occ-none') + '" data-co="' + co + '">' + n + '</td>';
      }).join('');

      var cosAttr = JSON.stringify(a.cos || []);
      var nameAttr = encodeURIComponent(displayName.toLowerCase());

      return (
        '<tr class="acc-row" data-order="' + i + '" data-cos=\'' + cosAttr + '\' data-name="' + nameAttr + '" data-w="' + (isW ? 1 : 0) + '" data-type="' + encodeURIComponent(tagLabel) + '"' + sortAttrs + '>' +
          '<td class="acc-name-cell">' +
            '<div class="acc-name-wrap">' +
              '<div class="acc-card-icon">' +
                '<img class="acc-statetype-icon" src="' + stateIcon + '" alt="" />' +
                '<img class="acc-skill-icon' +
                  (a.statetype === 'Condition_W' ? ' acc-skill-icon--trigger-w' : '') +
                  (a.statetype === 'Function_W'  ? ' acc-skill-icon--reaction-w' : '') +
                '" src="' + skillIcon + '" alt="" />' +
              '</div>' +
              '<div class="acc-name-body">' +
                '<div class="acc-name-header">' +
                  '<span class="acc-name">' + $('<span>').text(displayName).html() + '</span>' +
                  (isW ? '<span class="acc-w-badge">W</span>' : '') +
                  (lv ? '<span class="acc-level">Lv.' + lv + '</span>' : '') +
                '</div>' +
                '<p class="acc-desc">' + Glossary.parseEffects(a.en_describe || a.describe) + '</p>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td class="acc-type-cell">' + $('<span>').text(tagLabel).html() + '</td>' +
          coCells +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="ac-section" id="' + anchorId + '">' +
        '<h2 class="ac-section-title">' + title + ' <span class="badge bg-secondary ms-2" style="font-size:0.7rem">' + items.length + '</span></h2>' +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table acc-table">' +
            '<thead><tr>' + headHtml + '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  },

  destroy: function () {
    this._activeSections = {};
    this._activeCO = null;
    this._activeW = false;
    this._activeType = null;
    this._searchQuery = '';
    this._sortKey = null;
    this._sortDir = -1;
  },
};
