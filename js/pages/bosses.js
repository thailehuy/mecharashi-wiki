var Pages = window.Pages || {};

Pages.bosses = {
  title: 'Bosses',

  render: function () {
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
      var name = mechNames[m[1]] ? '<a href="#sts/' + encodeURIComponent(m[1]) + '">' + esc(m[1]) + '</a>' : esc(m[1]);
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

    function cardHtml(stage, firstDiff) {
      var b     = bosses[stage.boss] || { name: stage.boss };
      var pilot = b.pilot_id && pilotById[b.pilot_id];
      var name  = pilot
        ? '<a href="#pilots/' + encodeURIComponent(pilot.PilotName) + '">' + esc(b.name) + '</a>'
        : esc(b.name);
      // AC stages have HP per difficulty (one block each, toggled), CO stages one.
      var hp = stage.difficulties
        ? stage.difficulties.map(function (d) { return hpHtml(stage.hp[d], d, d !== firstDiff); }).join('')
        : hpHtml(stage.hp);
      return (
        '<div class="col-6 col-md-3">' +
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
        return { href: '#weapons/' + encodeURIComponent(w.name), icon: weaponIconSrc(w), name: w.name };
      }).concat(backpacks.filter(function (b) {
        return b.ac ? b.ac === season.number : b.version === season.version;
      }).map(function (b) {
        return { href: '#backpacks/' + encodeURIComponent(backpackSlug(b)), icon: BACKPACK_ICON_BASE + encodeURIComponent(b.icon) + '.png', name: b.name };
      }));
      if (!items.length) return '';
      return (
        '<div class="boss-gear"><span class="boss-gear-label">Workshop Craft</span>' + items.map(function (it) {
          return '<a class="boss-gear-item" href="' + it.href + '"><img src="' + it.icon + '" alt="" loading="lazy" />' + esc(it.name) + '</a>';
        }).join('') + '</div>'
      );
    }

    function groupHtml(title, version, sub, cards, extra) {
      return (
        '<div class="boss-group">' +
          '<div class="boss-group-head"><h3>' + esc(title) + '</h3>' +
            (version ? '<span class="boss-version">v' + esc(version) + '</span>' : '') +
            (sub ? '<span class="boss-group-sub">' + sub + '</span>' : '') +
          '</div>' +
          '<div class="row g-3">' + cards + '</div>' +
          (extra || '') +
        '</div>'
      );
    }

    var ac = (data.armed_conquest || []).map(function (s) {
      var diffs = s.stages[0] ? s.stages[0].difficulties : [];
      var toggle = diffs.map(function (d, i) {
        return '<button type="button" class="filter-btn filter-occ' + (i === 0 ? ' active' : '') + '" data-boss-diff="' + esc(d) + '">' + esc(d) + '</button>';
      }).join('');
      var cards = s.stages.map(function (st) { return cardHtml(st, diffs[0]); }).join('');
      return groupHtml(s.number + '. ' + s.name, s.version, toggle, cards, gearHtml(s));
    }).join('');

    var co = (data.clearance_ops || []).map(function (c) {
      return groupHtml(c.chapter + '. ' + c.name, null, '', c.stages.map(function (st) { return cardHtml(st); }).join(''));
    }).join('');

    // Difficulty toggle: show that difficulty's HP on every boss of the season.
    $(document).off('click.bosses').on('click.bosses', '[data-boss-diff]', function () {
      var diff   = $(this).attr('data-boss-diff');
      var $group = $(this).closest('.boss-group');
      $group.find('[data-boss-diff]').removeClass('active');
      $(this).addClass('active');
      $group.find('.boss-hp').each(function () { this.hidden = this.getAttribute('data-diff') !== diff; });
    });

    return (
      '<div class="listing-header"><h1>Bosses</h1></div>' +
      '<p class="dispatch-intro">Bosses of each Armed Conquest season and Clearance Ops chapters 11–17, newest first. ' +
        'The number on each portrait is the stage. Bosses marked <b>Pilot</b> are also playable; their name links to the pilot page. ' +
        'Pick an Armed Conquest difficulty to see the bosses\' HP on it.</p>' +
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
