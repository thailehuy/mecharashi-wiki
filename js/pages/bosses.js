var Pages = window.Pages || {};

// Shared by the Armed Conquest, Clearance Ops and Bosses pages.
function bossKit() {
  var data   = window.BossesData || {};
  var bosses = data.bosses || {};
  var esc    = function (s) { return $('<span>').text(s).html(); };

  var pilotById = {};
  ((window.PilotsData || {}).pilots || []).forEach(function (p) { pilotById[p.ID] = p; });
  var mechNames = {};
  ((window.MechsData || {}).mechs || []).forEach(function (m) { mechNames[m.name] = true; });

  // Same items as the weapons and backpacks listings show for each AC.
  var weapons = ((window.WeaponsData || {}).weapons || []).filter(function (w) { return w.quality === 'SSSR' && w.version; });
  var backpacks = ((window.BackpacksData || {}).backpacks || []).filter(function (b) { return b.quality === 'SSSR' && b.version; });

  // "Dias (Centurion parts)": link the ST when the wiki has a page for it.
  function mechHtml(mech) {
    var m    = /^(.*?)(?: \((.*)\))?$/.exec(mech);
    var name = mechNames[m[1]] ? '<a href="' + App.href('sts', m[1]) + '">' + esc(m[1]) + '</a>' : esc(m[1]);
    return name + (m[2] ? ' <span class="boss-mech-parts">' + esc(m[2]) + '</span>' : '');
  }

  function hpHtml(hp, diff, hidden) {
    var n = function (v) { return v.toLocaleString('en-US'); };
    return (
      '<dl class="boss-hp"' + (diff ? ' data-diff="' + esc(diff) + '"' : '') + (hidden ? ' hidden' : '') + '>' +
        '<dt>Body</dt><dd>' + n(hp.body) + '</dd>' +
        '<dt>Arm</dt><dd>' + n(hp.arm) + '</dd>' +
        '<dt>Legs</dt><dd>' + n(hp.legs) + '</dd>' +
      '</dl>'
    );
  }

  // href: where the boss name links (its stage, or its Bosses entry), if anywhere.
  // id: an anchor to link the card to. above/below: extra HTML around the card.
  // nameOnAvatar: show the name on the portrait instead of the stage number
  // (the season page puts the number on the stage's title line).
  function cardHtml(stage, firstDiff, col, href, id, above, below, nameOnAvatar) {
    var b     = bosses[stage.boss] || { name: stage.boss };
    var pilot = b.pilot_id && pilotById[b.pilot_id];
    var name  = href ? '<a href="' + href + '">' + esc(b.name) + '</a>' : esc(b.name);
    // AC stages have HP per difficulty (one block each, toggled), CO stages one.
    var hp = stage.difficulties
      ? stage.difficulties.map(function (d) { return hpHtml(stage.hp[d], d, d !== firstDiff); }).join('')
      : hpHtml(stage.hp);
    return (
      '<div class="' + (col || 'col-6 col-md-3') + (id ? ' boss-anchor" id="' + id : '') + '">' +
        (above || '') +
        '<div class="boss-card">' +
          (href ? '<a class="pilot-avatar boss-avatar" href="' + href + '">' : '<div class="pilot-avatar boss-avatar">') +
            (b.portrait ? '<img src="' + ASSET_BASE + b.portrait + '" alt="' + esc(b.name) + '" loading="lazy" />' : '') +
            '<span class="version-badge">' + (nameOnAvatar ? esc(b.name) : stage.slot) + '</span>' +
            (pilot ? '<span class="boss-pilot-badge">Pilot</span>' : '') +
          (href ? '</a>' : '</div>') +
          '<div class="boss-info">' +
            (nameOnAvatar ? '' : '<div class="pilot-name">' + name + '</div>') +
            '<div class="boss-mech">' + mechHtml(stage.mech) + '</div>' +
            (stage.cls ? '<div class="pilot-tags"><span class="tag">' + esc(stage.cls) + '</span></div>' : '') +
            hp +
          '</div>' +
        '</div>' +
        (below || '') +
      '</div>'
    );
  }

  // Weapons of this AC and the backpacks released with it.
  function gearHtml(season) {
    var items = weapons.filter(function (w) { return w.ac === season.number; }).map(function (w) {
      return { href: App.href('weapons', w.name), icon: weaponIconSrc(w), name: w.name };
    }).concat(backpacks.filter(function (b) {
      return b.ac ? b.ac === season.number : b.version === season.version;
    }).map(function (b) {
      return { href: App.href('backpacks', backpackSlug(b)), icon: BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png', name: b.name };
    }));
    if (!items.length) return '';
    return (
      '<div class="boss-gear"><span class="boss-gear-label">Workshop Craft</span>' + items.map(function (it) {
        return '<a class="boss-gear-item" href="' + it.href + '"><img src="' + it.icon + '" alt="" loading="lazy" />' + esc(it.name) + '</a>';
      }).join('') + '</div>'
    );
  }

  function groupHtml(title, version, sub, cards, extra, href, id) {
    return (
      '<div class="boss-group' + (id ? ' boss-anchor" id="' + id : '') + '">' +
        '<div class="boss-group-head"><h3>' + (href ? '<a href="' + href + '">' + esc(title) + '</a>' : esc(title)) + '</h3>' +
          (version ? '<span class="boss-version">v' + esc(version) + '</span>' : '') +
          (sub ? '<span class="boss-group-sub">' + sub + '</span>' : '') +
        '</div>' +
        '<div class="row g-3">' + cards + '</div>' +
        (extra || '') +
      '</div>'
    );
  }

  function diffToggle(diffs) {
    return diffs.map(function (d, i) {
      return '<button type="button" class="filter-btn filter-occ' + (i === 0 ? ' active' : '') + '" data-boss-diff="' + esc(d) + '">' + esc(d) + '</button>';
    }).join('');
  }

  // Names of the skills and buffs shown on the stage being rendered (set by
  // stageDetails). Bosses reuse pilot buff names with their own effects, so
  // these stay plain highlights instead of glossary tooltips.
  var localTerms = {};

  function collectTerms(st) {
    var terms = {};
    function add(list) {
      (list || []).forEach(function (x) {
        if (x.name) terms[x.name.toLowerCase()] = true;
        add(x.buffs);
      });
    }
    add(st.skills);
    (st.units || []).forEach(function (u) { add(u.skills); });
    add(st.extreme_modifiers);
    return terms;
  }

  // Pilot skill text arrives with its numbers wrapped in <color> tags; the
  // mined boss text mostly lost them, so add the same highlight to numbers
  // outside tags and [Terms]. Text that kept its tags is left alone.
  function highlightNumbers(text) {
    if (text.indexOf('<color=') !== -1) return text;
    return text.split(/(<[^>]*>|\[[^\[\]]*\])/).map(function (part, i) {
      if (i % 2) return part;
      return part.replace(/(^|[^\w.+\-])([+\-]?\d+(?:\.\d+)?(?:%?[\-~]\d+(?:\.\d+)?)?%?)(?![\w.]?\d)(?!\w)/g, '$1<color=#F74848>$2</color>');
    }).join('');
  }

  // Skill text with the game's [Terms] highlighted; terms the stage doesn't
  // define link to the glossary (e.g. [Re-ATK]) when it knows them.
  function descHtml(text) {
    var local = [];
    text = highlightNumbers(String(text)).replace(/\[([^\[\]]+)\]/g, function (m, name) {
      if (!localTerms[name.toLowerCase()]) return m;
      local.push(name);
      return '\x01' + (local.length - 1) + '\x01';
    });
    return Glossary.parseEffects(text)
      // Bare [Terms] the glossary doesn't know (not inside its spans/links).
      .replace(/\[([^\[\]<>]+)\](?!<\/)/g, '<span class="boss-term">[$1]</span>')
      .replace(/\x01(\d+)\x01/g, function (_, i) { return '<span class="boss-term">[' + esc(local[i]) + ']</span>'; });
  }

  // Marks an element as shown only on some difficulties (data-diffs), hidden
  // unless the selected one is among them.
  function diffsAttr(diffs, firstDiff) {
    return diffs ? ' data-diffs="' + esc(diffs.join('|')) + '"' + (diffs.indexOf(firstDiff) === -1 ? ' hidden' : '') : '';
  }

  // The skill's in-game type (guide cards) or, failing that, active/passive.
  var TYPE_CLASS = { Active: 'skill-type-attack', Code: 'skill-type-code', Passive: 'skill-type-passive', Talent: 'skill-type-innate', Weapon: 'skill-type-pp' };

  // A boss skill. Skills only on some difficulties (e.g. a β passive) carry
  // them in data-diffs and hide with the difficulty toggle.
  function skillHtml(sk, firstDiff) {
    var type  = sk.type || (sk.kind === 'active' ? 'Active' : 'Passive');
    var diffs = sk.difficulties;
    var meta  = [sk.cost, sk.cd && 'CD ' + sk.cd, sk.weapon].filter(Boolean);
    return (
      '<div class="skill-card boss-skill"' + diffsAttr(diffs, firstDiff) + '>' +
        '<div class="skill-name-row">' +
          (sk.icon ? '<img class="skill-icon boss-skill-icon" src="' + skillIconSrc(sk.icon) + '"' + skillIconErrorAttr(sk.icon) + ' alt="" loading="lazy" />' : '') +
          '<span class="skill-name">' + esc(sk.name) + '</span>' +
          '<span class="skill-type-badge ' + (TYPE_CLASS[type] || 'skill-type-passive') + '">' + esc(type) + '</span>' +
          (meta.length ? '<span class="boss-skill-meta">' + esc(meta.join(' · ')) + '</span>' : '') +
          (diffs ? '<span class="boss-skill-diffs">' + esc(diffs.join(' · ')) + '</span>' : '') +
        '</div>' +
        (sk.description ? '<div class="talent-desc">' + descHtml(sk.description) + '</div>' : '') +
        (sk.buffs || []).map(buffHtml).join('') +
      '</div>'
    );
  }

  // A buff (or terrain) the skill or modifier above applies.
  function buffHtml(b) {
    return (
      '<div class="boss-buff">' +
        '<span class="boss-buff-name">' + esc(b.name) + '</span>' +
        (b.tags ? '<span class="boss-buff-tags">' + esc(b.tags.join(' · ')) + '</span>' : '') +
        '<div>' + descHtml(b.description) + '</div>' +
      '</div>'
    );
  }

  // Bounties: a condition per difficulty, following the toggle.
  function bountiesHtml(st, firstDiff) {
    if (!st.bounties) return '';
    return (
      '<div class="skill-card boss-stage-info boss-stage-bounties"><div class="boss-sub-head">Bounties</div><ol class="boss-bounties">' + st.bounties.map(function (b) {
        return '<li>' + (b.name ? '<b>' + esc(b.name) + '</b> ' : '') + Object.keys(b.conditions).map(function (d) {
          return '<span' + diffsAttr([d], firstDiff) + '>' + descHtml(b.conditions[d]) + '</span>';
        }).join('') + '</li>';
      }).join('') + '</ol></div>'
    );
  }

  // The stage's number, title and blurb, spanning the row above the boss and its skills.
  function stageIntro(st) {
    return (
      '<div class="col-12"><div class="skill-card boss-stage-info"><div class="boss-stage-title">' +
        '<b>Stage ' + st.slot + (st.title ? ': ' + esc(st.title) : '') + '</b>' +
        (st.description ? ' <span>' + esc(st.description) + '</span>' : '') +
      '</div></div></div>'
    );
  }

  function stageDetails(st, firstDiff) {
    localTerms = collectTerms(st);
    return (
      '<div class="skill-list">' + (st.skills || []).map(function (sk) { return skillHtml(sk, firstDiff); }).join('') + '</div>' +
      (st.units || []).map(function (u) {
        return '<div class="boss-sub-head">' + esc(u.name) + '</div>' +
          '<div class="skill-list">' + u.skills.map(function (sk) { return skillHtml(sk, firstDiff); }).join('') + '</div>';
      }).join('') +
      (st.extreme_modifiers ? '<div class="skill-list">' + st.extreme_modifiers.map(function (m) {
        return (
          '<div class="skill-card boss-skill">' +
            '<div class="skill-name-row">' + (m.name ? '<span class="skill-name">' + esc(m.name) + '</span>' : '') +
              '<span class="boss-skill-diffs">Extreme Modifier</span>' + '</div>' +
            '<div class="talent-desc">' + descHtml(m.description) + '</div>' +
            (m.buffs || []).map(buffHtml).join('') +
          '</div>'
        );
      }).join('') + '</div>' : '') +
      (st.clues ? '<details class="boss-clues"><summary>Clues</summary>' + st.clues.map(function (c) {
        return '<div class="boss-clue"><b>' + esc(c.name) + '</b>' + (c.subtitle ? ' <i>' + esc(c.subtitle) + '</i>' : '') +
          '<div>' + esc(c.text) + '</div></div>';
      }).join('') + '</details>' : '')
    );
  }

  // One floating difficulty toggle for every stage; each stage's bounties are
  // below its HP, and Workshop Craft gear is at the top.
  function seasonPage(s) {
    var seasonDiffs = (s.stages[0] && s.stages[0].difficulties) || [];
    var stages = s.stages.map(function (st) {
      var diffs = st.difficulties || [];
      return (
        '<div class="row g-3 boss-stage" id="stage-' + st.slot + '">' +
          stageIntro(st) +
          cardHtml(st, diffs[0], 'col-12 col-sm-5 col-md-3', bossHref(st.boss), null, '', bountiesHtml(st, diffs[0]), true) +
          '<div class="col-12 col-sm-7 col-md-9">' + stageDetails(st, diffs[0]) + '</div>' +
        '</div>'
      );
    }).join('');
    var guided = s.stages.some(function (st) { return st.skills && st.skills.some(function (sk) { return sk.type; }); });
    return (
      '<a href="' + App.href('armedconquest') + '" class="btn-back">&#8592; Back to Armed Conquest</a>' +
      '<div class="listing-header"><h1>' + esc(s.number + '. ' + s.name) + '</h1></div>' +
      '<p class="dispatch-intro">Armed Conquest season ' + s.number + (s.version ? ' (v' + esc(s.version) + ')' : '') + '. ' +
        'Every boss\'s skills, by stage. Pick a difficulty on the right: skills only on some difficulties are marked and follow it, as do the bosses\' HP and bounties. ' +
        (guided
          ? 'Skill cards, bounties, minions, Extreme modifiers and clues are from the Armed Conquest guide.</p>'
          : 'Active skill effects aren\'t in the game data yet, so only their names are listed.</p>') +
      '<div class="boss-group boss-season">' +
        (seasonDiffs.length > 1 ? '<div class="boss-diff-float">' + diffToggle(seasonDiffs) + '</div>' : '') +
        gearHtml(s) +
        stages +
      '</div>'
    );
  }

  // Difficulty toggle: show that difficulty's HP (and skills) on every boss of
  // the season (listing) or on the one stage (season page).
  function bindDiffToggle() {
    $(document).off('click.bosses').on('click.bosses', '[data-boss-diff]', function () {
      var diff   = $(this).attr('data-boss-diff');
      var $group = $(this).closest('.boss-stage, .boss-group');
      $group.find('[data-boss-diff]').removeClass('active');
      $(this).addClass('active');
      $group.find('.boss-hp').each(function () { this.hidden = this.getAttribute('data-diff') !== diff; });
      $group.find('[data-diffs]').each(function () { this.hidden = this.getAttribute('data-diffs').split('|').indexOf(diff) === -1; });
    });
  }


  // In-page anchor of a boss on the Bosses page, e.g. "#boss-white-flame".
  function bossAnchor(name) {
    return 'boss-' + String(name).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function bossHref(name) { return App.href('bosses') + '#' + bossAnchor(name); }

  return {
    data: data, bosses: bosses, esc: esc, pilotById: pilotById,
    mechHtml: mechHtml, cardHtml: cardHtml, gearHtml: gearHtml, groupHtml: groupHtml, diffToggle: diffToggle,
    seasonPage: seasonPage, bindDiffToggle: bindDiffToggle, bossAnchor: bossAnchor, bossHref: bossHref,
  };
}

Pages.armedconquest = {
  title: 'Armed Conquest',

  // param: a season name (its own page with every boss's skills).
  render: function (param) {
    var k = bossKit();
    k.bindDiffToggle();

    if (param) {
      var name   = decodeURIComponent(param);
      var season = (k.data.armed_conquest || []).find(function (s) { return s.name === name; });
      return season ? k.seasonPage(season) : '<p class="text-danger">Armed Conquest season not found.</p>';
    }

    var seasons = (k.data.armed_conquest || []).map(function (s) {
      var diffs = s.stages[0] ? s.stages[0].difficulties : [];
      var cards = s.stages.map(function (st) {
        return k.cardHtml(st, diffs[0], null, App.href('armedconquest', s.name) + '#stage-' + st.slot);
      }).join('');
      return k.groupHtml(s.number + '. ' + s.name, s.version, k.diffToggle(diffs), cards, k.gearHtml(s), App.href('armedconquest', s.name), 'ac-' + s.number);
    }).join('');

    return (
      '<div class="listing-header"><h1>Armed Conquest</h1></div>' +
      '<p class="dispatch-intro">Bosses of each Armed Conquest season, newest first. ' +
        'The number on each portrait is the stage. Bosses marked <b>Pilot</b> are also playable. ' +
        'Pick a difficulty to see the bosses\' HP on it, or open a season (or a boss) for its bosses\' skills. ' +
        'See <a href="' + App.href('bosses') + '">Bosses</a> for every boss and where else it appears.</p>' +
      seasons
    );
  },

  destroy: function () {
    $(document).off('click.bosses');
  },
};

Pages.clearanceops = {
  title: 'Clearance Ops',

  render: function () {
    var k = bossKit();

    var chapters = (k.data.clearance_ops || []).map(function (c) {
      var cards = c.stages.map(function (st) {
        return k.cardHtml(st, null, null, k.bossHref(st.boss), 'co-' + c.chapter + '-stage-' + st.slot);
      }).join('');
      return k.groupHtml(c.chapter + '. ' + c.name, null, '', cards, '', null, 'co-' + c.chapter);
    }).join('');

    return (
      '<div class="listing-header"><h1>Clearance Ops</h1></div>' +
      '<p class="dispatch-intro">Bosses of Clearance Ops chapters 11–17, newest first. ' +
        'The number on each portrait is the stage. Bosses marked <b>Pilot</b> are also playable. ' +
        'Open a boss to see every Armed Conquest season and Clearance Ops chapter it appears in.</p>' +
      chapters
    );
  },
};

Pages.bosses = {
  title: 'Bosses',

  render: function () {
    var k   = bossKit();
    var esc = k.esc;

    // Every boss that's in a stage, with each stage it's in: Armed Conquest
    // seasons first, then Clearance Ops, newest first (the data's order).
    var appearances = {};
    function add(name, entry) { (appearances[name] = appearances[name] || []).push(entry); }
    (k.data.armed_conquest || []).forEach(function (s) {
      s.stages.forEach(function (st) {
        add(st.boss, { kind: 'AC', label: 'AC' + s.number, title: s.name, stage: st, href: App.href('armedconquest', s.name) + '#stage-' + st.slot });
      });
    });
    (k.data.clearance_ops || []).forEach(function (c) {
      c.stages.forEach(function (st) {
        add(st.boss, { kind: 'CO', label: 'CO' + c.chapter, title: c.name, stage: st, href: App.href('clearanceops') + '#co-' + c.chapter + '-stage-' + st.slot });
      });
    });

    var names = Object.keys(appearances).sort(function (a, b) { return a.localeCompare(b); });

    var cards = names.map(function (name) {
      var b     = k.bosses[name] || { name: name };
      var pilot = b.pilot_id && k.pilotById[b.pilot_id];
      var list  = appearances[name];
      var first = list[0].href;
      return (
        '<div class="col-12 col-sm-6 col-lg-4 boss-anchor" id="' + k.bossAnchor(name) + '">' +
          '<div class="boss-card boss-entry">' +
            '<a class="pilot-avatar boss-avatar" href="' + first + '">' +
              (b.portrait ? '<img src="' + ASSET_BASE + b.portrait + '" alt="' + esc(b.name) + '" loading="lazy" />' : '') +
              (pilot ? '<span class="boss-pilot-badge">Pilot</span>' : '') +
            '</a>' +
            '<div class="boss-info">' +
              '<div class="pilot-name">' + (pilot ? '<a href="' + App.href('pilots', pilot.PilotName) + '">' + esc(b.name) + '</a>' : esc(b.name)) + '</div>' +
              '<ul class="boss-appearances">' + list.map(function (a) {
                return (
                  '<li><a href="' + a.href + '"><span class="boss-app-tag boss-app-' + a.kind.toLowerCase() + '">' + esc(a.label) + '</span>' +
                    esc(a.title) + ' <span class="boss-app-stage">Stage ' + a.stage.slot + '</span></a>' +
                    '<div class="boss-mech">' + k.mechHtml(a.stage.mech) + '</div></li>'
                );
              }).join('') + '</ul>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="listing-header"><h1>Bosses</h1></div>' +
      '<p class="dispatch-intro">Every boss of <a href="' + App.href('armedconquest') + '">Armed Conquest</a> and ' +
        '<a href="' + App.href('clearanceops') + '">Clearance Ops</a> chapters 11–17, A–Z, with each stage it\'s in and the ST it fields there. ' +
        'Bosses marked <b>Pilot</b> are also playable; their name links to the pilot.</p>' +
      '<div class="row g-3">' + cards + '</div>'
    );
  },
};

window.Pages = Pages;
