var GLOBAL_VERSION = 2.1;

$(function () {
  // Glossary data is pre-loaded via data/glossary.js; just init tooltips
  Glossary.init();

  $('.global-version-badge').text('Global v' + GLOBAL_VERSION);

  // Mobile slide-out drawer
  var $drawer = $('#navDrawer');
  var $overlay = $('#navOverlay');

  function openDrawer() {
    $drawer.addClass('open');
    $overlay.addClass('open');
    $('body').css('overflow', 'hidden');
  }

  function closeDrawer() {
    $drawer.removeClass('open');
    $overlay.removeClass('open');
    $('body').css('overflow', '');
  }

  $('#navToggle').on('click', openDrawer);
  $('#navClose').on('click', closeDrawer);
  $overlay.on('click', closeDrawer);
  $drawer.on('click', '[data-page]', closeDrawer);

  // Close drawer if viewport grows past mobile breakpoint
  $(window).on('resize', function () {
    if (window.innerWidth >= 768) closeDrawer();
  });

  // "Misc." nav dropdown — the toggle itself doesn't navigate anywhere,
  // it just reveals a menu of actual pages (e.g. Dispatch Table).
  var $miscDropdown = $('#miscDropdown');

  $('#miscDropdownToggle').on('click', function (e) {
    e.preventDefault();
    $miscDropdown.toggleClass('open');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#miscDropdown').length) {
      $miscDropdown.removeClass('open');
    }
  });

  $miscDropdown.on('click', '.nav-dropdown-item', function () {
    $miscDropdown.removeClass('open');
  });


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
    $('#miscDropdownToggle').toggleClass('active', page === 'dispatch' || page === 'exskills' || page === 'ststats');

    $('#app-content').html(p.render(param));
    window.scrollTo(0, 0);

    document.title = p.title + ' — Mecharashi Wiki';
  }

  $(window).on('hashchange', function () {
    var h = parseHash();
    navigate(h.page, h.param);
  });

  var h = parseHash();
  navigate(h.page, h.param);
});
