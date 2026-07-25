var Pages = window.Pages || {};

// Weapons carried on the back or shoulders are exposed to the whole ST/pilot
// data set, but a handful of scraped entries never got a
// RestrictionsPositionOfWeapon value filled in (e.g. HMG-29C). Fall back to
// the weapon's own type for those so every weapon still lands in a slot.
var BUILDER_WEAPON_POSITION_FALLBACK = {
  HeavyMachineGun: 'DoubleHand', HeavySniper: 'DoubleHand', Rod: 'DoubleHand', Saw: 'DoubleHand',
  Blade: 'Hand', Buckler: 'Hand', Flamethrower: 'Hand', LightSniper: 'Hand',
  MachineGun: 'Hand', PileBunker: 'Hand', Shield: 'Hand', ShotGun: 'Hand',
  Funnel: 'Back', RailGun: 'Back',
  Missile: 'Shoulder', Rocket: 'Shoulder',
};

// A pilot's innate skill (always active, not player-chosen) is normally
// identified by the "<profession>00001" ID pattern (professions 1-7).
// Hailis's Shifter profession (8) doesn't follow that numbering, so her
// innate (Form Shift 1) is called out by ID instead — mirrors js/pages/pilots.js.
var BUILDER_EXTRA_INNATE_IDS = { '800101': true };

// Rail Gun (WeaponType2 RailGun) and Manipulator (the Heal-type backpack)
// are hand-restricted to Medium mechs in the source data, but a handful of
// pilots' talents explicitly override that ("Can equip Railgun...") in
// addition to reducing that item's effective weight — found by scanning
// every pilot's talent text for a weight-reduction clause. `unlock: true`
// lets that weapon/backpack type appear for any mech type when this pilot
// is selected; `flat`/`percent` reduce its contribution to the weight total.
// `ascendedOnly: true` marks an override whose weight-reduction clause is
// only present in the pilot's Ascended (Talent3_5) text — the base
// (Talent0_2) talent doesn't grant it. Confirmed by diffing both talent
// texts: Eileen/Rosa/Rebecca's reduction is ascended-exclusive; Verna/
// Martini/Kelly/Rosemary/Hardaway/Grant's is present in both.
var BUILDER_PILOT_ITEM_OVERRIDES = {
  Verna:    [{ kind: 'weapon',   weaponType2: 'RailGun',         flat: 360, unlock: true }],
  Martini:  [{ kind: 'backpack', backpackMainType: 'Heal',       flat: 300, unlock: true }],
  Kelly:    [{ kind: 'weapon',   weaponType2: 'HeavySniper',     percent: 15 }],
  Rosemary: [{ kind: 'weapon',   weaponType2: 'Rocket',          flat: 130 }],
  Eileen:   [{ kind: 'weapon',   weaponType2: 'Rocket',          flat: 130, ascendedOnly: true }],
  Hardaway: [{ kind: 'weapon',   weaponType2: 'Rocket',          flat: 130 }],
  Rosa:     [{ kind: 'weapon',   weaponType2: 'MachineGun',      flat: 80, ascendedOnly: true }],
  Rebecca:  [{ kind: 'weapon',   weaponType2: 'ShotGun',         flat: 125, ascendedOnly: true }],
  Grant:    [{ kind: 'weapon',   weaponType2: 'HeavyMachineGun', flat: 200 }],
};

// The Raider backpack grants a Code skill that swaps the currently-equipped
// hand weapon with a spare one carried in the backpack — modeled as 2 extra
// weapon slots that don't count toward the total equipped weight (they're
// stowed, not worn) but still can't individually exceed the mech's weight
// budget, since that's what they'd have to fit into once swapped in.
var BUILDER_RAIDER_BACKPACK_ID = '60101706';

// Module slots are per-part: Head (躯干/Body), L-Arm, R-Arm, Leg (腿部).
// REV-02's "polymorphic adaptive framework" doubles the level contribution
// of whatever's slotted in its Head and Leg parts specifically.
var BUILDER_MODULE_SLOTS = [
  { key: 'head',     label: 'Head'  },
  { key: 'leftArm',  label: 'L-Arm' },
  { key: 'rightArm', label: 'R-Arm' },
  { key: 'leg',      label: 'Leg'   },
];
var BUILDER_REV02_MECH_ID = '13010103';
var BUILDER_REV02_DOUBLED_SLOTS = { head: true, leg: true };

// Power Mod ("ST Power +N") raises the weight budget itself, same as a
// Power-granting backpack — its bonus scales with its own effective level.
var BUILDER_POWER_MOD_FAMILY = '4026';

// _previewCache keys the pilot row's Expand button reveals inline (the
// mech row's Expand button instead toggles the module/passives panel below).
var BUILDER_PILOT_DETAIL_GROUPS = ['skill:0', 'skill:1', 'skill:2', 'exskill'];

