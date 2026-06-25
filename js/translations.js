var Translations = (function () {

  function fetch(url) {
    return new Promise(function (resolve) {
      $.getJSON(url)
        .done(function (data) { resolve(data); })
        .fail(function ()     { resolve(null); });
    });
  }

  // Deep-merge non-empty translation strings over a pilot entry (mutates a shallow clone).
  function applyPilot(entry, t) {
    if (!t) return entry;
    var out = $.extend(true, {}, entry);

    ['PilotName','RealName','Gender','Profession','Occupation','version'].forEach(function (f) {
      if (t[f]) out[f] = t[f];
    });

    ['Talent0_2Ability','Talent3_5Ability'].forEach(function (key) {
      if (t[key] && out[key]) {
        ['name','SpecificEffects'].forEach(function (f) {
          if (t[key][f]) out[key][f] = t[key][f];
        });
      }
    });

    if (t.skills) {
      (out.biomimetic_computer_data || []).forEach(function (bcd) {
        var sk = bcd.skill;
        var tr = sk && t.skills[sk.ID];
        if (tr) {
          ['name','describe','SpecificEffects'].forEach(function (f) { if (tr[f]) sk[f] = tr[f]; });
        }
      });
    }

    if (t.neuralPassives) {
      var nd = out.NeuralDriveTemplate || {};
      (nd.ListChipPartition || []).forEach(function (part) {
        (part.ListActivationEffects || []).forEach(function (eff) {
          var ps = eff.PassiveSkill;
          var tr = ps && t.neuralPassives[ps.ID];
          if (tr) {
            ['name','SpecificEffects'].forEach(function (f) { if (tr[f]) ps[f] = tr[f]; });
          }
        });
      });
    }

    return out;
  }

  function applyMech(entry, t) {
    if (!t) return entry;
    var out = $.extend(true, {}, entry);

    ['name','introduce','version'].forEach(function (f) { if (t[f]) out[f] = t[f]; });

    if (t.modules) {
      (out.modules || []).forEach(function (mod) {
        var tr = t.modules[mod.ID];
        if (tr) {
          ['name','SpecificEffects'].forEach(function (f) { if (tr[f]) mod[f] = tr[f]; });
        }
      });
    }

    return out;
  }

  // Load a pilot translation and re-render the detail if anything changed.
  function loadPilot(pilot, renderFn) {
    fetch('data/pilots/' + pilot.ID + '-translation.json').then(function (t) {
      if (!t) return;
      var merged = applyPilot(pilot, t);
      if (JSON.stringify(merged) !== JSON.stringify(pilot)) {
        $('#app-content').html(renderFn(merged));
      }
    });
  }

  // Load a mech translation and re-render the detail if anything changed.
  function loadMech(mech, renderFn) {
    fetch('data/mechs/' + mech.ID + '-translation.json').then(function (t) {
      if (!t) return;
      var merged = applyMech(mech, t);
      if (JSON.stringify(merged) !== JSON.stringify(mech)) {
        $('#app-content').html(renderFn(merged));
      }
    });
  }

  return { loadPilot: loadPilot, loadMech: loadMech };
}());
