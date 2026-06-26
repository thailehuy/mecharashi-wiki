var Pages = window.Pages || {};

var QUALITY_LABEL = { R: 'B-rank', SR: 'A-rank', SSR: 'S-rank' };
var QUALITY_CLASS  = { R: 'rank-b',  SR: 'rank-a',  SSR: 'rank-s'  };
var AVATAR_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/characterHalf/';
var PORTRAIT_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/character/';
var SKILL_BASE      = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var OCCUPATION_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/occupation/';

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
    var self = this;
    Translations.loadPilot(p, function (merged) { return self._buildDetail(merged); });
    return this._buildDetail(p);
  },

  _buildDetail: function (p) {
    var rankLabel   = QUALITY_LABEL[p.quality] || p.quality;
    var rankClass   = QUALITY_CLASS[p.quality] || '';
    var portraitSrc = PORTRAIT_BASE + encodeURIComponent(p.AvatarHeroIcon) + '.png';

    var innateEntry = (p.biomimetic_computer_data || []).find(function (e) {
      return /^[1-7]00001$/.test(e.skill3);
    });
    var occIconHtml = innateEntry && innateEntry.icon
      ? '<img class="occupation-icon" src="' + OCCUPATION_BASE + encodeURIComponent(innateEntry.icon) + '.png" alt="" />'
      : '';

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
          '<h2 class="detail-name">' + occIconHtml + $('<span>').text(p.PilotName).html() + '</h2>' +
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
      '</div>' +
      this._renderSkills(p.biomimetic_computer_data) +
      this._renderNeuralDrive(p.NeuralDriveTemplate)
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

  _renderSkills: function (bcd) {
    if (!bcd || !bcd.length) return '';

    var self = this;
    var TYPE_LABEL = { EquipmentSkill: 'Attack', Order: 'Code', SpecialAssault: 'Code + Attack' };
    var TYPE_CLASS = { EquipmentSkill: 'skill-type-attack', Order: 'skill-type-code', SpecialAssault: 'skill-type-special' };

    var withSkill = bcd.filter(function (e) { return e.skill && e.skill.SkillIcon; });
    var innate    = withSkill.filter(function (e) { return /^[1-7]00001$/.test(e.skill3); });
    var regular   = withSkill.filter(function (e) { return !/^[1-7]00001$/.test(e.skill3); });

    function buildCard(entry, overrideLabel, overrideCls) {
      var sk        = entry.skill;
      var type      = sk.type || null;
      var typeLabel = overrideLabel || (type ? (TYPE_LABEL[type] || type) : 'Passive');
      var typeCls   = overrideCls  || (type ? (TYPE_CLASS[type] || '') : 'skill-type-passive');
      var desc      = self._parseEffects(sk.describe || sk.SpecificEffects || '');
      var iconSrc   = SKILL_BASE + encodeURIComponent(sk.SkillIcon) + '.png';

      var statBadges = type && !overrideLabel ? (
        '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + (sk.Ap || '—') + '</span>' +
        '<span class="skill-stat"><span class="skill-stat-label">CD</span>' + (sk.CD || '0') + '</span>'
      ) : '';

      var typeBadges = overrideLabel
        ? '<span class="skill-type-badge ' + typeCls + '">' + typeLabel + '</span>'
        : type === 'SpecialAssault'
          ? '<span class="skill-type-badge skill-type-code">Code</span><span class="skill-type-badge skill-type-attack">Attack</span>'
          : '<span class="skill-type-badge ' + typeCls + '">' + typeLabel + '</span>';

      return (
        '<div class="skill-card">' +
          '<div class="skill-header">' +
            '<img class="skill-icon" src="' + iconSrc + '" alt="' + $('<span>').text(sk.name).html() + '" />' +
            '<div class="skill-header-info">' +
              '<div class="skill-name-row">' +
                '<span class="skill-name">' + $('<span>').text(sk.name).html() + '</span>' +
                typeBadges +
              '</div>' +
              '<div class="skill-stats">' + statBadges + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="talent-desc">' + desc + '</div>' +
        '</div>'
      );
    }

    var innateHtml  = innate.map(function (e)  { return buildCard(e, 'Passive · Innate', 'skill-type-innate'); }).join('');
    var regularHtml = regular.map(function (e) { return buildCard(e); }).join('');

    if (!innateHtml && !regularHtml) return '';

    return (
      '<div class="nd-section">' +
        '<div class="section-heading">Skills</div>' +
        (innateHtml  ? '<div class="skill-list skill-list-innate mb-3">' + innateHtml  + '</div>' : '') +
        (regularHtml ? '<div class="skill-list">'                        + regularHtml + '</div>' : '') +
      '</div>'
    );
  },

  _renderNeuralDrive: function (nd) {
    if (!nd || !nd.ListChipPartition || !nd.ListChipPartition.length) return '';

    var self         = this;
    var COMMON_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/common/';
    var SLOT_COLOR   = { Attack: 'slot-attack', Dodge: 'slot-dodge', Critical: 'slot-critical' };
    var gammaCount   = 0;

    var parts = nd.ListChipPartition.map(function (part) {
      var type = part.TypeComputing; // Alpha | Beta | Gamma
      var iconKey;
      if (type === 'Alpha')      { iconKey = 'alpha'; }
      else if (type === 'Beta')  { iconKey = 'beta';  }
      else { gammaCount++; iconKey = 'gamma' + gammaCount; }

      var slots = (part.ListAssembled || '').split('/').map(function (s) {
        var cls = SLOT_COLOR[s.trim()] || '';
        return '<span class="nd-slot ' + cls + '" title="' + s.trim() + '"></span>';
      }).join('');

      var effects = (part.ListActivationEffects || []).map(function (eff) {
        var ps = eff.PassiveSkill;
        if (!ps) return '';
        var iconSrc = SKILL_BASE + encodeURIComponent(ps.SkillIcon) + '.png';
        var desc    = self._parseEffects(ps.SpecificEffects || '');
        return (
          '<div class="nd-effect">' +
            '<div class="nd-effect-header">' +
              '<img class="talent-icon" src="' + iconSrc + '" alt="' + $('<span>').text(ps.name).html() + '" />' +
              '<div>' +
                '<div class="nd-effect-name">' + $('<span>').text(ps.name).html() + '</div>' +
                '<div class="nd-effect-req">' + eff.MinimumSum + ' pts to unlock</div>' +
              '</div>' +
            '</div>' +
            '<div class="talent-desc">' + desc + '</div>' +
          '</div>'
        );
      }).join('');

      return (
        '<div class="nd-part">' +
          '<div class="nd-part-header">' +
            '<img class="nd-part-icon" src="' + COMMON_BASE + iconKey + '.png" alt="' + iconKey + '" />' +
            '<div class="nd-part-name">' + $('<span>').text(part.name).html() + '</div>' +
            '<div class="nd-slots-wrap">' +
              '<span class="nd-slots-label">Available chip slots</span>' +
              '<div class="nd-slots">' + slots + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="nd-effects">' + effects + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="nd-section">' +
        '<div class="section-heading">Neural Drive</div>' +
        '<div class="nd-parts">' + parts + '</div>' +
      '</div>'
    );
  },

  _parseEffects: function (text) {
    return Glossary.parseEffects(text);
  },

  destroy: function () {
    $(document).off('click.pilots');
    this._activeRanks       = {};
    this._activeOccupations = {};
    this._activeVersions    = {};
  }
};

window.Pages = Pages;