Pages.builder = {
  title: 'Builder',

  _pilotId:        null,
  _mechId:         null,
  _skillIds:       [null, null, null],
  _exSkillIdx:     null,
  _equip:          null,
  _moduleIds:      null,
  _previewCache:   null,
  _expanded:       null,
  _ascendedTalent: true,

  _resetExpanded: function () {
    this._expanded = { pilot: false, mech: false };
  },

  _resetModules: function () {
    this._moduleIds = { head: null, leftArm: null, rightArm: null, leg: null };
  },

  _resetEquip: function () {
    this._equip = {
      leftHand: null, rightHand: null, backpack: null, leftShoulder: null, rightShoulder: null,
      extra1: null, extra2: null,
    };
  },

  render: function (param) {
    var self = this;
    this._pilotId        = null;
    this._mechId         = null;
    this._skillIds       = [null, null, null];
    this._exSkillIdx     = null;
    this._previewCache   = {};
    this._ascendedTalent = true;
    this._resetModules();
    this._resetEquip();
    this._resetExpanded();

    var html = (
      '<div class="listing-header"><h1>Builder</h1></div>' +
      '<p class="dispatch-intro">Pick a pilot and one of their license-matching S-rank STs, then assign skills and equipment to check the build\'s weight budget. Hover a filled slot to see its effect, or expand a panel to see everything at once.</p>' +
      '<div class="builder-uid-row">' +
        '<label class="builder-cell-label" for="builder-uid-input">Build UID</label>' +
        '<input type="text" id="builder-uid-input" class="builder-uid-input" placeholder="Paste a build UID to load it…" spellcheck="false" autocomplete="off" />' +
        '<button type="button" id="builder-uid-load" class="filter-btn">Load</button>' +
        '<button type="button" id="builder-uid-copy" class="filter-btn">Copy Build URL</button>' +
      '</div>' +
      '<div id="builder-body"></div>'
    );

    setTimeout(function () {
      $(document).on('click.builder', '.builder-cselect-btn', function (e) {
        e.stopPropagation();
        var $btn = $(this);
        if ($btn.prop('disabled')) return;
        var $wrap   = $btn.closest('.builder-cselect');
        var wasOpen = $wrap.hasClass('open');
        $('.builder-cselect').removeClass('open builder-cselect-align-right builder-cselect-open-up');
        $('#builder-tooltip').removeClass('visible');
        if (!wasOpen) {
          $wrap.addClass('open');
          self._keepMenuInViewport($wrap);
          $wrap.find('.builder-cselect-search').val('').trigger('input.builder-filter').focus();
        }
      });

      $(document).on('click.builder', '.builder-cselect-option', function (e) {
        e.stopPropagation();
        var $opt = $(this);
        if ($opt.hasClass('disabled')) return;
        var $wrap = $opt.closest('.builder-cselect');
        var group = $wrap.attr('data-cselect-group');
        var value = $opt.attr('data-value') || '';
        $('.builder-cselect').removeClass('open builder-cselect-align-right builder-cselect-open-up');
        self._onCSelectChange(group, value);
      });

      // Typing/clicking in the search box must not bubble to the
      // "click anywhere closes all menus" handler below.
      $(document).on('click.builder', '.builder-cselect-search', function (e) { e.stopPropagation(); });
      $(document).on('keydown.builder', '.builder-cselect-search', function (e) {
        e.stopPropagation();
        if (e.key === 'Escape') $(this).closest('.builder-cselect').removeClass('open builder-cselect-align-right builder-cselect-open-up');
      });
      $(document).on('input.builder', '.builder-cselect-search', function () {
        var q      = $(this).val().trim().toLowerCase();
        var $menu  = $(this).closest('.builder-cselect-menu');
        $menu.find('.builder-cselect-option').not('.builder-cselect-option-none').each(function () {
          var label = $(this).find('.builder-cselect-option-label').text().toLowerCase();
          $(this).toggleClass('filtered-out', !!q && label.indexOf(q) === -1);
        });
        $menu.find('.builder-cselect-group-label').each(function () {
          var $g = $(this);
          var hasVisible = $g.nextUntil('.builder-cselect-group-label', '.builder-cselect-option').not('.filtered-out').length > 0;
          $g.toggleClass('filtered-out', !hasVisible);
        });
      });

      $(document).on('change.builder', '#builder-ascended-toggle', function () {
        self._ascendedTalent = this.checked;
        self._renderBody();
      });

      $(document).on('click.builder', function () {
        $('.builder-cselect').removeClass('open builder-cselect-align-right builder-cselect-open-up');
      });

      $(document).on('mouseenter.builder', '.builder-cselect-btn', function () {
        // The expanded details panel already shows this row's full
        // descriptions inline — the floating hover tooltip would be redundant.
        if ($(this).closest('.builder-hero-expanded').length) return;
        // Don't pop up a tooltip while any dropdown is open — it can
        // visually clash/overlap with the open menu (especially once it's
        // flipped up/right to stay in the viewport).
        if ($('.builder-cselect.open').length) return;
        var group = $(this).closest('.builder-cselect').attr('data-cselect-group');
        var html  = self._previewCache[group];
        if (!html) return;
        var $tip = self._ensureTooltip();
        $tip.html(html).addClass('visible');
        self._positionTooltip($(this), $tip);
      });
      $(document).on('mouseleave.builder', '.builder-cselect-btn', function () {
        $('#builder-tooltip').removeClass('visible');
      });

      $(document).on('click.builder', '.builder-hero-expand-btn', function () {
        var kind = $(this).attr('data-expand-kind');
        self._expanded[kind] = !self._expanded[kind];
        self._renderBody();
      });

      $(document).on('click.builder', '#builder-uid-load', function () {
        self._loadBuildUID($('#builder-uid-input').val());
      });
      $(document).on('keydown.builder', '#builder-uid-input', function (e) {
        if (e.key === 'Enter') self._loadBuildUID($(this).val());
      });
      $(document).on('click.builder', '#builder-uid-copy', function () {
        self._copyBuildUrl($(this));
      });

      // A URL of the form #builder/<UID> should load that build directly —
      // render the empty page first so there's something to show even if
      // the UID in the address bar turns out to be invalid.
      self._renderBody();
      if (param) {
        $('#builder-uid-input').val(param);
        self._loadBuildUID(param);
      }
    }, 0);

    return html;
  },

  // Builds a shareable #builder/<UID> URL for the current build and copies
  // it to the clipboard, with brief button-text feedback either way.
  _copyBuildUrl: function ($btn) {
    var uid = this._computeBuildUID();
    var url = window.location.origin + window.location.pathname + '#builder/' + uid;
    var originalLabel = $btn.text();

    function flash(label) {
      $btn.text(label);
      setTimeout(function () { $btn.text(originalLabel); }, 1500);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        flash('Copied!');
      }, function () {
        flash('Copy failed');
      });
    } else {
      var $tmp = $('<textarea readonly></textarea>').val(url).css({ position: 'fixed', top: '-1000px' }).appendTo('body');
      $tmp[0].select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      $tmp.remove();
      flash(ok ? 'Copied!' : 'Copy failed');
    }
  },

  _ensureTooltip: function () {
    var $tip = $('#builder-tooltip');
    if (!$tip.length) $tip = $('<div id="builder-tooltip" class="builder-tooltip"></div>').appendTo('body');
    return $tip;
  },

  _positionTooltip: function ($el, $tip) {
    var rect      = $el[0].getBoundingClientRect();
    var tipWidth  = $tip.outerWidth();
    var tipHeight = $tip.outerHeight();
    var left = rect.left;
    if (left + tipWidth > window.innerWidth - 8) left = window.innerWidth - tipWidth - 8;
    if (left < 8) left = 8;

    // Flip above the button if there isn't room below the viewport.
    var top;
    if (rect.bottom + tipHeight + 6 > window.innerHeight && rect.top - tipHeight - 6 >= 0) {
      top = rect.top + window.scrollY - tipHeight - 6;
    } else {
      top = rect.bottom + window.scrollY + 6;
    }
    $tip.css({ left: left + 'px', top: top + 'px' });
  },

  // Dropdown menus are wider than their (small, icon-only) button and can
  // otherwise overflow the right edge near the end of a row, or the bottom
  // edge near the end of the page — flip alignment/direction as needed.
  _keepMenuInViewport: function ($wrap) {
    var $menu = $wrap.find('.builder-cselect-menu');
    var wrapRect = $wrap[0].getBoundingClientRect();
    var menuWidth  = $menu.outerWidth();
    var menuHeight = $menu.outerHeight();

    if (wrapRect.left + menuWidth > window.innerWidth - 8) {
      $wrap.addClass('builder-cselect-align-right');
    }
    if (wrapRect.bottom + menuHeight + 4 > window.innerHeight - 8 && wrapRect.top - menuHeight - 4 >= 0) {
      $wrap.addClass('builder-cselect-open-up');
    }
  },

  // Generic icon+label dropdown with a text search box: a native <select>
  // can't show a thumbnail next to each option or filter by typing, so every
  // pilot/mech/skill/weapon/backpack picker in this page uses this widget
  // instead. `items` is a flat list, or pass `groups` (array of
  // {label, items}) for a sectioned menu (e.g. the backpack slot, which
  // mixes real backpacks with back-mounted weapons).
  // The closed control shows only the icon (name/effect is available via the
  // hover tooltip, a title tooltip, or, for pilot/mech, the name label next
  // to it) — the dropdown list shows a small icon plus the name so options
  // stay identifiable while browsing/searching. Pass `large: true` for the
  // pilot/mech pickers to render a bigger closed-state icon.
  _customSelect: function (opts) {
    var groups = opts.groups || (opts.items ? [{ label: null, items: opts.items }] : []);
    var allItems = groups.reduce(function (acc, g) { return acc.concat(g.items); }, []);
    var selectedItem = allItems.filter(function (it) { return it.value === opts.selectedValue; })[0];

    var btnIconHtml = selectedItem && selectedItem.iconSrc
      ? '<img class="builder-cselect-icon" src="' + selectedItem.iconSrc + '" alt="" />'
      : '<span class="builder-cselect-icon builder-cselect-icon-empty"></span>';

    var disabledValues = opts.disabledValues || [];

    function optionHtml(it) {
      var isSelected = it.value === opts.selectedValue;
      var isDisabled = disabledValues.indexOf(it.value) !== -1;
      var iconHtml = it.iconSrc
        ? '<img class="builder-cselect-option-icon" src="' + it.iconSrc + '" alt="" />'
        : '<span class="builder-cselect-option-icon builder-cselect-icon-empty"></span>';
      return (
        '<div class="builder-cselect-option' + (isSelected ? ' selected' : '') + (isDisabled ? ' disabled' : '') + '" data-value="' + $('<span>').text(it.value).html() + '">' +
          iconHtml +
          '<span class="builder-cselect-option-label">' + $('<span>').text(it.label).html() + '</span>' +
        '</div>'
      );
    }

    var noneHtml = opts.hideNone ? '' : (
      '<div class="builder-cselect-option builder-cselect-option-none' + (opts.selectedValue === '' ? ' selected' : '') + '" data-value="">' +
        '<span class="builder-cselect-option-icon builder-cselect-icon-empty"></span>' +
        '<span class="builder-cselect-option-label">' + (opts.emptyLabel || '— None —') + '</span>' +
      '</div>'
    );

    var groupsHtml = groups.map(function (g) {
      var itemsHtml = g.items.map(optionHtml).join('');
      if (!itemsHtml) return '';
      return (g.label ? '<div class="builder-cselect-group-label">' + g.label + '</div>' : '') + itemsHtml;
    }).join('');

    var searchHtml = opts.disabled ? '' : '<input type="text" class="builder-cselect-search" placeholder="Search…" />';

    return (
      '<div class="builder-cselect' + (opts.large ? ' builder-cselect-lg' : '') + (opts.twoHanded ? ' builder-cselect-two-handed' : '') + (opts.disabled ? ' disabled' : '') + '" data-cselect-group="' + opts.group + '">' +
        '<button type="button" class="builder-cselect-btn"' + (opts.disabled ? ' disabled' : '') + '>' +
          btnIconHtml +
        '</button>' +
        '<div class="builder-cselect-menu">' + searchHtml + noneHtml + groupsHtml + '</div>' +
      '</div>'
    );
  },

  _onCSelectChange: function (group, value) {
    var self = this;

    if (group === 'pilot') {
      self._pilotId        = value || null;
      self._mechId         = null;
      self._skillIds       = [null, null, null];
      self._exSkillIdx     = null;
      self._ascendedTalent = true;
      self._resetModules();
      self._resetEquip();
      self._renderBody();
      return;
    }


    if (group === 'mech') {
      self._mechId = value || null;
      self._resetModules();
      self._resetEquip();
      self._renderBody();
      return;
    }

    if (group.indexOf('skill:') === 0) {
      var idx = parseInt(group.slice(6), 10);
      self._skillIds[idx] = value || null;
      self._renderBody();
      return;
    }

    if (group === 'exskill') {
      self._exSkillIdx = value === '' ? null : parseInt(value, 10);
      self._renderBody();
      return;
    }

    if (group.indexOf('module:') === 0) {
      var slotKey = group.slice(7);
      self._moduleIds[slotKey] = value || null;
      self._renderBody();
      return;
    }

    // Equipment groups: leftHand, rightHand, backpack, leftShoulder, rightShoulder, extra1, extra2.
    self._setEquip(group, self._decodeVal(value));
    self._renderBody();
  },

  _renderBody: function () {
    var self  = this;
    var pilot = self._getPilot();
    var mech  = self._getMech();

    self._previewCache = {};

    var row1 = self._heroRowHtml('pilot', pilot, self._pilotHeroSelectHtml(), self._subrowHtml(self._skillCellsHtml(pilot)), self._ascendedTalentCheckboxHtml(pilot), BUILDER_PILOT_DETAIL_GROUPS);
    // The mech row's Expand/Collapse button controls the module/passives
    // panel below (row3) instead of its own inline details panel.
    var row2 = self._heroRowHtml('mech', mech, self._mechHeroSelectHtml(pilot), self._equipCellsHtml(pilot, mech), mech ? self._weightTagHtml(mech, pilot) : '', null);
    var row3 = (mech && self._expanded.mech) ? self._modulePanelHtml(mech, pilot) : '';

    $('#builder-body').html(row1 + row2 + row3);

    // Don't clobber the field while the user is actively typing/pasting a
    // UID into it — only reflect the current state when it's not focused.
    var $uid = $('#builder-uid-input');
    if (!$uid.is(':focus')) $uid.val(self._computeBuildUID());
  },

  // Icon (left, spanning both rows) + name + optional tag (top-right) + the
  // row's other compact icon-selects (bottom-right) — used for both the
  // pilot row and the ST row. `subrowsHtml` is one or more pre-wrapped
  // `.builder-hero-subrow` divs (callers wrap their own content so a row can
  // stack multiple sub-rows, e.g. equipment vs. the Raider extra slots).
  // `detailGroups` lists which _previewCache entries the Expand button
  // reveals inline (populated as a side effect of building subrowsHtml,
  // since that's evaluated before this function runs).
  _heroRowHtml: function (kind, entity, heroSelectHtml, subrowsHtml, nameTagHtml, detailGroups) {
    var name = entity ? (kind === 'pilot' ? entity.PilotName : entity.name) : null;
    var placeholder = kind === 'pilot' ? 'Select a pilot…' : 'Select an ST…';
    var expanded = !!this._expanded[kind];
    var expandBtn = (
      '<button type="button" class="builder-hero-expand-btn" data-expand-kind="' + kind + '">' +
        (expanded ? 'Collapse' : 'Expand') +
      '</button>'
    );
    var detailsHtml = (expanded && detailGroups) ? this._detailsPanelHtml(detailGroups) : '';

    return (
      '<div class="builder-row builder-hero' + (expanded ? ' builder-hero-expanded' : '') + '">' +
        '<div class="builder-hero-icon-wrap">' + heroSelectHtml + expandBtn + '</div>' +
        '<div class="builder-hero-info">' +
          '<div class="builder-hero-name-row">' +
            '<span class="builder-hero-name' + (name ? '' : ' builder-hero-name-empty') + '">' + $('<span>').text(name || placeholder).html() + '</span>' +
            (nameTagHtml || '') +
          '</div>' +
          subrowsHtml +
          detailsHtml +
        '</div>' +
      '</div>'
    );
  },

  _subrowHtml: function (cellsHtml) {
    return '<div class="builder-hero-subrow">' + cellsHtml + '</div>';
  },

  // Full descriptions for every filled slot in `groups`, shown inline when
  // the row is expanded instead of one-at-a-time via hover tooltip.
  _detailsPanelHtml: function (groups) {
    var self  = this;
    var cards = groups.map(function (g) { return self._previewCache[g]; }).filter(Boolean);
    var body  = cards.length ? cards.join('') : '<p class="builder-slot-empty">Nothing equipped yet.</p>';
    return '<div class="builder-hero-details">' + body + '</div>';
  },

  _getPilot: function () {
    var id = this._pilotId;
    return ((window.PilotsData || {}).pilots || []).filter(function (p) { return p.ID === id; })[0] || null;
  },

  _getMech: function () {
    var id = this._mechId;
    return ((window.MechsData || {}).mechs || []).filter(function (m) { return m.ID === id; })[0] || null;
  },

  _isInnateSkillEntry: function (e) {
    return /^[1-7]00001$/.test(e.skill3 || '') || !!BUILDER_EXTRA_INNATE_IDS[e.skill3];
  },

  // A pilot's selectable skill pool is every "core unit" chip entry that
  // carries a full skill definition — both the active skills (`type` set to
  // EquipmentSkill/Order/SpecialAssault) and the always-on passives
  // (untyped) — except the innate skill every pilot always has regardless of
  // loadout, which isn't something the player chooses to slot in. Hidden
  // skills (weapon-granted bonus skills with no stable numeric ID) are
  // included too, keyed by the same synthetic ID scheme as js/glossary.js.
  _pilotSkillPool: function (pilot) {
    var self = this;
    var seen = {};
    var pool = [];
    (pilot.biomimetic_computer_data || []).forEach(function (e) {
      var sk = e.skill;
      if (!sk || !sk.SkillIcon || seen[sk.ID] || self._isInnateSkillEntry(e)) return;
      seen[sk.ID] = true;
      pool.push(sk);
    });
    (pilot.hiddenSkills || []).forEach(function (hs) {
      if (!hs.name) return;
      var synthId = 'hidden:' + (pilot.PilotName || '') + ':' + hs.name;
      if (seen[synthId]) return;
      seen[synthId] = true;
      pool.push({
        ID: synthId,
        name: hs.name,
        icon: hs.icon,
        SkillIcon: hs.icon,
        Ap: hs.Ap,
        CD: hs.CD,
        SpecificEffects: hs.describe || hs.SpecificEffects || '',
      });
    });
    return pool;
  },

  _pilotCandidates: function () {
    return ((window.PilotsData || {}).pilots || []).filter(function (p) { return p.quality === 'SSR'; });
  },

  _pilotHeroSelectHtml: function () {
    var self = this;
    var pilots = self._pilotCandidates().sort(function (a, b) { return a.PilotName.localeCompare(b.PilotName); });

    var items = pilots.map(function (p) {
      return { value: p.ID, label: p.PilotName, iconSrc: AVATAR_BASE + encodeURIComponent(p.PortraitHeroIcon) + '.png' };
    });

    return self._customSelect({
      group: 'pilot',
      items: items,
      selectedValue: self._pilotId || '',
      placeholder: 'Select a pilot…',
      emptyLabel: 'Select a pilot…',
      large: true,
    });
  },

  _mechCandidates: function (pilot) {
    if (!pilot) return [];
    var lic = pilot.AllowedMechaDriveList_DriveAllowedList;
    return ((window.MechsData || {}).mechs || []).filter(function (m) {
      return m.quality === 'SSR' && m.type === lic;
    });
  },

  _mechHeroSelectHtml: function (pilot) {
    var self = this;
    if (!pilot) {
      return self._customSelect({ group: 'mech', items: [], selectedValue: '', placeholder: 'Select a pilot first…', disabled: true, large: true });
    }

    var lic   = pilot.AllowedMechaDriveList_DriveAllowedList;
    var mechs = self._mechCandidates(pilot).sort(function (a, b) { return a.name.localeCompare(b.name); });

    if (!mechs.length) {
      return self._customSelect({ group: 'mech', items: [], selectedValue: '', placeholder: 'No S-rank ' + lic + ' STs available', disabled: true, large: true });
    }

    var items = mechs.map(function (m) {
      return { value: m.ID, label: m.name, iconSrc: MECH_AVATAR_BASE + encodeURIComponent(m.icon) + '.png' };
    });
    return self._customSelect({
      group: 'mech',
      items: items,
      selectedValue: self._mechId || '',
      large: true,
      placeholder: 'Select an ST…',
      emptyLabel: 'Select an ST…',
    });
  },

  _skillCellsHtml: function (pilot) {
    var self = this;

    if (!pilot) {
      var disabledSkills = [0, 1, 2].map(function (idx) {
        var cselect = self._customSelect({ group: 'skill:' + idx, items: [], selectedValue: '', placeholder: 'Select a pilot first…', disabled: true });
        return '<div class="builder-cell"><div class="builder-cell-label">Skill ' + (idx + 1) + '</div>' + cselect + '</div>';
      }).join('');
      var disabledEx = self._customSelect({ group: 'exskill', items: [], selectedValue: '', placeholder: 'Select a pilot first…', disabled: true });
      return disabledSkills + '<div class="builder-cell"><div class="builder-cell-label">EX Skill</div>' + disabledEx + '</div>';
    }

    var pool      = self._pilotSkillPool(pilot);
    var poolItems = pool.map(function (sk) {
      return { value: sk.ID, label: sk.name, iconSrc: SKILL_BASE + encodeURIComponent(sk.SkillIcon || sk.icon) + '.png' };
    });

    var skillsHtml = [0, 1, 2].map(function (idx) {
      var chosenId    = self._skillIds[idx];
      var otherChosen = self._skillIds.filter(function (v, i) { return i !== idx && v; });
      var group       = 'skill:' + idx;

      var cselect = self._customSelect({
        group: group,
        items: poolItems,
        selectedValue: chosenId || '',
        disabledValues: otherChosen,
      });

      var chosen = pool.filter(function (sk) { return sk.ID === chosenId; })[0];
      if (chosen) self._previewCache[group] = self._skillPreviewHtml(chosen);

      return '<div class="builder-cell"><div class="builder-cell-label">Skill ' + (idx + 1) + '</div>' + cselect + '</div>';
    }).join('');

    // Some EX skills (e.g. Guard) aren't tied to a weapon type at all — they're
    // restricted to a specific pilot Occupation instead. The option `value`
    // stays the index into the *full* exskills array (not the filtered
    // list), since that's what's stored in _exSkillIdx and the Build UID.
    var exskills = (window.ExSkillsData || {}).exskills || [];
    var exItems  = [];
    exskills.forEach(function (sk, i) {
      if (sk.occupation && sk.occupation !== pilot.Occupation) return;
      exItems.push({ value: String(i), label: sk.name, iconSrc: SKILL_BASE + encodeURIComponent(sk.icon) + '.png' });
    });
    var exChosen = self._exSkillIdx != null ? exskills[self._exSkillIdx] : null;
    if (exChosen) self._previewCache.exskill = self._exSkillPreviewHtml(exChosen);

    var exCSelect = self._customSelect({
      group: 'exskill',
      items: exItems,
      selectedValue: self._exSkillIdx != null ? String(self._exSkillIdx) : '',
    });

    return skillsHtml + '<div class="builder-cell"><div class="builder-cell-label">EX Skill</div>' + exCSelect + '</div>';
  },

  _skillPreviewHtml: function (sk) {
    var iconSrc = SKILL_BASE + encodeURIComponent(sk.SkillIcon || sk.icon) + '.png';
    var desc    = Glossary.parseEffects(sk.describe || sk.SpecificEffects || '');
    var statBadges =
      '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + (sk.Ap || '—') + '</span>' +
      '<span class="skill-stat"><span class="skill-stat-label">CD</span>' + (sk.CD || '0') + '</span>';
    return (
      '<div class="skill-card builder-preview-card">' +
        '<div class="skill-header">' +
          '<img class="skill-icon" src="' + iconSrc + '" alt="" />' +
          '<div class="skill-header-info">' +
            '<div class="skill-name-row"><span class="skill-name">' + $('<span>').text(sk.name).html() + '</span></div>' +
            '<div class="skill-stats">' + statBadges + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="talent-desc">' + desc + '</div>' +
      '</div>'
    );
  },

  _exSkillPreviewHtml: function (sk) {
    var iconSrc = SKILL_BASE + encodeURIComponent(sk.icon) + '.png';
    var desc    = Glossary.parseEffects(sk.SpecificEffects || '');
    var statBadges =
      '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + (sk.Ap || '—') + '</span>' +
      '<span class="skill-stat"><span class="skill-stat-label">Wpn</span>' + $('<span>').text(sk.Wpn || '').html() + '</span>';
    return (
      '<div class="skill-card builder-preview-card">' +
        '<div class="skill-header">' +
          '<img class="skill-icon" src="' + iconSrc + '" alt="" />' +
          '<div class="skill-header-info">' +
            '<div class="skill-name-row"><span class="skill-name">' + $('<span>').text(sk.name).html() + '</span></div>' +
            '<div class="skill-stats">' + statBadges + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="talent-desc">' + desc + '</div>' +
      '</div>'
    );
  },

  _weaponPosition: function (w) {
    if (!w) return 'Hand';
    return w.RestrictionsPositionOfWeapon || BUILDER_WEAPON_POSITION_FALLBACK[w.WeaponType2] || 'Hand';
  },

  // `pilot`, if given, lets a talent-unlock override (e.g. Verna's "Can
  // equip Railgun") include a weapon/backpack whose own model/mech-type
  // restriction wouldn't otherwise allow it.
  _weaponsForMech: function (mechType, pilot) {
    var self = this;
    return ((window.WeaponsData || {}).weapons || []).filter(function (w) {
      if (w.quality !== 'SSSR') return false;
      var models = (w.LimitedModelOfWeapon || '').split('/').filter(Boolean);
      if (models.length === 0 || models.indexOf(mechType) !== -1) return true;
      var ov = self._pilotOverrideFor(pilot, 'weapon', w.WeaponType2);
      return !!(ov && ov.unlock);
    });
  },

  _backpacksForMech: function (mechType, pilot) {
    var self = this;
    return ((window.BackpacksData || {}).backpacks || []).filter(function (b) {
      if (b.quality !== 'SSSR') return false;
      var models = (b.AssemblableAirmenType || '').split('/').filter(Boolean);
      if (models.length === 0 || models.indexOf(mechType) !== -1) return true;
      var ov = self._pilotOverrideFor(pilot, 'backpack', b.BackpackMainType);
      return !!(ov && ov.unlock);
    });
  },

  // Unsorted candidate sets, shared between the dropdowns (sorted by name
  // for browsing) and the Build UID (sorted by ID for a stable index — see
  // _sortById), so both agree on exactly the same pool.
  _handWeaponPool: function (mech, pilot) {
    var self = this;
    return self._weaponsForMech(mech.type, pilot).filter(function (w) {
      var pos = self._weaponPosition(w);
      return pos === 'Hand' || pos === 'DoubleHand';
    });
  },

  _backWeaponPool: function (mech, pilot) {
    var self = this;
    return self._weaponsForMech(mech.type, pilot).filter(function (w) {
      return self._weaponPosition(w) === 'Back';
    });
  },

  _shoulderWeaponPool: function (mech, pilot) {
    var self = this;
    return self._weaponsForMech(mech.type, pilot).filter(function (w) {
      return self._weaponPosition(w) === 'Shoulder';
    });
  },

  _backpackPool: function (mech, pilot) {
    return this._backpacksForMech(mech.type, pilot);
  },

  _sortByName: function (list) {
    return list.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  },

  // The "Power" weight-cap bonus isn't reliably tagged by BackpackMainType
  // (Raider is an SSSR "BackupEquipment" backpack, not "PowerAdd", but
  // grants the same "gains an additional 300 Power" bonus as the UR Power
  // Amplifier/Jammer line) — read it straight out of the skill text instead.
  _backpackPowerBonus: function (b) {
    var text = (b.skill || {}).SpecificEffects || '';
    var m = text.match(/(?:additional|extra)\s*<color=[^>]*>(\d+)<\/color>\s*Power/i);
    return m ? parseInt(m[1], 10) : 0;
  },

  _weaponById: function (id) {
    return ((window.WeaponsData || {}).weapons || []).filter(function (w) { return w.ID === id; })[0] || null;
  },

  _backpackById: function (id) {
    return ((window.BackpacksData || {}).backpacks || []).filter(function (b) { return b.ID === id; })[0] || null;
  },

  _pilotOverrideFor: function (pilot, kind, type) {
    if (!pilot || !type) return null;
    var overrides = BUILDER_PILOT_ITEM_OVERRIDES[pilot.PilotName];
    if (!overrides) return null;
    return overrides.filter(function (o) {
      return o.kind === kind && (kind === 'weapon' ? o.weaponType2 === type : o.backpackMainType === type);
    })[0] || null;
  },

  // Only some pilots' overrides are gated on being Ascended (see the
  // BUILDER_PILOT_ITEM_OVERRIDES comment) — the toggle only needs to show
  // up for those.
  _hasAscendedOnlyOverride: function (pilot) {
    if (!pilot) return false;
    var overrides = BUILDER_PILOT_ITEM_OVERRIDES[pilot.PilotName];
    return !!(overrides && overrides.some(function (o) { return o.ascendedOnly; }));
  },

  _ascendedTalentCheckboxHtml: function (pilot) {
    if (!this._hasAscendedOnlyOverride(pilot)) return '';
    var checked = this._ascendedTalent ? ' checked' : '';
    return (
      '<label class="builder-ascended-toggle">' +
        '<input type="checkbox" id="builder-ascended-toggle"' + checked + ' />' +
        '<span>Ascended Talent</span>' +
      '</label>'
    );
  },

  _effectiveWeaponWeight: function (w, pilot) {
    var base = parseInt(w.WeaponWeight, 10) || 0;
    var ov   = this._pilotOverrideFor(pilot, 'weapon', w.WeaponType2);
    if (!ov || (ov.ascendedOnly && !this._ascendedTalent)) return base;
    if (ov.percent) return Math.max(0, Math.round(base * (1 - ov.percent / 100)));
    if (ov.flat) return Math.max(0, base - ov.flat);
    return base;
  },

  _effectiveBackpackWeight: function (b, pilot) {
    var base = parseInt(b.weight, 10) || 0;
    var ov   = this._pilotOverrideFor(pilot, 'backpack', b.BackpackMainType);
    if (!ov || (ov.ascendedOnly && !this._ascendedTalent)) return base;
    if (ov.percent) return Math.max(0, Math.round(base * (1 - ov.percent / 100)));
    if (ov.flat) return Math.max(0, base - ov.flat);
    return base;
  },

  _encodeVal: function (kind, id) { return kind + ':' + id; },

  _decodeVal: function (val) {
    if (!val) return null;
    var idx = val.indexOf(':');
    return { kind: val.slice(0, idx), id: val.slice(idx + 1) };
  },

  // The Build UID packs every selection into one short, two-way string.
  // Each field is the item's index in data/builder/index-maps.json (see
  // that file's generator script for why) rather than its raw game ID or a
  // position in some sorted list — a permanent, hand-maintained alias that
  // never changes once assigned, so a shared build stays valid forever
  // regardless of what order future content happens to introduce new IDs
  // in. Skill slots are the one exception: they index into the pilot's own
  // (small, already-stable, data-order) skill pool, since skills aren't
  // globally enumerable the way pilots/mechs/weapons/backpacks/modules are.
  // Fields join with "|" into one digit/"|" string (11-symbol alphabet:
  // 0-9 plus "|" — the backpack slot's index is prefixed with a kind digit
  // since it can hold either a backpack or a back-mounted weapon), encoded
  // as a base-11 number (Horner's method, with a leading "|" sentinel so
  // leading zeros survive) and rendered in hex — genuinely shorter than
  // the raw digit string, and fully reversible rather than a one-way hash,
  // since the build has to be reconstructible from it.
  _UID_BASE: 11,
  // Field 17 (Ascended Talent) was added after field count 17 was already
  // in the wild — accept either length so old shared links keep decoding
  // (missing field 17 defaults to Ascended, matching the toggle's default).
  _UID_FIELD_COUNT: 18,
  _UID_FIELD_COUNT_LEGACY: 17,

  _indexMapCache: null,

  _indexMap: function (category) {
    if (!this._indexMapCache) this._indexMapCache = {};
    if (!this._indexMapCache[category]) {
      this._indexMapCache[category] = ((window.BuilderIndexMaps || {})[category]) || {};
    }
    return this._indexMapCache[category];
  },

  _reverseIndexMapCache: null,

  _reverseIndexMap: function (category) {
    if (!this._reverseIndexMapCache) this._reverseIndexMapCache = {};
    if (!this._reverseIndexMapCache[category]) {
      var map = this._indexMap(category);
      var reverse = {};
      Object.keys(map).forEach(function (id) { reverse[map[id]] = id; });
      this._reverseIndexMapCache[category] = reverse;
    }
    return this._reverseIndexMapCache[category];
  },

  _idxOrEmpty: function (category, id) {
    if (!id) return '';
    var idx = this._indexMap(category)[id];
    return idx === undefined ? '' : String(idx);
  },

  _idFromIdx: function (category, token) {
    if (token === '') return null;
    var id = this._reverseIndexMap(category)[parseInt(token, 10)];
    return id === undefined ? null : id;
  },

  _equipToken: function (v) {
    if (!v) return '';
    var category = v.kind === 'weapon' ? 'weapon' : 'backpack';
    var idx = this._idxOrEmpty(category, v.id);
    return idx === '' ? '' : (v.kind === 'weapon' ? '1' : '2') + idx;
  },

  _tokenToEquip: function (token) {
    if (token === '') return null;
    var kind = token.charAt(0) === '1' ? 'weapon' : 'backpack';
    var id = this._idFromIdx(kind, token.slice(1));
    return id ? { kind: kind, id: id } : null;
  },

  _computeBuildUID: function () {
    var self      = this;
    var pilot     = self._getPilot();
    var skillPool = pilot ? self._pilotSkillPool(pilot) : [];

    function skillTok(skillId) {
      if (!skillId) return '';
      for (var i = 0; i < skillPool.length; i++) {
        if (skillPool[i].ID === skillId) return String(i);
      }
      return '';
    }

    var fields = [
      self._idxOrEmpty('pilot', self._pilotId),
      self._idxOrEmpty('mech', self._mechId),
      skillTok(self._skillIds[0]),
      skillTok(self._skillIds[1]),
      skillTok(self._skillIds[2]),
      self._exSkillIdx != null ? String(self._exSkillIdx) : '',
      self._equipToken(self._equip.leftHand),
      self._equipToken(self._equip.rightHand),
      self._equipToken(self._equip.backpack),
      self._equipToken(self._equip.leftShoulder),
      self._equipToken(self._equip.rightShoulder),
      self._equipToken(self._equip.extra1),
      self._equipToken(self._equip.extra2),
      self._idxOrEmpty('module', self._moduleIds.head),
      self._idxOrEmpty('module', self._moduleIds.leftArm),
      self._idxOrEmpty('module', self._moduleIds.rightArm),
      self._idxOrEmpty('module', self._moduleIds.leg),
      self._ascendedTalent ? '1' : '0',
    ];
    var raw = '|' + fields.join('|');

    var acc = 0n;
    for (var i = 0; i < raw.length; i++) {
      acc = acc * BigInt(this._UID_BASE) + BigInt(raw.charAt(i) === '|' ? 10 : raw.charAt(i));
    }
    return acc.toString(16);
  },

  _loadBuildUID: function (uid) {
    uid = (uid || '').trim().toLowerCase();
    if (!uid || !/^[0-9a-f]+$/.test(uid)) return;

    var acc;
    try {
      acc = BigInt('0x' + uid);
    } catch (e) {
      return;
    }

    var base = BigInt(this._UID_BASE);
    var digits = [];
    while (acc > 0n) {
      var d = Number(acc % base);
      digits.push(d === 10 ? '|' : String(d));
      acc = acc / base;
    }
    var raw = digits.reverse().join('');
    if (raw.charAt(0) !== '|') return; // missing sentinel — not a UID we produced
    var fields = raw.slice(1).split('|');
    if (fields.length !== this._UID_FIELD_COUNT && fields.length !== this._UID_FIELD_COUNT_LEGACY) return;

    this._pilotId = this._idFromIdx('pilot', fields[0]);
    this._mechId  = this._idFromIdx('mech', fields[1]);

    // Resolve the pilot so hidden/regular skill index tokens can be looked
    // up against that pilot's own skill pool.
    var pilot     = this._getPilot();
    var skillPool = pilot ? this._pilotSkillPool(pilot) : [];
    function skillFromTok(tok) {
      if (tok === '') return null;
      var sk = skillPool[parseInt(tok, 10)];
      return sk ? sk.ID : null;
    }

    this._skillIds = [skillFromTok(fields[2]), skillFromTok(fields[3]), skillFromTok(fields[4])];
    this._exSkillIdx = fields[5] === '' ? null : parseInt(fields[5], 10);
    this._equip = {
      leftHand:      this._tokenToEquip(fields[6]),
      rightHand:     this._tokenToEquip(fields[7]),
      backpack:      this._tokenToEquip(fields[8]),
      leftShoulder:  this._tokenToEquip(fields[9]),
      rightShoulder: this._tokenToEquip(fields[10]),
      extra1:        this._tokenToEquip(fields[11]),
      extra2:        this._tokenToEquip(fields[12]),
    };
    this._moduleIds = {
      head:     this._idFromIdx('module', fields[13]),
      leftArm:  this._idFromIdx('module', fields[14]),
      rightArm: this._idFromIdx('module', fields[15]),
      leg:      this._idFromIdx('module', fields[16]),
    };
    // Missing (legacy 17-field link) defaults to Ascended, matching the
    // toggle's own default.
    this._ascendedTalent = fields[17] === undefined ? true : fields[17] === '1';

    this._renderBody();
  },

  _itemWeight: function (equipVal, pilot) {
    if (!equipVal) return 0;
    if (equipVal.kind === 'weapon') {
      var w = this._weaponById(equipVal.id);
      return w ? this._effectiveWeaponWeight(w, pilot) : 0;
    }
    if (equipVal.kind === 'backpack') {
      var b = this._backpackById(equipVal.id);
      return b ? this._effectiveBackpackWeight(b, pilot) : 0;
    }
    return 0;
  },

  // HMG/Polearm/Sniper Rifle (and Chainsaw) are two-handed: picking one in
  // either hand slot mirrors it into the other, since it's the same
  // physical weapon rather than two separate items. The Raider backpack's
  // 2 extra (stowed) weapon slots are subject to the same rule.
  _EQUIP_PAIRS: { leftHand: 'rightHand', rightHand: 'leftHand', extra1: 'extra2', extra2: 'extra1' },

  _setEquip: function (slot, val) {
    this._equip[slot] = val;
    var other = this._EQUIP_PAIRS[slot];
    if (!other) return;

    if (val && val.kind === 'weapon' && this._weaponPosition(this._weaponById(val.id)) === 'DoubleHand') {
      this._equip[other] = val;
      return;
    }

    var otherVal = this._equip[other];
    if (otherVal && otherVal.kind === 'weapon') {
      var ow = this._weaponById(otherVal.id);
      if (ow && this._weaponPosition(ow) === 'DoubleHand') this._equip[other] = null;
    }
  },

  _equipCellsHtml: function (pilot, mech) {
    var self = this;

    if (!mech) {
      var placeholder = pilot ? 'Select an ST first…' : 'Select a pilot first…';
      var labels = ['L Hand', 'R Hand', 'Backpack'];
      var cells = labels.map(function (label, i) {
        var group   = ['leftHand', 'rightHand', 'backpack'][i];
        var cselect = self._customSelect({ group: group, items: [], selectedValue: '', placeholder: placeholder, disabled: true });
        return '<div class="builder-cell"><div class="builder-cell-label">' + label + '</div>' + cselect + '</div>';
      });
      return self._subrowHtml(cells.join(''));
    }

    var handWeapons = self._sortByName(self._handWeaponPool(mech, pilot));
    var backWeapons = self._sortByName(self._backWeaponPool(mech, pilot));
    var backpacks   = self._sortByName(self._backpackPool(mech, pilot));

    var lhIsDouble = self._isDoubleHandEquip(self._equip.leftHand);
    var rhIsDouble = self._isDoubleHandEquip(self._equip.rightHand);

    var mainCells = self._weaponCellHtml('L Hand',  'leftHand',  handWeapons, lhIsDouble, pilot) +
      self._weaponCellHtml('R Hand', 'rightHand', handWeapons, rhIsDouble, pilot) +
      self._backpackCellHtml(backpacks, backWeapons, pilot);

    if (mech.type === 'Medium') {
      var shoulderWeapons = self._sortByName(self._shoulderWeaponPool(mech, pilot));
      mainCells += self._weaponCellHtml('L Shoulder', 'leftShoulder',  shoulderWeapons, false, pilot);
      mainCells += self._weaponCellHtml('R Shoulder', 'rightShoulder', shoulderWeapons, false, pilot);
    }

    var html = '<div class="builder-subsection-heading">Equipment</div>' + self._subrowHtml(mainCells);

    // Raider's Weapon Switch code carries 2 spare weapons in the backpack —
    // same pool as the hand slots (and subject to the same two-handed
    // pairing rule), shown on their own row directly under the rest.
    var bpEquip = self._equip.backpack;
    if (bpEquip && bpEquip.kind === 'backpack' && bpEquip.id === BUILDER_RAIDER_BACKPACK_ID) {
      var e1IsDouble = self._isDoubleHandEquip(self._equip.extra1);
      var e2IsDouble = self._isDoubleHandEquip(self._equip.extra2);
      var extraCells = self._weaponCellHtml('Extra 1', 'extra1', handWeapons, e1IsDouble, pilot) +
        self._weaponCellHtml('Extra 2', 'extra2', handWeapons, e2IsDouble, pilot);
      html += self._subrowHtml(extraCells);
    }

    html += '<div class="builder-subsection-heading">Modules</div>' + self._subrowHtml(self._moduleCellsHtml(mech));

    return html;
  },

  // Standalone (PropertyS) and Producible (SuitS) modules are all 4-level
  // modules the player can freely equip — unlike GeneralSuit modules, which
  // are a specific ST's fixed built-in kit and aren't selectable here.
  _moduleCandidates: function () {
    var modules = (window.ModulesData || {}).modules || {};
    var pool = [];
    Object.keys(modules).forEach(function (family) {
      var m = modules[family];
      if (m.category === 'PropertyS' || m.category === 'SuitS') pool.push({ family: family, mod: m });
    });
    return pool;
  },

  _modulePool: function () {
    return this._moduleCandidates().sort(function (a, b) { return a.mod.name.localeCompare(b.mod.name); });
  },

  // Producible (SuitS) modules are each one specific ST's signature
  // module — look up which one, so the dropdown can show it the same way
  // the weapon dropdown shows each weapon's type (e.g. "Name (Mech)").
  _moduleSourceMechName: function (family) {
    var mechs = (window.MechsData || {}).mechs || [];
    for (var i = 0; i < mechs.length; i++) {
      var found = (mechs[i].modules || []).some(function (mod) { return mod.id === family; });
      if (found) return mechs[i].name;
    }
    return null;
  },

  // How many levels one equipped copy of a module contributes: Standalone
  // (PropertyS) modules are worth 2 levels per slot on any mech; REV-02's
  // Head/Leg slots double whatever's contributed there on top of that (so a
  // Standalone module in REV-02's Head/Leg is worth 4 levels in one slot).
  _moduleSlotContribution: function (mech, slotKey, mod) {
    var contribution = mod.category === 'PropertyS' ? 2 : 1;
    if (mech && mech.ID === BUILDER_REV02_MECH_ID && BUILDER_REV02_DOUBLED_SLOTS[slotKey]) {
      contribution *= 2;
    }
    return contribution;
  },

  // Equipping the same module family in more than one slot stacks its
  // level by the sum of each slot's contribution (capped at its max level).
  _effectiveModuleLevels: function (mech) {
    var self = this;
    var modules = (window.ModulesData || {}).modules || {};
    var totals = {};
    BUILDER_MODULE_SLOTS.forEach(function (slot) {
      var family = self._moduleIds[slot.key];
      if (!family) return;
      var mod = modules[family];
      if (!mod) return;
      totals[family] = (totals[family] || 0) + self._moduleSlotContribution(mech, slot.key, mod);
    });
    Object.keys(totals).forEach(function (family) {
      var maxLevel = (modules[family] || {}).maxLevel || 4;
      if (totals[family] > maxLevel) totals[family] = maxLevel;
    });
    return totals;
  },

  _moduleCellsHtml: function (mech) {
    var self  = this;
    var pool  = self._modulePool();
    var items = pool.map(function (p) {
      // Only Producible (SuitS) modules are exclusive to one signature ST —
      // Standalone (PropertyS) modules are commonly shared across many
      // mechs' fixed kits too, so a "first match" mech name would be
      // misleading for those.
      var sourceMech = p.mod.category === 'SuitS' ? self._moduleSourceMechName(p.family) : null;
      var label = sourceMech ? (p.mod.name + ' (' + sourceMech + ')') : p.mod.name;
      return { value: p.family, label: label, iconSrc: MODULE_ICON_BASE + encodeURIComponent(p.mod.icon) + '.png' };
    });
    var levels = self._effectiveModuleLevels(mech);

    return BUILDER_MODULE_SLOTS.map(function (slot) {
      var group     = 'module:' + slot.key;
      var chosenFam = self._moduleIds[slot.key];

      var cselect = self._customSelect({
        group: group,
        items: items,
        selectedValue: chosenFam || '',
        placeholder: '— Empty —',
      });

      if (chosenFam) {
        var mod = (window.ModulesData || {}).modules[chosenFam];
        var lvl = levels[chosenFam] || 1;
        if (mod) self._previewCache[group] = self._modulePreviewHtml(mod, lvl);
      }

      return '<div class="builder-cell"><div class="builder-cell-label">' + slot.label + '</div>' + cselect + '</div>';
    }).join('');
  },

  _modulePreviewHtml: function (mod, level) {
    var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.icon) + '.png';
    var effect  = mod.levels[String(level)] || '';
    return (
      '<div class="skill-card builder-preview-card">' +
        '<div class="skill-header">' +
          '<img class="skill-icon" src="' + iconSrc + '" alt="" />' +
          '<div class="skill-header-info">' +
            '<div class="skill-name-row">' +
              '<span class="skill-name">' + $('<span>').text(mod.name).html() + '</span>' +
              '<span class="module-level">Lv.' + level + '/' + mod.maxLevel + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="talent-desc">' + Glossary.parseEffects(effect) + '</div>' +
      '</div>'
    );
  },

  // A compact, non-interactive readout (no level slider) of the mech's own
  // built-in modules alongside the aggregated effect of whichever
  // standalone/producible modules are currently slotted in.
  _modulePanelHtml: function (mech, pilot) {
    var self = this;
    if (!mech) return '';

    var mechModsHtml = (mech.modules || []).map(function (mod) {
      var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.SkillIcon || mod.icon) + '.png';
      var levelLabel = mod.level ? ('Lv.' + mod.level) : '';
      return self._compactModuleCard(iconSrc, mod.name, levelLabel, mod.SpecificEffects || '');
    }).join('') || '<p class="builder-slot-empty">None.</p>';

    var levels    = self._effectiveModuleLevels(mech);
    var modules   = (window.ModulesData || {}).modules || {};
    var equippedHtml = Object.keys(levels).map(function (family) {
      var mod = modules[family];
      if (!mod) return '';
      var lvl = levels[family];
      var iconSrc = MODULE_ICON_BASE + encodeURIComponent(mod.icon) + '.png';
      return self._compactModuleCard(iconSrc, mod.name, 'Lv.' + lvl + '/' + mod.maxLevel, mod.levels[String(lvl)] || '');
    }).join('') || '<p class="builder-slot-empty">None selected.</p>';

    var weaponsHtml = self._allEquippedWeapons().map(function (w) {
      var matches   = !!(w.pilot && pilot && w.pilot === pilot.PilotName);
      var all       = w.PassiveSkill || [];
      // Non-matching pilots get the 1st and 3rd passives (the two that
      // apply to any pilot) — the 2nd is the signature-pilot-exclusive bonus.
      var passives  = matches ? all.slice(0, 3) : [all[0], all[2]].filter(Boolean);
      return passives.map(function (ps) {
        var iconSrc = WEAPON_SKILL_BASE + encodeURIComponent(ps.SkillIcon || ps.icon) + '.png';
        return self._compactModuleCard(iconSrc, w.name + ' — ' + ps.name, '', ps.SpecificEffects || '');
      }).join('');
    }).join('') || '<p class="builder-slot-empty">None equipped.</p>';

    return (
      '<div class="builder-row builder-module-panel">' +
        '<div class="builder-module-panel-col">' +
          '<div class="section-heading">Mech Modules</div>' +
          '<div class="builder-module-compact-list">' + mechModsHtml + '</div>' +
        '</div>' +
        '<div class="builder-module-panel-col">' +
          '<div class="section-heading">Equipped Modules</div>' +
          '<div class="builder-module-compact-list">' + equippedHtml + '</div>' +
        '</div>' +
        '<div class="builder-module-panel-col">' +
          '<div class="section-heading">Weapon Passives</div>' +
          '<div class="builder-module-compact-list">' + weaponsHtml + '</div>' +
        '</div>' +
      '</div>'
    );
  },

  // Every distinct weapon currently equipped, across all weapon-capable
  // slots — deduped so a two-handed weapon (mirrored across a pair) or a
  // deliberately-repeated Extra slot pick is only listed once.
  _allEquippedWeapons: function () {
    var self = this;
    var seen = {};
    var list = [];
    ['leftHand', 'rightHand', 'backpack', 'leftShoulder', 'rightShoulder', 'extra1', 'extra2'].forEach(function (slot) {
      var v = self._equip[slot];
      if (!v || v.kind !== 'weapon' || seen[v.id]) return;
      seen[v.id] = true;
      var w = self._weaponById(v.id);
      if (w) list.push(w);
    });
    return list;
  },

  _compactModuleCard: function (iconSrc, name, levelLabel, effect) {
    return (
      '<div class="builder-module-compact">' +
        '<img class="builder-module-compact-icon" src="' + iconSrc + '" alt="" />' +
        '<div class="builder-module-compact-info">' +
          '<div class="builder-module-compact-name">' +
            $('<span>').text(name).html() +
            (levelLabel ? ' <span class="module-level">' + levelLabel + '</span>' : '') +
          '</div>' +
          '<div class="builder-module-compact-effect">' + Glossary.parseEffects(effect) + '</div>' +
        '</div>' +
      '</div>'
    );
  },

  _isDoubleHandEquip: function (equipVal) {
    return !!(equipVal && equipVal.kind === 'weapon' &&
      this._weaponPosition(this._weaponById(equipVal.id)) === 'DoubleHand');
  },

  _weaponCellHtml: function (label, slotKey, weapons, isTwoHanded, pilot) {
    var self        = this;
    var equipVal    = self._equip[slotKey];
    var selectedVal = equipVal ? self._encodeVal(equipVal.kind, equipVal.id) : '';

    var items = weapons.map(function (w) {
      var typeLabel = (window.WEAPON_TYPE2_LABEL || {})[w.WeaponType2] || w.WeaponType2;
      var wt        = self._effectiveWeaponWeight(w, pilot);
      var iconSrc   = (typeof weaponIconSrc === 'function') ? weaponIconSrc(w) : (WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png');
      return { value: self._encodeVal('weapon', w.ID), label: w.name + ' (' + typeLabel + ', ' + wt + ')', iconSrc: iconSrc };
    });

    var cselect = self._customSelect({
      group: slotKey,
      items: items,
      selectedValue: selectedVal,
      placeholder: '— Empty —',
      twoHanded: isTwoHanded,
    });

    var weapon = equipVal ? self._weaponById(equipVal.id) : null;
    if (weapon) self._previewCache[slotKey] = self._weaponPreviewHtml(weapon, pilot);

    return (
      '<div class="builder-cell">' +
        '<div class="builder-cell-label">' + label + '</div>' +
        cselect +
      '</div>'
    );
  },

  _backpackCellHtml: function (backpacks, backWeapons, pilot) {
    var self        = this;
    var equipVal    = self._equip.backpack;
    var selectedVal = equipVal ? self._encodeVal(equipVal.kind, equipVal.id) : '';

    var bpItems = backpacks.map(function (b) {
      var wt = self._effectiveBackpackWeight(b, pilot);
      return { value: self._encodeVal('backpack', b.ID), label: b.name + ' (' + wt + ')', iconSrc: BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png' };
    });

    var wpItems = backWeapons.map(function (w) {
      var typeLabel = (window.WEAPON_TYPE2_LABEL || {})[w.WeaponType2] || w.WeaponType2;
      var wt        = self._effectiveWeaponWeight(w, pilot);
      var iconSrc   = (typeof weaponIconSrc === 'function') ? weaponIconSrc(w) : (WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png');
      return { value: self._encodeVal('weapon', w.ID), label: w.name + ' (' + typeLabel + ', ' + wt + ')', iconSrc: iconSrc };
    });

    var cselect = self._customSelect({
      group: 'backpack',
      groups: [
        { label: 'Backpacks',             items: bpItems },
        { label: 'Back-mounted Weapons',  items: wpItems },
      ],
      selectedValue: selectedVal,
      placeholder: '— Empty —',
    });

    if (equipVal) {
      if (equipVal.kind === 'backpack') {
        var b = self._backpackById(equipVal.id);
        if (b) self._previewCache.backpack = self._backpackPreviewHtml(b, pilot);
      } else {
        var w = self._weaponById(equipVal.id);
        if (w) self._previewCache.backpack = self._weaponPreviewHtml(w, pilot);
      }
    }

    return (
      '<div class="builder-cell">' +
        '<div class="builder-cell-label">Backpack</div>' +
        cselect +
      '</div>'
    );
  },

  // SSSR weapons carry up to 3 passives, with the 3rd being an exclusive
  // bonus that only applies when wielded by the weapon's signature pilot
  // (weapon.pilot matches the pilot's name) — show all 3 in that case,
  // otherwise only the 2 passives any pilot actually gets.
  _weaponPreviewHtml: function (w, pilot) {
    var iconSrc   = (typeof weaponIconSrc === 'function') ? weaponIconSrc(w) : (WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png');
    var typeLabel = (window.WEAPON_TYPE2_LABEL || {})[w.WeaponType2] || w.WeaponType2;
    var matches   = !!(w.pilot && pilot && w.pilot === pilot.PilotName);
    var allPassives = w.PassiveSkill || [];
    // Non-matching pilots get the 1st and 3rd passives (the two that apply
    // to any pilot); the 2nd is the weapon's signature-pilot-exclusive bonus.
    var passives  = matches ? allPassives.slice(0, 3) : [allPassives[0], allPassives[2]].filter(Boolean);
    var descHtml  = passives.map(function (ps) {
      return Glossary.parseEffects(ps.SpecificEffects || '');
    }).filter(Boolean).join('<hr class="builder-preview-sep" />');
    return (
      '<div class="skill-card builder-preview-card">' +
        '<div class="skill-header">' +
          '<img class="skill-icon" src="' + iconSrc + '" alt="" />' +
          '<div class="skill-header-info">' +
            '<div class="skill-name-row">' +
              '<span class="skill-name">' + $('<span>').text(w.name).html() + '</span>' +
              '<span class="skill-type-badge">' + typeLabel + '</span>' +
            '</div>' +
            '<div class="skill-stats"><span class="skill-stat"><span class="skill-stat-label">WT</span>' + this._effectiveWeaponWeight(w, pilot) + '</span></div>' +
          '</div>' +
        '</div>' +
        (descHtml ? '<div class="talent-desc">' + descHtml + '</div>' : '') +
      '</div>'
    );
  },

  _backpackPreviewHtml: function (b, pilot) {
    var iconSrc = BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png';
    var sk      = b.skill;
    var desc    = sk ? Glossary.parseEffects(sk.SpecificEffects || '') : '';
    return (
      '<div class="skill-card builder-preview-card">' +
        '<div class="skill-header">' +
          '<img class="skill-icon" src="' + iconSrc + '" alt="" />' +
          '<div class="skill-header-info">' +
            '<div class="skill-name-row"><span class="skill-name">' + $('<span>').text(b.name).html() + '</span></div>' +
            '<div class="skill-stats"><span class="skill-stat"><span class="skill-stat-label">WT</span>' + this._effectiveBackpackWeight(b, pilot) + '</span></div>' +
          '</div>' +
        '</div>' +
        (desc ? '<div class="talent-desc">' + desc + '</div>' : '') +
      '</div>'
    );
  },

  // The equipment weight budget: the mech's own weight cap minus its parts'
  // weight, plus any Power-granting backpack's bonus (which raises the
  // budget itself rather than reducing any one item's own contribution).
  _maxWeightBudget: function (mech) {
    var parts       = mech.parts || [];
    var bodyOutput  = parseInt(mech.output, 10) || 0;
    var partsWeight = parts.reduce(function (sum, p) { return sum + (parseInt(p.aircraftWeight, 10) || 0); }, 0);
    var budget      = bodyOutput - partsWeight;

    var bpEquip = this._equip.backpack;
    if (bpEquip && bpEquip.kind === 'backpack') {
      var bp = this._backpackById(bpEquip.id);
      if (bp) budget += this._backpackPowerBonus(bp);
    }
    budget += this._modulePowerBonus(mech);
    return budget;
  },

  _modulePowerBonus: function (mech) {
    var levels = this._effectiveModuleLevels(mech);
    var lvl = levels[BUILDER_POWER_MOD_FAMILY];
    if (!lvl) return 0;
    var mod = (window.ModulesData || {}).modules[BUILDER_POWER_MOD_FAMILY];
    if (!mod) return 0;
    var text = mod.levels[String(lvl)] || '';
    var m = text.match(/Power\s*\+\s*<color=[^>]*>(\d+)<\/color>/i);
    return m ? parseInt(m[1], 10) : 0;
  },

  // Rendered next to the mech's name (in the hero name row) rather than as
  // its own subrow slot, since it's a readout of the other slots rather
  // than a slot of its own.
  // A DoubleHand weapon occupies both slots of a pair at once, so its
  // weight is only counted once rather than doubled.
  _pairWeight: function (slotA, slotB, pilot) {
    var a = this._equip[slotA], b = this._equip[slotB];
    // Only collapse to a single weight when it's the *same physical*
    // two-handed weapon mirrored across the pair — two independently-picked
    // copies of the same one-handed weapon must still add up normally.
    if (a && b && a.kind === 'weapon' && b.kind === 'weapon' && a.id === b.id && this._isDoubleHandEquip(a)) {
      return this._itemWeight(a, pilot);
    }
    return this._itemWeight(a, pilot) + this._itemWeight(b, pilot);
  },

  _weightTagHtml: function (mech, pilot) {
    var self      = this;
    var remaining = self._maxWeightBudget(mech);

    // The build could be carried into battle wearing either the L/R Hand
    // loadout or (with Raider) swap to the Extra 1/2 loadout — count
    // whichever is heavier toward the total, since the build has to fit
    // the weight budget either way. Extras only matter while Raider is
    // actually equipped — otherwise ignore any stale selection left over
    // from a since-swapped-out backpack.
    var bpEquip = self._equip.backpack;
    var hasRaider = !!(bpEquip && bpEquip.kind === 'backpack' && bpEquip.id === BUILDER_RAIDER_BACKPACK_ID);
    var handsWeight      = self._pairWeight('leftHand', 'rightHand', pilot);
    var extraHandsWeight = hasRaider ? self._pairWeight('extra1', 'extra2', pilot) : 0;
    var effectiveHandsWeight = Math.max(handsWeight, extraHandsWeight);

    var total = effectiveHandsWeight + self._itemWeight(self._equip.backpack, pilot) +
      self._itemWeight(self._equip.leftShoulder, pilot) + self._itemWeight(self._equip.rightShoulder, pilot);
    var over = total > remaining;

    return (
      '<span class="builder-hero-tag mech-stat-weight' + (over ? ' mech-stat-over' : '') + '">' +
        '<span class="mech-stat-label">WT</span>' +
        '<span class="mech-stat-value">' + total + ' / ' + remaining + '</span>' +
      '</span>'
    );
  },

  destroy: function () {
    $(document).off('click.builder');
    $(document).off('keydown.builder');
    $(document).off('input.builder');
    $(document).off('change.builder');
    $(document).off('mouseenter.builder');
    $(document).off('mouseleave.builder');
    $('#builder-tooltip').remove();
    this._pilotId        = null;
    this._mechId         = null;
    this._skillIds       = [null, null, null];
    this._exSkillIdx     = null;
    this._previewCache   = {};
    this._ascendedTalent = true;
    this._resetModules();
    this._resetEquip();
    this._resetExpanded();
  },
};

window.Pages = Pages;
