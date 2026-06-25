var Pages = window.Pages || {};

var QUALITY_LABEL = { R: 'B-rank', SR: 'A-rank', SSR: 'S-rank' };
var QUALITY_CLASS  = { R: 'rank-b',  SR: 'rank-a',  SSR: 'rank-s'  };
var AVATAR_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/characterHalf/';
var PORTRAIT_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/character/';
var SKILL_BASE     = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';

Pages.pilots = {
  title: 'Pilots',

  _activeRanks:       {},
  _activeOccupations: {},
  _activeVersions:    {},

  // ── Routing entry point ────────────────────────────────────────────────────
  render: function (param) {
    var pilots = (window.PilotsData || {}).pilots || [];
    if (param) {
      var pilot = pilots.find(function (p) {
        return p.PilotName.toLowerCase() === decodeURIComponent(param).toLowerCase();
      });
      return pilot ? this._renderDetail(pilot) : '<p class="text-danger mt-3">Pilot not found.</p>';
    }
    return this._renderList(pilots);
  },

  // ── Listing page ───────────────────────────────────────────────────────────
  _renderList: function (pilots) {
    var occupations = [...new Set(pilots.map(function (p) { return p.Occupation; }))].sort();
    var versions    = [...new Set(pilots.map(function (p) { return p.version;    }))].sort();

    var rankButtons = ['SSR', 'SR', 'R'].map(function (q) {
      var suffix = QUALITY_CLASS[q].replace('rank-', '');
      return '<button class="filter-btn filter-rank-' + suffix + '" data-filter-rank="' + q + '">' + QUALITY_LABEL[q] + '</button>';
    }).join('');

    var occButtons = occupations.map(function (o) {
      return '<button class="filter-btn filter-occ" data-filter-occ="' + o + '">' + o + '</button>';
    }).join('');

    var verButtons = versions.map(function (v) {
      return '<button class="filter-btn filter-ver" data-filter-ver="' + v + '">v' + v + '</button>';
    }).join('');

    var html = (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>Pilots</h1>' +
        '<span class="badge bg-secondary ms-3" id="pilot-count">' + pilots.length + '</span>' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-group"><span class="filter-label">Rank</span>' + rankButtons + '</div>' +
        '<div class="filter-group"><span class="filter-label">Occupation</span>' + occButtons + '</div>' +
        '<div class="filter-group"><span class="filter-label">Version</span>' + verButtons + '</div>' +
      '</div>' +
      '<div class="row g-3" id="pilot-grid"></div>'
    );

    var self = this;
    setTimeout(function () {
      self._renderGrid(pilots);

      $(document).on('click.pilots', '[data-filter-rank]', function () {
        var q = $(this).data('filter-rank');
        self._activeRanks[q] = !self._activeRanks[q];
        $(this).toggleClass('active', !!self._activeRanks[q]);
        self._renderGrid(pilots);
      });
      $(document).on('click.pilots', '[data-filter-occ]', function () {
        var o = $(this).data('filter-occ');
        self._activeOccupations[o] = !self._activeOccupations[o];
        $(this).toggleClass('active', !!self._activeOccupations[o]);
        self._renderGrid(pilots);
      });
      $(document).on('click.pilots', '[data-filter-ver]', function () {
        var v = $(this).data('filter-ver');
        self._activeVersions[v] = !self._activeVersions[v];
        $(this).toggleClass('active', !!self._activeVersions[v]);
        self._renderGrid(pilots);
      });
    }, 0);

    return html;
  },

  _renderGrid: function (pilots) {
    var activeRanks = Object.keys(this._activeRanks).filter(k => this._activeRanks[k]);
    var activeOccs  = Object.keys(this._activeOccupations).filter(k => this._activeOccupations[k]);
    var activeVers  = Object.keys(this._activeVersions).filter(k => this._activeVersions[k]);

    var filtered = pilots.filter(function (p) {
      var rankOk = activeRanks.length === 0 || activeRanks.indexOf(p.quality)   !== -1;
      var occOk  = activeOccs.length  === 0 || activeOccs.indexOf(p.Occupation) !== -1;
      var verOk  = activeVers.length  === 0 || activeVers.indexOf(p.version)    !== -1;
      return rankOk && occOk && verOk;
    });

    var cards = filtered.map(function (p) {
      var rankLabel = QUALITY_LABEL[p.quality] || p.quality;
      var rankClass = QUALITY_CLASS[p.quality] || '';
      var imgSrc    = AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png';

      return (
        '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
          '<div class="pilot-card" data-pilot="' + encodeURIComponent(p.PilotName) + '">' +
            '<div class="pilot-avatar">' +
              '<img src="' + imgSrc + '" alt="' + $('<span>').text(p.PilotName).html() + '" loading="lazy" />' +
              '<span class="version-badge">v' + $('<span>').text(p.version).html() + '</span>' +
              '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
            '</div>' +
            '<div class="pilot-info">' +
              '<div class="pilot-name">' + $('<span>').text(p.PilotName).html() + '</div>' +
              '<div class="pilot-realname">' + $('<span>').text(p.RealName).html() + '</div>' +
              '<div class="pilot-tags">' +
                '<span class="tag">' + $('<span>').text(p.Gender).html() + '</span>' +
                '<span class="tag">' + $('<span>').text(p.Profession).html() + '</span>' +
                '<span class="tag">' + $('<span>').text(p.Occupation).html() + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    $('#pilot-grid').html(cards || '<p class="text-secondary ms-2 mt-2">No pilots match the selected filters.</p>');
    $('#pilot-count').text(filtered.length);

    $(document).on('click.pilots', '.pilot-card', function () {
      var name = decodeURIComponent($(this).data('pilot'));
      window.location.hash = '#pilots/' + encodeURIComponent(name);
    });
  },

  // ── Detail page ────────────────────────────────────────────────────────────
  _renderDetail: function (p) {
    var rankLabel   = QUALITY_LABEL[p.quality] || p.quality;
    var rankClass   = QUALITY_CLASS[p.quality] || '';
    var portraitSrc = PORTRAIT_BASE + encodeURIComponent(p.AvatarHeroIcon) + '.png';

    return (
      '<a href="#pilots" class="btn-back">&#8592; Back to Pilots</a>' +
      '<div class="detail-layout">' +
        '<div class="detail-portrait-col">' +
          '<div class="detail-portrait">' +
            '<img src="' + portraitSrc + '" alt="' + $('<span>').text(p.PilotName).html() + '" />' +
            '<span class="version-badge">v' + $('<span>').text(p.version).html() + '</span>' +
            '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="detail-info-col">' +
          '<h2 class="detail-name">' + $('<span>').text(p.PilotName).html() + '</h2>' +
          '<p class="detail-realname">' + $('<span>').text(p.RealName).html() + '</p>' +
          '<div class="detail-tags">' +
            '<span class="tag">' + $('<span>').text(p.Gender).html() + '</span>' +
            '<span class="tag">' + $('<span>').text(p.Profession).html() + '</span>' +
            '<span class="tag">' + $('<span>').text(p.Occupation).html() + '</span>' +
          '</div>' +
          '<div class="detail-talents">' +
            this._renderTalent(p.Talent0_2Ability, 'Basic Talent') +
            this._renderTalent(p.Talent3_5Ability, 'Upgraded Talent') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _renderTalent: function (talent, label) {
    if (!talent || !talent.name) return '';
    var iconSrc = SKILL_BASE + encodeURIComponent(talent.SkillIcon) + '.png';
    var desc    = this._parseEffects(talent.SpecificEffects || '');

    return (
      '<div class="talent-card">' +
        '<div class="talent-header">' +
          '<img class="talent-icon" src="' + iconSrc + '" alt="' + $('<span>').text(talent.name).html() + '" />' +
          '<div>' +
            '<div class="talent-label">' + label + '</div>' +
            '<div class="talent-name">' + $('<span>').text(talent.name).html() + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="talent-desc">' + desc + '</div>' +
      '</div>'
    );
  },

  _parseEffects: function (text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '\x00LT\x00').replace(/>/g, '\x00GT\x00')
      // restore only the tags we handle
      .replace(/\x00LT\x00color=(#[0-9A-Fa-f]+)\x00GT\x00([\s\S]*?)\x00LT\x00\/color\x00GT\x00/g,
        function (_, color, inner) { return '<span style="color:' + color + '">' + inner + '</span>'; })
      .replace(/\x00LT\x00buf[^)]*?\x00GT\x00([\s\S]*?)\x00LT\x00\/buf\x00GT\x00/g, '$1')
      // strip any remaining unknown tags
      .replace(/\x00LT\x00[^]*?\x00GT\x00/g, '')
      .replace(/\n/g, '<br>');
  },

  destroy: function () {
    $(document).off('click.pilots');
    this._activeRanks       = {};
    this._activeOccupations = {};
    this._activeVersions    = {};
  }
};

window.Pages = Pages;
