var Pages = window.Pages || {};

var PILOTSTATS_COLUMNS = [
  { key: 'Combat',      label: 'Melee' },
  { key: 'Shooting',    label: 'Ranged' },
  { key: 'Assault',     label: 'Assault' },
  { key: 'Tactics',     label: 'Tactical' },
  { key: 'Engineering', label: 'Mechanic' },
  { key: 'Defense',     label: 'Defense' },
];

Pages.pilotstats = {
  title: 'Pilot Stats Table',

  _activeRanks: {},
  _sortKey:     'Combat',
  _sortDir:     -1,

  _buildRows: function () {
    var pilots = (window.PilotsData || {}).pilots || [];
    return pilots.map(function (p) {
      var stats = p.stats || {};
      var row = { pilot: p };
      PILOTSTATS_COLUMNS.forEach(function (c) {
        row[c.key] = parseInt(stats[c.key], 10) || 0;
      });
      return row;
    });
  },

  render: function () {
    var self = this;
    var rows = this._buildRows();

    var rankButtons = ['SSR', 'SR', 'R'].map(function (q) {
      var suffix = QUALITY_CLASS[q].replace('rank-', '');
      return '<button class="filter-btn filter-rank-' + suffix + '" data-filter-rank="' + q + '">' + QUALITY_LABEL[q] + '</button>';
    }).join('');

    var headHtml =
      '<th class="ststats-th-name">Pilot</th>' +
      PILOTSTATS_COLUMNS.map(function (c) {
        return '<th class="ststats-th-sortable" data-sort-key="' + c.key + '">' + c.label + '<span class="ststats-sort-arrow"></span></th>';
      }).join('');

    var html = (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>Pilot Stats Table</h1>' +
        '<span class="badge bg-secondary ms-3" id="pilotstats-count">' + rows.length + '</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-group"><span class="filter-label">Rank</span>' + rankButtons + '</div>' +
      '</div>' +
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table ststats-table">' +
          '<thead><tr>' + headHtml + '</tr></thead>' +
          '<tbody id="pilotstats-tbody"></tbody>' +
        '</table>' +
      '</div>'
    );

    setTimeout(function () {
      $(document).on('click.pilotstats', '[data-filter-rank]', function () {
        var q = $(this).data('filter-rank');
        self._activeRanks[q] = !self._activeRanks[q];
        $(this).toggleClass('active', !!self._activeRanks[q]);
        self._renderRows(rows);
      });

      $(document).on('click.pilotstats', '[data-sort-key]', function () {
        var key = $(this).data('sort-key');
        if (self._sortKey === key) {
          self._sortDir = -self._sortDir;
        } else {
          self._sortKey = key;
          self._sortDir = -1;
        }
        self._renderRows(rows);
      });

      Object.keys(self._activeRanks).forEach(function (q) {
        if (self._activeRanks[q]) $('[data-filter-rank="' + q + '"]').addClass('active');
      });

      self._renderRows(rows);
    }, 0);

    return html;
  },

  _renderRows: function (rows) {
    var activeRanks = Object.keys(this._activeRanks).filter(function (k) { return this._activeRanks[k]; }, this);
    var sortKey = this._sortKey;
    var sortDir = this._sortDir;

    $('.ststats-th-sortable').removeClass('ststats-sort-asc ststats-sort-desc');
    $('.ststats-th-sortable[data-sort-key="' + sortKey + '"]').addClass(sortDir === 1 ? 'ststats-sort-asc' : 'ststats-sort-desc');

    var filtered = rows.filter(function (r) {
      return activeRanks.length === 0 || activeRanks.indexOf(r.pilot.quality) !== -1;
    }).slice().sort(function (a, b) {
      return (a[sortKey] - b[sortKey]) * sortDir;
    });

    var bodyHtml = filtered.map(function (r) {
      var p         = r.pilot;
      var rankClass = QUALITY_CLASS[p.quality] || '';
      var bgSrc     = QUALITY_BG[p.quality] || '';
      var imgSrc    = AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png';
      var nameEsc   = $('<span>').text(p.PilotName).html();

      return (
        '<tr>' +
          '<td class="ststats-name-cell">' +
            '<a class="dispatch-cell" href="#pilots/' + encodeURIComponent(p.PilotName) + '">' +
              '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
                '<img src="' + imgSrc + '" alt="' + nameEsc + '" loading="lazy" />' +
              '</span>' +
              '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
            '</a>' +
          '</td>' +
          PILOTSTATS_COLUMNS.map(function (c) {
            return '<td>' + r[c.key] + '</td>';
          }).join('') +
        '</tr>'
      );
    }).join('');

    $('#pilotstats-tbody').html(bodyHtml);
    $('#pilotstats-count').text(filtered.length);
  },

  destroy: function () {
    $(document).off('click.pilotstats');
    this._activeRanks = {};
    this._sortKey = 'Combat';
    this._sortDir = -1;
  },
};

window.Pages = Pages;
