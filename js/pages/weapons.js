var Pages = window.Pages || {};

var WEAPON_IMG_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/weapons/';

var WEAPON_QUALITY_LABEL = { SSSR: 'SSSR', UR: 'UR' };
var WEAPON_QUALITY_CLASS  = { SSSR: 'rank-sssr', UR: 'rank-ur' };
var WEAPON_QUALITY_BG = { SSSR: 'data/background/quality-sssr.png' };

var WEAPON_TYPE1_LABEL = {
  Melee:   'Melee',
  Assault: 'Assault',
  Heavy:   'Back/Shoulder',
  Sniper:  'Sniper',
};

var WEAPON_TYPE2_LABEL = {
  Blade:          'Alter-Blade',
  Buckler:        'Small Shield',
  Flamethrower:   'Flamethrower',
  Funnel:         'Cutter',
  HeavyMachineGun:'Heavy Machine Gun',
  HeavySniper:    'Sniper Rifle',
  LightSniper:    'Light Rifle',
  MachineGun:     'Machine Gun',
  Missile:        'Missile',
  PileBunker:     'Pile Bunker',
  RailGun:        'Rail Gun',
  Rocket:         'Rocket',
  Rod:            'Polearm',
  Saw:            'Chainsaw',
  Shield:         'Large Shield',
  ShotGun:        'Shotgun',
};

// Weapon icons are served locally, grouped into one folder per weapon type.
// Small note shown under an Armed Conquest section, keyed by AC number.
var AC_FOOTNOTES = {
  20: 'You can acquire 1 copy of Zoey (Void Severance), Wataru (Radiant Dragon Blade) and Toraoh (Shadow Tiger Roar) signature weapons in v3.5 Special Event Armed Conquest. Then they are craftable from v3.6 Armed Conquest materials.'
};

var WEAPON_ICON_DIR = 'data/weapons/icons/';
var WEAPON_ICON_FOLDER = {
  Blade:          'AB',
  Buckler:        'SS',
  Flamethrower:   'FT',
  Funnel:         'CT',
  HeavyMachineGun:'HMG',
  HeavySniper:    'SR',
  LightSniper:    'LR',
  MachineGun:     'MG',
  Missile:        'ML',
  PileBunker:     'PB',
  RailGun:        'RG',
  Rocket:         'RL',
  Rod:            'PA',
  Saw:            'CH',
  Shield:         'LS',
  ShotGun:        'SG',
};

// Per-weapon icon replacements for where the scraped icon ID is wrong, keyed by ID.
var WEAPON_ICON_OVERRIDE = {
  '10215123': 'Icon_weapon_10200501', // False Smile (Martini)
};

// Pilot avatars and skill icons are served locally (data/unlisted/), falling
// back to the CDN on 404 like the pilots page. skillIconSrc/skillIconErrorAttr
// and the avatar bases come from pilots.js.
function pilotAvatarSrc(p) {
  return LOCAL_AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png';
}

function pilotAvatarErrorAttr(p) {
  return ' onerror="this.onerror=null;this.src=\'' + AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png\';"';
}

// A pilot can own both a signature weapon and its later upgrade; the
// signature one is the earliest (lowest AC).
function pilotSignatureWeapon(pilotName) {
  var all = (window.WeaponsData || {}).weapons || [];
  return all.filter(function (w) { return w.pilot === pilotName; })
    .sort(function (a, b) { return (a.ac || 0) - (b.ac || 0); })[0];
}

function weaponIconSrc(w) {
  var icon = WEAPON_ICON_OVERRIDE[w.ID] || w.icon;
  return WEAPON_ICON_DIR + WEAPON_ICON_FOLDER[w.type] + '/' + encodeURIComponent(icon) + '.png';
}

var GRIP_LABEL = {
  Hand:              'One-handed',
  DoubleHand:        'Two-handed',
  OneHandOrDoubleHand: 'One/Two-handed',
  Back:              'Back-mounted',
  Shoulder:          'Shoulder-mounted',
};

