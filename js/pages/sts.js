var Pages = window.Pages || {};

Pages.sts = {
  title: 'STs',
  data: [
    { name: 'ST Sigma',   meta: 'Type: Assault · Status: Active' },
    { name: 'ST Omicron', meta: 'Type: Support · Status: Retired' },
    { name: 'ST Lambda',  meta: 'Type: Recon · Status: Active' },
  ],

  render: function () {
    if (this.data.length === 0) {
      return (
        '<div class="empty-state">' +
          '<div class="empty-icon">&#129302;</div>' +
          '<p>No STs found.</p>' +
        '</div>'
      );
    }

    var rows = this.data.map(function (s) {
      return (
        '<div class="col-12 col-sm-6 col-lg-4">' +
          '<div class="card-item">' +
            '<div class="item-name">' + $('<span>').text(s.name).html() + '</div>' +
            '<div class="item-meta">' + $('<span>').text(s.meta).html() + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="listing-header d-flex align-items-center">' +
        '<h1>STs</h1>' +
        '<span class="badge bg-secondary ms-3">' + this.data.length + '</span>' +
      '</div>' +
      '<div class="row g-3">' + rows + '</div>'
    );
  }
};

window.Pages = Pages;
