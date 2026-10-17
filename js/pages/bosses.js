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
  var allWeapons = (window.WeaponsData || {}).weapons || [];
  var weapons = allWeapons.filter(function (w) { return w.quality === 'SSSR' && w.version; });
  var weaponNames = {};
  allWeapons.forEach(function (w) { weaponNames[w.name] = true; });
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
      // Also multipliers: "1.5x DMG", "2x0.5 DMG".
      return part.replace(/(^|[^\w.+\-])([+\-]?\d+(?:\.\d+)?(?:%?[\-~]\d+(?:\.\d+)?)?(?:[x×]\d+(?:\.\d+)?)?(?:%|[x×](?![\w.]?\d))?)(?![\w.]?\d)(?!\w)/g, '$1<color=#F74848>$2</color>');
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

  // Bounties: a condition and reward per difficulty, following the toggle. A
  // season's last stage also shows the clues it takes to unlock on that difficulty.
  function bountiesHtml(st, firstDiff) {
    if (!st.bounties) return '';
    var unlock = st.clue_unlock || {};
    return (
      '<div class="skill-card boss-stage-info boss-stage-bounties"><div class="boss-sub-head">Bounties</div><ol class="boss-bounties">' + st.bounties.map(function (b) {
        var rewards = b.rewards || {};
        return '<li>' + (b.name ? '<b>' + esc(b.name) + '</b> ' : '') + Object.keys(b.conditions).map(function (d) {
          return '<span' + diffsAttr([d], firstDiff) + '>' + descHtml(b.conditions[d]) +
            (rewards[d] ? '<span class="boss-bounty-reward">' + esc(rewards[d]) + '</span>' : '') + '</span>';
        }).join('') + '</li>';
      }).join('') + '</ol>' +
      Object.keys(unlock).map(function (d) {
        return '<div class="boss-clue-unlock"' + diffsAttr([d], firstDiff) + '>Unlocks with <b>' + unlock[d] + '</b> clues</div>';
      }).join('') + '</div>'
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
      (st.extreme_modifiers ? '<div class="skill-list boss-extreme-list">' + st.extreme_modifiers.map(function (m) {
        return (
          '<div class="skill-card boss-skill">' +
            '<div class="skill-name-row">' + (m.name ? '<span class="skill-name">' + esc(m.name) + '</span>' : '') +
              '<span class="boss-skill-diffs">Extreme Modifier</span>' + '</div>' +
            '<div class="talent-desc">' + descHtml(m.description) + '</div>' +
            (m.buffs || []).map(buffHtml).join('') +
          '</div>'
        );
      }).join('') + '</div>' : '') +
      // A clue's text grows with the difficulty: one text per difficulty
      // ({difficulty: text}) follows the toggle.
      (st.clues ? '<details class="boss-clues"><summary>Clues</summary>' + st.clues.map(function (c) {
        var text = typeof c.text === 'string' ? '<div>' + esc(c.text) + '</div>' : Object.keys(c.text).map(function (d) {
          return '<div' + diffsAttr([d], firstDiff) + '>' + esc(c.text[d]) + '</div>';
        }).join('');
        return '<div class="boss-clue"><b>' + esc(c.name) + '</b>' + (c.subtitle ? ' <i>' + esc(c.subtitle) + '</i>' : '') + text + '</div>';
      }).join('') + '</details>' : '')
    );
  }

  // An item a boss drops: its icon (extracted from the game into the assets
  // repo's data/items/), or for an Annihilation Voucher its boss's portrait.
  function dropItemHtml(it) {
    var boss = it.boss && bosses[it.boss];
    var img = boss && boss.portrait
      ? '<img class="boss-drop-portrait" src="' + ASSET_BASE + boss.portrait + '" alt="" loading="lazy" />'
      : it.icon ? '<img src="' + ASSET_BASE + 'data/items/' + encodeURIComponent(it.icon) + '.png" alt="" loading="lazy" />' : '';
    return '<span class="boss-gear-item">' + img + '<span>' + esc(it.name) + '</span></span>';
  }

  // An SSR accessory the boss's weapons can roll, drawn like the accessories
  // listing (its TA/RA plate behind the skill icon), with how many of the
  // weapons carry it.
  function dropAccHtml(a, kind) {
    var state = (kind === 'ta' ? 'Condition' : 'Function') + (a.w ? '_W' : '');
    var tilt = a.w ? (kind === 'ta' ? ' acc-skill-icon--trigger-w' : ' acc-skill-icon--reaction-w') : '';
    return (
      '<span class="boss-gear-item boss-drop-acc" title="On ' + a.weapons + ' weapon' + (a.weapons === 1 ? '' : 's') + '">' +
        '<span class="acc-card-icon">' +
          '<img class="acc-statetype-icon" src="' + ACC_ICON_BASE + 'statetype_' + state + '.png" alt="" loading="lazy" />' +
          '<img class="acc-skill-icon' + tilt + '" src="' + ACC_SKILL_BASE + encodeURIComponent(a.icon) + '.png" alt="" loading="lazy" />' +
        '</span>' +
        '<span>' + esc(a.name) + (a.w ? '<small class="boss-drop-q">W</small>' : '') +
          '<small class="boss-drop-acc-n">×' + a.weapons + '</small></span>' +
      '</span>'
    );
  }

  // One set of drops: weapons (best quality first; linked when the wiki has a
  // page for them, icons falling back to the game's CDN), the accessories they
  // can roll, then the other items it can drop, the ones every clear gives,
  // and the first clear's.
  function dropListHtml(d) {
    var line = function (label, items) {
      return items ? '<div class="boss-drop-list"><span class="boss-gear-label">' + label + '</span>' + items.map(dropItemHtml).join('') + '</div>' : '';
    };
    var accs = d.accessories || {};
    var accLine = function (kind, label) {
      return accs[kind] ? '<div class="boss-drop-list"><span class="boss-gear-label">' + label + '</span>' +
        accs[kind].map(function (a) { return dropAccHtml(a, kind); }).join('') + '</div>' : '';
    };
    return (
      (d.weapons && d.weapons.length ? '<div class="boss-drop-list">' + d.weapons.map(function (w) {
        var cdn = WEAPON_IMG_BASE + encodeURIComponent(w.icon) + '.png';
        var inner =
          '<img src="' + weaponIconSrc({ ID: w.id, icon: w.icon, type: w.type }) + '" onerror="this.onerror=null;this.src=\'' + cdn + '\';" alt="" loading="lazy" />' +
          '<span>' + esc(w.name) + '<small class="boss-drop-q boss-drop-q-' + esc(w.quality.toLowerCase()) + '">' + esc(w.quality) + '</small></span>';
        return weaponNames[w.name]
          ? '<a class="boss-gear-item" href="' + App.href('weapons', w.name) + '">' + inner + '</a>'
          : '<span class="boss-gear-item">' + inner + '</span>';
      }).join('') + '</div>' : '') +
      accLine('ta', 'SSR TA') +
      accLine('ra', 'SSR RA') +
      line(d.weapons && d.weapons.length ? 'Also drops' : 'Drops', d.items) +
      line('Every clear', d.always) +
      line('First clear', d.first)
    );
  }

  function dropCount(d) {
    var w = (d.weapons || []).length, n = (d.items || []).length;
    var a = d.accessories ? (d.accessories.ta || []).length + (d.accessories.ra || []).length : 0;
    var count = function (k, word, plural) { return k && k + ' ' + (k === 1 ? word : plural || word + 's'); };
    return [count(w, 'weapon'), count(a, 'SSR accessory', 'SSR accessories'), count(n, 'item'),
            d.first && 'first-clear reward'].filter(Boolean).join(' + ') || 'none';
  }

  // What a boss can drop (the game lists them, not their odds). Armed Conquest
  // stages have drops per difficulty ({difficulty: drops}), following the
  // toggle; Clearance Ops bosses one set.
  function dropsHtml(st, firstDiff) {
    var d = st.drops;
    if (!d) return '';
    var diffs = st.difficulties;
    var count = diffs ? diffs.map(function (df) {
      return '<span' + diffsAttr([df], firstDiff) + '>' + (d[df] ? dropCount(d[df]) : 'none') + '</span>';
    }).join('') : dropCount(d);
    var body = diffs ? diffs.filter(function (df) { return d[df]; }).map(function (df) {
      return '<div' + diffsAttr([df], firstDiff) + '>' + dropListHtml(d[df]) + '</div>';
    }).join('') : dropListHtml(d);
    return '<details class="boss-clues boss-drops"><summary>Drops: ' + count + '</summary>' + body + '</details>';
  }

  // A Clearance Ops boss's skills and drops as two tabs, so a long skill list
  // and a long drop list don't stack up.
  function tabsHtml(st) {
    var tab = function (key, label, active) {
      return '<button type="button" class="filter-btn filter-occ' + (active ? ' active' : '') + '" data-boss-tab="' + key + '">' + label + '</button>';
    };
    return (
      '<div class="boss-tabs">' + tab('skills', 'Skills', true) + tab('drops', 'Drops: ' + dropCount(st.drops)) + '</div>' +
      '<div data-boss-pane="skills">' + stageDetails(st) + '</div>' +
      '<div data-boss-pane="drops" hidden><div class="boss-clues boss-drops">' + dropListHtml(st.drops) + '</div></div>'
    );
  }

  // A row per stage: its number (and title), the boss with its HP and
  // bounties, and the boss's skills and drops beside it (tabbed for Clearance Ops).
  function stageRows(stages) {
    return stages.map(function (st) {
      var diffs = st.difficulties || [];
      return (
        '<div class="row g-3 boss-stage" id="stage-' + st.slot + '">' +
          stageIntro(st) +
          cardHtml(st, diffs[0], 'col-12 col-sm-5 col-md-3', bossHref(st.boss), null, '', bountiesHtml(st, diffs[0]), true) +
          '<div class="col-12 col-sm-7 col-md-9">' +
            (st.drops && !st.difficulties ? tabsHtml(st) : stageDetails(st, diffs[0]) + dropsHtml(st, diffs[0])) +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // One floating difficulty toggle for every stage; each stage's bounties are
  // below its HP, and Workshop Craft gear is at the top.
  function seasonPage(s) {
    var seasonDiffs = (s.stages[0] && s.stages[0].difficulties) || [];
    var stages = stageRows(s.stages);
    var guided = s.stages.some(function (st) { return st.skills && st.skills.some(function (sk) { return sk.type; }); });
    return (
      '<a href="' + App.href('armedconquest') + '" class="btn-back">&#8592; Back to Armed Conquest</a>' +
      '<div class="listing-header"><h1>' + esc(s.number + '. ' + s.name) + '</h1></div>' +
      '<p class="dispatch-intro">Armed Conquest season ' + s.number + (s.version ? ' (v' + esc(s.version) + ')' : '') + '. ' +
        'Every boss\'s skills, by stage. Pick a difficulty on the right: skills only on some difficulties are marked and follow it, as do the bosses\' HP, bounties and the clues the last stage takes to unlock. ' +
        (guided ? 'Skill cards, minions and Extreme modifiers are from the Armed Conquest guide.' : '') + '</p>' +
      '<div class="boss-group boss-season">' +
        (seasonDiffs.length > 1 ? '<div class="boss-diff-float">' + diffToggle(seasonDiffs) + '</div>' : '') +
        gearHtml(s) +
        stages +
      '</div>'
    );
  }

  // A Clearance Ops chapter: its blurb and turn limit, then every stage's boss
  // and skills, and the companions that fight beside them (no stage of their own).
  function chapterPage(c) {
    var companions = (c.companions || []).map(function (u) {
      return (
        '<div class="row g-3 boss-stage" id="companion-' + bossAnchor(u.name).replace(/^boss-/, '') + '">' +
          '<div class="col-12"><div class="skill-card boss-stage-info"><div class="boss-stage-title">' +
            '<b>Companion: ' + esc(u.name) + '</b>' + (u.mech ? ' <span class="boss-mech">' + mechHtml(u.mech) + '</span>' : '') +
          '</div></div></div>' +
          '<div class="col-12">' + stageDetails({ skills: u.skills }) + '</div>' +
        '</div>'
      );
    }).join('');
    return (
      '<a href="' + App.href('clearanceops') + '" class="btn-back">&#8592; Back to Clearance Ops</a>' +
      '<div class="listing-header"><h1>' + esc(c.chapter + '. ' + c.name) + '</h1></div>' +
      (c.description ? '<p class="dispatch-intro"><i>' + esc(c.description) + '</i></p>' : '') +
      '<p class="dispatch-intro">Clearance Ops chapter ' + c.chapter + '. Every boss\'s skills and drops, by stage.' +
        (c.turns ? ' Turn limit: <b>' + c.turns + '</b>.' : '') + '</p>' +
      '<div class="boss-group boss-season">' + stageRows(c.stages) + companions + '</div>'
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
    // Skills / Drops tabs of a Clearance Ops stage.
    $(document).on('click.bosses', '[data-boss-tab]', function () {
      var tab    = $(this).attr('data-boss-tab');
      var $stage = $(this).closest('.boss-stage');
      $stage.find('[data-boss-tab]').removeClass('active');
      $(this).addClass('active');
      $stage.find('[data-boss-pane]').each(function () { this.hidden = this.getAttribute('data-boss-pane') !== tab; });
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
    seasonPage: seasonPage, chapterPage: chapterPage, bindDiffToggle: bindDiffToggle, bossAnchor: bossAnchor, bossHref: bossHref,
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

  // param: a chapter name (its own page with every boss's skills).
  render: function (param) {
    var k = bossKit();
    k.bindDiffToggle();

    if (param) {
      var name    = decodeURIComponent(param);
      var chapter = (k.data.clearance_ops || []).find(function (c) { return c.name === name; });
      return chapter ? k.chapterPage(chapter) : '<p class="text-danger">Clearance Ops chapter not found.</p>';
    }

    var chapters = (k.data.clearance_ops || []).map(function (c) {
      var href  = App.href('clearanceops', c.name);
      var cards = c.stages.map(function (st) {
        return k.cardHtml(st, null, null, href + '#stage-' + st.slot, 'co-' + c.chapter + '-stage-' + st.slot);
      }).join('');
      var sub = c.turns ? '<span class="tag">' + c.turns + ' turns</span>' : '';
      return k.groupHtml(c.chapter + '. ' + c.name, null, sub, cards, '', href, 'co-' + c.chapter);
    }).join('');

    return (
      '<div class="listing-header"><h1>Clearance Ops</h1></div>' +
      '<p class="dispatch-intro">Bosses of every Clearance Ops chapter, newest first, with each chapter\'s turn limit. ' +
        'The number on each portrait is the stage. Bosses marked <b>Pilot</b> are also playable. ' +
        'Open a chapter (or a boss) for its bosses\' skills. ' +
        'See <a href="' + App.href('bosses') + '">Bosses</a> for every boss and where else it appears.</p>' +
      chapters
    );
  },

  destroy: function () {
    $(document).off('click.bosses');
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
        add(st.boss, { kind: 'CO', label: 'CO' + c.chapter, title: c.name, stage: st, href: App.href('clearanceops', c.name) + '#stage-' + st.slot });
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
        '<a href="' + App.href('clearanceops') + '">Clearance Ops</a>, A–Z, with each stage it\'s in and the ST it fields there. ' +
        'Bosses marked <b>Pilot</b> are also playable; their name links to the pilot.</p>' +
      '<div class="row g-3">' + cards + '</div>'
    );
  },
};

window.Pages = Pages;
