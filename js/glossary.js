var Glossary = (function () {
  // `neural` holds the innate neural cores (the Profession Neuron's passive),
  // tagged <neural ID=..>: the game gives Shifters' innate core the same ID
  // as their starting skill (Lustre's 800201 is both Configuration Shift 1
  // and Tainted Blade / Shadow Ray), so they can't share the `skill` table.
  var data = { buf: {}, skill: {}, neural: {}, terrain: {} };
  var nameIndex = { buf: {}, skill: {}, neural: {}, terrain: {} };
  var ICON_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';
  // Icons are checked locally first (data/unlisted/pilot_skills/), since
  // that's where manually-added pilots' icons live; falls back to the CDN
  // on 404 (mirrors pilots.js).
  var LOCAL_ICON_BASE = ASSET_BASE + 'data/unlisted/pilot_skills/';

  function iconSrc(icon) {
    return icon ? LOCAL_ICON_BASE + encodeURIComponent(icon) + '.png' : '';
  }

  function iconErrorAttr(icon) {
    return icon ? ' onerror="this.onerror=null;this.src=\'' + ICON_BASE + encodeURIComponent(icon) + '.png\';"' : '';
  }

  function lookup(type, id) {
    return (data[type] || {})[id] || null;
  }

  // Href of the pilot, ST or module page called `name`, or null.
  function pageHref(name) {
    if (typeof App === 'undefined') return null;
    if (((window.PilotsData || {}).pilots || []).some(function (p) { return p.PilotName === name; })) {
      return App.href('pilots', name);
    }
    if (((window.MechsData || {}).mechs || []).some(function (m) { return m.name === name; })) {
      return App.href('sts', name);
    }
    var modules = (window.ModulesData || {}).modules || {};
    if (Object.keys(modules).some(function (fam) { return modules[fam].name === name; })) {
      return App.href('modules', name.toLowerCase());
    }
    return null;
  }

  // Effect text frequently references other keywords as bare "[Name]" with no
  // <buf ID=..> wrapper (the glossary source data itself is often written this
  // way). Build a name -> id lookup so those can still be resolved and linked.
  function rebuildNameIndex() {
    nameIndex = { buf: {}, skill: {}, neural: {}, terrain: {} };
    ['buf', 'skill', 'neural', 'terrain'].forEach(function (type) {
      var entries = data[type] || {};
      Object.keys(entries).forEach(function (id) {
        var name = entries[id] && entries[id].name;
        if (name && !(name in nameIndex[type])) nameIndex[type][name] = id;
      });
    });
  }

  var TERRAIN_NAMES = {
    '4003081': 'Burning Terrain',
    '3014501': 'Sentry Zone',
    '4011081': 'Funnel Field'
  };

  // Some backpack skills tag a nested Code ability using their own skill ID
  // as the mainSkill reference (e.g. Juggernaut's passive and its granted
  // [Weapon Switch] Code both use ID 62304), so the raw data has no separate
  // ID for the nested ability. Transcribed from data/screenshots/backpacks.
  var BACKPACK_CODE_SKILLS = {
    '62304': {
      name: 'Weapon Switch',
      icon: 'Icon_skill_order_5008',
      Ap: 0,
      CD: 0,
      effect: 'After use, swaps the weapon equipped in hand with the weapon mounted in the Weapon Backpack, then allows continued action using remaining Movement.\nCan be used up to <color=#F74848>1</color> time per turn.\nCan only be used when both Arms are undestroyed.'
    },
    // Guide's [Tracer Coating]
    '62319': {
      name: 'Tracer Coating',
      icon: 'Icon_skill_order_1038',
      Ap: 0,
      CD: 3,
      effect: 'Applies [Tracing Mark] to targets hit by next active attack. Triggers <buf ID=900004>[Re-ATK]</buf> in place after use.'
    },
    // Supplier's [Quick Load]
    '6230611': {
      name: 'Quick Load',
      icon: 'Icon_skill_order_1016',
      Ap: 0,
      CD: 3,
      effect: 'Fully restores all Tactical ammo. Can continue to act with remaining movement. Shares CD with other Tactical weapons reloading skills.'
    }
  };

  // A glossary entry can set `kind` to style it apart from a regular
  // buf/skill — e.g. "form" for a Shifter's ST forms ([Mech Form]), which
  // are states of the mech rather than real buffs.
  function kindClass(entry) {
    return entry && entry.kind ? ' kw-' + entry.kind : '';
  }

  function parseEffects(text) {
    if (!text) return '';

    // Extract buf/skill keyword tags before HTML escaping
    var kwMap = {};
    var idx = 0;

    text = text.replace(/<terr(?:ian|ain) ID=(\d+)\s*\/>/g, function (_, id) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('terrain', id);
      var name = (entry && entry.name) || TERRAIN_NAMES[id] || 'Terrain';
      var cls = entry ? 'kw kw-terrain' : 'kw kw-terrain kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="terrain" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    text = text.replace(/<buf ID=(\d+)[^>]*>\[?([^\]<]*)\]?<\/buf>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('buf', id);
      var cls = entry ? 'kw kw-buf' + kindClass(entry) : 'kw kw-buf kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="buf" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    text = text.replace(/<skill[^>]+?(?:mainSkill|activeSkill|passiveSkill|ID)=(\d+)[^>]*>\[?([^\]<]*)\]?<\/skill>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('skill', id);
      var cls = entry ? 'kw kw-skill' + kindClass(entry) : 'kw kw-skill kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="skill" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    text = text.replace(/<neural ID=(\d+)[^>]*>\[?([^\]<]*)\]?<\/neural>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('neural', id);
      var cls = entry ? 'kw kw-skill' + kindClass(entry) : 'kw kw-skill kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="neural" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    // <jump to=SLUG>Text</jump> scrolls to a same-page section (e.g. a
    // "Form Skills" section further down a pilot's page) without touching
    // location.hash, since this is a hash-routed single-page app and
    // changing the hash would be treated as page navigation.
    text = text.replace(/<jump to=([\w-]+)>([^<]*)<\/jump>/g, function (_, target, label) {
      var key = '\x00KW' + (idx++) + '\x00';
      kwMap[key] = '<a class="section-jump-link" href="#" data-target="' + target + '">' + label + '</a>';
      return key;
    });

    // Bare "[Name]" references (no <buf>/<skill> wrapper) still get linked if
    // the name matches a known keyword, so nested keywords inside a tooltip's
    // own effect text remain hoverable instead of turning into dead text.
    text = text.replace(/\[([^\[\]<>]+)\]/g, function (_, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var bufId = nameIndex.buf[name];
      var skillId = !bufId && nameIndex.skill[name];
      var neuralId = !bufId && !skillId && nameIndex.neural[name];
      var terrainId = !bufId && !skillId && !neuralId && nameIndex.terrain[name];
      if (!bufId && !skillId && !neuralId && !terrainId) {
        // A pilot, ST or module name (e.g. Stargazer Unit's "When piloted by
        // [Lustre]") links to that item's page.
        var href = pageHref(name);
        kwMap[key] = href
          ? '<a href="' + href + '" class="kw kw-pilot">[' + name + ']</a>'
          : '[' + name + ']';
        return key;
      }
      var type = bufId ? 'buf' : skillId ? 'skill' : neuralId ? 'neural' : 'terrain';
      var id = bufId || skillId || neuralId || terrainId;
      kwMap[key] = '<span class="kw kw-' + (type === 'neural' ? 'skill' : type) + kindClass(lookup(type, id)) + '" data-kw-type="' + type + '" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    // Escape remaining HTML and process color/format tags
    text = text
      .replace(/&/g, '&amp;').replace(/</g, '\x00LT\x00').replace(/>/g, '\x00GT\x00')
      .replace(/\x00LT\x00color=(#[0-9A-Fa-f]+)\x00GT\x00([\s\S]*?)\x00LT\x00\/color\x00GT\x00/g,
        function (_, color, inner) { return '<span style="color:' + color + '">' + inner + '</span>'; })
      .replace(/\x00LT\x00b\x00GT\x00([\s\S]*?)\x00LT\x00\/b\x00GT\x00/g,
        function (_, inner) { return '<b>' + inner + '</b>'; })
      .replace(/\x00LT\x00[^]*?\x00GT\x00/g, '')
      .replace(/\n/g, '<br>');

    // Restore keyword spans
    Object.keys(kwMap).forEach(function (key) {
      text = text.split(key).join(kwMap[key]);
    });

    return text;
  }

  // Collects every keyword (buf/skill) referenced within a piece of effect
  // text, whether tagged (<buf ID=..>) or bare ("[Name]" resolved by name).
  // Used to proactively show nested keyword definitions inline rather than
  // requiring a separate hover on each one.
  function extractReferences(text) {
    if (!text) return [];
    var seen = {};
    var refs = [];

    function add(type, id) {
      var key = type + ':' + id;
      if (seen[key]) return;
      seen[key] = true;
      refs.push({ type: type, id: id });
    }

    var stripped = text.replace(/<terr(?:ian|ain) ID=(\d+)\s*\/>/g, function (_, id) {
      add('terrain', id);
      return '';
    });
    stripped = stripped.replace(/<buf ID=(\d+)([^>]*)>\[?([^\]<]*)\]?<\/buf>/g, function (full, id, attrs) {
      if (!/noDisplay/.test(attrs)) add('buf', id);
      return '';
    });
    stripped = stripped.replace(/<skill[^>]+?(?:mainSkill|activeSkill|passiveSkill|ID)=(\d+)([^>]*)>\[?([^\]<]*)\]?<\/skill>/g, function (full, id, attrs) {
      if (!/noDisplay/.test(attrs)) add('skill', id);
      return '';
    });
    stripped = stripped.replace(/<neural ID=(\d+)([^>]*)>\[?([^\]<]*)\]?<\/neural>/g, function (full, id, attrs) {
      if (!/noDisplay/.test(attrs)) add('neural', id);
      return '';
    });
    stripped.replace(/\[([^\[\]<>]+)\]/g, function (_, name) {
      var bufId = nameIndex.buf[name];
      var skillId = !bufId && nameIndex.skill[name];
      var neuralId = !bufId && !skillId && nameIndex.neural[name];
      var terrainId = !bufId && !skillId && !neuralId && nameIndex.terrain[name];
      if (bufId) add('buf', bufId);
      else if (skillId) add('skill', skillId);
      else if (neuralId) add('neural', neuralId);
      else if (terrainId) add('terrain', terrainId);
      return _;
    });

    return refs;
  }

  function parseColors(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '\x00LT\x00').replace(/>/g, '\x00GT\x00')
      .replace(/\x00LT\x00color=(#[0-9A-Fa-f]+)\x00GT\x00([\s\S]*?)\x00LT\x00\/color\x00GT\x00/g,
        function (_, color, inner) { return '<span style="color:' + color + '">' + inner + '</span>'; })
      .replace(/\x00LT\x00[^]*?\x00GT\x00/g, '')
      .replace(/\n/g, '<br>');
  }

  function init() {
    if (window.GlossaryData) data = window.GlossaryData;
    data.neural = data.neural || {};

    // Seed skill lookup from pilot data for skills not in the glossary
    var pilots = (window.PilotsData || {}).pilots || [];
    pilots.forEach(function (p) {
      // Active skills from biomimetic computer data; the innate neural core
      // (Profession Neuron, UnitType 6) goes in `neural`, keyed by its game
      // ID (skills.json keys it "neural:<ID>").
      (p.biomimetic_computer_data || []).forEach(function (entry) {
        var sk = entry.skill;
        if (!sk || !sk.ID || !sk.name) return;
        if (entry.UnitType === '6') {
          var nId = String(sk.ID).replace(/^neural:/, '');
          if (!data.neural[nId]) {
            data.neural[nId] = { name: sk.name, effect: sk.SpecificEffects || sk.describe || '' };
            if (sk.SkillIcon || sk.icon) data.neural[nId].icon = sk.SkillIcon || sk.icon;
          }
          return;
        }
        if (data.skill[sk.ID]) return;
        var entry = { name: sk.name, effect: sk.describe || sk.SpecificEffects || '' };
        if (sk.Ap != null && sk.Ap !== '') entry.Ap = sk.Ap;
        if (sk.CD != null && sk.CD !== '') entry.CD = sk.CD;
        if (sk.SkillIcon || sk.icon) entry.icon = sk.SkillIcon || sk.icon;
        data.skill[sk.ID] = entry;
      });
      // Passive skills from neural drive chip partitions
      var nd = p.NeuralDriveTemplate;
      if (nd) {
        (nd.ListChipPartition || []).forEach(function (chip) {
          (chip.ListActivationEffects || []).forEach(function (ae) {
            var ps = ae.PassiveSkill;
            if (!ps || !ps.ID || !ps.name) return;
            if (data.skill[ps.ID]) return;
            var psEntry = { name: ps.name, effect: ps.SpecificEffects || '' };
            if (ps.SkillIcon || ps.icon) psEntry.icon = ps.SkillIcon || ps.icon;
            data.skill[ps.ID] = psEntry;
          });
        });
      }
      // Talent abilities (for mainSkill references that match talent IDs)
      ['Talent0_2Ability', 'Talent3_5Ability'].forEach(function (key) {
        var t = p[key];
        if (!t || !t.ID || !t.name) return;
        // Some talents share their ID with a Code they grant (e.g. Verna's
        // Creed of Sin and Vengeance Strike are both 601050), so register
        // those under a synthetic ID or bare "[Talent]" references can't resolve.
        var tId = t.ID;
        if (data.skill[tId]) {
          if (data.skill[tId].name === t.name) return;
          tId = 'talent:' + t.ID;
          if (data.skill[tId]) return;
        }
        var tEntry = { name: t.name, effect: t.SpecificEffects || '' };
        if (t.SkillIcon || t.icon) tEntry.icon = t.SkillIcon || t.icon;
        data.skill[tId] = tEntry;
      });
    });

    // Backpack skills reference themselves in their own effect text
    // (e.g. Juggernaut's <skill mainSkill=62304>[Weapon Switch]</skill>),
    // so seed them here too or that self-reference can never resolve.
    // A BACKPACK_CODE_SKILLS override takes priority, since the referenced
    // ID is really the nested Code ability, not the passive itself.
    var backpacks = (window.BackpacksData || {}).backpacks || [];
    backpacks.forEach(function (b) {
      var sk = b.skill;
      if (!sk || !sk.ID || !sk.name) return;
      if (data.skill[sk.ID]) return;
      if (BACKPACK_CODE_SKILLS[sk.ID]) {
        data.skill[sk.ID] = BACKPACK_CODE_SKILLS[sk.ID];
        return;
      }
      var entry = { name: sk.name, effect: sk.SpecificEffects || '' };
      if (sk.icon) entry.icon = sk.icon;
      data.skill[sk.ID] = entry;
    });

    // Some Code abilities have their own ID distinct from the backpack's
    // skill ID (e.g. Supplier's 62306 grants [Quick Load] as 6230611), so
    // register any override not already seeded by the loop above.
    Object.keys(BACKPACK_CODE_SKILLS).forEach(function (id) {
      if (!data.skill[id]) data.skill[id] = BACKPACK_CODE_SKILLS[id];
    });

    rebuildNameIndex();

    var $tip = $('<div id="kw-tooltip" role="tooltip"></div>').appendTo('body');
    var tipEl = null;

    function showTip(el, type, id, entry) {
      var statsHtml = '';
      if (type === 'skill' && (entry.Ap != null || entry.CD != null)) {
        var parts = [];
        if (entry.Ap != null) parts.push('AP&nbsp;' + entry.Ap);
        if (entry.CD != null) parts.push('CD&nbsp;' + entry.CD);
        statsHtml = '<div class="kw-tip-stats">' + parts.join('<span class="kw-tip-sep">·</span>') + '</div>';
      }

      var effectHtml = entry.effect
        ? '<div class="kw-tip-effect">' + parseEffects(entry.effect) + '</div>'
        : '';

      var nestedRefs = extractReferences(entry.effect || '').filter(function (ref) {
        return !(ref.type === type && ref.id === id);
      });
      var nestedHtml = nestedRefs.map(function (ref) {
        var refEntry = lookup(ref.type, ref.id);
        if (!refEntry) return '';
        var refIconHtml = refEntry.icon
          ? '<img class="kw-tip-nested-icon" src="' + iconSrc(refEntry.icon) + '"' + iconErrorAttr(refEntry.icon) + ' alt="" />'
          : '';
        return (
          '<div class="kw-tip-nested">' +
            '<div class="kw-tip-nested-name">' + refIconHtml + refEntry.name + '</div>' +
            (refEntry.effect ? '<div class="kw-tip-nested-effect">' + parseEffects(refEntry.effect) + '</div>' : '') +
          '</div>'
        );
      }).join('');
      if (nestedHtml) {
        nestedHtml = '<div class="kw-tip-nested-list">' + nestedHtml + '</div>';
      }

      var nameHtml = '<div class="kw-tip-name">' + entry.name + '</div>';
      var headerHtml = entry.icon
        ? (
            '<div class="kw-tip-header">' +
              '<img class="kw-tip-icon" src="' + iconSrc(entry.icon) + '"' + iconErrorAttr(entry.icon) + ' alt="" />' +
              '<div class="kw-tip-header-text">' + nameHtml + statsHtml + '</div>' +
            '</div>'
          )
        : nameHtml + statsHtml;

      $tip.html(
        headerHtml +
        effectHtml +
        nestedHtml
      ).addClass('visible');

      tipEl = el;
      positionTip(el, $tip);
    }

    // A faded-out tip is still laid out at its last spot, which on a shorter
    // page (or after navigating) stretches the document past its content:
    // once the fade is done, park it empty at the top.
    var hideTimer = null;
    function hideTip() {
      tipEl = null;
      $tip.removeClass('visible');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!$tip.hasClass('visible')) $tip.empty().css({ top: 0, left: 0 });
      }, 150);
    }

    $(document).on('mouseenter', '.kw', function () {
      var type  = $(this).data('kw-type');
      var id    = String($(this).data('kw-id'));
      var entry = lookup(type, id);
      if (!entry) return;
      showTip(this, type, id, entry);
    });

    $(document).on('mousemove', '.kw', function () {
      if (tipEl === this) positionTip(this, $tip);
    });

    $(document).on('mouseleave', '.kw', function () {
      hideTip();
    });

    // Tapping a keyword on touch devices shows/toggles the same tooltip,
    // since touch input never fires mouseenter.
    $(document).on('click', '.kw', function (e) {
      var type  = $(this).data('kw-type');
      var id    = String($(this).data('kw-id'));
      var entry = lookup(type, id);
      if (!entry) return;

      e.preventDefault();
      e.stopPropagation();

      if (tipEl === this && $tip.hasClass('visible')) {
        hideTip();
        return;
      }
      showTip(this, type, id, entry);
    });

    $(document).on('click', function (e) {
      if (tipEl && !$(e.target).closest('#kw-tooltip').length) hideTip();
    });

    // Back/forward swaps the page out from under a hovered keyword without a
    // mouseleave.
    $(window).on('popstate', hideTip);

    $(document).on('click', '.section-jump-link', function (e) {
      e.preventDefault();
      var $target = $('#' + $(this).data('target'));
      if ($target.length) {
        $('html, body').animate({ scrollTop: $target.offset().top - 70 }, 200);
      }
    });
  }

  function positionTip(el, $tip) {
    var rect   = el.getBoundingClientRect();
    var tipH   = $tip.outerHeight();
    var tipW   = $tip.outerWidth();
    var winH   = $(window).height();
    var winW   = $(window).width();
    var left   = rect.left + window.scrollX;
    var top;

    if (rect.bottom + tipH + 6 > winH && rect.top - tipH - 6 >= 0) {
      top = rect.top + window.scrollY - tipH - 6;
    } else {
      top = rect.bottom + window.scrollY + 6;
    }

    if (left + tipW > winW - 12) {
      left = winW - tipW - 12;
    }

    $tip.css({ top: top, left: left });
  }

  // Accept glossary data loaded separately as window.GlossaryData
  function setData(d) { data = d; data.neural = data.neural || {}; rebuildNameIndex(); }

  return { lookup: lookup, parseEffects: parseEffects, init: init, setData: setData };
}());
