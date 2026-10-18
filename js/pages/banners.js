var Pages = window.Pages || {};

var BANNER_KIND_LABEL = { pilot: 'Pilot', st: 'ST' };
var BANNER_TYPE_LABEL = {
  limited:  'Limited',
  selector: 'Selector',
  exchange: 'Exchange',
  standard: 'Standard',
  beginner: 'Beginner',
};
var BANNER_OPTIONS_LABEL = { selector: 'Pick one of', exchange: 'Exchangeable' };
var BANNER_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function bannerImageSrc(b) {
  return ASSET_BASE + 'data/banners/' + b.image + '.jpg';
}

// "2026-10-01" -> "Oct 1, 2026"
function bannerDate(s) {
  var p = s.split('-');
  return BANNER_MONTHS[+p[1] - 1] + ' ' + (+p[2]) + ', ' + p[0];
}

function bannerVersionKey(v) {
  return v.split('.').map(Number).reduce(function (acc, n) { return acc * 100 + n; }, 0);
}

Pages.banners = {
  title: 'Banner History',
  _activeKinds: {},
  _activeVersions: {},

  render: function () {
    var self = this;
    var data = window.BannersData || {};
    var banners = data.banners || [];
    self._activeKinds = {};
    self._activeVersions = {};

    // A unit's first banner is its debut; later ones are reruns.
    var debut = {};
    banners.forEach(function (b) {
      (b.featured || []).forEach(function (n) {
        var key = b.kind + ':' + n;
        if (!debut[key] || self._before(b, debut[key])) debut[key] = b;
      });
    });

    var groups = [];
    banners.forEach(function (b) {
      var key = b.version || 'standard';
      var g = groups.find(function (g) { return g.key === key; });
      if (!g) { g = { key: key, upcoming: false, banners: [] }; groups.push(g); }
      g.banners.push(b);
      if (b.upcoming) g.upcoming = true;
    });
    groups.sort(function (a, b) {
      if (a.key === 'standard') return 1;
      if (b.key === 'standard') return -1;
      return bannerVersionKey(b.key) - bannerVersionKey(a.key);
    });
    groups.forEach(function (g) {
      g.banners.sort(function (a, b) { return self._before(a, b) ? -1 : self._before(b, a) ? 1 : 0; });
    });

    var kindNav = '<div class="filter-group"><span class="filter-label">Type</span><div class="filter-values">' +
      ['pilot', 'st'].map(function (k) {
        return '<button class="filter-btn filter-occ" data-filter-kind="' + k + '">' + BANNER_KIND_LABEL[k] + '</button>';
      }).join('') +
    '</div></div>';
    var versionNav = '<div class="filter-group"><span class="filter-label">Version</span><div class="filter-values">' +
      groups.filter(function (g) { return g.key !== 'standard'; }).map(function (g) {
        return '<button class="filter-btn filter-ver" data-filter-version="' + g.key + '">v' + g.key + '</button>';
      }).join('') +
    '</div></div>';

    var sectionsHtml = groups.map(function (g) {
      var title = g.key === 'standard' ? 'Standard Banners' : 'Version ' + g.key + (g.upcoming ? ' <span class="banner-upcoming-tag">Upcoming</span>' : '');
      return (
        '<div class="ac-section banner-section" data-version="' + g.key + '">' +
          '<h2 class="ac-section-title">' + title + '</h2>' +
          '<div class="row g-3">' +
            g.banners.map(function (b) { return self._cardHtml(b, debut); }).join('') +
          '</div>' +
        '</div>'
      );
    }).join('');

    setTimeout(function () {
      $('#banner-page').on('click', '[data-filter-kind]', function () {
        var k = $(this).data('filter-kind');
        self._activeKinds[k] = !self._activeKinds[k];
        $(this).toggleClass('active', !!self._activeKinds[k]);
        self._applyFilter();
      });
      $('#banner-page').on('click', '.banner-card-img-zoom', function (e) {
        if ($(e.target).closest('a').length) return;
        self._showImage($(this).find('img').attr('src'), $(this).data('name'));
      });
      $('#banner-page').on('click', '[data-filter-version]', function () {
        var v = String($(this).data('filter-version'));
        self._activeVersions[v] = !self._activeVersions[v];
        $(this).toggleClass('active', !!self._activeVersions[v]);
        self._applyFilter();
      });
    }, 0);

    return (
      '<div id="banner-page">' +
        '<div class="listing-header"><h1>Banner History</h1></div>' +
        '<p class="dispatch-intro">' + $('<span>').text(data.note || '').html() + '</p>' +
        '<div class="filter-bar">' + kindNav + versionNav + '</div>' +
        sectionsHtml +
      '</div>'
    );
  },

  // Dated banners in start order, then undated ones (standard, upcoming) by pool ID.
  _before: function (a, b) {
    if ((a.start || '~') !== (b.start || '~')) return (a.start || '~') < (b.start || '~');
    if (a.kind !== b.kind) return a.kind === 'pilot';
    return a.id < b.id;
  },

  _cardHtml: function (b, debut) {
    var self = this;
    var esc = function (s) { return $('<span>').text(s).html(); };
    var featured = b.featured || [];
    var tag = BANNER_TYPE_LABEL[b.type] || b.type;
    if (b.type === 'limited' && featured.length) {
      tag = featured.every(function (n) { return debut[b.kind + ':' + n] === b; }) ? 'New' : 'Rerun';
    }

    var dates;
    if (b.start) dates = bannerDate(b.start) + ' – ' + (b.end ? bannerDate(b.end) : 'no end date');
    else if (b.upcoming) dates = 'Dates not announced';
    else dates = 'Always available';

    var unitsOf = function (names) {
      return names.map(function (n) { return self._unitHtml(b.kind, n); }).join('');
    };
    // Exchange and selector banners' art is a generic placeholder, so their units go on top of it.
    var options = b.options || [];
    var overlayHtml = (b.type === 'exchange' || b.type === 'selector') && options.length ? '<div class="banner-units banner-units-overlay">' + unitsOf(options) + '</div>' : '';
    var rowUnits = featured.concat(overlayHtml ? [] : options);

    return (
      '<div class="col-12 col-md-6 col-xl-4 banner-card-wrap" data-kind="' + b.kind + '">' +
        '<div class="banner-card">' +
          '<div class="banner-card-img' + (overlayHtml ? '' : ' banner-card-img-zoom') + '" data-name="' + esc(b.name) + '">' +
            '<img src="' + bannerImageSrc(b) + '" alt="' + esc(b.name) + '" loading="lazy" />' +
            overlayHtml +
            '<span class="banner-kind-badge banner-kind-' + b.kind + '">' + BANNER_KIND_LABEL[b.kind] + '</span>' +
            '<span class="banner-type-badge banner-type-' + tag.toLowerCase() + '">' + esc(tag) + '</span>' +
          '</div>' +
          '<div class="banner-card-body">' +
            '<div class="banner-card-text">' +
              '<div class="banner-card-name">' + esc(b.name) + '</div>' +
              '<div class="banner-dates">' + dates + '</div>' +
              (!featured.length && options.length && !overlayHtml ? '<div class="banner-options-label">' + (BANNER_OPTIONS_LABEL[b.type] || 'Includes') + '</div>' : '') +
            '</div>' +
            (rowUnits.length ? '<div class="banner-units">' + unitsOf(rowUnits) + '</div>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _unitHtml: function (kind, name) {
    var nameEsc = $('<span>').text(name).html();
    if (kind === 'pilot') {
      var p = ((window.PilotsData || {}).pilots || []).find(function (p) { return p.PilotName === name; });
      if (p) {
        return (
          '<a class="dispatch-cell" href="' + App.href('pilots', p.PilotName) + '">' +
            '<span class="dispatch-cell-icon ' + (QUALITY_CLASS[p.quality] || '') + '" style="background-image:url(\'' + (QUALITY_BG[p.quality] || '') + '\')">' +
              '<img src="' + pilotAvatarSrc(p) + '"' + pilotAvatarErrorAttr(p) + ' alt="' + nameEsc + '" loading="lazy" />' +
            '</span>' +
            '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
          '</a>'
        );
      }
    } else {
      var m = ((window.MechsData || {}).mechs || []).find(function (m) { return m.name === name; });
      if (m) {
        return (
          '<a class="dispatch-cell" href="' + App.href('sts', m.name) + '">' +
            '<span class="dispatch-cell-icon ' + (MECH_QUALITY_CLASS[m.quality] || '') + '" style="background-image:url(\'' + (MECH_QUALITY_BG[m.quality] || '') + '\')">' +
              '<img src="' + mechIconSrc(m) + '"' + mechIconErrorAttr(m) + ' alt="' + nameEsc + '" loading="lazy" />' +
            '</span>' +
            '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
          '</a>'
        );
      }
    }
    return (
      '<div class="dispatch-cell dispatch-cell-unreleased">' +
        '<span class="dispatch-cell-icon dispatch-cell-icon-empty"></span>' +
        '<span class="dispatch-cell-name">' + nameEsc + '</span>' +
      '</div>'
    );
  },

  _applyFilter: function () {
    var kinds = this._activeKinds, versions = this._activeVersions;
    var anyKind = Object.keys(kinds).some(function (k) { return kinds[k]; });
    var anyVersion = Object.keys(versions).some(function (v) { return versions[v]; });
    $('#banner-page .banner-section').each(function () {
      var $s = $(this);
      var showSection = !anyVersion || !!versions[String($s.data('version'))];
      var visible = 0;
      $s.find('.banner-card-wrap').each(function () {
        var show = showSection && (!anyKind || !!kinds[$(this).data('kind')]);
        $(this).toggle(show);
        if (show) visible++;
      });
      $s.toggle(visible > 0);
    });
  },

  // Full-size banner art in a Bootstrap modal, kept on <body> across visits.
  _showImage: function (src, name) {
    var $modal = $('#banner-image-modal');
    if (!$modal.length) {
      $modal = $(
        '<div class="modal fade banner-image-modal" id="banner-image-modal" tabindex="-1" aria-hidden="true" data-bs-theme="dark">' +
          '<div class="modal-dialog modal-dialog-centered modal-xl">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<h5 class="modal-title"></h5>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
              '</div>' +
              '<img class="banner-image-modal-img" alt="" />' +
            '</div>' +
          '</div>' +
        '</div>'
      ).appendTo('body');
    }
    $modal.find('.modal-title').text(name);
    $modal.find('.banner-image-modal-img').attr({ src: src, alt: name });
    bootstrap.Modal.getOrCreateInstance($modal[0]).show();
  },

  destroy: function () {
    $('#banner-page').off();
    var modal = document.getElementById('banner-image-modal');
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
  },
};

window.Pages = Pages;
