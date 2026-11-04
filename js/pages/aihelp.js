var Pages = window.Pages || {};

// The AI Help page: how to give an AI assistant (ChatGPT, Claude, Gemini) the
// whole wiki as one file, llms-full.txt, built by scripts/build_llm_context.py.
Pages.aihelp = {
  title: 'AI Help',

  _prompt:
    'The attached file is the full content of the Mecharashi Wiki. Answer my questions using only that file, ' +
    'and follow the "RULES FOR ANSWERING" at its top:\n' +
    '- Only show pictures from the wiki itself (the file\'s "Picture:" links). Never use images from the web.\n' +
    '- For ST efficiency, rank by damage bonuses first; raw stats come second.\n' +
    '- For ST/pilot pairing, put the pilot\'s Signature ST first, then STs whose modules boost that pilot\'s skills.\n' +
    '- Splash DMG is not AoE DMG. Never treat them as the same.\n' +
    'Words in [square brackets] are game keywords: look them up in the Effects and Glossary sections. ' +
    'Give the wiki link of every pilot, ST or item you use. ' +
    'If the file does not contain the answer, say so instead of guessing.',

  render: function () {
    this._bind();
    var file = 'llms-full.txt';
    var esc = function (s) { return $('<div>').text(s).html(); };
    var steps = function (items) { return '<ol>' + items.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>'; };
    return (
      '<div class="listing-header"><h1>AI Help</h1></div>' +
      '<div class="aihelp">' +
        '<p>Some questions are too complex for a search box. For example: <em>"Which SSR pilots can inflict Armor Break, ' +
        'and which Medium STs suit them?"</em> or <em>"What counters the Armed Conquest 13 bosses?"</em> ' +
        'Download the wiki as one text file, give it to an AI assistant, and ask in plain words.</p>' +

        '<p><a class="btn btn-primary" href="' + file + '" download><i class="bi bi-download"></i> Download llms-full.txt</a> ' +
        '<a class="btn btn-outline-secondary" href="' + file + '" target="_blank" rel="noopener"><i class="bi bi-file-text"></i> View in browser</a></p>' +
        '<p class="text-muted small">Every pilot, ST, weapon, backpack, module, accessory, effect, glossary keyword, ' +
        'EX skill, Armed Conquest and Clearance Ops boss, banner and the dispatch table. About 1.2 MB of plain text. ' +
        'It is rebuilt with each wiki update, so download it again after a patch.</p>' +

        '<h2 class="h5 mt-4">ChatGPT</h2>' +
        steps([
          'Open a new chat and click <b>+</b> (Attach), then upload <code>llms-full.txt</code>.',
          'Paste the starter prompt below, then ask your question.',
          'To keep it for later, create a <b>Project</b> and add the file to its files, so every chat in the project can use it.',
        ]) +
        '<p class="small text-muted">Pasting the link alone isn\'t enough: ChatGPT only reads part of a page this big ' +
        'when it browses, so it may miss things or guess. Upload the file instead.</p>' +

        '<h2 class="h5 mt-4">Claude</h2>' +
        steps([
          'Create a <b>Project</b>, then add <code>llms-full.txt</code> to its knowledge.',
          'Optionally, paste the starter prompt into the project\'s instructions.',
          'Start a chat in that project and ask away.',
        ]) +

        '<h2 class="h5 mt-4">Gemini</h2>' +
        steps([
          'Upload <code>llms-full.txt</code> to a chat, or add it to a <b>Gem</b>\'s knowledge.',
          'Paste the starter prompt and ask your question.',
        ]) +

        '<h2 class="h5 mt-4">Starter prompt</h2>' +
        '<pre class="aihelp-prompt" id="aihelp-prompt">' + esc(this._prompt) + '</pre>' +
        '<button class="btn btn-sm btn-outline-secondary" id="aihelp-copy"><i class="bi bi-clipboard"></i> Copy</button>' +

        '<h2 class="h5 mt-4">Tips</h2>' +
        '<ul>' +
          '<li>Ask for its sources: every entry in the file has its wiki link.</li>' +
          '<li>AI can still get things wrong, especially damage maths. Check important answers on the wiki itself.</li>' +
          '<li>The file covers the data pages. Story, events and game-mode rewards aren\'t in it yet.</li>' +
          '<li>AI tools can also find <a href="llms.txt" target="_blank" rel="noopener">llms.txt</a>, a short index of the wiki.</li>' +
        '</ul>' +
      '</div>'
    );
  },

  // navigate() has no init hook, so bind once on the document.
  _bind: function () {
    $(document).off('click.aihelp').on('click.aihelp', '#aihelp-copy', function () {
      var btn = $(this);
      navigator.clipboard.writeText($('#aihelp-prompt').text()).then(function () {
        btn.html('<i class="bi bi-check2"></i> Copied');
        setTimeout(function () { btn.html('<i class="bi bi-clipboard"></i> Copy'); }, 1500);
      });
    });
  },

  destroy: function () { $(document).off('click.aihelp'); }
};

window.Pages = Pages;
