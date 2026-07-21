var Pages = window.Pages || {};

// Column value colors mirror the ST detail page (js/pages/sts.js): Firepower
// uses .mech-stat-fire's value color, DEF/Crit RES/Hit/Dodge reuse the
// .mech-part-* classes, and Remaining Weight reuses .mech-stat-weight (with
// .mech-stat-over for a negative, over-budget value, same as the detail page).
var STSTATS_COLUMNS = [
  { key: 'firepower', label: 'Firepower',  cls: 'ststats-col-fire' },
  { key: 'lArmHit',   label: 'L-Arm Hit',  cls: 'ststats-col-hit' },
  { key: 'rArmHit',   label: 'R-Arm Hit',  cls: 'ststats-col-hit' },
  { key: 'dodge',     label: 'Dodge',      cls: 'ststats-col-dodge' },
  { key: 'critRes',   label: 'Crit RES',   cls: 'ststats-col-crit' },
  { key: 'def',       label: 'DEF',        cls: 'ststats-col-def' },
  { key: 'remaining', label: 'Remaining Weight', cls: 'ststats-col-weight' },
];

Pages.ststats = {
  title: 'ST Stats Table',

  _activeTypes: {},
  _sortKey:     'firepower',
  _sortDir:     -1,

  _buildRows: function () {
    var mechs = (window.MechsData || {}).mechs || [];
    return mechs.filter(function (m) { return m.quality === 'SSR'; }).map(function (m) {
      var parts = m.parts || [];
      var body  = parts.find(function (p) { return p.position === '躯干'; }) || {};
      var lArm  = parts.find(function (p) { return p.position === '左臂'; }) || {};
      var rArm  = parts.find(function (p) { return p.position === '右臂'; }) || {};
      var legs  = parts.find(function (p) { return p.position === '腿部'; }) || {};

      var bodyOutput  = parseInt(m.output, 10) || 0;
      var partsWeight = parts.reduce(function (sum, p) { return sum + (parseInt(p.aircraftWeight, 10) || 0); }, 0);

      return {
        mech:       m,
        firepower:  parseInt(m.manjiFirepower || m.fire, 10) || 0,
        lArmHit:    parseInt(lArm.Hit, 10) || 0,
        rArmHit:    parseInt(rArm.Hit, 10) || 0,
        dodge:      parseInt(legs.Dodge, 10) || 0,
        critRes:    parseInt(body.Antiriot, 10) || 0,
        def:        parseInt(body.Armor, 10) || 0,
        remaining:  bodyOutput - partsWeight,
      };
    });
  },

  render: function () {
    var self = this;
    var rows = this._buildRows();

    var typeButtons = ['Light', 'Medium', 'Heavy'].map(function (t) {
      return '<button class="filter-btn filter-occ" data-filter-type="' + t + '">' + t + '</button>';
    }).join('');

    var headHtml =
      '<th class="ststats-th-name">ST</th>' +
      STSTATS_COLUMNS.map(function (c) {
        return '<th class="ststats-th-sortable" data-sort-key="' + c.key + '">' + c.label + '<span class="ststats-sort-arrow"></span></th>';
      }).join('');

    var html = (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>ST Stats Table</h1>' +
        '<span class="badge bg-secondary ms-3" id="ststats-count">' + rows.length + '</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-group"><span class="filter-label">Type</span>' + typeButtons + '</div>' +
      '</div>' +
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table ststats-table">' +
          '<thead><tr>' + headHtml + '</tr></thead>' +
          '<tbody id="ststats-tbody"></tbody>' +
        '</table>' +
      '</div>'
    );

    setTimeout(function () {
      $(document).on('click.ststats', '[data-filter-type]', function () {
        var t = $(this).data('filter-type');
        self._activeTypes[t] = !self._activeTypes[t];
        $(this).toggleClass('active', !!self._activeTypes[t]);
        self._renderRows(rows);
      });

      $(document).on('click.ststats', '[data-sort-key]', function () {
        var key = $(this).data('sort-key');
        if (self._sortKey === key) {
          self._sortDir = -self._sortDir;
        } else {
          self._sortKey = key;
          self._sortDir = -1;
        }
        self._renderRows(rows);
      });

      Object.keys(self._activeTypes).forEach(function (t) {
        if (self._activeTypes[t]) $('[data-filter-type="' + t + '"]').addClass('active');
      });

      self._renderRows(rows);
    }, 0);

    return html;
  },

  _renderRows: function (rows) {
    var activeTypes = Object.keys(this._activeTypes).filter(function (k) { return this._activeTypes[k]; }, this);
    var sortKey = this._sortKey;
    var sortDir = this._sortDir;

    $('.ststats-th-sortable').removeClass('ststats-sort-asc ststats-sort-desc');
    $('.ststats-th-sortable[data-sort-key="' + sortKey + '"]').addClass(sortDir === 1 ? 'ststats-sort-asc' : 'ststats-sort-desc');

    var filtered = rows.filter(function (r) {
      return activeTypes.length === 0 || activeTypes.indexOf(r.mech.type) !== -1;
    }).slice().sort(function (a, b) {
      return (a[sortKey] - b[sortKey]) * sortDir;
    });

    var bodyHtml = filtered.map(function (r) {
      var m = r.mech;
      var rankClass = MECH_QUALITY_CLASS[m.quality] || '';
      var bgSrc     = MECH_QUALITY_BG[m.quality] || '';
      var iconSrc   = MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png';
      var nameEsc   = $('<span>').text(m.name).html();

      return (
        '<tr>' +
          '<td class="ststats-name-cell">' +
            '<a class="dispatch-cell" href="#sts/' + encodeURIComponent(m.name) + '">' +
              '<span class="dispatch-cell-icon ' + rankClass + '" style="background-image:url(\'' + bgSrc + '\')">' +
                '<img src="' + iconSrc + '" alt="' + nameEsc + '" loading="lazy" />' +
              '</span>' +
              '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
            '</a>' +
          '</td>' +
          STSTATS_COLUMNS.map(function (c) {
            var over = c.key === 'remaining' && r[c.key] < 0;
            return '<td class="' + c.cls + (over ? ' ststats-col-over' : '') + '">' + r[c.key] + '</td>';
          }).join('') +
        '</tr>'
      );
    }).join('');

    $('#ststats-tbody').html(bodyHtml);
    $('#ststats-count').text(filtered.length);
  },

  destroy: function () {
    $(document).off('click.ststats');
    this._activeTypes = {};
    this._sortKey = 'firepower';
    this._sortDir = -1;
  },
};

window.Pages = Pages;
