var Pages = window.Pages || {};

var WEAPON_IMG_BASE    = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/weapons/';
var WEAPON_SKILL_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
var PILOT_AVATAR_BASE  = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/characterHalf/';

var WEAPON_QUALITY_LABEL = { SSSR: 'SSSR', UR: 'UR' };
var WEAPON_QUALITY_CLASS  = { SSSR: 'rank-sssr', UR: 'rank-ur' };

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

var GRIP_LABEL = {
  Hand:              'One-handed',
  DoubleHand:        'Two-handed',
  OneHandOrDoubleHand: 'One/Two-handed',
  Back:              'Back-mounted',
  Shoulder:          'Shoulder-mounted',
};

Pages.weapons = {
  title: 'Weapons',

  _activeType1: {},
  _activeType2: {},

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

    var type1s = Object.keys(WEAPON_TYPE1_LABEL);
    var type2s = Object.keys(WEAPON_TYPE2_LABEL).filter(function (t) {
      return weapons.some(function (w) { return w.WeaponType2 === t; });
    });

    function filterBtn(group, key, label, cls) {
      var active = (self['_active' + group] || {})[key] ? ' active' : '';
      return '<button class="filter-btn ' + cls + active + '" data-group="' + group + '" data-val="' + key + '">' + label + '</button>';
    }

    var filterBar =
      '<div class="filter-bar">' +
        '<div class="filter-row">' +
          '<span class="filter-label">Category</span>' +
          type1s.map(function (t) { return filterBtn('Type1', t, WEAPON_TYPE1_LABEL[t], 'filter-wt1'); }).join('') +
        '</div>' +
        '<div class="filter-row">' +
          '<span class="filter-label">Type</span>' +
          type2s.map(function (t) { return filterBtn('Type2', t, WEAPON_TYPE2_LABEL[t] || t, 'filter-wt2'); }).join('') +
        '</div>' +
      '</div>';

    var grid = '<div class="row g-3" id="weapon-grid"></div>';

    setTimeout(function () {
      var $grid = $('#weapon-grid');
      $grid.empty();

      var allPilots = (window.PilotsData || {}).pilots || [];

      weapons.forEach(function (w) {
        var imgSrc = WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png';

        var pilotIconHtml = '';
        if (w.pilot) {
          var pilot = allPilots.find(function (p) { return p.PilotName === w.pilot; });
          if (pilot) {
            var pSrc = PILOT_AVATAR_BASE + encodeURIComponent(pilot.AvatarHeroIcon) + '.png';
            pilotIconHtml = '<img class="weapon-card-pilot-icon" src="' + pSrc + '" alt="' + $('<span>').text(pilot.PilotName).html() + '" loading="lazy" />';
          }
        }

        var $card = $(
          '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
            '<div class="card-item weapon-card" data-id="' + w.ID + '" data-t1="' + w.WeaponType1 + '" data-t2="' + w.WeaponType2 + '">' +
              '<div class="weapon-card-img">' +
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
          window.location.hash = '#weapons/' + encodeURIComponent(w.name);
        });
        $grid.append($card);
      });

      self._applyFilters();

      $('#weapon-page').on('click', '.filter-btn', function () {
        var group = $(this).data('group');
        var val   = $(this).data('val');
        self['_active' + group][val] = !self['_active' + group][val];
        $(this).toggleClass('active');
        self._applyFilters();
      });
    }, 0);

    return (
      '<div id="weapon-page">' +
        '<div class="listing-header"><h1>Weapons</h1></div>' +
        filterBar +
        grid +
      '</div>'
    );
  },

  _applyFilters: function () {
    var self = this;
    $('#weapon-grid .col-6').each(function () {
      var $card = $(this).find('.weapon-card');
      var t1    = $card.data('t1');
      var t2    = $card.data('t2');

      var t1Active = Object.values(self._activeType1).some(Boolean);
      var t2Active = Object.values(self._activeType2).some(Boolean);

      var show =
        (!t1Active || self._activeType1[t1]) &&
        (!t2Active || self._activeType2[t2]);

      $(this).toggle(show);
    });
  },

  // ── Detail ─────────────────────────────────────────────────────────────────

  _renderDetail: function (w) {
    var imgSrc = WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png';

    var pilotHtml = '';
    if (w.pilot) {
      var pilots = (window.PilotsData || {}).pilots || [];
      var pilot  = pilots.find(function (p) { return p.PilotName === w.pilot; });
      if (pilot) {
        var pAvatarSrc = PILOT_AVATAR_BASE + encodeURIComponent(pilot.PortraitHeroIcon) + '.png';
        pilotHtml =
          '<a class="weapon-pilot-card" href="#pilots/' + encodeURIComponent(pilot.PilotName) + '">' +
            '<img class="weapon-pilot-avatar" src="' + pAvatarSrc + '" alt="' + $('<span>').text(pilot.PilotName).html() + '" />' +
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
              var iconSrc = WEAPON_SKILL_BASE + encodeURIComponent(ps.SkillIcon || ps.icon) + '.png';
              var desc = linkTalent(Glossary.parseEffects(ps.SpecificEffects || ''));
              return (
                '<div class="talent-card">' +
                  '<div class="talent-header">' +
                    '<img class="talent-icon" src="' + iconSrc + '" alt="' + $('<span>').text(ps.name).html() + '" />' +
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
      '<a href="#weapons" class="btn-back">&#8592; Back to Weapons</a>' +

      '<div class="detail-layout">' +
        '<div class="detail-portrait-col">' +
          '<div class="weapon-portrait-area">' +
            '<div class="weapon-portrait">' +
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

  destroy: function () {},
};
