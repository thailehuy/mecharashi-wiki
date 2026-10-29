// Animated recruitment banners (gacha FX), from the assets repo's data/gachafx/
// (scripts/build_gacha_fx.py), played by gacha-fx-engine.js over the banner card
// on a WebGL canvas in a Bootstrap modal (kept on <body> across visits). Used by
// the ST and pilot pages' "Animated Banner Image" button and the Banner List.
//   mech pools:  <wap>.json, cards/<wap>.webp, fx/<texture>.png, manifest.json
//   pilot pools: pilots/<id>.json, pilots/cards/<id>.webp, pilots/fx/…, pilots/manifest.json
var GachaFx = (function () {
  var BASE = ASSET_BASE + 'data/gachafx/';
  var KINDS = {
    mech:  { dir: BASE,             key: 'wap' },
    pilot: { dir: BASE + 'pilots/', key: 'id' },
  };
  var manifests = {};  // kind -> promise of { wap / pilot id: pool prefab }, fetched once
  var handle = null;
  var runId = 0;

  // The pools that have an animated banner, as { wap / pilot id: pool prefab }.
  function pools(kind) {
    var k = KINDS[kind];
    if (!manifests[kind]) {
      manifests[kind] = $.getJSON(k.dir + 'manifest.json').then(function (rows) {
        var out = {};
        rows.forEach(function (r) { out[r[k.key]] = r.prefab; });
        return out;
      }, function () { manifests[kind] = null; return {}; });
    }
    return manifests[kind];
  }

  // The Banner List's name for a pool (its art is the pool prefab, as on the Banner
  // List; reruns keep the name). Null for pools with no banner listed (Hela, Blazer).
  function bannerName(prefab) {
    var banners = (window.BannersData && BannersData.banners) || [];
    for (var i = 0; i < banners.length; i++) {
      if (banners[i].image === prefab) return banners[i].name;
    }
    return null;
  }

  // The wap / pilot id whose pool uses this banner art (pool prefab), or null.
  function keyForPrefab(kind, prefab) {
    return pools(kind).then(function (p) {
      return Object.keys(p).find(function (key) { return p[key] === prefab; }) || null;
    });
  }

  function stop() {
    runId++;
    if (handle) handle.destroy();
    handle = null;
    // A fresh canvas each time: destroy() releases the old WebGL context
    $('#gacha-fx-modal .gacha-fx-stage').empty();
  }

  function hide() {
    var modal = document.getElementById('gacha-fx-modal');
    if (modal) bootstrap.Modal.getOrCreateInstance(modal).hide();
  }

  function show(kind, key, name) {
    var dir = KINDS[kind].dir;
    var $modal = $('#gacha-fx-modal');
    if (!$modal.length) {
      $modal = $(
        '<div class="modal fade banner-image-modal gacha-fx-modal" id="gacha-fx-modal" tabindex="-1" aria-hidden="true" data-bs-theme="dark">' +
          '<div class="modal-dialog modal-dialog-centered gacha-fx-dialog">' +
            '<div class="modal-content">' +
              '<div class="modal-header">' +
                '<h5 class="modal-title"></h5>' +
                // Beside the title, so the popup keeps its size as the status changes
                '<span class="gacha-fx-status"></span>' +
                '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
              '</div>' +
              '<div class="gacha-fx-stage"></div>' +
            '</div>' +
          '</div>' +
        '</div>'
      ).appendTo('body');
      // Stop the animation and free its WebGL context when the modal closes.
      $modal.on('hidden.bs.modal', stop);
    }
    stop();
    var run = runId;
    var card = dir + 'cards/' + key + '.webp';
    var $stage = $modal.find('.gacha-fx-stage');
    var $status = $modal.find('.gacha-fx-status').text('Loading…');
    $stage.append($('<img alt="" />').attr({ src: card, alt: name + ' recruitment banner' }));
    $modal.find('.modal-title').text(name);
    bootstrap.Modal.getOrCreateInstance($modal[0]).show();

    // The assets site lets browsers cache files for 10 minutes, so right after
    // an engine or pool update a browser can pair a stale copy with new files:
    // when the first try fails, try once more with fresh copies.
    var play = function (fresh) {
      var bust = fresh ? '?t=' + Date.now() : '';
      // A fresh canvas each try: a failed start may have taken the old one's WebGL context
      var canvas = $('<canvas width="2600" height="1080"></canvas>').appendTo($stage)[0];
      // The engine is an ES module: import() works from this classic script.
      return Promise.all([import(BASE + 'gacha-fx-engine.js' + bust), $.getJSON(dir + key + '.json' + bust)])
        .then(function (r) {
          if (run !== runId) return null;
          return r[0].startGachaFx(canvas, r[1], {
            background: card,
            texUrl: function (t) { return dir + 'fx/' + encodeURIComponent(t) + '.png' + bust; },
            onFirstFrame: function () { $(canvas).addClass('ready'); $status.text(''); },
            onLost: function () { $(canvas).remove(); $status.text('The animation stopped (WebGL context lost); showing the still image.'); },
          });
        })
        .then(function (h) {
          if (!h) return;
          if (run !== runId) h.destroy(); else handle = h;
        }, function (err) {
          $(canvas).remove();
          throw err;
        });
    };
    play(false)
      .catch(function (err) {
        if (run !== runId) return;
        if (window.console) console.warn('Animated banner ' + kind + ' ' + key + ', retrying with fresh files:', err);
        return play(true);
      })
      .catch(function (err) {
        if (run !== runId) return;
        if (window.console) console.error('Animated banner ' + kind + ' ' + key + ':', err);
        $status.text('The animation could not be played in this browser; showing the still image.');
      });
  }

  // A detail page's "Animated Banner Image" button (data-gacha-fx="<key>", hidden):
  // shown once the manifest lists the pool; clicking plays it, titled with the
  // pool's banner name (else fallbackName). `ns` is the page's event namespace.
  function initButton(kind, key, fallbackName, ns) {
    var title = fallbackName;
    // Resolves after the page's HTML is in (render returns it synchronously first).
    pools(kind).then(function (p) {
      if (!p[key]) return;
      title = bannerName(p[key]) || fallbackName;
      $('[data-gacha-fx="' + key + '"]').prop('hidden', false);
    });
    $(document).off('click.' + ns).on('click.' + ns, '[data-gacha-fx]', function () {
      show(kind, String($(this).data('gacha-fx')), title);
    });
  }

  function buttonHtml(key) {
    return '<button type="button" class="btn-gacha-fx" data-gacha-fx="' + key + '" hidden>Animated Banner Image</button>';
  }

  return { pools: pools, bannerName: bannerName, keyForPrefab: keyForPrefab, show: show, stop: stop, hide: hide,
           initButton: initButton, buttonHtml: buttonHtml };
})();
