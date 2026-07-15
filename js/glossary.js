var Glossary = (function () {
  var data = { buf: {}, skill: {}, terrain: {} };
  var nameIndex = { buf: {}, skill: {}, terrain: {} };
  var ICON_BASE = 'https://media.zlongame.com/media/pictures/cn/community/img/gl/gameInfo/skill/';

  function iconSrc(icon) {
    return icon ? ICON_BASE + encodeURIComponent(icon) + '.png' : '';
  }

  function lookup(type, id) {
    return (data[type] || {})[id] || null;
  }

  // Effect text frequently references other keywords as bare "[Name]" with no
  // <buf ID=..> wrapper (the glossary source data itself is often written this
  // way). Build a name -> id lookup so those can still be resolved and linked.
  function rebuildNameIndex() {
    nameIndex = { buf: {}, skill: {}, terrain: {} };
    ['buf', 'skill', 'terrain'].forEach(function (type) {
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
      var cls = entry ? 'kw kw-buf' : 'kw kw-buf kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="buf" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    text = text.replace(/<skill[^>]+?(?:mainSkill|activeSkill|passiveSkill|ID)=(\d+)[^>]*>\[?([^\]<]*)\]?<\/skill>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('skill', id);
      var cls = entry ? 'kw kw-skill' : 'kw kw-skill kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="skill" data-kw-id="' + id + '">[' + name + ']</span>';
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
      var terrainId = !bufId && !skillId && nameIndex.terrain[name];
      if (!bufId && !skillId && !terrainId) {
        kwMap[key] = '[' + name + ']';
        return key;
      }
      var type = bufId ? 'buf' : skillId ? 'skill' : 'terrain';
      var id = bufId || skillId || terrainId;
      kwMap[key] = '<span class="kw kw-' + type + '" data-kw-type="' + type + '" data-kw-id="' + id + '">[' + name + ']</span>';
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
    stripped.replace(/\[([^\[\]<>]+)\]/g, function (_, name) {
      var bufId = nameIndex.buf[name];
      var skillId = !bufId && nameIndex.skill[name];
      var terrainId = !bufId && !skillId && nameIndex.terrain[name];
      if (bufId) add('buf', bufId);
      else if (skillId) add('skill', skillId);
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

    // Seed skill lookup from pilot data for skills not in the glossary
    var pilots = (window.PilotsData || {}).pilots || [];
    pilots.forEach(function (p) {
      // Active skills from biomimetic computer data
      (p.biomimetic_computer_data || []).forEach(function (entry) {
        var sk = entry.skill;
        if (!sk || !sk.ID || !sk.name) return;
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
        if (data.skill[t.ID]) return;
        var tEntry = { name: t.name, effect: t.SpecificEffects || '' };
        if (t.SkillIcon || t.icon) tEntry.icon = t.SkillIcon || t.icon;
        data.skill[t.ID] = tEntry;
      });
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
          ? '<img class="kw-tip-nested-icon" src="' + iconSrc(refEntry.icon) + '" alt="" />'
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
              '<img class="kw-tip-icon" src="' + iconSrc(entry.icon) + '" alt="" />' +
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

    function hideTip() {
      tipEl = null;
      $tip.removeClass('visible');
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
  function setData(d) { data = d; rebuildNameIndex(); }

  return { lookup: lookup, parseEffects: parseEffects, init: init, setData: setData };
}());
