var Pages = window.Pages || {};

var EXSKILL_TYPE_LABEL = { Active: 'Attack', Code: 'Code' };
var EXSKILL_TYPE_CLASS = { Active: 'skill-type-attack', Code: 'skill-type-code' };

Pages.exskills = {
  title: 'EX Skills',

  render: function () {
    var skills = (window.ExSkillsData || {}).exskills || [];

    var cardsHtml = skills.map(function (sk) {
      var typeLabel = EXSKILL_TYPE_LABEL[sk.type] || sk.type;
      var typeCls   = EXSKILL_TYPE_CLASS[sk.type] || '';
      var iconSrc   = SKILL_BASE + encodeURIComponent(sk.icon) + '.png';
      var desc      = Glossary.parseEffects(sk.SpecificEffects || '');

      var statBadges =
        '<span class="skill-stat"><span class="skill-stat-label">AP</span>' + (sk.Ap || '—') + '</span>' +
        (sk.type === 'Code'
          ? '<span class="skill-stat"><span class="skill-stat-label">CD</span>' + (sk.CD || '0') + '</span>'
          : '');

      // Guard isn't tied to a weapon type at all — it's restricted to the
      // Guardian occupation instead, so show that in place of a Wpn badge.
      var wpnBadge = sk.occupation
        ? '<span class="skill-type-badge">' + $('<span>').text(sk.occupation).html() + ' only</span>'
        : '<span class="skill-type-badge">' + $('<span>').text(sk.Wpn).html() + '</span>';

      return (
        '<div class="skill-card">' +
          '<div class="skill-header">' +
            '<img class="skill-icon" src="' + iconSrc + '" alt="' + $('<span>').text(sk.name).html() + '" />' +
            '<div class="skill-header-info">' +
              '<div class="skill-name-row">' +
                '<span class="skill-name">' + $('<span>').text(sk.name).html() + '</span>' +
                '<span class="skill-type-badge ' + typeCls + '">' + typeLabel + '</span>' +
                wpnBadge +
              '</div>' +
              '<div class="skill-stats">' + statBadges + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="talent-desc">' + desc + '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="listing-header"><h1>EX Skills</h1><span class="badge bg-secondary ms-3">' + skills.length + '</span></div>' +
      '<p class="dispatch-intro">Weapon-type basic attacks usable by any pilot, identical to their normal namesake counterpart.</p>' +
      '<div class="skill-list">' + cardsHtml + '</div>'
    );
  },

  destroy: function () {},
};

window.Pages = Pages;
