// The pilot page's Voice Lines tab: every line with its transcript and audio
// in English, Japanese or Chinese. The lines are in data/pilots/voice.js
// (PilotVoiceData, built by scripts/build_voice.py), fetched the first time
// the tab is opened; the audio is on VOICE_BASE (mecharashi-wiki-voices).
var Voice = {
  LANGS: [['en', 'English'], ['ja', 'Japanese'], ['zh', 'Chinese']],
  COND: { team: 'With {} in the team', target: 'When targeting {}', enemy: 'Against {}', st: 'Piloting {}' },
  _loading: null,
  _audio: null,
  _btn: null,

  lang: function () {
    try { return localStorage.getItem('voiceLang') || 'en'; } catch (e) { return 'en'; }
  },

  _load: function () {
    var self = this;
    if (window.PilotVoiceData) return $.Deferred().resolve().promise();
    if (!this._loading) {
      this._loading = $.ajax({ url: 'data/pilots/voice.js', dataType: 'script', cache: true })
        .fail(function () { self._loading = null; });
    }
    return this._loading;
  },

  fill: function (pane) {
    var self = this;
    if (pane.hasAttribute('data-filled')) return;
    var id = pane.getAttribute('data-voice-id');
    this._load().then(function () {
      if (!pane.isConnected) return;
      pane.setAttribute('data-filled', '');
      pane.innerHTML = self.render(id, (window.PilotVoiceData || {})[id]);
    }, function () {
      if (pane.isConnected) pane.innerHTML = '<p class="text-danger">Couldn\'t load the voice lines. Try again later.</p>';
    });
  },

  render: function (id, voice) {
    function esc(s) { return $('<span>').text(s).html(); }
    if (!voice) return '<p class="lore-empty">No voice lines for this one yet.</p>';

    var self = this;
    var pilots = (window.PilotsData || {}).pilots || [];
    function pilotLink(name) {
      var p = pilots.find(function (pl) { return pl.PilotName === name; });
      return p ? '<a href="' + App.href('pilots', p.PilotName) + '">' + esc(name) + '</a>' : esc(name);
    }
    function stLink(name) {
      return '<a href="' + App.href('sts', name) + '">' + esc(name) + '</a>';
    }
    function names(list, link) {
      var parts = list.map(link);
      return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' or ' + parts[parts.length - 1] : parts[0];
    }

    var all = voice.groups.reduce(function (a, g) { return a.concat(g.lines); }, []);
    var langs = this.LANGS.filter(function (l) {
      return all.some(function (ln) { return (ln.audio || []).indexOf(l[0]) >= 0; });
    });
    var lang = langs.some(function (l) { return l[0] === self.lang(); }) ? this.lang() : (langs[0] || [])[0];

    var cast = voice.cast || {};
    var castHtml = this.LANGS.filter(function (l) { return cast[l[0]]; }).map(function (l) {
      return '<div class="lore-profile-row"><dt>' + l[1] + ' voice</dt><dd>' + esc(cast[l[0]]) + '</dd></div>';
    }).join('');

    var langHtml = langs.length
      ? '<div class="voice-langs" role="group" aria-label="Audio language">' + langs.map(function (l) {
          return '<button type="button" class="voice-lang' + (l[0] === lang ? ' active' : '') + '" data-voice-lang="' + l[0] + '">' + l[1] + '</button>';
        }).join('') + '</div>'
      : '';

    var showNames = voice.groups.length > 1;
    var groupsHtml = voice.groups.map(function (g) {
      var rows = g.lines.map(function (ln) {
        var cond = ln.cond
          ? '<div class="voice-cond">' + self.COND[ln.cond.kind].replace('{}', names(ln.cond.names, ln.cond.kind === 'st' ? stLink : pilotLink)) + '</div>'
          : '';
        var audio = ln.audio || [];
        var src = id + '/' + ln.event + '.mp3';
        return (
          '<li class="voice-line">' +
            '<button type="button" class="voice-play" data-voice-src="' + esc(src) + '" data-voice-audio="' + audio.join(' ') + '"' +
              (audio.indexOf(lang) >= 0 ? '' : ' disabled') + ' aria-label="Play ' + esc(ln.title) + '"></button>' +
            '<div class="voice-body">' +
              '<div class="voice-title">' + esc(ln.title) + '</div>' +
              (ln.text ? '<div class="voice-text">' + esc(ln.text) + '</div>' : '') +
              cond +
            '</div>' +
          '</li>'
        );
      }).join('');
      return (showNames ? '<div class="section-heading lore-heading">' + esc(g.name) + '</div>' : '') +
             '<ul class="voice-lines">' + rows + '</ul>';
    }).join('');

    var noText = !all.some(function (ln) { return ln.text; })
      ? '<p class="voice-note">Not on Global yet: no English transcripts, and the audio is from the CN client.</p>'
      : '';

    return (
      '<div class="voice-top">' +
        langHtml +
        (castHtml ? '<dl class="lore-profile skill-card voice-cast">' + castHtml + '</dl>' : '') +
      '</div>' + noText + groupsHtml
    );
  },

  play: function (btn) {
    var lang = $(btn).closest('[data-voice-id]').find('.voice-lang.active').attr('data-voice-lang');
    var again = this._btn === btn;
    this.stop();
    if (again || !lang) return;
    var self = this;
    var audio = this._audio || (this._audio = new Audio());
    audio.src = VOICE_BASE + lang + '/' + btn.getAttribute('data-voice-src');
    audio.onended = audio.onerror = function () { self.stop(); };
    // Stop when the page moves on (the button is gone).
    audio.ontimeupdate = function () { if (self._btn && !self._btn.isConnected) self.stop(); };
    this._btn = btn;
    btn.classList.add('playing');
    audio.play().catch(function () { self.stop(); });
  },

  stop: function () {
    if (this._audio) this._audio.pause();
    if (this._btn) this._btn.classList.remove('playing');
    this._btn = null;
  },

  setLang: function (pane, lang) {
    try { localStorage.setItem('voiceLang', lang); } catch (e) {}
    this.stop();
    $(pane).find('[data-voice-lang]').each(function () { $(this).toggleClass('active', this.getAttribute('data-voice-lang') === lang); });
    $(pane).find('[data-voice-audio]').each(function () {
      this.disabled = this.getAttribute('data-voice-audio').split(' ').indexOf(lang) < 0;
    });
  }
};

$(document).on('click', '.voice-play', function () { Voice.play(this); });
$(document).on('click', '[data-voice-lang]', function () {
  Voice.setLang($(this).closest('[data-voice-id]')[0], this.getAttribute('data-voice-lang'));
});

window.Voice = Voice;
