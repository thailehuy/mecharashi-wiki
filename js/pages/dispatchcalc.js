// Patches from v2.4 on with their length in weeks. The last week of each gives
// double dispatch points; days outside this schedule never do.
var DCALC_FIRST_PATCH = '2026-10-22';
var DCALC_PATCHES = [
  ['2.4', 4], ['2.5', 4], ['2.6', 6], ['2.7', 4], ['2.8', 4], ['3.0', 6], ['3.1', 4],
  ['3.2', 4], ['3.3', 6], ['3.4', 4], ['3.5', 6], ['3.6', 4], ['3.7', 4],
];
var DCALC_SLOTS  = [75, 100, 150];  // points of the 3 daily dispatches
var DCALC_CYCLE  = 3900;            // points per full dispatch cycle
var DCALC_CYCLES = 4;               // cycles (parts) per mech
var DCALC_TARGET = DCALC_CYCLE * DCALC_CYCLES;
var DCALC_LUCKY_EVERY = 4;          // ~25% chance of double points: every 4th day outside double weeks

// Dates are whole days since 1970-01-01 (UTC), so adding days never trips on DST.
function dcalcDay(iso) { var p = iso.split('-'); return Date.UTC(+p[0], p[1] - 1, +p[2]) / 864e5; }
function dcalcIso(day) { return new Date(day * 864e5).toISOString().slice(0, 10); }
function dcalcFmt(day) {
  return new Date(day * 864e5).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function dcalcToday() { var t = new Date(); return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5; }
function dcalcNum(n) { return n.toLocaleString('en-US'); }
function dcalcEsc(s) { return $('<span>').text(s).html(); }

// The Dispatch Calculator: from each group's progress and the 3 daily picks
// (each a mech, which sets its dispatch group), projects the day the first
// group finishes all 4 cycles. A result can be kept as a "round" whose end
// progress seeds the next calculation; rounds live in sessionStorage only.
// The form can be saved as a starting point (localStorage) to reset back to.
// It's the Dispatch page's second tab (js/pages/dispatch.js).
var DispatchCalc = {
  _state: null,

  _schedule: function () {
    if (this._patches) return this._patches;
    var day = dcalcDay(DCALC_FIRST_PATCH);
    return (this._patches = DCALC_PATCHES.map(function (p) {
      var patch = { version: p[0], start: day, end: day + 7 * p[1], dblStart: day + 7 * (p[1] - 1) };
      day = patch.end;
      return patch;
    }));
  },

  _patchAt: function (day) {
    var s = this._schedule();
    if (day < s[0].start) return 'before v' + s[0].version;
    var p = s.filter(function (p) { return day >= p.start && day < p.end; })[0];
    return p ? 'v' + p.version : 'after v' + s[s.length - 1].version;
  },

  // Every dispatch mech from data/dispatch.json, newest first, with its group
  // and the day its patch starts (mechs from before the schedule: always).
  _mechs: function () {
    if (this._mechList) return this._mechList;
    var schedule = this._schedule(), list = [];
    ((window.DispatchData || {}).dispatch || []).forEach(function (row) {
      var p = schedule.filter(function (p) { return p.version === row.cnPatch; })[0];
      var from = p ? p.start : +row.cnPatch < +schedule[0].version ? -Infinity : Infinity;
      DISPATCH_GROUPS.forEach(function (g, i) { list.unshift({ name: row[g], group: i, patch: row.cnPatch, from: from }); });
    });
    return (this._mechList = list);
  },

  _mech: function (name) {
    return this._mechs().filter(function (m) { return m.name === name; })[0];
  },

  // The newest mech of a group that's out by the given day.
  _newest: function (group, day) {
    return this._mechs().filter(function (m) { return m.group === group && m.from <= day; })[0];
  },

  _defaults: function () {
    var day = dcalcToday(), self = this;
    return {
      start: dcalcIso(day),
      todayDone: false,
      pessimistic: false,
      progress: DISPATCH_GROUPS.map(function () { return { cycles: 0, points: 0 }; }),
      mechs: [0, 1, 2].map(function (g) { return self._newest(g, day).name; }),
      rounds: [],
    };
  },

  _load: function () {
    try {
      var s = JSON.parse(sessionStorage.getItem('dispatchcalc'));
      // Saves from earlier versions of this page are started over.
      var self = this;
      if (s && s.progress && s.mechs && s.rounds && s.rounds.every(function (r) { return r.after; })) {
        var groups = s.mechs.map(function (n) { var m = self._mech(n); return m ? m.group : -1; });
        if (groups.every(function (g, i) { return g >= 0 && groups.indexOf(g) === i; })) return s;
      }
    } catch (e) {}
    return this._defaults();
  },

  _save: function () {
    try { sessionStorage.setItem('dispatchcalc', JSON.stringify(this._state)); } catch (e) {}
  },

  // The saved starting point: the form's inputs without rounds, or null.
  _savedStart: function () {
    try {
      var s = JSON.parse(localStorage.getItem('dispatchcalc-start'));
      var self = this;
      if (s && s.start && s.progress && s.mechs && s.mechs.every(function (n) { return self._mech(n); })) return s;
    } catch (e) {}
    return null;
  },

  _startNote: function () {
    var s = this._savedStart();
    return s ? 'Saved starting point: ' + dcalcFmt(dcalcDay(s.start)) : 'No starting point saved; reset uses today and zero progress.';
  },

  _slots: function (st) {
    var self = this;
    return st.mechs.map(function (n) { return self._mech(n).group; });
  },

  // Walks day by day until a group reaches 4 cycles. Outside double weeks,
  // every 4th day counts double unless the view is pessimistic.
  _simulate: function (st) {
    var schedule = this._schedule(), slots = this._slots(st);
    var before = st.progress.map(function (g) { return g.cycles * DCALC_CYCLE + g.points; });
    var totals = before.slice();
    var first = dcalcDay(st.start) + (st.todayDone ? 1 : 0);
    var doubleDays = 0, luckyDays = 0, normalDays = 0;
    for (var day = first; day < first + 3650; day++) {
      var mult = 1;
      if (schedule.some(function (p) { return day >= p.dblStart && day < p.end; })) {
        mult = 2;
        doubleDays++;
      } else if (!st.pessimistic && ++normalDays % DCALC_LUCKY_EVERY === 0) {
        mult = 2;
        luckyDays++;
      }
      slots.forEach(function (g, i) { totals[g] += DCALC_SLOTS[i] * mult; });
      var done = [];
      totals.forEach(function (t, g) { if (t >= DCALC_TARGET) done.push(g); });
      if (done.length) {
        return {
          start: first, end: day, days: day - first + 1, doubleDays: doubleDays, luckyDays: luckyDays,
          done: done, slots: slots, before: before, totals: totals,
          pastSchedule: day >= schedule[schedule.length - 1].end,
        };
      }
    }
    return null;
  },

  // Progress after a round: finished groups start over with their overflow.
  _nextProgress: function (r) {
    return r.totals.map(function (t, g) {
      if (r.done.indexOf(g) >= 0) t -= DCALC_TARGET;
      return { cycles: Math.min(Math.floor(t / DCALC_CYCLE), DCALC_CYCLES - 1), points: t % DCALC_CYCLE };
    });
  },

  _cycles: function (t) { return Math.min(Math.floor(t / DCALC_CYCLE), DCALC_CYCLES); },

  _progressText: function (t) {
    if (t >= DCALC_TARGET) return '4 / 4 cycles <span class="dcalc-done"><i class="bi bi-check-circle-fill"></i> complete</span>';
    return this._cycles(t) + ' / 4 cycles · ' + dcalcNum(t % DCALC_CYCLE) + ' / ' + dcalcNum(DCALC_CYCLE);
  },

  // A slot's mech picker. Groups another slot uses and mechs whose patch
  // hasn't started by the start date can't be picked.
  _slotSelect: function (i) {
    var st = this._state, day = dcalcDay(st.start), slots = this._slots(st), mechs = this._mechs();
    var groups = DISPATCH_GROUPS.map(function (g, k) {
      var taken = slots.indexOf(k) >= 0 && slots[i] !== k;
      return '<optgroup label="' + g + (taken ? ' (in use)' : '') + '"' + (taken ? ' disabled' : '') + '>' +
        mechs.filter(function (m) { return m.group === k; }).map(function (m) {
          var later = m.from > day;
          return '<option value="' + dcalcEsc(m.name) + '"' + (m.name === st.mechs[i] ? ' selected' : '') + (later ? ' disabled' : '') + '>' +
            dcalcEsc(m.name) + ' (v' + m.patch + (later ? (m.from < Infinity ? ', from ' + dcalcFmt(m.from) : ', not scheduled') : '') + ')</option>';
        }).join('') +
      '</optgroup>';
    }).join('');
    return (
      '<div class="dcalc-row">' +
        '<span class="dcalc-row-label">' + DCALC_SLOTS[i] + ' pts</span>' +
        '<select class="dcalc-input" data-slot="' + i + '">' + groups + '</select>' +
        '<span class="dcalc-hint">' + DISPATCH_GROUPS[slots[i]] + '</span>' +
      '</div>'
    );
  },

  _form: function () {
    var st = this._state, self = this;
    var progress = DISPATCH_GROUPS.map(function (g, i) {
      var p = st.progress[i];
      var cycles = [0, 1, 2, 3].map(function (c) {
        return '<option value="' + c + '"' + (c === p.cycles ? ' selected' : '') + '>' + c + '</option>';
      }).join('');
      return (
        '<div class="dcalc-row">' +
          '<span class="dcalc-row-label">' + g + '</span>' +
          '<label class="dcalc-field">Cycles done <select class="dcalc-input" data-cycles="' + i + '">' + cycles + '</select></label>' +
          '<label class="dcalc-field">Points <input type="number" class="dcalc-input dcalc-points" data-points="' + i + '" min="0" max="' + (DCALC_CYCLE - 1) + '" step="1" value="' + p.points + '" /> / ' + dcalcNum(DCALC_CYCLE) + '</label>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="dcalc-panels">' +
        '<section class="dcalc-panel">' +
          '<h2 class="dcalc-panel-title">Start</h2>' +
          '<div class="dcalc-row"><label class="dcalc-field">Date <input type="date" class="dcalc-input" id="dcalc-start" value="' + st.start + '" /></label></div>' +
          '<label class="dcalc-check"><input type="checkbox" id="dcalc-today-done"' + (st.todayDone ? ' checked' : '') + ' /> This day\'s dispatches are already done</label>' +
          '<label class="dcalc-check"><input type="checkbox" id="dcalc-pessimistic"' + (st.pessimistic ? ' checked' : '') + ' /> Pessimistic view <span class="dcalc-hint">(no 25% double-point days)</span></label>' +
        '</section>' +
        '<section class="dcalc-panel">' +
          '<h2 class="dcalc-panel-title">Current progress</h2>' + progress +
        '</section>' +
        '<section class="dcalc-panel">' +
          '<h2 class="dcalc-panel-title">Daily dispatches</h2>' +
          '<div id="dcalc-slots">' + DCALC_SLOTS.map(function (pts, i) { return self._slotSelect(i); }).join('') + '</div>' +
        '</section>' +
      '</div>' +
      '<div class="dcalc-start-actions">' +
        '<button type="button" class="filter-btn" id="dcalc-save-start"><i class="bi bi-bookmark"></i> Save as starting point</button>' +
        '<button type="button" class="filter-btn" id="dcalc-reset"><i class="bi bi-arrow-counterclockwise"></i> Reset to starting point</button>' +
        '<span class="dcalc-hint" id="dcalc-start-note">' + this._startNote() + '</span>' +
      '</div>'
    );
  },

  _result: function () {
    var st = this._state, r = this._simulate(st);
    this._last = r;
    if (!r) return '<div class="dcalc-result">No group reaches 4 cycles with these dispatches.</div>';

    var self = this;
    var names = r.done.map(function (g) {
      return '<strong>' + DISPATCH_GROUPS[g] + '</strong> (' + dcalcEsc(st.mechs[r.slots.indexOf(g)]) + ')';
    }).join(' and ');
    var bars = DISPATCH_GROUPS.map(function (g, i) {
      var pct = Math.min(r.totals[i] / DCALC_TARGET, 1) * 100;
      return (
        '<div class="dcalc-bar-row">' +
          '<span class="dcalc-row-label">' + g + '</span>' +
          '<div class="dcalc-bar"><div class="dcalc-bar-fill' + (pct >= 100 ? ' full' : '') + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
          '<span class="dcalc-bar-text">' + self._progressText(r.totals[i]) + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="dcalc-result">' +
        '<div class="dcalc-result-head">' + names + ' finish' + (r.done.length > 1 ? '' : 'es') + ' 4 cycles on <strong class="dcalc-date">' + dcalcFmt(r.end) + '</strong>' +
          ' <span class="dcalc-patch">' + this._patchAt(r.end) + '</span></div>' +
        '<div class="dcalc-result-sub">' + r.days + ' day' + (r.days === 1 ? '' : 's') + ' of dispatches from ' + dcalcFmt(r.start) +
          ': ' + r.doubleDays + ' in a double-point week' +
          (st.pessimistic ? ', no other double days (pessimistic)' : ', ' + r.luckyDays + ' lucky double days (every 4th other day)') + '</div>' +
        (r.pastSchedule ? '<div class="dcalc-warn"><i class="bi bi-exclamation-triangle"></i> Runs past the end of v3.7; later patches are counted without a double-point week.</div>' : '') +
        '<div class="dcalc-bars">' + bars + '</div>' +
        '<div class="dcalc-actions">' +
          '<button type="button" class="filter-btn dcalc-btn-primary" id="dcalc-next"><i class="bi bi-arrow-right-circle"></i> Save as round ' + (st.rounds.length + 1) + ' &amp; continue from here</button>' +
        '</div>' +
      '</div>'
    );
  },

  _rounds: function () {
    var rounds = this._state.rounds, self = this;
    if (!rounds.length) return '';
    // One row per daily dispatch; the round's own cells span its rows.
    var rows = rounds.map(function (r, i) {
      var span = ' rowspan="' + r.mechs.length + '"';
      return r.mechs.map(function (n, k) {
        var g = r.slots[k], gained = self._cycles(r.after[g]) - self._cycles(r.before[g]);
        return (
          '<tr' + (k ? '' : ' class="dcalc-round-first"') + '>' +
            (k ? '' :
              '<td' + span + '>' + (i + 1) + '</td>' +
              '<td' + span + ' data-label="Period">' + dcalcFmt(r.start) + ' → ' + dcalcFmt(r.end) + ' <span class="dcalc-hint">' + self._patchAt(r.end) + '</span></td>' +
              '<td' + span + ' data-label="Days">' + r.days + '</td>') +
            '<td data-label="Daily dispatch" class="dcalc-round-daily">' + dcalcEsc(n) + ' <span class="dcalc-hint">' + DISPATCH_GROUPS[g] + ' · ' + DCALC_SLOTS[k] + ' pts</span></td>' +
            '<td data-label="Cycles done">' + self._cycles(r.after[g]) + ' / 4' + (gained ? ' (+' + gained + ')' : '') +
              (r.done.indexOf(g) >= 0 ? ' <span class="dcalc-done"><i class="bi bi-check-circle-fill"></i></span>' : '') + '</td>' +
          '</tr>'
        );
      }).join('');
    }).join('');
    return (
      '<div class="dcalc-rounds-head"><h2 class="dcalc-panel-title">Rounds</h2>' +
        '<button type="button" class="filter-btn" id="dcalc-clear"><i class="bi bi-x-circle"></i> Clear rounds</button></div>' +
      '<div class="dispatch-table-wrap">' +
        '<table class="dispatch-table dcalc-rounds-table">' +
          '<thead><tr><th>#</th><th>Period</th><th>Days</th><th>Daily dispatch</th><th>Cycles done</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  },

  _scheduleTable: function () {
    var rows = this._schedule().map(function (p) {
      return '<tr><td class="dispatch-version-cell">v' + p.version + '</td><td>' + dcalcFmt(p.start) + '</td>' +
        '<td>' + (p.end - p.start) / 7 + ' weeks</td><td>' + dcalcFmt(p.dblStart) + ' – ' + dcalcFmt(p.end - 1) + '</td></tr>';
    }).join('');
    return (
      '<details class="dcalc-schedule"><summary>Patch schedule used</summary>' +
        '<div class="dispatch-table-wrap">' +
          '<table class="dispatch-table">' +
            '<thead><tr><th>Patch</th><th>Starts</th><th>Length</th><th>Double-point week</th></tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</details>'
    );
  },

  _refresh: function () {
    var self = this;
    $('#dcalc-slots').html(DCALC_SLOTS.map(function (pts, i) { return self._slotSelect(i); }).join(''));
    $('#dcalc-result').html(this._result());
    $('#dcalc-rounds').html(this._rounds());
    this._save();
  },

  _readForm: function () {
    var st = this._state, self = this;
    st.start = $('#dcalc-start').val() || dcalcIso(dcalcToday());
    st.todayDone = $('#dcalc-today-done').prop('checked');
    st.pessimistic = $('#dcalc-pessimistic').prop('checked');
    $('[data-cycles]').each(function () { st.progress[+$(this).data('cycles')].cycles = +$(this).val(); });
    $('[data-points]').each(function () {
      var v = Math.floor(+$(this).val()) || 0;
      st.progress[+$(this).data('points')].points = Math.max(0, Math.min(DCALC_CYCLE - 1, v));
    });
    $('[data-slot]').each(function () { st.mechs[+$(this).data('slot')] = $(this).val(); });
    this._fitMechs();
  },

  // A pick whose patch hasn't started by the start date falls back to the
  // newest mech of its group that has.
  _fitMechs: function () {
    var st = this._state, day = dcalcDay(st.start), self = this;
    st.mechs = st.mechs.map(function (n) {
      var m = self._mech(n);
      return m.from <= day ? n : self._newest(m.group, day).name;
    });
  },

  render: function () {
    var self = this;
    this._state = this._load();
    this._fitMechs();

    setTimeout(function () {
      $(document).on('input.dispatchcalc change.dispatchcalc', '#dcalc-form .dcalc-input, #dcalc-form input[type=checkbox]', function () {
        self._readForm();
        self._refresh();
      });
      // Clamp out-of-range points once the field is left, not while typing.
      $(document).on('blur.dispatchcalc', '.dcalc-points', function () {
        $(this).val(self._state.progress[+$(this).data('points')].points);
      });
      $(document).on('click.dispatchcalc', '#dcalc-next', function () {
        var r = self._last;
        if (!r) return;
        var st = self._state;
        st.rounds.push({
          start: r.start, end: r.end, days: r.days, done: r.done, slots: r.slots, mechs: st.mechs.slice(),
          before: r.before, after: r.totals,
        });
        st.progress = self._nextProgress(r);
        st.start = dcalcIso(r.end + 1);
        st.todayDone = false;
        self._fitMechs();
        $('#dcalc-form').html(self._form());
        self._refresh();
      });
      $(document).on('click.dispatchcalc', '#dcalc-save-start', function () {
        var st = self._state;
        var start = { start: st.start, todayDone: st.todayDone, pessimistic: st.pessimistic, progress: st.progress, mechs: st.mechs };
        try { localStorage.setItem('dispatchcalc-start', JSON.stringify(start)); } catch (e) {}
        $('#dcalc-start-note').text(self._savedStart() ? self._startNote() : 'Couldn\'t save: this browser is blocking site storage.');
      });
      // Back to the saved starting point (or the defaults), dropping all rounds.
      $(document).on('click.dispatchcalc', '#dcalc-reset', function () {
        var saved = self._savedStart();
        self._state = saved ? $.extend(saved, { rounds: [] }) : self._defaults();
        self._fitMechs();
        $('#dcalc-form').html(self._form());
        self._refresh();
      });
      $(document).on('click.dispatchcalc', '#dcalc-clear', function () {
        self._state.rounds = [];
        self._refresh();
      });
    }, 0);

    return (
      '<p class="dispatch-intro">Enter each dispatch group\'s progress and the mech you send each of your 3 daily dispatches for (one per group, from mechs whose patch has started by the start date), to see the day the first group completes all 4 cycles (' + dcalcNum(DCALC_CYCLE) + ' points each) for its ST. ' +
        'The last week of every patch gives double points. On other days there\'s a ~25% chance of double points, counted here as every 4th day, unless Pessimistic view is on. ' +
        'Save a result as a round to carry its progress into the next calculation; a finished group starts over with its leftover points. Rounds are kept only until the browser tab is closed; save your inputs as a starting point to reset back to them any time.</p>' +
      '<div id="dcalc-form">' + this._form() + '</div>' +
      '<div id="dcalc-result">' + this._result() + '</div>' +
      '<div id="dcalc-rounds">' + this._rounds() + '</div>' +
      '<div id="dcalc-schedule">' + this._scheduleTable() + '</div>'
    );
  },

  destroy: function () {
    $(document).off('.dispatchcalc');
  },
};
