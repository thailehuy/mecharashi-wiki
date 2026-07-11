var Pages = window.Pages || {};

var GLOBAL_VERSION = 2.0;

var QUALITY_LABEL = { R: 'B-rank', SR: 'A-rank', SSR: 'S-rank' };
var QUALITY_CLASS  = { R: 'rank-b',  SR: 'rank-a',  SSR: 'rank-s'  };
var QUALITY_BG = {
  SSR: 'data/background/quality-ssr.png',
  SR:  'data/background/quality-sr.png',
  R:   'data/background/quality-r.png',
};
var AVATAR_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/characterHalf/';
var PORTRAIT_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/character/';
var SKILL_BASE      = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var OCCUPATION_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/occupation/';
var WEAPON_IMG_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/weapons/';

Pages.pilots = {
  title: 'Pilots',

  _activeRanks:       {},
  _activeOccupations: {},
  _activeVersions:    {},
  _activeLicenses:    {},
  _enOnly:            true,
  _lastViewed:        null,
  _searchQuery:       '',
  _skinIndex:         null,

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

    var licButtons = ['Light', 'Medium', 'Heavy'].map(function (l) {
      return '<button class="filter-btn filter-lic" data-filter-lic="' + l + '">' + l + '</button>';
    }).join('');

    var html = (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>Pilots</h1>' +
        '<span class="badge bg-secondary ms-3" id="pilot-count">' + pilots.length + '</span>' +
      '</div>' +
      '<div class="search-box-wrap">' +
        '<input type="text" class="search-box" id="pilot-search" placeholder="Search pilots by name..." />' +
      '</div>' +
      '<div class="filter-bar">' +
        '<div class="filter-row">' +
          '<div class="filter-group"><span class="filter-label">Rank</span>' + rankButtons + '</div>' +
          '<div class="filter-group"><span class="filter-label">License</span>' + licButtons + '</div>' +
          '<div class="filter-group ms-auto"><button class="filter-btn filter-en" id="toggle-en-pilots">EN Only</button></div>' +
        '</div>' +
        '<div class="filter-row">' +
          '<div class="filter-group"><span class="filter-label">Occupation</span>' + occButtons + '</div>' +
        '</div>' +
        '<div class="filter-row">' +
          '<div class="filter-group"><span class="filter-label">Version</span>' + verButtons + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="row g-3" id="pilot-grid"></div>'
    );

    var self = this;
    setTimeout(function () {
      $('#pilot-search').val(self._searchQuery);
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
      $(document).on('click.pilots', '[data-filter-lic]', function () {
        var l = $(this).data('filter-lic');
        self._activeLicenses[l] = !self._activeLicenses[l];
        $(this).toggleClass('active', !!self._activeLicenses[l]);
        self._renderGrid(pilots);
      });
      $('#toggle-en-pilots').toggleClass('active', self._enOnly);
      $(document).on('click.pilots', '#toggle-en-pilots', function () {
        self._enOnly = !self._enOnly;
        $(this).toggleClass('active', self._enOnly);
        self._renderGrid(pilots);
      });
      $(document).on('input.pilots', '#pilot-search', function () {
        self._searchQuery = $(this).val();
        self._renderGrid(pilots);
      });
    }, 0);

    return html;
  },

  _renderGrid: function (pilots) {
    var activeRanks = Object.keys(this._activeRanks).filter(k => this._activeRanks[k]);
    var activeOccs  = Object.keys(this._activeOccupations).filter(k => this._activeOccupations[k]);
    var activeVers  = Object.keys(this._activeVersions).filter(k => this._activeVersions[k]);
    var activeLics  = Object.keys(this._activeLicenses).filter(k => this._activeLicenses[k]);

    var enOnly = this._enOnly;
    var query  = (this._searchQuery || '').trim().toLowerCase();
    var filtered = pilots.filter(function (p) {
      var rankOk   = activeRanks.length === 0 || activeRanks.indexOf(p.quality)   !== -1;
      var occOk    = activeOccs.length  === 0 || activeOccs.indexOf(p.Occupation) !== -1;
      var verOk    = activeVers.length  === 0 || activeVers.indexOf(p.version)    !== -1;
      var licOk    = activeLics.length  === 0 || activeLics.indexOf(p.AllowedMechaDriveList_DriveAllowedList) !== -1;
      var enOk     = !enOnly || p.enTranslation;
      var searchOk = !query || (p.PilotName || '').toLowerCase().indexOf(query) !== -1;
      return rankOk && occOk && verOk && licOk && enOk && searchOk;
    }).slice().sort(function (a, b) {
      return parseFloat(b.version) - parseFloat(a.version);
    });

    var allWeapons = (window.WeaponsData || {}).weapons || [];

    var cards = filtered.map(function (p) {
      var rankLabel = QUALITY_LABEL[p.quality] || p.quality;
      var rankClass = QUALITY_CLASS[p.quality] || '';
      var bgSrc     = QUALITY_BG[p.quality] || '';
      var imgSrc    = AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png';

      var weapon = allWeapons.find(function (w) { return w.pilot === p.PilotName; });
      var weaponIconHtml = '';
      if (weapon) {
        var wImgSrc = WEAPON_IMG_BASE + encodeURIComponent(weapon.icon) + '.png';
        weaponIconHtml = '<img class="pilot-weapon-icon" src="' + wImgSrc + '" alt="' + $('<span>').text(weapon.name).html() + '" loading="lazy" />';
      }

      return (
        '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
          '<div class="pilot-card" data-pilot="' + encodeURIComponent(p.PilotName) + '">' +
            '<div class="pilot-avatar" style="background-image:url(\'' + bgSrc + '\')">' +
              '<img src="' + imgSrc + '" alt="' + $('<span>').text(p.PilotName).html() + '" loading="lazy" />' +
              '<span class="version-badge">v' + $('<span>').text(p.version).html() + '</span>' +
              '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
            '</div>' +
            '<div class="pilot-info">' +
              '<div class="pilot-info-text">' +
                '<div class="pilot-name">' + $('<span>').text(p.PilotName).html() + '</div>' +
                '<div class="pilot-realname">' + $('<span>').text(p.RealName).html() + '</div>' +
                '<div class="pilot-tags">' +
                  '<span class="tag">' + $('<span>').text(p.Occupation).html() + '</span>' +
                  (p.AllowedMechaDriveList_DriveAllowedList ? '<span class="tag tag-license">' + $('<span>').text(p.AllowedMechaDriveList_DriveAllowedList).html() + '</span>' : '') +
                '</div>' +
              '</div>' +
              weaponIconHtml +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    $('#pilot-grid').html(cards || '<p class="text-secondary ms-2 mt-2">No pilots match the selected filters.</p>');
    $('#pilot-count').text(filtered.length);

    if (this._lastViewed) {
      var $card = $('[data-pilot="' + encodeURIComponent(this._lastViewed) + '"]');
      if ($card.length) $card[0].scrollIntoView({ block: 'center' });
      this._lastViewed = null;
    }

    var self = this;
    $(document).on('click.pilots', '.pilot-card', function () {
      var name = decodeURIComponent($(this).data('pilot'));
      self._lastViewed = name;
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
    var self = this;
    var rankLabel   = QUALITY_LABEL[p.quality] || p.quality;
    var rankClass   = QUALITY_CLASS[p.quality] || '';
    var bgSrc       = QUALITY_BG[p.quality] || '';

    var skinLetters = ['A'].concat(p.AlternateSkins || []);
    if (this._skinIndex == null || this._skinIndex >= skinLetters.length) this._skinIndex = 0;
    var skinIdx = this._skinIndex;

    function avatarSrcFor(letter) {
      return PORTRAIT_BASE + encodeURIComponent(p.AvatarHeroIcon.replace(/^(.*)A_Raw$/, '$1' + letter + '_Raw')) + '.png';
    }
    function thumbSrcFor(letter) {
      return AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon.replace(/^(.*)A_half$/, '$1' + letter + '_half')) + '.png';
    }
    var portraitSrc = avatarSrcFor(skinLetters[skinIdx]);
    var thumbSrc     = thumbSrcFor(skinLetters[skinIdx]);

    var skinNavHtml = '';
    if (skinLetters.length > 1) {
      skinNavHtml =
        '<button class="skin-nav skin-nav-prev" data-skin-nav="prev" aria-label="Previous skin">&#10094;</button>' +
        '<button class="skin-nav skin-nav-next" data-skin-nav="next" aria-label="Next skin">&#10095;</button>' +
        '<div class="portrait-loading"></div>' +
        '<div class="skin-dots">' +
          skinLetters.map(function (l, i) {
            return '<span class="skin-dot' + (i === skinIdx ? ' active' : '') + '"></span>';
          }).join('') +
        '</div>';

      $(document).off('click.pilots-skin').on('click.pilots-skin', '[data-skin-nav]', function () {
        if (self._skinTransitioning) return;
        var dir = $(this).data('skin-nav') === 'next' ? 1 : -1;
        var nextIdx = (self._skinIndex + dir + skinLetters.length) % skinLetters.length;
        var newSrc   = avatarSrcFor(skinLetters[nextIdx]);
        var newThumb = thumbSrcFor(skinLetters[nextIdx]);

        self._skinIndex = nextIdx;
        self._skinTransitioning = true;

        var $img     = $('.detail-portrait-img');
        var $thumb   = $('.detail-name-avatar');
        var $loading = $('.portrait-loading');
        var outCls   = dir === 1 ? 'skin-slide-out-left'  : 'skin-slide-out-right';
        var inCls    = dir === 1 ? 'skin-slide-in-right'  : 'skin-slide-in-left';

        $loading.addClass('active');
        $img.addClass(outCls);
        $thumb.css('opacity', 0);

        var preload = new Image();
        preload.onload = preload.onerror = function () {
          $loading.removeClass('active');
          $img.attr('src', newSrc).removeClass(outCls).addClass(inCls);
          $thumb.attr('src', newThumb);
          // force reflow so the browser registers the "in" starting position
          // before we remove it, otherwise the transition wouldn't play
          void $img[0].offsetWidth;
          requestAnimationFrame(function () {
            $img.removeClass(inCls);
            $thumb.css('opacity', 1);
          });
          setTimeout(function () { self._skinTransitioning = false; }, 260);
        };
        preload.src = newSrc;

        $('.skin-dot').removeClass('active').eq(nextIdx).addClass('active');
      });
    }

    var innateEntry = (p.biomimetic_computer_data || []).find(function (e) {
      return /^[1-7]00001$/.test(e.skill3);
    });
    var occIconHtml = innateEntry && innateEntry.icon
      ? '<img class="occupation-icon" src="' + OCCUPATION_BASE + encodeURIComponent(innateEntry.icon) + '.png" alt="" />'
      : '';

    var cnWarning = parseFloat(p.version) > GLOBAL_VERSION
      ? '<div class="cn-warning">This Pilot data is translated from CN text, there might be inaccuracy and mismatch. The actual translation will be updated when this unit is released in Global.</div>'
      : '';

    return (
      cnWarning +
      '<a href="#pilots" class="btn-back">&#8592; Back to Pilots</a>' +
      '<div class="detail-name-row">' +
        '<img class="detail-name-avatar" src="' + thumbSrc + '" alt="' + $('<span>').text(p.PilotName).html() + '" style="background-image:url(\'' + bgSrc + '\')" />' +
        '<div>' +
          '<h2 class="detail-name">' + occIconHtml + $('<span>').text(p.PilotName).html() + '</h2>' +
          '<p class="detail-realname">' + $('<span>').text(p.RealName).html() + '</p>' +
          '<div class="detail-tags">' +
            '<span class="tag">' + $('<span>').text(p.Gender).html() + '</span>' +
            '<span class="tag">' + $('<span>').text(p.Occupation).html() + '</span>' +
            (p.AllowedMechaDriveList_DriveAllowedList ? '<span class="tag tag-license">' + $('<span>').text(p.AllowedMechaDriveList_DriveAllowedList + ' License').html() + '</span>' : '') +
            '<span class="version-badge-inline">v' + $('<span>').text(p.version).html() + '</span>' +
            '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-layout">' +
        '<div class="detail-portrait-col">' +
          '<div class="detail-portrait" style="background-image:url(\'' + bgSrc + '\')">' +
            '<img class="detail-portrait-img" src="' + portraitSrc + '" alt="' + $('<span>').text(p.PilotName).html() + '" />' +
            skinNavHtml +
          '</div>' +
        '</div>' +
        '<div class="detail-info-col">' +
          '<div class="detail-talents">' +
            this._renderTalent(p.Talent0_2Ability, 'Basic Talent') +
            this._renderTalent(p.Talent3_5Ability, 'Ascended Talent') +
            this._renderWeaponTalent(p.PilotName) +
          '</div>' +
        '</div>' +
      '</div>' +
      this._renderSkills(p.biomimetic_computer_data, p.hiddenSkills) +
      this._renderSummonSkills(p) +
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

  _renderWeaponTalent: function (pilotName) {
    var weapons = (window.WeaponsData || {}).weapons || [];
    var weapon  = weapons.find(function (w) { return w.pilot === pilotName; });
    if (!weapon) return '';

    var ps = (weapon.PassiveSkill || []).find(function (p) {
      return (p.SpecificEffects || '').indexOf('Enhanced') === 0;
    });
    if (!ps) return '';

    var weaponImgSrc = WEAPON_IMG_BASE + encodeURIComponent(weapon.icon) + '.png';
    var desc = this._parseEffects(ps.SpecificEffects || '');

    return (
      '<div class="talent-card">' +
        '<div class="talent-header">' +
          '<a href="#weapons/' + encodeURIComponent(weapon.name) + '" class="talent-weapon-icon-link">' +
            '<img class="talent-icon talent-weapon-icon" src="' + weaponImgSrc + '" alt="' + $('<span>').text(weapon.name).html() + '" />' +
          '</a>' +
          '<div>' +
            '<div class="talent-label">Signature Weapon</div>' +
            '<div class="talent-name">' + $('<span>').text(ps.name || weapon.name).html() + '</div>' +
            '<div class="talent-weapon-name">' +
              $('<span>').text(weapon.name).html() +
              (weapon.version ? ' <span class="version-badge-inline">v' + weapon.version + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="talent-desc">' + desc + '</div>' +
      '</div>'
    );
  },

  _renderSkills: function (bcd, hiddenSkills) {
    var self = this;
    var TYPE_LABEL = { EquipmentSkill: 'Attack', Order: 'Code', SpecialAssault: 'Code + Attack' };
    var TYPE_CLASS = { EquipmentSkill: 'skill-type-attack', Order: 'skill-type-code', SpecialAssault: 'skill-type-special' };

    var withSkill = (bcd || []).filter(function (e) { return e.skill && e.skill.SkillIcon; });
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

      if (sk.resource === 'PP') {
        typeBadges += '<span class="skill-type-badge skill-type-pp">PP</span>';
      }

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

    function buildHiddenCard(sk) {
      return buildCard({ skill: { SkillIcon: sk.icon, name: sk.name, type: sk.type, Ap: sk.Ap, CD: sk.CD, describe: sk.describe, SpecificEffects: sk.SpecificEffects } });
    }

    var innateHtml  = innate.map(function (e)  { return buildCard(e, 'Passive · Innate', 'skill-type-innate'); }).join('');
    var regularHtml = regular.map(function (e) { return buildCard(e); }).join('');
    var hiddenHtml  = (hiddenSkills || []).map(buildHiddenCard).join('');

    if (!innateHtml && !regularHtml && !hiddenHtml) return '';

    return (
      '<div class="nd-section">' +
        '<div class="section-heading">Skills</div>' +
        (innateHtml  ? '<div class="skill-list skill-list-innate mb-3">' + innateHtml  + '</div>' : '') +
        (regularHtml || hiddenHtml ? '<div class="skill-list">' + regularHtml + hiddenHtml + '</div>' : '') +
      '</div>'
    );
  },

  _renderSummonSkills: function (p) {
    var skills = p.summonSkills;
    if (!skills || !skills.length) return '';
    var self = this;

    var talentIcon = ((p.Talent0_2Ability || {}).SkillIcon || (p.Talent0_2Ability || {}).icon) || '';
    var talentIconHtml = talentIcon
      ? '<img class="skill-icon summon-section-icon" src="' + SKILL_BASE + encodeURIComponent(talentIcon) + '.png" alt="" />'
      : '';
    var talentName = (p.Talent0_2Ability || {}).name || 'Summon';

    var TYPE_LABEL = { EquipmentSkill: 'Attack', Order: 'Code', SpecialAssault: 'Code + Attack' };
    var TYPE_CLASS = { EquipmentSkill: 'skill-type-attack', Order: 'skill-type-code', SpecialAssault: 'skill-type-special' };

    var cardsHtml = skills.map(function (sk) {
      var type      = sk.type || null;
      var typeLabel = type ? (TYPE_LABEL[type] || type) : 'Passive';
      var typeCls   = type ? (TYPE_CLASS[type] || '') : 'skill-type-passive';
      var desc      = self._parseEffects(sk.describe || sk.SpecificEffects || '');
      var iconSrc   = SKILL_BASE + encodeURIComponent(sk.icon.replace(/\.png$/, '')) + '.png';

      var statBadges = type
        ? '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + (sk.Ap || '—') + '</span>' +
          '<span class="skill-stat"><span class="skill-stat-label">CD</span>' + (sk.CD || '0') + '</span>'
        : (sk.Ap != null
          ? '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + sk.Ap + '</span>' +
            '<span class="skill-stat"><span class="skill-stat-label">CD</span>' + (sk.CD || '0') + '</span>'
          : '');

      var typeBadge = '<span class="skill-type-badge ' + typeCls + '">' + typeLabel + '</span>';

      return (
        '<div class="skill-card">' +
          '<div class="skill-header">' +
            '<img class="skill-icon" src="' + iconSrc + '" alt="' + $('<span>').text(sk.name).html() + '" />' +
            '<div class="skill-header-info">' +
              '<div class="skill-name-row">' +
                '<span class="skill-name">' + $('<span>').text(sk.name).html() + '</span>' +
                typeBadge +
              '</div>' +
              '<div class="skill-stats">' + statBadges + '</div>' +
            '</div>' +
          '</div>' +
          (desc ? '<div class="talent-desc">' + desc + '</div>' : '') +
        '</div>'
      );
    }).join('');

    return (
      '<div class="nd-section">' +
        '<div class="section-heading summon-section-heading">' +
          talentIconHtml +
          $('<span>').text(talentName).html() + ' — Skills' +
        '</div>' +
        '<div class="skill-list">' + cardsHtml + '</div>' +
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
    $(document).off('input.pilots');
    $(document).off('click.pilots-skin');
    this._activeRanks       = {};
    this._activeOccupations = {};
    this._activeVersions    = {};
    this._searchQuery       = '';
    this._skinIndex         = null;
    this._skinTransitioning = false;
  }
};

window.Pages = Pages;