Pages.weapons = {
  title: 'Weapons',

  _searchQuery: '',
  _activeTypes: {},

  render: function (param) {
    var all = (window.WeaponsData || {}).weapons || [];
    var weapons = all.filter(function (w) { return w.quality === 'SSSR' && w.version; });
    weapons.sort(function (a, b) {
      return parseFloat(b.version) - parseFloat(a.version);
    });
    if (param) {
      var w = weapons.find(function (w) { return w.name === decodeURIComponent(param); });
      return w ? this._renderDetail(w) : '<p class="text-danger mt-3">Weapon not found.</p>';
    }
    return this._renderList(weapons);
  },

  // ── Listing ────────────────────────────────────────────────────────────────

  _renderList: function (weapons) {
    var self = this;

    var acGroups = [];
    weapons.forEach(function (w) {
      var ac = w.ac || 0;
      var group = acGroups.find(function (g) { return g.ac === ac; });
      if (!group) { group = { ac: ac, weapons: [] }; acGroups.push(group); }
      group.weapons.push(w);
    });
    acGroups.sort(function (a, b) { return b.ac - a.ac; });

    var acNav = '<div class="ac-nav">' +
      acGroups.filter(function (g) { return g.ac; }).map(function (g) {
        var version = (g.weapons[0] || {}).version;
        return '<a class="ac-nav-item" href="#ac-' + g.ac + '">AC' + g.ac + (version ? ' - v' + version : '') + '</a>';
      }).join('') +
    '</div>';

    var weaponTypes = [...new Set(weapons.map(function (w) { return w.WeaponType2; }))]
      .filter(Boolean)
      .sort(function (a, b) {
        return (WEAPON_TYPE2_LABEL[a] || a).localeCompare(WEAPON_TYPE2_LABEL[b] || b);
      });
    var typeButtons = weaponTypes.map(function (t) {
      return '<button class="filter-btn filter-occ" data-filter-type="' + t + '">' + (WEAPON_TYPE2_LABEL[t] || t) + '</button>';
    }).join('');

    var sectionsHtml = acGroups.map(function (g) {
      return '<div class="ac-section" id="ac-' + g.ac + '" data-ac="' + g.ac + '">' +
        (g.ac ? '<h2 class="ac-section-title">Armed Conquest ' + g.ac + '</h2>' : '') +
        '<div class="row g-3 weapon-grid-section"></div>' +
        (AC_FOOTNOTES[g.ac] ? '<p class="ac-section-footnote">* ' + AC_FOOTNOTES[g.ac] + '</p>' : '') +
      '</div>';
    }).join('');

    setTimeout(function () {
      $('#weapon-page').on('click', '.ac-nav-item', function (e) {
        e.preventDefault();
        var target = $(this).attr('href');
        var $el = $(target);
        if ($el.length) {
          $('html, body').animate({ scrollTop: $el.offset().top - 70 }, 200);
        }
      });

      $('#weapon-page').on('click', '#weapon-back-top', function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 200);
      });

      $('#weapon-page').on('input', '#weapon-search', function () {
        self._searchQuery = $(this).val();
        self._applyFilter();
      });

      $('#weapon-page').on('click', '[data-filter-type]', function () {
        var t = $(this).data('filter-type');
        self._activeTypes[t] = !self._activeTypes[t];
        $(this).toggleClass('active', !!self._activeTypes[t]);
        self._applyFilter();
      });

      var allPilots = (window.PilotsData || {}).pilots || [];

      acGroups.forEach(function (g) {
        var $section = $('#weapon-page .ac-section[data-ac="' + g.ac + '"]');
        var $grid = $section.find('.weapon-grid-section');

        g.weapons.forEach(function (w) {
          var imgSrc = weaponIconSrc(w);
          var bgSrc  = WEAPON_QUALITY_BG[w.quality] || '';

          var pilotIconHtml = '';
          if (w.pilot) {
            var pilot = allPilots.find(function (p) { return p.PilotName === w.pilot; });
            if (pilot) {
              pilotIconHtml = '<img class="weapon-card-pilot-icon" src="' + pilotAvatarSrc(pilot) + '"' + pilotAvatarErrorAttr(pilot) + ' alt="' + $('<span>').text(pilot.PilotName).html() + '" loading="lazy" />';
            }
          }

          var $card = $(
            '<div class="col-6 col-sm-4 col-md-3 col-xl-2 weapon-card-wrap" data-name="' + encodeURIComponent(w.name.toLowerCase()) + '">' +
              '<div class="card-item weapon-card" data-id="' + w.ID + '" data-t1="' + w.WeaponType1 + '" data-t2="' + w.WeaponType2 + '">' +
                '<div class="weapon-card-img" style="background-image:url(\'' + bgSrc + '\')">' +
                  '<img src="' + imgSrc + '" alt="' + $('<span>').text(w.name).html() + '" loading="lazy" />' +
                  (w.version ? '<span class="version-badge">v' + w.version + '</span>' : '') +
                  '<span class="weapon-type-badge">' + (WEAPON_TYPE2_LABEL[w.WeaponType2] || w.WeaponType2) + '</span>' +
                '</div>' +
                '<div class="weapon-card-body">' +
                  '<div class="weapon-card-body-text">' +
                    '<div class="card-name">' + $('<span>').text(w.name).html() + '</div>' +
                  '</div>' +
                  pilotIconHtml +
                '</div>' +
              '</div>' +
            '</div>'
          );
          $card.find('.weapon-card').on('click', function () {
            App.go('#weapons/' + encodeURIComponent(w.name));
          });
          $grid.append($card);
        });
      });

      $('#weapon-search').val(self._searchQuery);
      self._applyFilter();
    }, 0);

    return (
      '<div id="weapon-page">' +
        '<div class="listing-header"><h1>Weapons</h1><span class="badge bg-secondary ms-3" id="weapon-count">' + weapons.length + '</span></div>' +
        '<div class="search-box-wrap">' +
          '<input type="text" class="search-box" id="weapon-search" placeholder="Search weapons by name..." />' +
        '</div>' +
        '<div class="filter-bar">' +
          '<div class="filter-group"><span class="filter-label">Type</span>' + typeButtons + '</div>' +
        '</div>' +
        acNav +
        sectionsHtml +
        '<a class="back-to-top" id="weapon-back-top" href="#">&#8593; Top</a>' +
      '</div>'
    );
  },

  _applyFilter: function () {
    var query = (this._searchQuery || '').trim().toLowerCase();
    var activeTypes = Object.keys(this._activeTypes).filter(function (k) { return this._activeTypes[k]; }, this);
    var visibleCount = 0;
    $('#weapon-page .ac-section').each(function () {
      var $section = $(this);
      var sectionHasMatch = false;
      $section.find('.weapon-card-wrap').each(function () {
        var $wrap = $(this);
        var name = decodeURIComponent($wrap.data('name') || '');
        var t2   = $wrap.find('.weapon-card').data('t2');
        var nameOk = !query || name.indexOf(query) !== -1;
        var typeOk = activeTypes.length === 0 || activeTypes.indexOf(t2) !== -1;
        var show = nameOk && typeOk;
        $wrap.toggle(show);
        if (show) { sectionHasMatch = true; visibleCount++; }
      });
      $section.toggle(sectionHasMatch);
    });
    $('#weapon-count').text(visibleCount);
  },

  // ── Detail ─────────────────────────────────────────────────────────────────

  _renderDetail: function (w) {
    var imgSrc = weaponIconSrc(w);
    var bgSrc  = WEAPON_QUALITY_BG[w.quality] || '';

    var cnWarning = w.version && parseFloat(w.version) > GLOBAL_VERSION
      ? '<div class="cn-warning">This Weapon data is translated from CN text, there might be inaccuracy and mismatch. The actual translation will be updated when this unit is released in Global.</div>'
      : '';

    var pilotHtml = '';
    if (w.pilot) {
      var pilots = (window.PilotsData || {}).pilots || [];
      var pilot  = pilots.find(function (p) { return p.PilotName === w.pilot; });
      if (pilot) {
        var pBgSrc     = (typeof QUALITY_BG !== 'undefined' ? QUALITY_BG[pilot.quality] : '') || '';
        pilotHtml =
          '<a class="weapon-pilot-card" href="#pilots/' + encodeURIComponent(pilot.PilotName) + '">' +
            '<img class="weapon-pilot-avatar" src="' + pilotAvatarSrc(pilot) + '"' + pilotAvatarErrorAttr(pilot) + ' alt="' + $('<span>').text(pilot.PilotName).html() + '" style="background-image:url(\'' + pBgSrc + '\')" />' +
            '<div class="weapon-pilot-name">' + $('<span>').text(pilot.PilotName).html() + '</div>' +
          '</a>';
      }
    }

    var statsRows = '';
    if (w.WeaponBasicAttackingPower)    statsRows += this._statRow('ATK',       w.WeaponBasicAttackingPower);
    if (w.ShieldbloodBase)              statsRows += this._statRow('Shield HP', w.ShieldbloodBase);
    if (w.WeaponWeight)                 statsRows += this._statRow('Weight',    w.WeaponWeight);
    if (w.range)                        statsRows += this._statRow('Range',        this._formatRange(w.range));
    if (w.RestrictionsPositionOfWeapon) statsRows += this._statRow('Grip',         GRIP_LABEL[w.RestrictionsPositionOfWeapon] || w.RestrictionsPositionOfWeapon);
    if (w.LimitedModelOfWeapon)         statsRows += this._statRow('Models',       w.LimitedModelOfWeapon);

    // Build pilot talent keyword linker for this weapon
    var linkTalent = function (desc) { return desc; };
    if (w.pilot) {
      var pilots2 = (window.PilotsData || {}).pilots || [];
      var p2 = pilots2.find(function (p) { return p.PilotName === w.pilot; });
      if (p2) {
        var talentName = (p2.Talent0_2Ability || {}).name;
        if (talentName) {
          var esc = talentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var pilotHref = '#pilots/' + encodeURIComponent(w.pilot);
          var re = new RegExp('\\[' + esc + '\\]', 'g');
          linkTalent = function (desc) {
            return desc.replace(re,
              '<a href="' + pilotHref + '" class="kw kw-pilot">[' + talentName + ']</a>');
          };
        }
      }
    }

    var passiveHtml = '';
    if (w.PassiveSkill && w.PassiveSkill.length) {
      passiveHtml =
        '<div class="nd-section">' +
          '<div class="section-heading">Passive Skills</div>' +
          '<div class="detail-talents">' +
            w.PassiveSkill.map(function (ps) {
              var icon = ps.SkillIcon || ps.icon;
              var desc = linkTalent(Glossary.parseEffects(ps.SpecificEffects || ''));
              return (
                '<div class="talent-card">' +
                  '<div class="talent-header">' +
                    '<img class="talent-icon" src="' + skillIconSrc(icon) + '"' + skillIconErrorAttr(icon) + ' alt="' + $('<span>').text(ps.name).html() + '" />' +
                    '<div>' +
                      '<div class="talent-name">' + $('<span>').text(ps.name).html() + '</div>' +
                    '</div>' +
                  '</div>' +
                  (desc ? '<div class="talent-desc">' + desc + '</div>' : '') +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>';
    }

    return (
      cnWarning +
      '<a href="#weapons" class="btn-back">&#8592; Back to Weapons</a>' +

      '<div class="detail-layout">' +
        '<div class="detail-portrait-col">' +
          '<div class="weapon-portrait-area">' +
            '<div class="weapon-portrait" style="background-image:url(\'' + bgSrc + '\')">' +
              '<img src="' + imgSrc + '" alt="' + $('<span>').text(w.name).html() + '" />' +
            '</div>' +
            pilotHtml +
          '</div>' +
        '</div>' +
        '<div class="detail-info-col">' +
          '<h2 class="detail-name">' + $('<span>').text(w.name).html() + '</h2>' +
          '<div class="detail-tags mb-3">' +
            '<span class="tag tag-wtype">' + (WEAPON_TYPE1_LABEL[w.WeaponType1] || w.WeaponType1) + '</span>' +
            '<span class="tag tag-wtype">' + (WEAPON_TYPE2_LABEL[w.WeaponType2] || w.WeaponType2) + '</span>' +
            (w.version ? '<span class="version-badge-inline">v' + w.version + '</span>' : '') +
            (w.ac ? '<span class="tag tag-ac">Armed Conquest ' + w.ac + '</span>' : '') +
          '</div>' +
          '<div class="weapon-stats">' + statsRows + '</div>' +
        '</div>' +
      '</div>' +

      passiveHtml
    );
  },

  _formatRange: function (range) {
    var map = { '1（可斜向）': '1 ring', '2（可斜向）': '2 rings' };
    return map[range] || range;
  },

  _statRow: function (label, value) {
    return (
      '<div class="stat-row">' +
        '<span class="stat-label">' + label + '</span>' +
        '<span class="stat-value">' + $('<span>').text(String(value)).html() + '</span>' +
      '</div>'
    );
  },

  destroy: function () {
    this._searchQuery = '';
    this._activeTypes = {};
  },
};
