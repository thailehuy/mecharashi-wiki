var Glossary = (function () {
  var data = { buf: {}, skill: {} };

  function lookup(type, id) {
    return (data[type] || {})[id] || null;
  }

  function parseEffects(text) {
    if (!text) return '';

    // Extract buf/skill keyword tags before HTML escaping
    var kwMap = {};
    var idx = 0;

    text = text.replace(/<buf ID=(\d+)>\[?([^\]<]*)\]?<\/buf>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('buf', id);
      var cls = entry ? 'kw kw-buf' : 'kw kw-buf kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="buf" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    text = text.replace(/<skill[^>]+?(?:mainSkill|activeSkill|ID)=(\d+)[^>]*>\[?([^\]<]*)\]?<\/skill>/g, function (_, id, name) {
      var key = '\x00KW' + (idx++) + '\x00';
      var entry = lookup('skill', id);
      var cls = entry ? 'kw kw-skill' : 'kw kw-skill kw-unknown';
      kwMap[key] = '<span class="' + cls + '" data-kw-type="skill" data-kw-id="' + id + '">[' + name + ']</span>';
      return key;
    });

    // Escape remaining HTML and process color/format tags
    text = text
      .replace(/&/g, '&amp;').replace(/</g, '\x00LT\x00').replace(/>/g, '\x00GT\x00')
      .replace(/\x00LT\x00color=(#[0-9A-Fa-f]+)\x00GT\x00([\s\S]*?)\x00LT\x00\/color\x00GT\x00/g,
        function (_, color, inner) { return '<span style="color:' + color + '">' + inner + '</span>'; })
      .replace(/\x00LT\x00[^]*?\x00GT\x00/g, '')
      .replace(/\n/g, '<br>');

    // Restore keyword spans
    Object.keys(kwMap).forEach(function (key) {
      text = text.split(key).join(kwMap[key]);
    });

    return text;
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

    var $tip = $('<div id="kw-tooltip" role="tooltip"></div>').appendTo('body');

    $(document).on('mouseenter', '.kw', function () {
      var type  = $(this).data('kw-type');
      var id    = String($(this).data('kw-id'));
      var entry = lookup(type, id);
      if (!entry) return;

      var statsHtml = '';
      if (type === 'skill' && (entry.Ap != null || entry.CD != null)) {
        var parts = [];
        if (entry.Ap != null) parts.push('AP&nbsp;' + entry.Ap);
        if (entry.CD != null) parts.push('CD&nbsp;' + entry.CD);
        statsHtml = '<div class="kw-tip-stats">' + parts.join('<span class="kw-tip-sep">·</span>') + '</div>';
      }

      var effectHtml = entry.effect
        ? '<div class="kw-tip-effect">' + parseColors(entry.effect) + '</div>'
        : '';

      $tip.html(
        '<div class="kw-tip-name">' + entry.name + '</div>' +
        statsHtml +
        effectHtml
      ).addClass('visible');

      positionTip(this, $tip);
    });

    $(document).on('mousemove', '.kw', function () {
      positionTip(this, $tip);
    });

    $(document).on('mouseleave', '.kw', function () {
      $tip.removeClass('visible');
    });
  }

  function positionTip(el, $tip) {
    var rect   = el.getBoundingClientRect();
    var tipW   = $tip.outerWidth();
    var winW   = $(window).width();
    var left   = rect.left + window.scrollX;
    var top    = rect.bottom + window.scrollY + 6;

    if (left + tipW > winW - 12) {
      left = winW - tipW - 12;
    }

    $tip.css({ top: top, left: left });
  }

  // Accept glossary data loaded separately as window.GlossaryData
  function setData(d) { data = d; }

  return { lookup: lookup, parseEffects: parseEffects, init: init, setData: setData };
}());
