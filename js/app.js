$(function () {
  var DEFAULT_PAGE = 'pilots';
  var currentPage  = null;

  function parseHash() {
    var raw   = window.location.hash.replace(/^#\/?/, '') || DEFAULT_PAGE;
    var parts = raw.split('/');
    return { page: parts[0], param: parts[1] || null };
  }

  function navigate(page, param) {
    var p = Pages[page];
    if (!p) {
      $('#app-content').html('<p class="text-danger">Page not found.</p>');
      return;
    }

    if (currentPage && Pages[currentPage] && Pages[currentPage].destroy) {
      Pages[currentPage].destroy();
    }
    currentPage = page;

    $('[data-page]').removeClass('active');
    $('[data-page="' + page + '"]').addClass('active');

    $('#app-content').html(p.render(param));

    document.title = p.title + ' — Mecharashi Wiki';
  }

  $(window).on('hashchange', function () {
    var h = parseHash();
    navigate(h.page, h.param);
  });

  var h = parseHash();
  navigate(h.page, h.param);
});
