var Pages = window.Pages || {};

Pages.bosses = {
  title: 'Bosses',

  // param: an Armed Conquest season name (its own page with every boss's skills).
  render: function (param) {
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

    function cardHtml(stage, firstDiff, col) {
      var b     = bosses[stage.boss] || { name: stage.boss };
      var pilot = b.pilot_id && pilotById[b.pilot_id];
      var name  = pilot
        ? '<a href="' + App.href('pilots', pilot.PilotName) + '">' + esc(b.name) + '</a>'
        : esc(b.name);
      // AC stages have HP per difficulty (one block each, toggled), CO stages one.
      var hp = stage.difficulties
        ? stage.difficulties.map(function (d) { return hpHtml(stage.hp[d], d, d !== firstDiff); }).join('')
        : hpHtml(stage.hp);
      return (
        '<div class="' + (col || 'col-6 col-md-3') + '">' +
          '<div class="boss-card">' +
            '<div class="pilot-avatar boss-avatar">' +
              (b.portrait ? '<img src="' + ASSET_BASE + b.portrait + '" alt="' + esc(b.name) + '" loading="lazy" />' : '') +
              '<span class="version-badge">' + stage.slot + '</span>' +
              (pilot ? '<span class="boss-pilot-badge">Pilot</span>' : '') +
            '</div>' +
            '<div class="boss-info">' +
              '<div class="pilot-name">' + name + '</div>' +
              '<div class="boss-mech">' + mechHtml(stage.mech) + '</div>' +
              (stage.cls ? '<div class="pilot-tags"><span class="tag">' + esc(stage.cls) + '</span></div>' : '') +
              hp +
            '</div>' +
          '</div>' +
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

    function groupHtml(title, version, sub, cards, extra, href) {
      return (
        '<div class="boss-group">' +
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

    // Skill text with the game's [Terms] highlighted.
    function descHtml(text) {
      return esc(text).replace(/\[([^\]]+)\]/g, '<span class="boss-term">[$1]</span>').replace(/\n/g, '<br>');
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
        '<div class="boss-sub-head">Bounties</div><ol class="boss-bounties">' + st.bounties.map(function (b) {
          return '<li>' + (b.name ? '<b>' + esc(b.name) + '</b> ' : '') + Object.keys(b.conditions).map(function (d) {
            return '<span' + diffsAttr([d], firstDiff) + '>' + descHtml(b.conditions[d]) + '</span>';
          }).join('') + '</li>';
        }).join('') + '</ol>'
      );
    }

    function stageDetails(st, firstDiff) {
      var intro = (st.title || st.description
          ? '<div class="boss-stage-title">' + (st.title ? '<b>' + esc(st.title) + '</b>' : '') +
              (st.description ? ' <span>' + esc(st.description) + '</span>' : '') + '</div>'
          : '') + bountiesHtml(st, firstDiff);
      return (
        (intro ? '<div class="skill-card boss-stage-info">' + intro + '</div>' : '') +
        '<div class="skill-list">' + (st.skills || []).map(function (sk) { return skillHtml(sk, firstDiff); }).join('') + '</div>' +
        (st.units || []).map(function (u) {
          return '<div class="boss-sub-head">' + esc(u.name) + '</div>' +
            '<div class="skill-list">' + u.skills.map(function (sk) { return skillHtml(sk, firstDiff); }).join('') + '</div>';
        }).join('') +
        (st.extreme_modifiers ? '<div class="boss-sub-head">Extreme Modifier</div><div class="skill-list">' + st.extreme_modifiers.map(function (m) {
          return (
            '<div class="skill-card boss-skill">' +
              '<div class="skill-name-row"><span class="skill-name">' + esc(m.name) + '</span>' +
                (m.difficulty ? '<span class="boss-skill-diffs">' + esc(m.difficulty) + '</span>' : '') + '</div>' +
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

    function seasonPage(s) {
      var diffs = s.stages[0] ? s.stages[0].difficulties : [];
      var stages = s.stages.map(function (st) {
        return (
          '<div class="row g-3 boss-stage">' +
            cardHtml(st, diffs[0], 'col-12 col-sm-5 col-md-3') +
            '<div class="col-12 col-sm-7 col-md-9">' + stageDetails(st, diffs[0]) + '</div>' +
          '</div>'
        );
      }).join('');
      var guided = s.stages.some(function (st) { return st.skills && st.skills.some(function (sk) { return sk.type; }); });
      return (
        '<a href="' + App.href('bosses') + '" class="btn-back">&#8592; Back to Bosses</a>' +
        '<div class="listing-header"><h1>' + esc(s.number + '. ' + s.name) + '</h1></div>' +
        '<p class="dispatch-intro">Armed Conquest season ' + s.number + (s.version ? ' (v' + esc(s.version) + ')' : '') + '. ' +
          'Every boss\'s skills, by stage. Skills only on some difficulties are marked and follow the difficulty you pick, as do the bounties. ' +
          (guided
            ? 'Skill cards, bounties, minions, Extreme modifiers and clues are from the Armed Conquest guide.</p>'
            : 'Active skill effects aren\'t in the game data yet, so only their names are listed.</p>') +
        '<div class="boss-group boss-season">' +
          '<div class="boss-group-head"><h3>Difficulty</h3><span class="boss-group-sub">' + diffToggle(diffs) + '</span></div>' +
          stages +
          gearHtml(s) +
        '</div>'
      );
    }

    // Difficulty toggle: show that difficulty's HP (and skills) on every boss of the season.
    $(document).off('click.bosses').on('click.bosses', '[data-boss-diff]', function () {
      var diff   = $(this).attr('data-boss-diff');
      var $group = $(this).closest('.boss-group');
      $group.find('[data-boss-diff]').removeClass('active');
      $(this).addClass('active');
      $group.find('.boss-hp').each(function () { this.hidden = this.getAttribute('data-diff') !== diff; });
      $group.find('[data-diffs]').each(function () { this.hidden = this.getAttribute('data-diffs').split('|').indexOf(diff) === -1; });
    });

    if (param) {
      var name   = decodeURIComponent(param);
      var season = (data.armed_conquest || []).find(function (s) { return s.name === name; });
      return season ? seasonPage(season) : '<p class="text-danger">Armed Conquest season not found.</p>';
    }

    var ac = (data.armed_conquest || []).map(function (s) {
      var diffs = s.stages[0] ? s.stages[0].difficulties : [];
      var cards = s.stages.map(function (st) { return cardHtml(st, diffs[0]); }).join('');
      return groupHtml(s.number + '. ' + s.name, s.version, diffToggle(diffs), cards, gearHtml(s), App.href('bosses', s.name));
    }).join('');

    var co = (data.clearance_ops || []).map(function (c) {
      return groupHtml(c.chapter + '. ' + c.name, null, '', c.stages.map(function (st) { return cardHtml(st); }).join(''));
    }).join('');

    return (
      '<div class="listing-header"><h1>Bosses</h1></div>' +
      '<p class="dispatch-intro">Bosses of each Armed Conquest season and Clearance Ops chapters 11–17, newest first. ' +
        'The number on each portrait is the stage. Bosses marked <b>Pilot</b> are also playable; their name links to the pilot page. ' +
        'Pick an Armed Conquest difficulty to see the bosses\' HP on it, or open a season for its bosses\' skills.</p>' +
      '<div class="boss-jump"><a href="#boss-ac">Armed Conquest</a><a href="#boss-co">Clearance Ops</a></div>' +
      '<h2 class="boss-section" id="boss-ac">Armed Conquest</h2>' + ac +
      '<h2 class="boss-section" id="boss-co">Clearance Ops</h2>' + co
    );
  },

  destroy: function () {
    $(document).off('click.bosses');
  },
};

window.Pages = Pages;
