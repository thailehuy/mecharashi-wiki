const D = window.BenchData;
const BENCH_VERSION = "1.10";      // +0.01 per published change
const HIT_COMP = 0.1;              // Machine Gun / HMG / Shotgun / Flamethrower: HitRate_wep added per miss in a row (the game's 0.05, added twice)
const PARTS = ["Body", "Left arm", "Right arm", "Legs"];
const SLOTS = [["RH", "Right hand"], ["LH", "Left hand"], ["RS", "Right shoulder"], ["LS", "Left shoulder"], ["BK", "Back"]];
const CATS = ["Melee", "Assault", "Sniper", "Heavy"];
const ATTRS = ["Melee", "Assault", "Snipe", "Ranged", "Mechanic", "Defense"];
const RD_CAT = { Melee: "Melee Weapon", Assault: "Assault Weapon", Sniper: "Ranged Weapon", Heavy: "Tactical Weapon", FixedArms: "Tactical Weapon" };
const FIELD = {
  attr_add: "Attribute +", attr_pct: "Attribute %", atk_add: "Attack +", atk_pct: "Attack %", fp_add: "FP +", fp_pct: "FP %",
  whit_add: "Weapon hit +", whit_pct: "Weapon hit %", ahit_add: "Arm hit +", ahit_pct: "Arm hit %", hitrate: "Hit chance +", hit_cat_pct: "Weapon & arm hit %", dodge_rate: "Hit taken −", crit_rate: "Crit rate +", crit_mul: "Crit rate × (features)",
  crit_app_add: "Weapon crit points +", crit_app_flat: "Crit points +", crit_app_pct: "Weapon crit points %", crit_app_fin: "Crit points (final) +", crit_fin: "Crit rate after features +", crit_dmg: "Crit damage +", dmgB: "Damage %", finalB: "Final damage %", npcB: "Target damage factor %",
  skillM: "Skill multiplier +", fixB: "Fixed DMG % (Explosive Charge)", splash: "Flame DMG %", shots: "Shots +", shots_pct: "Shots %", hitres: "Target hit reduction", critres: "Target crit-rate resist", armor_pct: "Target armor %", dodge_pct: "Target dodge %", dodge_add: "Target dodge +", critT: "Target crit DMG taken +", pwhit: "Target hit weighting +",
  br: "Ideal range (tiles)", brin: "Ideal range reaches closer by", brout: "Ideal range reaches farther by", brx: "Ideal range grows with attack range", brm: "Other hand's ideal range counts", rng: "Attack range +", mov: "Movement +", ammo: "Magazine +", apmax: "Max AP +", aim: "Aims the attack",
  gcrit: "Every shot crits", udg: "Your shots can't be dodged", hfloor: "Hit chance at least", ghc: "Guaranteed hits per round", hthr: "Sure-hit threshold",
  ign: "Ignores the target's damage reductions", defl: "A missed shot still deals", prate: "Flurry Strike chance +", crate: "Gusty Strike chance +", coll: "Collateral DMG on other parts +", colln: "Collateral DMG: parts +"
};
/* part-targeting effects (BufFuncType_WapPartDamageWeightAdjust): text per mode */
const PWMODE = {
  1: "Hit weighting of the lowest-HP part +", 2: "Hit weighting of the highest-HP part +", 3: "Hit weighting +", 4: "Shots always hit", 5: "Shots always hit the body",
  6: "Shots always hit the lowest-HP part", 7: "Shots always hit the highest-HP part", 8: "Shots always hit the lowest HP % part", 9: "Shots always hit the highest HP % part",
  10: "Shots always hit an arm", 11: "Shots always hit a damaged part", 12: "Shots always hit an arm carrying a weapon"
};
const wtNames = m => Object.entries(D.wtBits || {}).filter(([, b]) => m & b).map(([k]) => TYPE_NAMES[k] || k).join(" / ");
const TYPE_NAMES = {
  Knuckle: "Knuckles", Rod: "Polearm", PileBunker: "Pile Bunker", Buckler: "Small Shield", MachineGun: "Machine Gun", HeavyMachineGun: "Heavy Machine Gun",
  ShotGun: "Shotgun", LightSniper: "Light Rifle", HeavySniper: "Sniper Rifle", Missile: "Missile Launcher", Rocket: "Rocket Launcher", Shield: "Large Shield",
  RailGun: "Rail Gun", Flamethrower: "Flamethrower", Saw: "Chainsaw", Blade: "Alter-Blade", Funnel: "Cutter"
};
const pwText = e => e.m <= 3 ? `${PWMODE[e.m]}${e.m === 3 && e.pt ? " (" + e.pt.toLowerCase() + ")" : ""} ${fmt(e.v)}` : e.m === 4 ? (e.pt ? `Shots always hit the ${e.pt.toLowerCase()}` : "Shots always hit a damaged part") : PWMODE[e.m];
const PCT = new Set(["hthr", "fixB", "splash", "prate", "crate", "coll", "shots_pct", "hitres", "critres", "attr_pct", "atk_pct", "fp_pct", "whit_pct", "ahit_pct", "hit_cat_pct", "dodge_rate", "hitrate", "crit_rate", "crit_mul", "crit_app_pct", "crit_dmg", "dmgB", "finalB", "armor_pct", "npcB", "dodge_pct", "critT"]);
const atanN = x => Math.atan(x) / (Math.PI / 2);
const fmt = (x, d = 0) => Number.isFinite(x) ? x.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) : "–";
const pct = (x, d = 1) => Number.isFinite(x) ? (x * 100).toFixed(d) + "%" : "–";
const sgn = (v, f) => PCT.has(f) || /^wtmulti:/.test(f || "") ? (v >= 0 ? "+" : "") + +(v * 100).toFixed(1) + "%" : (v >= 0 ? "+" : "") + fmt(v, Math.abs(v) < 10 && v % 1 ? 2 : 0);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const opt = (v, label, sel, icon) => `<option value="${esc(v)}"${sel ? " selected" : ""}${icon ? ` data-icon="${esc(icon)}"` : ""}>${esc(label)}</option>`;
/* dropdown icons from bench-icons.js (built by data/dmgcalc/build-icons.py): a path on the assets site or a full URL */
const ICONS = window.BenchIcons || {}, ASSET_BASE = "https://assets.mecharashi-wiki.cc/";
const icon = (kind, k) => { const p = ICONS[kind] && ICONS[kind][k]; return p ? (/^https?:/.test(p) ? p : ASSET_BASE + p) : ""; };
const byName = (o, f = x => x.n) => Object.keys(o).sort((a, b) => String(f(o[a])).localeCompare(String(f(o[b]))));
const pilotIds = byName(D.pilots, p => p.name);
/* the bench lists SSR STs, SSR / SSSR weapons (game ID tier 4 = the "- B" weapons, 5-6 = SSSR) and SSR accessories;
   an item a loaded setup already has stays listed */
const stIds = byName(D.sts).filter(k => D.sts[k].q === "SSR");
const wTier = k => String(k).length === 8 ? +String(k)[4] : 0;
const wOk = k => wTier(k) >= 4;
const withCur = (L, cur) => !cur || L.includes(cur) ? L : [cur, ...L];
const shownAttr = a => D.shown[a] || a;
const catLabel = c => ({ Melee: "Melee", Assault: "Assault", Sniper: "Ranged", Heavy: "Tactical" }[c] || c);
const SEC_N = { "α": "a", "β": "b", "γ1": "y1", "γ2": "y2" };      // chip sectors as the game writes them (Neural Drive - y1); the data and saved loadouts keep the Greek keys
const secName = sec => "Neural Drive - " + (SEC_N[sec] || sec);

/* ------------------------------------------------------------------ state */
const T = {
  target: Math.max(0, D.targets.findIndex(t => t.content === "Live Ammunition Training")), part: "Left arm", mode: "scatter", hp: 100, conf: 90,
  tfx: {}, dead: new Set(), shOff: {}
};   // dead: limbs already destroyed (target panel, fight start none); shOff: {target: true} shield not working
// tfx: the boss's damage-taken effects you switched: {target index: {buff id: {on, lvl}, "stk:" + buff id: {lvl} (armor stacks)}}
const S = { A: null, B: null };
/* the wiki link: only when the bench runs in the one-file wiki's Damage Bench tab (the wiki names that frame), so the stand-alone page
   shows no wiki buttons. Messages {src, type, ...} go both ways between the bench and the wiki */
const WIKI = window.parent !== window && window.name === "mecharashi-wiki-bench" ? window.parent : null;
const toWiki = (type, x) => { if (WIKI) WIKI.postMessage({ src: "mecharashi-bench", type, ...x }, "*"); };     // "*": file:// pages post as origin "null"

function blankSide(pilot) {
  const P = D.pilots[pilot] || D.pilots[pilotIds[0]];
  const dcls = (P.stars[0] && P.stars[0].drive) || "Medium";
  const st = stIds.find(k => D.sts[k].cls === dcls) || stIds[0];
  const s = {
    pilot, star: 0, screen: {}, chips: {}, skills: [null, null, null], ex: null, pf: [null, null, null], stf: [null, null, null], wf: [null, null, null],
    sect: { "γ1": [false, false, false, false, false], "γ2": [false, false, false, false, false] }, st, pst: {}, grades: {}, mods: {}, back: null,
    w: {}, atk: { slot: "RH", skill: "normal" }, tog: {}, extra: { dmgB: 0, finalB: 0, hitrate: 0, crit_rate: 0, crit_fin: 0, shred: 0, attr: 0 }, grU: {}, mdU: {}
  };
  PARTS.forEach(p => { s.grades[p] = D.sts[st].parts[p].grades.length - 1; s.mods[p] = null; });
  s.lv = Object.fromEntries(PARTS.map(p => [p, 70]));
  const wid = Object.keys(D.weapons).find(k => D.weapons[k].slot === "Hand" && D.weapons[k].cat === "Assault" && D.weapons[k].cls.includes(dcls) && wOk(k));
  if (wid) s.w.RH = newWeapon(wid);
  return s;
}
function newWeapon(id) {
  const W = D.weapons[id];
  return { id, impr: true, atk: W.adv[1] || 0, opts: [null, null], drop: null, comps: [] };
}
function fromUnit(u) {
  const s = blankSide(u.pilot);
  Object.assign(s, {
    star: u.star, screen: { ...u.screen }, chips: { ...u.chips }, skills: u.skills.slice(0, 3), ex: u.ex, pf: u.pf.slice(), stf: u.stf.slice(), wf: u.wf.slice(),
    sect: JSON.parse(JSON.stringify(u.sect)), secOff: (u.secOff || []).slice(), st: D.sts[u.st] ? u.st : s.st, grades: { ...u.grades }, mods: {}, back: u.back ? "bp:" + u.back : null, w: {}
  });
  s.pst = {}; for (const p of PARTS) if (u.pst && u.pst[p] && u.pst[p] !== s.st && D.sts[u.pst[p]]) s.pst[p] = u.pst[p];
  s.lv = Object.fromEntries(PARTS.map(p => [p, partLv({ lv: u.lv }, p)]));            // the save's part levels
  if (u.st && !D.sts[u.st]) s.stMissing = u.st;                                      // the save's ST isn't in the data: say so on the card
  if (u.base && u.plvl < 70) Object.assign(s, { base: { ...u.base }, baseStar: u.star, plvl: u.plvl });   // a pilot below Lv70: its base attributes
  for (const p of PARTS) { s.mods[p] = u.mods[p]; const pr = stOf(s).parts[p]; if (!pr.grades[s.grades[p]]) s.grades[p] = pr.grades.length - 1; }
  s.grU = {}; s.mdU = {};          // no part counts as set by you after a load: the body's next pick updates every part
  for (const [slot, w] of Object.entries(u.w)) {
    if (!D.weapons[w.id]) continue;
    s.w[slot] = {
      id: w.id, impr: w.impr, atk: w.atk, opts: [w.opts[0] || null, w.opts[1] || null].map(o => o && D.fx[o.fx] ? { fx: o.fx, v: o.v } : null),
      drop: w.drop, comps: w.comps.map(c => ({ id: c.id, mode: "off" }))
    };
  }
  if (u.w.BK && D.weapons[u.w.BK.id]) s.back = "w";
  s.atk = { slot: s.w.RH ? "RH" : Object.keys(s.w)[0] || "RH", skill: "normal" };
  for (const w of Object.values(s.w)) for (const c of w.comps) if (D.components[c.id] && D.components[c.id].k === "RA") c.mode = "chance";
  s.name = D.pilots[u.pilot].name + " (" + u.from + (u.plvl && u.plvl < 70 ? ", pilot Lv" + u.plvl : "") + ")";
  // items the bench's lists don't hold (lower-tier accessories, backpacks or modules) are left out; weapons already are, above
  for (const w of Object.values(s.w)) w.comps = w.comps.filter(c => D.components[c.id]);
  if (s.back && s.back.startsWith("bp:") && !D.backs[s.back.slice(3)]) s.back = null;
  for (const p of PARTS) if (s.mods[p] != null && !moduleOf(s.mods[p])) s.mods[p] = null;
  return s;
}

/* ------------------------------------------------------------------ rules */
const stClass = s => D.sts[s.st].cls;
/* backpacks for this class: one entry per name + rarity tier (R / SR / SSR… have different strengths), lowest tier first;
   copies of a tier with no effects (trial / enemy versions) are left out unless it is the one equipped */
const RAR = ["C", "R", "SR", "SSR", "SSSR"];
function backList(cls, cur) {
  const keep = {};
  for (const k of Object.keys(D.backs)) {
    const B = D.backs[k]; if (!backFits(B, cls) || RAR.indexOf(B.q) < RAR.indexOf("SR")) continue;   // SR (purple) and up
    const key = B.n + "|" + B.q + "|" + B.fx.join(","), prev = keep[key];        // same name, tier and effects = one entry
    if (!prev) keep[key] = k;
  }
  // a tier that has a version with effects drops its no-effect copies
  const out = Object.entries(keep).filter(([key, k]) => D.backs[k].fx.length || !Object.keys(keep).some(o => o !== key && o.startsWith(key.slice(0, key.lastIndexOf("|") + 1)) && D.backs[keep[o]].fx.length)).map(([, k]) => k);
  const c = cur && cur.startsWith("bp:") ? cur.slice(3) : null;
  if (c && D.backs[c] && !out.includes(c)) out.push(c);
  return out.sort((a, b) => D.backs[a].n.localeCompare(D.backs[b].n) || RAR.indexOf(D.backs[a].q) - RAR.indexOf(D.backs[b].q));
}
/* "Backpack: Name (tier)", plus its effects when another listed backpack has the same name and tier (Mini Radar SSR: DMG or hit) */
function backLabel(k, list) {
  const B = D.backs[k], twin = list.some(j => j !== k && D.backs[j].n === B.n && D.backs[j].q === B.q);
  const fx = B.fx.map(fxText).filter(Boolean).join(" · ").replace(/ \+ \+/g, " +");
  return `Backpack: ${B.n} (${B.q})` + (twin ? " — " + (fx.length > 60 ? fx.slice(0, 57) + "…" : fx || "no damage effects") : "");
}
const backFits = (B, cls) => !!B && B.cls.some(c => c === "All" || c.includes(cls));     // "All" = every ST class
/* the ST as assembled: each part from its own ST (mixed sets), the body's ST otherwise */
const partST = (s, p) => (s.pst && s.pst[p] && D.sts[s.pst[p]] && D.sts[s.pst[p]].cls === D.sts[s.st].cls) ? s.pst[p] : s.st;
const isMixed = s => PARTS.some(p => partST(s, p) !== s.st);
function stOf(s) {
  const B = D.sts[s.st];
  if (!isMixed(s)) return B;
  return { n: B.n, cls: B.cls, mixed: true, parts: Object.fromEntries(PARTS.map(p => [p, D.sts[partST(s, p)].parts[p]])) };
}
/* a part's level (1-70) and its FP / hit there: the grades hold the Lv70 values, the level curve scales them */
const baseOf = (s, star) => s.base && s.baseStar === s.star ? s.base : star.base;   // the save's base attributes for a pilot below Lv70
function partLv(s, p) { const v = Math.round(+((s.lv || {})[p])); return v >= 1 && v <= 70 ? v : 70; }
function lvF(pr, k, L) { const c = pr && pr[k] && (D.curves || {})[pr[k]]; return c && c[69] ? c[L - 1] / c[69] : 1; }
const partFpAt = (s, st, p) => st.parts[p].grades[s.grades[p]].fp * lvF(st.parts[p], "cf", partLv(s, p));
const partHitAt = (s, st, p) => st.parts[p].grades[s.grades[p]].hit * lvF(st.parts[p], "ch", partLv(s, p));
function fixedWeapons(s) {
  const out = {};
  for (const [part, slot] of [["Left arm", "LS"], ["Right arm", "RS"]]) {
    const pr = stOf(s).parts[part];
    if (!pr.fixed) continue;
    const g = pr.grades[s.grades[part]].g;
    out[slot] = pr.fixed[g.startsWith("SS") ? "SS" : "S"] || Object.values(pr.fixed)[0];
  }
  return out;
}
function slotOptions(s, slot) {
  const cls = stClass(s);
  return Object.keys(D.weapons).filter(k => {
    const W = D.weapons[k];
    if (W.type === "FixedArms") return false;          // built into the ST's arms
    if (!wOk(k) && !(s.w[slot] && s.w[slot].id === k)) return false;
    if (!W.cls.includes(cls)) return false;
    if (slot === "RH" || slot === "LH") return W.slot === "Hand" || (W.slot === "DoubleHand" && slot === "RH");
    if (slot === "RS" || slot === "LS") return W.slot === "Shoulder" && cls === "Medium";
    if (slot === "BK") return W.slot === "Back" && (W.type === "RailGun" || W.type === "Funnel" || W.type === "Missile");
    return false;
  }).sort((a, b) => (D.weapons[a].tn + D.weapons[a].n).localeCompare(D.weapons[b].tn + D.weapons[b].n));
}
function equipped(s) {             // slot -> weapon state, with fixed weapons and blocked slots resolved
  const fixed = fixedWeapons(s), out = {};
  for (const [slot] of SLOTS) {
    if (fixed[slot]) { out[slot] = { id: fixed[slot], impr: false, atk: 0, opts: [null, null], drop: null, comps: [], fixed: true }; continue; }
    if (slot === "LH" && s.w.RH && D.weapons[s.w.RH.id].slot === "DoubleHand") continue;
    if ((slot === "RS" || slot === "LS") && (stClass(s) !== "Medium" || Object.keys(fixed).length)) continue;
    if (slot === "BK" && s.back !== "w") continue;
    if (s.w[slot] && D.weapons[s.w[slot].id]) out[slot] = s.w[slot];
  }
  return out;
}

/* an Advanced option's value held to its range (the type's option pool: lo-hi, the values the game rolls); an option with no
   pool entry (your unit's own, '(yours)') keeps its value; empty / not a number: none (the effect's own value) */
const optPool = (W, fx) => (W && D.adv && D.adv[W.type] && (D.adv[W.type].opts || []).find(x => x.fx === fx)) || null;
const optV = (W, fx, v) => { if (v == null || v === "" || !Number.isFinite(+v)) return null; const po = optPool(W, fx); return po ? clampN(+v, po.lo, po.hi) : +v; };
/* ------------------------------------------------------------------ effects */
/* an effect's value in this setup: the rolled value for a refit option, scaled by the stacks set for its row */
function effVal(s, src, e, show) {
  let v = src.vset != null && e.hi != null ? src.vset : e.v;
  // a stacking buff counts at its one level for the setup (0 = not up: such an effect doesn't count at all); shown per stack at 0
  if (e.stk) { const n = stkOf(s, src, e); v *= 1 + (e.lpm || 1) * ((show ? Math.max(1, n) : n) - 1); }
  // a level set from your HP lost (Heroism: 1 per 10% lost, ModifyBufLevelByHpLoss): that many levels, read from your HP during
  // the attack, the one the held level and the conditions read (after the skill's own HP cost: a Twin-Blade Saw cast takes its 20%
  // before ModifyBufLevelByHpLoss 1016043 fires, then the shots)
  if (e.hpl) {
    const c = (e.c || []).find(x => x.t === "hpl"), n = c ? hplLvl(c, { ohp: ohpAt(s) }) : 1;
    v *= 1 + (e.lpm || 1) * (Math.max(1, n) - 1);
  }
  return v;
}
// your HP % before the attack (Situation: Your HP %, all four parts; 100 when empty), and during it: after the attacking skill's own HP cost
// (Twin-Blade Saw: 20 points), what compute() worked out for this setup (LVS); every reader of your HP in one attack takes the second
const ohpIn = s => s && s.extra && s.extra.ohp != null && s.extra.ohp !== "" ? Math.max(0, Math.min(100, +s.extra.ohp)) : 100;
const ohpAt = s => { const L = LVS.get(s); return L && L.ohp != null ? L.ohp : ohpIn(s); };
/* each game quantity has ONE input: a stacking buff has ONE level for the setup, typed in ONE place,
   Situation > Your buffs / Your debuffs on the target. Every row that shows the buff (read-only 'Vigor x8 (set under Situation)'), the skill
   version it casts (Spirit Strike - EX at Vigor >= 8), every 'level >= N' check and every value-per-level read use it. 0 = not up.
   Its key: the buff, or the lowest level of its family (Poised I / II / III share one level: GroupId), 'euph' for Euphoria (stored in
   s.sit.st.euph), and 't:' in front for one your kit puts on the target (Shawnee's Ballistics Bonus, Instability, the Split modules).
   Empty = this setup's start (lvPass): 1 (or what the kit gives by your first action) when a row that is on gives it, else 0 */
let LVFAM = null, LVFAMN = null, LVFAMCAP = null;
function lvFam() {
  if (LVFAM) return LVFAM;
  const lo = new Map(), st = Object.values(D.fx).flat().filter(e => (e.stk || 0) > 1 && e.b != null && e.grp != null), nm = new Map();
  LVFAM = new Map(); LVFAMN = new Map(); LVFAMCAP = new Map();
  for (const e of st) { const x = lo.get(e.grp); if (!x || (e.lig || 0) < x.lig || ((e.lig || 0) === x.lig && e.b < x.b)) lo.set(e.grp, { b: e.b, lig: e.lig || 0 }); }
  for (const e of st) {
    const b0 = lo.get(e.grp).b; LVFAM.set(e.b, b0); LVFAMCAP.set(b0, Math.max(LVFAMCAP.get(b0) || 0, e.stk));   // the family's highest cap
    (nm.get(e.grp) || nm.set(e.grp, new Set()).get(e.grp)).add(String(e.n || ""));
  }
  // the family's one name when its levels are named I / II / III (Poised, Instability): the level that applies can change, the input doesn't
  for (const [g, N] of nm) { const base = new Set([...N].map(n => n.replace(/\s+(I|II|III|IV|V|VI)$/, ""))); if (N.size > 1 && base.size === 1) LVFAMN.set(lo.get(g).b, [...base][0]); }
  return LVFAM;
}
const famName = k => { lvFam(); return LVFAMN.get(+String(k).replace(/^t:/, "")) || null; };
const famCap = k => { lvFam(); return LVFAMCAP.get(+String(k).replace(/^t:/, "")) || 0; };
const famOf = b => EUPH().has(b) ? "euph" : lvFam().get(b) || b;
const lvK = (b, tgt) => (tgt ? "t:" : "") + famOf(b);                // the level key of a buff on its holder
/* Instability on the target, the one buff family with the Unbalanced category (I / II / III, GroupId 100450): ONE count per setup,
   Situation > 'Instability stacks on the target', yours and other units' (the target holds one Instability level). Its rows, the Unbalanced
   and Weak counts and every 'Target carries N Unbalanced' check read it. UNB = {k: its level key, b: its lowest level} */
// does effect e read the target's Unbalanced count ('Target carries N Unbalanced buffs': Seize Advantage, Eradication)?
function readsUnb(e) {
  let held = e.tgt ? "target" : "you", hit = false;
  const walk = c => {
    const hh = held; if (c.h) held = c.h;
    if (c.t === "bcat" && (D.bset[String(c.set)] || []).includes("Unbalanced")) {
      const side = held === "target" ? (c.w === 0 ? "target" : c.w === 2 ? "you" : null) : (c.w === 0 ? "you" : c.w === 1 ? "target" : null);
      if (side === "target") hit = true;
    }
    (c.items || []).forEach(walk); held = hh;
  };
  (e.c || []).forEach(walk);
  return hit;
}
let UNB = undefined;
function unbFam() {
  if (UNB !== undefined) return UNB;
  const bs = Object.entries(D.bcat || {}).filter(([, v]) => ((v || [])[0] || []).includes("Unbalanced")).map(([b]) => +b);
  const ks = [...new Set(bs.map(b => famOf(b)))];
  if (ks.length !== 1) return UNB = null;
  // its hit cut per stack (hit resist on the target; −4% at every level), from its lowest level's own effect
  const e = Object.values(D.fx).flat().find(e => e.b === +ks[0] && e.tgt && e.f === "hitres");
  return UNB = { k: "t:" + ks[0], b: +ks[0], per: e ? e.v || 0 : 0 };
}
const isLv = e => (e.stk || 0) > 1 && e.b != null;                     // a stacking buff: its level says whether it is up
const lvKE = e => lvK(e.b, e.tgt);
const isAfterC = c => c.t === "after" || c.ct === "AfterThisSkill";      // 'gained after ...: tick if it's already up'
// a row named in a note: without its kind ("Talent: ", "Skill: ") and, for a granted Code skill, without its effect and grant
// ("Skill: Directional Rack (Positional Advantage I), granted by Experimental Observation" -> "Directional Rack")
const rowShort = l => String(l).replace(/^[^:]+: /, "").replace(/( \([^()]*\))?, granted by .*$/, "");
// what you typed under Situation (null = empty); lvRaw also reads a level compute() fixed for its second pass (s._lvPin, on a copy only)
function lvTyped(s, k) {
  const u = (s && s.sit) || {}, v = k === "euph" ? (u.st || {}).euph : (u.mode || {})[k];
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  return Number.isFinite(+v) ? Math.round(+v) : null;
}
const lvRaw = (s, k) => s && s._lvPin && s._lvPin[k] !== undefined ? s._lvPin[k] : lvTyped(s, k);
const LVS = new WeakMap();      // setup -> its levels from compute(): {start, max (the kit's cap raise), def, min, cap, keys, give, inp, own}
// the level of key k: typed (held to its floor and cap), else the setup's start
function lvOf(s, k) {
  const L = LVS.get(s), r = lvRaw(s, k);
  if (r != null) return L && L.cap.has(k) ? clampN(r, L.min.get(k) || 0, L.cap.get(k)) : Math.max(0, r);
  return L && L.def.has(k) ? L.def.get(k) : 0;
}
const stkOf = (s, src, e) => { const L = LVS.get(s); return clampN(lvOf(s, lvKE(e)), 0, e.stk + ((L && L.max.get(e.b)) || 0)); };
/* the level a check or a skill version reads: a buff a row of this setup gives that has no input of its own follows that row
   (Improved Fire II -> Skill: Special Load's tick, Directional Rack -> Skill: Directional Rack's, Awakening's child -> Valkyrie's own check);
   else its one level (typed, else the start); a level input that isn't a stacking buff (Awakening, Valhalla's Call, Take This!): what the
   kit gives by your first action, else 1 when the kit holds it, else 0; undefined: none of these (the usual chain decides) */
function lvVal(s, k, b) {
  const L = LVS.get(s);
  if (L && !L.def.has(k) && L.give && (L.give.get(b) === 0 || L.give.get(b) === 1)) return L.give.get(b);
  const r = lvRaw(s, k);
  if (r != null) return L && L.cap.has(k) ? clampN(r, L.min.get(k) || 0, L.cap.get(k)) : Math.max(0, r);
  if (!L) return undefined;
  if (L.def.has(k)) return L.def.get(k);
  if (L.inp && L.inp.has(k)) return k === "euph" ? 0 : L.start.has(b) ? L.start.get(b) : L.own && L.own.has(b) ? 1 : 0;   // Euphoria: 0 at the start of the fight
  return undefined;
}
/* a row's effects in this attack (as compute() lists them); a row whose effects (notes aside, follow-ups included) are all stacking buffs
   is 'level-only': no tick, it is on while one of them is up (its level 1 or more) */
function lvEffs(src, W) {
  const out = [];
  for (const k of [].concat(src.fx || [])) for (const e of D.fx[k] || []) {
    if (W && ((e.wt && e.wt !== W.type) || (e.wc && e.wc !== W.cat))) continue;
    if (src.only && (src.only === "after") !== isAfter(e)) continue;
    if (src.afterN != null && !(isAfterCast(e) && (e.n || "") === src.afterN)) continue;
    if (castSkip(src, e) || isNoteE(e)) continue;
    out.push(e);
  }
  return out;
}
// (not a Code row whose cast puts you in a mode a check or skill version of this setup reads, src.sbRd: Paloma's Rapid Realignment ->
// Directional Rack; its tick says you cast it before this attack. Not a row whose stacking buff has a condition the bench can't check,
// L.askSrc from lvPass: Frida's 'Coercion: Instability III (from an earlier use)' asks whether that use was Take This!)
const lvOnlySrc = (src, W) => { if (src.kind === "ra" || src.sbRd) return false; const L = lvEffs(src, W); return L.length > 0 && L.every(isLv); };
const lvRowOn = (s, src, W) => {
  const L = LVS.get(s);
  return lvOnlySrc(src, W) && !(L && L.askSrc && L.askSrc.has(src.key)) ? lvEffs(src, W).some(e => lvOf(s, lvKE(e)) >= 1) : null;
};
/* the buffs only one pilot's kit gives (skills, talents, Neural Drive levels, Code skills): a check on such a buff with no input of its own
   follows the row of this setup that gives it */
let KIT_OWN = null;
function kitOnly(b, pid) {
  if (!KIT_OWN) {
    KIT_OWN = new Map(); const put = (x, who) => (KIT_OWN.get(x) || KIT_OWN.set(x, new Set()).get(x)).add(who);
    const putFx = (fx, who) => { for (const f of [].concat(fx || [])) for (const e of D.fx[f] || []) for (const x of e.ids || []) put(x, who); };
    const putSk = (k, who) => { const sk = D.skills[k]; if (!sk) return; putFx(sk.fx, who); for (const x of [...(sk.gb || []), ...(sk.sb || [])]) put(x, who); };
    for (const [id, P] of Object.entries(D.pilots)) for (const k of [...(P.auto || []), ...(P.skills || []), ...P.stars.map(x => x.talent).filter(Boolean),
    ...Object.values(P.sectors || {}).flat(), ...(P.codes || []).map(g => g.k)]) putSk(k, String(id));
    for (const k of D.ex || []) putSk(k, "x");
    for (const W of Object.values(D.weapons)) { putFx(W.fx, "x"); putFx(W.gfx, "x"); for (const d of W.drops || []) putFx(d.fx, "x"); }
    for (const X of [...Object.values(D.components), ...Object.values(D.features), ...Object.values(D.backs)]) putFx(X.fx, "x");
    for (const M of Object.values(D.modules)) for (const L of M.levels || []) { putFx(L.fx, "x"); for (const x of L.gb || []) put(x, "x"); }
  }
  const o = KIT_OWN.get(b); return !!o && o.size === 1 && o.has(String(pid));
}
const SLOT5 = ["LH", "RH", "LS", "RS", "BK"];
// a backpack effect's 'in range of both your hand weapon and your backpack weapon' can hold only with both kinds carried
const bkBoth = ctx => { const w = ctx.wts || {}; return ctx.slot === "BK" ? !!(w.LH || w.RH) : !!w.BK; };
function condState(c, ctx, W) {
  const S = ctx.sit, held = c.h || ctx.held;
  switch (c.t) {
    case "tsize": return ctx.tcls === c.v;
    case "osize": return (held === "target" ? ctx.tcls : ctx.ocls) === c.v;           // the holder's ST class
    case "hpl": return hplLvl(c, ctx) >= 1;               // a level from your HP lost (Heroism): held from 1 level
    case "thp": case "ohp": {
      const hp = c.t === "thp" || held === "target" ? tWhole() : ctx.ohp == null ? 100 : ctx.ohp;      // own HP: the Own HP % box (whole unit)
      return { ">=": hp >= c.v, ">": hp > c.v, "<=": hp <= c.v, "<": hp < c.v, "=": hp === c.v }[c.op];
    }
    case "wtype": return !!((c.v || 0) & (D.wtBits[W.type] || 0));
    // EquipmentType (ActorBufActiveCondEquipmentType.Check): the holder carries a weapon of the type, whichever weapon attacks
    case "hasw": return held === "target" ? !!(tgGear(T.target) & (c.v || 0)) : Object.values(ctx.wts || {}).some(x => x && ((D.wtBits[x] || 0) & (c.v || 0)));
    case "parts_ss": return true;
    case "pclass": return ctx.pclass === c.v;
    case "flame": return c.who === "target" ? !!ctx.burnT : !!ctx.burnSelf;
    case "sgroup": return ctx.sg == null ? null : !!(ctx.sg & c.v);       // the attacking skill's group (Normal Attack 1, ActiveAttack 2, Gusty Strike (extra attack) 256)
    case "buf": {                                      // held from the start by one of the setup's skills / nodes / talent (level 1), else ask
      // what the main skill spent (Fury) is off for its follow-ups: they read the level left, held - spent (s._spent); the
      // attack's own rounds read the level held (the game takes the cost off at the skill's tail)
      const spent = (ctx.s && ctx.s._spent && ctx.s._spent[c.v]) || 0;
      // the buff's one level (Situation > Your buffs: Vigor, Awakening, Valhalla's Call, Fury ...; Euphoria: start 0), or the row of
      // this setup that gives it (Special Load -> Improved Fire II): decided, no tick
      {
        const k = lvK(c.v, c.h === "target"), L = ctx.s ? LVS.get(ctx.s) : null; let v = ctx.s ? lvVal(ctx.s, k, c.v) : undefined;
        if (v === undefined && k === "euph") v = 0;
        if (v !== undefined) return CMP[c.op](Math.max(0, (L && L.cap.has(k) ? v : Math.min(v, lvMax(ctx, c.v, c.max || 1))) - spent), c.n);
      }   // up to its cap
      // the levels your kit gives it by your first action (White Stork's Reinforced Ammo, Helmsman's Intel II): the same default as the
      // value-per-level effects read
      if (ctx.lvStart && ctx.lvStart.has(c.v)) return CMP[c.op](Math.max(0, Math.min(ctx.lvStart.get(c.v), lvMax(ctx, c.v, c.max || 1)) - spent), c.n);
      if (spent) return CMP[c.op](0, c.n);                // (spent, with no level known: gone for the follow-ups)
      if (!ctx.own || !ctx.own.has(c.v)) {                // not held from the start: "level 0" checks pass, others may still come mid-fight
        const ok0 = { ">=": 0 >= c.n, ">": 0 > c.n, "<=": 0 <= c.n, "<": 0 < c.n, "=": 0 === c.n }[c.op];
        return ok0 ? true : kitBufs().has(c.v) ? false : null;
      }        // a pilot-kit buff this setup doesn't have stays at level 0
      const lv = 1, ok = { ">=": lv >= c.n, ">": lv > c.n, "<=": lv <= c.n, "<": lv < c.n, "=": lv === c.n }[c.op];
      return ok ? true : c.n <= 1 ? false : null;
    }               // held at level 1: "< 1" / "≤ 0" fail; higher levels may stack up mid-fight
    case "any": { const r = c.items.map(x => condState(x, ctx, W)); return r.some(x => x === true) ? true : r.every(x => x === false) ? false : null; }
    // the conditions of a buff that fired when the attack started (Mega Form's 'two-handed skill'): decided once, on the main
    // attack; every later round of the same attack (second hand, slots, lock-ons, Peripheral Vision, Gusty / Flurry Strike, after-combat
    // strikes) has what it attached then. A trigger that fires again at each new single skill (SingleSkillStart4Attacker) can still attach
    // it at a Gusty / Flurry Strike when the main attack didn't
    case "castc": {
      const M = ctx.s && ctx.s._castMain, MA = ctx.s && ctx.s._castAfter;
      if (M && M[c.k] !== undefined && !(c.re && ctx.s._xatk && M[c.k] !== true)) return M[c.k];
      if (MA && MA[c.k] === true && c.life) return true;            // an after-combat strike: still up from the main attack (1+ turns)
      const r = c.items.map(x => condState(x, ctx, W)), v = r.includes(false) ? false : r.includes(null) ? null : true;
      if (!M && ctx.castRes) ctx.castRes[c.k] = v;
      return v;
    }
    case "tphp": case "bphp": case "parts": return partCond(c, null, H_START());   // the target's parts, at the target HP slider
    case "apcost": return ctx.ap == null ? null : CMP[c.op || ">="](ctx.ap, c.v);   // the attacking skill's AP cost
    // in range of both: needs both weapon kinds carried; then the Situation tick 'The target is in range of both ...' (ticked unless you
    // untick it: the bench doesn't check the backpack weapon's range)
    case "bkrange": return !bkBoth(ctx) ? false : S ? S.bkr : true;
    case "stage": return !!((ctx.stage || 0) & c.v);                       // the bench's attack is a First attack (Gusty Strike: Combo)
    case "samewt": {
      const SL = ["LH", "RH", "LS", "RS", "BK"], x = (ctx.wts || {})[SL[c.a]], y = (ctx.wts || {})[SL[c.b]];
      return !x || !y ? false : (x === y) === !!c.same;
    }
    case "hitmm": return null;                                              // depends on the part hit: checked per shot (partCond)
    // ---- Situation: the setup, the attack and your inputs; S = null while the bounds are worked out (limitSums)
    case "never": return false;
    case "slotwt": {
      if (held === "target") return null;           // the boss's own loadout isn't known
      const ts = c.s === 12 ? Object.values(ctx.wts || {}) : [(ctx.wts || {})[SLOT5[c.s]]];
      return ts.some(x => x && ((D.wtBits[x] || 0) & c.m));
    }
    case "samecat": {
      if (held === "target") return null; const a = (ctx.wid || {})[SLOT5[c.a]], b = (ctx.wid || {})[SLOT5[c.b]];
      if (!a || !b || !D.weapons[a] || !D.weapons[b]) return false; return c.same ? D.weapons[a].cat === D.weapons[b].cat : D.weapons[a].cat !== D.weapons[b].cat;
    }
    case "wcount": {
      if (held === "target") return null; let n = 0, two = false;
      for (const sl of ["LH", "RH"]) { const id = (ctx.wid || {})[sl]; if (!id || !D.weapons[id]) continue; if (D.weapons[id].slot === "DoubleHand") two = true; else n++; }
      return CMP[c.op](n + (two ? 1 : 0), c.n);
    }
    case "tacn": return new Set(Object.values(ctx.wts || {}).filter(x => ["Missile", "Rocket", "RailGun", "Funnel"].includes(x))).size === c.n;
    case "incd": {
      const sl = SLOT5[c.s]; if (!(ctx.wid || {})[sl]) return false; if (sl === ctx.slot) return !c.cd;   // the attacking weapon isn't reloading
      if (!S) return null; return c.cd ? S.st.reload : !S.st.reload;
    }
    case "zone": {
      if (String(ctx.pid) !== String(c.p)) return CMP[c.op](0, c.n);
      let k = 0; for (let i = 0; i < 6; i++) if (((D.pilots[ctx.pid].sectors || {})[c.sec] || [])[i] && secOn(ctx.s, c.sec, i)) k++;
      return CMP[c.op](k, c.n);
    }
    case "bufsrc": return !c.sk || !!(ctx.A && ctx.A.id === c.sk);         // you applied it; and the attack is that skill
    case "srcatk": return !!c.v;
    case "owncast": return c.v ? held === "target" : held !== "target";
    case "owntgt": return c.v ? held !== "target" : held === "target";
    case "trg": { const tr = !ctx.A || ctx.A.trg !== 0; return c.v === 1 ? tr : c.v === 0 ? !tr : false; }
    case "aim": return !!ctx.aim;
    case "mancost": return S ? CMP[c.op](S.fury, c.n) : null;
    case "xact": return S ? S.reSame : null;
    case "atype": return (c.v === 1) !== !!c.inv;
    case "ttype": return ((D.targets[T.target].atype || 2) === c.v) !== !!c.not;
    case "bptype": { const k = ctx.s && ctx.s.back && ctx.s.back.startsWith("bp:") ? ctx.s.back.slice(3) : null; return !!(k && D.backs[k] && (D.backs[k].bt || []).includes(c.v)); }
    case "aclass": return ctx.ocls === c.v;
    case "summon": return c.v === 0;
    case "nolink": { if (!S) return null; const dis = !!(ctx.A && ((ctx.A.sf || 0) & 1)); return c.find ? !dis && S.link > 0 : dis || S.link === 0; }
    case "linkj": return S ? S.link > 0 : null;
    case "pushb": return (D.targets[T.target] || {}).nopush ? false : S ? !!(S.st && S.st.pushb) : null;     // High Pressure Vibration 4
    case "lasttgt": { if (!S) return null; const same = ctx.stage === 256 && !ctx.mainAoe ? true : S.last; return c.v ? same : !same; }
    // the one 'At ideal range' tick (Situation): worked out from the distance until you set it; every row reads it
    case "ideal": return S ? S.idealOn : null;
    case "dist": return S ? CMP[c.op](c.mode === 1 ? S.cheb : S.dist, c.v) : null;
    case "moved": return S ? CMP[c.op](S.moved, c.v) : null;
    case "still": return S ? (c.v ? S.moved > 0 : S.moved === 0) : null;
    case "thru": return S ? S.thru : null;
    case "diag": return S ? (c.v === 0 ? S.dir === "diag" : c.v === 1 ? S.dir !== "line" : S.dir === "line") : null;
    case "adist": return S ? (held === "target" ? CMP[c.op](S.distA, c.v) : false) : null;
    case "lindist": return S ? (held === "target" ? null : S.dir === "line" && CMP[c.op](S.distA, c.v)) : null;
    case "bdist": return S ? CMP[c.op](held === "target" ? (c.min ? S.dist : S.distA) : 0, c.v) : null;
    case "terr": {
      if (!S) return null; const tt = held === "target" ? S.tTgt : S.tYou, mine = held === "target" ? "enemy" : "you";
      if (tt.cat === "none") return false; return c.p === 0 ? true : c.p === 1 ? tt.side === mine : tt.side !== mine && tt.side !== "env";
    }
    case "terrs": {
      if (!S) return null; const unit = c.u ? "target" : held, tt = unit === "target" ? S.tTgt : S.tYou, side = unit === "target" ? "enemy" : "you";
      const match = tt.cat === c.cat && (c.side === 0 || (c.side === 1 ? tt.side === side : tt.side !== side && tt.side !== "env")) && (!c.mine || tt.mine);
      return c.on === 1 ? match : c.on === 0 ? !match : false;
    }
    case "nearE": {
      if (!S) return null;
      if (held === "target") return CMP[c.op](S.aTn(c.r) + (c.xsrc ? 0 : S.dist <= c.r ? 1 : 0), c.n);   // the target's enemies: your side
      return CMP[c.op](S.enemiesWithin("m", c.r), c.n);
    }
    case "nearA": {
      if (!S) return null; if (held === "target") return CMP[c.op](S.eTn("m", c.r), c.n);
      return CMP[c.op](c.r >= 99 ? S.alliesWithin("all", 99) : S.alliesWithin("m", c.r), c.n);
    }
    case "neart": {
      if (!S || held === "target") return null;
      const n = c.filt === 5 ? S.enemiesWithin(c.m, c.r) : c.filt === 2 ? S.alliesWithin(c.m, c.r) : c.filt === 10 ? S.st.crash : c.filt === 11 ? S.st.intim
        : 1 + S.enemiesWithin(c.m, c.r) + S.alliesWithin(c.m, c.r);
      return CMP[c.op](n, c.n);
    }
    case "tnear": return S ? (held === "target" ? null : CMP[c.op](S.eTn(c.m, c.r), c.n)) : null;
    case "aoe": return S ? (ctx.A && ctx.A.aoe ? CMP[c.op](S.area, c.n) : false) : null;
    case "stc": return S ? CMP[c.op](S.area, c.n) : null;
    case "named": return S ? CMP[c.op](S.st[c.k] ? 1 : 0, c.n) : null;
    case "ammo": {
      if (!S) return null; if (c.w === 3 && ctx.grp && ctx.grp !== "Attacking weapon") return c.v === -1;   // another weapon: taken as full
      return c.v === -1 ? S.ammoFull : S.ammoMax ? S.ammo === c.v : false;
    }
    case "reatk": return S ? (c.v === 1 ? S.reatk : !S.reatk) : null;
    case "camp": { const own = !ctx.counter, holderOwn = held === "target" ? !own : own; return c.same ? holderOwn : !holderOwn; }
    case "cancnt": {
      if (!S) return null; if ((c.p2 === 0) !== (held !== "target")) return false; if (!ctx.A || !ctx.A.cnt) return false;
      return c.can ? S.canCounter : !S.canCounter;
    }
    case "turn": return S ? CMP[c.op](S.turn, c.n) : null;
    case "hpcmp": return held === "target" ? CMP[c.op](tWhole(), tWhole()) : CMP[c.op](ctx.ohp, tWhole());
    case "remain": return c.mode === 0 && held !== "target" ? CMP[c.op](4, c.n) : partCond({ t: "parts", op: c.op, n: c.n }, null, H_START());
    case "xhp": return S ? (held === "target" ? null : c.v ? S.xhp : !S.xhp) : null;
    case "ophp": return c.v === 0 && c.op === "<=" ? false : CMP[c.op || ">="](ctx.ohp, c.v);   // your parts: the Own HP % box
    // ---- hit by hit: read shot by shot from the attack's own counters, never an input
    case "atkn": case "sshit": case "wshit": return true;
    // ---- the target's own state, set on the target panel: its weapons (default: what it starts with), a buff of its own (default: not held)
    case "bgear": return !!(tgGear(T.target) & c.v);
    case "tbuf": return !!tgBuf(T.target, c.v);
    default: return null;
  }
}
const tgGear = ti => { const u = (T.tfx || {})[ti] || {}; return u._gear != null ? u._gear : D.targets[ti].gear || 0; };
/* the weapon set the target carries now, from its one home, the target panel's weapon choice (Genovese: Machine Gun + Large
   Shield at the fight start, or his other set, two Alter-Blades: ReplaceBackupWapWeapon, tg.alt from the catalog's backup set). Its counter
   weapons (what 'Can the target retaliate? Work it out' reads) and the shield it carries follow it; the bench asks for neither separately */
const tgAlt = ti => { const tg = D.targets[ti], g = tgGear(ti); return tg && tg.alt && g !== (tg.gear || 0) && (g & (tg.alt.gear || 0)) ? tg.alt : null; };
const tgCtr = ti => { const a = tgAlt(ti); return a ? a.ctr || [] : D.targets[ti].ctr || []; };
const tgShield = ti => { const a = tgAlt(ti); return a ? a.shd || null : D.targets[ti].shd || null; };
const gearName = bits => { const t = typesOf(bits); return t + (/Blade$/.test(t) ? "s" : ""); };     // 'Alter-Blades' (the panel's words)
const tgBuf = (ti, b) => {
  const u = ((T.tfx || {})[ti] || {})["buf:" + b];      // unset = held from the start or not (tb0)
  return u && u.on !== undefined ? !!u.on : (D.targets[ti].tb0 || []).includes(b);
};
/* stacked armor buffs the target holds (tg.stk: Strengthened, Bloodline Barrier ...): your stack count, else the fight-start count.
   The built armor_multi (amul) and the shown armor hold the start count; another count adds v x (1 + lpm x (n - 1)) per level set
   (0 stacks: none), the same on every part. The count is fixed within one attack. */
const tgStk = (ti, x) => { const u = ((T.tfx || {})[ti] || {})["stk:" + x.b]; return u && u.lvl != null ? Math.max(0, Math.min(x.max, u.lvl)) : x.def; };
const stkVal = (x, n) => n <= 0 ? 0 : x.v * (1 + (x.lpm || 0) * (n - 1));
function applyStk(ti) {
  const tg = D.targets[ti]; if (!tg || !(tg.stk || []).length) return;
  if (!tg._a0) tg._a0 = { amul: tg.amul || 0, armor: { ...tg.armor } };
  const d = tg.stk.reduce((a, x) => a + stkVal(x, tgStk(ti, x)) - stkVal(x, x.def), 0);
  tg.amul = tg._a0.amul + d;
  for (const p of PARTS) tg.armor[p] = d ? tg._a0.armor[p] + (tg.armor_base ? tg.armor_base[p] : tg._a0.armor[p] / (1 + tg._a0.amul)) * d : tg._a0.armor[p];
}
/* the target's part state for part-HP conditions: frac(p) = HP / max HP, alive(p), abs(p) = HP (before the attack, for hitmm).
   H_START: every part at the target HP slider (the calculated numbers); the fight simulation builds one from its own HP. */
const LIMBS = ["Left arm", "Right arm", "Legs"];
// the limbs standing at the start of the attack: the fight simulation's (T._alive), else the target panel's 'already destroyed' ticks
const aliveStart = () => T._alive || (T.dead && T.dead.size ? new Set(LIMBS.filter(p => !T.dead.has(p))) : null);
const H_START = () => ({ s: T.hp / 100, max: D.targets[T.target].hp, alive: aliveStart() });      // s: every part at this fraction of max HP
const CMP = { ">=": (a, b) => a >= b, ">": (a, b) => a > b, "<=": (a, b) => a <= b, "<": (a, b) => a < b, "=": (a, b) => a === b };
/* a part-HP condition on a buff the target holds (WapPartHpPercent: part, operator, % of max HP; dest = also when destroyed),
   or "the hit part is the target's lowest / highest-HP part" (TargetHitWapPartHpMaxOrMin, absolute HP before the attack, ties count) */
// H: {s, max} for the static state, or {hp, max, alive, h0} from the fight simulation (hp now, h0 before the attack)
const hUp = (H, q) => H.s != null ? H.s > 0 && (!H.alive || q === "Body" || H.alive.has(q)) : q === "Body" ? H.hp.Body > 0 : H.alive.has(q);
const hAbs = (H, q) => H.s != null ? H.max[q] * H.s : H.h0[q];
function partOne(c, H, q) {
  const up = hUp(H, q);
  if (!up && !c.dest) return false;
  const pct = !up ? 0 : H.s != null ? H.s * 100 : Math.max(0, H.hp[q]) / H.max[q] * 100;
  return CMP[c.op || ">="](pct, c.v || 0);
}
function partCond(c, hit, H) {
  if (c.t === "hitmm") {
    if (!hit) return null;
    if (!hUp(H, hit)) return false;
    const h = hAbs(H, hit);
    for (const q of PARTS) if (hUp(H, q) && (c.max ? hAbs(H, q) > h + 1e-6 : hAbs(H, q) < h - 1e-6)) return false;
    return true;
  }
  if (c.t === "parts") {
    const up = c.start && H.h0 ? q => H.h0[q] > 0 : q => hUp(H, q);    // start: as the attack began
    return CMP[c.op || ">="](1 + LIMBS.filter(up).length, c.n || 0);
  }
  if (c.part === "arm") return partOne(c, H, "Left arm") || partOne(c, H, "Right arm");
  if (c.part !== "Body" && c.part !== "Left arm" && c.part !== "Right arm" && c.part !== "Legs") return false;   // whole-unit HP: never on an ST
  return partOne(c, H, c.part);
}
const isAfter = e => (e.c || []).some(c => c.t === "after");
const isAfterCast = e => (e.c || []).some(c => c.t === "after" || c.ct === "AfterThisSkill");   // gained only once its skill's attack is over
const OPC = { ">=": 0, ">": 1, "<=": 2, "<": 3, "=": 4 };
/* compiled part conditions in the fight simulation (H = {hp, max, alive, h0}): same rules as partCond */
function simConds(cs, p, H) {
  for (const c of cs) {
    if (c.pc) {
      const n = c.st && H.h0 ? 1 + (H.h0["Left arm"] > 0 ? 1 : 0) + (H.h0["Right arm"] > 0 ? 1 : 0) + (H.h0.Legs > 0 ? 1 : 0)
        : 1 + (H.alive.has("Left arm") ? 1 : 0) + (H.alive.has("Right arm") ? 1 : 0) + (H.alive.has("Legs") ? 1 : 0), o = c.o;
      if (!(o === 0 ? n >= c.v : o === 1 ? n > c.v : o === 2 ? n <= c.v : o === 3 ? n < c.v : n === c.v)) return false;
      continue;
    }
    if (c.mm) {
      if (p !== "Body" && !H.alive.has(p)) return false;
      const h = H.h0[p];
      for (const q of PARTS) if ((q === "Body" || H.alive.has(q)) && (c.max ? H.h0[q] > h + 1e-6 : H.h0[q] < h - 1e-6)) return false;
      continue;
    }
    let ok = false;
    for (const q of c.ps) {
      const up = q === "Body" ? H.hp.Body > 0 : H.alive.has(q);
      if (!up && !c.dest) continue;
      const x = up ? Math.max(0, H.hp[q]) / H.max[q] * 100 : 0, o = c.o;
      if (o === 0 ? x >= c.v : o === 1 ? x > c.v : o === 2 ? x <= c.v : o === 3 ? x < c.v : x === c.v) { ok = true; break; }
    }
    if (!ok) return false;
  }
  return true;
}
/* buffs that belong to some pilot's kit (auto skills, talents, skills, Neural Drive levels): a setup that doesn't own one never gets it */
let KIT_BUFS = null;
function kitBufs() {
  if (KIT_BUFS) return KIT_BUFS;
  KIT_BUFS = new Set();
  for (const P of Object.values(D.pilots)) for (const k of [...(P.auto || []), ...(P.skills || []), ...P.stars.map(x => x.talent).filter(Boolean), ...Object.values(P.sectors || {}).flat()])
    for (const b of ((D.skills[k] || {}).gb || [])) KIT_BUFS.add(b);
  return KIT_BUFS;
}
/* a Neural Drive level is on: the fixed ones (a / b levels 1-3, y1 / y2 level 1) unless the chip power doesn't reach
   them (s.secOff), the other y1 / y2 levels by their box */
const secOn = (s, sec, i) => (sec === "α" || sec === "β" || i === 0) ? !(s.secOff || []).includes(sec + ":" + i) : !!((s.sect || {})[sec] || [])[i - 1];
/* every source of effects for this setup, as {key, label, group, kind, fxKeys, scale, vOverride, defaultOn} */
let RK_SET = null, EUPH_SET = null;
const RK = () => RK_SET || (RK_SET = new Set(D.reatk || []));
/* the attack's own AP cost, from one box ('AP cost of this attack'): Situation's box when typed, else the skill's listed
   cost; the bench doesn't work out changes to it (Headliner +1, TCS 4 -1 ...), it names them under the box (D.apc: sources that carry one).
   Every reader takes this: 'Skill AP cost <= N' conditions, values per AP cost, the AP a Fury spend leaves and the AP left after the cost */
const apcOf = (s, sk) => {
  if (!sk || sk.ap == null) return sk ? sk.ap : null; const v = (s.sit || {}).apc;
  return v != null && v !== "" && isFinite(+v) ? Math.max(0, Math.round(+v)) : sk.ap;
};
// an entry that only carries text: outside one attack, or an after-the-attack fixed-damage cast the bench doesn't count
const isNoteE = e => e.f === "note" || (e.f === "after" && !(D.after || {})[e.b]);
const EUPH = () => EUPH_SET || (EUPH_SET = new Set(D.euph || []));        // the Euphoria buffs (stacks: the Situation's count)
// Euphoria's cap: 5 (OverlapOrLevelMax), + a BufMaxLevelAdd in the kit (Untamed Soul, Storm Stiller: +2, so 7); EUPH_MAX is the highest
// any kit reaches, the bound of the Situation input before compute() holds the count to this setup's own cap
let EUPH_TOP = null;
const EUPH_MAX = () => EUPH_TOP != null ? EUPH_TOP : (EUPH_TOP = 5 + Math.max(0, ...Object.values(D.fx).flat().filter(e => e.f === "lvmax" && EUPH().has(e.lvb)).map(e => e.v)));
function sources(s, atkSlot, weap, fire) {
  const P = D.pilots[s.pilot], star = P.stars[Math.min(s.star, P.stars.length - 1)], out = [];
  const add = (key, label, group, fx, kind, extra = {}) => {
    const ks = (Array.isArray(fx) ? fx : [fx]).filter(k => k && D.fx[k]);
    if (ks.some(k => RK().has(k))) (out.rk ||= []).push(label.replace(/^[^:]+: /, ""));
    const apk = ks.filter(k => (D.apc || {})[k]);                 // it changes the AP cost of your attacks (named under the AP cost box)
    if (apk.length) (out.apc ||= []).push(label.replace(/^[^:]+: /, "") + " " + [...new Set(apk.flatMap(k => D.apc[k]))].map(v => (v > 0 ? "+" : "\u2212") + Math.abs(v)).join(" / "));
    if (ks.length) out.push({ key, label, group, fx: ks, kind, ...extra });
  };
  for (const k of P.auto) add("auto:" + k, D.skills[k].n, "Pilot", D.skills[k].fx, "passive");
  if (star.talent) add("talent", "Talent: " + D.skills[star.talent].n, "Pilot", D.skills[star.talent].fx, "passive");
  const xk = s.atk.skill && s.atk.skill !== "normal" && ![...s.skills, s.ex].includes(s.atk.skill) ? s.atk.skill : null;
  for (const k of [...s.skills, s.ex, xk]) {
    if (!k || !D.skills[k]) continue;
    const sk = D.skills[k], isAtk = s.atk.skill === k;
    if (sk.type === "ActiveAttack" && !isAtk) {
      // what another attack skill gives after its own attack (Crimson Rondo's Rondo - Machine Gun / Shotgun): a row per buff that
      // starts unticked, for an attack made while it is still up from an earlier use
      const ks = (Array.isArray(sk.fx) ? sk.fx : [sk.fx]).filter(f => f && D.fx[f]), nm = [];
      for (const f of ks) for (const e of D.fx[f]) if (isAfterCast(e) && !isNoteE(e) && !nm.includes(e.n || "")) nm.push(e.n || "");
      for (const n of nm) add(`ska:${k}:${n}`, `Skill: ${sk.n}: ${n || "after its attack"} (from an earlier use)`, "Pilot", ks, "code", { afterN: n });
      continue;
    }
    add("sk:" + k, (k === s.ex ? "EX: " : "Skill: ") + sk.n, "Pilot", sk.fx, isAtk ? "attack" : sk.type === "passive" ? "passive" : "code");
  }
  for (const [sec, n] of [["α", 3], ["β", 3], ["γ1", 6], ["γ2", 6]]) {
    (P.sectors[sec] || []).slice(0, n).forEach((k, i) => {
      const on = secOn(s, sec, i);
      if (on) add(`sec:${sec}:${i}`, `${secName(sec)} L${i + 1}: ${D.skills[k].n}`, "Pilot", D.skills[k].fx, "passive");
    });
  }
  s.pf.forEach((f, i) => f && D.features[f] && add("pf:" + i, "Pilot feature: " + D.features[f].n, "Features", D.features[f].fx, "passive"));
  const st = stOf(s);
  for (const p of PARTS) (st.parts[p].fx || []).forEach((k, i) => add(`part:${p}:${i}`, `${p} passive` + (st.mixed ? ` (${D.sts[partST(s, p)].n})` : ""), "ST", k, "passive"));
  const mcount = moduleCounts(s);
  for (const [mid, n] of Object.entries(mcount)) { const M = D.modules[mid], lv = Math.min(n, M.max); if (M.levels[lv - 1]) add("mod:" + mid, `Module: ${M.n} L${lv}`, "ST", M.levels[lv - 1].fx, "passive"); }
  s.stf.forEach((f, i) => f && D.features[f] && add("stf:" + i, "ST feature: " + D.features[f].n, "Features", D.features[f].fx, "passive"));
  if (s.back && s.back.startsWith("bp:") && D.backs[s.back.slice(3)]) {
    const B = D.backs[s.back.slice(3)];
    // a backpack only has passive skills (ConfigDataBackpackInfo.PassiveSkillIds, no use): its bonuses count by being
    // equipped, each by its own conditions (Armor Suppression III 601431: the target's armor cut at each attack start by the attack's type)
    add("bp", `Backpack: ${B.n} (${B.q})`, "ST", B.fx, "passive");
  }
  // a weapon's "carried" passives count once even when both hands hold the same weapon (e.g. two Kagutsuchi: Chain Blaze +20% once)
  const carried = new Set();
  for (const [slot, w] of Object.entries(weap)) {
    const W = D.weapons[w.id]; (W.gfx || []).forEach((k, i) => {
      if (carried.has(k)) return; carried.add(k);
      add(`g:${slot}:${i}`, `${W.n} (carried)`, "Weapons", k, "passive");
    });
  }
  s.wf.forEach((f, i) => f && D.features[f] && add("wf:" + i, "Weapon feature: " + D.features[f].n, "Features", D.features[f].fx, "passive"));
  const w = weap[atkSlot];
  if (w) {
    const W = D.weapons[w.id];
    // the other weapon's own rows in a both-weapon attack (its stream, or the two-hand average) are keyed by its slot: its refits are not yours
    // (wslot = the slot that carries the weapon, for its auto / on / off key, ovrK: two weapons with the same refit ids, or the
    // same weapon in both hands, never share an override)
    const sp = s._part && ((s._part.main && s._part.main !== atkSlot) || s._part.avgOf) ? atkSlot + ":" : "";
    (W.fx || []).forEach((k, i) => add(sp + "wfx:" + i, W.n + " built-in", "Attacking weapon", k, "passive", { wslot: atkSlot }));
    w.opts.forEach((o, i) => o && add(sp + "opt:" + i, "Refit: " + optName(W, o.fx), "Attacking weapon", o.fx, "passive", { vset: optV(W, o.fx, o.v), wslot: atkSlot }));
    if (w.drop) { const d = W.drops.find(x => String(x.id) === String(w.drop)); if (d) add(sp + "drop", "Drop ability: " + d.n, "Attacking weapon", d.fx, "passive", { wslot: atkSlot }); }
    // the accessories that fire for this attack: the attacking weapon's, and with a both-weapon skill (skill group 16384 / 65536 / 524288)
    // the other weapons it uses (a triggered RA puts its buff on the unit or the target, so it reaches every stream of the attack);
    // keyed by slot when the weapon is not the attack's own (the main slot of a stream of the same attack)
    const main = s._part && s._part.main ? s._part.main : atkSlot, fired = fire || [atkSlot];
    // what an RA gives after combat is one buff on your unit, whichever weapon carries it and whichever attacks: ONE row per
    // accessory (its component id), key 'rah:<id>', the carrying weapons named when it isn't only the attacking one (High-Spirited
    // on both hands: one row; its tick stays when the attack moves to the other hand). Placed where the attacking weapon's own row would sit
    const later0 = C => (C.fx || []).filter(k => D.fx[k] && D.fx[k].some(isAfter)), wnm = sl => D.weapons[weap[sl].id] ? D.weapons[weap[sl].id].n : SLOTW[sl] || sl;
    const rahBy = new Map();                      // component id -> the slots that carry it, the attacking slot first
    for (const sl of [atkSlot, ...Object.keys(weap).filter(x => x !== atkSlot)]) for (const c of (weap[sl] && weap[sl].comps) || []) {
      const C = D.components[c.id];
      if (C && C.k === "RA" && later0(C).length) { const L = rahBy.get(c.id) || rahBy.set(c.id, []).get(c.id); if (!L.includes(sl)) L.push(sl); }
    }
    const rahDone = new Set(), rahAdd = id => {
      if (rahDone.has(id) || !rahBy.has(id)) return; rahDone.add(id);
      const C = D.components[id], sl = rahBy.get(id), nm = [...new Set(sl.map(wnm))];
      const on = sl.length === 1 && sl[0] === atkSlot ? "" : nm.length === 1 && sl.length > 1 ? `on both ${nm[0]}, ` : `on ${nm.join(" and ")}, `;
      add("rah:" + id, `${C.n} (${on}from an earlier trigger)`, "Accessories", later0(C), "passive", { only: "after" });
    };
    for (const slot of [atkSlot, ...fired.filter(x => x !== atkSlot)]) {
      const ww = weap[slot]; if (!ww || !fired.includes(slot)) continue;
      const pre = slot === main ? "" : slot + ":", wn = slot === main ? "" : ` (${D.weapons[ww.id] ? D.weapons[ww.id].n : slot})`;
      for (const c of ww.comps || []) {
        const C = D.components[c.id]; if (!C || C.k !== "RA") continue;
        // what an RA gives right away is weighted by its trigger chance; what it gives after combat (High-Spirited, Energized,
        // Innervate, Shudder) never reaches the attack that triggers it: a row that starts off, for an attack made with it already up
        const ks = (C.fx || []).filter(k => D.fx[k]), now = ks.filter(k => D.fx[k].some(e => !isAfter(e)));
        const rx = pre ? { rk: pre + c.id, raSlot: slot } : {};
        if (now.length) add("ra:" + pre + c.id, C.n + wn, "Accessories", now, "ra", { ra: c, only: "now", ...rx });
        else if (C.xp) out.push({ key: "ra:" + pre + c.id, label: C.n + wn, group: "Accessories", fx: [], kind: "ra", ra: c, ...rx });
        if (slot === atkSlot) rahAdd(c.id);
      }
    }
    for (const id of rahBy.keys()) rahAdd(id);                 // the other weapons' after-combat RAs
  }
  // a buff that a trigger at the start of an attack attaches for one or more turns (Mega Form -> Crit Rate UP II, 2 turns): when
  // this attack doesn't set it off, it can still be up from an earlier cast. A row per buff, unticked (hidden while this attack gives it)
  for (const src of [...out]) {
    if (src.kind === "ra" || src.only || src.afterN != null) continue;
    const nm = new Map();
    for (const k of src.fx) for (const e of D.fx[k] || []) { const cc = castCond(e); if (cc && cc.life && !isNoteE(e) && !FOLLOW_F.has(e.f) && !nm.has(e.n || "")) nm.set(e.n || "", cc); }
    for (const [n, cc] of nm) add(`cast:${src.key}:${n}`, `${src.label.replace(/^[^:]+: /, "")}: ${n || cc.tn} (from an earlier cast, ${cc.life < 0 ? "lasts the rest of the fight" : `lasts ${cc.life} turn${cc.life === 1 ? "" : "s"}`})`,
      src.group, src.fx, "code", { castN: n, castOf: src.key, ...(src.wslot ? { wslot: src.wslot } : {}) });
  }
  // a Code skill one of your passives grants (White Stork -> Special Load): a row that starts unticked, for casting it before this
  // attack; of the versions it grants, only the one whose condition your kit meets (Stork's Gaze from Venus MK7 -> Improved Fire II)
  if ((P.codes || []).length) {
    const ownK = new Set([...(P.auto || []), star.talent, ...s.skills, s.ex].filter(Boolean));
    for (const sec of Object.keys(P.sectors || {})) (P.sectors[sec] || []).forEach((k, i) => { if (secOn(s, sec, i)) ownK.add(k); });
    const ids = new Set();
    for (const src of out) for (const k of src.fx) for (const e of D.fx[k] || []) for (const b of e.ids || []) ids.add(b);
    for (const k of ownK) for (const b of (D.skills[k] || {}).gb || []) ids.add(b);
    for (const g of P.codes) {
      if (!D.skills[g.k] || !g.srcs.some(k => ownK.has(k)) || out.some(o => o.key === "sk:" + g.k)) continue;
      if ((g.c || []).some(c => c.t === "buf" && CMP[c.op] && !CMP[c.op](ids.has(c.v) ? 1 : 0, c.n))) continue;
      const by = g.srcs.find(k => ownK.has(k)), fxn = (D.fx[g.k] || []).find(e => !isNoteE(e) && e.n);
      add("code:" + g.k, `Skill: ${D.skills[g.k].n}${fxn ? ` (${fxn.n})` : ""}, granted by ${D.skills[by] ? D.skills[by].n : "a passive"}`, "Pilot", D.skills[g.k].fx, "code");
    }
  }
  return out;
}
// the cast-time check of an effect that carries into later attacks: its castc condition with a life of 1+ turns (or the fight)
// conditions about the setup itself (kit buffs, class, carried weapons): when one fails, no earlier cast could have set the trigger off either
const SETUP_T = new Set(["buf", "pclass", "hasw", "osize", "aclass", "zone", "named", "bptype", "wcount", "tacn", "samecat", "slotwt", "samewt"]);
const castCond = e => (e.c || []).find(c => c.t === "castc" && c.life) || null;
const castSkip = (src, e) => src.castN != null && !(castCond(e) && (e.n || "") === src.castN);
// ...a kit or setup condition of its trigger fails, so no earlier cast in this setup could have set it off (Mega Form needs Rosa's Core 1 / 2)
const castNever = (e, ctx, W) => {
  const cc = castCond(e); return !!cc && cc.items.some(it => (SETUP_T.has(it.t) || (it.t === "any" && it.items.every(y => SETUP_T.has(y.t))))
    && condState(it, { ...ctx, held: "you" }, W) === false);
};
/* module levels: built-in modules from each part's grade + the module equipped in each part (gold items count 2), capped at the module's max */
function moduleCounts(s) {
  const st = stOf(s), m = {};
  for (const p of PARTS) {
    for (const [eid, n] of st.parts[p].grades[s.grades[p]].mods || []) if (D.modules[eid]) m[eid] = (m[eid] || 0) + n;
    const it = s.mods[p] && moduleOf(s.mods[p]); if (it) m[it.id] = (m[it.id] || 0) + it.plus;
  }
  if (hiddenOn(s)) for (const p of PARTS) for (const [eid, n] of D.sts[s.st].hidden[p] || []) if (D.modules[eid]) m[eid] = (m[eid] || 0) + n;
  return m;
}
/* an ST's hidden modules (Erinys "Mode" modules): the game adds them only when all four parts are that ST's and every part is SS
   (TacticalUnitCompWapEntry.TacticalUnitWapEntryDictCalcInternal, HiddenWapEntryActiveMinQuality = 8) */
function hiddenOn(s) {
  const B = D.sts[s.st];
  return !!(B.hidden && !isMixed(s) && PARTS.every(p => String(B.parts[p].grades[s.grades[p]].g).startsWith("SS")));
}
/* buffs the active module levels give from the start (Eruption Mod L8: 303483 "Restriction Removal", which the Modes need) */
function moduleLevels(s) {
  return Object.entries(moduleCounts(s)).map(([mid, n]) => { const M = D.modules[mid], lv = Math.min(n, M.max); return { mid, M, lv, L: M.levels[lv - 1] }; }).filter(x => x.L);
}
const QNAME = ["1 chevron", "2 chevrons", "3 chevrons", "rainbow"];
function qualityLabel(grades, i) { return grades.length > 1 ? `${QNAME[i]} (${grades[i].g})` : `fixed (${grades[i].g} stats)`; }
/* picking the body's grade or module fills the other parts, as picking the body ST does; a part you set yourself
   keeps its own (s.grU / s.mdU = {part: true}, only true values stored; the body never has one). A grade is matched by its quality tier
   (QNAME: the chevrons), the letter from the part's own list (body 'rainbow (SS)' moves a MetalMare arm to 'rainbow (S+)'); a part whose
   list has no such tier (a one-grade 'fixed' part) keeps what it has. Modules: one list for every part, no part restriction in the data
   (modFits is the hook for one); '—' on the body clears the parts that follow it */
const grTier = (g, i) => g && g.length > 1 && i != null && g[i] ? +i : null;      // the quality tier (chevrons); a one-grade part has none
function followGrade(s, p) {
  const st = stOf(s), t = grTier(st.parts.Body.grades, s.grades.Body);
  if (t == null || grTier(st.parts[p].grades, t) == null) return false; s.grades[p] = t; return true;
}
// a module fits a part when the part's quality gives a slot at least as high as the module needs (QualityEnhanceTemplate
// ProvideSlotLevel 0 / 1 Connector I / 2 Connector II vs the item's NeedSlotLevel: gold and higher-quality modules need Connector II)
const modNeed = item => { for (const M of Object.values(D.modules)) { const it = M.items.find(i => i.id === String(item)); if (it) return it.need || 1; } return 1; };
const partSlot = (s, p) => { const g = stOf(s).parts[p].grades[s.grades[p]]; return g && g.sl != null ? g.sl : 2; };
const modFits = (s, p, item) => item == null || item === "" || modNeed(item) <= partSlot(s, p);
const modKey = v => v == null || v === "" ? null : String(v);
// a part's grade is 'set by you' when it differs from the body's tier (only where both have tiers: a fixed part can't follow anyway)
const grDiffers = (s, p) => {
  const st = stOf(s), tb = grTier(st.parts.Body.grades, s.grades.Body), tp = grTier(st.parts[p].grades, s.grades[p]);
  return tb != null && tp != null && tb !== tp;
};
function stRange(k) { const g = D.sts[k].parts.Body.grades; return g.length > 1 ? `4 grades` : `fixed grade`; }
function moduleOf(itemId) {
  for (const [mid, M] of Object.entries(D.modules)) { const it = M.items.find(i => i.id === String(itemId)); if (it) return { id: mid, plus: it.plus, n: it.n }; }
  return null;
}
const FX_WORDS = {
  afx: e => folText(e), exec: e => folText(e), t4: e => folText(e), udg: () => "Your shots can't be dodged", gcrit: () => "Every shot crits", hfloor: e => `Hit chance at least ${pct(e.v || 0, 0)}`,
  ign: () => "Ignores the target's damage reductions", defl: e => `A missed shot still deals ${pct(e.v || 0, 0)} of its damage`,
  ghc: e => `At least ${e.v} hit${e.v === 1 ? "" : "s"} land each round`
};
const fLab = f => FIELD[f] || (/^wtadd:/.test(f) ? (TYPE_NAMES[f.slice(6)] || f.slice(6)) + " Weight +" : /^wtmulti:/.test(f) ? (TYPE_NAMES[f.slice(8)] || f.slice(8)) + " Weight"
  : f === "pwadd" ? "ST Power +" : f);
function fxText(fx) { return (D.fx[fx] || []).map(e => e.f === "pwadj" ? pwText(e) : FX_WORDS[e.f] ? FX_WORDS[e.f](e) : `${fLab(e.f)}${e.f === "pwhit" ? " (" + e.part.toLowerCase() + ")" : ""} ${sgn(e.v, e.f)}`).join(" · "); }
function dropDesc(W, w) { const d = w.drop && W.drops.find(x => String(x.id) === String(w.drop)); return d ? `<div class="desc span3">${esc(d.d || fxText(d.fx))}</div>` : ""; }
function optName(W, fx) { const o = (D.adv[W.type] && D.adv[W.type].opts || []).find(x => x.fx === fx); return o ? o.n : (D.fx[fx] && D.fx[fx][0] && D.fx[fx][0].n) || fx; }

/* ------------------------------------------------------------------ math */
/* Peripheral Vision (ExtraRoundSplashAttack): after an active Flamethrower attack, the opposite arm's Flamethrower fires the same
   skill again at the same target: (srcAtk_other × AtrDef_coeff ÷ Nshots_base − eArmor ÷ 10) × SkillM × SplashFactor × (1 + DMG%), no FinalDMG%.
   SplashFactor = the round's own factor (TCS 1 0.20, else Core Talent 1 0.15) + Flame DMG % (Whoosh! on terrain, Ultrahot!). */
/* can this attack fire the Peripheral Vision round at all: a Peripheral Vision buff in the kit (Erisa's TCS 1 / Hot! Hot! Hot!),
   an active Flamethrower attack (not a Code skill) and a Flamethrower in the other hand; returns the round's base splash factor */
function pvBase(s, R) {
  if (!R || R.W.type !== "Flamethrower") return 0;
  if (s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].type === "Code") return 0;
  if (((R.ctx || {}).A || {}).ft && R.ctx.A.ft !== "LineSplashAttack") return 0;     // only after a LineSplashAttack skill
  const base = Math.max(0, ...[...R.ctx.own].map(b => (D.xround || {})[String(b)] || 0));
  const other = { RH: "LH", LH: "RH" }[s.atk.slot], ow = other && equipped(s)[other];
  return base && ow && D.weapons[ow.id] && D.weapons[ow.id].type === "Flamethrower" ? base : 0;
}
/* where the round goes (ActorActiveSkillLineSplashAttack.ExtraTargetCalc): a random living enemy the other Flamethrower can
   reach that this attack did not hit; failing that, another unit this attack hit; only when there is neither does it come back to this
   target. "auto": this target when it is the only enemy in your weapon's range */
// (the one control is the Situation select s.extra.pvT; the tick s.extra.pvOff of older saves isn't read and is dropped on load)
const pvMode = s => s.extra.pvT || "auto";      // "line": it goes to another enemy, but its line still crosses this target
function pvRound(s, R, raOverride) {
  if (s._noPV) return null;
  const base = pvBase(s, R);
  if (!base) return null;
  const pm = pvMode(s);
  // (the enemies in range decide it only under 'Work it out': the other choices say where it goes, so the count isn't read then)
  if (pm === "auto" && R.sit && !R.s._xatk && !R.s._part && R.sit.use) { if (!R.sit.use.has("inRng")) R.sit.use.set("inRng", new Set()); R.sit.use.get("inRng").add("Peripheral Vision"); }
  if (pm === "no" || (pm === "auto" && R.sit && R.sit.inRng > 1)) return null;          // "yes" / "line": the round's shots reach this target
  const other = { RH: "LH", LH: "RH" }[s.atk.slot];
  const R2 = compute({ ...s, atk: { ...s.atk, slot: other }, _noPV: true, _castMain: castOf(R), _useRoot: R.sit && R.sit.useRoot, _ovrRoot: R.sit && R.sit.ovrRoot }, raOverride);
  if (!R2) return null;
  const SF = base + R2.g("splash");
  // same combat, same target: the PV round meets the armor the main round left (e.g. RA - Piercing fired by the attacking hand's
  // accessories at the start of combat covers both rounds), not the opposite weapon's own accessories
  // the round's own DMG% bucket (yours + the target's DMG taken for the part hit) and the target's damage factor; no FinalDMG%
  const armor = R.armor, H0 = H_START(), mult = (p, H) => Math.max(0, R2.skillM) * Math.max(0, SF) * Math.max(0, 1 + R2.dB(p, H)) * R2.npcF(p, H);
  const pre = p => Math.max(0, R2.perBefore - R.armorBy[p] / 10);
  const shot = Math.max(1, Math.max(0, R2.perBefore - armor / 10) * mult(T.part, H0));
  const shotBy = Object.fromEntries(PARTS.map(p => [p, Math.max(1, pre(p) * mult(p, H0))]));
  const shotAt = R2.dyn ? (p, H) => Math.max(1, pre(p) * mult(p, H)) : p => shotBy[p];
  const hitAvg = PARTS.reduce((a, p) => a + R.wts[p] * shotBy[p], 0);
  // hit by hit: the main round's armor (with the PV round's own armor terms), the PV round's SkillM / DMG% / damage factor, no FinalDMG%
  const basePH = (Tm, p, c, i, H) => Math.max(1, Math.max(0, R2.perBefore - R.armPH(Tm, p, c, i, H) / 10) * Math.max(0, R2.skillM + sumT(Tm, "skillM", c, i, H, p))
    * Math.max(0, SF) * Math.max(0, 1 + R2.dB(p, H) + sumT(Tm, "dmgB", c, i, H, p)) * Math.max(0, R2.npcIn(p, H) + sumT(Tm, "npcB", c, i, H, p)));
  return {
    R: R2, armor, base, SF, shot, basePH, shotCrit: shot * (1 + R2.critDmg), shots: R2.shots, hitAfter: R2.hitAfter, crit: R2.crit, critDmg: R2.critDmg,
    shotBy, shotAt, dyn: R2.dyn, mult, wts: R.wts, hitAvg, exp: R2.expHits * hitAvg * (1 + R2.crit * R2.critDmg), slot: other
  };
}
/* which part a shot lands on, in the game's order (ActorActiveSkillAttackBase.CalcDamageWapPart,
   BattleActorTacticalUnitCompBodyPart.MustBeHitWapPartGet, AttackWapPartCalc):
   - even path (an area attack's rotation, a Shotgun without flag 0x1000, flag 0x200000): a Large Shield takes every shot of an attack
     without flag 0x10 while its arm stands; else focus (aiming replaces a pick nothing forced); else the rotation: an area attack goes
     round all four parts and a turn on a destroyed part is a lost shot (the weights then add up to less than 1), the others skip them
   - rolled path: the target's forced part (Ultimate Form) > a Large Shield > focus > your forced hits (modes 4-12) > the weighted roll
     (the attack's profile + your adjusts + the target's hit weighting + a Small Shield's bonus on its arm), over the standing parts;
   a profile with no weight left on standing parts falls back to an even split */
function partWeights(sk, alive, pw) {
  const ok = p => !alive || alive.has(p) || p === "Body", parts = PARTS.filter(ok);
  const one = p => Object.fromEntries(PARTS.map(x => [x, x === p ? 1 : 0]));
  const even = L => Object.fromEntries(PARTS.map(x => [x, L.includes(x) ? 1 / L.length : 0]));
  const tr = (pw && pw.tr) || {}, focus = T.mode === "focus" && ok(T.part);
  if (tr.rot || sk.av) {
    if (tr.lsh && ok(tr.lsh)) return one(tr.lsh);
    if (focus) return one(T.part);
    return tr.rot ? Object.fromEntries(PARTS.map(x => [x, ok(x) ? 0.25 : 0])) : even(parts);
  }
  for (const fp of tr.frc || []) if (ok(fp)) return one(fp);
  if (tr.lsh && ok(tr.lsh)) return one(tr.lsh);
  if (focus) return one(T.part);
  const adj = (pw && pw.adj) || [], hit = (pw && pw.hit) || {}, mx = (pw && pw.max) || {}, hp = (pw && pw.hp) || mx;
  const cur = p => hp[p] != null ? hp[p] : 1, frac = p => mx[p] ? cur(p) / mx[p] : 1;
  const by = (f, dir) => parts.reduce((b, p) => b == null || dir * (f(p) - f(b)) < 0 ? p : b, null);
  const damaged = () => parts.filter(p => mx[p] && cur(p) < mx[p] - 1e-6);
  // forced hits (modes 4-12): the shot goes to that part; a named part that is destroyed falls back to the normal roll
  for (const a of adj) {
    if (a.m < 4) continue;
    if (a.m === 4 && a.pt) { if (ok(a.pt)) return one(a.pt); continue; }
    if (a.m === 4 || a.m === 11) { const d = damaged(); if (d.length) return even(d); continue; }
    if (a.m === 5) return one("Body");
    if (a.m === 6) return one(by(cur, 1)); if (a.m === 7) return one(by(cur, -1));
    if (a.m === 8) return one(by(frac, 1)); if (a.m === 9) return one(by(frac, -1));
    if (a.m === 10 || a.m === 12) { const arms = parts.filter(p => p === "Left arm" || p === "Right arm"); if (arms.length) return even(arms); }
  }
  // weights: the attack's profile + your adjusts (modes 1-3) + the target's hit weighting, over the parts still standing
  const prof = (D.pwt || {})[String(sk.pw || 4)] || { Body: 25, "Left arm": 25, "Right arm": 25, Legs: 25 };
  const w = {}; let tot = 0;
  for (const p of PARTS) w[p] = ok(p) ? Math.max(0, (prof[p] || 0) + (hit[p] || 0)) : 0;
  for (const a of adj) if (a.m <= 3) { const p = a.m === 1 ? by(cur, 1) : a.m === 2 ? by(cur, -1) : a.pt; if (p && ok(p)) w[p] = Math.max(0, w[p] + a.v); }
  if (tr.ssh && ok(tr.ssh.arm)) w[tr.ssh.arm] += tr.ssh.w;     // a Small Shield: its arm's bonus (BucklerDamageWapPartWeightAdjustAdd, CalcFinalWapPartWeights)
  for (const p of PARTS) tot += w[p];
  if (!tot) return even(parts);
  for (const p of PARTS) w[p] /= tot;
  return w;
}
/* Gusty Strike (BufFuncType_AttackerComb, e.g. Erinys "Mode - Martial", Hong - Personal 4): after the attack, a chance to fire an arm's
   extra attack (the weapon type's DefaultExtraAttackSkill, SkillAttackMulti 0.5, its own shot count) with the combo's adjustment added to SkillM
   (Martial -0.1 -> 0.4). FuncParams [same arm 1 / the other arm 0, chance, SkillM adjustment]; chance = FP1 + AttackerComboAttackRateAdd.
   Several sources (BattleActorCompSkillEnv.IsAttackerComboAttackAlive): the buffs roll one after another in the unit's buff
   order and the first that passes fires (no priority): P(k) = q_k x prod over the earlier ones (1 - q_j); the bench takes its rows' order.
   Only for attacks whose skill group matches (Martial 259: Normal Attack 1, ActiveAttack 2, Gusty Strike 256). Its own hit and crit rolls. */
/* what the main skill used up before its follow-ups start: Fury (consumed when Fury Unleashed spends stacks, as the buff text says): the stacks spent,
   not the whole buff (BuffLevelDecreaseById(buff, cost) at the skill's tail), so a follow-up reads Fury held - spent */
const spentAfter = R => R.ctx.A && R.ctx.A.mc && R.sit && R.sit.fury > 0 ? { [R.ctx.A.mc[0]]: R.sit.fury } : null;
// the main attack's cast-time checks, for a later round of the same attack
const castOf = R => R.s._castMain || R.ctx.castRes || {};
function gustyRound(s, R, raOverride) {
  R.ctx.held = "you";
  const L = (R.fol || []).filter(x => x.e.f === "combo" && (D.combo || {})[x.e.b]);
  if (!L.length) return null;
  const mode = s.extra.gusty || "chance", crate = R.g("crate"), out = [];
  let rest = 1;
  for (const x of L) {
    if (out.some(y => y.c.b === x.e.b)) continue;
    const c = { ...D.combo[x.e.b], b: x.e.b, key: x.src.key, src: x.src.label }, slot = c.same ? R.atkSlot : OTHER[R.atkSlot];
    if (!slot || !R.weap[slot]) continue;                        // the other arm holds no weapon (a two-handed weapon has no other arm)
    const type = wtOf(R.weap, slot), X = (D.xatk || {})[type];
    if (!X || !X.m) continue;
    const q = clampN(c.p + crate, 0, 1), p = mode === "off" ? 0 : mode === "on" ? (out.length ? 0 : 1) : rest * q;
    if (mode === "chance") rest *= 1 - q;
    // the extra attack as its own attack (skill group 256): bonuses tied to other attack types drop out (Salty Dog's Normal Attack SkillM)
    const R2 = compute({
      ...s, ...(slot !== R.atkSlot ? { atk: { ...s.atk, slot } } : {}), _mainAoe: (R.ctx.A || {}).aoe === 1, _sitMain: R.sit, _spent: spentAfter(R), _castMain: castOf(R),
      _xatk: { n: "Gusty Strike", m: X.m + c.adj, h: X.h || 1, g: 256, pw: X.xpw || 4, av: X.xav || 0, A: X.x || {} }
    }, raOverride);
    if (!R2) continue;
    out.push({
      c, mode, q, p, R: R2, slot, shots: R2.shots, baseShots: R2.baseShots, skillM: R2.skillM, shot: R2.shot, shotCrit: R2.shotCrit,
      hitAfter: R2.hitAfter, crit: R2.crit, exp: p * R2.expAtk
    });
  }
  if (!out.length) return null;
  const G = out[0];
  G.list = out; G.pAll = out.reduce((a, x) => a + x.p, 0);
  if (out.length > 1) G.exp = out.reduce((a, x) => a + x.exp, 0);
  return G;
}
/* Flurry Strike (BufFuncType_AttackerPursuit): after the target's retaliation, an arm fires its weapon type's extra attack (or the buff's own
   skill, FuncParams[3]) at the same target. FuncParams [same arm 1 / the other arm 0, chance, SkillM adjustment, skill]. Its own single skill:
   stage Pursuit 8 (256 when a buff moves it before the retaliation, GamePlayFlags2 0x20000: Untamed Soul, Ulfhednar Mod L8), skill group 256,
   srcAtk, armor and bonuses read again, own hit and crit rolls. Chance (IsAttackerPursuitAttackAliveIncludeLocalBuf): every buff
   whose conditions hold rolls on its own, q = FP1 + AttackerPursuitAttackRateAdd (property 568); of those that pass, the highest
   TriggerPriority fires (FindHighestPriorityActiveBuf: a later buff replaces the pick only with a strictly higher priority, so a
   tie goes to the first in the unit's buff order; the bench takes its rows' order). It is tried only when no Gusty Strike fired
   (SkillPipelineSkillCoreStepsExec), and after the retaliation only while the firing arm still stands (IsSkillExecNeedBreakBasic). */
function pursRounds(s, R, raOverride) {
  if (!(R.fol || []).some(x => x.e.f === "purs" && (D.purs || {})[x.e.b])) return null;
  const S = R.sit, pre = (R.fol || []).some(x => x.e.f === "p2c");
  // after the retaliation the game reads your HP again (Hrodvitnir's HP band, Flawless Mod's 'HP >= 80%'): "Your HP % after the target's
  // retaliation" (default: as before the attack) decides which sources hold and the round's own HP effects
  const post = !pre && S.canCounter, ohp1 = post && S.u.ohpPost != null && S.u.ohpPost !== "" ? clampN(Math.round(+S.u.ohpPost || 0), 1, 100) : null;
  // (typed, it is your HP after everything before the round, the attack's own HP cost included: s._ohpSet; empty, the round has
  // the HP the attack left, R.ctx.ohp)
  const sP = ohp1 != null && ohp1 !== R.ctx.ohp ? { ...s, extra: { ...s.extra, ohp: ohp1 }, _ohpSet: true } : s;
  const RP = sP === s ? R : compute({ ...sP, _noFollow: true, _castMain: castOf(R) }, raOverride) || R;
  const L = (RP.fol || []).filter(x => x.e.f === "purs" && (D.purs || {})[x.e.b]), prate = RP.g("prate");
  // a once-per-turn one: not used yet unless you tick it
  const usedTurn = S.u.pursUsed != null ? !!S.u.pursUsed : false;
  const list = [], skip = [], cache = new Map();
  if (!L.length) return { list, skip, pre, post: !pre, armOK: S.u.armOK !== false, ctr: !!S.canCounter, mode: s.extra.purs || "chance", usedTurn, once: false, prate, ohp1 };
  L.forEach((x, idx) => {
    const P = D.purs[x.e.b], slot = P.same ? R.atkSlot : OTHER[R.atkSlot], name = x.e.n || P.n;
    if (list.some(y => y.b === x.e.b) || skip.some(y => y.b === x.e.b)) return;
    const no = why => { skip.push({ b: x.e.b, name, why }); };
    if (!slot || !R.weap[slot]) return no(P.same ? "no weapon in this slot" : "the other arm holds no weapon");
    const type = wtOf(R.weap, slot), X = P.sk || (D.xatk || {})[type];
    if (!X || !X.m) return no(`a ${TYPE_NAMES[type] || type} has no extra attack`);
    if (P.sk && P.sk.mt && P.sk.mt !== type) return no(`its attack needs a ${TYPE_NAMES[P.sk.mt] || P.sk.mt}`);
    if (P.once && usedTurn) return no("once per turn, already used this turn");
    const XA = P.sk ? { m: P.sk.m, h: P.sk.h, g: P.sk.g, pw: P.sk.pw, av: P.sk.av, A: P.sk.A || {}, r: P.sk.r } : { m: X.m, h: X.h || 1, g: 256, pw: X.xpw || 4, av: X.xav || 0, A: X.x || {} };
    const k = [slot, XA.m + P.adj, XA.h, XA.g, XA.pw, XA.av, P.sk ? P.sk.id : 0].join("|");
    if (!cache.has(k)) cache.set(k, compute({
      ...sP, atk: { ...s.atk, slot }, _mainAoe: (R.ctx.A || {}).aoe === 1, _sitMain: S, _spent: spentAfter(R), _castMain: castOf(R),
      _xatk: { n: "Flurry Strike", m: XA.m + P.adj, h: XA.h, g: XA.g, pw: XA.pw, av: XA.av, A: XA.A, r: XA.r || 1, stage: pre ? 256 : 8 }
    }, raOverride));
    const R2 = cache.get(k); if (!R2) return no("no attack");
    list.push({ b: x.e.b, P, name, q: clampN(P.p + prate, 0, 1), gate: x.e.gate || null, slot, R: R2, shots: R2.shots, prio: P.prio || 0, idx, src: x.src });
  });
  list.sort((a, b) => b.prio - a.prio || a.idx - b.idx);
  if (!list.length && !skip.length) return null;
  const armOK = S.u.armOK !== false;
  return { list, skip, pre, post: !pre, armOK, ctr: !!S.canCounter, mode: s.extra.purs || "chance", usedTurn, once: L.some(x => D.purs[x.e.b].once), prate, ohp1 };
}
/* after-combat strikes (BufFuncType_CastSkillDamageLimitEquipment fired at WholeSkillEnd4Attacker 0x2000): when the whole attack ends,
   the named weapon (FuncParams[0], a weapon-type mask; the first slot holding one) casts FuncParams[1] as a skill of its own. Target mode
   FuncParams[2] (CastSkillParamCreate): 0 the attack's target, 3 every target in its area, 8 its own target pick; the bench counts
   these on this target. A separate cast: every count of the attack starts again (start 'whole'). */
function afterRounds(s, R, raOverride) {
  const L = (R.fol || []).filter(x => x.e.f === "after" && (D.after || {})[x.e.b]);
  if (!L.length) return null;
  const list = [], skip = [];
  for (const x of L) {
    const A = D.after[x.e.b], name = x.e.n || A.n;
    if (list.some(y => y.b === x.e.b) || skip.some(y => y.b === x.e.b)) continue;
    const slot = SLOT5.find(sl => R.weap[sl] && ((D.wtBits[wtOf(R.weap, sl)] || 0) & A.wm));
    if (!slot) { skip.push({ b: x.e.b, name, why: `no ${typesOf(A.wm)} equipped` }); continue; }
    if (A.sk.mt && A.sk.mt !== wtOf(R.weap, slot)) { skip.push({ b: x.e.b, name, why: "its weapon doesn't match" }); continue; }
    if (![0, 3, 8].includes(A.mode)) { skip.push({ b: x.e.b, name, why: "it picks a random enemy or another area, so it is not counted on this target" }); continue; }
    // a cast of its own after the whole attack: its own start triggers check their conditions again, and of what the main attack's
    // triggers attached only what lasts a turn or more is still up (_castAfter, not the main attack's results)
    const R2 = compute({
      ...s, atk: { ...s.atk, slot }, _sitMain: R.sit, _spent: spentAfter(R), _castAfter: castOf(R), _xatk: {
        n: A.sk.n || name, m: A.sk.m, h: A.sk.h, g: A.sk.g, pw: A.sk.pw, av: A.sk.av,
        A: A.sk.A || {}, r: A.sk.r || 1, stage: 0
      }
    }, raOverride);
    if (!R2) continue;
    list.push({ b: x.e.b, A, name, gate: x.e.gate || null, slot, R: R2, shots: R2.shots, area: A.mode !== 0, line: !!A.line });
  }
  return list.length || skip.length ? { list, skip } : null;
}
/* ------------------------------------------------------------------ Situation */
/* The situation of this one attack, typed in by you but kept inside the game's rules: the attack's range, your move points and max AP,
   the weapon's magazine, what can grant a Re-ATK. The rules come from the game code (ActorBufActiveCond*, ActorBufPropertiesModifyInBattleBy*).
   Distances are Manhattan tiles to the target's nearest tile. */
const LIMIT_F = new Set(["br", "brin", "brout", "brx", "brm", "rng", "mov", "ammo", "apmax"]);
const FORM_R = { 2: ["m", 0], 3: ["m", 1], 4: ["m", 2], 5: ["m", 3], 6: ["m", 4], 7: ["m", 5], 30: ["c", 1], 31: ["c", 2], 64: ["all", 99] };
const SC = n => String(n || "").replace(/^(Properties)?Modify(InBattle)?By/, "");
// condition types that read the Situation (an effect failing only these still shows which inputs it reads)
const SIT_T = new Set(["apcost", "reatk", "xact", "ideal", "dist", "adist", "bdist", "lindist", "diag", "moved", "still", "thru", "turn", "nearE", "nearA", "neart", "tnear",
  "aoe", "stc", "terr", "terrs", "bcat", "ammo", "mancost", "xhp", "lasttgt", "nolink", "linkj", "cancnt", "named", "incd", "hpcmp", "ohp", "ophp", "hitr", "hpl"]);
const LATE_C = new Set(["bcat", "hitr"]), HIT_SC = new Set(["HitRate"]), CRIT_SC = new Set(["CriticalRate"]);
const SITN = (v, d) => v === undefined || v === null || v === "" || !Number.isFinite(+v) ? d : +v;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const SDIRS = ["line", "diag", "other"];
const SC_WORD = {
  TargetDistance: "per tile to the target", MoveDistanceOnlyAttacker: "per tile moved", TargetDistanceWithSkillSelectGrid: "by distance from the area's centre",
  LeftMovePoint: "per tile of movement left", TerrainActorCount: "per unit on your field", NearbyActorCount: "by units nearby", TargetCount: "per unit the attack covers",
  OwnScopeBufCategoryTargetNum: "per marked enemy", AllActorBufCategoryNum: "per Appointed ally", BufCategoryEnhance: "per buff you carry",
  BufCategorySetInfo: "per buff carried", TargetBufCategorySetInfo: "per Scar on the target", DefenderActorDamgeMulti: "by your DMG taken down",
  SkillApCost: "by the skill's AP cost", CurrentAp: "by AP before the attack", HpLoss: "by HP lost", SkillManualBufLevelCost: "per Fury stack spent",
  CurrEquipmentDefaultSkillSelectableGrid: "per enemy in your weapon's range", HitRate: "by your hit chance", CriticalRate: "by your crit chance",
  BufLevel: "per Euphoria stack"
};
// a value per level of a buff names that buff
// a value per level of one of your buffs (PropertiesModifyByBufLevel), and the buff it reads (Euphoria: its count)
const perLv = e => !!(e.sc && SC(e.sc) === "BufLevel" && !e.tgt && (e.sp || [])[1]);
const perLvB = e => EUPH().has((e.sp || [])[0]) ? e.sp[0] : lvKey(e);
/* a value that scales with a count ('per Fury stack spent', 'per tile to the target'): the value now, then the value per unit
   and its cap from the effect's own parameters (the same ones scVal reads), as a value per level reads; null for any other effect */
const SC_UNIT = {
  TargetDistance: p => [p[0], p[1] != null && p[2] != null ? p[0] * (Math.trunc(p[2]) - Math.trunc(p[1]) + 1) : null],
  MoveDistanceOnlyAttacker: p => [p[0], p[1] != null ? p[0] * Math.trunc(p[1]) : null], LeftMovePoint: p => [p[0], p[2]], TerrainActorCount: p => [p[3], p[4]],
  TargetCount: p => [p[0], p[1]], OwnScopeBufCategoryTargetNum: p => [p[3], p[4]], AllActorBufCategoryNum: p => [p[2], p[3]],
  BufCategoryEnhance: p => [p[0], p[1] != null ? p[0] * Math.trunc(p[1]) : null], BufCategorySetInfo: p => [p[1], p[2]], TargetBufCategorySetInfo: p => [p[1], p[2]],
  SkillManualBufLevelCost: p => [p[2], p[3]], CurrEquipmentDefaultSkillSelectableGrid: p => [p[1], p[2]], BufLevel: p => [p[1], p[2]]
};
const scPerTxt = (e, val) => {
  if (!e.sc || perLv(e)) return null; const w = scWord(e), f = SC_UNIT[SC(e.sc)];
  if (!f || !/^per /.test(w)) return null;
  const [u, cap] = f(e.sp || []); if (!u || !Number.isFinite(u)) return null;
  return `now ${sgn(val, e.f)} (${sgn(u, e.f)} ${w}${cap && Number.isFinite(cap) && Math.abs(cap) > Math.abs(u) + 1e-9 ? `, up to ${sgn(cap, e.f)}` : ""})`;
};
const scWord = e => SC(e.sc) === "BufLevel" && e.lb && !EUPH().has((e.sp || [])[0]) ? `per level of ${e.lb[0]}${(e.sp || [])[2] != null && e.sp[1] && e.lb[1] > 1 && Math.abs(e.sp[2] / e.sp[1]) < e.lb[1] - 1e-9 ? `, up to ${sgn(e.sp[2], e.f)}` : ""}` : SC_WORD[SC(e.sc)] || "by the situation";
/* limits from the setup: ideal range (base / closer / farther by weapon type), attack range, movement, magazine, max AP; only effects
   whose conditions hold without the Situation (they set its bounds) */
/* a row's on state as compute() decides it before its conditions: RA rows by their trigger, Code rows (skills you cast) off until ticked */
// a level-only row follows its buff's level, whatever its tick; a stacking buff on any row counts while its level is 1 or more.
// a stored tick counts only where compute() reads it: a Code row's tick (cast before this attack) and the tick of a row's undecided /
// after-the-attack effects (checked per effect below); a stale tick on a row the bench decides (Venus MK7 unticked in an older save) is ignored
/* a row the bench decides can be forced with its auto / on / off menu (the bench can't cover every case, so you can correct it):
   s.ovr = {key: "on" | "off"} (no key: auto, the bench decides). on: every effect of the row counts,
   its conditions taken as met (situation facts, setup facts, levels a condition checks, cast-time and late checks, 'gained after ...');
   a stacking part still counts by its one level (Situation > Your buffs), per-shot / per-part checks stay shot by shot, a 'N% chance'
   counts as fired, a random pick (one of n) stays rolled. off: none of its effects count (limits, aiming, levels it gives, follow-ups). Both
   hold in every round of the attack. (The buffs its skill / module holds stay held, so another row that checks one, 'Eruption Mod
   held', is unchanged: off switches off only what its row shows; the forced-off line names such buffs.) The row's structural filters
   (another weapon type or class, the after-attack / earlier-cast split) stay. Not for RA rows (their chance select) or rows whose effects are all stacking buffs (their level is the one input).
   Precedence: the row's override > the Situation's inputs. The key carries the row's effects, so another feature in the same slot or another
   module level never inherits it. A weapon's own rows (built-in, refits, drop ability, and their 'from an earlier cast' rows) are keyed by
   the slot that carries the weapon (src.wslot, 'LH:opt:1|...'): the other weapon's slot prefix in a both-weapon attack ('LH:wfx:0') is
   dropped and the carrying slot put in front, so one weapon has one key whichever hand attacks, and two weapons never share one (Fregata's
   Fate's Aria and Blaze Howl carry refits with the same ids; Ada's two Excalibur - EX). fx ids are game ids (P200031): stable across rebuilds */
const ovrK = src => (src.wslot ? src.wslot + ":" : "") + String(src.key).replace(/^(cast:)?(?:RH|LH|RS|LS|BK):/, "$1") + "|" + [].concat(src.fx || []).join(",");
const ovrOf = (s, src, W) => {
  const o = s && s.ovr; if (!o || src.kind === "ra" || lvOnlySrc(src, W)) return null;
  const v = o[ovrK(src)]; return v === "on" || v === "off" ? v : null;
};
const setOvr = (s, k, v) => { if (v === "on" || v === "off") (s.ovr ||= {})[k] = v; else if (s.ovr) { delete s.ovr[k]; if (!Object.keys(s.ovr).length) delete s.ovr; } };
const rowOnFor = (s, src, W) => {
  if (src.kind === "ra") return false;
  const lo = lvRowOn(s, src, W); if (lo != null) return lo;
  const fo = ovrOf(s, src, W); if (fo) return fo === "on";
  if (src.kind === "code") return s.tog[src.key] === true;
  return src.only !== "after" || s.tog[src.key] === true;
};
// (the tick of a row compute() shows greyed in this attack, s._greyT, is not read by the limits and the aiming: Talent:
// Valkyrie's stale tick with Awakening empty)
const limTick = (s, src) => s.tog[src.key] === true && !(s._greyT && s._greyT.includes(src.key));
function limitSums(srcs, ctx, W, s) {
  const out = { br: {}, brin: {}, brout: {}, rng: {}, ammo: {}, mov: 0, apmax: 0, brx: 0, brm: 0 };
  for (const src of srcs) {
    const fo = ovrOf(s, src, W); if (fo === "off") continue;               // forced off: none of its limits, its stacking ones too
    const rOn = rowOnFor(s, src, W);
    for (const k of src.fx) for (const e of D.fx[k] || []) {
      const lv = isLv(e);
      if (!rOn && !(lv && src.kind !== "ra")) continue;
      if (!LIMIT_F.has(e.f) || (!fo && !lv && isAfter(e) && !limTick(s, src) && !s._held) || (e.wc && e.wc !== W.cat)) continue;
      if (fo && src.only && (src.only === "after") !== isAfter(e)) continue;   // (a forced row: only the effects its row shows)
      if (src.afterN != null && !(isAfterCast(e) && (e.n || "") === src.afterN)) continue;
      if (castSkip(src, e)) continue;
      if (lv && lvOf(s, lvKE(e)) < 1) continue;                                // Trickster's range: while its level is 1 or more
      if (s._held && e.ids && !e.ids.some(b => s._held.has(b))) continue;       // test harness only (s._held): only the buffs it says are held
      // forced on: counts with its conditions taken as met
      if (fo === "on") { const v = effVal(s, src, e); if (e.f === "mov" || e.f === "apmax" || e.f === "brx" || e.f === "brm") out[e.f] += v; else out[e.f][e.wt || ""] = (out[e.f][e.wt || ""] || 0) + v; continue; }
      ctx.held = e.tgt ? "target" : "you";
      // counts when no condition fails and any undecided one is ticked on its row (taken as met by the test harness; a stacking buff: its level)
      const st = (e.c || []).filter(c => !LATE_C.has(c.t) && c.t !== "after" && !(lv && isAfterC(c)) && !(src.afterN != null && (c.t === "prob" || c.t === "pick")) && !(src.castN != null && c.t === "castc"))
        .map(c => c.t === "prob" || c.t === "pick" ? false : condState(c, ctx, W));
      // (a stacking buff's after-the-attack check is left out above; any other undecided one still needs the row's tick)
      if (st.includes(false) || (st.includes(null) && !(limTick(s, src) || s._held))) continue;
      const v = effVal(s, src, e);
      if (e.f === "mov" || e.f === "apmax" || e.f === "brx" || e.f === "brm") out[e.f] += v; else out[e.f][e.wt || ""] = (out[e.f][e.wt || ""] || 0) + v;
    }
  }
  ctx.held = "you";
  return out;
}
/* the weapon's Normal Attack: its own default attack (Rocket Strategic Strike, Rail Gun High-Speed Projectile, Blaster Shock Wave),
   else its type's; null for a weapon with neither (Arashi Energy Storage Cabins) */
function normalOf(W) {
  if (!W) return null;
  if (W.na) return W.na;
  if (W.nona) return null;
  return D.normal[W.type] || { m: W.nm, h: W.shots, n: "Normal Attack" };
}
function normalLabel(N) { return N && N.n && N.n !== "Normal Attack" ? N.n + " (Normal Attack)" : "Normal Attack"; }
/* the terrain under the target / under you, from its one store (Situation: s.sit.tTgt / tYou = {cat, by}); none when unset */
const terrOf = o => {
  const x = o || { cat: "none", by: "you" };
  return { cat: x.cat || "none", by: x.by || "you", side: x.by === "enemy" ? "enemy" : x.by === "map" ? "env" : "you", mine: (x.by || "you") === "you" };
};
/* the units around you, made to agree within one setup. Each count box is an area: Manhattan r ('within r tiles'), the
   (2r+1)x(2r+1) square ('c'), the whole map ('all'); a box can't hold fewer than any box nested inside it (Manhattan r inside the square r
   inside Manhattan 2r; every area inside the map), so each count reads the largest one nested in it, and the panel shows that as the box's
   minimum ('at least N: <box>'). Other counts nested in them: the enemies inside your normal-attack range (inside its reach; when the range
   starts next to you and covers a whole area it is that area's box plus the target, read from that box alone: one input), enemies with Timidity right next to you (the 3x3 square), Crash / Intimidation holders (the largest square
   the setup's checks read), Magnetic Lock holders and enemies with Scars (the map); your side: Appointed holders and your units on your
   Defense Field (the map; you may be one of them), Asuka / Rei deployed (one ally each). Every box counts OTHER units: the enemies' boxes leave
   the target out (a reader adds it when it stands inside), the allies' boxes leave you out, 'Other allies still standing (anywhere)' (aAll,
   start 1) too. With nothing typed every count keeps its default. o: {dist, cheb} (dist null: the target's tile isn't known yet, so no reader
   counts it), ring: the normal attack's [form, min, max, full disk], holdR: [form, r] */
function unitCounts(u, o) {
  // (a count is a whole number, and a box never counts more units than its area holds: the same capacity the panel gives the
  // box as its maximum, so a count typed at one distance isn't read above what the box shows at another)
  const st0 = u.st || {}, num = (v, d) => Math.max(0, Math.round(SITN(v, d || 0)));
  const tIn = (m, r) => o.dist == null ? 0 : m === "all" ? 1 : (m === "c" ? o.cheb : o.dist) <= r ? 1 : 0;
  const inside = (a, b) => b[0] === "all" || (a[0] !== "all" && (a[0] === "c" && b[0] === "m" ? 2 * a[1] <= b[1] : a[1] <= b[1]));
  const ringN = r => 2 * r * (r + 1), sqrN = r => (2 * r + 1) ** 2 - 1, capN = (n, c) => Math.min(n, Math.max(0, c));
  const E = [], A = [], ET = [], AT = [], ent = (o2, f) => Object.entries(o2 || {}).forEach(([k, v]) => f(k, num(v)));
  ent(u.eN, (k, n) => E.push({ a: ["m", +k], n: capN(n, ringN(+k) - tIn("m", +k)), k: "eN:" + k }));
  ent(u.eSq, (k, n) => E.push({ a: ["c", +k], n: capN(n, sqrN(+k) - tIn("c", +k)), k: "eSq:" + k }));
  E.push({ a: ["all", 99], n: capN(num(u.eAll), 30), k: "eAll" });
  for (const sh of ["m", "c"]) ent((u.eT || {})[sh], (k, n0) => { const n = capN(n0, 20); ET.push({ a: [sh, +k], n, k: `eT:${sh}:${k}` }); E.push({ a: ["all", 99], n, k: `eT:${sh}:${k}` }); });
  // (the normal attack's ring: when it starts next to you and covers a whole Manhattan / square area, it IS the box of that area, so its
  // count is 1 + that box's and it has no store of its own (one input: that box); else its own count, inside its reach)
  const full = !!(o.ring && o.ring[3]), ringK = full ? (o.ring[0] === "c" ? "eSq:" : "eN:") + o.ring[2] : null;
  if (o.ring && !full) E.push({ a: [o.ring[0], o.ring[2]], n: capN(num(u.inRng, 1), 20) - 1, k: "inRng" });
  E.push({ a: ["c", 1], n: num(st0.timid) - tIn("c", 1), k: "st:timid" });
  if (o.holdR) for (const k of ["crash", "intim"]) E.push({ a: o.holdR, n: num(st0[k]) - tIn(o.holdR[0], o.holdR[1]), k: "st:" + k });
  for (const k of ["maglock", "scarsAll"]) E.push({ a: ["all", 99], n: num(st0[k]) - 1, k: "st:" + k });
  ent(u.aN, (k, n) => A.push({ a: ["m", +k], n: capN(n, Math.min(9, ringN(+k))), k: "aN:" + k }));
  ent(u.aSq, (k, n) => A.push({ a: ["c", +k], n: capN(n, Math.min(9, sqrN(+k))), k: "aSq:" + k }));
  A.push({ a: ["all", 99], n: capN(num(u.aAll, 1), 9), k: "aAll" });
  ent(u.aT, (k, n0) => { const n = capN(n0, 9); AT.push({ a: ["m", +k], n, k: "aT:" + k }); A.push({ a: ["all", 99], n, k: "aT:" + k }); });
  for (const k of ["appointed", "field"]) A.push({ a: ["all", 99], n: num(st0[k]) - 1, k: "st:" + k });
  A.push({ a: ["all", 99], n: (st0.asuka ? 1 : 0) + (st0.rei ? 1 : 0), k: "st:asuka" });
  // the largest count nested in area a (skip: the box itself, for its own minimum); r >= 99: the whole map
  const low = (L, a, skip) => L.reduce((b, c) => c.k !== skip && c.n > b.n && inside(c.a, a) ? { n: c.n, k: c.k } : b, { n: 0, k: null });
  const aOf = (m, r) => m === "all" || r >= 99 ? ["all", 99] : [m, r];
  const boxOf = k => {
    const [a, b, c] = k.split(":");
    return a === "eN" ? [E, ["m", +b]] : a === "eSq" ? [E, ["c", +b]] : a === "eAll" ? [E, ["all", 99]] : a === "aN" ? [A, ["m", +b]] : a === "aSq" ? [A, ["c", +b]]
      : a === "aAll" ? [A, ["all", 99]] : a === "eT" ? [ET, [b, +c]] : a === "aT" ? [AT, ["m", +b]] : null;
  };
  const inRng = full ? 1 + low(E, [o.ring[0], o.ring[2]]).n : clampN(Math.round(SITN(u.inRng, 1)), 1, 20);
  return {
    enemiesWithin: (m, r) => tIn(m, r) + low(E, aOf(m, r)).n,
    alliesWithin: (m, r) => low(A, aOf(m, r)).n,
    eTn: (m, r) => low(ET, [m, r]).n,
    aTn: r => low(AT, ["m", r]).n,
    inRng, ringK,
    // a box's minimum from the boxes nested in it, and its count as read (the larger of the two); inRng in the full case: 1 + its area's
    min: k => k === "inRng" ? (full ? (x => ({ n: 1 + x.n, k: x.k }))(low(E, [o.ring[0], o.ring[2]], ringK)) : { n: 1, k: null }) : (B => B ? low(B[0], B[1], k) : { n: 0, k: null })(boxOf(k)),
    val: k => k === "inRng" ? inRng : (B => B ? low(B[0], B[1]).n : 0)(boxOf(k))
  };
}
/* the largest square (or area) the setup's 'Enemies with Crash / Intimidation within N tiles' checks read (Lunar Snare: 1 or 2): the area
   those holders stand in, for unitCounts (the largest, so the bound holds whichever the count was meant for) */
function holdArea(srcs) {
  let a = null; const walk = c => { if (c.t === "neart" && (c.filt === 10 || c.filt === 11) && (!a || (c.r || 0) > a[1])) a = [c.m === "c" ? "c" : "m", c.r || 0]; (c.items || []).forEach(walk); };
  for (const src of srcs) for (const k of [].concat(src.fx || [])) for (const e of D.fx[k] || []) (e.c || []).forEach(walk);
  return a;
}
/* the Situation for this attack: your inputs (s.sit), clamped to what the rules allow, and the values the conditions read */
function sitResolve(s, ctx, sk, W, st, star, lim, tg) {
  const u = s.sit || (s.sit = {}), A = sk.A || {}, N = normalOf(W) || {};
  const rg = A.rg || N.rg || [1, 1, []];
  const rangeAdd = Math.max(0, Math.round((lim.rng[W.type] || 0) + (lim.rng[""] || 0)));
  const maxR = rangeAdd > 0 && rg[2] && rg[2].length ? rg[2][Math.min(rangeAdd, rg[2].length) - 1] : rg[1];
  const minR = Math.min(Math.max(1, rg[0] || 0), maxR), rangeExt = maxR - rg[1];
  const sq = rg[3] || 0, maxD = sq ? 2 * maxR : maxR;          // farthest Manhattan distance the form reaches
  // ideal range (BestRangeDistanceGetInternal): [base - min(base, closer), base + max(0, farther) + (Hyperfire: the extra attack range actually
  // gained)]; no base and nothing farther = none. KALAVINKA (MergeAssistHandBestRangeDistance): the other hand's weapon type's range counts too
  const realAdd = rg[2] ? Math.min(rangeAdd, rg[2].length) : 0;
  const iv = wt => {
    const b = Math.trunc(lim.br[wt] || 0), f = Math.max(0, Math.trunc(lim.brout[wt] || 0)), n = Math.min(b, Math.trunc(lim.brin[wt] || 0));
    return { base: b, lo: b - n, hi: b + f + (b > 0 && lim.brx ? realAdd : 0), has: b > 0 || f > 0 };
  };
  const I0 = iv(W.type), other = lim.brm ? (ctx.wts || {})[{ LH: "RH", RH: "LH" }[ctx.slot]] : null, I1 = other && other !== W.type ? iv(other) : null;
  const base = I0.base, ideal = [I0.lo, I0.hi], idealHas = I0.has || !!(I1 && I1.has), ivs = [I0, I1].filter(x => x && x.has);
  const dDef = base > 0 ? clampN(base, minR, maxR) : maxR;
  const chebOf = (d, dr) => dr === "diag" ? d / 2 : dr === "other" ? d - 1 : d;    // diagonal steps count 1 (Square areas)
  const okDir = (d, dr) => (dr !== "diag" || (d >= 2 && d % 2 === 0)) && (dr !== "other" || d >= 3) && !(sq === 2 && dr === "other") && !(sq === 3 && dr !== "diag")
    && (!sq || (chebOf(d, dr) <= maxR && chebOf(d, dr) >= minR));
  let dist = clampN(Math.round(SITN(u.dist, dDef)), minR, maxD);
  while (dist > minR && !SDIRS.some(dr => okDir(dist, dr))) dist--;
  const dir = okDir(dist, u.dir || "line") ? u.dir || "line" : SDIRS.find(dr => okDir(dist, dr)) || "line";
  const cheb = chebOf(dist, dir);
  const foot = tg.foot || 0, anc = clampN(Math.round(SITN(u.anc, 0)), 0, foot);
  // at ideal range: the target's tile, or (a boss on several tiles) any tile it covers within the attack's reach, inside an ideal interval
  const inIdeal = ivs.some(I => (dist + anc >= I.lo && dist + anc <= I.hi) || [...Array(foot + 1).keys()].some(k => dist + k <= maxR && dist + k >= I.lo && dist + k <= I.hi));
  const locked = !!ctx.counter || ctx.stage === 32;                                     // a counter / link attack: not your own move
  const legs = (D.sts[partST(s, "Legs")] || st).parts.Legs;
  const mov = Math.max(0, (legs.mov || 3) + (lim.mov || 0));
  const moved = locked ? 0 : clampN(Math.round(SITN(u.moved, 0)), 0, Math.floor(mov));
  const apMax = ((star.ap && star.ap[1]) || 5) + Math.round(lim.apmax || 0);
  // each stack costs 1 AP more, and you spend at most the Fury you hold (Situation > Your buffs, ctx.mcHeld)
  const furyHeld = A.mc ? (ctx.mcHeld != null ? ctx.mcHeld : A.mc[1]) : 0;
  const skAp = apcOf(s, sk) || 0;                                                     // the AP cost box, else the listed cost
  // 'AP before the attack' is the one AP input; typed, it also bounds a Fury spend (empty: max AP)
  const apT = u.ap != null && u.ap !== "" && isFinite(+u.ap) ? clampN(Math.round(+u.ap), Math.min(skAp, apMax), apMax) : null;
  const furyAp = (apT != null ? apT : apMax) - skAp, furyMax = A.mc ? Math.max(0, Math.min(A.mc[1], furyAp, furyHeld)) : 0;
  const fury = A.mc ? clampN(Math.round(SITN(u.fury, furyMax)), 0, furyMax) : 0;
  const apCost = Math.max(0, skAp + fury);                                            // Fury Unleashed: +1 AP per stack spent
  const ap = clampN(Math.round(SITN(u.ap, Math.max(apCost, apMax - 2))), Math.min(apCost, apMax), apMax);
  const ammoMax = W.ammo ? W.ammo + Math.round(lim.ammo[W.type] || 0) : 0;
  const ammo = ammoMax ? clampN(Math.round(SITN(u.ammo, ammoMax)), 1, ammoMax) : 0;      // an empty weapon is reloading and can't fire
  // units around (one count function, the boxes made to agree): the target counts when inside; the normal attack's range for
  // 'Enemies inside your weapon's normal-attack range' (its own reach with this setup's range bonus)
  const nrg = N.rg, nMax = nrg ? (rangeAdd > 0 && nrg[2] && nrg[2].length ? nrg[2][Math.min(rangeAdd, nrg[2].length) - 1] : nrg[1]) : 0;
  const nMin = nrg ? Math.min(Math.max(1, nrg[0] || 0), nMax) : 0;
  const UC = unitCounts(u, { dist, cheb, ring: nrg ? [nrg[3] ? "c" : "m", nMin, nMax, nMin <= 1 && (nrg[3] || 0) <= 1] : null, holdR: ctx.holdR || null });
  const { enemiesWithin, alliesWithin, eTn, aTn } = UC;
  const tTgt = terrOf(u.tTgt), tYou = terrOf(u.tYou);
  // (counts are whole numbers; 'Your DMG taken down from elsewhere' is a percentage)
  const st0 = u.st || {}, stn = k => Math.max(0, k === "dtd" ? SITN(st0[k], 0) : Math.round(SITN(st0[k], 0)));
  // the target can retaliate (TargetCanCounterAttack): a class it can counter, not marked 'target cannot retaliate' (SkillFlag 4),
  // and one of its counter weapons reaches you (Rhombus forms by Manhattan, Square forms by Chebyshev). A counter weapon on a
  // part ticked under Already destroyed doesn't count (IsSlotCanUse4CounterAttack reads the slot's weapon on its part:
  // ActorActiveSkillCounterAttackGet, AvailableCounterActiveSkillsGet), and the counter weapons are those of the
  // set it carries (the target panel's weapon choice). T.dead, not a fight's T._alive: Attacks to kill keeps its own rule
  const reachW = w => { const d = w.sq ? cheb : dist; return d >= w.min && d <= w.max; }, dead0 = T.dead && T.dead.size ? T.dead : null;
  const ctrIn = tgCtr(T.target).filter(reachW), ctrUp = ctrIn.filter(w => !(dead0 && dead0.has(w.part)));
  const ctrAuto = !((A.sf || 0) & 4) && T.hp > 0 && ctrUp.length > 0;
  const ctrWhy = (A.sf || 0) & 4 ? "no: this attack can't be retaliated against" : T.hp <= 0 ? "no" : ctrUp.length ? "yes at this distance"
    : ctrIn.length ? "no: " + [...new Set(ctrIn.map(w => w.part))].map(p => {
      const ws = ctrIn.filter(w => w.part === p);
      return `its ${p.toLowerCase()}, which ${ws.every(w => w.n === "Unarmed") ? "strikes unarmed" : `carries its ${ws.filter(w => w.n !== "Unarmed").map(w => w.n).join(" and ")}`},`;
    }).join(" and ")
      + ` ${ctrIn.length > 1 && new Set(ctrIn.map(w => w.part)).size > 1 ? "are" : "is"} ticked under Already destroyed`
      : tgAlt(T.target) && (tg.ctr || []).some(w => reachW(w) && !(dead0 && dead0.has(w.part))) ? `no at this distance: it carries ${gearName(tgGear(T.target))} (set under ${tg.boss}'s weapons)`
        : "no at this distance";
  // 'Yes' is not a second input for what the bench works out: it is offered (and a stored 'yes' read) only when the 'no' comes
  // from the distance alone: no counter weapon reaches you, and one stands out of reach (a range bonus from its allies or the stage the bench
  // can't see); never when a counter weapon in reach is ticked under Already destroyed (White Flame's Strike SG at 2 tiles), none stands,
  // this attack's own rule says no or 'yes' is already worked out. 'No' stays (a stun, Shield Disable ... the bench can't see)
  const ctrStand = tgCtr(T.target).filter(w => !(dead0 && dead0.has(w.part)));
  const ctrYesOK = !((A.sf || 0) & 4) && T.hp > 0 && !ctrIn.length && ctrStand.length > 0;
  const ctrMode = u.ctr === "no" ? "no" : u.ctr === "yes" && ctrYesOK ? "yes" : "auto";
  const canCounter = ctrMode === "yes" ? true : ctrMode === "no" ? false : ctrAuto;
  /* one tick per fact, so rows can't disagree: 'At ideal range' is ONE tick (s.sit.ideal); unset, it follows what
     the distance gives (inIdeal, kept for the notes); set, it wins over the distance. Every 'ideal' condition reads idealOn. 'The target is
     in range of both your hand weapon and your backpack weapon' (s.sit.bkr): ticked unless you untick it (stored only as false).
     Precedence: a row's override (Bonuses & buffs) > the fact tick > the numbers */
  const idealSet = typeof u.ideal === "boolean", idealOn = idealSet ? u.ideal : inIdeal;
  return {
    u, A, minR, maxR, maxD, sq, okDir, rangeAdd, rangeExt, furyMax, furyHeld, furyAp, ideal, idealHas, inIdeal, idealSet, idealOn, idealIv: ivs.map(I => [I.lo, I.hi]), bkr: u.bkr !== false,
    base, dist, dir, cheb, foot, anc, distA: dist + anc, mov, moved, locked, thru: moved > 0 && !!u.thru,
    fury, apMax, apCost, skAp, apL: sk.ap, ap, ammoMax, ammo, ammoFull: ammoMax ? ammo >= ammoMax : true, turn: Math.max(1, Math.round(SITN(u.turn, 2))),
    enemiesWithin, alliesWithin, eTn, aTn, area: Math.max(1, Math.round(SITN(u.area, 1))), aoeD: Math.max(0, Math.round(SITN(u.aoeD, 0))), tTgt, tYou,
    bufE: Math.max(0, Math.round(SITN(u.bufE, 0))), debW: Math.max(0, Math.round(SITN(u.debW, 0))), xhp: !!u.xhp, last: !!u.last, link: Math.max(0, Math.round(SITN(u.link, 0))),
    inRng: UC.inRng, cnt: UC, reatk: !locked && !!u.reatk, reSame: !locked && !!u.reatk && !!u.reSame, ctrAuto, ctrWhy, canCounter, ctrYesOK, ctrMode,
    st: {
      stealth: !!st0.stealth, shortc: !!st0.shortc, pushb: !!st0.pushb, asuka: !!st0.asuka, rei: !!st0.rei, reload: !!st0.reload, scarsT: stn("scarsT"), scarsAll: stn("scarsAll"),
      crash: stn("crash"), intim: stn("intim"), timid: stn("timid"), maglock: stn("maglock"), appointed: stn("appointed"), dtd: stn("dtd"), field: stn("field"),
      euph: Math.min(EUPH_MAX(), stn("euph"))
    },
    use: new Map()
  };
}
/* aiming: the attack skill aims, or an aim effect in your setup covers this weapon (mask 0 = any weapon) and its conditions hold */
function aimFromSetup(srcs, ctx, W, s) {
  for (const src of srcs) {
    const fo = ovrOf(s, src, W); if (fo === "off") continue;               // forced off: it doesn't aim
    const rOn = rowOnFor(s, src, W);
    for (const k of src.fx) for (const e of D.fx[k] || []) {
      const lv = isLv(e);
      if (!rOn && !(lv && src.kind !== "ra")) continue;
      if (e.f !== "aim" || (!fo && !lv && isAfter(e) && !limTick(s, src) && !s._held) || (e.m && !(e.m & (D.wtBits[W.type] || 0)))) continue;
      if (fo && ((e.wt && e.wt !== W.type) || (e.wc && e.wc !== W.cat) || (src.only && (src.only === "after") !== isAfter(e)))) continue;
      if (src.afterN != null && !(isAfterCast(e) && (e.n || "") === src.afterN)) continue;
      if (castSkip(src, e)) continue;
      if (lv && lvOf(s, lvKE(e)) < 1) continue;
      if (s._held && e.ids && !e.ids.some(b => s._held.has(b))) continue;
      if (fo === "on") return true;                                         // (forced on: its conditions taken as met)
      ctx.held = "you"; let ok = true, ask = false;
      for (const c of e.c || []) { if (LATE_C.has(c.t) || c.t === "after" || (lv && isAfterC(c)) || (src.afterN != null && (c.t === "prob" || c.t === "pick")) || (src.castN != null && c.t === "castc")) continue; const r = c.t === "prob" || c.t === "pick" ? false : condState(c, ctx, W); if (r === false) { ok = false; break; } if (r === null) ask = true; }
      if (ok && (!ask || limTick(s, src) || s._held)) return true;
    }
  }
  return false;
}
/* each stacking buff's level for this attack: its start (what its input shows while empty), floor and cap, from the rows that give
   it. A giver gives the start when its row is on without the level: a Code row (a skill you cast before this attack) when ticked; an effect
   gained after an attack, or with a condition the bench can't check, when its row is ticked; any other when no condition fails. A
   level-only row has no tick (Courage Burst, Fearlessness: a Code row whose only effect is the buff), so it never gives the start itself. Decided givers and ticked Code rows also set the floor, 1: this attack has it (Frida's Secret Execution, Thundercloud
   FCS gained at the attack's start, Serenity, a skill you cast before it). Start: what the kit gives by your first action, else 1; with no
   giver, the kit's start, else 1 when your kit holds it from the start, else 0. Cap: the buff's own (the highest member of a family that can
   apply) + the kit's raise */
function lvPass(srcs, ctx, W, s, own) {
  const keys = new Map(), hold = ctx.held, grp = ctx.grp, short = rowShort, askSrc = new Set();
  for (const src of srcs) {
    if (src.kind === "ra") continue;
    const lo = lvOnlySrc(src, W), its = [], fo = ovrOf(s, src, W); let und = false;
    for (const e of lvEffs(src, W)) {
      if (!isLv(e)) continue;
      const k = lvKE(e); let K = keys.get(k);
      if (!K) keys.set(k, K = { k, b: e.b, tgt: !!e.tgt, e, lig: -1, cap0: 0, capAll: 0, mem: new Set(), memAll: new Set(), giv: [], minBy: [], rows: [], fail: true });
      if (!K.rows.includes(src.label)) K.rows.push(src.label);
      K.capAll = Math.max(K.capAll, e.stk); K.memAll.add(e.b);
      // a forced row: off, it can't give the level; on, it gives it as a decided row whose conditions hold
      if (fo === "off") continue;
      if (fo === "on") { its.push({ e, K, st: true }); continue; }
      ctx.held = e.tgt ? "target" : "you"; ctx.grp = src.group;
      let st = true, u = false;
      for (const c of e.c || []) {
        if (PH_C.has(c.t) || LATE_C.has(c.t) || (c.t === "castc" && src.castN != null)) continue;
        if (isAfterC(c) || c.t === "prob" || c.t === "pick") { st = null; continue; }
        const r = condState(c, ctx, W); if (r === false) { st = false; break; } if (r === null) { st = null; u = true; }
      }
      ctx.held = hold; ctx.grp = grp;
      if (st === false) continue;                       // can't be held in this attack: a condition of the setup or the attack fails
      if (u && ctx.sit && !s._held) und = true;         // a condition the bench can't check (not 'gained after'): the row asks, its tick counts
      its.push({ e, K, st });
    }
    if (lo && und) askSrc.add(src.key);
    const tick = fo ? fo === "on" : s.tog[src.key] === true && !(lo && !und);
    for (const { e, K, st } of its) {
      K.fail = false; K.cap0 = Math.max(K.cap0, e.stk); K.mem.add(e.b);
      if ((e.lig || 0) > K.lig) { K.lig = e.lig || 0; K.e = e; }
      const code = src.kind === "code", lab = short(src.label);
      if ((code ? tick : st === true || tick) && !K.giv.includes(lab)) K.giv.push(lab);
      if ((code ? tick : st === true) && !K.minBy.includes(lab)) K.minBy.push(lab);
    }
  }
  const def = new Map(), min = new Map(), cap = new Map(), mx = (M, L) => Math.max(0, ...[...L].map(b => (M && M.get(b)) || 0));
  for (const K of keys.values()) {
    // no row can give it in this attack: no start, but a value typed for it (read by a check) stays within the buff's cap
    if (K.fail) { cap.set(K.k, K.capAll + (K.tgt ? 0 : mx(ctx.lvMaxAdd, K.memAll))); continue; }
    const c = K.cap0 + (K.tgt ? 0 : mx(ctx.lvMaxAdd, K.mem)), st0 = K.tgt ? 0 : mx(ctx.lvStart, K.mem), mn = Math.min(c, K.minBy.length ? 1 : 0);
    K.start = K.giv.length ? Math.max(1, st0) : st0 > 0 ? st0 : !K.tgt && [...K.mem].some(b => own.has(b)) ? 1 : 0;
    cap.set(K.k, c); min.set(K.k, mn); def.set(K.k, clampN(K.start, mn, c));
  }
  // the target's Instability count has its cap (5) even when nothing in this setup gives it (other units' Instability)
  const U = unbFam(); if (U && !cap.has(U.k)) cap.set(U.k, famCap(U.k));
  return { def, min, cap, keys, askSrc };
}
/* the buffs a 'level >= N' check or a skill version reads that only this pilot's kit gives and that a row of this setup gives: 1 when
   that row is on without the check (a Code row, a skill you cast before this attack: its tick; an effect gained after an attack or with a
   condition the bench can't check: its row's tick; else no condition fails), 0 when every giver is off, null when one depends on something
   you'd tick (the usual rules decide then). Kelly's Venus MK7 aim reads Improved Fire II from Skill: Special Load; Paloma's Directional Rack
   comes from Skill: Directional Rack (cast before: BufIds4SelfBeforeCastSkill); Valkyrie's Awakening child from its own Awakening >= 1 */
// the buffs a 'level >= N' check of this setup or a version of the attacking skill reads
function lvReads(srcs, s, W) {
  const rd = new Set(), walk = c => { if (c.t === "buf") rd.add(c.v); (c.items || []).forEach(walk); };
  for (const src of srcs) for (const k of [].concat(src.fx || [])) for (const e of D.fx[k] || []) (e.c || []).forEach(walk);
  const A0 = s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].atk[W.type];
  if (A0) for (const v of A0.var || []) for (const c of v.cc || []) if (!c.bc) rd.add(c.b);
  return rd;
}
const codeSkill = src => src.kind === "code" && /^(sk|code):/.test(src.key) ? D.skills[src.key.replace(/^(sk|code):/, "")] || null : null;
function lvGiveOn(srcs, ctx, W, s) {
  const rd = lvReads(srcs, s, W);
  const give = new Map(), giveBy = new Map(), hold = ctx.held, grp = ctx.grp;
  // (a buff a skill spends has its own level input: no row decides it)
  const put = (b, v, lab, code, fo) => {
    if (!rd.has(b) || !kitOnly(b, s.pilot) || MCB().has(b)) return; const o = give.get(b);
    give.set(b, o === 1 || v === 1 ? 1 : o === null || v === null ? null : 0);
    const L = giveBy.get(b) || giveBy.set(b, []).get(b); if (!L.some(x => x.lab === lab)) L.push({ lab, v, code, fo });
  };
  for (const src of srcs) {
    if (src.kind === "ra" || lvOnlySrc(src, W)) continue;
    const code = src.kind === "code", tick = s.tog[src.key] === true, fo = ovrOf(s, src, W);
    // (a forced row gives the buff (on) or not (off), whatever its tick or conditions)
    { const sk = codeSkill(src); for (const b of (sk && sk.sb) || []) put(b, fo ? +(fo === "on") : tick ? 1 : 0, src.label, !fo, fo); }
    for (const e of lvEffs(src, W)) {
      if (isLv(e) || !(e.ids || []).some(b => rd.has(b))) continue;
      let v, tk = code;                                  // tk: decided by the row's tick (else by its conditions: on / off)
      if (fo) { v = +(fo === "on"); tk = false; }
      else if (code) v = tick ? 1 : 0;
      else {
        ctx.held = e.tgt ? "target" : "you"; ctx.grp = src.group; let st = true;
        for (const c of e.c || []) {
          if (PH_C.has(c.t) || LATE_C.has(c.t) || (c.t === "castc" && src.castN != null)) continue;
          if (isAfterC(c) || c.t === "prob" || c.t === "pick") { st = null; continue; }
          const r = condState(c, ctx, W); if (r === false) { st = false; break; } if (r === null) st = null;
        }
        ctx.held = hold; ctx.grp = grp; v = st === true ? 1 : st === false ? 0 : tick ? 1 : null; tk = st === null;
      }
      for (const b of e.ids) put(b, v, src.label, tk, fo);
    }
  }
  return { give, giveBy };
}
/* the level keys this setup has an input for (Situation > Your buffs / Your debuffs on the target): its stacking buffs, the buff a skill
   version reads, a level read at 2 or more (Awakening >= 2), a value per level of one of your buffs; not a buff a row of this setup gives
   (that row decides it) */
/* a buff a skill spends (Fury Unleashed: Matilda's Fury, spent by Blazing Offensive, Suppressive Assault and Wild Storm;
   the attack's mc = [buff, its cap]) has ONE level for the setup, Situation > Your buffs: 'Fury stacks' when you attack (empty: what your
   kit gives by your first action, Dawn's Bloom's 1 at each action start, 1 more when deployed with the upgraded talent). It bounds
   'Fury stacks spent' (spent <= held) and every check on it reads it (Dawn's Bloom's DMG +25% at Fury >= 1: no tick). The game takes the
   stacks spent off at the skill's tail (ActorActiveSkillBase.SkillPipelineSkillTail: [this+0xa8] > 0 -> the skill's cost buff,
   BuffLevelDecreaseById(buff, cost)), called by SkillPipelineSkillEnd at the end of the attack stage (ActorActiveSkillAttackBase.
   SkillPipelineApplyAttackStage, after the rounds); Gusty Strike, the retaliation and Flurry Strike start after that
   (SkillPipelineSkillCoreStepsExec). So the attack's own rounds read the level held, its follow-ups the level left (held -
   spent; s._spent) */
let MCB_ = null;
function MCB() {
  if (MCB_) return MCB_;
  MCB_ = new Map();
  for (const sk of Object.values(D.skills)) for (const a of Object.values(sk.atk || {})) for (const v of [a, ...(a.var || [])])
    if (v.mc) MCB_.set(v.mc[0], Math.max(MCB_.get(v.mc[0]) || 0, v.mc[1] || 1));
  return MCB_;
}
// its name ('Fury'), from the checks or the start levels that name it
const mcName = b => {
  for (const L of Object.values(D.fx)) for (const e of L) {
    if (e.f === "lvadd" && e.lvb === b && e.lbn) return e.lbn;
    for (const c of e.c || []) if (c.t === "buf" && c.v === b && c.bn) return c.bn;
  } return String(b);
};
// its level before the attack's levels are worked out (the Situation bounds the spend with it): typed, else the start the kit gives by your
// first action (the same rows and rule as compute()'s lvStart; compute() works the attack out again if the two differ)
function mcHeldPre(s, srcs, W, ctx, b) {
  const k = lvK(b, false), cap = MCB().get(b) || 1, r = lvRaw(s, k);
  const ctx1 = { ...ctx, sit: { ...(ctx.sit || {}), turn: 1 } }, ok = (c, x) => { try { return condState(c, x, W) === true; } catch (e) { return false; } };
  let n = 0; const ea = new Map([[b, new Map()]]);
  for (const src of srcs) {
    if (src.kind === "ra" || src.castN != null || src.afterN != null || !rowOnFor(s, src, W)) continue;
    const fo = ovrOf(s, src, W);                     // (forced on, its conditions taken as met; forced off: rowOnFor drops it)
    for (const f of src.fx) for (const e of D.fx[f] || []) if (e.f === "lvadd" && e.lvb === b && !(src.only && (src.only === "after") !== isAfter(e)) && (fo === "on" || (e.c || []).every(c => ok(c, ctx1)))) {
      n += e.v; if (e.ea) ea.get(b).set(src.label, (ea.get(b).get(src.label) || 0) + e.v);
    }
  }
  // typed: held to its floor on your own attack (mcFloor), as compute() holds the final level
  const locked = !!ctx.counter || ctx.stage === 32, reatk = !locked && !!(ctx.sit ? ctx.sit.reatk : s.sit && s.sit.reatk);
  if (r != null) return clampN(r, mcFloor(b, ea, { locked, reatk }, cap).n, cap);
  return n > 0 ? clampN(n, 0, cap) : ctx.own && ctx.own.has(b) ? 1 : 0;
}
/* the floor of a buff a skill spends (Fury) on your own attack: what your kit gives it at the start of each of your turns
   (ea: {buff: Map(row -> levels)}); 0 on a Re-ATK, a counter or a link attack. {n, by: the rows} */
const mcFloor = (b, ea, S, cap) => {
  const m = ea && ea.get(b); if (!m || !m.size || !S || S.locked || S.reatk) return { n: 0, by: [] };
  const n = [...m.values()].reduce((a, v) => a + v, 0); return { n: cap == null ? n : Math.min(n, cap), by: [...m.keys()].map(l => l.replace(/^[^:]+: /, "")) };
};
function lvInputs(srcs, L, G, s, own, W) {
  const inp = new Set(), given = b => !!G.give && (G.give.get(b) === 0 || G.give.get(b) === 1);
  for (const K of L.keys.values()) if (!K.fail) inp.add(K.k);
  // a buff a skill spends: its one level, whatever level a check of this setup reads (Dawn's Bloom: Fury >= 1)
  const walkM = (c, h) => { const hh = c.h || h; if (c.t === "buf" && hh === "you" && MCB().has(c.v)) inp.add(lvK(c.v, false)); (c.items || []).forEach(y => walkM(y, hh)); };
  for (const src of srcs) for (const e of lvEffs(src, W)) (e.c || []).forEach(c => walkM(c, e.tgt ? "target" : "you"));
  const walk = (c, h) => {
    const hh = c.h || h;
    if (c.t === "buf" && ((hh === "you" && (c.n || 0) >= 2) || EUPH().has(c.v)) && !given(c.v)) inp.add(lvK(c.v, false));   // Euphoria: always its count
    (c.items || []).forEach(y => walk(y, hh));
  };
  for (const src of srcs) for (const e of lvEffs(src, W)) {
    (e.c || []).forEach(c => walk(c, e.tgt ? "target" : "you"));
    if (e.sc && SC(e.sc) === "BufLevel" && !e.tgt) { const b = EUPH().has((e.sp || [])[0]) ? e.sp[0] : lvKey(e); if (b != null && !given(b)) inp.add(lvK(b, false)); }
  }
  for (const k of modeKeys(s, own)) { const b = +k.slice(5); if (!given(b)) inp.add(lvK(b, false)); }
  return inp;
}
/* buffs held at the attack, counted by category: held = [{side, cats, n}] (n stacks for Overlap buffs); ALL = the buff has every category */
function catCount(S, held, side, set, all) {
  let n = 0;
  for (const h of held || []) if (h.side === side && (all ? set.every(c => h.cats.includes(c)) : set.some(c => h.cats.includes(c)))) n += h.n;
  const has = c => set.length === 1 ? set[0] === c : !all && set.includes(c);
  // (a yes / no fact from the Situation counts once: not on top of a row of this setup that already gives it)
  const heldC = (sd, c) => (held || []).some(h => h.side === sd && h.cats.includes(c));
  if (side === "you") { if (has("Enhance")) n += S.bufE; if (has("Invisible") && S.st.stealth && !heldC("you", "Invisible")) n += 1; }
  else { if (has("Weak")) n += S.debW; if (has("BattleDamage")) n += S.st.scarsT; if (has("ShortCircuit") && S.st.shortc && !heldC("target", "ShortCircuit")) n += 1; }
  return n;
}
function bcatState(c, S, held, holder) {
  const side = holder === "target" ? (c.w === 0 ? "target" : c.w === 2 ? "you" : null) : (c.w === 0 ? "you" : c.w === 1 ? "target" : null);
  if (!side) return false;
  return CMP[c.op || ">="](catCount(S, held, side, D.bset[String(c.set)] || [], false), c.n);
}
/* the enemies with Scars on the map: at least 1 while the target carries Scars (your rows, or Scars on the target under Situation) */
const scarsAllOf = (S, held) => Math.max(S.st.scarsAll, catCount(S, held || [], "target", ["BattleDamage"], false) > 0 ? 1 : 0);
/* a scaling effect's value from the Situation (ActorBufPropertiesModifyInBattleBy*.GetPropertiesValue); x = {held, hit, crit} */
function scVal(e, S, ctx, x) {
  const p = e.sp || [], tr = Math.trunc, cap = (v, c, dir) => dir > 0 ? Math.min(c, v) : Math.max(c, v);
  switch (SC(e.sc)) {
    case "TargetDistance": { const d = S.distA; return d >= p[1] ? p[0] * (Math.min(d, p[2]) - p[1] + 1) : 0; }
    case "MoveDistanceOnlyAttacker": return p[0] * Math.min(S.moved, tr(p[1]));
    case "TargetDistanceWithSkillSelectGrid": return S.A.aoe === 1 && e.tgt ? cap(p[0] + p[1] * S.aoeD, p[2], p[1]) : 0;
    case "LeftMovePoint": { if (!p[0]) return 0; const left = Math.max(0, Math.floor(S.mov) - S.moved) * 1000; return cap(tr(Math.min(left, tr(p[1])) / 1000) * p[0], p[2], p[0]); }
    case "TerrainActorCount": { if (!ctx.counter) return 0; const d = S.st.field - p[2]; return d <= 0 ? 0 : cap(d * p[3], p[4], d * p[3]); }
    case "NearbyActorCount": {
      const f = p[0] < 0 ? ["m", S.maxR] : FORM_R[p[0]] || ["m", 0];
      if (p[0] < 0 && S.sq) f[0] = "c";                     // your reach with a Square form counts diagonals as 1
      // held by the target: its allies are the other enemies around it, its enemies your units around it (you count when inside)
      const tA = () => S.eTn(f[0], f[1]), tE = () => S.aTn(f[1]) + ((f[0] === "c" ? S.cheb : S.dist) <= f[1] ? 1 : 0);
      const n = e.tgt ? (p[1] === 0 ? tA() : p[1] === 1 ? tE() : tA() + tE())
        : p[1] === 0 ? S.alliesWithin(f[0], f[1]) : p[1] === 1 ? S.enemiesWithin(f[0], f[1]) : S.alliesWithin(f[0], f[1]) + S.enemiesWithin(f[0], f[1]);
      return n <= 0 || n < p[2] ? 0 : cap(p[3] + (n - p[2]) * p[4], p[5], p[4]);
    }
    case "TargetCount": return S.area < p[2] ? 0 : cap((S.area - p[2] + 1) * p[0], p[1], p[0]);
    case "OwnScopeBufCategoryTargetNum": { const v = ({ 72: scarsAllOf(S, x && x.held), 26: S.st.timid, 75: S.st.maglock }[p[2]] || 0) * p[3]; return p[4] ? cap(v, p[4], p[4]) : v; }
    case "AllActorBufCategoryNum": { const v = (p[1] === 73 ? S.st.appointed : 0) * p[2]; return p[3] ? cap(v, p[3], p[3]) : v; }
    case "DefenderActorDamgeMulti": { if (!ctx.counter) return 0; const d = S.st.dtd - p[1]; return d <= 0 ? 0 : cap(d * p[2], p[3], d * p[2]); }
    case "SkillApCost": {
      const cost = (S.A.sf || 0) & 0x2000 ? Math.max(S.apCost, S.ap) : S.apCost, start = p[0] === -1 ? S.apCost : p[0];
      return cost < start ? 0 : cap((cost - start) * p[1], p[2], p[1]);
    }
    case "CurrentAp": { const mn = tr(p[1]), mx = tr(p[2]); return S.ap < mn ? 0 : (Math.min(S.ap, mx) - mn + 1) * p[0]; }
    case "HpLoss": { const hp = (e.tgt ? tWhole() : ctx.ohp) / 100, mh = p[2] == null ? 1 : p[2]; return hp >= mh ? 0 : hp <= p[0] ? p[1] : p[1] * (mh - hp) / (mh - p[0]); }
    case "SkillManualBufLevelCost": { if (!(S.A.mc && S.A.mc[0] === p[0])) return 0; const d = S.fury - p[1]; return d <= 0 ? 0 : cap(d * p[2], p[3], d * p[2]); }
    case "CurrEquipmentDefaultSkillSelectableGrid": { const d = S.inRng - p[0]; return d <= 0 ? 0 : cap(d * p[1], p[2], d * p[1]); }
    case "BufCategoryEnhance": return Math.min(catCount(S, x.held, "you", ["Enhance"], false), tr(p[1])) * p[0];
    case "BufCategorySetInfo": return cap(catCount(S, x.held, e.tgt ? "target" : "you", D.bset[String(p[0])] || [], true) * p[1], p[2], p[1]);
    case "TargetBufCategorySetInfo": return cap(catCount(S, x.held, "target", D.bset[String(p[0])] || [], true) * p[1], p[2], p[1]);
    case "HitRate": { const d = x.hit - p[0]; if (d <= 0) return 0; const v = d * 100 * p[1]; return p[2] ? cap(v, p[2], p[2]) : v; }
    case "CriticalRate": { const d = x.crit - p[0]; if (d <= 0) return 0; const v = d * 100 * p[1]; return p[2] ? cap(v, p[2], p[2]) : v; }
    // a value per level of a buff (PropertiesModifyByBufLevel [buff, per level, cap]; ActorBufPropertiesModifyByBufLevel.GetPropertiesValue):
    // the holder's level of that buff x the value per level, clamped toward the cap (a value of 0 per level gives 0).
    // Hong - Personal 4's +10% Gusty Strike per Euphoria, Kelly's Talent 2 +5% crit per Reinforced Ammo (up to 15%)
    case "BufLevel": { if (!p[1]) return 0; const lv = EUPH().has(p[0]) ? (S ? S.st.euph : 0) : bufLvl(lvKey(e), e, S, ctx), v = lv * p[1]; return p[2] != null ? cap(v, p[2], p[1]) : v; }
  }
  return 0;
}
/* the level of buff b on an effect's holder, for a value-per-level effect. b is the level key: an aura's child follows
   its aura (BattleCompFightBasic.FillAttachBufsFromAura attaches the child once per aura level: Intel II = its aura's level).
   The cap is the buff's own plus the kit's BufMaxLevelAdd (Flawless Strategy 4: Intel 25 -> 35). On the target: the target's own level (rows
   on it), never yours. On you, in order: 0 when every buff that gives it in this setup fails its conditions (Rosemary with Flawless Strategy 2
   holds Intel II, never Intel); a level set from your HP lost (Heroism) as Your HP % gives it; the one level the setup has (s.sit.mode[b]: a
   row's stack box or the Situation's level input; noUser leaves it out, for the input's own default); the levels the kit gives by your first
   action (White Stork: 1 Reinforced Ammo at the start of each action; Helmsman: 10 Intel II when deployed); the level a row that is on gives
   it (its stack box, or 1); 1 when your kit holds it from the start; else 0 (start of the fight) */
const lvKey = e => (e.lb && e.lb[3]) || (e.sp || [])[0];
const lvMax = (ctx, b, base) => (base || 1) + ((ctx && ctx.lvMaxAdd && ctx.lvMaxAdd.get(b)) || 0);
// a level from your HP lost (ModifyBufLevelByHpLoss.ModifyBufLevelCalc: Min((full - HP‱) / per, max), integer division)
const hplLvl = (c, ctx) => { const h = Math.round((ctx.ohp == null ? 100 : ctx.ohp) * 100); return h >= c.full ? 0 : Math.min(c.max, Math.floor((c.full - h) / c.per)); };
function bufLvl(b, e, S, ctx, noUser) {
  const mx = lvMax(ctx, b, e.lb && e.lb[1]), H = ctx.lvHeld && ctx.lvHeld[e.tgt ? "target" : "you"];
  if (EUPH().has(b)) return S ? S.st.euph : 0;
  if (e.tgt) return H && H.has(b) ? clampN(H.get(b), 0, mx) : 0;
  if (ctx.lvGive && ctx.lvGive.get(b) === false) return 0;
  if (ctx.hplB && ctx.hplB.has(b)) return H && H.has(b) ? clampN(H.get(b), 0, mx) : 0;
  // the buff's one level input (Situation > Your buffs), else a stacking buff's start (the same reader as its rows)
  const k = lvK(b, false), L = ctx.s ? LVS.get(ctx.s) : null, m = !noUser && ctx.s ? lvRaw(ctx.s, k) : null;
  if (m != null) return clampN(m, (L && L.min.get(k)) || 0, L && L.cap.has(k) ? L.cap.get(k) : mx);
  if (L && L.def.has(k)) return L.def.get(k);
  if (ctx.lvStart && ctx.lvStart.has(b)) return clampN(ctx.lvStart.get(b), 0, mx);
  if (H && H.has(b)) return clampN(H.get(b), 0, mx);
  return ctx.own && ctx.own.has(b) ? 1 : 0;
}
/* which Situation inputs this setup reads (the panel shows only those), with the effects that read them */
const useName = lbl => String(lbl).replace(/^(Skill|EX|Module|Talent|Refit|Pilot feature|ST feature|Weapon feature|Drop ability|Backpack): /, "");
/* a later round of the attack (Gusty / Flurry Strike, the other hand, an after-combat strike, Peripheral Vision) notes the
   fact ticks it reads in the main attack's list (S.useRoot), so a tick shows whenever any round reads it and a stored tick never moves the
   numbers while hidden (Raven's Matrix Sweep with a '... Amplifier - Ballistics' backpack: only its Flurry Strike round checks ideal range).
   The same keys as noteUse: 'ideal' (and the distance while the tick is unset), 'bkr' */
function noteFacts(S, e, lbl, castRow, round) {
  // (a row the main attack lists already keeps its plain name; else the round is named: 'Power Amplifier - Ballistics (SSR) in the Flurry Strike round')
  const U = S.useRoot, name = useName(lbl), add = k => { if (!U.has(k)) U.set(k, new Set()); if (!U.get(k).has(name)) U.get(k).add(round ? `${name} in ${round}` : name); };
  const walkC = c => {
    if (!c) return;
    if (c.t === "ideal") { add("ideal"); if (!S.idealSet) add("dist"); }
    else if (c.t === "bkrange") add("bkr");
    else if (c.t === "any" || (c.t === "castc" && !castRow)) (c.items || []).forEach(walkC);
  };
  (e.c || []).forEach(walkC);
}
function noteUse(S, e, lbl, castRow) {
  const name = useName(lbl);
  const add = k => { if (!S.use.has(k)) S.use.set(k, new Set()); S.use.get(k).add(name); };
  let held = e.tgt ? "target" : "you";
  const area = (m, r, who) => add((who === "e" ? (m === "c" ? "eSq:" : "eN:") : (m === "c" ? "aSq:" : "aN:")) + r);
  const walkC = c => {
    const hh = held; if (c.h) held = c.h; switch (c.t) {
      case "reatk": add("reatk"); break;
      case "xact": add("reatk"); add("reSame"); break;
      // (its one tick; the distance decides it only while the tick is unset)
      case "ideal": add("ideal"); if (!S.idealSet) add("dist"); break;
      case "bkrange": add("bkr"); break;
      case "dist": add("dist"); if (c.mode === 1) add("dir"); break;
      case "adist": add("dist"); add("anc"); break;
      case "bdist": add("dist"); if (!c.min) add("anc"); break;
      case "lindist": add("dist"); add("dir"); add("anc"); break;
      case "diag": add("dir"); break;
      case "moved": case "still": add("moved"); break;
      case "thru": add("moved"); add("thru"); break;
      case "turn": add("turn"); break;
      case "nearE": add("dist"); if (held === "target") add("aT:" + c.r); else add("eN:" + c.r); break;
      case "nearA": if (held === "target") add("eT:m:" + c.r); else if (c.r >= 99) add("aAll"); else add("aN:" + c.r); break;
      case "neart": if (c.filt === 5 || c.filt === 0) { add("dist"); if (c.m === "c") add("dir"); if (c.m === "all") add("eAll"); else area(c.m, c.r, "e"); }
        if (c.filt === 2 || c.filt === 0) { if (c.m === "all") add("aAll"); else area(c.m, c.r, "a"); }
        if (c.filt === 10) add("st:crash"); if (c.filt === 11) add("st:intim"); break;
      case "tnear": add("eT:" + c.m + ":" + c.r); break;
      case "aoe": case "stc": add("area"); break;
      case "terr": add(held === "target" ? "tTgt" : "tYou"); break;
      case "terrs": add(c.u || held === "target" ? "tTgt" : "tYou"); break;
      case "bcat": {
        const set = D.bset[String(c.set)] || [], side = held === "target" ? (c.w === 0 ? "target" : c.w === 2 ? "you" : null) : (c.w === 0 ? "you" : c.w === 1 ? "target" : null);
        if (side === "you") { if (set.includes("Enhance")) add("bufE"); if (set.includes("Invisible")) add("st:stealth"); }
        if (side === "target") { if (set.includes("Weak")) add("debW"); if (set.includes("Unbalanced") && unbFam()) add("mode:" + unbFam().k); if (set.includes("BattleDamage")) add("st:scarsT"); if (set.includes("ShortCircuit")) add("st:shortc"); } break;
      }
      case "ammo": add("ammo"); break;
      case "apcost": add("apc"); break;
      case "mancost": add("fury"); break;
      case "xhp": add("xhp"); break;
      case "lasttgt": add("last"); break;
      case "pushb": if (!(D.targets[T.target] || {}).nopush) add("st:pushb"); break;
      case "nolink": case "linkj": add("link"); break;
      case "cancnt": add("ctr"); add("dist"); if ((D.targets[T.target].ctr || []).some(w => w.sq)) add("dir"); break;
      case "named": add("st:" + c.k); break;
      case "incd": add("st:reload"); break;
      case "hpcmp": case "ohp": case "ophp": case "hpl": add("ohp"); break;
      case "any": (c.items || []).forEach(walkC); break;
      // a row for a buff up from an earlier cast: that cast's trigger is behind it, so its trigger conditions read no input
      case "castc": if (!castRow) (c.items || []).forEach(walkC); break;
      case "buf": {
        const k = lvK(c.v, c.h === "target"), inp = S.lvIn && S.lvIn.has(k);
        // a level of one of your buffs (Rosa: Judgment's Awakening >= 2, Dean's Vigor >= 3): its one input, Situation > Your buffs;
        // the check is listed under it as a reader
        if ((held === "you" && c.h !== "target" && (c.n || 0) >= 2) || inp) {
          add("mode:" + k);
          const L = (S.lvlInfo ||= {}), li = (L[k] ||= { n: c.bn || String(c.v), max: c.max || 1, rd: new Set() });
          // (an on / off buff (one level) reads 'on' / 'off', not the stored level '= 1')
          li.max = Math.max(li.max || 1, c.max || 1); li.rd.add(`${name} (${(c.max || 1) <= 1 && CMP[c.op] ? (CMP[c.op](1, c.n) ? "on" : "off") : ({ ">=": "≥ ", ">": "> ", "<=": "≤ ", "<": "< ", "=": "= " }[c.op] || c.op) + c.n})`); if (c.lk) li.kind = 1;
        }
        break;
      }
    } held = hh;
  };
  (e.c || []).forEach(walkC);
  if (e.sc) switch (SC(e.sc)) {
    case "TargetDistance": add("dist"); add("anc"); break;
    case "MoveDistanceOnlyAttacker": case "LeftMovePoint": add("moved"); break;
    case "TargetDistanceWithSkillSelectGrid": add("aoeD"); break;
    case "TerrainActorCount": add("st:field"); break;
    case "NearbyActorCount": {
      const p = e.sp || [], f = p[0] < 0 ? [S.sq ? "c" : "m", S.maxR] : FORM_R[p[0]] || ["m", 0];
      if (e.tgt) { if (p[1] !== 1) add("eT:" + (f[0] === "c" ? "c" : "m") + ":" + f[1]); if (p[1] !== 0) { add("dist"); add("aT:" + f[1]); } break; }
      if (p[1] !== 0) { add("dist"); if (f[0] === "all") add("eAll"); else area(f[0], f[1], "e"); }
      if (p[1] !== 1) { if (f[0] === "all") add("aAll"); else area(f[0], f[1], "a"); } break;
    }
    case "TargetCount": add("area"); break;
    case "OwnScopeBufCategoryTargetNum": { const k = { 72: "scarsAll", 26: "timid", 75: "maglock" }[(e.sp || [])[2]]; if (k) add("st:" + k); break; }
    case "AllActorBufCategoryNum": add("st:appointed"); break;
    case "BufCategoryEnhance": add("bufE"); break;
    case "BufCategorySetInfo": add(e.tgt ? "debW" : "bufE"); break;
    case "TargetBufCategorySetInfo": add("st:scarsT"); break;
    case "DefenderActorDamgeMulti": add("st:dtd"); break;
    case "SkillApCost": add("apc"); if ((S.A.sf || 0) & 0x2000) add("ap"); break;
    case "CurrentAp": add("ap"); break;
    case "HpLoss": if (!e.tgt) add("ohp"); break;
    case "SkillManualBufLevelCost": add("fury"); break;
    case "CurrEquipmentDefaultSkillSelectableGrid": add("inRng"); break;
    case "BufLevel": {
      const b = EUPH().has((e.sp || [])[0]) ? (e.sp || [])[0] : lvKey(e);
      // a value per level of one of your buffs: its one level input (the same input as its stacks; its default: the setup's start,
      // the levels your kit gives by your first action, else start of the fight 0, or 1 when held from the start). The target's own level
      // isn't yours to set. compute() drops it again for a buff this setup can't gain, and for a level that follows your HP (Heroism)
      if (b != null && !e.tgt) {
        const k = lvK(b, false); add("mode:" + k);
        const L = (S.lvlInfo ||= {}), li = (L[k] ||= { n: (e.lb && e.lb[0]) || String(b), max: (e.lb && e.lb[1]) || 1, rd: new Set() });
        li.sc = true; li.b = b; if (e.lb && e.lb[2]) li.kind = 1; if (e.lb && e.lb[1]) li.max = Math.max(li.max || 1, e.lb[1]); li.rd.add(name);
      }
      break;
    }
  }
}
/* ------------------------------------------------------------------ hit by hit
   Effects that read the attack's own counters (game SkillRuntimeInfo, BattleCompFightSkillStat):
     lr  hits landed in this round              (PropertiesModifyInBattleByHitCount, +0x4c)
     ls  hits landed in this single skill       (BySkillHitCount +0x50; cond SingleSkillValidCountAsTarget)
     lw  hits landed on the target in the whole attack (cond WholeSkillBufOwnerOnHitCount)
     cs  crits in this single skill             (ByValidCriticalCount +0x58, BySingleSkillValidCriticalCount)
     i   the shot's index in its round, misses included (cond WillMayBeAttackCount, +0x48)
   The current shot is never counted; misses add only to i. Every attack starts at 0, so they need no input.
   Resets by the segment's start (the attack structure):
     whole  lr, i, miss streak, ls, cs, lw   the attack's first round
     round  lr, i, miss streak               each 'N times' round, second hand, extra slot pair, lock-on, follow-up hit, duel round, repeat
                                             attack, missile (a sub-skill round inside the same single skill)
     (none) nothing                          the other weapon's shots inside an interleaved round (both weapons / both shoulders); each
                                             weapon keeps its own miss streak there
     pv     the miss streak only             Peripheral Vision (its skill registers no attacking-target event)
     skill  lr, i, miss streak, ls, cs       Gusty Strike, Flurry Strike (a new single skill; lw carries)
     whole  (as the first round)             an after-combat strike (a cast of its own)
   Expected values come from an exact programme over the joint distribution of (miss streak, lr, ls, lw, cs) and the gate bits. */
const PH_SC = { HitCount: ["hit", "lr"], SkillHitCount: ["conv", "ls"], ValidCriticalCount: ["hit", "cs"], SingleSkillValidCriticalCount: ["conv", "cs"], DestoryWapPart: ["dl", null] };
const PH_C = new Set(["atkn", "sshit", "wshit"]);
// the fields the shot programme reads per shot (anything else with a per-shot condition stays a plain row, its condition taken as met)
const PH_F = new Set(["dmgB", "npcB", "finalB", "skillM", "armor_pct", "hitrate", "hitres", "crit_rate", "crit_fin", "critres", "crit_dmg", "critT", "critdres", "imm", "pwadj", "ign"]);
const CTRS = ["lr", "ls", "lw", "cs"];
/* a counter scaler's value at count n (GetPropertiesValue): "hit" [step, cap]: n < 1 -> 0, else n x step clamped toward cap;
   "conv" (ConvertOtherValueBase) [start, step, cap]: n - start <= 0 -> 0, else (n - start) x step clamped toward cap */
function scalerValue(kind, fp, n) {
  const start = kind === "conv" ? fp[0] || 0 : 0, step = kind === "conv" ? fp[1] || 0 : fp[0] || 0, cap = kind === "conv" ? fp[2] : fp[1];
  const d = n - start;
  if (kind === "hit" ? n < 1 : d <= 0) return 0;
  const v = d * step;
  return cap == null ? v : step > 0 ? Math.min(v, cap) : Math.max(v, cap);
}
/* the count from which the scaler no longer changes, at most nMax */
function scalerSat(kind, fp, nMax) {
  const start = kind === "conv" ? fp[0] || 0 : 0, step = kind === "conv" ? fp[1] || 0 : fp[0] || 0, cap = kind === "conv" ? fp[2] : fp[1];
  if (!step || cap == null || cap / step <= 0) return nMax;
  return Math.min(nMax, Math.max(1, Math.ceil(start + cap / step - 1e-9)));
}
/* the target's crit-DMG resist v taken off your CritDMG% (Formula.CalcDefenderCriticalDamageRatio) */
const fcd = v => Math.min(v, 600) / 6000 + Math.max(0, v - 600) / 15000;
/* the target's destroyed limbs (left arm, right arm, legs) in a part state H (static or the fight's) */
const dLimbs = H => H.s != null ? (H.s <= 0 ? 3 : H.alive ? 3 - ["Left arm", "Right arm", "Legs"].filter(q => H.alive.has(q)).length : 0) : 3 - H.alive.size;
/* a per-hit term: {f, part, kind, ctr, sp, v, t: tests on counters, pc: part conditions, adj (part targeting), n, src, boss, only} */
function phTerm(e, v, n, src, extra) {
  const k = e.sc ? PH_SC[SC(e.sc)] : null, t = [], pc = [], onT = !!(e.tgt || (extra && extra.boss));
  for (const c of e.c || []) {
    if (c.t === "atkn") t.push({ k: "i", op: "=", n: c.n });
    else if (c.t === "sshit") t.push({ k: c.who === "tgt" || onT ? "ls" : "z", op: c.op || ">=", n: c.n || 0 });   // a holder that is you is never hit by your attack
    else if (c.t === "wshit") t.push({ k: onT ? "lw" : "z", op: c.op || ">=", n: c.n || 0 });
    else if (c.t === "tphp" || c.t === "bphp" || c.t === "parts" || c.t === "hitmm") pc.push(c);
  }
  return {
    f: e.f, part: e.part || null, kind: k ? k[0] : null, ctr: k ? k[1] : null, sp: e.sp || [], v, t, pc, adj: e.f === "pwadj" ? e : null, n, src, sc: e.sc ? SC(e.sc) : null,
    w: phWords({ ...e, c: (e.c || []).filter(c => PH_C.has(c.t)) }, !!(extra && extra.boss)), ...(extra || {})
  };
}
/* a term's value at counters c, shot index i (0-based in its round), part state H, part p (null: a term that doesn't depend on the part) */
/* does a term hold at counters c, shot index i, part state H, part p: its counter tests and part conditions (a switch such as an
   immunity or a part-targeting rule holds whatever its value) */
function termOn(q, c, i, H, p) {
  for (const t of q.t) { const x = t.k === "i" ? i + 1 : t.k === "z" ? 0 : c[t.k]; if (!CMP[t.op](x, t.n)) return false; }
  for (const pc of q.pc) if (partCond(pc, p || null, H) !== true) return false;
  return true;
}
/* the target's whole-unit HP % at the attack's start, as the game reads it (CurrHpPercentGet: the four parts' HP over their max, a
   destroyed part at 0): the slider is each standing part's HP %, so parts ticked 'Already destroyed' come off; in the fight (T._whole) and
   in a follow-up round it already is the whole unit's */
// the target HP slider with parts ticked destroyed: what the 'target HP' effects read
const wholeNote = () => T.dead && T.dead.size ? `. With these destroyed, its whole-unit HP is ${Math.round(tWhole())}% at the HP set above: what "target HP" effects read` : "";
const tWhole = () => {
  if (T._whole || !T.dead || !T.dead.size) return T.hp; const tg = D.targets[T.target], mx = PARTS.reduce((a, p) => a + (tg.hp[p] || 0), 0);
  return mx ? T.hp * PARTS.reduce((a, p) => a + (T.dead.has(p) ? 0 : tg.hp[p] || 0), 0) / mx : T.hp;
};
/* the target's whole-unit HP share before a shot (OwnerCurrHpPercentGet: max(1, floor(10000 x the parts' HP / their max)) / 10000, 0
   once dead; a shield's HP is plain arm HP: WapPartInstance.HpMaxGet -> CalcArmHpMaxTotal, m_currHp; only the buff extra-HP pool is left
   out): the fight's live HP (H.hp), the one-attack average's expected HP (H.w), else the HP the attack starts from */
function wholeFrac(H) {
  if (H && H.w != null) return H.w;
  if (!H || !H.hp) return tWhole() / 100;
  let a = 0, m = 0;
  for (const p of PARTS) { m += H.max[p] || 0; a += Math.max(0, H.hp[p] || 0); }
  return !(H.hp.Body > 0) || m <= 0 ? 0 : Math.max(1, Math.floor(10000 * a / m)) / 10000;
}
/* an effect by HP lost (ModifyInBattleByHpLoss [low, value, high]): 0 at high HP or above, value at low or below, linear between */
const hpLossV = (p, hp) => { const mh = p[2] == null ? 1 : p[2]; return hp >= mh ? 0 : hp <= (p[0] || 0) ? p[1] || 0 : (p[1] || 0) * (mh - hp) / (mh - (p[0] || 0)); };
/* a target-held effect by its HP lost is read before every shot (GetPropertiesValue asks OwnerCurrHpPercentGet live; the
   crit / hit chance is worked out per shot): the setup's sums hold its value at the HP the attack starts from (h0), this term adds the change */
function hpdTerm(e, fr, n, src, extra) {
  return {
    f: e.f, part: e.part || null, kind: "hpd", ctr: null, sp: e.sp || [], v: 0, t: [], pc: [], adj: null, n, src, sc: "HpLoss", h0: tWhole() / 100,
    fr: fr == null ? 1 : fr, w: `${PH_LAB[e.f] || FIELD[e.f] || e.f} follows the target's HP lost, read again before every shot`, ...(extra || {})
  };
}
function termVal(q, c, i, H, p) {
  if (!termOn(q, c, i, H, p)) return 0;
  if (q.kind === "hpd") return (hpLossV(q.sp, wholeFrac(H)) - hpLossV(q.sp, q.h0)) * q.fr;
  if (!q.kind) return q.v;
  return q.kind === "dl" ? dLimbs(H) * (q.sp[0] || 0) : scalerValue(q.kind, q.sp, c[q.ctr]);
}
const sumT = (Tm, f, c, i, H, p) => { let a = 0; for (const q of Tm) if (q.f === f && (q.part == null || q.part === p)) a += termVal(q, c, i, H, p); return a; };
/* plain words for a per-hit effect (a row of yours, or the target's own with boss = true) */
const PH_LAB = {
  dmgB: "Damage %", npcB: "Damage factor", finalB: "Final damage %", skillM: "Skill multiplier", crit_dmg: "Crit damage", critT: "Crit DMG taken",
  armor_pct: "Target armor", critres: "Crit rate", hitres: "Hit chance", hitrate: "Hit chance", crit_rate: "Crit rate", crit_fin: "Crit rate", critdres: "Crit damage"
};
const lcFirst = t => t ? t[0].toLowerCase() + t.slice(1) : "";
function phWords(e, boss) {
  const k = e.sc ? PH_SC[SC(e.sc)] : null, sp = e.sp || [];
  const lab = boss && e.f === "dmgB" ? (e.part ? e.part + " DMG taken" : "DMG taken") : PH_LAB[e.f] || FIELD[e.f] || e.f;
  const val = v => {
    if (e.f === "critdres") v = -fcd(v); else if (e.f === "critres" || e.f === "hitres") v = -v;     // a resist on the target moves your stat the other way
    const sg = v >= 0 ? "+" : "−"; return e.f === "skillM" ? sg + +Math.abs(v).toFixed(2) : sg + +(Math.abs(v) * 100).toFixed(1) + "%";
  };
  const cw = (e.c || []).filter(c => PH_C.has(c.t) || c.t === "bgear" || c.t === "tbuf").map(c => lcFirst(c.text)).filter(Boolean);
  // fired once per attack and gone after its first single skill (Rena's Steeled Heart): a Gusty Strike round never has it
  const tail = (cw.length ? " " + cw.join(", ") : "").replace(e.only === "main" ? " (a Gusty Strike starts again)" : /$^/, "") + (e.only === "main" ? " (not in a Gusty Strike round)" : "");
  if (e.f === "imm") return (e.part ? `Its ${e.part.toLowerCase()} takes` : "Takes") + " no damage from a landed hit (not even the usual minimum of 1)" + tail;
  if (e.f === "pwadj") return pwText(e) + tail;
  // a value that only pins the chance (crit rate resist -999: RA - Dominant) reads as what it does
  const v0 = e.v || 0, sure = !k && ((e.f === "critres" && v0 <= -1) || ((e.f === "crit_rate" || e.f === "crit_fin") && v0 >= 1) ? "A sure crit"
    : (e.f === "critres" && v0 >= 1) ? "No crit" : (e.f === "hitres" && v0 <= -1) || (e.f === "hitrate" && v0 >= 1) ? "A sure hit"
      : (e.f === "hitres" && v0 >= 1) || (e.f === "hitrate" && v0 <= -1) ? "Every shot misses" : "");
  if (sure) return sure + tail;
  if (!k) return `${lab} ${val(v0)}` + tail;
  if (k[0] === "dl") return `${lab} ${val(sp[0] || 0)} per destroyed limb of the target (left arm, right arm, legs)` + tail;
  const step = k[0] === "conv" ? sp[1] || 0 : sp[0] || 0, cap = k[0] === "conv" ? sp[2] : sp[1], start = k[0] === "conv" ? sp[0] || 0 : 0;
  const what = k[1] === "cs" ? "earlier crit" : "earlier hit that landed", scope = k[1] === "lr" ? "this round" : "this attack (a Gusty Strike starts again)";
  const capW = cap != null && step && Math.abs(cap / step) <= 60 ? `, ${(e.f === "critres" || e.f === "hitres" ? -step : step) > 0 ? "up to" : "down to"} ${val(cap)}` : "";
  return `${lab} ${val(step)} per ${what} in ${scope}${start > 0 ? ` after the first ${start}` : ""}${capW}` + tail;
}
/* ------------------------------------------------------------------ attack structure
   What one attack fires inside the same cast (read from the game code). Each structure step is one round:
     main   the skill's own round (both weapons interleaved for dual / double-shoulder skills)
     hand2  the other hand's sub-skill round (AttackWithTwoHand / ByExtraSkill)     slot  a further weapon slot's round (MultiSlotAttack)
     lock   one lock-on on this target (AttackSelectMultiTargets)                     xhit  the follow-up hit (AttackAndExtraAttack)
   Counter scope: the first round starts the whole attack; every further round restarts the shot index, the round's landed hits and the
   miss streak, and keeps the single skill's counts (a sub-skill fires no single-skill start). Inside an interleaved round the shot index and
   the counts are shared, while each weapon keeps its own miss streak (each weapon has its own SrcAttackInfo). */
const OTHER = { RH: "LH", LH: "RH", RS: "LS", LS: "RS" };
const SLOT_OF = { 0: "LH", 1: "RH", 2: "LS", 3: "RS", 4: "BK" };
const BOTH_G = 16384 | 65536 | 524288;                    // skill groups that use more than one weapon: their accessories all fire
const STRUCT_KINDS = new Set(["hand2", "slot", "lock", "xhit"]), MAIN_KINDS = new Set(["main", "hand2", "slot", "lock", "xhit"]);
const AFX_F = new Set(["afx", "exec", "t4", "ovp"]);   // fixed damage after the attack, execution, Terminator 4
const LV_F = new Set(["lvadd", "lvmax"]);       // a read buff's levels by your first action / its cap: bookkeeping, no stat
const FOLLOW_F = new Set(["purs", "combo", "p2c", "after"]), FOLLOW_K = new Set(["purs", "after"]);
const avOf = (sf, type) => (sf & 0x200000) || (type === "ShotGun" && !(sf & 0x1000)) ? 1 : 0;
const wtOf = (weap, slot) => slot && weap[slot] && D.weapons[weap[slot].id] ? D.weapons[weap[slot].id].type : null;
const SLOTW = { RH: "right hand", LH: "left hand", RS: "right shoulder", LS: "left shoulder", BK: "back slot" };
/* a sub-skill row as compute()'s attack entry: its SkillM, shots and part profile; skill-group checks read the container's group */
const subSk = (x, cont, type) => ({ n: cont.n, vn: cont.vn, sn: x.n || cont.n, m: x.m || 0, h: x.h || 1, g: cont.g, sg: x.g, pw: x.pw || 4, av: avOf(x.sf || 0, type), ap: cont.ap, r: 1, A: cont.A, id: x.id, cm: x.cm || 0, sf: x.sf || 0 });
/* the variant of a weapon skill that casts: the first whose cast condition holds for the mode state you set (fight start: level 0);
   a buff your kit holds counts as level 1 */
// the buff's one level (typed, or the level compute() fixed for its second pass), else 1 when your kit holds it; compute() checks
// the version again once the setup's start and the rows that give the buff are known (lvVal), and casts that one
const modeLvl = (s, own, b, max) => { const r = lvRaw(s, lvK(b, false)), v = r != null ? r : own && own.has(b) ? 1 : 0; return clampN(v, 0, max || 1); };
// the units around you as the Situation panel has them (what a marker buff's own conditions read, before the attack's Situation is built)
// (the same count function as the Situation; the target's tile isn't known yet, so an enemy count leaves it out: no marker
// condition reads one, Targeted Diagnosis reads 'Allies within 2 tiles', which the 3x3 square counts in as well)
const sitAround = s => { const C = unitCounts(s.sit || {}, { dist: null }); return { alliesWithin: C.alliesWithin, enemiesWithin: C.enemiesWithin, st: {} }; };
const ccLvl = (c, s, own, W) => c.bc ? (c.bc.every(x => condState(x, { sit: sitAround(s), held: "you", own, s }, W) === true) ? 1 : 0) : modeLvl(s, own, c.b, c.max);
function pickVar(a, s, own, W) {
  if (!a || !a.var || s._part || s._xatk) return a;
  return a.var.find(v => (v.cc || []).every(c => CMP[c.op || ">="](ccLvl(c, s, own, W), c.v))) || a;
}
/* the mode inputs this attack's variants read (buffs your kit doesn't hold already) */
function modeKeys(s, own) {
  if (s._part || s._xatk || s.atk.skill === "normal" || !D.skills[s.atk.skill]) return [];
  const out = [];
  for (const a of Object.values(D.skills[s.atk.skill].atk || {})) for (const v of a.var || []) for (const c of v.cc || [])
    if (!c.bc && !(own && own.has(c.b)) && !out.includes("mode:" + c.b)) out.push("mode:" + c.b);
  return out;
}
function modeInfo(s) {
  const m = {};
  for (const a of Object.values(((D.skills[s.atk.skill] || {}).atk) || {})) for (const v of a.var || []) for (const c of v.cc || []) m[c.b] = c;
  return m;
}
/* the structure of the chosen attack from the data and the weapons you carry; counts that depend on the Situation come in buildStruct */
function structPlan(s, sk, W, atkSlot, weap) {
  const st = sk && sk.st;
  if (!st || s._part || s._xatk) return null;
  const bit = t => (D.wtBits || {})[t] || 0, A = sk.A || {}, o = OTHER[atkSlot], oT = wtOf(weap, o);
  const P = { k: st.k, st, steps: [], notes: [], use: [], avg: null, slots: [atkSlot] };
  const tn = t => TYPE_NAMES[t] || t;
  const matches = (slot, mask, like) => { const t = wtOf(weap, slot); return !!(t && (mask ? bit(t) & mask : t === like)); };
  const one = (kind, slot, sub, x) => ({ kind, streams: [{ slot, sub }], ...(x || {}) });
  // both weapons in one round: the other hand (or shoulder) must hold a weapon the skill can use (AssistHandEquipmentType), else one weapon fires
  const pair = (kind, slot, sub, mask, x) => {
    const so = OTHER[slot];
    // two shoulders: the left launcher fires first, whichever shoulder casts (the multi-missile class gives the left shoulder the odd shot,
    // CalcEachShoulderAttackRound)
    if (so && matches(so, mask, wtOf(weap, slot))) return { kind, streams: slot === "RS" && so === "LS" ? [{ slot: so, sub }, { slot, sub }] : [{ slot, sub }, { slot: so, sub }], ...(x || {}) };
    P.notes.push(`The ${SLOTW[so] || "other slot"} holds no ${mask ? typesOf(mask).split(" + ").join(" or ") : tn(wtOf(weap, slot))}: only the ${SLOTW[slot] || slot} weapon fires this round.`);
    return one(kind, slot, sub, x);
  };
  switch (st.k) {
    case "dual": P.steps.push(pair("main", atkSlot, null, A.ah)); break;
    case "dsh": P.steps.push(pair("main", atkSlot, null, A.ah)); break;
    case "avg":
      if (o && matches(o, A.ah, W.type)) P.avg = o;
      else P.notes.push(`The ${SLOTW[o] || "other hand"} holds no ${A.ah ? typesOf(A.ah).split(" + ").join(" or ") : tn(W.type)}: the two-hand average uses this weapon alone.`);
      break;
    case "hand2": {
      const sb = st.sub, a = one("main", atkSlot, null);
      const b = sb && o && matches(o, sb.mt ? bit(sb.mt) : A.ah, W.type) ? one("hand2", o, sb) : null;
      if (!b) P.notes.push(`The ${SLOTW[o] || "other hand"} holds no ${sb && sb.mt ? tn(sb.mt) : "matching weapon"}: the second hand doesn't fire.`);
      P.steps.push(...(b ? (st.first ? [b, a] : [a, b]) : [a])); break;
    }
    case "hand2x": {
      const pick = t => t ? ((st.subs || []).find(([m]) => m & bit(t)) || [])[1] : null, sa = pick(W.type), sb = pick(oT);
      P.steps.push(one("main", atkSlot, sa || null));
      if (sb) P.steps.push(one("hand2", o, sb)); else P.notes.push(`The ${SLOTW[o] || "other hand"} holds no weapon this skill can use: the second hand doesn't fire.`);
      break;
    }
    case "slots":
      for (const [sl, sb] of st.pairs || []) {
        const slot = sl === -1 ? atkSlot : SLOT_OF[sl];
        if (!slot || !weap[slot]) { P.notes.push(`Nothing in the ${SLOTW[slot] || "slot"}: its round (${sb.n || ""}) doesn't fire.`); continue; }
        const kind = P.steps.length ? "slot" : "main";
        P.steps.push(sb.st && sb.st.k === "dual" ? pair(kind, slot, sb, sb.ah) : one(kind, slot, sb));
      }
      break;
    case "locks": P.use.push("locks"); break;
    case "xhit": {
      const sb = st.sub, slot = st.same ? atkSlot : o;
      const ok = sb && (st.same || (o && matches(o, sb.mt ? bit(sb.mt) : A.ah, W.type)));
      P.steps.push(one("main", atkSlot, null, st.cancel ? { gset: "hit" } : {}));
      if (ok) P.steps.push(one("xhit", slot, sb, st.cancel ? { gate: "anyHit" } : {}));
      // the follow-up's skill is fetched for the attacking hand's weapon type when FP[0] != 0 (ExtraAttackUsingFirstAttackHand:
      // Spirit Strike - EX, st.same), else for the other hand's (ExtraAttackSkillInstanceGet; null with no weapon there);
      // whether a weapon its skill doesn't name gets none is not traced: taken as none
      else P.notes.push(`The ${SLOTW[o] || "other hand"} holds no ${sb && sb.mt ? tn(sb.mt) : "matching weapon"}: the follow-up hit is taken not to fire (its skill names ${sb && sb.mt ? "a " + tn(sb.mt) : "another weapon"}).`);
      break;
    }
    case "havoc": P.use.push("ap", "apc"); if (o && matches(o, A.ah, W.type)) P.slots.push(o);
    else P.notes.push(`The ${SLOTW[o] || "other hand"} holds no ${tn(W.type)}: every hit is this weapon's.`); break;
    case "duel": P.use.push("duel"); { const sb = st.sub; if (sb && sb.st && sb.st.k === "dual" && o && matches(o, sb.ah || A.ah, W.type)) P.slots.push(o); } break;
    case "ammo": P.use.push("ammo"); break;
    case "salvo": case "bomb": P.use.push(...(st.k === "salvo" ? ["ammo", "ap"] : ["bomb"]));
      // the skill needs a Missile Launcher on both shoulders (its text): with one it can't be cast
      if (o && wtOf(weap, o) === W.type) P.slots.push(o); else { P.cant = `Needs a ${tn(W.type)} on both shoulders: with one this skill can't be cast.`; P.notes.push(P.cant); }
      break;
  }
  for (const x of P.steps) for (const y of x.streams) if (!P.slots.includes(y.slot)) P.slots.push(y.slot);
  if (P.avg && !P.slots.includes(P.avg)) P.slots.push(P.avg);
  P.fire = (sk.g & BOTH_G) ? P.slots.slice() : [atkSlot];
  return P;
}
/* shots of two weapons in one round: A, B, A, B ... until the shorter runs out, then the rest of the longer */
const interleave = (na, nb) => { const o = []; for (let j = 0; j < Math.min(na, nb); j++) o.push(0, 1); for (let j = Math.min(na, nb); j < Math.max(na, nb); j++) o.push(na > nb ? 0 : 1); return o; };
/* the steps with their numbers: one compute() per weapon and sub-skill (the same single skill: _part), counts from the Situation */
function buildStruct(s, R, P, raOverride) {
  const S = R.sit, main = R.atkSlot, cache = new Map(), st = P.st, steps = P.steps.map(x => ({ ...x }));
  const Rof = (slot, sub, addM, anpc) => {
    if (slot === main && !sub && !addM && !anpc) return R;
    const k = slot + "|" + (sub ? sub.id : "c") + "|" + (addM || 0) + "|" + (anpc || 0);
    if (!cache.has(k)) {
      const type = wtOf(R.weap, slot), sk2 = sub ? subSk(sub, R.sk, type) : { ...R.sk, st: null, r: 1 };
      if (addM) sk2.m = (sk2.m || 0) + addM;
      cache.set(k, compute({ ...s, atk: { ...s.atk, slot }, _part: { sk: sk2, main, anpc: anpc || 0 }, _sitMain: S, _acc: R.accFire, _mainAoe: s._mainAoe, _castMain: castOf(R) }, raOverride));
    }
    return cache.get(k);
  };
  const u = S.u || {}, o = OTHER[main];
  const cnt = (k, lo, hi, def) => clampN(Math.round(SITN(u[k], def)), lo, hi);
  const info = {};
  if (st.k === "locks") {                                  // lock-ons on this target (the rest go to other units)
    const mx = st.rep ? st.max : 1, k = cnt("locks", 1, mx, mx); info.locks = { k, max: mx, rep: st.rep, add: st.add };
    for (let j = 0; j < k; j++) steps.push({ kind: "lock", streams: [{ slot: main, sub: st.sub, add: j ? st.add : 0 }], label: `Lock-on ${j + 1}` });
  }
  if (st.k === "havoc") {                                  // at least FP[1] hits, one more per FP[0] AP left; the two blades alternate
    const left = Math.max(0, S.ap - S.apCost), n = st.min + (st.per > 0 ? Math.floor(left / st.per) : 0), two = P.slots.includes(o);
    info.havoc = { n, min: st.min, left };
    const order = two ? [...Array(n).keys()].map(j => j % 2) : Array(n).fill(0);
    steps.push({ kind: "main", streams: two ? [{ slot: main, sub: null, n: Math.ceil(n / 2) }, { slot: o, sub: null, n: Math.floor(n / 2) }] : [{ slot: main, sub: null, n }], order, stopBreak: st.min });
  }
  if (st.k === "duel") {                                   // duel rounds of the sub-skill (both melee weapons), Situation input
    const k = cnt("duel", 1, st.max, S.canCounter ? st.max : 1), two = P.slots.includes(o); info.duel = { k, max: st.max };
    for (let j = 0; j < k; j++) steps.push({ kind: "main", streams: two ? [{ slot: main, sub: st.sub }, { slot: o, sub: st.sub }] : [{ slot: main, sub: st.sub }], label: `Duel round ${j + 1}` });
  }
  if (st.k === "ammo") {                                   // one 1-shot attack per Ammo (+FP[2]); this target the only one under Magnetic Lock
    // a repeat on the same target: FP[1] % on the attacker's damage factor (x0.4), not on SkillM (-> property 744)
    const n = (st.full ? S.ammoMax : S.ammo) + (st.plus || 0); info.ammo = { n };
    for (let j = 0; j < n; j++) steps.push({ kind: "main", streams: [{ slot: main, sub: null, anpc: j ? st.add : 0 }], label: `Attack ${j + 1}` });
  }
  if (st.k === "salvo" || st.k === "bomb") {               // missiles on this target, the two launchers alternating, left first
    // Full Salvo (CalcApCost): min(5 per [Lock] holder, both launchers' rounds, the most your AP pays at FP[2] each); the left
    // shoulder fires the odd one unless it runs short (CalcEachShoulderAttackRound).
    // The other launcher's magazine is taken as full.
    const two = P.slots.includes(o), mine = S.ammo, theirs = two ? S.ammoMax : 0, mag = mine + theirs;
    const n = st.k === "salvo" ? Math.max(0, Math.min(Math.floor(mag / (st.cost || 1)), Math.floor(S.ap / (st.per || 1)), st.max)) : cnt("bomb", 1, st.max, st.max); info[st.k] = { n, mag };
    const L = main === "LS" ? main : o, Rt = main === "LS" ? o : main, aL = main === "LS" ? mine : theirs, aR = main === "LS" ? theirs : mine;
    let nL = Math.ceil(n / 2), nR = Math.floor(n / 2);
    if (st.k === "salvo") { if (nL > aL) { nL = aL; nR = n - aL; } else if (nR > aR) { nR = aR; nL = n - aR; } }
    const seq = two ? interleave(nL, nR).map(k => k ? Rt : L) : Array(n).fill(main);
    seq.forEach((sl, j) => steps.push({ kind: "main", streams: [{ slot: sl, sub: st.sub }], label: `Missile ${j + 1}` }));
  }
  const out = [];
  for (const x of steps) {
    const streams = x.streams.map(y => ({ ...y, R: Rof(y.slot, y.sub, y.add, y.anpc) })).filter(y => y.R);
    if (!streams.length) continue;
    for (const y of streams) if (y.n == null) y.n = y.R.shots;
    out.push({ ...x, streams, order: x.order || (streams.length > 1 ? interleave(streams[0].n, streams[1].n) : null) });
  }
  return { k: P.k, steps: out, notes: P.notes, info, avg: P.avg, cant: P.cant || null };
}
/* one structure step as a segment: one weapon, or two interleaved (streams + order, each with its own miss streak) */
function stepSeg(R, x, start, j, GB) {
  const parts = x.streams.map((y, si) => {
    const sg = segOf(y.R, y.R, "main", y.R.ph || [], y.n, start, 0, 1);
    if (y.R !== R) sg.sk = { ...sg.sk, key: "s" + j + "." + si };          // its own part-weight cache in the fight
    sg.slot = y.slot; sg.R = y.R; return sg;
  });
  const hb = (GB && GB.hit) || 1, p = x.gate === "anyHit" ? (b => (b & hb) ? 1 : 0) : 1;
  if (parts.length === 1) return Object.assign(parts[0], { kind: x.kind, label: x.label || null, p, gate: x.gate || null, gset: x.gset || null, stopBreak: x.stopBreak, R: x.streams[0].R });
  const terms = [].concat(...parts.map(q => q.terms));
  return {
    kind: x.kind, label: x.label || null, n: x.order.length, start, i0: 0, p, gate: x.gate || null, gset: x.gset || null, stopBreak: x.stopBreak,
    streams: parts, order: x.order, terms, H0: parts[0].H0, sk: parts[0].sk, mCap: Math.max(...parts.map(q => q.mCap)), usesI: true, xps: [],
    hDep: parts.some(q => q.hDep), dl: parts.some(q => q.dl), R: parts[0].R
  };
}
/* the attack's rounds as the game fires them: main round(s) (or the structure's steps) -> Peripheral Vision -> ONE of Gusty Strike / Flurry
   Strike (they exclude each other: an alternative group when more than one can fire) -> after-combat strikes. Each segment carries
   hit(m, c, i, H), crit(c, i, H), dmg(p, c, crit, i, H) (every clamp of the bench inside), imm, part weights, extra hits.
   Gate bits (only those some segment reads): hit = a main-round shot landed (Rapid Strike's follow-up), miss = a shot of the cast's
   rounds missed (a full-hit Flurry Strike), broke = this attack destroyed a part (the Situation tick in the exact programme; the fight's own
   parts in Attacks to kill) */
function attackSegs(R) {
  const segs = [], r = R.rounds || 1, per = R.shots / r;
  const need = { hit: !!(R.struct && R.struct.steps.some(x => x.gate === "anyHit" || x.gset === "hit")), miss: false, broke: false };
  const gOf = g => { if (g === "allHit") need.miss = true; else if (g === "anyHit") need.hit = true; else if (g === "broke" || g === "noBroke") need.broke = true; };
  for (const x of (R.purs && R.purs.list) || []) gOf(x.gate);
  for (const x of (R.after && R.after.list) || []) gOf(x.gate);
  const GB = { hit: 0, miss: 0, broke: 0 }; let nb = 0;
  for (const k of ["hit", "miss", "broke"]) if (need[k]) GB[k] = 1 << nb++;
  GB.G = 1 << nb;
  const gateOK = (g, b) => !g ? true : g === "anyHit" ? !!(b & GB.hit) : g === "allHit" ? !(b & GB.miss) : g === "broke" ? !!(b & GB.broke) : g === "noBroke" ? !(b & GB.broke) : true;
  if (R.struct && R.struct.steps.length) R.struct.steps.forEach((x, j) => segs.push(stepSeg(R, x, j ? "round" : "whole", j, GB)));
  else for (let j = 0; j < r; j++) {
    const Rj = R.rnd && R.rnd[j] ? R.rnd[j].R : R;     // a later round in another target-HP band
    segs.push(segOf(R, Rj, "main", Rj.ph || [], per, j ? "round" : "whole", 0, 1));
  }
  // the Peripheral Vision round runs inside the main single skill: effects fired once per attack (Rena's Steeled Heart) are still there,
  // and so are your per-hit effects put on at its start, whichever weapon's they are (RA - Dominant on the attacking hand): your terms
  // come from the main round, the target's own from the round's weapon (its weapon-type checks)
  if (R.pv) segs.push(segOf(R, R.pv.R, "pv", [...(R.ph || []).filter(q => !q.boss), ...(R.pv.R.ph || []).filter(q => q.boss)], R.pv.shots, "pv", per, R.pv.p == null ? 1 : R.pv.p));
  // Gusty Strike(s): each source in order, P = q x (1 - the earlier ones' q)
  const F = [], GL = R.gusty ? (R.gusty.list || [R.gusty]) : [];
  GL.forEach((x, k) => {
    if (!(x.p > 0)) return; const sg = segOf(x.R, x.R, "gusty", x.R.ph || [], x.shots, "skill", 0, x.p);
    if (k) sg.sk = { ...sg.sk, key: "g" + k }; sg.ref = k; F.push(sg);
  });
  // Flurry Strike(s): only when no Gusty Strike fired; each eligible buff rolls, the highest priority of those that passed fires
  const PL = (R.purs && R.purs.list) || [], PM = R.purs ? R.purs.mode : "chance", pG = GL.reduce((a, x) => a + (x.p > 0 ? x.p : 0), 0);
  const armBlock = !!(R.purs && R.purs.post && R.purs.ctr && !R.purs.armOK);
  const q = (x, b) => PM === "off" || armBlock || !gateOK(x.gate, b) ? 0 : PM === "on" ? 1 : x.q;
  PL.forEach((x, k) => {
    const pf = b => { let v = q(x, b); for (let j = 0; j < k && v > 0; j++) v *= 1 - q(PL[j], b); return (1 - pG) * v; };
    const sg = segOf(x.R, x.R, "purs", x.R.ph || [], x.shots, "skill", 0, pf);
    sg.sk = { ...sg.sk, key: "p" + k }; sg.ref = k; sg.gate = x.gate || null; F.push(sg);
  });
  if (F.length > 1) for (const sg of F) sg.alt = "follow";
  segs.push(...F);
  // after-combat strikes: separate casts after the whole attack (every count starts again)
  ((R.after && R.after.list) || []).forEach((x, k) => {
    const sg = segOf(x.R, x.R, "after", x.R.ph || [], x.shots, "whole", 0, x.gate ? (b => gateOK(x.gate, b) ? 1 : 0) : 1);
    sg.sk = { ...sg.sk, key: "a" + k }; sg.ref = k; sg.gate = x.gate || null; segs.push(sg);
  });
  for (const sg of segs) { sg.ghit = sg.gset === "hit" ? GB.hit : 0; sg.gmiss = GB.miss && MAIN_KINDS.has(sg.kind) ? GB.miss : 0; }
  segs.GB = GB; segs.G = GB.G; segs.b0 = GB.broke && R.sit && R.sit.u && R.sit.u.broke ? GB.broke : 0;
  return segs;
}
function segOf(Rm, R, kind, Tm, n, start, i0, p) {
  const P = kind === "pv" ? Rm.pv : null, H0 = H_START();
  const has = fs => Tm.some(q => fs.includes(q.f));
  const hitT = has(["hitres", "hitrate"]), dmgT = has(["dmgB", "npcB", "finalB", "skillM", "armor_pct", "imm", "ign"]), immT = Tm.filter(q => q.f === "imm"), pwT = Tm.filter(q => q.f === "pwadj");
  const sk = kind === "gusty" ? { pw: R.sk.pw, av: R.sk.av, w0: R.wts, R, key: "g" } : { pw: Rm.sk.pw, av: Rm.sk.av, w0: Rm.wts, R: Rm, key: "m" };
  const shotBy = P ? P.shotBy : R.shotBy, shotAt = P ? P.shotAt : R.shotAt, dyn = P ? P.dyn : R.dyn;
  const imm = (pp, c, i, H) => { for (const q of immT) if ((q.part == null || q.part === pp) && termOn(q, c, i, H, pp)) return true; return false; };
  const base = !dmgT ? (pp, c, i, H) => (H === H0 || (H && H.base0 === H0) || !dyn ? shotBy[pp] : shotAt(pp, H))      // base0: H0 with the expected HP
    : (pp, c, i, H) => imm(pp, c, i, H) ? 0 : P ? P.basePH(Tm, pp, c, i, H) : R.basePH(Tm, pp, c, i, H);
  const comp = R.TI.comp;
  let mCap = 0;
  if (comp) { mCap = n; if (!hitT) for (let m = 0; m <= n; m++) if (R.hitAfter(m) >= 1) { mCap = m; break; } }
  if (R.aon) mCap = Math.max(mCap, 1);                   // a Chainsaw round: the state remembers that its first shot missed
  // hDep: a per-hit term has a part condition (its shots are not cached in the simulation); dl: one reads the destroyed limbs;
  // dynK: the damage reads the live part HP through the target's part-HP terms (cached per set of those that hold)
  // extra hits: every one on the cast's own rounds; on a follow-up round of its own only Collateral DMG and the effects' fixed hits (Detonate)
  // (an accessory's buff ends with the first single skill)
  return {
    kind, n, start, i0, p, terms: Tm, H0, sk, mCap, usesI: Tm.some(q => q.t.some(t => t.k === "i")), xps: kind === "main" ? R.xps || [] : (R.xps || []).filter(x => x.t === "coll" || x.row),
    nOth: Object.fromEntries(PARTS.map(p => [p, PARTS.reduce((a, q) => a + (q !== p && hUp(H0, q) ? 1 : 0), 0)])),
    hDep: Tm.some(q => q.pc.length || q.kind === "hpd"), dl: Tm.some(q => q.kind === "dl"), hpd: Tm.some(q => q.kind === "hpd"), dynK: dyn ? (pp, H) => R.dynKey(pp, H) : null,
    hit: Tm.length ? (m, c, i, H) => R.hitPH(Tm, m, c, i, H) : (m, c, i, H) => (H && H.alive && !H.alive.has("Legs") && R.hitAfterL ? R.hitAfterL : R.hitAfter)(m),
    crit: Tm.length ? (c, i, H) => R.critPH(Tm, c, i, H) : () => R.crit,
    cd: Tm.length ? (c, i, H) => R.cdPH(Tm, c, i, H) : () => R.critDmg,
    dmg: (pp, c, cr, i, H) => { const d = base(pp, c, i, H); return cr ? d * (1 + (Tm.length ? R.cdPH(Tm, c, i, H) : R.critDmg)) : d; },
    imm: immT.length ? imm : () => false,
    aon: !!R.aon, ghc: R.ghc || 0, defl: R.defl || 0,
    // an area attack's turns on parts destroyed before the attack: lost shots (no roll, no counter, no miss streak)
    lost: (() => { const t = PARTS.reduce((a, p) => a + (sk.w0[p] || 0), 0); return t < 1 - 1e-9 ? 1 - t : 0; })(),
    wDyn: pwT.length > 0,
    w: (c, i, alive, hp) => {
      const act = pwT.filter(q => termOn(q, c, i, H0, null)); if (!act.length) return null;
      return partWeights(sk, alive, { ...sk.R.pw, adj: [...act.map(q => q.adj), ...(sk.R.pw.adj || [])], ...(hp ? { hp } : {}) });
    }
  };
}
/* the saturation point of each counter over the terms that read it (0 = nothing reads it) */
function capsOf(segs) {
  const nMax = segs.reduce((a, s) => a + s.n, 0), caps = { lr: 0, ls: 0, lw: 0, cs: 0 };
  for (const s of segs) if (s.ghc) caps.lr = Math.max(caps.lr, Math.min(nMax, s.ghc));       // guaranteed hits read the round's landed count
  for (const s of segs) for (const q of s.terms) {
    if (q.kind && q.ctr) caps[q.ctr] = Math.max(caps[q.ctr], scalerSat(q.kind, q.sp, nMax));
    for (const t of q.t) if (caps[t.k] !== undefined) caps[t.k] = Math.max(caps[t.k], Math.min(nMax, t.n + 1));
  }
  return caps;
}
/* exact expected damage of one attack: the joint distribution of (miss streak, lr, ls, lw, cs) shot by shot; every Max(1, ...) and
   max0(...) is evaluated at the true state before it is weighted. Returns {exp, landed, crits, states, segs: [{kind, p, exp, xp, landed,
   crits, perShot}]} (segment values are for the segment happening; exp = sum of p x segment).
   An interleaved segment (streams + order) picks each shot's weapon from its order and keeps one miss streak per weapon; a gate bit
   (only when a segment sets or reads one) follows the attack's own outcome: 'hit' = a shot of that segment landed (Rapid Strike's follow-up
   needs the first hit), 'miss' = a shot of it missed; a segment's chance p can then be a function of the bit */
function attackDP(segs, caps, opt) {
  caps = Object.assign({ lr: 0, ls: 0, lw: 0, cs: 0 }, caps || {});
  opt = opt || {};          // until: stop before that segment (out.carry = the state there); from + carry0: start there from that state
  const Rl = caps.lr + 1, Rs = caps.ls + 1, Rw = caps.lw + 1, G = segs.G || (segs.some(x => x.gate || x.gset) ? 2 : 1);
  const dec = k => { const b = k % G; k = (k - b) / G; const lr = k % Rl; let r = (k - lr) / Rl; const ls = r % Rs; r = (r - ls) / Rs; const lw = r % Rw; return { lr, ls, lw, cs: (r - lw) / Rw, b }; };
  const enc = (lr, ls, lw, cs, b) => (lr + Rl * (ls + Rs * (lw + Rw * cs))) * G + (b || 0);
  let carry = opt.carry0 || new Map([[segs.b0 || 0, 1]]);
  const out = { exp: 0, landed: 0, crits: 0, segs: [], states: 0, pOver: 0 };
  // an effect that follows the target's HP (read before every shot): each shot reads the HP the attack is expected to have left by
  // then, the earlier rounds weighted by their chance, the round's own earlier shots in full (alternatives start from the same HP); the
  // fight follows its own HP
  const tgH = D.targets[T.target], HPR = segs.some(x => x.hpd || (x.streams || []).some(y => y.hpd))
    ? { w0: tWhole() / 100, tot: Math.max(1, PARTS.reduce((a, p) => a + (tgH.hp[p] || 0), 0)) } : null;
  let cumE = opt.cum0 || 0, segBase = 0;
  // one segment from a start distribution (its resets applied): expected damage, extra hits, landed, crits, per shot, end distribution
  const runSeg = (sg, start) => {
    const n = sg.n, S = sg.streams || [sg], ns = S.length, usesI = sg.usesI || ns > 1 || !!HPR;      // HPR: each shot reads its expected target HP
    const mc = S.map(x => Math.max(0, Math.min(ns > 1 ? Math.min(x.mCap, x.n) : x.mCap, n))), mul = [];
    let M = 1; for (let k = 0; k < ns; k++) { mul.push(M); M *= mc[k] + 1; }
    const memo = new Map(), hmemo = new Map();
    let dist = new Map(); for (const [k, q] of start) dist.set(M * k, q);
    // the gate bits a miss / a landed shot of this segment sets
    const gm = sg.gmiss != null ? sg.gmiss : sg.gset === "miss" ? 1 : 0, gh = sg.ghit != null ? sg.ghit : sg.gset === "hit" ? 1 : 0;
    const val = (x, ck, c, i) => {
      const key = usesI ? ck * 4096 + i : ck; let v = memo.get(key); if (v) return v;
      const wo = x.wDyn ? x.w(c, i, null, null) : null, w0 = wo || x.sk.w0, w = x.lost ? Object.fromEntries(PARTS.map(p => [p, (w0[p] || 0) / (1 - x.lost)])) : w0;
      let e = 0, kb = 0, ecw = 0;
      const kc = x.crit(c, i, x.H0), coll = x.xps.some(xp => xp.t === "coll"), ec3 = {};
      for (const pp of PARTS) {
        if (!w[pp]) continue;
        const d0 = x.dmg(pp, c, false, i, x.H0), d1 = kc > 0 ? x.dmg(pp, c, true, i, x.H0) : 0;
        e += w[pp] * ((1 - kc) * d0 + kc * d1); kb += w[pp] * kc; if (!x.imm(pp, c, i, x.H0)) ecw += w[pp];
        if (coll) ec3[pp] = w[pp] * ((1 - kc) * d0 + kc * d1);
      }
      // Collateral DMG: its share of the hit on each other standing part, up to its part count
      let xx = 0; for (const xp of x.xps) xx += xp.t === "ec" || xp.t === "ecs" ? xp.val * ecw
        : xp.t === "coll" ? xp.v * PARTS.reduce((a, pp) => a + (ec3[pp] || 0) * Math.min(xp.parts, x.nOth ? x.nOth[pp] : 3), 0) : xp.v * e;
      v = { e, x: xx, kb }; memo.set(key, v); return v;
    };
    // a deflected miss: defl x the plain damage of the part it hits, at least 1 (0 on an immune part), no crit
    const dmemo = new Map();
    const dval = (x, ck, c, i) => {
      const key = usesI ? ck * 4096 + i : ck; let v = dmemo.get(key); if (v !== undefined) return v;
      const wo = x.wDyn ? x.w(c, i, null, null) : null, w = wo || x.sk.w0; v = 0;
      for (const pp of PARTS) if (w[pp]) v += w[pp] * (x.imm(pp, c, i, x.H0) ? 0 : Math.max(1, x.defl * x.dmg(pp, c, false, i, x.H0)));
      dmemo.set(key, v); return v;
    };
    let exp = 0, xpE = 0, landed = 0, crits = 0; const perShot = [];
    let mass0 = 0; if (HPR) for (const q of start.values()) mass0 += q;
    for (let j = 0; j < n; j++) {
      const i = sg.i0 + j, si = ns > 1 ? sg.order[j] : 0, x0 = S[si], nd = new Map(); let shotE = 0;
      const x = HPR ? { ...x0, H0: { ...x0.H0, w: Math.max(0, HPR.w0 - (segBase + (mass0 > 0 ? exp / mass0 : 0)) / HPR.tot), base0: x0.H0 } } : x0;
      const put = (k, q) => nd.set(k, (nd.get(k) || 0) + q);
      for (const [key, q0] of dist) {
        if (!q0) continue; out.states++;
        if (x.lost) put(key, q0 * x.lost);                     // a lost turn: the state goes on unchanged
        const q = x.lost ? q0 * (1 - x.lost) : q0;
        const m = key % M, ck = (key - m) / M, c = dec(ck);
        const ms = ns > 1 ? Math.floor(m / mul[si]) % (mc[si] + 1) : m;
        const hk = (usesI ? ck * 4096 + i : ck) * M + m; let h = hmemo.get(hk);
        if (h === undefined) { h = Math.max(0, Math.min(1, x.hit(ms, c, i, x.H0))); hmemo.set(hk, h); }
        if (ns === 1 && x.aon && j > 0) { if (ms >= 1) { put(key, q); continue; } h = 1; }   // Chainsaw: the first shot missed -> no more shots
        else if (ns === 1 && x.ghc > 0 && c.lr < x.ghc && n - j <= x.ghc - c.lr) h = 1;      // guaranteed: the rest are needed to reach N
        if (h < 1) {
          const m2 = ns > 1 ? m + (Math.min(ms + 1, mc[si]) - ms) * mul[si] : Math.min(m + 1, mc[0]);
          // a deflect: the miss still deals defl x the plain shot and counts as landed for the whole attack's count (lw)
          const lwD = x.defl > 0 ? Math.min(c.lw + 1, caps.lw) : c.lw, b2 = gm && !(c.b & gm) ? c.b | gm : c.b;
          put(m2 + M * (b2 !== c.b || lwD !== c.lw ? enc(c.lr, c.ls, lwD, c.cs, b2) : ck), q * (1 - h));
          if (x.defl > 0) shotE += q * (1 - h) * dval(x, ck, c, i);
        }
        if (h <= 0) continue;
        const v = val(x, ck, c, i), qh = q * h, m0 = ns > 1 ? m - ms * mul[si] : 0, b2 = c.b | gh;
        shotE += qh * (v.e + v.x); xpE += qh * v.x; landed += qh; crits += qh * v.kb;
        const lr2 = Math.min(c.lr + 1, caps.lr), ls2 = Math.min(c.ls + 1, caps.ls), lw2 = Math.min(c.lw + 1, caps.lw);
        if (v.kb < 1) put(m0 + M * enc(lr2, ls2, lw2, c.cs, b2), qh * (1 - v.kb));
        if (v.kb > 0) put(m0 + M * enc(lr2, ls2, lw2, Math.min(c.cs + 1, caps.cs), b2), qh * v.kb);
      }
      dist = nd; exp += shotE; perShot.push(shotE);
    }
    const end = new Map(); for (const [key, q] of dist) { const ck = (key - key % M) / M; end.set(ck, (end.get(ck) || 0) + q); }
    return { exp, xpE, landed, crits, perShot, end };
  };
  const resetFrom = (sg, from) => {
    const start = new Map();
    for (const [k, q] of from) {
      const c = dec(k);
      if (sg.start === "whole") c.lr = c.ls = c.lw = c.cs = 0; else if (sg.start === "skill") c.lr = c.ls = c.cs = 0; else if (sg.start === "round") c.lr = 0;
      const kk = enc(c.lr, c.ls, c.lw, c.cs, c.b); start.set(kk, (start.get(kk) || 0) + q);
    }
    return start;
  };
  // a segment whose chance depends on the gate bits: it runs from the states whose bits it accepts, weighted by its chance there
  // (rest: the states it doesn't take go on unchanged, added per bit before its run)
  const branch = (sg, from, add, rest) => {
    const pf = typeof sg.p === "function" ? sg.p : () => (sg.p == null ? 1 : sg.p), start = resetFrom(sg, from), wB = new Array(G).fill(0), n = sg.n;
    let P = 0, E = 0, X = 0, L = 0, C = 0; const ps = new Array(n).fill(0);
    for (let b = 0; b < G; b++) {
      const w = pf(b); wB[b] = w > 0 ? w : 0;
      if (rest && w < 1) for (const [k, q] of from) if (k % G === b) add(k, (1 - w) * q);
      if (!(w > 0)) continue;
      const sb = new Map(); let mass = 0;
      for (const [k, q] of start) if (k % G === b) { sb.set(k, q); mass += q; }
      if (!mass) continue;
      const r = runSeg(sg, sb);
      P += w * mass; E += w * r.exp; X += w * r.xpE; L += w * r.landed; C += w * r.crits; r.perShot.forEach((v, j) => ps[j] += w * v);
      for (const [k, q] of r.end) add(k, w * q);
    }
    out.exp += E; out.landed += L; out.crits += C;
    out.segs.push({
      kind: sg.kind, p: P, exp: P ? E / P : 0, xp: P ? X / P : 0, landed: P ? L / P : 0, crits: P ? C / P : 0, perShot: ps.map(v => P ? v / P : 0), n,
      label: sg.label || null, gate: sg.gate, ref: sg.ref, alt: sg.alt != null ? sg.alt : null
    });
    return wB;
  };
  const sEnd = opt.until != null ? opt.until : segs.length;
  for (let si = opt.from || 0; si < sEnd; si++) {
    const sg = segs[si];
    // alternatives (Gusty Strike / Flurry Strike): each runs from the same state; what none of them takes goes on unchanged
    if (sg.alt != null) {
      let sj = si; while (sj + 1 < segs.length && segs[sj + 1].alt === sg.alt) sj++;
      const carry0 = carry, next = new Map(), add = (k, q) => next.set(k, (next.get(k) || 0) + q), pTot = new Array(G).fill(0);
      segBase = cumE; const nS0 = out.segs.length;           // alternatives start from the same expected HP
      for (let t = si; t <= sj; t++) branch(segs[t], carry0, add).forEach((w, b) => pTot[b] += w);
      for (let t = nS0; t < out.segs.length; t++) cumE += out.segs[t].p * out.segs[t].exp;
      for (let b = 0; b < G; b++) if (pTot[b] > 1 + 1e-12) out.pOver = Math.max(out.pOver, pTot[b] - 1);
      for (const [k, q] of carry0) { const rest = 1 - pTot[k % G]; if (rest > 0) add(k, rest * q); }
      carry = next; si = sj; continue;
    }
    const pf = typeof sg.p === "function" ? sg.p : null, p = pf ? 0 : sg.p == null ? 1 : sg.p, start = resetFrom(sg, carry);
    const n = sg.n;
    if (!pf) {
      segBase = cumE;
      const { exp, xpE, landed, crits, perShot, end } = runSeg(sg, start);
      cumE += p * exp;
      out.exp += p * exp; out.landed += p * landed; out.crits += p * crits;
      out.segs.push({ kind: sg.kind, p, exp, xp: xpE, landed, crits, perShot, n, label: sg.label || null, ref: sg.ref, gate: sg.gate || null });
      if (p >= 1) carry = end;
      else { const mix = new Map(); for (const [k, q] of carry) mix.set(k, (1 - p) * q); for (const [k, q] of end) mix.set(k, (mix.get(k) || 0) + p * q); carry = mix; }
      continue;
    }
    // a gated segment: it runs from the states whose gate bits pass (chance pf(b)); the others go on unchanged
    const next = new Map(), add = (k, q) => next.set(k, (next.get(k) || 0) + q);
    segBase = cumE; const nS1 = out.segs.length;
    branch(sg, carry, add, true);
    for (let t = nS1; t < out.segs.length; t++) cumE += out.segs[t].p * out.segs[t].exp;
    carry = next;
  }
  out.carry = carry;
  return out;
}
// the order the Bonuses & buffs groups are shown in (renderFx; the tick regrouping step picks the first row shown)
const FX_GROUPS = ["Pilot", "ST", "Weapons", "Attacking weapon", "Accessories", "Features"];
function compute(s, raOverride) {
  const weap = equipped(s);
  const atkSlot = weap[s.atk.slot] ? s.atk.slot : Object.keys(weap)[0];
  const w = weap[atkSlot];
  if (!w) return null;
  const W = D.weapons[w.id], P = D.pilots[s.pilot], star = P.stars[Math.min(s.star, P.stars.length - 1)];
  applyStk(T.target);
  const st = stOf(s), tg = D.targets[T.target];
  // (a row forced off still holds its skill's / module's buffs; off switches off only the effects its row shows, so a row
  // other rows check (Eruption Mod L8 -> 'Eruption Mod held' on Mode - Martial L1) changes nothing there; those rows have their own menu.
  // ownBy: the row key (as ovrK makes it) -> the buffs it holds, for the forced-off line)
  const fxJ = fx => [].concat(fx || []).filter(f => f && D.fx[f]).join(",");
  const own = new Set(), ownBy = new Map(), ownSet = (key, L) => { (L || []).forEach(b => own.add(b)); if ((L || []).length) ownBy.set(key, [...(ownBy.get(key) || []), ...L]); };
  const ownAdd = (k, key) => ownSet(key + "|" + fxJ((D.skills[k] || {}).fx), (D.skills[k] || {}).gb);
  P.auto.forEach(k => ownAdd(k, "auto:" + k)); if (star.talent) ownAdd(star.talent, "talent"); s.skills.forEach(k => k && ownAdd(k, "sk:" + k)); if (s.ex) ownAdd(s.ex, "sk:" + s.ex);
  for (const sec of Object.keys(P.sectors || {})) (P.sectors[sec] || []).forEach((k, i) => { if (secOn(s, sec, i)) ownAdd(k, `sec:${sec}:${i}`); });
  const mlv = moduleLevels(s); mlv.forEach(x => ownSet("mod:" + x.mid + "|" + fxJ(x.L.fx), x.L.gb));
  const N = normalOf(W), XW = (D.xatk || {})[W.type] || {};
  if (!N && s.atk.skill === "normal" && !s._xatk && !s._part) return null;   // a weapon with no Normal Attack
  // the weapon's own default attack carries its skill group, part weights and spread; a type default takes them from the type (D.xatk)
  const nOwn = !!N && N.g != null;
  let sk = N ? { n: normalLabel(N), m: N.m, h: N.h, g: nOwn ? N.g : XW.ng || 1, pw: (nOwn ? N.pw : XW.npw) || 4, av: (nOwn ? N.av : XW.nav) || 0, ap: N.ap, A: N }
    : { n: "Normal Attack", m: 1, h: 1, g: 1, pw: 4, av: 0, ap: null, A: {} };
  let aPick = null;
  if (s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].atk[W.type]) {
    // several weapon skills for this weapon type: the one whose cast condition holds in the mode state you set
    const a = aPick = pickVar(D.skills[s.atk.skill].atk[W.type], s, own, W);
    sk = { n: D.skills[s.atk.skill].n, vn: a.vn || null, m: a.m, h: a.h, g: a.g || 0, pw: a.pw || 4, av: a.av || 0, ap: a.ap, r: a.r || 1, A: a, st: a.st || null };
  }
  if (s._xatk) sk = s._xatk;                              // Gusty Strike: the weapon type's extra attack
  if (s._part) sk = s._part.sk;                           // a sub-skill round or the other weapon's stream of the same single skill
  // the attack's structure inside the cast (both weapons, second hand, extra slots, lock-ons ...) and whose accessories fire
  const plan = structPlan(s, sk, W, atkSlot, weap);
  const accFire = s._acc || (plan ? plan.fire : null);
  // an extra attack (Gusty / Flurry Strike, an after-combat strike) is a skill with no AP cost of its own (extra attacks 2014 / 2024 / 2034 / 2044
  // have none): AP-cost conditions read 0 there (e.g. Flame Core L4 / Raider - HEA off on HCI pursuits)
  const ctx = {
    tcls: tg.cls, ocls: st.cls, pclass: P.class, burnT: terrOf((s.sit || {}).tTgt).cat === "flame", burnSelf: terrOf((s.sit || {}).tYou).cat === "flame", own, ownBy, sg: sk.g, ap: s._xatk ? (s._xatk.ap || 0) : apcOf(s, sk),
    stage: s._xatk ? (s._xatk.stage != null ? s._xatk.stage : 256) : 1, slot: atkSlot, wts: Object.fromEntries(Object.entries(weap).map(([k, x]) => [k, D.weapons[x.id] && D.weapons[x.id].type])),
    ohp: ohpIn(s)
  };
  // the attack's own flags (attack skill id, aim, trigger source, area, counterable, range, Fury cost) and its stage: a counter skill
  // (skill group 64) is made on the enemy's turn (stage Counter 4), a link-attack skill joins an ally's attack (stage Link 32)
  const A = sk.A || {};
  // Twin-Blade Saw takes the share off your parts too (before its shots and before Heroism's level is set from your HP lost).
  // ONE HP for the attack: every round after it (the other hand's stream, Gusty / Flurry Strike) has the HP the attack left,
  // unless 'Your HP % after the target's retaliation' is typed for a Flurry Strike after it (s._ohpSet: that value as typed)
  if (s._ohpSet) { }
  else if (s._sitMain && s._sitMain.ohp != null) ctx.ohp = s._sitMain.ohp;
  // (the cost can't destroy a part, each keeps 1 HP (the skill's text; the 'Fixed DMG ... each part keeps 1 HP' line), and a
  // standing unit's HP % reads at least 0.01% (OwnerCurrHpPercentGet: max(1, floor(10000 x HP / max)) / 10000): never 0 after the cost)
  else if (A.mhp && !s._xatk && !s._part) ctx.ohp = Math.max(0.01, ctx.ohp - 100 * A.mhp);
  ctx.counter = !s._xatk && (((sk.g || 0) & 64) !== 0 || A.ft === "CounterAttack");
  if (!s._xatk) ctx.stage = ctx.counter ? 4 : A.ft === "LinkAttack" ? 32 : 1;
  Object.assign(ctx, { pid: s.pilot, s, A, held: "you", mainAoe: !!s._mainAoe, wid: Object.fromEntries(Object.entries(weap).map(([k, x]) => [k, x.id])) });
  ctx.castRes = s._castMain ? null : {};                 // the main attack's cast-time checks, read by its later rounds
  const acc = {}, add = (k, v) => acc[k] = (acc[k] || 0) + v;
  const armorPct = { all: 0 }; PARTS.forEach(p => armorPct[p] = 0);
  const pwAdj = [], pwHit = {};                           // part targeting: your weight adjusts / forced hits, the target's hit weighting
  const srcs = sources(s, atkSlot, weap, accFire), rows = [];
  // a Code row whose cast puts you in a mode this setup reads (Rapid Realignment -> Directional Rack, read by Precision Surgery's version and
  // Receptor Filter): its tick (cast before this attack) decides that mode, so it keeps its tick even when its only effect is a stacking buff
  {
    const rdB = lvReads(srcs, s, W);
    for (const src of srcs) { const sk = codeSkill(src); if (sk && (sk.sb || []).some(b => rdB.has(b) && kitOnly(b, s.pilot))) src.sbRd = true; }
  }
  // the Situation: bounds from the setup first (ideal range, attack range, movement, magazine, max AP), then your inputs inside them
  // (twice: limits whose own condition reads the Situation, e.g. Firepower Supremacy's range +1 with Fury spent, count on the second pass)
  // a Gusty Strike round is part of the same attack: it keeps the main attack's situation (AP cost, AP before, distance, tiles moved)
  let SIT;
  // the one level of each stacking buff (per buff / family and holder) before anything reads it: its start, floor and cap from the
  // rows that give it (lvPass), first without the Situation, again with it, and once more below with the kit's starts and cap raises;
  // a round of the same attack (Gusty Strike, the other hand, a follow-up) keeps the main attack's levels
  const lvSet = L => { LVS.set(s, { start: ctx.lvStart || new Map(), max: ctx.lvMaxAdd || new Map(), own, ...L, ohp: ctx.ohp }); return LVS.get(s); };
  const lvMain = L => {
    const M = s._sitMain && s._sitMain.lv; if (!M) return L;
    for (const f of ["def", "min", "cap"]) for (const [k, v] of M[f]) L[f].set(k, v);
    return { ...L, give: M.give, giveBy: M.giveBy, inp: M.inp, keys: new Map([...L.keys, ...M.keys]) };
  };
  ctx.holdR = holdArea(srcs);
  if (s._sitMain) { SIT = ctx.sit = { ...s._sitMain, A, fury: 0, use: new Map(), ...(s._xatk ? { apCost: 0 } : {}) }; lvSet(lvMain(lvPass(srcs, ctx, W, s, own))); }
  else {
    // (the Fury you hold bounds the Fury spent; ctx.mcHeld, checked against its final level below)
    lvSet(lvPass(srcs, ctx, W, s, own)); if (A.mc) ctx.mcHeld = mcHeldPre(s, srcs, W, ctx, A.mc[0]);
    ctx.sit = sitResolve(s, ctx, sk, W, st, star, limitSums(srcs, ctx, W, s), tg);
    const L1 = lvPass(srcs, ctx, W, s, own); lvSet(L1); lvSet({ ...L1, ...lvGiveOn(srcs, ctx, W, s) });
    if (A.mc) ctx.mcHeld = mcHeldPre(s, srcs, W, ctx, A.mc[0]);
    SIT = ctx.sit = sitResolve(s, ctx, sk, W, st, star, limitSums(srcs, ctx, W, s), tg);
  }
  SIT.ohp = ctx.ohp;                                      // your HP during the attack, for its later rounds
  ctx.aim = !!A.aim || aimFromSetup(srcs, ctx, W, s);
  ctx.burnT = SIT.tTgt.cat === "flame"; ctx.burnSelf = SIT.tYou.cat === "flame";
  const track = !raOverride && !s._xatk && !s._noPV && !s._part;   // note which inputs the effects read (for the panel), once per setup
  // (the list the panel shows; a later round keeps the main attack's (copied with s._sitMain, handed to Peripheral Vision as
  // s._useRoot) and notes its fact ticks there: noteFacts)
  // (the forced rows every round reads, ovrRoot, the same way; renderFx lists one the attack shown has no row for)
  if (!s._sitMain) { SIT.useRoot = track ? SIT.use : (s._useRoot || null); SIT.ovrRoot = track ? new Map() : (s._ovrRoot || null); }
  // value-per-level reads: the buffs whose level follows your HP lost (Heroism), the levels your kit gives a read buff by your
  // first action and the cap it adds (rows that are on, conditions met: Helmsman's 10 Intel II needs Flawless Strategy 2), and below, per read
  // buff, whether anything in this setup that gives it can (lvGive: false = every giver fails, so it stays at 0)
  const allFx = srcs.flatMap(x => (Array.isArray(x.fx) ? x.fx : [x.fx]).flatMap(k => D.fx[k] || []));
  ctx.hplB = new Set(allFx.filter(e => e.hpl && e.b != null).map(e => e.b));
  const readB = new Set(allFx.filter(e => e.sc && SC(e.sc) === "BufLevel").map(lvKey));
  ctx.lvStart = new Map(); ctx.lvMaxAdd = new Map(); ctx.lvGive = new Map();
  // (checked as at your first attack, turn 1: Asuka's Prodigy 1 adds its +5 from turn 2 on, so it isn't in the default)
  const ctx1 = { ...ctx, sit: { ...ctx.sit, turn: 1 } };
  const lvBy = new Map();                     // the rows that give a buff levels by your first action, for its input's start note
  // one entry per row with its levels summed (Dawn's Bloom +2 at top star, not '+1, +1'), and the rows whose gain comes again
  // at the start of each of your turns (lvEa: e.ea, Dawn's Bloom 2017503; not its once-only 'when deployed' 2017511)
  const lvByN = new Map(), lvEa = new Map(), addBy = (M, b, lab, v) => { const m = M.get(b) || M.set(b, new Map()).get(b); m.set(lab, (m.get(lab) || 0) + v); };
  for (const src of srcs) {
    if (src.kind === "ra" || src.castN != null || src.afterN != null || !rowOnFor(s, src, W)) continue;
    const fo = ovrOf(s, src, W);                     // (forced on, its conditions taken as met)
    for (const k of src.fx) for (const e of D.fx[k] || []) if ((e.f === "lvadd" || e.f === "lvmax") && (e.f === "lvmax" || !EUPH().has(e.lvb)) && !(src.only && (src.only === "after") !== isAfter(e))
      && (fo === "on" || (e.c || []).every(c => condState(c, e.f === "lvadd" ? ctx1 : ctx, W) === true))) {
        const M = e.f === "lvadd" ? ctx.lvStart : ctx.lvMaxAdd; M.set(e.lvb, (M.get(e.lvb) || 0) + e.v);
      if (e.f === "lvadd") { const lab = src.label.replace(/^[^:]+: /, ""); addBy(lvByN, e.lvb, lab, e.v); if (e.ea) addBy(lvEa, e.lvb, lab, e.v); }
    }
  }
  for (const [b, m] of lvByN) lvBy.set(b, [...m].map(([lab, v]) => `${lab} +${v}`));
  // the final levels (the kit's starts and cap raises known), the buffs a row of this setup gives for a check with no input of its own,
  // the keys that have an input; the rounds of this attack take them from SIT.lv
  {
    const L = s._sitMain ? lvMain(lvPass(srcs, ctx, W, s, own)) : lvPass(srcs, ctx, W, s, own);
    const G = s._sitMain && s._sitMain.lv ? { give: L.give, giveBy: L.giveBy } : (lvSet(L), lvGiveOn(srcs, ctx, W, s));
    const inp = s._sitMain && s._sitMain.lv ? L.inp : lvInputs(srcs, L, G, s, own, W);
    // the buff this attack spends has its level input too (it bounds the spend), within its cap (+ the kit's raise)
    if (A.mc && !s._sitMain) inp.add(lvK(A.mc[0], false));
    for (const [b, mx] of MCB()) {
      const k = lvK(b, false); if (inp.has(k) && !L.cap.has(k)) L.cap.set(k, mx + ((ctx.lvMaxAdd && ctx.lvMaxAdd.get(b)) || 0));
      // its floor on your own attack: what the kit gives at the start of each of your turns (Dawn's Bloom 1 Fury, TriggerType
      // 4 = OnTeamActionStart, no TriggerTimes; Fury can't be dispersed or stolen), as spending happens only in your attacks; 0 on a Re-ATK
      // (an earlier attack this turn may have spent it), a counter or a link attack
      const fl = mcFloor(b, lvEa, SIT, L.cap.get(k));
      if (inp.has(k) && fl.n > (L.min.get(k) || 0)) { L.min.set(k, fl.n); (L.minEa ||= new Map()).set(k, fl); }
    }
    SIT.lv = lvSet({ ...L, ...G, inp, lvBy, lvEa });
  }
  // the Fury the Situation bounded the spend with is its final level (typed, else the kit's start): when they differ, the
  // attack is worked out again with that level fixed on a copy
  if (A.mc && !s._sitMain && !s._mcRe) {
    const k = lvK(A.mc[0], false), v = lvVal(s, k, A.mc[0]);
    if (v !== undefined && v !== ctx.mcHeld) return compute({ ...s, _lvPin: { ...(s._lvPin || {}), [k]: v }, _mcRe: true }, raOverride);
  }
  ctx.aim = !!A.aim || aimFromSetup(srcs, ctx, W, s);
  // the version this attack casts, with the levels now known (empty Vigor = the setup's start; Directional Rack = its Code row's tick): when
  // it isn't the one picked from what you typed, the attack is worked out again with those levels fixed on a copy (one level everywhere)
  if (aPick && D.skills[s.atk.skill].atk[W.type].var && !s._part && !s._xatk && !s._lvRe) {
    const A0 = D.skills[s.atk.skill].atk[W.type], lvc = c => { const v = lvVal(s, lvK(c.b, false), c.b); return v === undefined ? (own.has(c.b) ? 1 : 0) : v; };
    const a2 = A0.var.find(v => (v.cc || []).every(c => CMP[c.op || ">="](c.bc ? ccLvl(c, s, own, W) : Math.max(0, lvc(c)), c.v))) || A0;
    if (a2 !== aPick) {
      const pin = { ...(s._lvPin || {}) }, L = LVS.get(s);
      for (const v of A0.var) for (const c of v.cc || []) if (!c.bc) { const k = lvK(c.b, false); if (lvTyped(s, k) == null || (L.give && L.give.has(c.b))) pin[k] = lvc(c); }
      return compute({ ...s, _lvPin: pin, _lvRe: true }, raOverride);
    }
  }
  // Euphoria's count is held to this setup's cap: 5 + the kit's raise (Untamed Soul +2); its one level (typed, else the setup's
  // start: 1 while a row that is on gives it, Storm Stiller's Euphoria II)
  SIT.euphCap = 5 + Math.max(0, ...[...EUPH()].map(b => ctx.lvMaxAdd.get(b) || 0));
  if (!s._sitMain) SIT.st = { ...SIT.st, euph: Math.min(lvOf(s, "euph"), SIT.euphCap) };
  if (SIT.st.euph > SIT.euphCap) SIT.st = { ...SIT.st, euph: SIT.euphCap };
  if (track) for (const k of [...((plan && plan.use) || []), ...modeKeys(s, own).map(k => "mode:" + lvK(+k.slice(5), false))]) { if (!SIT.use.has(k)) SIT.use.set(k, new Set()); SIT.use.get(k).add(sk.vn || sk.n); }
  if (track) SIT.lvIn = LVS.get(s).inp;
  // a spent buff the kit gives at the start of each of your turns has a floor on your own attack, 0 on a Re-ATK: the Re-ATK
  // box decides it, so it is shown
  if (track && !SIT.locked) {
    const L = LVS.get(s); for (const [b] of MCB()) {
      const k = lvK(b, false), m = L.lvEa && L.lvEa.get(b);
      if (L.inp.has(k) && m && m.size) { if (!SIT.use.has("reatk")) SIT.use.set("reatk", new Set()); SIT.use.get("reatk").add(`${mcName(b)} stacks`); }
    }
  }
  // the Fury this attack spends: its one level, listed under Your buffs with what it bounds
  if (track && A.mc && SIT.lvIn.has(lvK(A.mc[0], false))) {
    const k = lvK(A.mc[0], false); if (!SIT.use.has("mode:" + k)) SIT.use.set("mode:" + k, new Set());
    const LI = (SIT.lvlInfo ||= {}), li = (LI[k] ||= { n: mcName(A.mc[0]), max: A.mc[1], rd: new Set() });
    li.b = A.mc[0]; li.kind = 1; li.max = Math.max(li.max || 1, A.mc[1]); li.rd.add(`${li.n} stacks spent (at most this)`);
  }
  // a variant decided by a marker buff that follows the Situation (Targeted Diagnosis: no ally within 2 tiles): its inputs show on the panel
  if (track && s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].atk[W.type]) {
    const bcs = (D.skills[s.atk.skill].atk[W.type].var || []).flatMap(v => (v.cc || []).flatMap(c => c.bc || []));
    if (bcs.length) noteUse(SIT, { c: bcs }, D.skills[s.atk.skill].n);
  }
  // (the attack's other rounds start from the ticks as stored, not from this round's tick regrouping, s._tog0: see the regrouping step)
  const sSub = s._tog0 ? { ...s, tog: s._tog0, _tog0: undefined, _folRe: undefined, _greyT: undefined } : s;
  // two-hand average: the other hand's numbers, for the averages below (DoubleHandAverageDamageCtxSrcAttackInfoCreate)
  const avgR = plan && plan.avg ? compute({ ...sSub, atk: { ...s.atk, slot: plan.avg }, _part: { sk: { ...sk, st: null }, avgOf: atkSlot }, _sitMain: SIT, _acc: accFire, _mainAoe: s._mainAoe }, raOverride) : null;
  const probEv = {}, pickEv = {}, chanceP = {};              // 'N% chance' effects and random picks: one roll per attack, averaged by outcomes()
  const ssShare = PARTS.filter(p => st.parts[p].grades[s.grades[p]].g.startsWith("SS")).length / 4;
  // R&D tree (full): class / ST size / weapon type; attribute parts are already in the screen value
  const rd = [], rdBy = {}, rdEd = {};
  for (const k of [P.class, "type:" + W.type, st.cls + " ST"])
    if (k && D.rd[k]) rd.push(...D.rd[k].map(e => ({ ...e, g: k })));
  for (const e of rd) {
    if (e.f.startsWith("attr")) continue;
    if (e.f === "crit_app_add") continue;          // R&D crit points are taken per weapon type (D.rdcrit) instead
    if (e.wt && e.wt !== W.type) continue;
    if (e.wc && e.wc !== W.cat) continue;
    const sc = rdScale(s, e.g, e); if (sc !== 1) rdEd[e.f] = true;
    const rv = e.v * sc * (e.c && e.c.some(c => c.t === "parts_ss") ? ssShare : 1);
    add(e.f, rv); rdBy[e.f] = (rdBy[e.f] || 0) + rv;
  }
  const raStates = [], stackSeen = {}, tterm = [], phT = [];   // tterm: damage-taken terms on the target by part (yours and the boss's); phT: per-hit terms
  let unbRd = false;                                     // an effect this attack can use reads the target's Unbalanced (Instability) count
  const tgtS = { dmgB: 0, npcB: 0, finalB: 0 };             // your static effects that sit on the target (its damage-taken totals)
  const xps = [];                                        // RA extra hits on another part (Explosive Charge, Splash)
  for (const src of srcs) {
    let ask = false, ok = true;
    const effs = [], fo = ovrOf(s, src, W);              // the row's auto / on / off menu: null = auto
    if (src.kind === "ra" && !src.fx.length) {           // extra hit only: its trigger state still counts
      const rk = src.rk || src.ra.id, mode = raOverride && raOverride[rk] !== undefined ? raOverride[rk] : src.ra.mode, fr = typeof mode === "number" ? mode : 1;
      raStates.push({ id: rk, mode });
      if ((mode === "on" || (typeof mode === "number" && mode > 0)) && !s._xatk) for (const x of D.components[src.ra.id].xp || []) if (!x.wm || x.wm & (D.wtBits[W.type] || 0)) xps.push({ ...x, v: x.v * fr, n: D.components[src.ra.id].n });
      continue;
    }
    for (const k of src.fx) for (const e of D.fx[k]) {
      if (e.wt && e.wt !== W.type) continue;
      if (e.wc && e.wc !== W.cat) continue;
      if (src.only && (src.only === "after") !== isAfter(e)) continue;
      if (src.afterN != null && !(isAfterCast(e) && (e.n || "") === src.afterN)) continue;   // one buff of another attack skill's after-attack rows
      if (castSkip(src, e)) continue;                                                       // one buff an earlier cast left up
      // outside one attack, or an after-the-attack fixed-damage cast the bench doesn't count: text only, no input, no state
      if (isNoteE(e)) { effs.push({ e, eok: true, eask: false, note: true, pseudo: true }); continue; }
      if (s._xatk && e.once) continue;                     // gone after the main round (Marksmanship's armor cut)
      // a damage-taken term on the target that depends on the part hit or its HP: kept per part and checked shot by shot
      const dyn = !!(e.tgt && (e.f === "dmgB" || e.f === "npcB") && (e.part || (e.c || []).some(c => c.t === "tphp" || c.t === "hitmm")));
      let eok = true, eask = false, sok = true, late = null, chk = null, chq = null, chOff = false, failOther = false, failFixed = false, failFixF = false, fr = 1, fc = null;
      let ph = !!(e.sc && PH_SC[SC(e.sc)] && PH_F.has(e.f));   // reads the attack's own counters: decided shot by shot (no tick)
      // a stacking buff is up while its one level is 1 or more (Situation > Your buffs): its 'gained after ...' check and anything
      // else the bench can't check about how it was gained are behind it; a condition that fails still stops it
      const lv = isLv(e) && src.kind !== "ra", lvk = lv ? lvKE(e) : null;
      ctx.held = e.tgt ? "target" : "you"; ctx.grp = src.group;
      // test harness only: s._held / s._theld = buff IDs held by you / the target at the cast;
      // an effect counts when its buff is held, and conditions the bench can't check are taken as met
      // (an effect on the target counts when the target holds it, or when you hold its chain's first buff: attack-time debuffs
      // such as Jammer - Armor are attached for the attack only and never show in the target's list between commands)
      if (s._held && src.kind !== "ra" && e.ids && !(e.tgt ? e.ids.some(b => s._theld.has(b)) || (!isAfter(e) && (e.rt || []).some(b => s._held.has(b)))
        : e.ids.some(b => s._held.has(b)))) eok = false;
      for (const c of e.c || []) {
        if (PH_C.has(c.t)) { if (PH_F.has(e.f)) ph = true; continue; }
        if (dyn && (c.t === "tphp" || c.t === "hitmm")) { if (c.t === "tphp" && partCond(c, null, H_START()) === false) sok = false; continue; }
        if (LATE_C.has(c.t)) { (late ||= []).push(c); continue; }          // decided once the held buffs / the hit chance are known
        if ((c.t === "prob" || c.t === "pick") && src.afterN != null) continue;   // a buff already up from an earlier use: its roll is behind it
        if (c.t === "castc" && src.castN != null) continue;                     // up from an earlier cast: that cast's check is behind it
        if (lv && isAfterC(c)) continue;                                        // a stacking buff: its level says it is up
        if (c.t === "prob") {                                             // one roll per attack; outcomes() averages both results
          if (s._held) continue;
          const pk = "p:" + c.k + ":" + ((e.rt && e.rt[0]) || (e.ids && e.ids[0]) || src.key); chk = pk; chq = { k: pk, p: c.p };
          const ov = raOverride && raOverride[pk] !== undefined ? raOverride[pk] : undefined;
          const pv = ov !== undefined ? (typeof ov === "number" ? ov > 0 : ov === "on") : s.tog[pk] !== undefined ? !!s.tog[pk] : false;
          if (typeof ov === "number") fr = ov;                              // averaged in: weighted by its chance
          if (!pv) { eok = false; chOff = true; } continue;
        }
        if (c.t === "pick") {                                             // one of n buffs picked at random each time it fires
          if (s._held) continue;
          const kk = "k:" + c.k + ":" + src.key; chk = kk; chq = { k: kk, p: 1 / c.n, n: c.n };
          if (!(raOverride && raOverride[kk] === c.i)) { eok = false; chOff = true; } continue;
        }
        const r = condState(c, ctx, W); if (r === false) {
          eok = false; failOther = true; (fc ||= []).push(c);     // (fc: the checks that fail, for a round's line)
          // a level of your own buff you set (Vigor, Awakening >= 2): situational, so its input stays on the panel when it fails; a cast-time
          // check fails for good only when one of its own failing items does
          // (a check on a level that has an input never fails for good: Vigor, Awakening, Valhalla's Call, Take This!)
          // ('in range of both your hand weapon and your backpack weapon' fails for good only without both kinds carried; unticked,
          // its tick stays on the panel)
          const LI = LVS.get(s), fixedC = y => y.t === "bkrange" ? !bkBoth(ctx) : !SIT_T.has(y.t) && !(y.t === "buf" && ((y.h !== "target" && (y.n || 0) >= 2) || !!(LI && LI.inp && LI.inp.has(lvK(y.v, y.h === "target")))));
          if (c.t === "castc" ? !s._castMain && c.items.some(y => condState(y, ctx, W) === false && fixedC(y)) || (s._castMain && fixedC(c)) : fixedC(c)) failFixed = true;
          // (for noteFacts only: a cast-time check this round checks itself (the main attack didn't decide it, or an extra attack
          // checks it again: c.re) fails for good only by one of its own items, as on the main attack)
          if (c.t === "castc" && (!s._castMain || s._castMain[c.k] === undefined || (c.re && s._xatk && s._castMain[c.k] !== true))
            ? c.items.some(y => condState(y, ctx, W) === false && fixedC(y)) : c.t === "castc" || fixedC(c)) failFixF = true;
        }
        // (a stacking buff's 'gained after' check is left out above; any other check the bench can't make still asks: Frida's
        // 'Instability III (from an earlier use)' needs that use to have been Take This!)
        if (r === null && !s._held) { ask = true; eask = true; }
      }
      if (lv && lvOf(s, lvk) < 1) eok = false;            // not up at level 0 (not 'failing for good': its input stays listed)
      // (a level gain by your first action is checked at turn 1, as the start level is (the lvStart loop): Asuka's Prodigy 1
      // '+5 Sync Ratio' needs Battle turn >= 2, so it isn't in the start. t1: display only, the row's words and pill say so)
      const t1 = e.f === "lvadd" && eok && !s._held && (e.c || []).some(c => !PH_C.has(c.t) && condState(c, ctx1, W) === false);
      // the row's override, once its natural state is known (a0: what auto gives, for the row's words). Off: nothing of it counts;
      // on: its conditions taken as met, but a stacking part keeps its level, per-shot / per-part checks stay shot by shot (PH_C, dyn), a
      // chance counts as fired (not averaged) and a random pick stays rolled
      const a0 = fo ? { eok, eask, failO: failOther, chOff: chOff && !failOther, late, chp: chq ? chq.p : null, t1 } : null;
      if (fo === "off") { eok = false; eask = false; failOther = false; chOff = false; chq = null; chk = null; late = null; }
      else if (fo === "on") {
        const pickOff = chOff && !!chq && !!chq.n;
        eok = !(lv && lvOf(s, lvk) < 1) && !pickOff; eask = false; failOther = false; late = null;
        if (chq && !chq.n) { chq = null; chk = null; chOff = false; fr = 1; }
      }
      // (the inputs this effect reads: none for a forced-off row; for a forced-on row only its scaler's (per tile, per AP ...) and its level)
      if (!fo && !failFixed && !unbRd && !(src.castN != null && castNever(e, ctx, W)) && readsUnb(e)) unbRd = true;
      if (track && (fo === "on" || (!fo && !failFixed && !(src.castN != null && castNever(e, ctx, W))))) noteUse(SIT, fo === "on" ? { ...e, c: [] } : e, src.label, src.castN != null);   // inputs only for effects this setup and attack can use
      else if (SIT.useRoot && SIT.useRoot !== SIT.use && !fo && !failFixF && !(src.castN != null && castNever(e, ctx, W))) noteFacts(SIT, e, src.label, src.castN != null,
        s._xatk ? `the ${s._xatk.n || "extra attack"} round` : s._noPV ? "the Peripheral Vision round" : "another round of this attack");   // a later round's fact ticks
      if (track && lv && (fo === "on" || (!fo && !failFixed))) { SIT.use.has("mode:" + lvk) || SIT.use.set("mode:" + lvk, new Set()); }   // its one input (Situation > Your buffs)
      if (s._pv && e.pv) { eok = false; chq = null; chk = null; chOff = false; }   // InGameDMGPreview leaves it out
      if (chq) chanceP[chq.k] = chq.p;
      effs.push({ e, eok, eask, dyn, ph, sok: eok && sok, late, chk, chq, failO: failOther, chOff: chOff && !failOther, pseudo: FOLLOW_F.has(e.f) || e.f === "xps" || LV_F.has(e.f) || AFX_F.has(e.f), fr, lv, lvk, a0, fc, t1: t1 && !fo });
    }
    if (!effs.length) {
      // the other weapon's RA (both-weapon skills): its trigger state is still rolled once for the whole attack, for the streams it reaches
      if (src.kind === "ra" && src.rk) raStates.push({ id: src.rk, mode: raOverride && raOverride[src.rk] !== undefined ? raOverride[src.rk] : src.ra.mode });
      continue;
    }
    let on, on0 = null;
    const ask0 = ask; if (fo) ask = false;               // (a forced row asks nothing; ask0 is its natural state)
    // a row whose effects (notes aside, follow-ups included) are all stacking buffs has no tick: it is on while one is up
    // (not when a stacking buff has a check you decide, or a Code row's cast decides a mode this setup reads: those keep their tick)
    const lvOnly = !fo && src.kind !== "ra" && !src.sbRd && effs.some(x => x.lv) && effs.every(x => x.note || (x.lv && !x.eask));
    if (lvOnly) { on = effs.some(x => x.lv && x.eok); ask = false; }
    else if (src.kind === "ra") {
      const rk = src.rk || src.ra.id, mode = raOverride && raOverride[rk] !== undefined ? raOverride[rk] : src.ra.mode, fr = typeof mode === "number" ? mode : 1;
      on = mode === "on" || (typeof mode === "number" && mode > 0); raStates.push({ id: rk, mode });
      if (fr !== 1) for (const x of effs) x.fr = fr;                        // averaged in (outcomes(): too many triggers to roll one by one)
      if (on && !s._xatk) for (const x of D.components[src.ra.id].xp || []) if (!x.wm || x.wm & (D.wtBits[W.type] || 0)) xps.push({ ...x, v: x.v * fr, n: D.components[src.ra.id].n });
    } else {
      const def = src.kind === "code" ? false : !ask0;
      // only a row with something you decide (a condition the bench can't check, an earlier attack's buff) takes your tick; the
      // others follow the setup, the target and the Situation
      on0 = (ask0 || src.kind === "code") && s.tog[src.key] !== undefined ? s.tog[src.key] : def;
      on = fo ? fo === "on" : on0;                       // (the override wins)
    }
    // a passive row that mixes effects the calculator can check (class, size, HP, weapon type) with ones it can't:
    // the checked ones always apply, the box only switches the unchecked ones (a stacking buff counts as checked: its level decides)
    const nat = x => x.a0 || x, mixed0 = !lvOnly && (src.kind === "passive" || src.kind === "attack") && effs.some(x => nat(x).eask) && effs.some(x => !nat(x).eask && nat(x).eok && !x.note);
    const mixed = fo ? false : mixed0;
    // a stacking buff counts while its level is 1 or more, whatever the row's tick (It's a Miracle unticked: Vigor still counts)
    // (one with a check you decide counts while ticked)
    for (const x of effs) x.act = x.eok && ((x.lv && !x.eask) || on || (mixed && !x.eask));
    // a chance or random pick is rolled only for an effect this attack can get (its row on, its other conditions met)
    for (const x of effs) if (x.chq && !x.failO && (on || (mixed && !x.eask))) { probEv[x.chq.k] = x.chq.p; if (x.chq.n) pickEv[x.chq.k] = x.chq.n; }
    rows.push({ src, effs, ask, on, mixed, lvOnly, forced: fo, a0: fo ? { ask: ask0, on: on0, mixed: mixed0 } : null, rw: W });
  }
  // an 'earlier cast' row while this attack itself sets the buff off: hidden, it adds nothing (its effects are turned off further down)
  // ...or while this setup could never set it off (a kit or setup condition of the trigger fails: Mega Form needs Rosa's Core 1 / 2)
  const castNow = s._castMain || ctx.castRes || {};
  for (const r of rows) if (r.src.castN != null) {
    const ks = [...new Set(r.effs.map(x => (castCond(x.e) || {}).k).filter(Boolean))];
    if ((ks.length && ks.some(k => castNow[k] === true)) || r.effs.some(x => castNever(x.e, ctx, W))) r.hide = true;
  }
  // the forced rows this round reads, in the main attack's list (SIT.ovrRoot, '' = the main attack itself), so the page
  // can show one the attack shown has no row for: the other arm's Flurry Strike or the Peripheral Vision round reads the other weapon's
  // refits and drop ability (Rosa's Nightwither - EX drop ability forced off on the left-hand attack moves her right-hand Normal Attack)
  if (SIT.ovrRoot) for (const r of rows) if (r.forced && !r.hide && r.effs.some(x => !x.note)) {
    const K = ovrK(r.src);
    const o = SIT.ovrRoot.get(K) || SIT.ovrRoot.set(K, { label: r.src.label, fo: r.forced, wslot: r.src.wslot || null, rounds: [] }).get(K);
    const n = track ? "" : s._xatk ? `the ${s._xatk.n || "extra attack"} round` : s._noPV ? "the Peripheral Vision round" : s._part && s._part.avgOf ? "the two-hand average" : "another round";
    if (!o.rounds.some(y => y.n === n && y.slot === atkSlot)) o.rounds.push({ n, slot: atkSlot });
  }
  // the same buffs from several rows that take a tick (Ada's Poised Starburst on Talent, Binary Starflare 2 and 3; Alyson's
  // Exposure on Talent: Investor and ALL IN (from an earlier use)): one buff, one tick. The first row shown keeps it, the others follow it
  // (greyed: 'same buffs as <row>: tick it there'); a row whose buffs are all up already from a row that needs no tick is greyed on (Wyatt's
  // The Exiled 4: Heroism II from Twin-Blade Saw). A row whose tick decides anything else (another buff, a follow-up, a chance, a stacking
  // buff's start, a mode) keeps its own tick: a different event. The same buff = the same buff ids, stat, part and holder (not the family:
  // Crit Rate UP II and IV stay apart)
  {
    const eKey = x => [(x.e.ids || []).join(","), x.e.f, x.e.part || "", x.e.a || "", x.e.tgt ? 1 : 0].join("|");
    const byTick = (r, x) => !x.note && (x.eok || x.chOff) && !(x.lv && !x.eask) && !(r.mixed && !x.eask);   // what the row's tick decides
    // (a stacking buff on such a row is up by its level, but the row's tick still gives the level's start when it is gained after an attack
    // or the row is a Code row (lvPass): rows follow one another only when those levels are the same too, Ada's three rows all Poised)
    const lvTick = r => [...new Set(r.effs.filter(x => x.lv && !x.note && !x.failO && (r.src.kind === "code" || (x.e.c || []).some(c => isAfterC(c) || c.t === "prob" || c.t === "pick"))).map(x => "lv:" + x.lvk))];
    // (a forced row never follows or leads; its buffs count as up without a tick when forced on, so it can cover other rows)
    const sigOf = r => {
      if (r.forced || r.lvOnly || r.src.kind === "ra" || r.src.sbRd || !(r.ask || r.src.kind === "code")) return null;
      const U = r.effs.filter(x => byTick(r, x));
      if (!U.length || U.some(x => x.pseudo || x.lv || x.chq || !(x.e.ids || []).length)) return null;
      return [...new Set(U.map(eKey))].sort().join(" ; ") + lvTick(r).sort().map(k => " ; " + k).join("");
    };
    const free = new Map();                    // a buff that applies without a tick -> the row that holds it
    for (const r of rows) if (!r.hide && r.src.kind !== "ra") for (const x of r.effs)
      if (x.act && !x.late && !x.chq && !x.note && !x.pseudo && (x.e.ids || []).length && !(!r.forced && (r.ask || r.src.kind === "code") && byTick(r, x)) && !free.has(eKey(x))) free.set(eKey(x), r);
    const ord = r => (FX_GROUPS.indexOf(r.src.group) + 1 || 99) * 1e5 + rows.indexOf(r);      // the order the rows are shown in
    const lead = new Map(), fix = {};
    for (const r of [...rows].sort((a, b) => ord(a) - ord(b))) {
      const g = r.hide ? null : sigOf(r); if (!g) continue;
      const by = g.split(" ; ").map(k => free.get(k));     // (a level's start key is never 'free': such a row keeps its tick or follows)
      if (by.every(y => y && y !== r)) { r.cover = [...new Set(by.map(y => y.src.label))]; r.on = true; }
      else if (lead.has(g)) {
        const L = lead.get(g); r.follow = L.src.key; r.followL = L.src.label; r.on = L.on; L.grpKeys.push(r.src.key);
        // (which row leads depends on the attack (Alyson's The Wolf of Doll 4 has its own box on ALL IN and follows 'ALL IN:
        // Exposure II (from an earlier use)' on Normal Attack), so the group is on while ANY of its rows' stored ticks is: a tick set where
        // this row had the box still counts here. A click writes every row of the group, and the rows grouped with them on the setup's other
        // attacks (tickKeys), so they never disagree after a click)
        if (s.tog[r.src.key] === true && s.tog[L.src.key] !== true) fix[L.src.key] = true;
      }
      else { lead.set(g, r); r.grpKeys = []; continue; }
      for (const x of r.effs) x.act = x.eok && ((x.lv && !x.eask) || r.on || (r.mixed && !x.eask));
      // (its own stored tick is never read here: the followed row's tick carries the buff, once; a covered row's buff is up already. A stored
      // one (an old save, another attack) is moved onto the leader (a follower) or dropped (a covered row) and everything that reads ticks
      // before this point, the limits (Poised Starburst's Max AP counts once, not once per row), aiming, the levels' starts, is worked out
      // again, once)
      if (s.tog[r.src.key] === true) fix[r.src.key] = false;
    }
    // (a stored tick on a row this attack decides (greyed: its conditions are all decided here) is not read by the limits and the
    // aiming either: Rosa: Judgment's Talent: Valkyrie with Awakening empty (×0 here) adds no Movement +1 or ideal range +2 from a stale tick)
    const grey = rows.filter(r => !r.hide && !r.forced && r.src.kind !== "ra" && r.src.kind !== "code" && !r.lvOnly && !r.ask && !r.follow && !r.cover && s.tog[r.src.key] === true
      && r.effs.some(x => LIMIT_F.has(x.e.f) || x.e.f === "aim")).map(r => r.src.key);
    // (_tog0: the ticks as stored; the attack's other rounds (the other hand, Gusty / Flurry Strike, Peripheral Vision, after-combat strikes)
    // start from them and group their own rows: a row that follows here can lead there)
    if ((Object.keys(fix).length || grey.length) && !s._folRe)
      return compute({ ...s, tog: { ...s.tog, ...fix }, _tog0: s.tog, _folRe: true, _greyT: grey }, raOverride);
  }
  // buffs held at this attack, for 'carries N buffs of a category' checks and per-buff counters: each buff once, one per stack of an
  // Overlap / SameGroupOverLap buff (the ids repeat per stack; Accumulate buffs count once)
  // (lower levels of a buff family don't count: only its highest level is held)
  const topL = {}; for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp) topL[x.e.grp] = Math.max(topL[x.e.grp] || 0, x.e.lig || 0);
  const held = [], heldSeen = new Set();
  for (const r of rows) for (const x of r.effs) if (x.act && !x.late && x.e.ids && !(x.e.grp && (x.e.lig || 0) < topL[x.e.grp])) for (const b of x.e.ids) {
    const side = x.e.tgt ? "target" : "you", hk = side + b, bc = D.bcat[String(b)];
    if (heldSeen.has(hk) || !bc) continue; heldSeen.add(hk);
    held.push({ side, cats: bc[0], n: x.e.stk && (bc[1] === "Overlap" || bc[1] === "SameGroupOverLap") ? stkOf(s, r.src, x.e) : 1 });
  }
  // the target's Instability (one count, Situation): when no row of this setup holds it in this attack, it is other units' Instability.
  // It still counts as Unbalanced and Weak, and its hit cut (the same per stack at every level: −4%) applies; listed with the target's own
  // (only while the count has its input in this attack: a row of yours can give Instability here, or something reads the count; a value
  // typed on another attack's page doesn't count where nothing shows it)
  const instab = (() => {
    const U = unbFam(); if (!U || s._held) return null;
    const n = lvOf(s, U.k), K = (LVS.get(s).keys || new Map()).get(U.k);
    if (n <= 0 || !(unbRd || (K && !K.fail)) || rows.some(r => r.effs.some(x => x.act && x.lv && x.lvk === U.k))) return null;
    const bc = D.bcat[String(U.b)]; if (bc) held.push({ side: "target", cats: bc[0], n });
    return { n, per: U.per, name: famName(U.k) || "Instability" };
  })();
  for (const r of rows) for (const x of r.effs) if (x.late) {
    const F = x.late.filter(c => c.t === "bcat" && !bcatState(c, SIT, held, c.h || (x.e.tgt ? "target" : "you")));
    if (F.length) { x.eok = false; x.act = false; x.fc = [...(x.fc || []), ...F]; }
  }
  // (a forced row's late checks are taken as met; what auto would give still reads them, for its words)
  for (const r of rows) if (r.forced) for (const x of r.effs) if (x.a0 && x.a0.late && x.a0.late.some(c => c.t === "bcat" && !bcatState(c, SIT, held, c.h || (x.e.tgt ? "target" : "you")))) x.a0.eok = false;
  // a buff family held at several levels (same GroupId): only its highest level counts
  const topLvl = {};
  for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp) topLvl[x.e.grp] = Math.max(topLvl[x.e.grp] || 0, x.e.lig || 0);
  for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp && (x.e.lig || 0) < topLvl[x.e.grp]) { x.act = false; x.lower = true; }
  // and a buff is held once: the same buff (family, or buff ID) reached through several rows counts once
  // (averaged-in copies of one accessory, outcomes(): held when any of them triggers, 1 - prod(1 - chance), on the first)
  const famSeen = new Map();
  // (a stacking buff too: its stacks are one level for the setup, so Dean's Vigor shown by three rows counts once)
  for (const r of rows) for (const x of r.effs) if (x.act && (x.e.grp || (x.e.ids && x.e.ids.length))) {
    const k = [x.e.grp || "id:" + x.e.ids.join(","), x.e.f, x.e.part || "", x.e.a || "", x.e.tgt ? 1 : 0].join("|"), f = famSeen.get(k);
    if (f) { x.act = false; x.dup = true; if ((f.fr != null && f.fr !== 1) || (x.fr != null && x.fr !== 1)) f.fr = 1 - (1 - (f.fr == null ? 1 : f.fr)) * (1 - (x.fr == null ? 1 : x.fr)); }
    else famSeen.set(k, x);
  }
  // (the hidden 'earlier cast' rows, found above: they add nothing)
  for (const r of rows) if (r.hide) for (const x of r.effs) x.act = false;
  // the level each buff has from the rows that are on (for value-per-level effects): a stacking buff its stack level, any other held buff 1
  // whether this setup can hold each buff a value-per-level effect reads: some row that is on gives it (its chain's buffs, a kit level
  // giver, an aura child that reads its own level); false = every one that could is off or fails its conditions (Rosemary with Flawless
  // Strategy 2 gets Intel II, never Intel). A buff nothing here gives (an ally's, the stage's) keeps its input
  for (const r of rows) for (const x of r.effs) {
    const e = x.e;
    if (e.tgt || !(e.ids || e.f === "lvadd" || e.sc)) continue;
    const gv = [...(e.ids || []), ...(e.f === "lvadd" ? [e.lvb] : []), ...(e.sc && SC(e.sc) === "BufLevel" && (e.ids || []).includes((e.sp || [])[0]) ? [lvKey(e)] : [])];
    for (const b of gv) if (readB.has(b)) ctx.lvGive.set(b, ctx.lvGive.get(b) || !!(x.act || x.dup));
  }
  // (a value-per-level effect that reads its own buff, Intel II, gives no level by being on, unless you ticked it as up: an after-the-attack,
  // earlier-cast or other-skill row; a level from HP lost gives that level)
  const lvHeld = ctx.lvHeld = { you: new Map(), target: new Map() };
  for (const r of rows) for (const x of r.effs) if ((x.act || x.dup) && !x.pseudo && x.e.ids) {
    const M = lvHeld[x.e.tgt ? "target" : "you"];
    const selfRd = x.e.sc && SC(x.e.sc) === "BufLevel" && !(isAfter(x.e) || r.src.kind === "code" || r.src.castN != null) ? new Set([(x.e.sp || [])[0], lvKey(x.e)]) : null;
    for (const b of x.e.ids) if (!(selfRd && selfRd.has(b))) {
      const hc = x.e.hpl && x.e.b === b ? (x.e.c || []).find(c => c.t === "hpl") : null;
      M.set(b, Math.max(M.get(b) || 0, hc ? hplLvl(hc, ctx) : x.e.stk && x.e.b === b ? stkOf(s, r.src, x.e) : 1));
    }
  }
  // the Situation's level inputs for value-per-level effects: none for a buff this setup can't gain or whose level follows your HP; the
  // default shown is the setup's own (not what you typed), within the cap the kit gives
  // (keyed by the level key; a stacking buff's start comes from its rows, lvPass)
  if (track && SIT.lvlInfo) for (const [k, li] of Object.entries(SIT.lvlInfo)) if (li.sc) {
    const b = li.b != null ? li.b : +k, LK = LVS.get(s);
    if (LK.def.has(k)) continue;
    if (ctx.lvGive.get(b) === false || ctx.hplB.has(b)) { SIT.use.delete("mode:" + k); delete SIT.lvlInfo[k]; continue; }
    li.max = lvMax(ctx, b, li.max0 || (li.max0 = li.max));
    li.def = bufLvl(b, { lb: [li.n, li.max0] }, SIT, ctx, true);
    li.src = ctx.lvStart.has(b) ? "start" : lvHeld.you.has(b) || own.has(b) ? "setup" : "fight";
  }
  const hitLate = [];                                     // effects that read this attack's own hit / crit chance: added once those are known
  for (const { src, effs } of rows) {
    for (const x of effs) {
      const { e, act } = x;
      if (!act) continue;
      if (x.pseudo) continue;                   // follow-ups, extra hits and notes: collected below, no stat
      if ((e.sc && (HIT_SC.has(SC(e.sc)) || CRIT_SC.has(SC(e.sc)))) || (x.late && x.late.some(c => c.t === "hitr"))) { hitLate.push({ x, src }); continue; }
      let v = e.sc ? scVal(e, SIT, ctx, { held }) : effVal(s, src, e);
      if (x.fr != null && x.fr !== 1) v *= x.fr;
      x.val = v;
      if (e.stk && e.b) {                       // same buff granted by another skill already counted: keep the larger one
        const k = e.b + ":" + e.f, prev = stackSeen[k];
        if (prev) { if (Math.abs(v) <= Math.abs(prev.v)) { x.dup = true; continue; } add(e.f + (e.a ? ":" + e.a : ""), -prev.v); prev.x.dup = true; }
        stackSeen[k] = { v, x };
      }
      // hit by hit (R.ph): named after your row (Find Crack, not its buff 'Bella - Bionic Computer 4'); a buff row of another skill by the buff
      if (x.ph) { phT.push(phTerm(e, e.sc ? 0 : v, src.afterN != null ? e.n || src.label : src.label.replace(/^[^:]+: /, ""), src.label, { tgt: !!e.tgt })); continue; }
      if (x.dyn) { tterm.push({ f: e.f, part: e.part || null, v, c: (e.c || []).filter(c => c.t === "tphp" || c.t === "hitmm"), n: e.n || src.label, src: src.label, tgt: !!e.tgt }); continue; }
      if (e.f === "armor_pct") { armorPct[e.part || "all"] += v; continue; }
      if (e.f === "pwadj") { pwAdj.push(e); continue; }
      if (e.f === "pwhit") { pwHit[e.part] = (pwHit[e.part] || 0) + v; continue; }
      if (e.tgt && tgtS[e.f] !== undefined) tgtS[e.f] += v;
      add(e.f + (e.a ? ":" + e.a : ""), v);
      if (e.tgt && e.sc && SC(e.sc) === "HpLoss" && PH_F.has(e.f)) phT.push(hpdTerm(e, x.fr, src.label.replace(/^[^:]+: /, ""), src.label, { tgt: true }));
    }
  }
  // what the rows that apply give besides stats: the follow-ups this attack can fire (Flurry Strike, Gusty Strike, an after-combat
  // strike, a buff that moves Flurry Strike before the retaliation) and fixed extra hits after each landed shot (Detonate). A skill you cast
  // before this one (a Code row) gives no follow-up: its buff is attached for that skill's own attack (BufIds4SelfBeforeCastSkill)
  const fol = [], afxRows = [], ovpRows = [];         // fixed damage after the attack, execution and Terminator 4 rows that apply
  // a follow-up buff family held at several levels (Domination Field 3 / 4): the highest level a row holds replaces the lower ones
  const fTop = {}; for (const r of rows) if (r.on || r.mixed) for (const x of r.effs) if (x.e.fgrp) fTop[x.e.fgrp] = Math.max(fTop[x.e.fgrp] || 0, x.e.flig || 0);
  for (const r of rows) for (const x of r.effs) if (x.e.fgrp && x.act && (x.e.flig || 0) < fTop[x.e.fgrp]) { x.act = false; x.lower = true; }
  for (const r of rows) for (const x of r.effs) {
    if (!x.pseudo || x.note || !x.act) continue;
    if (x.e.f === "xps") { xps.push({ ...x.e.xp, n: x.e.n || r.src.label.replace(/^[^:]+: /, ""), row: 1 }); continue; }
    if (x.e.f === "ovp") { ovpRows.push({ ...x.e, n: r.src.label.replace(/^[^:]+: /, "") || x.e.n }); continue; }
    if (AFX_F.has(x.e.f)) { if (!s._xatk && !s._part) afxRows.push({ ...x.e, n: r.src.label.replace(/^[^:]+: /, "") || x.e.n }); continue; }
    if (r.src.kind !== "code") fol.push({ e: x.e, src: r.src });
  }
  let critT = 0; const bossYou = [], bossTgt = [];
  // other units' Instability on the target (no row of yours holds it here): its hit cut, listed with the target's own
  if (instab && instab.per) { add("hitres", instab.per * instab.n); bossTgt.push({ f: "hitres", v: instab.per * instab.n, n: `${instab.name} ×${instab.n} (set under Situation)` }); }
  ctx.held = "you";
  for (const e of bossFx(tg)) {
    if (!e.use) continue;
    if (e.f === "udg" || e.f === "force" || e.f === "guts" || e.f === "xhp" || e.f === "miss") continue;   // read elsewhere (dodge, part pick, the fight), not damage terms
    if (s._xatk && e.only === "main") continue;                          // fired once per attack and gone after its first single skill
    const pc = (e.c || []).filter(c => c.t === "bphp" || c.t === "parts"), oc = (e.c || []).filter(c => c.t !== "bphp" && c.t !== "parts" && !PH_C.has(c.t));
    ctx.held = "target";                                                 // the boss's own conditions: weapon / attack type, its weapons, its buffs
    const fail = oc.some(c => condState(c, ctx, W) !== true); ctx.held = "you";
    if (fail) continue;
    if (e.side === "you") { add(e.f, e.val); bossYou.push({ f: e.f, v: e.val, n: e.n }); continue; }   // what the boss puts on whoever attacks it (Bertha: FinalDMG -80%)
    if ((e.sc && PH_SC[SC(e.sc)]) || e.f === "imm" || (e.c || []).some(c => PH_C.has(c.t))) {           // hit by hit: the attack's own counters
      phT.push(phTerm({ ...e, tgt: 1, c: [...pc, ...(e.c || []).filter(c => PH_C.has(c.t))] }, e.f === "imm" ? 1 : e.val, e.n, "target: " + e.n, { boss: true, only: e.only })); continue;
    }
    let val = e.val;
    if (e.sc) { val = scVal({ ...e, tgt: 1 }, SIT, ctx, { held }); if (track) noteUse(SIT, { sc: e.sc, sp: e.sp, tgt: 1 }, "target: " + e.n); }   // read from the situation (White Flame, Douglas, Georgia)
    if (e.f === "critT") { if (pc.every(c => partCond(c, null, H_START()) !== false)) critT += val; continue; }
    // its dodge / crit resist from what it gains in the fight, other units' auras, its HP lost or a count (Shadow Step, Without a Trace,
    // Ace Enforcer, Mark Perception): they join its own (CalcDefenderActorFinalHitRateAdd)
    if (e.f === "hitres" || e.f === "critres") {
      if (pc.every(c => partCond(c, null, H_START()) !== false)) {
        add(e.f, val); bossTgt.push({ f: e.f, v: val, n: e.n });
        if (e.sc && SC(e.sc) === "HpLoss") phT.push(hpdTerm(e, 1, e.n, "target: " + e.n, { tgt: 1, boss: true }));
      } continue;
    }      // read per shot
    tterm.push({ f: e.f, part: e.part, v: val, c: pc, n: e.n, src: "target: " + e.n, boss: true });
  }
  {
    const X = tgX(T.target);                                             // the target boxes (other buffs on it)
    if (X.dmgB) tterm.push({ f: "dmgB", part: null, v: X.dmgB / 100, c: [], n: "Other buffs on it", src: "target: other buffs", boss: true });
    if (X.npcB) tterm.push({ f: "npcB", part: null, v: X.npcB / 100, c: [], n: "Other buffs on it", src: "target: other buffs", boss: true });
    for (const f of ["hitres", "critres"]) if (X[f]) { add(f, X[f] / 100); bossTgt.push({ f, v: X[f] / 100, n: "Other buffs on it" }); }
  }
  // test harness only: what the target picked up during the fight (other units' debuffs, its own later buffs)
  for (const q of s._tx || []) {
    if (q.f === "armor_pct") armorPct[q.part || "all"] += q.v; else if (q.f === "critT") critT += q.v;
    else if (q.f === "dmgB" || q.f === "npcB") tterm.push({ f: q.f, part: q.part || null, v: q.v, c: [], n: "log: " + q.n, src: "log" }); else add(q.f, q.v);
  }
  const x = s.extra;
  if (x.dmgB) add("dmgB", x.dmgB / 100); if (x.finalB) add("finalB", x.finalB / 100);
  if (x.hitrate) add("hitrate", x.hitrate / 100); if (x.crit_rate) add("crit_rate", x.crit_rate / 100); if (x.crit_fin) add("crit_fin", x.crit_fin / 100); if (x.splash) add("splash", x.splash / 100);
  if (x.crit_dmg) add("crit_dmg", x.crit_dmg / 100); if (x.skillM) add("skillM", +x.skillM); if (x.shots) add("shots", Math.round(+x.shots));
  // surplus ST Power (OverPower2ActorAttack, set once when the buff is made): DMG% + min((Power - Weight) / step x share, cap) when
  // Power > Weight. Power = the body part's base + a Power-add backpack; Weight = the four parts + every equipped weapon + the backpack.
  // Made at the start of the battle (RTX Frame) it also sees ST Power adds and weapon-type Weight changes (Floor((Weight + adds) x
  // (1 + multis))); made with its passive (Emily) the parts' / weapons' passives come later, so it reads the plain values
  let ovp = null;
  for (const o of ovpRows) {
    const [step, per, cap, bs] = o.ovp, part = q => (D.sts[partST(s, q)] || { parts: {} }).parts[q] || {};
    const bk = s.back && s.back.startsWith("bp:") ? D.backs[s.back.slice(3)] : null;
    const P = Math.floor((part("Body").pw || 0) + (bk ? bk.pwa || 0 : 0) + (bs ? acc.pwadd || 0 : 0));
    let Wt = PARTS.reduce((a, q) => a + (part(q).wt || 0), 0) + (bk ? bk.wt || 0 : 0);
    for (const w of Object.values(equipped(s))) {
      const X = D.weapons[w.id]; if (!X) continue;
      Wt += bs ? Math.max(0, Math.floor(((X.wt || 0) + (acc["wtadd:" + X.type] || 0)) * (1 + (acc["wtmulti:" + X.type] || 0)))) : (X.wt || 0);
    }
    const b = P > Wt ? Math.min((P - Wt) / step * per, cap == null ? Infinity : cap) : 0;
    if (!ovp || b > ovp.b) ovp = { P, W: Wt, b, n: o.n, step, per, cap };
  }
  if (ovp && ovp.b) add("dmgB", ovp.b);
  const g = k => acc[k] || 0;
  // attribute: screen value (entered, or predicted from base + Bionic Computer neurons + chips + full R&D), then battle-only % on top
  const attr = W.attr;
  const rdFlat = (D.rd[P.class] || []).filter(e => e.f === "attr_add" && e.a === attr).reduce((a, e) => a + e.v * rdScale(s, P.class, e), 0);
  const rdPct = (D.rd[P.class] || []).filter(e => e.f === "attr_pct" && e.a === attr).reduce((a, e) => a + e.v * rdScale(s, P.class, e), 0);
  const Pscreen = star.bonus + rdPct;
  const chipKnown = s.chips["attr:" + attr] != null;
  const entered = +s.screen[attr] || 0;
  let chipAttr = chipKnown ? s.chips["attr:" + attr] : 0, chipInferred = false;
  const base0 = baseOf(s, star)[attr];
  if (!chipKnown && entered) { chipAttr = Math.max(0, entered / (1 + Pscreen) - base0 - P.bionic[attr] - rdFlat); chipInferred = true; }
  const predicted = (base0 + P.bionic[attr] + chipAttr + rdFlat) * (1 + Pscreen);
  const screen = entered || predicted;
  const bPct = g("attr_pct:" + attr), bFlat = g("attr_add:" + attr) + (x.attr || 0);
  const attribute = (screen / (1 + Pscreen) + bFlat) * (1 + Pscreen + bPct);
  const implied = entered && chipKnown ? entered / (1 + Pscreen) - base0 - P.bionic[attr] - chipAttr : null;
  const suit = D.suit[String(star.rank)][st.cls] || { atk: 0, hit: 0 };
  // attack
  const partFp = PARTS.reduce((a, p) => a + partFpAt(s, st, p), 0);
  const fpEff = (partFp + g("fp_add")) * (1 + W.fvm) * (1 + g("fp_pct"));
  const imprO = rdOv(s, "impr|" + W.type), imprSave = typeof w.impr === "number" ? w.impr : null;
  const impr = imprO != null ? imprO : imprSave != null ? imprSave : W.impr || 0, advAtk = w.atk || 0;   // R&D panel value, else the loaded grade, else max
  if (imprO != null) rdEd.impr = true; else if (imprSave != null && imprSave !== (W.impr || 0)) rdEd.impr = "save";
  const atkFlat = W.atk + impr + advAtk + g("atk_add");
  const srcAtk1 = (atkFlat + fpEff) * (1 + g("atk_pct")) * (1 + suit.atk);
  // a two-hand average skill shoots at the mean of both hands' attack, hit and crit inputs (fields averaged pairwise)
  const srcAtk = avgR ? (srcAtk1 + avgR.srcAtk1) / 2 : srcAtk1;
  const r = attribute / tg.def, pmult = 1 + 2 / 3 * atanN((r - 1 / r) / 1.5);
  // hit
  // hit (CalcHitValueTotal / CalcRealHitRate): weapon hit + the firing arm's hit (two-handed weapons: both arms)
  const TI = (D.hitthr || {})[W.type] || { thr: 0, comp: false, two: false };
  const armPart = atkSlot === "LH" ? "Left arm" : atkSlot === "RH" ? "Right arm" : "Left arm";
  const arms = TI.two ? ["Left arm", "Right arm"] : [armPart];
  const armHit = arms.reduce((a, p) => a + partHitAt(s, st, p), 0);
  const chipHit = s.chips["hit:" + W.cat] || 0, chipCrit = s.chips["crit:" + W.cat] || 0;
  const wHitP = 1 + g("whit_pct") + g("hit_cat_pct") + suit.hit, aHitP = 1 + g("ahit_pct") + g("hit_cat_pct") + suit.hit;
  const wHit = (W.hit + g("whit_add")) * wHitP;
  const aHit = arms.reduce(a => a + (0 + g("ahit_add") + chipHit) * aHitP, 0) + armHit * aHitP;
  // the target's legs destroyed: its dodge is 0 (BattleActorTacticalUnitCompBodyPart.DodgeGet: IsWapPartDestroy(Leg) -> Zero),
  // so the chance is rate x 1.4 + adds (Formula.CalcRealHitRate, static 1.4); here at the start of the attack; legs destroyed later in
  // the fight or by an earlier shot of the attack: hitAfterL (the fight simulation)
  const legsGone = (() => { const a = aliveStart(); return !!a && !a.has("Legs"); })();
  // your dodge cuts on the target join its own multi: eDodgePts = (base + adds) x (1 + its multi + cuts), no floor in the formula
  // (Formula.CalcActorWapPartDodgeFinal; the base is its legs', read live every shot)
  const dCut = g("dodge_pct"), dAdd = g("dodge_add"), dMul = tg.dmul || 0;
  const dgCut = !dCut && !dAdd ? tg.dodge : Math.max(0, (tg.dodge_base != null ? tg.dodge_base : tg.dodge / (1 + dMul)) + dAdd) * Math.max(0, 1 + dMul + dCut);
  const H1 = wHit + aHit, H = avgR ? (H1 + avgR.H1) / 2 : H1, Dg = legsGone ? 0 : dgCut;
  const hitX = H / Dg - Dg / H, hitK = hitX <= 0 && H > TI.thr ? 4 : 0.5;
  const hitRes = (tg.hit_res || 0) + g("hitres");
  // chance on a shot after m misses in a row (MG / HMG / Shotgun / Flamethrower: base rate +10% per miss, reset by a hit). The game adds its
  // 0.05 (CalcSrcHitRateCompensation, Formula static +0x28) twice per miss: SkillPipelineApplySingleAttack adds it to the round's hit info
  // (+0x88 -> +0x38) inline and again through SrcHitRateCompensationAdd; CalcRealHitRate adds +0x38 to the base
  // rate (+0x10) before the (0.9 + HitPts_term) multiplier. A shot at 0% on the round's first shot count adds nothing (damage flag 0x1000)
  const rate = avgR ? (W.rate + avgR.W.rate) / 2 : W.rate, hitAdd1 = g("hitrate"), hitAdd = (avgR ? (hitAdd1 + avgR.hitAdd1) / 2 : hitAdd1) - hitRes;
  const hitT = 0.9 + 0.5 * atanN(hitX / hitK), hitMemo = [];
  // the sure-hit threshold (BattleActorCompBodyPartBase.CalcIsHit): a shot whose hit chance is 0 misses; one at
  // 1 + HitRateThresholdAdd (clamped to 0-1, default 1) or more always hits without a roll; any other rolls its chance. Set once the late
  // effects are in (Sharpshooter's own condition is 'hit rate >= 90%')
  let hitThr = 1;
  const hitSure = v => v > 0 && v >= hitThr ? 1 : v;
  // can't be dodged: the skill's flag 0x2, a buff of yours with GamePlayFlags 0x10000 or your mark on the target with 0x8000, or the
  // target's own state (Rack (HMG) ...): every shot of the round hits with no roll (CalcRealHitRate returns 1 before the formula)
  const udgSrc = [...((A.sf || 0) & 0x2 ? [sk.n || "the skill"] : []),
  ...(g("udg") > 0 ? rows.filter(r => r.effs.some(x => x.act && !x.dup && x.e.f === "udg")).map(r => r.src.label.replace(/^[^:]+: /, "")) : [])];
  for (const e of bossFx(tg)) if (e.use && e.f === "udg") { ctx.held = "target"; const ok = (e.c || []).every(c => condState(c, ctx, W) !== false); ctx.held = "you"; if (ok) udgSrc.push("target: " + e.n); }
  const udg = udgSrc.length > 0;
  // every shot at it misses (Absolute Dodge, Kindle while your unit carries Malfunction: GamePlayFlags 0x4000 DodgeInevitable;
  // CalcRealHitRate returns 0 past any hit floor, sure hit or guaranteed hits)
  const missSrc = [];
  for (const e of bossFx(tg)) if (e.use && e.f === "miss") { ctx.held = "target"; const ok = (e.c || []).every(c => condState(c, ctx, W) !== false); ctx.held = "you"; if (ok) missSrc.push(e.n); }
  const amiss = missSrc.length > 0;
  // a hit-rate floor (the highest of your active ones: Heavy Machine Gun Modification 30%) after the formula, before the clamp and the
  // sure-hit threshold; guaranteed hits per round (Shotgun Modification: 3) and a Chainsaw round (skill flag 0x1000000: the first shot
  // decides, OneHitAttack) are rules of the round (the shot programme and the simulation)
  const actMax = f => Math.max(0, ...rows.flatMap(r => r.effs.filter(x => x.act && !x.dup && x.e.f === f).map(x => +x.e.v || 0)));
  const hfloor = actMax("hfloor"), ghc = amiss && !udg ? 0 : Math.round(actMax("ghc")), aon = !!((A.sf || 0) & 0x1000000);
  // deflect: a missed shot still deals this share of its plain damage, no crit, at least 1 (min(1, sum) of your active Deflect buffs)
  const defl = Math.min(1, rows.reduce((a, r) => a + r.effs.filter(x => x.act && !x.dup && x.e.f === "defl").reduce((b, x) => b + (+x.e.v || 0), 0), 0));
  const hitRaw = m => udg ? 1 : amiss ? 0 : Math.max(0, Math.min(1, Math.max(hfloor, (rate + (TI.comp ? HIT_COMP * m : 0)) * hitT + hitAdd)));
  const hitAfter = m => hitMemo[m] !== undefined ? hitMemo[m] : (hitMemo[m] = hitSure(hitRaw(m)));
  // the real hit chance (CalcHitRateOnHitTarget, clamped to its floor and 1, no threshold): what 'own hit rate' checks and the
  // by-hit-rate effects read (ActorBufPropertiesModifyInBattleByHitRate.GetPropertiesValue asks the skill for it)
  const hitReal = hitRaw(0);
  for (const r of rows) if (r.forced) for (const x of r.effs) if (x.a0 && x.a0.late && x.a0.late.some(c => c.t === "hitr" && !(SIT.area <= 1 && CMP[c.op || ">="](hitReal, c.v)))) x.a0.eok = false;   // (auto's words)
  // read from this hit chance (Dominator Locator; 'Own hit rate >= N%' on a single-target attack): no effect of this kind changes the hit rate
  for (const { x, src } of hitLate) {
    const e = x.e; if (CRIT_SC.has(SC(e.sc))) continue;
    {
      const F = x.late ? x.late.filter(c => c.t === "hitr" && !(SIT.area <= 1 && CMP[c.op || ">="](hitReal, c.v))) : [];
      if (F.length) { x.eok = false; x.act = false; x.fc = [...(x.fc || []), ...F]; continue; }
    }
    const v = (e.sc ? scVal(e, SIT, ctx, { held, hit: hitReal }) : effVal(s, src, e)) * (x.fr != null ? x.fr : 1); x.val = v;
    if (e.f === "armor_pct") armorPct[e.part || "all"] += v; else add(e.f + (e.a ? ":" + e.a : ""), v);
  }
  hitThr = Math.max(0, Math.min(1, 1 + g("hthr"))); hitMemo.length = 0;
  const hit = hitAfter(0);
  // legs destroyed later in the fight, or by an earlier shot of this attack: the game reads the dodge again for every shot
  // (DodgeGet), so from the next shot the target has none and the term is at its maximum (0.9 + 0.5); what the attack read
  // once at its start (hit-rate conditions, by-hit-rate effects) keeps its value
  const hitMemoL = [], hitRawL = m => udg ? 1 : amiss ? 0 : Math.max(0, Math.min(1, Math.max(hfloor, (rate + (TI.comp ? HIT_COMP * m : 0)) * 1.4 + hitAdd)));
  const hitAfterL = legsGone ? hitAfter : m => hitMemoL[m] !== undefined ? hitMemoL[m] : (hitMemoL[m] = hitSure(hitRawL(m)));
  // crit points CritPts_total (CalcActorCriticalAppendFinal): chips + actor adds + (weapon base + R&D for this weapon type + weapon adds) x (1 + weapon %)
  const rdCritDef = (D.rdcrit || {})[String(D.wtBits[W.type] || 0)] || 0, rdCritO = rdOv(s, "crit|" + W.type), rdCrit = rdCritO == null ? rdCritDef : rdCritO;
  if (rdCritO != null) rdEd.crit = true;
  const SvW = (W.crit_app + rdCrit + g("crit_app_add")) * (1 + g("crit_app_pct"));
  const Sv1 = chipCrit + g("crit_app_flat") + SvW + g("crit_app_fin"), Sv = avgR ? (Sv1 + avgR.Sv1) / 2 : Sv1, Tv = tg.crit_res || 1;
  // crit chance (CalcRealCriticalRate) = rate adds x (1 + rate multis) + 0.3 x atanN((S/T - T/S) / 0.5) - target crit-rate resist
  const critTerm = Sv > 0 ? 0.3 * atanN((Sv / Tv - Tv / Sv) / 0.5) : -0.3;
  const critAdj = 0;   // no separate extra crit chance here: it is "Crit rate after features +" under Extra bonuses (crit_fin)
  const critBuffs1 = g("crit_rate") * (1 + g("crit_mul")) + g("crit_fin"), critBuffs = avgR ? (critBuffs1 + avgR.critBuffs1) / 2 : critBuffs1;
  // a sure crit (ActorActiveSkillBase.IsCriticalInevitable, checked first in CalcCriticalRateOnHitTarget):
  // the executing skill has SkillFlag 0x20 (a sub-skill round its own flags) or you hold an active buff with GamePlayFlags 0x20000
  // (Bella's Breath Hold in Stealth); then the chance is 1 whatever the crit terms
  // a lock-on skill (AttackSelectMultiTargets) hands every round to its sub-skill, which runs the shots (SingeHandDamageCtxSrcAttackInfoCreate
  // asks IsCriticalInevitable of the executing skill): the sub-skill's flags count (the containers' 0x20 never reaches a shot)
  // ...and so does every container whose plan hands its rounds to sub-skills (Delayed Engagement, a MultiSlotAttack whose
  // slot sub-skill 4011062, flags 28, fires every shot): the main round's flags are its first step's sub-skill's
  const mainSub = !s._part && plan ? ((plan.steps.find(x => x.kind === "main") || { streams: [] }).streams.find(y => y.slot === atkSlot) || {}).sub : null;
  const subRun = !s._part && (A.ft === "AttackSelectMultiTargets" || !!mainSub);
  const skFlag = sk.sf != null ? sk.sf : subRun ? ((mainSub || (sk.st && sk.st.sub) || {}).sf || 0) : (A.sf || 0);
  const sureSrc = (skFlag & 0x20) ? [sk.sn || sk.n] : [];
  // named by its row (the skill or item: Breath Hold), not the buff's data name
  for (const r of rows) for (const x of r.effs) if (x.act && x.e.f === "gcrit") sureSrc.push(r.src.label.replace(/^[^:]+: /, "") || x.e.n);
  const sureCrit = sureSrc.length ? [...new Set(sureSrc)] : null;
  const crit = sureCrit ? 1 : Math.max(0, Math.min(1, critBuffs + critTerm - ((tg.crit_rate_res || 0) + g("critres")) + critAdj));
  for (const { x } of hitLate) if (CRIT_SC.has(SC(x.e.sc))) { const v = scVal(x.e, SIT, ctx, { held, hit, crit }); x.val = v; add(x.e.f, v); }   // by crit chance -> crit DMG
  // 1 + max0(attacker ratio + target crit DMG taken - its crit-DMG resist f(v)) (CalcFinalDamage, CalcDefenderCriticalDamageRatio)
  const cdBase1 = W.crit_dmg + g("crit_dmg"), cdBase = avgR ? (cdBase1 + avgR.cdBase1) / 2 : cdBase1;
  critT += g("critT");                                                 // crit DMG taken you put on the target (794, read live on the defender)
  const critDmg = Math.max(0, cdBase + critT - fcd(g("critdres")));
  // skill
  // shots fired (OneRoundAttackCountGetDefault): n = base + adds; n + ceil(n x multi) (multi > 0) or + floor(n x multi), at least 1.
  // The attack is still divided by the skill's base count (CalcStandardAttackCount), so extra shots are extra damage.
  // an area attack (shots go round the parts) fires one shot per target part per stream and divides by 4 (OneRoundAttackCountGet
  // asks the target, HitWapPartCountGet = 4; CalcStandardAttackCount): shot adds don't apply to it
  const areaN = !!A.rot;
  const baseShots = sk.h || 1, nShots = baseShots + (areaN ? 0 : Math.round(g("shots"))), shotM = areaN ? 0 : g("shots_pct");
  // 'N times' skills fire their round 1 + FuncParams[0] times (Shower 2 x 1 shot), each shot one share of the base count
  const rounds = sk.r || 1, shots = rounds * Math.max(1, nShots + (shotM > 0 ? Math.ceil(nShots * shotM - 1e-9) : Math.floor(nShots * shotM + 1e-9)));
  const skillM = sk.m + g("skillM");
  // per part: max0(SkillM) x max0(1 + DMG% + the target's DMG taken for that part) x max0(1 + its own damage factor) x max0(1 + FinalDMG%)
  // (CalcDmgPerAttack; the part term is the hit part's only). H = the target's part state (H_START, or the fight simulation's)
  // terms without a condition are summed once per part; only the ones with a part-HP condition are re-checked (per shot in the simulation)
  const sDB = {}, sNpc = {}, dynT = {};
  for (const p of PARTS) { sDB[p] = g("dmgB"); sNpc[p] = g("npcB"); dynT[p] = []; }
  for (const q of tterm) for (const p of PARTS) if (q.part == null || q.part === p) {
    if (q.c.length) dynT[p].push(q); else if (q.f === "dmgB") sDB[p] += q.v; else sNpc[p] += q.v;
  }
  const dynSum = (p, H, f) => {
    let a = 0;
    for (const q of dynT[p]) { if (q.f !== f) continue; let ok = true; for (const c of q.c) if (partCond(c, p, H) !== true) { ok = false; break; } if (ok) a += q.v; }
    return a;
  };
  const dB = (p, H) => sDB[p] + (dynT[p].length ? dynSum(p, H, "dmgB") : 0);
  const npcF = (p, H) => Math.max(0, 1 + sNpc[p] + (dynT[p].length ? dynSum(p, H, "npcB") : 0));
  const finM = Math.max(0, 1 + g("finalB")), skM = Math.max(0, skillM);
  // the attacker's own damage factor max0(1 + AttackerNpcDamageMulti, property 744): the bench has no source of it except a repeat attack on
  // the same target (Vengeance Strike: CostAllAmmoBufTargets puts FP[1] / 100 = -0.6 into ctx +0xd0, which
  // SingeHandDamageCtxSrcAttackInfoCreate adds to property 744): x0.4 on the repeats
  const npcA = Math.max(0, 1 + ((s._part && s._part.anpc) || 0));
  // the target's shield ('Shield working' on the target panel, default on): shots on its arm x max0(1 + ShieldDefenseDamageMulti)
  // (BattleActorCompBodyPartBase.CalcShieldDefenseMulti, its own factor in CalcDmgPerAttack) unless the attack has skill flag 0x10
  // (ShieldDefenseDisableTarget) or is an area attack; a destroyed shield arm takes no shots, so the factor never needs the arm's state
  // (the shield of the weapon set it carries now, none while its arm is ticked under Already destroyed; the tick is for the rest)
  const shd0 = tgShield(T.target), shd = shd0 && !(T.shOff || {})[T.target] && !(T.dead && T.dead.has(shd0.arm)) ? shd0 : null, sf10 = !!((A.sf || 0) & 0x10), rot = !!A.rot;
  const shF = {}; for (const p of PARTS) shF[p] = shd && p === shd.arm && !sf10 && !rot ? Math.max(0, 1 + (shd.f || 0)) : 1;
  // ignore damage reduction (your mark on the target with IgnoreDefenseAllSubDamage: CalcIgnoreSubDamagePropertyValue):
  // each of the target's damage-taken totals below 0 counts as 0 on that shot (its whole-unit 324 and hit-part 546-549 terms of DMG%, its
  // damage factor 469, its side of FinalDMG% 793, the shield's cut); yours stay. Static (Penetrating Shot, Positron Loaded) or per hit
  // (Synchronized Miracle: the first 4 landed hits)
  const ignS = rows.some(r => r.effs.some(x => x.act && !x.dup && !x.ph && x.e.f === "ign"));
  const tStat = {}; for (const p of PARTS) tStat[p] = { act: tgtS.dmgB, part: 0 };
  for (const q of tterm) if (!q.c.length && q.f === "dmgB") for (const p of PARTS) { if (q.part == null) tStat[p].act += q.v; else if (q.part === p) tStat[p].part += q.v; }
  const dynSplit = (p, H) => {
    const o = { ya: 0, ta: 0, tp: 0, tn: 0 };
    for (const q of dynT[p]) {
      let ok = true; for (const c of q.c) if (partCond(c, p, H) !== true) { ok = false; break; } if (!ok) continue;
      if (q.f === "npcB") o.tn += q.v; else if (q.f === "dmgB") { if (!(q.boss || q.tgt)) o.ya += q.v; else if (q.part == null) o.ta += q.v; else o.tp += q.v; }
    }
    return o;
  };
  const yDB = g("dmgB") - tgtS.dmgB, yFin = g("finalB") - tgtS.finalB;
  // DMG% with the target's totals floored at 0 (ex: extra per-hit sums, yours / the target's)
  const dBi = (p, H, exY = 0, exA = 0, exP = 0) => {
    const d = dynT[p].length ? dynSplit(p, H) : { ya: 0, ta: 0, tp: 0 };
    return yDB + d.ya + exY + Math.max(0, tStat[p].act + d.ta + exA) + Math.max(0, tStat[p].part + d.tp + exP);
  };
  const npcFi = (p, H, ex = 0) => 1 + Math.max(0, sNpc[p] + (dynT[p].length ? dynSum(p, H, "npcB") : 0) + ex);
  const finMi = Math.max(0, 1 + yFin + Math.max(0, tgtS.finalB));
  const Kp = ignS ? (p, H) => skM * Math.max(0, 1 + dBi(p, H)) * npcFi(p, H) * finMi * npcA
    : (p, H) => skM * Math.max(0, 1 + dB(p, H)) * npcF(p, H) * finM * npcA * shF[p];
  const H0 = H_START(), K = Kp(T.part, H0);
  // the game sums every armor % on the part (the target's own buffs and your cuts) into one term: max0(raw x (1 + sum))
  const amul = tg.amul || 0, armorRaw = tg.armor_base ? tg.armor_base[T.part] : tg.armor[T.part] / (1 + amul), armorBase = tg.armor[T.part];
  const armorPctTot = amul + armorPct.all + armorPct[T.part] - (s.extra.shred || 0) / 100;
  const armor = Math.max(0, armorRaw * (1 + armorPctTot));
  const perBefore = srcAtk * pmult / baseShots;
  const shot = Math.max(1, Math.max(0, perBefore - armor / 10) * K), shotCrit = shot * (1 + critDmg);   // a landed hit deals at least 1
  // scatter: each shot lands on a part by the attack's weight profile (ActiveSkillInfo.AttackRandomWapPart4DamageInfo; Normal
  // Attacks 25% each), destroyed limbs drop out, each part keeps its own armor
  const armorBy = {}, shotBy = {};
  for (const p of PARTS) {
    const raw = tg.armor_base ? tg.armor_base[p] : tg.armor[p] / (1 + amul);
    armorBy[p] = Math.max(0, raw * (1 + amul + armorPct.all + armorPct[p] - (s.extra.shred || 0) / 100));
  }
  const base = {}; for (const p of PARTS) { base[p] = Math.max(0, perBefore - armorBy[p] / 10); shotBy[p] = Math.max(1, base[p] * Kp(p, H0)); }
  // the simulation's per-shot version: the same sums with the part-HP checks inlined (it runs for every simulated shot)
  const dynC = {}; for (const p of PARTS) dynC[p] = dynT[p].map(q => ({
    npc: q.f === "npcB", v: q.v, c: q.c.map(c => c.t === "hitmm" ? { mm: 1, max: !!c.max }
      : c.t === "parts" ? { pc: 1, o: OPC[c.op || ">="], v: c.n || 0, st: c.start ? 1 : 0 }
        : { mm: 0, ps: c.part === "arm" ? ["Left arm", "Right arm"] : PARTS.includes(c.part) ? [c.part] : [], o: OPC[c.op || ">="], v: c.v || 0, dest: !!c.dest })
  }));
  const shotAt = (p, H) => {
    const L = dynC[p]; if (!L.length) return shotBy[p];
    if (ignS) return Math.max(1, base[p] * Kp(p, H));
    let d = sDB[p], n = sNpc[p];
    for (const q of L) { if (simConds(q.c, p, H)) { if (q.npc) n += q.v; else d += q.v; } }
    return Math.max(1, base[p] * skM * Math.max(0, 1 + d) * Math.max(0, 1 + n) * finM * npcA * shF[p]);
  };
  const dyn = tterm.some(q => q.c.length);                 // some term switches with the target's part HP: the simulation re-checks it per shot
  const pwMax = {}; for (const p of PARTS) pwMax[p] = tg.hp[p] * T.hp / 100;
  // the target's part rules for this attack (the game's order in partWeights): its forced part (Ultimate Form: the Legs, against the
  // weapon types its condition names, while they stand), a Large Shield (every shot of an attack without 0x10 on its arm), a Small Shield (+w
  // on its arm in the rolled pick), an area attack's rotation (rot)
  const frc = [];
  for (const e of bossFx(tg)) if (e.use && e.f === "force" && e.part) {
    const oc = (e.c || []).filter(c => c.t !== "bphp"); ctx.held = "target";
    const ok = oc.every(c => condState(c, ctx, W) === true); ctx.held = "you";
    if (ok) frc.push(e.part);
  }
  const tr = { frc, rot, lsh: shd && shd.kind === "Large" && !sf10 ? shd.arm : null, ssh: shd && shd.kind === "Small" && !sf10 && shd.w ? { arm: shd.arm, w: shd.w } : null };
  const pw = { adj: pwAdj, hit: pwHit, max: pwMax, tr, dyn: pwAdj.some(a => [1, 2, 6, 7, 8, 9, 11].includes(a.m) || (a.m === 4 && !a.pt)) };
  const wts = partWeights(sk, aliveStart(), pw), hitAvg = PARTS.reduce((a, p) => a + wts[p] * shotBy[p], 0);
  // expected hits per attack, following the miss streak (compensation); the streak starts again with every round of the skill
  let dist = [1], expHits = 0;
  for (let i = 0; i < shots / rounds; i++) {
    const nd = new Array(dist.length + 1).fill(0);
    dist.forEach((q, m) => { if (!q) return; const p = hitAfter(m); expHits += q * p; nd[0] += q * p; nd[m + 1] += q * (1 - p); });
    dist = nd;
  }
  expHits *= rounds;
  const expShot = (shots ? expHits / shots : 0) * hitAvg * (1 + crit * critDmg);
  // Fia's Tokamak Sphere: a Rail Gun / Flamethrower area attack that passes the sphere hits again at 0.6x (the skill's text) in the new direction
  const tkmKit = !s._xatk && ["M400750", "M400751", "M400752"].some(k => (s.skills || []).includes(k) || s.ex === k) && A.aoe === 1 && (W.type === "RailGun" || W.type === "Flamethrower");
  if (tkmKit && SIT.u && SIT.u.tkm) xps.push({ t: "rd", v: 0.6, n: "Tokamak Sphere redirect" });
  // Collateral DMG on the target's other parts (SkillPipelineApplyCollateralDamage, called by OneHitAttack for a hit that dealt
  // damage when the round fires 1 shot or the skill has flag 0x10000000, CollateralDamageCheck): CollateralDamageMulti (property 489:
  // the skill's own + your effects; 0 or less: none) x that hit's damage, on CollateralAttackWapPartCountAdd (554) random other standing parts
  // (0, or 3 and more: every other standing part); built as RawValue: no armor, bonuses or crit of its own, never counted as a hit
  const collM = g("coll") + (sk.cm != null ? sk.cm : (A.cm || 0)), collN = Math.round(g("colln"));
  if (collM > 0 && collN >= 0 && (shots / rounds === 1 || ((A.sf || 0) & 0x10000000))) xps.push({ t: "coll", v: collM, parts: collN === 0 || collN >= 3 ? 3 : collN, n: "Collateral DMG" });
  const fixB = g("fixB");                                  // FixDMG%, the attacker's Fixed DMG +X% bonus, scales Explosive Charge and Detonate (not Splash)
  for (const x of xps) if (x.t === "ec" || x.t === "ecs") x.val = x.v * srcAtk * (1 + fixB);
  const othUp = p => PARTS.reduce((a, q) => a + (q !== p && hUp(H0, q) ? 1 : 0), 0);
  const xpE = xps.reduce((a, x) => a + (x.t === "ec" || x.t === "ecs" ? expHits * x.val
    : x.t === "coll" ? x.v * expHits * (1 + crit * critDmg) * PARTS.reduce((b, p) => b + wts[p] * shotBy[p] * Math.min(x.parts, othUp(p)), 0)
      : x.v * expHits * hitAvg * (1 + crit * critDmg)), 0);
  const deflE = defl > 0 ? Math.max(0, shots - expHits) * PARTS.reduce((a, p) => a + wts[p] * Math.max(1, defl * shotBy[p]), 0) : 0;   // misses that deflect
  const expAtk = expHits * hitAvg * (1 + crit * critDmg) + xpE + deflE;
  // tick = Max(Floor(part max HP x 12% x (1 + eFixRatioRes%) + 0.5), 1) (Percentage DMG, BattleActorCompBodyPartBase.CalcFixDamage): at least 1
  // (Burning under the target and who made it come from the one store, Situation > Terrain under the target)
  const burnT = SIT.tTgt.cat === "flame", burnOwn = burnT && SIT.tTgt.by === "you";
  const burnPct = (D.terrain && D.terrain.burn) || 0.12, burnRes = 1 + (tg.fixres || 0) + (burnOwn ? g("fixB") : 0);
  const burn = {}; for (const p of PARTS) burn[p] = burnT ? Math.max(1, Math.round(tg.hp[p] * burnPct * burnRes)) : 0;
  // skills that set off the target's terrain after combat (Burning Spirit, Shared Resolve): one extra tick on this attack
  const burnSet = !s._xatk && !s._part && burnT && s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].tt;
  const burnNow = burnSet ? (T.mode === "focus" ? burn[T.part] : PARTS.reduce((a, p) => a + burn[p], 0)) : 0;   // the whole unit when shots scatter
  // fixed damage after the attack, once per cast after every round, follow-up and the retaliation (WholeSkillEnd4Targe 16384, then
  // the after-combat 8192), RawValue: no hit roll, crit, armor, damage bonuses or shield cut. bomb = one shot on a part rolled over the
  // standing parts, the target's own forced part / a working Large Shield first (Great Creation: int(ATK) x 0.4 x (1 + FixDMG%); needs a hit
  // that dealt damage); each = the full value on every standing part (Afterglow: 4 rotating shots); split = one total shared by the
  // standing parts (Rondo - Flamethrower, per weapon of the skill); scb = Short Circuit set off at once (Instant Detonation): each standing
  // part loses min(7% x (1 + FixDMG%), 1) of its max HP x (1 + its Percentage DMG taken) and keeps 1 HP; none on a target that avoids
  // ratio damage (GamePlayFlags 0x40000000). Execution and Terminator 4 only act on the fight's part HP (Attacks to kill).
  const al0s = aliveStart(), upS = p => p === "Body" || !al0s || al0s.has(p), upL = PARTS.filter(upS);
  const pNone = Math.pow(aon ? 1 - hitAfter(0) : (dist[dist.length - 1] || 0), rounds);      // every shot of the attack missed
  const afxL = [], fixFn = (a, x) => (a.fx ? 1 + fixB : 1) * x;
  // max-HP share hits: Max(Floor(max HP x share x (1 + FixDMG% when it counts) x (1 + eFixRatioRes) + 0.5), 1) on every standing part
  // (none on a target that avoids ratio damage); keep1 = a part keeps 1 HP, pre = before the shots (Twin-Blade Saw)
  const mhpHit = (a, n, keep1, pre) => {
    const by = {}; for (const p of PARTS) by[p] = tg.fixav ? 0 : Math.max(1, Math.floor(tg.hp[p] * fixFn(a, a.v) * (1 + (tg.fixres || 0)) + 0.5));
    return { t: "mhp", v: a.v, by, n, keep1: !!keep1, pre: !!pre, hit: !!a.hit, brk: !!a.brk };
  };
  if (A.mhp && !s._xatk && !s._part) afxL.push(mhpHit({ v: A.mhp, fx: false }, sk.n, true, true));   // Twin-Blade Saw: before its shots
  let execT = 0, t4 = 0;
  for (const e of afxRows) {
    if (e.f === "exec") { execT = Math.max(execT, e.v); continue; }
    if (e.f === "t4") { t4 = Math.max(t4, e.v); continue; }
    const a = e.afx || {};
    if (a.t === "scb") {
      const by = {}; for (const p of PARTS) by[p] = tg.fixav ? 0 : Math.max(1, Math.floor(tg.hp[p] * Math.min(1, fixFn(a, a.v)) * (1 + (tg.fixres || 0)) + 0.5));
      afxL.push({ t: "scb", v: a.v, by, n: e.n }); continue;
    }
    if (a.t === "mhp") { afxL.push(mhpHit(a, e.n)); continue; }   // a share of each part's max HP (RA - Ballistics Block)
    for (const atk of a.w === "all" && avgR ? [srcAtk, srcAtk] : [srcAtk])         // Rondo: every weapon of the skill (a two-hand average skill: both)
      afxL.push({ t: a.t, v: a.v, hit: !!a.hit, brk: !!a.brk, n: e.n, flat: !!a.flat, blk: !!a.blk, val: a.t === "split" ? fixFn(a, a.v * atk) : Math.max(1, Math.floor(fixFn(a, a.v * Math.floor(atk)) + 0.5)) });
  }
  const afxP = (frc || []).find(upS) || (shd && shd.kind === "Large" && upS(shd.arm) ? shd.arm : null);
  // a part immune to damage (Absolute Defense's body while no part is destroyed, Amnion) takes none of it (OnHitDamageAvoid also
  // stops these hits); the same immunity terms the shots use, read at the start of the attack here and on the fight's part HP in Attacks to kill
  const afxImmQ = phT.filter(q => q.f === "imm"), C0 = { lr: 0, ls: 0, lw: 0, cs: 0 }, H0a = H_START();
  const afxImm = (p, H) => afxImmQ.some(q => (q.part == null || q.part === p) && termOn(q, C0, 0, H || H0a, p));
  const brkOn = !!(SIT && SIT.u && SIT.u.broke);              // 'this attack destroys a part' (EM Burst): the Situation tick
  const afxOn = (x, p) => !upS(p) || afxImm(p) || (x.brk && !brkOn) ? 0 : x.t === "bomb" ? x.val * (afxP ? (p === afxP ? 1 : 0) : 1 / upL.length) * (x.hit ? 1 - pNone : 1)
    : x.t === "each" ? x.val : x.t === "split" ? Math.max(1, Math.floor(x.val / upL.length + 0.5))
      : x.t === "mhp" && !x.keep1 ? x.by[p] * (x.hit ? 1 - pNone : 1) : Math.min(x.by[p], Math.max(0, tg.hp[p] * T.hp / 100 - 1));
  const afxNow = afxL.reduce((a, x) => a + (T.mode === "focus" ? afxOn(x, T.part) : PARTS.reduce((b, p) => b + afxOn(x, p), 0)), 0);
  const R = {
    ctx, ovp, burn, burnNow, burnT, burnOwn, afxL, afxNow, afxP, afxImm: afxImmQ.length ? afxImm : null, execT, t4, pNone, burnPct, burnRes, s, W, w, P, star, st, tg, atkSlot, shF, shd, legsGone, udg, udgSrc, amiss, missSrc, hfloor, ghc, aon, defl, deflE, ignS, attr, rdFlat, rdPct, Pscreen, chipAttr, chipInferred, chipKnown, predicted, entered, screen, bPct, bFlat, attribute, implied, suit,
    partFp, fpEff, impr, advAtk, atkFlat, srcAtk, r, pmult, armPart, arms, armHit, wHit, aHit, wHitP, aHitP, hitX, hitK, hitRes, hitAfter, expHits, TI, chipHit, chipCrit, H, Dg, hit, Sv, SvW, rdCrit, rdBy, rdEd, chipCrit, Tv, crit, critAdj, critBuffs, critDmg, sk, baseShots, areaN, shots,
    nShots, shotM, armorPct, skillM, K, armorBase, armorRaw, amul, armor, armorPctTot, armorCuts: armorPct.all + armorPct[T.part], perBefore, critTerm, shot, shotCrit, expShot, expAtk, rows, raStates, g, partHp: tg.hp[T.part], armorBy, shotBy, wts, hitAvg, burnSet, pw, xps, xpE, rounds, bossYou, bossTgt,
    tterm, dB, npcF, Kp, shotAt, dyn, critT, sit: SIT, npcA, probEv, pickEv, chanceP, held, rk: srcs.rk || [], apc: srcs.apc || [], accFire, weap, plan, srcAtk1, H1, hitAdd1, Sv1, critBuffs1, cdBase1, avgR, rate, tkm: tkmKit && !s._part ? !!(SIT.u && SIT.u.tkm) : null
  };
  R.mlv = mlv; R.fol = fol;
  // hit by hit: this round's per-hit terms and the shot primitives they enter; with no term they give the numbers above
  R.ph = phT;
  const critMul = 1 + g("crit_mul"), cdRaw = cdBase + critT, cdres0 = g("critdres");
  const armRawP = p => tg.armor_base ? tg.armor_base[p] : tg.armor[p] / (1 + amul), armPctP = p => amul + armorPct.all + armorPct[p] - (s.extra.shred || 0) / 100;
  const npcIn = (p, H) => 1 + sNpc[p] + (dynT[p].length ? dynSum(p, H, "npcB") : 0);
  const fl = Tm => Tm._fl || (Tm._fl = new Set(Tm.map(q => q.f)));
  R.npcIn = npcIn;
  // which of a part's HP-dependent terms hold in part state H, as bits: dB(p, H) and npcIn(p, H) depend on H only through it
  R.dynKey = (p, H) => { const L = dynT[p]; let k = 0; for (let j = 0; j < L.length; j++) { let ok = true; for (const c of L[j].c) if (partCond(c, p, H) !== true) { ok = false; break; } if (ok) k |= 1 << j; } return k; };
  R.hitAfterL = hitAfterL;
  R.hitPH = (Tm, m, c, i, H) => {
    const F = fl(Tm), L = !legsGone && !!(H && H.alive && !H.alive.has("Legs"));     // legs destroyed since the start
    if (amiss && !udg) return 0;                                                // it dodges every shot (a can't-be-dodged attack still hits)
    if (udg || (!F.has("hitres") && !F.has("hitrate"))) return L ? hitAfterL(m) : hitAfter(m);
    return hitSure(Math.max(0, Math.min(1, Math.max(hfloor, (rate + (TI.comp ? HIT_COMP * m : 0)) * (L ? 1.4 : hitT) + hitAdd + sumT(Tm, "hitrate", c, i, H, null) - sumT(Tm, "hitres", c, i, H, null)))));
  };
  R.hitReal = hitReal; R.hitThr = hitThr;
  // the hit chance from which shots are sure in practice: the threshold, or the sure-hit effect's own 'hit rate >= N%' when higher (94%)
  R.hitThrAt = Math.max(hitThr, ...rows.flatMap(r => r.effs.filter(x => x.act && x.e.f === "hthr").flatMap(x => (x.e.c || []).filter(c => c.t === "hitr").map(c => c.v))));
  R.sureCrit = sureCrit;
  R.critPH = (Tm, c, i, H) => {
    const F = fl(Tm); if (sureCrit || (!F.has("critres") && !F.has("crit_rate") && !F.has("crit_fin"))) return crit;
    return Math.max(0, Math.min(1, critBuffs + sumT(Tm, "crit_rate", c, i, H, null) * critMul + sumT(Tm, "crit_fin", c, i, H, null) + critTerm
      - ((tg.crit_rate_res || 0) + g("critres") + sumT(Tm, "critres", c, i, H, null)) + critAdj));
  };
  R.cdPH = (Tm, c, i, H) => {
    const F = fl(Tm); if (!F.has("crit_dmg") && !F.has("critT") && !F.has("critdres")) return critDmg;
    return Math.max(0, cdRaw + sumT(Tm, "crit_dmg", c, i, H, null) + sumT(Tm, "critT", c, i, H, null) - fcd(cdres0 + sumT(Tm, "critdres", c, i, H, null)));
  };
  R.armPH = (Tm, p, c, i, H) => Math.max(0, armRawP(p) * (1 + armPctP(p) + sumT(Tm, "armor_pct", c, i, H, p)));
  const basePH0 = (Tm, p, c, i, H) => Math.max(1, Math.max(0, perBefore - R.armPH(Tm, p, c, i, H) / 10) * Math.max(0, skillM + sumT(Tm, "skillM", c, i, H, p))
    * Math.max(0, 1 + dB(p, H) + sumT(Tm, "dmgB", c, i, H, p)) * Math.max(0, npcIn(p, H) + sumT(Tm, "npcB", c, i, H, p)) * Math.max(0, 1 + g("finalB") + sumT(Tm, "finalB", c, i, H, p)) * npcA * shF[p]);
  // a shot with ignore damage reduction (static, or Synchronized Miracle's per-hit mark): the target's totals floored at 0, no shield cut
  R.basePH = (Tm, p, c, i, H) => {
    if (!ignS && !(Tm.length && sumT(Tm, "ign", c, i, H, null) > 0)) return basePH0(Tm, p, c, i, H);
    let ya = 0, ta = 0, tp = 0, tn = 0, yf = 0, tf = 0;
    for (const q of Tm) {
      if (q.part != null && q.part !== p) continue; const side = !!(q.tgt || q.boss);
      if (q.f === "dmgB") { const v = termVal(q, c, i, H, p); if (!side) ya += v; else if (q.part == null) ta += v; else tp += v; }
      else if (q.f === "npcB") tn += termVal(q, c, i, H, p);
      else if (q.f === "finalB") { const v = termVal(q, c, i, H, p); if (side) tf += v; else yf += v; }
    }
    return Math.max(1, Math.max(0, perBefore - R.armPH(Tm, p, c, i, H) / 10) * Math.max(0, skillM + sumT(Tm, "skillM", c, i, H, p))
      * Math.max(0, 1 + dBi(p, H, ya, ta, tp)) * npcFi(p, H, tn) * Math.max(0, 1 + yFin + yf + Math.max(0, tgtS.finalB + tf)) * npcA);
  };
  const follow = !s._xatk && !s._part && !s._noFollow;   // follow-up rounds and the structure: the attack itself, not one of its rounds
  if (follow && plan && !s._noPV) R.struct = buildStruct(sSub, R, plan, raOverride);
  const keepHp = T.hp, keepW = T._whole, thr = follow && !s._noPV ? thpConds(R) : [];
  const totHp = PARTS.reduce((a, p) => a + tg.hp[p], 0), h0w = tWhole();
  const sameBand = (a, b) => thr.every(t => CMP[t.op](a, t.v) === CMP[t.op](b, t.v));
  const atHp = (h, fn) => { T.hp = h; T._whole = true; try { return fn(); } finally { T.hp = keepHp; T._whole = keepW; } };
  // the game reads the target's HP again at the start of every round of the cast (your attack values are snapshotted per round), so
  // a 'target HP' band can change between rounds.
  // Rounds 2.. of an N-times skill are worked out at the expected HP
  // the earlier rounds leave, as the follow-ups below; only when that crosses a band the setup reads
  if (thr.length && !R.struct && (R.rounds || 1) > 1) {
    const r = R.rounds, e1 = R.expAtk / r, rk = [null]; let spent = e1;
    for (let j = 1; j < r; j++) {
      const hj = Math.max(0, h0w - 100 * spent / totHp);
      const Rj = sameBand(h0w, hj) ? null : atHp(hj, () => compute({ ...s, _noFollow: true }, raOverride));
      rk.push(Rj ? { R: Rj, h: hj } : null); spent += Rj ? (Rj.expAtk - Rj.afxNow - Rj.burnNow) / r : e1;
    }
    if (rk.some(Boolean)) { R.rnd = rk; R.expAtk = rk.reduce((a, x) => a + (x ? (x.R.expAtk - x.R.afxNow - x.R.burnNow) / r : e1), 0); }
  }
  const mainE0 = () => R.struct && R.struct.steps.length ? R.struct.steps.reduce((a, x) => a + x.streams.reduce((b, y) => b + y.R.expAtk * y.n / Math.max(1, y.R.shots), 0), 0) : R.expAtk;
  // the Peripheral Vision round: after the cast's own rounds, at the HP they leave
  {
    const hPV = thr.length && follow ? Math.max(0, h0w - 100 * mainE0() / totHp) : null;
    R.pv = !follow ? null : hPV != null && !sameBand(h0w, hPV) ? atHp(hPV, () => pvRound(sSub, R, raOverride)) : pvRound(sSub, R, raOverride);
    if (R.pv && hPV != null && !sameBand(h0w, hPV)) R.pv.hAt = hPV;
  }
  // the follow-ups (Gusty Strike, Flurry Strike, after-combat strikes) are new single skills: the game reads the target's HP again when they
  // start, so a 'target HP' condition sees the HP the cast's rounds left (here: their expected damage; Forceful Strike X is off on a pursuit
  // once the main round takes the target under 50%). Only for setups that read the target's HP.
  if (thr.length) R.hpAfter = Math.max(0, h0w - 100 * (mainE0() + (R.pv ? R.pv.exp : 0)) / totHp);
  try {
    if (R.hpAfter != null) { T.hp = R.hpAfter; T._whole = true; }
    R.gusty = follow ? gustyRound(sSub, R, raOverride) : null;
    // Flurry Strike and after-combat strikes: rounds of their own after the attack, always through the exact programme
    if (follow && !s._noPV) { R.purs = pursRounds(sSub, R, raOverride); R.after = afterRounds(sSub, R, raOverride); }
  } finally { T.hp = keepHp; T._whole = keepW; }
  if (R.gusty) R.expAtk += R.gusty.exp;
  if (R.pv) { R.expMain = R.expAtk; R.expAtk += R.pv.exp; }
  R.expAtk += burnNow + afxNow;
  if (follow && !s._noPV) runPH(R);
  return R;
}
/* the attack's segments; when a round has a per-hit term, or the attack has a structure (two weapons, a second hand, extra slots, lock-ons, a
   gated follow-up), the exact programme replaces the closed form for the whole attack */
function runPH(R) {
  if (R.struct && R.struct.cant) {                     // the skill can't be cast with this setup (Full Salvo with one launcher)
    const segs = R.segs = []; segs.GB = { hit: 0, miss: 0, broke: 0, G: 1 }; segs.G = 1; segs.b0 = 0;
    R.dp = { exp: 0, landed: 0, crits: 0, segs: [], states: 0, pOver: 0 }; R.expCF = R.expAtk;
    R.expAtk = 0; R.expHits = 0; R.xpE = 0; R.kindE = {}; R.shotsS = 0; R.landS = 0; R.pursE = 0; R.afterE = 0;
    if (R.gusty) R.gusty.exp = 0; if (R.pv) R.pv.exp = 0; R.purs = null; R.after = null; return;
  }
  const segs = R.segs = attackSegs(R);
  if (!segs.some(x => x.terms.length || x.streams || x.gate || x.gset || typeof x.p === "function" || STRUCT_KINDS.has(x.kind) || FOLLOW_K.has(x.kind) || x.alt != null)
    && !(R.struct && R.struct.steps.length)) return;
  R.expCF = R.expAtk;                                   // the closed form without the per-hit terms (kept for checks)
  applyDP(R, attackDP(segs, capsOf(segs)));
}
/* the exact programme's result into the attack's numbers: the rounds of the cast, Peripheral Vision, Gusty Strike, Flurry Strike, after-combat */
function applyDP(R, dp) {
  R.dp = dp;
  const main = dp.segs.filter(x => MAIN_KINDS.has(x.kind)), pv = dp.segs.find(x => x.kind === "pv"), gss = dp.segs.filter(x => x.kind === "gusty");
  const mainE = main.reduce((a, x) => a + x.p * x.exp, 0);
  R.expHits = main.reduce((a, x) => a + x.p * x.landed, 0); R.xpE = main.reduce((a, x) => a + x.p * x.xp, 0);
  R.kindE = {}; for (const x of main) R.kindE[x.kind] = (R.kindE[x.kind] || 0) + x.p * (x.exp - x.xp);
  if (R.struct && R.struct.steps.length) { R.shotsS = main.reduce((a, x) => a + x.p * x.n, 0); R.landS = R.expHits; }
  if (R.gusty) {
    R.gusty.exp = gss.reduce((a, x) => a + x.p * x.exp, 0); R.gusty.landed = gss.length ? gss[0].landed : 0;
    for (const x of gss) { const G = (R.gusty.list || [R.gusty])[x.ref || 0]; if (G) { G.pDP = x.p; G.expIf = x.exp; } }
  }
  if (R.pv) { R.pv.exp = pv.p * pv.exp; R.pv.landed = pv.landed; R.expMain = mainE + (R.gusty ? R.gusty.exp : 0); }
  // Flurry Strike / after-combat strikes: each one's unconditional chance and its damage when it fires
  R.pursE = 0; R.afterE = 0;
  for (const x of dp.segs) {
    const L = x.kind === "purs" ? R.purs && R.purs.list : x.kind === "after" ? R.after && R.after.list : null, y = L && L[x.ref];
    if (!y) continue;
    y.pDP = x.p; y.expIf = x.exp; y.exp = x.p * x.exp; y.landed = x.landed;
    if (x.kind === "purs") R.pursE += y.exp; else R.afterE += y.exp;
  }
  R.expAtk = mainE + (R.gusty ? R.gusty.exp : 0) + (R.pv ? R.pv.exp : 0) + R.burnNow + (R.afxNow || 0) + R.pursE + R.afterE;
}

/* the target's own effects on the damage it takes (tg.dfx, from its buffs at the start of the fight): your switch / stack count,
   else the fight-start state; value = v x (1 + LevelPropertiesMulti x (stacks - 1)) */
function bossFx(tg) {
  const set = (T.tfx || {})[T.target] || {};
  return (tg.dfx || []).map(e => {
    const u = set[e.b] || {}, on = u.lvl === 0 ? false : u.on !== undefined ? u.on : e.on, lvl = Math.max(1, Math.min(e.max || 1, u.lvl || e.lvl || 1));
    return { ...e, use: !!(on && e.f), lvl, val: e.v * (e.lpm ? 1 + e.lpm * (lvl - 1) : 1) };
  });
}
/* accessories: chance an RA triggers this attack = 1 − Π over TAs whose condition is met of (1 − 0.4 / (TA factor × RA factor)) */
function raChances(s, R) {
  const out = accChances(R.w, R);
  // both-weapon skills: the other weapons' RAs roll their own chances (their own TAs), keyed by slot
  for (const slot of R.accFire || []) {
    if (slot === R.atkSlot || !R.weap[slot]) continue;
    for (const [k, p] of Object.entries(accChances(R.weap[slot], R))) out[slot + ":" + k] = p;
  }
  return out;
}
/* does a trigger (TA) count in this attack: its conditions (WeaponEntryInfo.EffectIdList) against the attack (R), and when it fires
   (EffectTriggerType 1024: when you are attacked; 512: after the shots, so its reaction helps a later attack). Without R (or a condition the
   bench can't decide) it counts. Returns {on, why} */
function taState(C, R) {
  if (C.tt === 1024) return { on: false, why: "fires when you are attacked" };
  if (C.tt === 512) return { on: false, why: "fires after the shots (its reaction helps a later attack)" };
  if (!R) return { on: true, why: "" };
  for (const c of C.c || []) {
    let v;
    if (c.t === "hitr") v = R.hitReal == null ? null : CMP[c.op || ">="](R.hitReal, c.v);
    else if (c.t === "bcat") v = R.sit ? bcatState(c, R.sit, R.held || [], "you") : null;
    else { const keep = R.ctx.held; R.ctx.held = "you"; v = condState(c, R.ctx, R.W); R.ctx.held = keep; }
    if (v === false) return { on: false, why: c.text || "its condition doesn't hold" };
  }
  return { on: true, why: "" };
}
// the last worked-out attack per setup (the weapon panel's trigger states read it), and the line that names why a trigger doesn't count
const LASTR = {};
const taLine = (w, R) => {
  const L = (w.comps || []).map(c => D.components[c.id]).filter(C => C && C.k === "TA").map(C => [C.n, taState(C, R)]).filter(([, t]) => !t.on);
  return L.length ? "Not counted this attack: " + L.map(([n, t]) => `${n} (${t.why})`).join(" · ") : "";
};
/* an RA's key in the chance tables: its component id, prefixed by the slot for another weapon of the same attack */
const raId = k => String(k).replace(/^[A-Z]{2}:/, "");
function accChances(w, R) {
  const tas = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "TA" && taState(D.components[c.id], R).on);
  const out = {};
  for (const c of w.comps) {
    const C = D.components[c.id];
    if (!C || C.k !== "RA") continue;
    let miss = 1;
    for (const t of tas) miss *= 1 - Math.min(1, 0.4 / (D.components[t.id].f * C.f));
    out[c.id] = 1 - miss;
  }
  return out;
}
/* outcomes per attack: every combination of weighted RAs, with its probability and its shot numbers */
function outcomes(s) {
  const base = compute(s);
  if (!base) return null;
  const ch = raChances(s, base);
  // chance events: weighted RAs, 'N% chance' effects you haven't fixed (one roll per attack), random picks (one of n); every combination
  const ev0 = base.raStates.filter(x => x.mode === "chance").map(x => ({ k: x.id, o: [["on", ch[x.id]], ["off", 1 - ch[x.id]]] }));
  // the same accessory on the other weapons of a both-weapon skill gives the same buff, which is held once: the rounds only depend on whether
  // at least one of those triggered (exact), so they are one event; the attacking weapon's own copy stays apart (it also fires on a follow-up
  // round of that weapon), and one that carries an extra hit too (each copy adds its own)
  const ev = [], grp = new Map();
  for (const e of ev0) {
    const id = raId(e.k), C = D.components[id];
    if (!C || (C.xp || []).length || id === e.k) { ev.push(e); continue; }
    if (!grp.has(id)) { const g = { k: e.k, keys: [e.k], miss: 1 - e.o[0][1] }; grp.set(id, g); ev.push(g); } else { const g = grp.get(id); g.keys.push(e.k); g.miss *= 1 - e.o[0][1]; }
  }
  for (const g of grp.values()) g.o = [["on", 1 - g.miss], ["off", g.miss]];
  for (const [k, p] of Object.entries(base.probEv || {})) if (!(base.pickEv || {})[k] && s.tog[k] === undefined) ev.push({ k, o: [["on", p], ["off", 1 - p]] });
  for (const [k, n] of Object.entries(base.pickEv || {})) ev.push({ k, o: [...Array(n).keys()].map(i => [i, 1 / n]) });
  // too many to roll one by one (each weapon of a both-weapon skill fires its accessories): the ones that change the attack least are averaged in,
  // each weighted by its chance (exact for an effect that adds to one bonus; the shot-count ones are always rolled), and the page says which
  const MAXC = 64, size = L => L.reduce((a, e) => a * e.o.filter(([, p]) => p > 0).length, 1);
  const blend = {}, blended = [];
  if (size(ev) > MAXC) {
    const lin = e => { const C = D.components[raId(e.k)]; return !!C && !(C.fx || []).some(k => (D.fx[k] || []).some(x => ["shots", "shots_pct", "pwadj", "aim", "imm"].includes(x.f))); };
    // units: an accessory with all its copies (averaged in together, each at its own chance; the rows hold its buff when any of them
    // triggers); a 'N% chance' effect on its own
    const units = new Map();
    for (const e of ev) if (e.o.length === 2 && e.o[0][0] === "on") {
      const isRa = base.raStates.some(r => r.id === e.k), key = isRa ? "ra:" + raId(e.k) : "p:" + e.k;
      if (isRa && !lin(e)) continue; if (!units.has(key)) units.set(key, []); units.get(key).push(e);
    }
    const cand = [...units.values()].map(L => {
      const keys = L.flatMap(e => e.keys || [e.k]), miss = L.reduce((a, e) => a * (1 - e.o[0][1]), 1);
      const on = compute(s, Object.fromEntries(keys.map(k => [k, "on"]))), off = compute(s, Object.fromEntries(keys.map(k => [k, "off"]))), p = 1 - miss;
      return { L, keys, p, w: p * (1 - p) * Math.abs(((on && on.expAtk) || 0) - ((off && off.expAtk) || 0)) };
    }).sort((a, b) => a.w - b.w);
    for (const c of cand) {
      if (size(ev) <= MAXC) break; for (const e of c.L) for (const k of e.keys || [e.k]) blend[k] = ch[k] != null ? ch[k] : e.o[0][1];
      blended.push(c.keys[0]); for (const e of c.L) ev.splice(ev.indexOf(e), 1);
    }
  }
  let combos = [{ ov: { ...blend }, p: 1 }];
  for (const e of ev) {
    const next = [];
    for (const c of combos) for (const [v, p] of e.o) if (p > 0) { const ov = { ...c.ov }; for (const k of e.keys || [e.k]) ov[k] = v; next.push({ ov, p: c.p * p }); }
    combos = next;
  }
  const list = ev.length || blended.length ? combos.map(c => ({ p: c.p, R: compute(s, c.ov) })) : [{ p: 1, R: base }];
  indepFollow(list);
  const exp = list.reduce((a, o) => a + o.p * o.R.expAtk, 0);
  return { base, list, exp, ch, blended };
}
/* a follow-up round (Gusty / Flurry Strike, an after-combat strike) is a single skill of its own: its accessories roll again when it starts.
   Exact: the state the cast's rounds leave (the counters, the gate bits) is mixed over every trigger outcome, and each outcome's follow-ups run
   from that mix; the average is a sum over the outcomes, so each outcome's own numbers take its follow-ups from the mix. A trigger you set to
   on / off holds for every round. */
function indepFollow(list) {
  if (list.length < 2 || !list.every(o => o.R && o.R.dp && o.R.segs)) return;
  const FW = new Set(["gusty", "purs", "after"]), fi = list[0].R.segs.findIndex(x => FW.has(x.kind));
  if (fi < 0 || !list.every(o => o.R.segs.findIndex(x => FW.has(x.kind)) === fi && o.R.segs.length >= fi && o.R.segs.G === list[0].R.segs.G)) return;
  const capsU = { lr: 0, ls: 0, lw: 0, cs: 0 };
  for (const o of list) { const c = capsOf(o.R.segs); for (const k of CTRS) capsU[k] = Math.max(capsU[k], c[k]); }
  const heads = list.map(o => attackDP(o.R.segs, capsU, { until: fi })), mix = new Map();
  heads.forEach((h, j) => { for (const [k, q] of h.carry) mix.set(k, (mix.get(k) || 0) + list[j].p * q); });
  const cum0 = heads.reduce((a, h, j) => a + list[j].p * h.exp, 0);          // the HP the cast's rounds are expected to leave
  list.forEach((o, j) => {
    const t = attackDP(o.R.segs, capsU, { from: fi, carry0: mix, cum0 }), h = heads[j];
    applyDP(o.R, { exp: h.exp + t.exp, landed: h.landed + t.landed, crits: h.crits + t.crits, segs: [...h.segs, ...t.segs], states: h.states + t.states, pOver: Math.max(h.pOver, t.pOver), indep: true });
  });
}
/* the target-HP thresholds this setup's effects use (to re-check them during a fight) */
function thpConds(R) {
  const out = [], seen = new Set(), push = (op, v) => { const k = op + v; if (!seen.has(k)) { seen.add(k); out.push({ op, v }); } };
  const FLIP = { ">=": "<=", ">": "<", "<=": ">=", "<": ">", "=": "=" };
  const walkC = (c, tgt) => {
    const h = c.h || (tgt ? "target" : "you");
    if (c.t === "thp" || (c.t === "ohp" && h === "target")) push(c.op || ">=", c.v);
    if (c.t === "hpcmp" && h === "you") push(FLIP[c.op || ">="], R.ctx.ohp);          // own HP >= target's  <=>  target <= own
    if (c.t === "any" || c.t === "castc") (c.items || []).forEach(x => walkC(x, tgt));
  };
  for (const r of R.rows) for (const x of r.effs) {
    (x.e.c || []).forEach(c => walkC(c, x.e.tgt));
    if (x.e.sc && SC(x.e.sc) === "HpLoss" && x.e.tgt) {
      const p = x.e.sp || [], lo = 100 * (p[0] || 0), hi = 100 * (p[2] == null ? 1 : p[2]);
      for (let v = lo; v < hi; v += Math.max(5, (hi - lo) / 8)) push(">=", Math.round(v));
    }
  }        // linear: re-read in steps
  // the target's own effects by its HP lost (Garcia's Ace Enforcer: dodge + 0.5 x the share lost), re-read the same way
  for (const e of bossFx(R.tg)) if (e.use && e.sc && SC(e.sc) === "HpLoss") {
    const p = e.sp || [], lo = 100 * (p[0] || 0), hi = 100 * (p[2] == null ? 1 : p[2]);
    for (let v = lo; v < hi; v += Math.max(5, (hi - lo) / 8)) push(">=", Math.round(v));
  }
  return out;
}
/* this setup reads how many of the target's parts still stand (WapPartRemainNums on your effects): the fight re-checks it per limb lost */
const readsParts = R => R.rows.some(r => r.effs.some(x => !x.dyn && (x.e.c || []).some(function f(c) { return c.t === "remain" || c.t === "parts" || ((c.t === "any" || c.t === "castc") && (c.items || []).some(f)); })));
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
/* how many fights fit the rolling budget for this setup (long fights vary little, so fewer of them are needed), 100 to 2,000;
   update() gives A and B the smaller of their two counts, so both are compared on the same number of fights */
function fightCount(O) {
  const tg = D.targets[T.target], rb = O.base, shotsPer = (rb.shotsS != null ? rb.shotsS : rb.shots) + (rb.pv ? rb.pv.shots : 0) + (rb.gusty ? rb.gusty.p * rb.gusty.shots : 0)
    + [...((rb.purs && rb.purs.list) || []), ...((rb.after && rb.after.list) || [])].reduce((a, x) => a + (x.pDP || 0) * x.shots, 0);
  const estK = Math.min(1000, Math.max(1, tg.hp.Body * T.hp / 100 / Math.max(1, O.exp * (rb.wts.Body || 0.25)) * 0.8));
  return Math.max(100, Math.min(2000, Math.round(400000 / (estK * Math.max(1, shotsPer)))));
}
function simulate(O, conf, nFights, opt) {
  opt = opt || {};
  const rand = rng(opt.seed || 12345), RUNS = opt.runs || 4000, CAP = 1000, BUDGET = 400000, tg = D.targets[T.target];
  let hitP = null;                                             // the parts this attack's landed shots reached (execution)
  const pickO = (OO = O) => { let u = rand(), o = OO.list[OO.list.length - 1]; for (const c of OO.list) { if (u < c.p) { o = c; break; } u -= c.p; } return o.R; };
  // 'Target HP >= / <= N%' effects (Forceful / Accurate Strike, Core Talent 2 ...) follow the fight: before each attack the game reads
  // the whole unit's HP (BattleActorCompHp4TacticalUnit.CurrHpPercentGet: four parts over their max), so the setup is recomputed
  // for each band of thresholds it crosses (cached)
  const thr = thpConds(O.base), cacheO = {}, parts = readsParts(O.base);
  // the legs destroyed in the fight: the next attacks start without the target's dodge, so what the attack reads once at its start
  // (hit-rate conditions, by-hit-rate effects) is read again there; only for a target with dodge whose legs stand at the start
  const legsK = !O.base.legsGone && O.base.Dg > 0;
  const bandKey = (f, n, lg) => thr.map(c => CMP[c.op || ">="](f, c.v) ? 1 : 0).join("") + (parts ? ":" + n : "") + (legsK && lg ? ":L" : "");
  // a one-time immunity (Libby's DMG Immunity: gone once an attack has hit it) is off for the fight's later attacks
  const ONCE = bossFx(tg).filter(e => e.use && e.once).map(e => e.b);
  const outcomesAt = st => {
    const gone = st && st.gone && st.gone.size ? [...st.gone] : null;
    if ((!thr.length && !parts && !legsK && !gone) || !st) return O;
    const lg = !st.alive.has("Legs"), f = 100 * PARTS.reduce((a, p) => a + Math.max(0, st.hp[p]), 0) / PARTS.reduce((a, p) => a + tg.hp[p], 0),
      k = bandKey(f, st.alive.size, lg) + (gone ? "|g" + gone.join(",") : "");
    if (k === bandKey(tWhole(), 3, false)) return O;
    if (!cacheO[k]) {
      const keep = T.hp, keepA = T._alive, keepW = T._whole, set = (T.tfx[T.target] ||= {}), keepS = {};
      if (thr.length || parts || legsK) { T.hp = f; T._whole = true; }
      if (parts) T._alive = new Set(st.alive); else if (legsK && lg) T._alive = new Set([...(aliveStart() || LIMBS)].filter(p => p !== "Legs"));
      for (const b of gone || []) { keepS[b] = set[b]; set[b] = { ...(set[b] || {}), on: false }; }
      try { cacheO[k] = outcomes(O.base.s) || O; } finally {
        T.hp = keep; T._alive = keepA; T._whole = keepW;
        for (const b of gone || []) { if (keepS[b] === undefined) delete set[b]; else set[b] = keepS[b]; }
      }
    }
    return cacheO[k];
  };
  const pick = (w) => { let u = rand(), t = 0; for (const p of PARTS) { t += w[p]; if (u < w[p]) return p; u -= w[p]; } return t < 1 - 1e-9 ? null : "Body"; };
  // the even path's part in a fight: a Large Shield's arm while it stands; undefined = focus (the weighted path returns the focus
  // part); an area attack goes round the four parts from a random one, a turn on a destroyed part is lost (null); the others skip them
  const evenPart = (sk, st, i) => {
    const tr = (sk.R && sk.R.pw && sk.R.pw.tr) || {}, up = x => x === "Body" || st.alive.has(x);
    if (tr.lsh && up(tr.lsh)) return tr.lsh;
    if (T.mode === "focus" && up(T.part)) return undefined;
    if (tr.rot) { if (i === 0 || st.r0 == null) st.r0 = (rand() * 4) | 0; const q = PARTS[(st.r0 + i) % 4]; return up(q) ? q : null; }
    const L = PARTS.filter(up); return L[(st.rr = (st.rr || 0) + 1) % L.length];
  };
  const evenOf = sk => sk.av || !!(sk.R && sk.R.pw && sk.R.pw.tr && sk.R.pw.tr.rot);
  // one round of shots: hit (with the miss-streak bonus), part, crit; returns damage dealt (for the one-attack runs) and applies it to hp
  const round = (n, hitAfter, crit, critDmg, shotBy, sk, st, xp, at, hitL) => {     // hitL: the chance once the legs are destroyed
    let dmg = 0;
    // a term that depends on the target's part HP (Downwind >= 50%, Heinz's +25% once a limb is destroyed) follows the fight
    const H = at && st ? { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 } : null;
    const sb = H ? p => at(p, H) : p => shotBy[p];
    const aonR = !!(sk.R && sk.R.aon), ghcR = (sk.R && sk.R.ghc) || 0, deflR = (sk.R && sk.R.defl) || 0; let landedR = 0, aonMiss = false;
    const wNow = () => !st ? sk.w0 : sk.R.pw.dyn ? partWeights(sk, st.alive, { ...sk.R.pw, hp: st.hp }) : (st.wc[sk.key] || (st.wc[sk.key] = partWeights(sk, st.alive, sk.R.pw)));
    for (let i = 0, m = 0; i < n; i++) {
      if (st && st.hp.Body <= 0) break;
      const ev = st && evenOf(sk) ? evenPart(sk, st, i) : undefined;      // the part is picked before the hit roll; a lost turn draws none
      if (ev === null) continue;
      if (aonR && i > 0) { if (aonMiss) break; }                           // Chainsaw: the first shot decides the round
      else if (!(ghcR > 0 && landedR < ghcR && n - i <= ghcR - landedR) && rand() >= (hitL && st && !st.alive.has("Legs") ? hitL : hitAfter)(m)) {
        m++; if (aonR) aonMiss = true;
        if (deflR > 0) {
          const p = ev !== undefined ? ev : pick(wNow());      // a deflected miss: its share of the plain shot, no crit
          if (p) { const d = Math.max(1, deflR * sb(p)); dmg += d; if (st) takeHp(st, p, d); }
        }
        continue;
      }
      m = 0; landedR++;
      if (ev !== undefined) {
        const p = ev;
        const d = sb(p) * (rand() < crit ? 1 + critDmg : 1); dmg += d; takeHp(st, p, d); if (hitP) hitP.add(p);
        dmg += extra(xp, d, p, st);
        continue;
      }
      const w = !st ? sk.w0 : sk.R.pw.dyn ? partWeights(sk, st.alive, { ...sk.R.pw, hp: st.hp }) : (st.wc[sk.key] || (st.wc[sk.key] = partWeights(sk, st.alive, sk.R.pw))), p = pick(w);
      if (p === null) continue;                                    // an area attack's turn on a destroyed part (weights of the attack's start)
      const d = sb(p) * (rand() < crit ? 1 + critDmg : 1); dmg += d; if (hitP) hitP.add(p);
      if (st) takeHp(st, p, d);
      dmg += extra(xp, d, p, st);
    }
    return dmg;
  };
  // one place where the fight takes a part's HP: its temporary-HP pool first (WapPartExtraHpAlone; left out of every HP %), then its
  // HP; a part with Guts (ReserveOneHp) keeps 1 HP (overkill lost; one with a per-turn cap: once per attack); at 0 a limb is destroyed
  const BF = bossFx(tg).filter(e => e.use), GUTS = BF.filter(e => e.f === "guts"), XHP = BF.filter(e => e.f === "xhp");
  const gutsOK = (g, st) => (g.c || []).every(c => c.t === "bphp" || c.t === "parts" ? partCond(c, null, { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 }) !== false
    : c.t === "bgear" ? !!(tgGear(T.target) & (c.v || 0)) : true);
  const takeHp = (st, p, d) => {
    if (st.xhp && st.xhp[p] > 0) { const a = Math.min(st.xhp[p], d); st.xhp[p] -= a; d -= a; if (d <= 0) return; }
    st.hp[p] -= d;
    if (st.hp[p] <= 0 && GUTS.length) {
      if (st.guK !== st.k) { st.guK = st.k; st.gu = {}; }
      const g = GUTS.find(x => x.parts.includes(p) && (!x.per || (st.gu[x.b] || 0) < x.per) && gutsOK(x, st));
      if (g) { st.hp[p] = 1; if (g.per) st.gu[g.b] = (st.gu[g.b] || 0) + 1; return; }
    }
    if (p !== "Body" && st.hp[p] <= 0 && st.alive.has(p)) { st.alive.delete(p); st.wc = {}; st.broke[p] = st.k; }
  };
  const poolsAt = st => {
    st.xhp = {}; for (const x of XHP) {
      const L = x.parts === "rand" ? LIMBS.filter(q => st.alive.has(q)) : x.parts;
      if (!L.length) continue; const q = x.parts === "rand" ? L[(rand() * L.length) | 0] : null;
      for (const p of q ? [q] : L) st.xhp[p] = (st.xhp[p] || 0) + x.val * tg.hp[p];
    }
  };
  // RA extra hits (Explosive Charge: share of srcAtk; Splash: share of that shot's damage) on a random OTHER standing part
  const extra = (xp, d, p, st) => {
    if (!xp || !xp.length) return 0; let tot = 0;
    for (const x of xp) {
      const v = x.t === "ec" || x.t === "ecs" ? x.val : x.v * d;
      if (x.t === "coll") {                                    // Collateral DMG: on up to its part count of the other standing parts, each picked once
        const L = st ? PARTS.filter(q => q !== p && (q === "Body" || st.alive.has(q))) : PARTS.filter(q => q !== p);
        for (let k = Math.min(x.parts, L.length); k > 0; k--) {
          const q = L.splice((rand() * L.length) | 0, 1)[0]; tot += v;
          if (st) takeHp(st, q, v);
        }
        continue;
      }
      if (x.t === "ecs") { tot += v; if (st) takeHp(st, p, v); continue; }
      if (!st) { tot += v; continue; }
      const L = PARTS.filter(q => (q !== p || x.t === "rd") && (q === "Body" || st.alive.has(q))); if (!L.length) continue;   // a redirected hit can land anywhere
      const q = L[(rand() * L.length) | 0]; takeHp(st, q, v); tot += v;
    }
    return tot;
  };
  // hit by hit: one set of counters per attack, carried through its rounds by the game's reset rules; per shot the hit chance,
  // the part weights, the crit chance and the damage read the counters (and the fight's part HP), then a landed shot counts
  // the shot primitives depend only on the counters (kept capped where the terms stop changing, as in the exact programme), the
  // shot's number and the limbs still standing, unless a term reads the live part HP: cached per segment on that key
  const prim = (sg, caps, c, i, st, H) => {
    if (sg.hDep) return null;
    let k = ((c.lr * (caps.ls + 1) + c.ls) * (caps.lw + 1) + c.lw) * (caps.cs + 1) + c.cs;
    if (sg.usesI) k = k * caps.nI + i;
    if (sg.dl) k = k * 5 + (st ? st.alive.size : 4);
    const cache = sg._pc || (sg._pc = []);
    let P = cache[k];
    if (P === undefined) { const cc = { lr: c.lr, ls: c.ls, lw: c.lw, cs: c.cs }; P = cache[k] = { c: cc, h: [], kc: sg.crit(cc, i, H), d0: {}, d1: {}, im: {} }; }
    return P;
  };
  // a single attack's own run (no fight) reads the HP its earlier shots left (the fight reads st.hp)
  const hpW0 = tWhole() / 100, hpTot = Math.max(1, PARTS.reduce((a, p) => a + (tg.hp[p] || 0), 0));
  const roundPH = (sg0, st, c, caps, G, dB) => {
    let dmg = 0; const S = sg0.streams || [sg0], ms = S.map(() => 0), n0 = st ? st.alive.size : 0;
    const hpdS = !st && (sg0.hpd || S.some(y => y.hpd));
    const one1 = S.length === 1, aonR = one1 && !!sg0.aon, ghcR = one1 ? sg0.ghc || 0 : 0; let landedR = 0, aonMiss = false;
    const Hs = st ? { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 } : null;
    for (let j = 0; j < sg0.n; j++) {
      const si = S.length > 1 ? sg0.order[j] : 0, sg = S[si], sk = sg.sk, H = Hs || (hpdS ? { ...sg.H0, w: Math.max(0, hpW0 - ((dB || 0) + dmg) / hpTot), base0: sg.H0 } : sg.H0);
      const i = sg0.i0 + j;
      if (st && st.hp.Body <= 0) break;
      // Blade Havoc: after its minimum hits it stops once a part standing at its start is destroyed (DamagedOneHpWapPart)
      if (sg0.stopBreak != null && j >= sg0.stopBreak && st && st.alive.size < n0) break;
      const ev = st && evenOf(sk) ? evenPart(sk, st, j) : undefined;      // picked before the hit roll; a lost turn draws none
      if (ev === null) continue;
      const P = prim(sg, caps, c, i, st, H), m = ms[si];
      if (aonR && j > 0) { if (aonMiss) break; }                           // Chainsaw: the first shot decides the round
      else if (!(ghcR > 0 && landedR < ghcR && sg0.n - j <= ghcR - landedR)) {
        const hc = P ? (st && !st.alive.has("Legs") ? P.hL || (P.hL = []) : P.h) : null;      // the legs destroyed: the chance without dodge
        const h = hc ? (hc[m] !== undefined ? hc[m] : (hc[m] = sg.hit(m, P.c, i, H))) : sg.hit(m, c, i, H);
        if (rand() >= h) {
          ms[si] = m + 1; if (aonR) aonMiss = true; if (G && sg0.gmiss) G.b |= sg0.gmiss;
          if (sg.defl > 0) {
            const wc = sg.wDyn ? sg.w(c, i, st ? st.alive : null, st ? st.hp : null) : null;      // a deflected miss
            const p = ev !== undefined ? ev : pick(wc || (!st ? sk.w0 : sk.R.pw.dyn ? partWeights(sk, st.alive, { ...sk.R.pw, hp: st.hp }) : (st.wc[sk.key] || (st.wc[sk.key] = partWeights(sk, st.alive, sk.R.pw)))));
            if (p && !sg.imm(p, c, i, H)) {
              const d = Math.max(1, sg.defl * sg.dmg(p, c, false, i, H)); dmg += d;
              if (st) takeHp(st, p, d);
            }
            if (c.lw < caps.lw) c.lw++;
          }
          continue;
        }
      }
      ms[si] = 0; landedR++;
      let p = ev;
      if (p === undefined) {
        const wc = sg.wDyn ? sg.w(c, i, st ? st.alive : null, st ? st.hp : null) : null;
        p = pick(wc || (!st ? sk.w0 : sk.R.pw.dyn ? partWeights(sk, st.alive, { ...sk.R.pw, hp: st.hp }) : (st.wc[sk.key] || (st.wc[sk.key] = partWeights(sk, st.alive, sk.R.pw)))));
        if (p === null) continue;
      }
      const cr = rand() < (P ? P.kc : sg.crit(c, i, H));
      let d;
      if (!P) d = sg.dmg(p, c, cr, i, H);
      else {
        const row = (cr ? P.d1 : P.d0)[p] || ((cr ? P.d1 : P.d0)[p] = []), dk = sg.dynK ? sg.dynK(p, H) : 0;
        d = row[dk]; if (d === undefined) d = row[dk] = sg.dmg(p, P.c, cr, i, H);
      }
      dmg += d; if (hitP) hitP.add(p);
      if (st) takeHp(st, p, d);
      if (sg.xps.length && !(P ? (P.im[p] !== undefined ? P.im[p] : (P.im[p] = sg.imm(p, P.c, i, H))) : sg.imm(p, c, i, H))) dmg += extra(sg.xps, d, p, st);
      // a landed shot counts (capped: past the cap no term changes, so the numbers are the same)
      if (c.lr < caps.lr) c.lr++; if (c.ls < caps.ls) c.ls++; if (c.lw < caps.lw) c.lw++; if (cr && c.cs < caps.cs) c.cs++;
      if (G && sg0.ghit) G.b |= sg0.ghit;
    }
    return dmg;
  };
  const FOLW = new Set(["gusty", "purs", "after"]);
  const attackPH = (R, st, OO) => {
    let SG = R.segs; const c = { lr: 0, ls: 0, lw: 0, cs: 0 }, G = { b: SG.b0 || 0 }; let d = preAttack(R, st);
    let caps = R._caps || (R._caps = { ...capsOf(SG), nI: Math.max(1, ...SG.map(x => x.i0 + x.n)) });
    // its accessories roll again when a follow-up starts:
    // the follow-up rounds are taken from an outcome drawn on its own
    const fi = OO && OO.list.length > 1 ? SG.findIndex(x => FOLW.has(x.kind)) : -1;
    // the gate bits a chance reads; 'broke' in a fight: a part destroyed by this attack (st.broke[part] = this attack's number)
    const bits = () => { const bk = (SG.GB || {}).broke; if (!bk || !st) return G.b; return (G.b & ~bk) | (Object.values(st.broke).includes(st.k) ? bk : 0); };
    for (let si = 0; si < SG.length; si++) {
      if (si === fi) {
        const R2 = pickO(OO), j2 = R2.segs ? R2.segs.findIndex(x => FOLW.has(x.kind)) : -1;
        if (R2 !== R && j2 >= 0) {
          SG = R2.segs; si = j2; caps = R2._caps || (R2._caps = { ...capsOf(SG), nI: Math.max(1, ...SG.map(x => x.i0 + x.n)) });
          for (const k of CTRS) if (c[k] > caps[k]) c[k] = caps[k];
        }
      }
      let sg = SG[si];
      if (sg.alt != null) {                                      // alternatives: one draw, then the branch by its cumulative chance
        let sj = si; while (sj + 1 < SG.length && SG[sj + 1].alt === sg.alt) sj++;
        const b = bits(); let u = rand(), pick = null;
        for (let t = si; t <= sj; t++) { const x = SG[t], p = typeof x.p === "function" ? x.p(b) : x.p; if (u < p) { pick = x; break; } u -= p; }
        si = sj; if (!pick) continue; sg = pick;
      } else {
        const p = typeof sg.p === "function" ? sg.p(bits()) : sg.p;
        if (p < 1 && !(rand() < p)) continue;
      }
      if (sg.start === "whole") c.lr = c.ls = c.lw = c.cs = 0; else if (sg.start === "skill") c.lr = c.ls = c.cs = 0; else if (sg.start === "round") c.lr = 0;
      d += roundPH(sg, st, c, caps, G, d);
    }
    d += afterAttack(R, st);
    if (R.burnSet) { if (st) burnAll(R, st); d += R.burnNow; }
    return d;
  };
  const attack = (R, st, OO) => {
    if (st) st.h0 = { ...st.hp };                                  // HP before the attack (the lowest / highest-HP part checks)
    hitP = new Set();
    if (R.dp) return attackPH(R, st, OO);
    const sk = { pw: R.sk.pw, av: R.sk.av, w0: R.wts, R, key: "m" }, nr = R.rounds || 1; let d = preAttack(R, st);
    for (let j = 0; j < nr; j++) {
      const Q = R.rnd && R.rnd[j] ? R.rnd[j].R : R;       // a later round in another target-HP band
      d += round(R.shots / nr, Q.hitAfter, Q.crit, Q.critDmg, Q.shotBy, sk, st, Q.xps, Q.dyn ? Q.shotAt : null, Q.hitAfterL);
    }   // the miss streak restarts each round
    if (R.pv) d += round(R.pv.shots, R.pv.hitAfter, R.pv.crit, R.pv.critDmg, R.pv.shotBy, sk, st, null, R.pv.dyn ? R.pv.shotAt : null, R.pv.R.hitAfterL);
    if (R.gusty && rand() < R.gusty.p) {
      const G = R.gusty.R, gx = (G.xps || []).filter(x => x.t === "coll" || x.row);
      d += round(G.shots, G.hitAfter, G.crit, G.critDmg, G.shotBy, { pw: G.sk.pw, av: G.sk.av, w0: G.wts, R: G, key: "g" }, st, gx.length ? gx : null, G.dyn ? G.shotAt : null, G.hitAfterL);
    }
    d += afterAttack(R, st);
    if (R.burnSet) { if (st) burnAll(R, st); d += R.burnNow; }
    return d;
  };
  // after the attack. Execution first (PreWholeSkillEnd4Attacker 0x10000000: every part a landed hit of the attack reached, its own
  // HP share (a shield's HP left out) below the threshold x (1 - its Anti-Execution decay), the Body too: a kill); Terminator 4 (after the
  // single skill: the Body takes the share x the max HP of the limbs the attack destroyed, executions included, Max(Floor(x + 0.5), 1); none
  // on a target that avoids ratio damage); then the fixed damage after the attack (R.afxL, WholeSkillEnd4Targe then the after-combat stage)
  const shArm = tg.shd && (tg.shield_hp || 0) > 0 ? tg.shd.arm : null;
  const ownMax = p => p === shArm ? tg.hp[p] - tg.shield_hp : tg.hp[p];
  const ownHp = (st, p) => p === shArm ? Math.max(0, st.hp[p] - Math.max(0, tg.shield_hp - (tg.hp[p] - st.hp[p]))) : st.hp[p];
  const hitPart = (st, p, v) => takeHp(st, p, v);
  // a hit the skill makes before its shots (Twin-Blade Saw: a share of each standing part's max HP, kept at 1 HP)
  const preAttack = (R, st) => {
    let d = 0;
    for (const x of R.afxL || []) {
      if (!x.pre) continue;
      for (const p of PARTS) {
        if (p !== "Body" && (st ? !st.alive.has(p) : T.dead && T.dead.has(p))) continue;
        if (R.afxImm && R.afxImm(p, st ? { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 } : null)) continue;
        const v = x.keep1 ? Math.min(x.by[p], Math.max(0, (st ? st.hp[p] : tg.hp[p]) - 1)) : x.by[p]; d += v; if (st) hitPart(st, p, v);
      }
    }
    return d;
  };
  const afterAttack = (R, st) => {
    let d = 0; const hit = !!(hitP && hitP.size);
    if (st && st.hp.Body > 0) {
      const t4hit = L => {
        if (!(R.t4 > 0) || tg.fixav || st.hp.Body <= 0 || !L.length) return;
        if (R.afxImm && R.afxImm("Body", { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 })) return;     // an immune body takes none (OnHitDamageAvoid)
        const v = Math.max(1, Math.floor(R.t4 * L.reduce((a, q) => a + ownMax(q), 0) + 0.5)); d += v; hitPart(st, "Body", v);
      };
      t4hit(PARTS.filter(q => q !== "Body" && st.broke[q] === st.k));
      if (R.execT > 0 && hit && st.hp.Body > 0) {
        const ex = [];
        for (const p of PARTS) {
          if (!hitP.has(p) || st.hp[p] <= 0 || (p !== "Body" && !st.alive.has(p))) continue;
          const dec = (tg.exdec && tg.exdec[p]) || 0;
          if (dec < 1 && ownHp(st, p) / ownMax(p) < R.execT * (1 - dec)) { d += st.hp[p]; if (p !== "Body") ex.push(p); hitPart(st, p, st.hp[p]); if (p === "Body") break; }
        }
        if (ex.length) t4hit(ex);
      }
    }
    if (st && st.hp.Body <= 0) return d;
    const Hn = st ? { hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0 } : null;
    for (const x of R.afxL || []) {
      if (x.pre) continue;                                    // made before the shots (preAttack)
      if (x.brk && !(st ? Object.values(st.broke).includes(st.k) : !!(R.sit && R.sit.u && R.sit.u.broke))) continue;   // needs a part destroyed
      if ((x.t === "bomb" || x.t === "mhp") && x.hit && !hit) continue;
      const L = PARTS.filter(p => (p === "Body" || (st ? st.alive.has(p) : !(T.dead && T.dead.has(p)))));
      const off = p => !!(R.afxImm && R.afxImm(p, Hn));       // an immune part takes none of it (its share is lost)
      if (x.t === "bomb") { const p = R.afxP && L.includes(R.afxP) ? R.afxP : L[(rand() * L.length) | 0]; if (!off(p)) { d += x.val; if (st) hitPart(st, p, x.val); } }
      else if (x.t === "each") { for (const p of L) if (!off(p)) { d += x.val; if (st) hitPart(st, p, x.val); } }
      else if (x.t === "split") { const v = Math.max(1, Math.floor(x.val / L.length + 0.5)); for (const p of L) if (!off(p)) { d += v; if (st) hitPart(st, p, v); } }
      else if (x.t === "mhp" && !x.keep1) { for (const p of L) if (!off(p)) { d += x.by[p]; if (st) hitPart(st, p, x.by[p]); } }
      else for (const p of L) { if (off(p)) continue; const v = Math.min(x.by[p], Math.max(0, (st ? st.hp[p] : tg.hp[p]) - 1)); d += v; if (st) st.hp[p] -= v; }   // Short Circuit: keeps 1 HP
      if (st && st.hp.Body <= 0) break;
    }
    return d;
  };
  const burnAll = (R, st) => {
    for (const p of PARTS) if (p === "Body" || st.alive.has(p)) {
      st.hp[p] -= R.burn[p];
      if (p !== "Body" && st.hp[p] <= 0) { st.alive.delete(p); st.wc = {}; st.broke[p] = st.k; }
    }
  };
  // one attack, every part standing: the spread of a single attack
  if (opt.statsOnly) {
    let s1 = 0, s2 = 0; for (let k = 0; k < RUNS; k++) { const v = attack(pickO(), null, O); s1 += v; s2 += v * v; }    // statsOnly: mean and spread only
    const mu = s1 / RUNS; return { mean: mu, sd: Math.sqrt(Math.max(0, s2 / RUNS - mu * mu)), runs: RUNS };
  }
  const single = Array.from({ length: RUNS }, () => attack(pickO(), null, O)).sort((a, b) => a - b);
  const mean = single.reduce((a, b) => a + b, 0) / RUNS, tail = Math.max(1, Math.round((100 - conf) / 100 * RUNS));
  const worst = single.slice(0, tail).reduce((a, b) => a + b, 0) / tail;
  // whole fights: attack until the body is at 0; the terrain tick hits every standing part after each attack (one attack per enemy turn)
  const kills = [], breaks = { "Left arm": [], "Right arm": [], Legs: [] }, hp0 = {};
  for (const p of PARTS) hp0[p] = T.dead.has(p) ? 0 : tg.hp[p] * T.hp / 100;
  function hp0Body() { return hp0.Body; }
  const FIGHTS = nFights || fightCount(O);
  if (mean > 0 || O.base.burnT || ONCE.length) for (let f = 0; f < FIGHTS; f++) {      // a first attack into a one-time immunity deals 0
    const st = { hp: { ...hp0 }, alive: new Set(LIMBS.filter(p => !T.dead.has(p))), broke: {}, k: 0, wc: {} }; poolsAt(st);
    while (st.hp.Body > 0 && st.k < CAP) {
      st.k++; const OO = outcomesAt(st); attack(pickO(OO), st, OO);
      if (ONCE.length && hitP && hitP.size) for (const b of ONCE) (st.gone ||= new Set()).add(b);
      if (st.hp.Body > 0 && O.base.burnT) burnAll(O.base, st);
    }
    kills.push(st.hp.Body <= 0 ? st.k : CAP + 1);
    for (const p of Object.keys(breaks)) breaks[p].push(st.broke[p] || Infinity);
  }
  kills.sort((a, b) => a - b);
  const at = (arr, c) => arr.length ? arr[Math.min(arr.length - 1, Math.ceil(c / 100 * arr.length) - 1)] : null;
  const need = at(kills, conf), hist = {};
  for (const k of kills) hist[k] = (hist[k] || 0) + 1;
  const brk = {}; for (const [p, arr] of Object.entries(breaks)) { arr.sort((a, b) => a - b); const v = at(arr, conf); brk[p] = v === Infinity ? null : v; }
  return {
    mean, worst, worstPct: mean ? worst / mean : 0, tail: 100 - conf, need: need > CAP ? null : need,
    avgKill: kills.some(k => k > CAP) || !kills.length ? null : kills.reduce((a, b) => a + b, 0) / kills.length,
    hist, fights: kills.length, brk, hp: hp0.Body
  };
}

/* ------------------------------------------------------------------ rendering: setup */
/* attacks this setup can make: Normal Attack, the equipped attack skills / EX, and attacks other skills unlock */
function attackOpts(s, weap) {
  const W = weap[s.atk.slot] && D.weapons[weap[s.atk.slot].id], P = D.pilots[s.pilot];
  const out = !W || normalOf(W) ? [["normal", normalLabel(normalOf(W)), W ? icon("weapon", weap[s.atk.slot].id) : ""]] : [];   // no Normal Attack on a weapon without one
  const fits = k => D.skills[k] && D.skills[k].atk && (!W || D.skills[k].atk[W.type]);
  for (const k of [...s.skills, s.ex]) if (k && fits(k) && !out.some(o => o[0] === k)) out.push([k, (k === s.ex ? "EX: " : "") + D.skills[k].n, icon("skill", k)]);
  // an attack another passive grants only for a unit that holds that passive (its talent at this star, a skill, a Neural Drive node)
  const own = new Set([...(P.auto || []), ...(s.skills || []), s.ex, (P.stars[Math.min(s.star, P.stars.length - 1)] || {}).talent].filter(Boolean));
  for (const sec of Object.keys(P.sectors || {})) (P.sectors[sec] || []).forEach((k, i) => { if (secOn(s, sec, i)) own.add(k); });
  for (const x of P.xatk || []) if (fits(x.k) && (!x.srcs || x.srcs.some(k => own.has(k))) && !out.some(o => o[0] === x.k))
    out.push([x.k, x.lab || `${D.skills[x.k].n} (${x.via.toLowerCase()})`, icon("skill", x.k)]);
  if (!out.length) out.push(["normal", "No attack with this weapon"]);
  return out;
}
function attackName(s, weap) {
  if (s.atk.skill && s.atk.skill !== "normal" && D.skills[s.atk.skill]) return D.skills[s.atk.skill].n;
  const W = weap && weap[s.atk.slot] && D.weapons[weap[s.atk.slot].id];
  return W && !normalOf(W) ? "no attack" : normalLabel(normalOf(W));
}
function sel(id, opts, cur, empty) { return `<select id="${id}">${empty ? opt("", empty, !cur) : ""}${opts.map(([v, l, ic]) => opt(v, l, String(v) === String(cur), ic)).join("")}</select>`; }
function featureOpts(port, who, slotIdx, taken) {
  return byName(D.features).filter(k => {
    const F = D.features[k]; return F.port === port && (!who || F.for === who || F.for === "any" || !F.for)
      && (!F.slots || F.slots.split(",").includes(["I", "II", "III"][slotIdx])) && !(taken || []).some((x, j) => j !== slotIdx && x === k);
  }).map(k => [k, D.features[k].n, icon("feature", k)]);
}
let SHOW_ALL_STATS = false;
const EXTRA_FIELDS = [["attr", "Attribute +"], ["dmgB", "Damage %"], ["finalB", "Final damage %"], ["skillM", "Skill multiplier +"],
["shots", "Shots per round +"], ["hitrate", "Hit chance +"], ["crit_rate", "Crit rate +"], ["crit_fin", "Crit rate after features +"],
["crit_dmg", "Crit damage +"], ["shred", "Armor shred %"], ["splash", "Flame DMG %"]];
const EXTRA_STEP = { skillM: "0.05", shots: "1" };      // the rest take any number; every box takes a negative (a debuff)
/* full name + game description under a feature dropdown; flags features whose only effect does nothing */
function featDesc(k) {
  const F = k && D.features[k]; if (!F) return "";
  // the game's text, plus what it really does where that differs (F.rn; a lone final-crit-points add
  // without a note still says so, with its own value)
  const fx = (D.fx[F.fx] || []), dead = fx.length && fx.every(e => e.f === "crit_app_fin");
  const rn = F.rn || (dead ? `does nothing measurable: adds +${fx[0].v} to the final crit points` : "");
  return `<span class="desc"><b>${esc(F.n)}</b> · ${esc(F.d || "")}${rn ? ` <span class="warnline">(${esc(rn)})</span>` : ""}</span>`;
}
/* a follow-up of this kind in the setup's rows (any attack): the first one's name, for the Bonuses panel's trigger choice */
function kitHas(s, f) {
  const weap = equipped(s), slot = weap[s.atk.slot] ? s.atk.slot : Object.keys(weap)[0];
  if (!slot) return null;
  for (const src of sources(s, slot, weap)) for (const k of src.fx) for (const e of D.fx[k] || []) if (e.f === f) return e.n || (f === "purs" ? "Flurry Strike" : "Gusty Strike");
  return null;
}
function renderSide(id) {
  const s = S[id], P = D.pilots[s.pilot], st = stOf(s), el = $("side-" + id);
  const star = P.stars[Math.min(s.star, P.stars.length - 1)];
  const weap = equipped(s), fixed = fixedWeapons(s);
  const atkOpts = attackOpts(s, weap);                       // a weapon with no Normal Attack starts on its first attack
  if (!atkOpts.some(o => o[0] === (s.atk.skill || "normal"))) s.atk.skill = atkOpts[0][0];
  const skillOpts = P.skills.map(k => [k, `${D.skills[k].n} (${D.skills[k].type === "ActiveAttack" ? "attack skill" : D.skills[k].type === "Code" ? "code" : "passive"})`, icon("skill", k)]);
  const exOpts = D.ex.map(k => [k, D.skills[k].n, icon("skill", k)]);
  const wcls = st.cls;
  const drive = p => D.pilots[p].stars[0] && D.pilots[p].stars[0].drive;
  const fitPilots = pilotIds.filter(p => drive(p) === wcls);
  const usedW = Object.values(weap).map(w => D.weapons[w.id]).filter(Boolean);
  const showAll = SHOW_ALL_STATS || !usedW.length;
  const shownAttrs = showAll ? ATTRS : ATTRS.filter(a => usedW.some(W => W.attr === a));
  const shownCats = showAll ? CATS : CATS.filter(c => usedW.some(W => W.cat === c));
  const sectorRows = sec => {
    const ks = P.sectors[sec] || [], fixedN = sec === "α" || sec === "β" ? 3 : 1;
    return `<div class="sector"><div class="lbl">${secName(sec)}</div>` + ks.map((k, i) => {
      const fixed = i < fixedN, on = secOn(s, sec, i), always = fixed;
      return `<label class="lvl${on ? "" : " dim"}"><input type="checkbox" ${always ? `${on ? "checked " : ""}disabled` : `data-sect="${sec}:${i - 1}" ${on ? "checked" : ""}`}>
      <span><b>L${i + 1} · ${esc(D.skills[k].n)}</b>${always ? ` <span class="pill">${on ? "always on" : "no chip power"}</span>` : ""}<span class="desc">${esc(D.skills[k].d || "")}</span></span></label>`;
    }).join("") + `</div>`;
  };
  const moduleOpts = byName(D.modules).flatMap(mid => D.modules[mid].items.map(it => [it.id, it.n + (it.plus > 1 ? " (gold, counts 2)" : "") + ` · max L${D.modules[mid].max}`, icon("module", it.id)]));
  const backOpts = [["", "Empty"], ...backList(wcls, s.back).map((k, i, L) => ["bp:" + k, backLabel(k, L), icon("back", k)]),
  ...(wcls === "Medium" ? [["w", "Weapon (Rail Gun / Cutter / Missile Launcher)"]] : [])];
  el.innerHTML = `
  <div class="head"><span class="tag">${id}</span>
    <button type="button" id="${id}-blank">Clear</button>
    <div class="loaded" id="${id}-loaded"${s.loaded ? "" : " hidden"}></div></div>
  <div class="readout" id="${id}-out"></div>
  <details class="sec" id="${id}-d-st"><summary><h3>ST</h3><span class="sub">${esc(st.mixed ? "Mixed · body " + st.n : st.n)} · ${esc(st.cls)}</span></summary><div class="sbody">
    <div class="grid4"><label class="f"><span class="lbl">Body ST</span>${sel(id + "-st", withCur(stIds, s.st).map(k => [k, `${D.sts[k].n} · ${D.sts[k].cls} (${stRange(k)})`, icon("st", k)]), s.st)}</label>
      ${PARTS.slice(1).map(p => `<label class="f"><span class="lbl">${p} ST</span>${sel(`${id}-pst-${p}`, [["", "Same as body"], ...withCur(stIds, partST(s, p) === s.st ? null : partST(s, p)).filter(k => k !== s.st && D.sts[k].cls === st.cls).map(k => [k, D.sts[k].n, icon("st", k)])], partST(s, p) === s.st ? "" : partST(s, p))}</label>`).join("")}
      ${PARTS.map(p => `<label class="f"><span class="lbl">${p} grade</span>${sel(`${id}-gr-${p}`, st.parts[p].grades.map((g, i) => [i, qualityLabel(st.parts[p].grades, i)]), s.grades[p])}</label>`).join("")}
      ${PARTS.map(p => `<label class="f"><span class="lbl">${p} level</span><input type="number" min="1" max="70" step="1" id="${id}-lv-${p}" value="${partLv(s, p)}"></label>`).join("")}
      ${PARTS.map(p => {
    const sl = partSlot(s, p), mo = moduleOpts.filter(([v]) => modFits(s, p, v) || String(v) === String(s.mods[p]));   // only modules its slot takes
    return `<label class="f"${sl < 2 ? ` title="${sl ? "This grade gives Connector I: normal modules only" : "This grade has no module slot"}"` : ""}><span class="lbl">${p} module</span>${sel(`${id}-md-${p}`, mo, s.mods[p], "—")}</label>`;
  }).join("")}</div>
    ${D.sts[s.st].hidden ? `<div class="meta">${hiddenOn(s) ? "Hidden modules active (full set, all parts SS)" : "Hidden modules off: they need all four parts from this ST, every part at rainbow (SS)"}; their effects also need Eruption Mod at L8.</div>` : ""}
    ${st.mixed ? `<div class="meta">Mixed set: each part's FP, hit, passives and built-in modules come from its own ST; the body's ST sets the class.</div>` : ""}
    ${s.stMissing ? `<div class="meta warnline">This unit's own ST isn't in the bench's data, so it shows ${esc(D.sts[s.st].n)} instead.</div>` : ""}
    ${PARTS.some(p => partLv(s, p) < 70) ? `<div class="meta">Parts below Lv70: their FP and hit follow the part's level.</div>` : ""}
    <div class="meta">Module levels (built-in from grades + equipped): ${esc(Object.entries(moduleCounts(s)).map(([k, n]) => `${D.modules[k].n} L${Math.min(n, D.modules[k].max)}${n > D.modules[k].max ? " (max)" : ""}`).join(" · ") || "none")}</div>
    ${(() => {
      const L = PARTS.slice(1).flatMap(p => [...((s.grU || {})[p] ? [p + " grade"] : []), ...((s.mdU || {})[p] ? [p + " module"] : [])]);
      return `<div class="meta" id="${id}-follow">${L.length ? `Set by you, kept when the body changes: ${esc(L.join(", "))}. Pick the body's grade (the same chevrons) or module for a part to make it follow the body again.`
        : "The arms and legs follow the body's grade and module until you set one yourself."}</div>`;
    })()}
  </div></details>
  <details class="sec" id="${id}-d-w"><summary><h3>Weapons</h3><span class="sub">attack with: ${esc(weap[s.atk.slot] ? D.weapons[weap[s.atk.slot].id].n : "—")} · ${esc(attackName(s, weap))}</span></summary><div class="sbody">
    <div class="grid"><label class="f span2"><span class="lbl">Attack</span>${sel(id + "-atkskill", atkOpts, s.atk.skill || "normal")}</label>
      <label class="f"><span class="lbl">Back slot</span>${sel(id + "-back", backOpts, s.back || "")}${(() => {
      const B = s.back && s.back.startsWith("bp:") && D.backs[s.back.slice(3)];
      return B && B.rn ? `<span class="desc"><span class="warnline">(${esc(B.rn)})</span></span>` : "";
    })()}</label></div>
    ${SLOTS.map(([slot, label]) => slotHtml(id, s, slot, label, weap, fixed)).join("")}
  </div></details>
  <details class="sec" id="${id}-d-pilot"><summary><h3>Pilot</h3><span class="sub">${esc(P.name)} · ${esc(P.class || "")} · potential ${s.star}</span></summary><div class="sbody">
    <div class="grid">
      <label class="f span2"><span class="lbl">Pilot</span>${sel(id + "-pilot", (fitPilots.includes(s.pilot) ? fitPilots : [s.pilot, ...fitPilots]).map(p => [p, D.pilots[p].name + (D.pilots[p].class ? " · " + D.pilots[p].class : ""), icon("pilot", p)]), s.pilot)}</label>${WIKI ? `<button type="button" data-wiki="pilot:${esc(s.pilot)}" data-wiki-name="${esc(D.pilots[s.pilot].name)}">In the wiki</button>` : ""}
      <label class="f"><span class="lbl">Potential</span>${sel(id + "-star", P.stars.map((x, i) => [i, `${i} · ${D.suit[String(x.rank)] ? D.suit[String(x.rank)].n : ""}`]), s.star)}</label>
    </div>
    <div class="lbl">Stats on your pilot screen <span class="meta">(leave blank to use the calculated value; only the stats your weapons use are shown)</span><label class="stk"><input type="checkbox" id="${id}-showall" ${SHOW_ALL_STATS ? "checked" : ""}> show all stats</label></div>
    <div class="grid">${shownAttrs.map(a => `<label class="f"><span class="lbl">${shownAttr(a)}</span><input type="number" id="${id}-sc-${a}" value="${s.screen[a] || ""}" placeholder="auto"></label>`).join("")}</div>
    <div class="lbl">Chip bonus <span class="meta">(Global Effects → Chip Bonus; attributes can stay blank)</span></div>
    <div class="grid">${shownAttrs.map(a => `<label class="f"><span class="lbl">${shownAttr(a)}</span><input type="number" id="${id}-ch-attr-${a}" value="${s.chips["attr:" + a] || ""}" placeholder="worked out"></label>`).join("")}</div>
    <div class="grid4">${shownCats.map(c => `<label class="f"><span class="lbl">${catLabel(c)} hit</span><input type="number" id="${id}-ch-hit-${c}" value="${s.chips["hit:" + c] || ""}"></label>`).join("")}
      ${shownCats.map(c => `<label class="f"><span class="lbl">${catLabel(c)} crit</span><input type="number" id="${id}-ch-crit-${c}" value="${s.chips["crit:" + c] || ""}"></label>`).join("")}</div>
    <div class="grid">${[0, 1, 2].map(i => `<label class="f"><span class="lbl">Skill ${i + 1}</span>${sel(`${id}-sk-${i}`, skillOpts.filter(([k]) => !s.skills.some((x, j) => j !== i && x === k)), s.skills[i], "—")}</label>`).join("")}
      <label class="f span2"><span class="lbl">EX skill</span>${sel(id + "-ex", exOpts, s.ex, "—")}</label>
      <div class="f"><span class="lbl">Talent</span><span>${esc(star.talent ? D.skills[star.talent].n : "—")}${s.star >= 3 ? " (enhanced)" : ""}</span></div></div>
    <div class="meta">Neural Drive: sectors a and b levels 1–3 and y1 / y2 level 1 are always on; Bionic Computer neurons all unlocked except capacity neurons.</div>
    <details class="sub" open><summary class="lbl">Neural Drive sectors</summary><div class="sectors">${["α", "β", "γ1", "γ2"].map(sectorRows).join("")}</div></details>
  </div></details>
  <details class="sec" id="${id}-d-feat"><summary><h3>Features</h3><span class="sub">${[...s.pf, ...s.stf, ...s.wf].filter(Boolean).length} of 9 equipped · pilot, ST and weapon features</span></summary><div class="sbody">
    <div class="meta">R&amp;D features, all equipped with the ST loadout in game.</div>
    <div class="grid">${[0, 1, 2].map(i => `<label class="f"><span class="lbl">Pilot feature ${["I", "II", "III"][i]}</span>${sel(`${id}-pf-${i}`, featureOpts("pilot", P.class, i, s.pf), s.pf[i], "—")}${featDesc(s.pf[i])}</label>`).join("")}</div>
    <div class="grid">${[0, 1, 2].map(i => `<label class="f"><span class="lbl">ST feature ${["I", "II", "III"][i]}</span>${sel(`${id}-stf-${i}`, featureOpts("mech", null, i, s.stf).filter(([k]) => ["any", st.cls].includes(D.features[k].for) || !D.features[k].for), s.stf[i], "—")}${featDesc(s.stf[i])}</label>`).join("")}</div>
    <div class="grid">${[0, 1, 2].map(i => `<label class="f"><span class="lbl">Weapon feature ${["I", "II", "III"][i]}</span>${sel(`${id}-wf-${i}`, featureOpts("weapon", null, i, s.wf), s.wf[i], "—")}${featDesc(s.wf[i])}</label>`).join("")}</div>
  </div></details>
  <details class="sec" id="${id}-d-sit"><summary><h3>Situation</h3><span class="sub" id="${id}-sitsum"></span></summary><div class="sbody"><div id="${id}-sit"></div></div></details>
  <details class="sec" id="${id}-d-fx"><summary><h3>Bonuses &amp; buffs</h3><span class="sub" id="${id}-fxsum"></span></summary><div class="sbody"><div id="${id}-fx"></div>
    <div class="checks fxchecks">
      ${kitHas(s, "combo") ? `<label class="f"><span class="lbl">Gusty Strike (${esc(kitHas(s, "combo"))})</span>${sel(id + "-x-gusty", [["chance", "Weighted by its chance"], ["on", "Triggered"], ["off", "Not triggered"]], s.extra.gusty || "chance")}</label>` : ""}
      ${kitHas(s, "purs") ? `<label class="f"><span class="lbl">Flurry Strike (${esc(kitHas(s, "purs"))})</span>${sel(id + "-x-purs", [["chance", "Weighted by its chance"], ["on", "Triggered"], ["off", "Not triggered"]], s.extra.purs || "chance")}</label>` : ""}</div>
  </div></details>
  <details class="sec"><summary><h3>Extra bonuses</h3><span class="sub">${EXTRA_FIELDS.filter(([k]) => s.extra[k]).length || "none"}${EXTRA_FIELDS.some(([k]) => s.extra[k]) ? " set" : ""}</span></summary><div class="sbody"><div class="grid">
    ${EXTRA_FIELDS.map(([k, l]) => `<label class="f"><span class="lbl">${l}</span><input type="number" step="${EXTRA_STEP[k] || "any"}" id="${id}-x-${k}" value="${s.extra[k] || 0}"></label>`).join("")}</div>
    <div class="meta">For effects on your unit the bench doesn't add by itself: buffs from teammates or the stage, debuffs an enemy put on you during its turn (not the ones listed as rows under the target, which are set there).
      Anything else on the target goes in the target's Other buffs on it, except an armor cut (Armor shred % here) and crit DMG taken (Crit damage + here: the same sum). Stacks of buffs listed under Bonuses &amp; buffs are set under Situation, not here. When an effect counts the buffs on you, count a teammate's buff typed here under Situation: Other buffs on you.
      Percent boxes take whole numbers (12 = +12%). A negative number is a debuff: −30 in Hit chance + for a −30% hit debuff, −20 in Damage % for −20% DMG.
      Crit rate + is multiplied by your features' crit-rate bonus; Crit rate after features + is added after it. Skill multiplier + adds to the attack's multiplier (0.15 turns 1.60x into 1.75x).
      Shots per round + adds shots to every round of the attack (a round never drops below 1 shot). Armor shred % lowers the target's armor (a negative raises it).</div></div></details>
  <details class="sec"><summary><h3>Where your numbers come from</h3></summary><div class="sbody tablebox" id="${id}-src"></div></details>
  <details class="sec"><summary><h3>Breakdown</h3></summary><div class="sbody tablebox" id="${id}-bd"></div></details>
  <details class="sec" id="${id}-d-nd"><summary><h3>Not part of this attack</h3><span class="sub" id="${id}-ndsum"></span></summary><div class="sbody"><div id="${id}-nd"></div></div></details>
  <details class="sec"><summary><h3>Save / load</h3></summary><div class="sbody"><div class="saves">
    <label class="f"><span class="lbl">Name</span><input type="text" id="${id}-svname" value="${esc(s.name || "")}" placeholder="e.g. Rosa — crit build"></label>
    <button type="button" id="${id}-save">Save</button></div>
    <div class="saves"><label class="f"><span class="lbl">Saved loadouts</span><select id="${id}-svlist"></select></label>
    <button type="button" id="${id}-load">Load</button><button type="button" id="${id}-del">Delete</button></div>
    <div class="saves"><button type="button" id="${id}-exp">Export saved loadouts</button><button type="button" id="${id}-imp">Import…</button></div>
    <div class="svio" id="${id}-io"></div>
    <div class="toast" id="${id}-svmsg" aria-live="polite"></div></div></details>`;
  const L = LAST[id];                     // the last calculated results, until Calculate runs again
  $(id + "-out").innerHTML = L ? L.out : `<div class="meta">Press <b>Calculate</b> to see damage.</div>`;
  if (L) { $(id + "-src").innerHTML = L.src; $(id + "-bd").innerHTML = L.bd; }
  wireSide(id);
  iconSelects(el);
  if (!$("view-rd").hidden) renderRD();
  fillSaves(id);
}
function slotHtml(id, s, slot, label, weap, fixed) {
  const cls = stClass(s);
  if (fixed[slot]) return `<div class="slot"><div class="sh"><span class="lbl">${label}</span><span class="pill">built in</span></div>
  <div>${esc(D.weapons[fixed[slot]].n)}</div>${atkRadio(id, s, slot, weap)}</div>`;
  if (slot === "LH" && s.w.RH && D.weapons[s.w.RH.id] && D.weapons[s.w.RH.id].slot === "DoubleHand") return `<div class="slot"><div class="sh"><span class="lbl">${label}</span><span class="pill">two-handed weapon in right hand</span></div></div>`;
  if ((slot === "RS" || slot === "LS") && (cls !== "Medium" || Object.keys(fixed).length)) return `<div class="slot"><div class="sh"><span class="lbl">${label}</span><span class="pill">${cls !== "Medium" ? "Medium STs only" : "blocked by built-in weapons"}</span></div></div>`;
  if (slot === "BK" && s.back !== "w") return "";
  const w = s.w[slot], W = w && D.weapons[w.id];
  const opts = slotOptions(s, slot).map(k => [k, `${D.weapons[k].tn} · ${D.weapons[k].n}`, icon("weapon", k)]);
  let h = `<div class="slot${s.atk.slot === slot ? " atk" : ""}"><div class="sh"><span class="lbl">${label}</span>${atkRadio(id, s, slot, weap)}</div>
  <label class="f">${sel(`${id}-w-${slot}`, opts, w ? w.id : "", "Empty")}</label>`;
  if (W && W.adv && (W.impr || W.adv[1])) {
    const pool = (D.adv[W.type] && D.adv[W.type].opts) || [];
    h += `<div class="grid">
    <div class="f" style="display:grid;gap:4px;align-content:start"><span class="lbl">Improvement</span><span style="padding:5px 0">${esc((W.impr_n || "").replace(/^Improvement:\s*/, "") || "refit")} <b>+${rdOv(s, "impr|" + W.type) ?? (typeof w.impr === "number" ? w.impr : W.impr || 0)}</b> <span class="meta">(${rdOv(s, "impr|" + W.type) != null ? "your value" : typeof w.impr === "number" ? (w.impr === (W.impr || 0) ? "max, your unit's" : "your unit's") : "max"})</span></span></div>
    <label class="f span2"><span class="lbl">Advanced ATK <span id="${id}-wav-${slot}">+${w.atk}</span> (${W.adv[0]}–${W.adv[1]})</span><input type="range" id="${id}-wa-${slot}" min="${W.adv[0]}" max="${W.adv[1]}" value="${w.atk || W.adv[0]}"></label>
    ${[0, 1].map(i => {
      const o = w.opts[i], po = o && pool.find(x => x.fx === o.fx);
      const own = o && !po && D.fx[o.fx] ? [[o.fx, `${D.fx[o.fx][0].n || "current"} (yours)`, icon("adv", o.fx)]] : [];
      return `<label class="f span2"><span class="lbl">Advanced option ${i + 1}</span>${sel(`${id}-wo-${slot}-${i}`, own.concat(pool.filter(x => !w.opts.some((y, j) => j !== i && y && y.fx === x.fx)).map(x => [x.fx, `${x.n} (${x.lo}–${x.hi})`, icon("adv", x.fx)])), o ? o.fx : "", "—")}</label>
        <label class="f"><span class="lbl">Value</span><input type="number" id="${id}-wov-${slot}-${i}" ${po ? `min="${po.lo}" max="${po.hi}"` : o ? "" : "disabled"} value="${o && o.v != null ? optV(W, o.fx, o.v) : po ? po.hi : ""}"></label>
        ${o ? `<div class="desc span3">${esc(po ? po.d : fxText(o.fx))}${po && po.rn ? ` <span class="warnline">(${esc(po.rn)})</span>` : ""}</div>` : ""}`;
    }).join("")}
    <label class="f span3"><span class="lbl">Drop ability</span>${sel(`${id}-wd-${slot}`, W.drops.map(d => [d.id, d.n]), w.drop || "", W.drops.length ? "—" : "none for this weapon")}</label>
    ${dropDesc(W, w)}</div>`;
    h += accHtml(id, s, slot, w, W);
  }
  return h + `</div>`;
}
function atkRadio(id, s, slot, weap) {
  if (!weap[slot]) return "";
  return `<label class="checks"><input type="radio" name="${id}-atk" value="${slot}" ${s.atk.slot === slot ? "checked" : ""}> <span class="pill ${s.atk.slot === slot ? "atk" : ""}">attack with this</span></label>`;
}
/* after the attack is worked out, the weapon panel's trigger pills and its 'not counted' line follow it */
function taRefresh(id, s, R) {
  for (const [slot, w] of Object.entries(s.w || {})) {
    if (!w || !w.comps) continue;
    w.comps.forEach((c, i) => {
      const C = D.components[c.id], el = $(`${id}-tas-${slot}-${i}`); if (!C || C.k !== "TA" || !el) return;
      const t = taState(C, R); el.textContent = t.on ? "counts" : "not this attack"; el.className = "pill" + (t.on ? " on" : ""); el.title = t.why;
    });
    const st = $(`${id}-accst-${slot}`); if (st) st.textContent = taLine(w, R);
  }
}
function accHtml(id, s, slot, w, W) {
  const cap = W.load || 0;
  if (!cap) return `<div class="meta">No accessory slots.</div>`;
  const tas = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "TA"), ras = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "RA");
  const fits = k => Object.keys(D.components).filter(c => { const C = D.components[c]; return C.k === k && C.q === "SSR" && (!C.own || w.comps.some(x => x.id === c)) && (!C.fits || C.fits === "Any weapon" || C.fits.split(", ").includes(W.type)); })
    .sort((a, b) => D.components[a].n.localeCompare(D.components[b].n));
  const row = (c, i) => {
    const C = D.components[c.id]; const isTA = C.k === "TA";
    const ts = isTA ? taState(C, LASTR[id]) : null;
    return `<div class="acc"><span><b>${esc(C.n)}</b> <span class="pill">${C.q}</span></span>
    ${isTA ? `<span class="pill${ts.on ? " on" : ""}" id="${id}-tas-${slot}-${i}" title="${esc(ts.why)}">${ts.on ? "counts" : "not this attack"}</span>`
        : sel(`${id}-am-${slot}-${i}`, [["chance", `Weighted (${pct(chance[c.id] || 0, 0)} per attack)`], ["on", "Triggered"], ["off", "Not triggered"]], c.mode)}
    <span class="d">${esc(C.d || "")} · factor ${C.f}</span>
    <button type="button" data-accdel="${slot}:${i}">Remove</button></div>`;
  };
  const chance = accChances(w, LASTR[id]);
  let h = `<div class="lbl">Accessories ${w.comps.length}/${cap} (TA ${tas.length}/3 · RA ${ras.length}/3)</div>
  <div class="desc">A reaction (RA) fires only when one of the weapon's triggers (TA) fires. Weighted uses the chance that at least one trigger fires it this attack
    (0.4 ÷ TA factor ÷ RA factor per pair). A trigger counts only when its condition holds in this attack (your HP, the target's HP, distance, tiles moved,
    Re-ATK, the attack's type and AP cost, its hit chance); one that fires when you're attacked or after the shots doesn't. Pick Not triggered or Triggered to fix it.</div>
  <div class="meta" id="${id}-accst-${slot}">${esc(taLine(w, LASTR[id]))}</div>`;
  h += w.comps.map((c, i) => D.components[c.id] ? row(c, i) : "").join("");
  if (w.comps.length < cap) h += `<div class="grid">
  ${tas.length < 3 ? `<label class="f span2"><span class="lbl">Add trigger (TA)</span>${sel(`${id}-addta-${slot}`, fits("TA").map(c => [c, D.components[c].n + (D.components[c].w ? " (two-handed only)" : ""), icon("comp", c)]), "", "—")}</label>` : ""}
  ${ras.length < 3 ? `<label class="f span2"><span class="lbl">Add reaction (RA)</span>${sel(`${id}-addra-${slot}`, fits("RA").map(c => [c, D.components[c].n + (D.components[c].w ? " (two-handed only)" : ""), icon("comp", c)]), "", "—")}</label>` : ""}</div>`;
  return h;
}

const OPEN = {};                         // which sections the viewer has open, kept across re-renders and loads
const SIDE_WIRED = new WeakSet();        // the side panels whose delegated listeners are on (once each)
// a pilot change keeps the ST and its parts, so the parts' levels and the 'own ST not in the data' note go along too; the
// Pilot select, the forced change on an ST class change and the wiki's 'put this pilot in a setup' all use this list
const KEEP_ON_PILOT = ["st", "pst", "grades", "mods", "grU", "mdU", "lv", "stMissing", "back", "w", "atk", "stf", "wf", "loaded"];
/* the rows one tick is written to. A group of rows with the same buffs is on while any of its rows is ticked (compute()), and
   which rows group, and which leads, depends on the attack. So a click writes the clicked row, the rows that follow it, and every row that
   shares a group with those on any other attack of this setup (either hand, every skill; again for the rows that adds), except a row that
   has a box of its own in the attack shown. Alyson: Talent: Investor on ALL IN, where 'ALL IN: Exposure (from an earlier use)' isn't shown,
   writes that row too: it follows Investor on her other attacks, so unticking on ALL IN unticks it there too */
// a row's box can be ticked (renderFx): something on it can apply in this attack, and the bench doesn't decide it (not level-only, not a
// row that follows or is covered, a row that asks or a Code row)
const rowAnyOk = row => row.effs.some(x => !x.note && (x.eok || x.chOff || (x.lv && x.eask && !x.failO))) || !!row.src.sbRd;
const rowBoxLive = row => !row.hide && !row.forced && row.src.kind !== "ra" && !row.effs.every(x => x.note) && rowAnyOk(row) && !row.lvOnly && !row.follow && !row.cover
  && (row.ask || row.src.kind === "code");
/* a row's pill, from its state (row) or from what auto would give (natRow: its natural state, kept in a0 when it is forced).
   'partly': the row is on, some of its effects count and some are crossed out (Perfect Position 1 at 3 tiles: its Always part
   'Ideal range +2 (Machine Gun)' counts, its 'Final damage +15%' needs ideal range). Display only. Returns [class, words]; null for a
   level-only row (its 'Vigor up' pill) */
const natRow = row => row.a0 ? { ...row, effs: row.effs.map(x => x.a0 ? { ...x, ...x.a0 } : x), on: row.a0.on, ask: row.a0.ask, mixed: row.a0.mixed, forced: null } : row;
function pillOf(row, chP) {
  // a level gain by your first action that fails at turn 1 (x.t1) is crossed out for the pill: it isn't in the start level
  const allNote = row.effs.every(x => x.note), anyOk = row.effs.some(x => !x.note && ((x.eok && !x.t1) || x.chOff || (x.lv && x.eask && !x.failO))) || !!row.src.sbRd;
  if (allNote) return ["", "no damage"];
  if (row.src.kind === "ra") return [row.on ? "on" : "", row.on ? "triggered" : "by trigger"];
  if (row.lvOnly) return null;
  if (row.forced) return ["ask", "forced " + row.forced];
  if (!anyOk) return ["", "doesn't apply"];
  if (chP != null && !row.effs.some(x => x.eok)) return ["on", `${pct(chP, 0)} chance`];
  const crossed = row.effs.some(x => !x.note && ((!x.eok && !x.chOff && !(x.lv && x.eask && !x.failO)) || x.t1)), applies = row.effs.some(x => !x.note && ((x.eok && !x.t1) || x.chOff));
  if (row.on && crossed && applies) return ["part", "partly"];
  return row.on ? ["on", "on"] : row.ask && !row.follow ? ["ask", "check"] : ["", "off"];
}
/* the attack's other rounds, each with its own rows: the other weapon's shots and the sub-skill rounds (R.struct), the
   two-hand average (R.avgR), rounds 2.. of a skill read at a lower target HP (R.rnd), Peripheral Vision, Gusty / Flurry Strike and
   after-combat strikes that can fire in this setup. A row the bench decides can count in some of them and not in others (Flame Core L4's
   'Skill AP cost >= 3' fails in a Flurry Strike round: an extra attack costs 0 AP; Raider - Std. Energy Adaptation's '<= 3' passes there).
   With O (outcomes()): the attack and its rounds in each trigger outcome too (an accessory that triggers, a chance that fires), combo: true:
   Rebecca's Bionic Computer 6 Flurry Strike vs White Flame, after an RA takes the target under 50%, has no Onslaught Refit 'Target HP >= 50%' */
function roundsOf(R, O) {
  // an entry: {name (shown), base (the round's own name), combo (a trigger outcome: ras = the accessories that trigger, chance = a chance
  // fired), Xs (the rounds' results), hp (X -> the target HP % the round reads, for a 'Target HP' check's words)}
  const out = [], seen = new Set([R]), add = (X, base, cb, hp) => {
    if (!X || !X.rows || seen.has(X)) return; seen.add(X);
    const name = base + (cb ? cb.sf : ""), o = out.find(y => y.name === name);
    if (o) { o.Xs.push(X); o.hp.set(X, hp); } else out.push({ name, base, combo: !!cb, ras: cb ? cb.ras : [], chance: !!(cb && cb.chance), Xs: [X], hp: new Map([[X, hp]]) });
  };
  const fires = x => { const p = x.pDP != null ? x.pDP : x.p != null ? x.p : x.q != null ? x.q : 1; return p > 0; };
  const of = (R0, cb) => {
    const ha = R0.hpAfter != null ? R0.hpAfter : null;
    for (const st of (R0.struct && R0.struct.steps) || []) for (const y of st.streams || [])
      add(y.R, y.slot !== R0.atkSlot ? `the ${SLOTW[y.slot] || y.slot} weapon's shots (${y.R.W.n})` : (st.label || KIND_W[st.kind] || "another round of this attack"), cb, null);
    if (R0.avgR) add(R0.avgR, `the ${SLOTW[R0.avgR.atkSlot] || R0.avgR.atkSlot} weapon's half of the two-hand average (${R0.avgR.W.n})`, cb, null);
    (R0.rnd || []).forEach((x, j) => { if (x && x.R) add(x.R, `round ${j + 1} of ${R0.rounds}`, cb, x.h); });
    if (R0.pv && R0.pv.R && !(R0.pv.pDP === 0)) add(R0.pv.R, "the Peripheral Vision round", cb, R0.pv.hAt != null ? R0.pv.hAt : null);
    if (R0.gusty) for (const g of R0.gusty.list || [R0.gusty]) if (fires(g)) add(g.R, "the Gusty Strike round", cb, ha);
    if (R0.purs && R0.purs.mode !== "off") for (const x of R0.purs.list) if (fires(x)) add(x.R, R0.purs.list.length > 1 ? `the Flurry Strike round (${x.name})` : "the Flurry Strike round", cb, ha);
    if (R0.after) for (const x of R0.after.list) if (fires(x)) add(x.R, `the after-combat strike (${x.name})`, cb, ha);
  };
  of(R, null);
  if (O && O.list) for (const o of O.list) if (o.R && o.R !== R && o.p > 0) {
    const ras = [...new Set((o.R.raStates || []).filter(x => x.mode === "on").map(x => (D.components[raId(x.id)] || {}).n).filter(Boolean))];
    const cb = { ras, chance: !ras.length, sf: ras.length ? ` when ${ras.join(" and ")} ${ras.length > 1 ? "trigger" : "triggers"}` : " when a chance effect fires" };
    add(o.R, "this attack", cb, null); of(o.R, cb);
  }
  return out;
}
/* per round, what of a decided row counts differently from the main round: gain (counts there, not here) / loss (counts here, not there),
   with the checks that make the difference (fc: the failing checks the rows loop keeps). Compared: the row's real effects (no notes,
   follow-ups, levels); an effect a round doesn't have (Marksmanship's 'once', another weapon type) is not compared there. null: not a
   decided row (its tick, its level or its trigger decides it) */
function xRow(row, R, RX) {
  if (!R || row.forced || row.ask || row.src.kind === "code" || row.src.kind === "ra" || row.lvOnly || row.hide || row.follow || row.cover || row.effs.every(x => x.note)) return null;
  const cmp = x => !x.note && !x.pseudo && !x.lv && !x.chk, K = ovrK(row.src), M = new Map(row.effs.filter(cmp).map(x => [x.e, x]));
  const gain = [], loss = [];
  for (const E of RX || roundsOf(R)) {
    const { Xs } = E;
    const g = [], l = [];
    for (const X of Xs) {
      const r2 = X.rows.find(r => !r.hide && ovrK(r.src) === K); if (!r2) continue;
      for (const y of r2.effs) {
        if (!cmp(y)) continue; const x = M.get(y.e);
        if (y.eok && !(x && x.eok)) g.push({ x, y, X }); else if (!y.eok && (!x || x.eok)) l.push({ x, y, X });
      }
    }
    if (g.length) gain.push({ ...E, L: g }); if (l.length) loss.push({ ...E, L: l });
  }
  return { gain, loss };
}
// the pill with the attack's other rounds: 'on' that fails in a round, or "doesn't apply" that counts in one, is 'partly'
function pillX(row, R, chP, RX) {
  const pl = pillOf(row, chP), xr = pl ? xRow(row, R, RX) : null;
  if (xr && ((pl[1] === "on" && xr.loss.length) || (pl[1] === "doesn't apply" && xr.gain.length))) return { pl: ["part", "partly"], xr };
  return { pl, xr };
}
// the chance shown on a row's pill (its first 'N% chance' effect); a forced row's natural one (a0.chp) for 'auto would give'
const rowChP = (row, R) => row.effs.filter(x => x.chk).map(x => R.chanceP[x.chk])[0];
const natChP = row => { const x = row.effs.find(y => y.a0 && y.a0.chp != null); return x ? x.a0.chp : undefined; };
/* what auto would give a forced row: the setup worked out again without this row's override (a row can decide its own conditions: Perfect
   Position 1 forced off also takes away the ideal range its Always part gives, so in that attack its Final DMG part fails too); the row is
   looked for in that attack and in the other weapon's stream of it; else its natural state in this attack (a0) */
function autoWord(s, row) {
  const k = ovrK(row.src), o = { ...((s && s.ovr) || {}) }; delete o[k];
  try {
    const O2 = outcomes({ ...s, ovr: Object.keys(o).length ? o : undefined }), R2 = O2 && O2.base;
    const all = R2 ? [R2, ...((R2.struct && R2.struct.steps) || []).flatMap(x => x.streams).map(y => y.R), R2.avgR].filter(Boolean) : [];
    let RX2 = null;
    // with the attack's other rounds, as the row's own pill reads them (pillX)
    for (const X of all) { const r2 = (X.rows || []).find(x => x.src.key === row.src.key && !x.hide); if (r2) { const p = pillX(r2, R2, rowChP(r2, X), RX2 || (RX2 = roundsOf(R2, O2))).pl; return p ? p[1] : r2.on ? "on" : "off"; } }
  } catch (e) { }
  return (pillOf(natRow(row), natChP(row)) || ["", "on"])[1];
}
const pillTitle = c => c === "part" ? "Some of its effects count in this attack and some don't: the crossed-out ones (their conditions are on the line), or in a round a line names" : "";
/* the menu goes on a row shown under Bonuses & buffs that the bench decides (greyed box), or a live row greyed because nothing on it can apply,
   or one that has an override stored (so it can always be cleared); never an RA row, a level row, a follower or a covered row */
const ovrMenuOK = row => row.src.kind !== "ra" && !lvOnlySrc(row.src, row.rw) && !row.hide && !row.effs.every(x => x.note) && !row.lvOnly && !row.follow && !row.cover
  && (!!row.forced || (!row.ask && row.src.kind !== "code") || !rowAnyOk(row));
function tickKeys(s, k0) {
  const ks = new Set([k0]);
  try {
    const cp = atk => JSON.parse(JSON.stringify({ ...s, loaded: undefined, ...(atk ? { atk } : {}) }));
    const grpOf = R => R.rows.filter(r => r.grpKeys).map(r => [r.src.key, ...R.rows.filter(y => y.follow === r.src.key).map(y => y.src.key)]);
    const Rh = compute(cp()); if (!Rh) return [...ks];
    const here = grpOf(Rh), mine = here.find(G => G.includes(k0)) || [k0];
    const own = new Set(Rh.rows.filter(r => rowBoxLive(r) && !mine.includes(r.src.key)).map(r => r.src.key));
    for (const k of mine) ks.add(k);
    const G = [...here], weap = equipped(s);
    for (const slot of Object.keys(weap)) for (const [k] of attackOpts({ ...s, atk: { slot, skill: "normal" } }, weap)) {
      if (slot === s.atk.slot && k === s.atk.skill) continue;
      let R = null; try { R = compute(cp({ slot, skill: k })); } catch (e) { } if (R) G.push(...grpOf(R));
    }
    for (let grew = true; grew;) {
      grew = false;
      for (const g of G) if (g.some(k => ks.has(k))) for (const k of g) if (!ks.has(k) && !own.has(k)) { ks.add(k); grew = true; }
    }
  } catch (e) { }
  return [...ks];
}
function wireSide(id) {
  $("side-" + id).querySelectorAll("details.sec").forEach((d, i) => {
    const k = id + ":" + i;
    if (k in OPEN) d.open = OPEN[k];
    d.addEventListener("toggle", () => { OPEN[k] = d.open; });
  });
  const s = S[id], on = (sid, ev, fn) => { const e = $(sid); if (e) e.addEventListener(ev, fn); };
  const rer = () => { const fk = focusKey(); renderSide(id); update(); refocus(fk); };
  const keepOpen = () => { const open = [...$("side-" + id).querySelectorAll("details.sec")].map(d => d.open); return () => [...$("side-" + id).querySelectorAll("details.sec")].forEach((d, i) => d.open = open[i]); };
  const reRender = () => { const fk = focusKey(), r = keepOpen(); renderSide(id); r(); update(); refocus(fk); };      // the focus is kept across the re-render (focusKey / refocus)
  on(id + "-blank", "click", () => { S[id] = blankSide(s.pilot); reRender(); });
  on(id + "-pilot", "change", e => {
    const n = blankSide(e.target.value);
    for (const k of KEEP_ON_PILOT) if (s[k] !== undefined) n[k] = s[k];
    if (D.pilots[n.pilot].class === D.pilots[s.pilot].class) n.pf = s.pf;                 // same class: its pilot features still fit
    S[id] = n; reRender();
  });
  on(id + "-showall", "change", e => { const fk = focusKey(); SHOW_ALL_STATS = e.target.checked;["A", "B"].forEach(x => { renderSide(x); }); update(); refocus(fk); });
  on(id + "-star", "change", e => { s.star = +e.target.value; reRender(); });
  ATTRS.forEach(a => on(`${id}-sc-${a}`, "input", e => { s.screen[a] = e.target.value === "" ? null : +e.target.value; update(); }));
  ATTRS.forEach(a => on(`${id}-ch-attr-${a}`, "input", e => { if (e.target.value === "") delete s.chips["attr:" + a]; else s.chips["attr:" + a] = +e.target.value; update(); }));
  CATS.forEach(c => {
    on(`${id}-ch-hit-${c}`, "input", e => { s.chips["hit:" + c] = +e.target.value || 0; update(); });
    on(`${id}-ch-crit-${c}`, "input", e => { s.chips["crit:" + c] = +e.target.value || 0; update(); });
  });
  [0, 1, 2].forEach(i => {
    on(`${id}-sk-${i}`, "change", e => { s.skills[i] = e.target.value || null; reRender(); });
    on(`${id}-pf-${i}`, "change", e => { s.pf[i] = e.target.value || null; reRender(); });
    on(`${id}-stf-${i}`, "change", e => { s.stf[i] = e.target.value || null; reRender(); });
    on(`${id}-wf-${i}`, "change", e => { s.wf[i] = e.target.value || null; reRender(); });
  });
  on(id + "-ex", "change", e => { s.ex = e.target.value || null; reRender(); });
  on(id + "-st", "change", e => {
    s.st = e.target.value; const cls = D.sts[s.st].cls;
    s.pst = Object.fromEntries(Object.entries(s.pst || {}).filter(([p, k]) => k !== s.st && D.sts[k] && D.sts[k].cls === cls));   // other parts keep their own ST when it fits
    PARTS.forEach(p => { if (partST(s, p) === s.st) s.grades[p] = D.sts[s.st].parts[p].grades.length - 1; });
    // the parts on the body's ST go to the top grade with it and follow it again; a part on its own ST that you didn't set takes
    // the body's tier; modules stay as they are
    s.grU ||= {}; PARTS.slice(1).forEach(p => { if (partST(s, p) === s.st) delete s.grU[p]; else if (!s.grU[p]) followGrade(s, p); });
    const dr = p => D.pilots[p].stars[0] && D.pilots[p].stars[0].drive;
    for (const [slot] of SLOTS) if (s.w[slot] && !D.weapons[s.w[slot].id].cls.includes(cls)) delete s.w[slot];   // weapons this class can't carry
    if (s.back && s.back.startsWith("bp:") && !backFits(D.backs[s.back.slice(3)], cls)) s.back = null;
    s.stf = s.stf.map(k => k && D.features[k] && (!D.features[k].for || ["any", cls].includes(D.features[k].for)) ? k : null);   // ST features for another class
    if (dr(s.pilot) !== cls) {
      const np = pilotIds.find(p => dr(p) === cls);                                     // a pilot who can drive it
      if (np) { const n = blankSide(np); for (const k of KEEP_ON_PILOT) if (s[k] !== undefined) n[k] = s[k]; S[id] = n; }
    }
    reRender();
  });
  on(id + "-back", "change", e => { s.back = e.target.value || null; reRender(); });
  // a part's new ST takes the body's tier (its top grade when its list has none) and follows the body again
  PARTS.slice(1).forEach(p => on(`${id}-pst-${p}`, "change", e => {
    (s.pst ||= {})[p] = e.target.value || null; if (!s.pst[p]) delete s.pst[p];
    if (s.grU) delete s.grU[p]; if (!followGrade(s, p)) s.grades[p] = stOf(s).parts[p].grades.length - 1; reRender();
  }));
  // the body's grade / module fills every part you haven't set yourself; picking a part's own marks it as set by you, picking
  // the body's (the same chevrons, the same module) makes it follow again
  PARTS.forEach(p => {
    on(`${id}-gr-${p}`, "change", e => {
      s.grades[p] = +e.target.value; s.grU ||= {};
      if (p === "Body") { for (const q of PARTS.slice(1)) if (!s.grU[q]) followGrade(s, q); }
      else if (grDiffers(s, p)) s.grU[p] = true; else delete s.grU[p];
      // a module its new grade's slot can't take goes back to blank
      for (const q of PARTS) if (s.mods[q] && !modFits(s, q, s.mods[q])) s.mods[q] = null;
      reRender();
    });
    on(`${id}-lv-${p}`, "change", e => { (s.lv ||= {})[p] = partLv({ lv: { [p]: e.target.value } }, p); reRender(); });
    on(`${id}-md-${p}`, "change", e => {
      const v = e.target.value || null; s.mods[p] = v; s.mdU ||= {};
      if (p === "Body") { for (const q of PARTS.slice(1)) if (!s.mdU[q] && modFits(s, q, v)) s.mods[q] = v; }
      else if (modKey(v) !== modKey(s.mods.Body)) s.mdU[p] = true; else delete s.mdU[p];
      reRender();
    });
  });     // (re-rendered: the other parts' selects and the 'Module levels' line change)
  $("side-" + id).querySelectorAll(`input[name="${id}-atk"]`).forEach(r => r.addEventListener("change", e => { s.atk.slot = e.target.value; reRender(); }));
  on(id + "-atkskill", "change", e => { s.atk.skill = e.target.value || "normal"; reRender(); });
  for (const [slot] of SLOTS) {
    on(`${id}-w-${slot}`, "change", e => { s.w[slot] = e.target.value ? newWeapon(e.target.value) : undefined; if (e.target.value && !equipped(s)[s.atk.slot]) s.atk.slot = slot; reRender(); });
    const w = s.w[slot]; if (!w) continue;
    on(`${id}-wa-${slot}`, "input", e => { w.atk = +e.target.value; $(`${id}-wav-${slot}`).textContent = "+" + w.atk; updateSoon(); });
    [0, 1].forEach(i => {
      on(`${id}-wo-${slot}-${i}`, "change", e => { w.opts[i] = e.target.value ? { fx: e.target.value, v: null } : null; reRender(); });
      // held to the option's range, as the list shows it (Forceful Strike X (63–95)); empty: its top value. Written back to the
      // box once you leave it, so typing isn't interrupted
      on(`${id}-wov-${slot}-${i}`, "input", e => { if (w.opts[i]) { w.opts[i].v = optV(D.weapons[w.id], w.opts[i].fx, e.target.value); update(); } });
      on(`${id}-wov-${slot}-${i}`, "change", e => { if (w.opts[i]) { const po = optPool(D.weapons[w.id], w.opts[i].fx); if (po) e.target.value = w.opts[i].v != null ? w.opts[i].v : po.hi; } });
    });
    on(`${id}-wd-${slot}`, "change", e => { w.drop = e.target.value || null; update(); });
    w.comps.forEach((c, i) => on(`${id}-am-${slot}-${i}`, "change", e => { c.mode = e.target.value; update(); }));
    on(`${id}-addta-${slot}`, "change", e => { if (e.target.value) { w.comps.push({ id: e.target.value }); reRender(); } });
    on(`${id}-addra-${slot}`, "change", e => { if (e.target.value) { w.comps.push({ id: e.target.value, mode: "chance" }); reRender(); } });
  }
  // the side panel itself stays across renders, so its delegated listeners go on once (added on every render, one Remove click would take off
  // as many accessories as renders had run); they read the setup shown when the event comes (S[id])
  const side = $("side-" + id);
  if (side && !SIDE_WIRED.has(side)) {
    SIDE_WIRED.add(side);
    const reR = () => { const fk = focusKey(), op = [...side.querySelectorAll("details.sec")].map(d => d.open); renderSide(id);[...side.querySelectorAll("details.sec")].forEach((d, i) => d.open = op[i]); update(); refocus(fk); };
    side.addEventListener("click", e => {
      // a fact tick's 'Work it out' (Situation: 'At ideal range'): back to what the bench works out; focus goes to the tick
      const cl = e.target.dataset && e.target.dataset.sitclr;
      if (cl) {
        const s = S[id]; if (s.sit) delete s.sit[cl]; update();
        try { const t = side.querySelector(`[data-sit="${cl}"]`); if (t && !t.disabled) t.focus({ preventScroll: true }); } catch (x) { }
        return;
      }
      const d = e.target.dataset.accdel; if (!d) return; const s = S[id], [slot, i] = d.split(":");
      if (s.w[slot] && s.w[slot].comps[+i]) { s.w[slot].comps.splice(+i, 1); reR(); }
    });
    side.addEventListener("change", e => {
      const s = S[id];
      const sc = e.target.dataset.sect; if (sc) { const [sec, i] = sc.split(":"); s.sect[sec][+i] = e.target.checked; update(); }
      const tg = e.target.dataset.tog; if (tg) { for (const k of tickKeys(s, tg)) s.tog[k] = e.target.checked; update(); }
      const sk = e.target.dataset.sit; if (sk) { setSit(s, sk, e.target); update(); }
      const ov = e.target.dataset.ovr; if (ov != null) { setOvr(s, ov, e.target.value); update(); }      // a row's auto / on / off
    });
  }
  // no stacks box on the rows: a stacking buff's level is typed under Situation > Your buffs (data-sit "mode:<key>")
  for (const [k] of EXTRA_FIELDS) on(`${id}-x-${k}`, "input", e => { s.extra[k] = +e.target.value || 0; updateSoon(); });
  on(`${id}-x-gusty`, "change", e => { s.extra.gusty = e.target.value; update(); });
  on(`${id}-x-purs`, "change", e => { s.extra.purs = e.target.value; update(); });
  on(id + "-save", "click", () => saveLoadout(id));
  on(id + "-load", "click", () => loadLoadout(id));
  on(id + "-del", "click", () => deleteLoadout(id));
  on(id + "-exp", "click", () => ioBox(id, "export"));
  on(id + "-imp", "click", () => ioBox(id, "import"));
}

/* ------------------------------------------------------------------ rendering: the Situation panel */
function setSit(s, key, el) {
  const u = s.sit || (s.sit = {});
  let val = el.type === "checkbox" ? el.checked : el.tagName === "SELECT" ? el.value : el.value === "" ? undefined : +el.value;
  // held to the box's bounds; a box whose shown minimum comes from other boxes or rows (data-lo: its own floor) keeps what you typed down to
  // that floor: the readers take the larger of the two, and the raised value is never written back
  const lo = el.dataset && el.dataset.lo != null && el.dataset.lo !== "" ? el.dataset.lo : el.min;
  const hi = el.dataset && el.dataset.hi != null && el.dataset.hi !== "" ? el.dataset.hi : el.max;
  // a count is a whole number: 1.5 buffs or 2.5 enemies can't happen; only a percentage box keeps a fraction
  if (typeof val === "number" && key !== "st:dtd") val = Math.round(val);
  if (typeof val === "number") { if (lo != null && lo !== "" && val < +lo) val = +lo; if (hi != null && hi !== "" && val > +hi) val = +hi; }
  if (key === "ohp") { s.extra.ohp = val >= 1 && val <= 100 ? Math.round(val) : 100; return; }
  if (key === "pvT") { s.extra.pvT = val; return; }
  if (key === "bkr") { if (val) delete u.bkr; else u.bkr = false; return; }      // ticked is the default: only an untick is stored
  if (key.startsWith("tTgt.") || key.startsWith("tYou.")) {
    // the one store: a new terrain under the target starts as an ally's, under you as yours; no copy in s.extra
    const [w, f] = key.split(".");
    u[w] = { ...(u[w] || { cat: "none", by: w === "tTgt" ? "ally" : "you" }), [f]: val };
    return;
  }
  const m = key.match(/^(eN|eSq|aN|aSq|aT|st|mode):(.+)$/), mt = key.match(/^eT:(m|c):(\d+)$/);
  if (mt) { ((u.eT ||= {})[mt[1]] ||= {})[mt[2]] = val; return; }
  if (m) { (u[m[1]] ||= {})[m[2]] = val; return; }
  u[key] = val;
}
const shortList = L => L.length <= 3 ? L.join(", ") : L.slice(0, 3).join(", ") + ` and ${L.length - 3} more`;
/* a level input's name: the buff's own; when the game names the buff by its effect text (Tiphys's 'DMG Dealt +5%.', Shawnee's 'DMG
   Taken +5%, up to 6 stacks.') the row that gives it goes first ('Revitalize: DMG Dealt +5%') */
const lvName = (n, row) => {
  const t = String(n || "").replace(/,? up to \d+ stacks?\.?$/i, "").replace(/[.\s]+$/, "");
  return /%|\+\d/.test(t) && row ? `${row}: ${t}` : t;
};
/* the setup's level inputs (Situation > Your buffs / Your debuffs on the target), one per key the attack reads: name, value, start, floor,
   cap, the rows that give it and what reads it; 'given': no input, the row of this setup that gives the buff decides it */
// the rows a buff given by a row of this setup follows, each with how it is decided: its tick (a Code row, a check you decide) or its
// conditions (on / off)
const giveWords = by => by.map(x => ({ name: x.lab.replace(/( \([^()]*\))?, granted by .*$/, ""), st: x.fo ? "forced " + x.fo : x.code ? (x.v === 1 ? "ticked" : "not ticked") : x.v === 1 ? "on" : x.v === 0 ? "off" : "tick it if met" }));
function lvEntries(R) {
  const S = R.sit, s = R.s, L = LVS.get(s), out = [], short = rowShort, U = unbFam();
  if (!L || !S) return out;
  const atks = Object.values(((D.skills[s.atk.skill] || {}).atk) || {});
  for (const [uk, users] of S.use) {
    if (!uk.startsWith("mode:")) continue;
    const k = uk.slice(5), tgt = k.startsWith("t:"), K0 = L.keys.get(k), li = (S.lvlInfo || {})[k];
    // no row of this setup can give it in this attack: an input only while a check or a skill version reads it (the target's
    // Instability count, read by Seize Advantage, with Frida's Secret Execution not applying to a Buckler attack)
    if (K0 && K0.fail && !users.size) continue;
    const K = K0 && !K0.fail ? K0 : null;
    const b = K0 ? K0.b : li && li.b != null ? li.b : k === "euph" ? [...EUPH()][0] : +k.replace(/^t:/, "");
    const c0 = modeInfo(s)[b];
    const name = k === "euph" ? "Euphoria" : famName(k) || (K0 ? lvName(K0.e.n, K0.rows.length ? short(K0.rows[0]) : "") : lvName((c0 && c0.n) || (li && li.n) || b, ""));
    const vs = atks.flatMap(a => a.var || []).filter(v => (v.cc || []).some(x => x.b === b)).map(v => v.vn).filter((v, j, A) => v && A.indexOf(v) === j);
    const rd = li ? [...li.rd] : [...users].filter(n => !vs.includes(n));
    const gv = !L.def.has(k) && L.give && (L.give.get(b) === 0 || L.give.get(b) === 1);
    if (gv) {
      const by = (L.giveBy && L.giveBy.get(b)) || [], gw = giveWords(by);
      out.push({ k, tgt, b, name, given: true, val: L.give.get(b), ticked: by.some(x => x.v === 1), givers: gw.map(x => x.name), by: gw, vs }); continue;
    }
    const cap = L.cap.has(k) ? L.cap.get(k) : Math.max(li ? li.max || 1 : 1, c0 ? lvMax(R.ctx, b, c0.max || 1) : 1, k === "euph" ? S.euphCap || 5 : 1, famCap(k));
    const min = L.min.get(k) || 0, typed = lvTyped(s, k);
    const def = L.def.has(k) ? L.def.get(k) : li && li.sc && li.def != null ? li.def : k === "euph" ? 0 : L.start.has(b) ? L.start.get(b) : R.ctx.own.has(b) ? 1 : 0;
    const defBy = K && K.giv.length ? K.giv : L.lvBy && L.lvBy.has(b) ? L.lvBy.get(b) : [];
    // the rows that give it again at the start of each of your turns (Dawn's Bloom: 1 Fury), and a floor from them (mcFloor)
    const eaM = !tgt && L.lvEa && L.lvEa.get(b), ea = eaM ? [...eaM].map(([lab, v]) => ({ lab, v })) : [], fl = L.minEa && L.minEa.get(k);
    out.push({
      k, tgt, b, name, given: false, val: typed != null ? clampN(typed, min, cap) : def, typed, def, defBy, min, minBy: fl ? fl.by : K ? K.minBy : [], minEa: !!fl, cap, vs,
      giv: K ? K.rows.map(short) : [], rd, stk: !!K0 || famCap(k) > 1, kind: li && li.kind, unb: !!U && k === U.k, own: !!K, ea
    });
  }
  return out.sort((x, y) => (x.tgt - y.tgt) || x.name.localeCompare(y.name));
}
const ST_IN = {
  stealth: ["You are in Stealth"], shortc: ["The target carries Short Circuit (from an earlier attack)"],
  pushb: ["The target can't be knocked back: the tile behind it is blocked (a unit, the map's edge, a tile it can't stand on)"], asuka: ["Asuka (EVA-02) is deployed on your team"], rei: ["Rei (EVA-00) is deployed on your team"],
  reload: ["One of your other weapons is reloading"], scarsT: ["Scars on the target", 5], scarsAll: ["Scars on all enemies", 20],
  crash: ["Enemies holding Crash in that area", 9], intim: ["Enemies holding Intimidation in that area", 9], timid: ["Enemies with Timidity right next to you", 8],
  maglock: ["Enemies under Magnetic Lock", 9], appointed: ["Allies with Appointed", 3], dtd: ["Your DMG taken down from elsewhere (%)", 100], field: ["Your units on your Defense Field", 9]
};
// Euphoria's count is under Your buffs with the other stacking buffs; its store is s.sit.st.euph
function renderSit(id, R) {
  const el = $(id + "-sit"), sum = $(id + "-sitsum");
  if (!el) return;
  if (!R) { el.innerHTML = ""; if (sum) sum.textContent = ""; return; }
  const S = R.sit, s = R.s, use = S.use, has = k => use.has(k);
  const by = k => use.has(k) ? `read by ${esc(shortList([...use.get(k)]))}` : "";
  // (lo: the box's own floor when its shown minimum a is raised by other boxes or rows; setSit keeps what you typed down to it)
  // (hi: the box's own cap when its shown maximum comes from another box, Fury stacks spent <= Fury stacks: what you type is kept up
  // to it, so the order you type the two in doesn't matter; the readers take the smaller)
  const numI = (k, lbl, v, a, b, note, dis, lo, hi) => `<label class="f"><span class="lbl">${lbl}</span><input type="number" data-sit="${k}" min="${a}" max="${b}" step="1" value="${v}"${lo != null ? ` data-lo="${lo}"` : ""}${hi != null ? ` data-hi="${hi}"` : ""}${dis ? " disabled" : ""}>${note ? `<span class="desc">${note}</span>` : ""}</label>`;
  const chk = (k, lbl, v, note) => `<label><input type="checkbox" data-sit="${k}" ${v ? "checked" : ""}> ${lbl}${note ? ` <span class="meta">${note}</span>` : ""}</label>`;
  const selI = (k, lbl, opts, cur, note) => `<label class="f"><span class="lbl">${lbl}</span><select data-sit="${k}">${opts.map(([v, l]) => opt(v, l, String(v) === String(cur))).join("")}</select>${note ? `<span class="desc">${note}</span>` : ""}</label>`;
  const grid = [], checks = [], notes = [];
  if (S.locked) notes.push(R.ctx.counter ? "A counter attack, made on the enemy's turn: no movement and no Re-ATK." : "A link attack, joining an ally's attack: no movement and no Re-ATK.");
  else if (has("reatk")) {
    checks.push(chk("reatk", "This attack is a Re-ATK (an extra action this turn)", S.reatk, R.rk.length ? `this setup can grant one: ${esc(shortList(R.rk))}` : "nothing in this setup grants one; an ally's skill can"));
    if (S.reatk && has("reSame")) checks.push(chk("reSame", "made with the skill that granted it", S.reSame));
  }
  // the ideal range as the bench works it out, one interval per weapon type that counts: KALAVINKA adds the other hand's
  const ivW = S.idealHas ? `ideal range ${(S.idealIv || [S.ideal]).map(([a, b]) => `${a}–${b}`).join(" or ")}` : "this weapon has no ideal range in this setup";
  const dNote = `attack range ${S.minR}–${S.maxR}${S.sq === 1 ? " (diagonal steps count 1)" : S.sq === 2 ? " (straight or diagonal lines)" : S.sq === 3 ? " (diagonals only)" : ""}${S.rangeExt ? ` (+${S.rangeExt} from your setup)` : ""}; ${S.idealHas ? `${ivW}${S.inIdeal ? " (in it)" : ""}${S.foot ? "; any tile of this boss counts" : ""}` : ivW}`;
  // shown too while only 'At ideal range' reads it: with that tick set by you, the distance decides nothing about it
  const dIdl = has("ideal") && S.idealSet && !has("dist") ? "“At ideal range” is set by you, so the distance doesn't decide it" : "";
  if (has("dist") || has("ideal") || S.sq) grid.push(numI("dist", "Distance to the target (tiles)", S.dist, S.minR, S.maxD, dNote + (has("dist") ? `<br>${by("dist")}` : dIdl ? `<br>${dIdl}` : "")));
  if (has("dir") || S.sq) grid.push(selI("dir", "Direction to the target", [["line", "In a straight line"], ["diag", "Diagonal"], ["other", "Off the lines (e.g. 2 across, 1 up)"]]
    .filter(([d]) => S.okDir(S.dist, d)), S.dir, `diagonal steps count as 1 for square areas${has("dir") ? "; " + by("dir") : ""}`));
  if (has("anc") && S.foot) grid.push(numI("anc", "Extra tiles to the target's centre tile", S.anc, 0, S.foot, `this boss covers several tiles; per-tile effects measure to its anchor tile; ${by("anc")}`));
  /* 'At ideal range' is one tick, read by every row that needs it (they can't disagree). Unset, it follows the
     distance; ticked or unticked by you, it wins over the distance, and a note says when the distance gives the other answer.
     'Work it out' clears it. Stored per side with the distance: kept when the distance changes */
  if (has("ideal")) {
    const tl = `${S.dist} tile${S.dist === 1 ? "" : "s"}`, inW = S.inIdeal ? "at ideal range" : "not at ideal range";
    const work = S.idealHas ? `${tl} is ${S.inIdeal ? "inside" : "outside"} the ${ivW}${S.foot ? " (any tile of this boss counts)" : ""}` : ivW;
    const clr = `<button type="button" class="lnk" data-sitclr="ideal">Work it out</button>`;
    const note = !S.idealSet ? `worked out from the distance: ${work}; tick or untick it to set it yourself`
      : S.idealOn === S.inIdeal ? `set by you (the bench works out the same: ${work}); kept when you change the distance · ${clr}`
        : `<span class="warnline">set by you; at ${tl} the bench works out: ${inW} (${ivW})</span> · ${clr}`;
    grid.push(`<div class="f fact"><span class="lbl">Ideal range</span><label class="ftick"><input type="checkbox" data-sit="ideal"${S.idealOn ? " checked" : ""}> At ideal range</label><span class="desc">${note}<br>${by("ideal")}</span></div>`);
  }
  // shown only with both a hand weapon and a backpack weapon carried; the bench doesn't check the backpack weapon's reach
  if (has("bkr")) checks.push(chk("bkr", "The target is in range of both your hand weapon and your backpack weapon", S.bkr, `ticked unless you untick it: the bench doesn't check your backpack weapon's range; ${by("bkr")}`));
  // the game counts the path walked (MoveDistance.GetMoveDistance path-finds from the start tile, around units), not the
  // straight distance
  if (has("moved")) grid.push(numI("moved", "Tiles moved before attacking", S.moved, 0, Math.floor(S.mov), `movement ${fmt(S.mov, S.mov % 1 ? 1 : 0)} tiles; count the tiles of the path you walk (around units), not the straight distance${S.locked ? "; not your own move" : ""}<br>${by("moved")}`, S.locked));
  if (has("thru") && S.moved >= 1) checks.push(chk("thru", "You moved through the target's tile", S.thru));
  if (has("apc") && S.apL != null) grid.push(numI("apc", "AP cost of this attack", S.skAp, 0, S.apMax, `the skill lists ${S.apL} AP; type the cost after any change the bench doesn't work out${R.apc && R.apc.length ? ` (in this setup: ${esc(shortList(R.apc))})` : ""}${S.fury ? "; each Fury stack spent adds 1 on top" : ""}<br>${by("apc")}`));
  const apS = (R.rows || []).filter(r => r.effs.some(x => x.e.f === "apmax") && rowAnyOk(r)).map(r => r.src.label.replace(/^[^:]+: /, ""));
  if (has("ap") || S.A.mc) grid.push(numI("ap", "AP before the attack", S.ap, Math.min(S.skAp, S.apMax), S.apMax, `max AP ${S.apMax}${apS.length ? ` (raised by ${esc(shortList(apS))})` : ""}; empty: max AP − 2; this attack costs ${S.apCost}${S.A.mc ? `; it also limits the ${mcName(S.A.mc[0])} stacks you can spend` : ""}<br>${by("ap")}`));
  if (has("turn")) grid.push(numI("turn", "Battle turn", S.turn, 1, 99, by("turn")));
  // at most the Fury you hold, its one input under Your buffs; the attack's rounds read the Fury held, its follow-ups
  // what is left
  if (S.A.mc) {
    const fn = mcName(S.A.mc[0]), lim = [S.furyHeld < S.A.mc[1] ? `you hold ${S.furyHeld} (${fn} stacks, under Your buffs)` : "",
    S.furyAp < S.A.mc[1] ? ((s.sit || {}).ap != null && (s.sit || {}).ap !== "" ? `AP before the attack ${S.ap}` : `max AP ${S.apMax}`) : ""].filter(Boolean);
    grid.push(numI("fury", `${fn} stacks spent`, S.fury, 0, S.furyMax, `each stack: +40% shots and +1 AP${S.furyMax < S.A.mc[1] ? `; at most ${S.furyMax}: ${lim.join(", ")}` : ""}; this attack's rounds read the ${fn} you hold, Gusty and Flurry Strike after it what is left`,
      false, null, Math.max(0, Math.min(S.A.mc[1], S.furyAp))));
  }
  if (has("ammo") && S.ammoMax) grid.push(numI("ammo", "Rounds in the magazine before firing", S.ammo, 1, S.ammoMax, `magazine ${S.ammoMax}; ${by("ammo")}`));
  // the attack's structure: how many lock-ons / duel rounds / missiles land on this target, and the mode a skill variant reads
  const sx = (R.struct && R.struct.info) || {};
  if (has("locks") && sx.locks) grid.push(numI("locks", "Lock-ons on this target", sx.locks.k, 1, sx.locks.max, sx.locks.max > 1
    ? `${sx.locks.max} lock-ons in all; the rest go to other units (counted as placed after this target's)${sx.locks.add ? `; each repeat on this target: SkillM ${sx.locks.add < 0 ? "−" : "+"} ${Math.abs(sx.locks.add).toFixed(2)}` : ""}` : "this skill can't lock the same target twice"));
  if (has("duel") && sx.duel) grid.push(numI("duel", "Duel rounds", sx.duel.k, 1, sx.duel.max, `up to ${sx.duel.max}; the duel ends early when you can't attack or the target can't retaliate (start: ${S.canCounter ? "all rounds, it can retaliate" : "1 round, it can't retaliate"})`));
  if (has("bomb") && sx.bomb) grid.push(numI("bomb", "Missiles on this target", sx.bomb.n, 1, R.plan.st.max, "one per target you pick, up to the skill's maximum"));
  // the levels of your buffs (stacks, a level a check reads, the buff a skill version reads) and of the stacking debuffs your kit
  // puts on the target: ONE input each, here; every row that shows one says 'Vigor x8 (set under Situation)'. A buff a row of this setup
  // gives (its Code row's tick: Directional Rack) is shown read-only, pointing at that row
  const lvB = { you: [[], []], target: [[], []] }, lvRO = [];
  for (const x of lvEntries(R)) {
    if (x.given) { lvRO.push(`<div class="meta">${esc(x.name)}: <b>${x.val ? "on" : "off"}</b> (set under Bonuses &amp; buffs by ${esc(x.by.map(g => `${g.name} (${g.st})`).join(" or "))})${x.vs.length ? `; decides which version casts: ${esc(x.vs.join(" / "))}` : ""}</div>`); continue; }
    // the target's Instability: one count, yours and other units'; its hit cut is counted from it (not again in the target's boxes)
    const UF = x.unb ? unbFam() : null, cut = UF && UF.per ? `counts as Unbalanced and Weak, and its hit cut (target hit reduction −${pct(-UF.per, 0)} per stack) is counted from it: don't add it under the target's Other buffs on it` : "";
    // a checkbox (on / off) can't be cleared back to empty: its note gives the start, not 'clear the box'
    // the start is the one at your first attack, turn 1; a gain at the start of each of your turns says a later turn can hold more
    const t1 = x.ea.length || x.defBy.length ? " at your first attack (turn 1)" : "";
    const startW = x.cap <= 1 ? `your setup's start: ${x.def ? "on" : "off"}${x.defBy.length ? ` (${esc(shortList(x.defBy))})` : ""}`
      : x.typed != null ? `clear the box for your setup's start (${x.def}${t1 ? ", at your first attack, turn 1" : ""})` : `empty: your setup's start${t1}, ${x.def}${x.defBy.length ? ` (${esc(shortList(x.defBy))})` : ""}`;
    const eaN = x.ea.reduce((a, y) => a + y.v, 0), eaW = x.ea.length && x.cap > 1 && x.def < x.cap ? `${esc(shortList(x.ea.map(y => y.lab)))} ${x.ea.length === 1 ? "adds" : "add"} ${eaN} at the start of each of your turns, up to ${x.cap}: type ${x.cap > eaN + 1 ? "the count" : x.cap} for an attack on a later turn` : "";
    const minW = x.min > 0 ? (x.minEa ? `at least ${x.min} on your own attack: ${esc(shortList(x.minBy))} ${x.minBy.length === 1 ? "gives" : "give"} it at the start of each of your turns (0 only on a Re-ATK, a counter or a link attack)`
      : `at least ${x.min}: ${esc(shortList(x.minBy))} ${x.minBy.length === 1 ? "gives" : "give"} it in this attack`) : "";
    const note = [UF ? (x.own ? "the target's one Instability count, yours and other units'" : "other units' Instability: no row of yours gives it in this attack") : "",
    x.vs.length ? `decides which version casts: ${esc(x.vs.join(" / "))}` : "", x.giv.length ? `given by ${esc(shortList(x.giv))}` : "",
    x.rd.length ? `read by ${esc(shortList(x.rd))}` : "", cut, minW, startW, eaW].filter(Boolean).join("; ");
    const B = lvB[x.tgt ? "target" : "you"], dk = x.k === "euph" ? "st:euph" : "mode:" + x.k;
    // (other units' Instability alone isn't one of your debuffs: it sits with the other facts about the target)
    if (UF && !x.own) { grid.push(numI(dk, `${esc(x.name)} stacks on the target`, x.val, x.min, x.cap, note)); continue; }
    if (x.cap <= 1) B[0].push(chk(dk, `${esc(x.name)} is on${x.tgt ? " (on the target)" : ""}`, x.val >= 1, note));
    else B[1].push(numI(dk, `${esc(x.name)} ${x.stk || x.kind ? "stacks" : "level"}${x.tgt ? " on the target" : ""}`, x.val, x.min, x.cap, note));
  }
  if (R.tkm != null) checks.push(chk("tkm", "The target is also in the line the Tokamak Sphere redirects to", !!S.u.tkm, "each hit that passes the sphere deals 0.6× its damage again in the new direction; off: the target isn't in it"));
  if (has("area")) grid.push(numI("area", "Units the attack covers (incl. the target)", S.area, 1, 20, `${S.A.aoe === 1 ? "an area attack" : "the target plus any splash targets"}; ${by("area")}`));
  if (has("aoeD")) grid.push(numI("aoeD", "Tiles from the area's centre to the target", S.aoeD, 0, 6, by("aoeD")));
  // units around
  // each box shows the count as read: the larger of what you typed and the boxes nested in it, which is also its minimum
  const C = S.cnt, tl = n => `tile${+n === 1 ? "" : "s"}`, cntLbl = k => {
    const [a, b, c] = k.split(":");
    return a === "eN" ? `Other enemies within ${b} ${tl(b)} of you` : a === "eSq" ? `Other enemies in the ${2 * b + 1}×${2 * b + 1} square around you` : a === "eAll" ? "Other enemies on the map"
      : a === "aN" ? `Other allies within ${b} ${tl(b)} of you` : a === "aSq" ? `Other allies in the ${2 * b + 1}×${2 * b + 1} square around you` : a === "aAll" ? "Other allies still standing (anywhere)"
        : a === "eT" ? `Other enemies within ${c} ${tl(c)} of the target${b === "c" ? " (diagonals count)" : ""}` : a === "aT" ? `Your other allies within ${b} ${tl(b)} of the target`
          : k === "inRng" ? "Enemies inside your weapon's normal-attack range (incl. the target)" : k === "st:asuka" ? "Asuka / Rei deployed" : a === "st" && ST_IN[b] ? ST_IN[b][0] : k;
  };
  const isCnt = k => /^(eN|eSq|aN|aSq|aT):|^eT:|^eAll$|^aAll$/.test(k);
  // (Scars on all enemies counts the target while it carries Scars: from your rows, or from Scars on the target typed here)
  const scRows = scarsAllOf({ ...S, st: { ...S.st, scarsAll: 0, scarsT: 0 } }, R.held) > 0, scBox = !scRows && S.st.scarsT > 0;
  const minOf = k => k === "st:scarsAll" ? { n: scRows || scBox ? 1 : 0, k: scBox ? "st:scarsT" : null } : k.startsWith("st:") ? { n: 0, k: null } : C.min(k);
  // the boxes shown: those this attack reads, and every box one of them names as its minimum (a count typed on another attack's Situation
  // still raises these: shown here too, so it can be lowered here). The normal attack's range covering a whole area: that area's box is the
  // input (shown whenever the range count is read), the range count is read-only
  const inRO = has("inRng") && C.ringK, vis = new Set([...use.keys()].filter(k => isCnt(k) || k.startsWith("st:"))), raises = new Map();
  if (has("inRng")) vis.add(C.ringK || "inRng");
  for (let go = true; go;) {
    go = false;
    for (const k of [...vis]) {
      const m = minOf(k);
      if (m.k && m.n > (k === "inRng" ? 1 : 0)) for (const x of m.k === "st:asuka" ? ["st:asuka", "st:rei"] : [m.k]) if (!vis.has(x)) { vis.add(x); raises.set(x, k); go = true; }
    }
  }
  const raisesW = k => raises.has(k) ? `this attack doesn't read it: it is here because it raises “${esc(cntLbl(raises.get(k)))}”` : "";
  const cntBox = (k, mx, note) => {
    const m = C.min(k), lo = Math.min(mx, m.n), v = Math.min(mx, C.val(k)), d0 = k === "inRng" ? 1 : 0;
    const at = lo > d0 && m.k ? `at least ${lo} from “${esc(m.k === "inRng" ? "Enemies inside your weapon's normal-attack range" : cntLbl(m.k))}”` : "";
    grid.push(numI(k, cntLbl(k), v, Math.max(d0, lo), mx, [note, at, raisesW(k), by(k)].filter(Boolean).join("; "), false, d0));
  };
  const ring = r => 2 * r * (r + 1), sqr = r => (2 * r + 1) ** 2 - 1;              // tiles within r (Manhattan) / in the square, yours excluded
  for (const k of [...vis].filter(isCnt).sort()) {
    const [a, b, c] = k.split(":");
    const tgtNote = r => `the target (${S.dist} ${tl(S.dist)} away) ${S.dist <= r ? "counts as well" : "is farther"}`;
    const rgW = inRO && k === C.ringK ? `your normal attack covers this whole area: with the target, this is also “Enemies inside your weapon's normal-attack range”` : "";
    if (a === "eN") cntBox(k, ring(+b) - (S.dist <= +b ? 1 : 0), [tgtNote(+b), rgW].filter(Boolean).join("; "));
    else if (a === "eSq") cntBox(k, sqr(+b) - (S.cheb <= +b ? 1 : 0), ["diagonals count", rgW].filter(Boolean).join("; "));
    else if (a === "aN") cntBox(k, Math.min(9, ring(+b)), "");
    else if (a === "aSq") cntBox(k, Math.min(9, sqr(+b)), "");
    else if (a === "aT") cntBox(k, 9, "");
    else if (a === "eT") cntBox(k, 20, "");
    else if (a === "eAll") cntBox(k, 30, "");
    else if (a === "aAll") cntBox(k, 9, "not counting you");
  }
  if (has("link")) grid.push(numI("link", "Allies joining with a link attack", S.link, 0, 3, by("link")));
  // (one input: read-only here, from its area's box; data-sitro, not data-sit: nothing is stored from it)
  if (inRO) grid.push(`<label class="f"><span class="lbl">${cntLbl("inRng")}</span><input type="number" data-sitro="inRng" value="${S.inRng}" disabled><span class="desc">${[
    `the target plus “${esc(cntLbl(C.ringK))}” (set there: your normal attack covers that whole area)`, by("inRng")].filter(Boolean).join("; ")}</span></label>`);
  else if (vis.has("inRng")) cntBox("inRng", 20, "");
  if (has("bufE")) {
    const own = catCount({ ...S, bufE: 0, st: { ...S.st, stealth: false } }, R.held, "you", ["Enhance"], false);
    grid.push(numI("bufE", "Other buffs on you (allies, the stage)", S.bufE, 0, 30, `the bench already counts ${own} from this setup; how many, not their values (those go in Extra bonuses); ${by("bufE")}`));
  }
  if (has("debW")) {
    const own = catCount({ ...S, debW: 0, st: { ...S.st, scarsT: 0 } }, R.held, "target", ["Weak"], false), ins = catCount({ ...S, debW: 0 }, R.held, "target", ["Unbalanced"], false);
    grid.push(numI("debW", "Other debuffs on the target", S.debW, 0, 30, `the bench already counts ${own}${ins ? `, Instability ×${ins} among them (set under Situation: Instability stacks on the target)` : " from this setup"}; how many, not their values (those go in the target's Other buffs on it); ${by("debW")}`));
  }
  // (Scars on the target, Short Circuit, Stealth: what this setup already gives is counted from its rows; the box adds other units' / earlier
  // attacks' (a count) or says it is there (yes / no, counted once))
  const ownC = { scarsT: ["target", "BattleDamage"], shortc: ["target", "ShortCircuit"], stealth: ["you", "Invisible"] };
  for (const [k, [lbl, mx]] of Object.entries(ST_IN)) if (vis.has("st:" + k)) {
    const oc = ownC[k], own = oc ? (R.held || []).filter(h => h.side === oc[0] && h.cats.includes(oc[1])).reduce((a, h) => a + (mx == null ? 1 : h.n), 0) : 0;
    const nt = [own ? (mx == null ? "your setup already gives it (counted once)" : `the bench already counts ${own} from this setup; add other units'`) : "", raisesW("st:" + k), by("st:" + k)].filter(Boolean).join("; ");
    // Scars on all enemies counts the target while it carries Scars; the box keeps what you typed, read as at least 1
    const lo = k === "scarsAll" ? minOf("st:scarsAll").n : 0;
    const nt2 = lo ? [nt, `at least 1: the target carries Scars${scBox ? " (from “Scars on the target”)" : " (from your setup)"}`].filter(Boolean).join("; ") : nt;
    if (mx == null) checks.push(chk("st:" + k, lbl, S.st[k], nt)); else grid.push(numI("st:" + k, lbl, Math.max(lo, S.st[k]), lo, mx, nt2, false, k === "scarsAll" ? 0 : null));
  }
  if (!R.s._xatk && pvBase(R.s, R)) grid.push(selI("pvT", "Peripheral Vision round", [["auto", `Work it out (${S.inRng > 1 ? "another enemy" : "this target"}: ${S.inRng} in range)`], ["yes", "Comes back to this target"],
  ["line", "Goes to another enemy, its line still crosses this target"], ["no", "Goes to another enemy, missing this target"]], pvMode(s),
    "it fires at a random enemy the other Flamethrower can reach that this attack didn't hit; it comes back to this target only when there is none. Its flame line can still cross this target on the way"));
  // follow-ups: whether a once-per-turn Flurry Strike is still there, the arm that fires it, a part destroyed by this attack
  const PU = R.purs, oncers = PU ? [...new Set([...PU.list, ...PU.skip].filter(x => (D.purs[x.b] || {}).once).map(x => x.name))] : [];
  if (oncers.length) checks.push(chk("pursUsed", "A once-per-turn Flurry Strike was already used this turn", PU.usedTurn, `${esc(shortList(oncers))}; start: no${S.reatk ? " (tick it when this Re-ATK follows one that fired)" : ""}`));
  if (PU && PU.post && PU.ctr && (PU.list.length || PU.skip.length)) checks.push(chk("armOK", "The firing arm survives the target's retaliation", PU.armOK, "Flurry Strike comes after the retaliation and needs the arm that fires it"));
  const hpCost = R.ctx.A && R.ctx.A.mhp && !s._xatk && !s._part ? R.ctx.A.mhp : 0;
  if (PU && PU.post && PU.ctr && has("ohp")) grid.push(numI("ohpPost", "Your HP % after the target's retaliation", PU.ohp1 != null ? PU.ohp1 : clampN(Math.round(R.ctx.ohp), 1, 100), 1, 100,
    `Flurry Strike comes after it: its own-HP conditions read this; start: ${hpCost ? `your HP during the attack, after ${esc(R.sk.n)}'s own cost` : "as before the attack"}`));
  const brk = [...new Set([...(R.segs && R.segs.GB && R.segs.GB.broke ? [...((PU && PU.list) || []), ...((R.after && R.after.list) || [])].filter(x => x.gate === "broke" || x.gate === "noBroke").map(x => x.name) : []),
  ...(R.afxL || []).filter(x => x.brk).map(x => x.n || "Fixed DMG")])];
  if (brk.length) checks.push(chk("broke", "This attack destroys a part", !!S.u.broke, `read by ${esc(shortList(brk))}; in Attacks to kill each fight decides it`));
  if (has("xhp")) checks.push(chk("xhp", "You have temporary HP (a shield)", S.xhp, by("xhp")));
  if (has("last")) checks.push(chk("last", "Your previous single-target attack was on this target", S.last, by("last")));
  // the option stays short, so a closed select shows it; the reason and where it is set go in the note under it
  // 'Yes' only while the 'no' comes from the distance alone: a range bonus the bench can't see
  if (has("ctr")) grid.push(selI("ctr", "Can the target retaliate?", [["auto", `Work it out: ${S.ctrAuto ? "yes" : "no"}`], ...(S.ctrYesOK ? [["yes", "Yes: a range bonus lets it reach you"]] : []), ["no", "No"]], S.ctrMode,
    `${S.ctrMode === "auto" ? `worked out: ${esc(S.ctrWhy)}. ` : ""}From its counter weapons' reach, the parts ticked under Already destroyed and the weapons it carries (target panel), and this attack${S.ctrYesOK ? "; Yes: only for a range bonus from its allies or the stage that the bench doesn't show" : ""}; ${by("ctr")}`));
  // terrain and your HP: always
  const TCAT = [["none", "None"], ["flame", "Burning"], ["domain", "Domain"], ["guard", "Guard"], ["other", "Other terrain effect"]], TBY = [["you", "you"], ["ally", "an ally"], ["enemy", "the enemy"], ["map", "the map"]];
  grid.push(selI("tTgt.cat", "Terrain under the target", TCAT, S.tTgt.cat, S.tTgt.cat === "flame" ? "adds the Burning tick" + (has("tTgt") ? "; " + by("tTgt") : "") : has("tTgt") ? by("tTgt") : ""));
  if (S.tTgt.cat !== "none") grid.push(selI("tTgt.by", "…made by", TBY, S.tTgt.by, S.tTgt.cat === "flame" ? "yours: the tick takes your Fixed DMG %" : ""));
  if (has("tYou") || S.tYou.cat !== "none") {
    grid.push(selI("tYou.cat", "Terrain under you", TCAT, S.tYou.cat, by("tYou")));
    if (S.tYou.cat !== "none") grid.push(selI("tYou.by", "…made by", TBY, S.tYou.by));
  }
  // the box is your HP before the attack; an attack with an HP cost of its own (Twin-Blade Saw) is read at the HP it leaves,
  // shown here, not an input of its own
  grid.push(numI("ohp", hpCost ? "Your HP % before the attack (all four parts)" : "Your HP % (all four parts)", ohpIn(s), 1, 100,
    [hpCost ? `after ${esc(R.sk.n)}'s own cost (${pct(hpCost, 0)} of each part's max HP): ${R.ctx.ohp < 0.5 ? "under 1% (each part keeps 1 HP)" : fmt(R.ctx.ohp) + "%"}, the HP this attack reads` : "", has("ohp") ? by("ohp") : "decides “Own HP” bonuses"].filter(Boolean).join("; ")));
  // (a block's title is a sub-heading, not a field label: its own style, with a rule above it)
  const lvBlk = (title, [ch, gr], extra) => ch.length || gr.length || extra.length ? `<div class="blkh">${title}</div>${extra.join("")}${ch.length ? `<div class="checks fxchecks">${ch.join("")}</div>` : ""}${gr.length ? `<div class="grid sitgrid">${gr.join("")}</div>` : ""}` : "";
  el.innerHTML = `${notes.map(n => `<div class="meta">${n}</div>`).join("")}${checks.length ? `<div class="checks fxchecks">${checks.join("")}</div>` : ""}<div class="grid sitgrid">${grid.join("")}</div>
  ${lvBlk("Your buffs", lvB.you, lvRO)}${lvBlk("Your debuffs on the target", lvB.target, [])}
  <div class="meta">Only what this setup and attack depend on is listed; each box is limited to what the game allows. Defaults: a plain first attack on your turn, standing still, at ideal range (else your longest reach), nothing extra carried, full magazine; a buff's stacks start at what your setup gives by your first attack (turn 1)${has("ideal") ? "; “At ideal range” follows the distance until you tick or untick it yourself" : ""}.</div>`;
  if (sum) sum.textContent = [S.locked ? (R.ctx.counter ? "counter" : "link attack") : S.reatk ? "Re-ATK" : "your turn", has("dist") || has("ideal") ? `${S.dist} tile${S.dist === 1 ? "" : "s"}${(has("ideal") ? S.idealOn : S.inIdeal) ? " (ideal)" : ""}` : "",
  has("moved") ? (S.moved ? `moved ${S.moved}` : "not moved") : "", has("ap") ? `AP ${S.ap}` : "", S.tTgt.cat === "flame" ? "target on Burning" : ""].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ rendering: results */
/* one effect with the same value on all four parts is said once ("Target armor % −16% (all parts)"). A list item
   is a string, or {t: its text with its part, part, all: its text for all four parts}; items merge only when all four parts give the same
   'all' text (the same value, conditions and marks: a ✕ on some parts only keeps every part), else each keeps its own part */
const fxT = y => typeof y === "string" ? y : y.t;
function partsOnce(L) {
  const by = new Map();
  for (const y of L) if (typeof y !== "string" && y.part) { if (!by.has(y.all)) by.set(y.all, new Set()); by.get(y.all).add(y.part); }
  const out = [], done = new Set();
  for (const y of L) {
    if (typeof y === "string" || !y.part) { out.push(fxT(y)); continue; }
    if (!PARTS.every(p => by.get(y.all).has(p))) { out.push(y.t); continue; }
    if (!done.has(y.all)) { done.add(y.all); out.push(y.all); }
  }
  return out;
}
// the target's per-hit words without their part (phWords: "Body DMG taken ...", "Its body takes ..."), for the "(all parts)" text
const pFree = w => String(w || "").replace(/^(?:Body|Left arm|Right arm|Legs) DMG taken/, "DMG taken").replace(/^Its (?:body|left arm|right arm|legs) takes/, "Takes");
function renderFx(id, R, O) {
  // rows with nothing for this attack's damage (all their effects 'no damage' notes: another action, AP or movement, the
  // enemy's turn, a link attack) are listed read-only in their own panel, "Not part of this attack", below Breakdown
  if (!R) { $(id + "-fx").innerHTML = ""; $(id + "-nd").innerHTML = ""; $(id + "-ndsum").textContent = ""; return; }
  const groups = {};
  for (const row of R.rows) if (!row.hide) (groups[row.src.group] ||= []).push(row);     // hidden: an 'earlier cast' row this attack doesn't need
  // a both-weapon attack: the other weapon's own built-ins, refits and drop ability (keyed by its slot) under that weapon's name
  const seenK = new Set(R.rows.map(r => r.src.key)), rowR = new Map();     // rowR: an other-weapon row -> the stream it is from
  for (const y of ((R.struct && R.struct.steps) || []).flatMap(x => x.streams).concat(R.avgR ? [{ R: R.avgR, slot: R.avgR.atkSlot }] : []))
    if (y.R && y.R !== R && y.slot !== R.atkSlot) for (const row of y.R.rows)
      if (/^[A-Z]{2}:(wfx|opt|drop)/.test(row.src.key) && !seenK.has(row.src.key)) { seenK.add(row.src.key); rowR.set(row, y.R); (groups[`Other weapon: ${y.R.W.n} (${SLOTW[y.slot] || y.slot})`] ||= []).push(row); }
  let h = "", hN = "", onN = 0, nN = 0;
  // a stacking buff's level is set under Situation (one input); here it is shown read-only. lvI: its name, level and whether typed
  const LE = new Map(lvEntries(R).map(x => [x.k, x])), LV = LVS.get(R.s);
  // (no input for it in this attack, no pointer: none of its rows can apply here, Frida's Secret Execution on a Buckler attack)
  const lvI = e => { const k = lvKE(e), x = LE.get(k); return { k, n: x ? x.name : famName(k) || (k === "euph" ? "Euphoria" : lvName(e.n, "")), tgt: !!e.tgt, lvl: lvOf(R.s, k), typed: lvTyped(R.s, k) != null, has: !!x }; };
  const lvSpan = i => i.has ? `<span class="stk" title="${i.tgt ? "Stacks on the target" : "Stacks"}: one level for the setup, typed under Situation (empty: your setup's start)">${esc(i.n)} ×${i.lvl}${i.tgt ? " on the target" : ""}</span> <span class="meta">(${i.typed ? "" : "your setup's start; "}set under Situation)</span>`
    : `<span class="stk">${esc(i.n)}${i.tgt ? " on the target" : ""}</span> <span class="meta">(doesn't apply in this attack)</span>`;
  // a check on a level: decided by that level (set under Situation) or by the row that gives the buff (its tick)
  const OPW = { ">=": "≥ ", ">": "> ", "<=": "≤ ", "<": "< ", "=": "= " };
  // plain words: a buff whose input is a tick (Valhalla's Call) reads 'on' / 'off', not the stored level '= 1'
  // (bare = no 'set under Situation' / 'from ...' part: a forced row's checks are taken as met, or none counts, so the level doesn't
  // decide them; a round's line names only the check)
  const bufTxt = (c, bare) => {
    const k = lvK(c.v, c.h === "target"), x0 = LE.get(k), inBox = !!(x0 && !x0.given && x0.cap <= 1), one = (c.max || 0) === 1;
    let t = c.bn && /^Buff \[/.test(c.text || "") ? `${c.bn} ${OPW[c.op] || c.op}${c.n}` : plainC(c.text);
    // (a one-level buff: 'held' / 'not held'; one whose input under Situation is a tick: 'on' / 'off', as that tick reads)
    if (t && CMP[c.op] && (inBox || one) && CMP[c.op](1, c.n) !== CMP[c.op](0, c.n))
      t = t.replace(/ (?:[≥≤<>=]|>=|<=) ?\d+$| held(?: at 1)?$| not held$/, ` ${inBox ? (CMP[c.op](1, c.n) ? "on" : "off") : CMP[c.op](1, c.n) ? "held" : "not held"}`);
    if (!LV || !t || bare) return t;
    if (!LV.def.has(k) && LV.give && (LV.give.get(c.v) === 0 || LV.give.get(c.v) === 1))
      return `${t} (from ${giveWords(LV.giveBy.get(c.v) || []).map(g => `${g.name}, ${g.st}`).join(", or ")})`;
    const x = LE.get(k); if (!x || x.given) return t;
    return `${t} (${x.name} ${x.cap <= 1 ? (x.val ? "on" : "off") : "×" + x.val}, set under Situation)`;
  };
  const gk = Object.keys(groups).sort((a, b) => (FX_GROUPS.indexOf(a) + 1 || 99) - (FX_GROUPS.indexOf(b) + 1 || 99));
  // a row that only raises your max AP (AP Optimization) is outside this attack: max AP only sets the cap and the starting
  // value of Situation's 'AP before the attack', the one AP input every AP reader takes (Blade Havoc, Full Salvo, Fury, per AP)
  const apOnly = r => r.effs.some(x => x.e.f === "apmax") && r.effs.every(x => x.note || x.e.f === "apmax");
  const isOut = r => r.effs.every(x => x.note) || apOnly(r);
  let nAp = 0;
  const RX = roundsOf(R, O);              // the attack's other rounds and trigger outcomes, for the pills and the rows' round lines
  // the buffs held from the start that a row's check reads in this attack (a forced-off row still holds them)
  const ownRd = new Map(); for (const r of R.rows) if (!r.hide) {
    const walk = c => {
      if (!c) return;
      if (c.t === "buf" && R.ctx.own.has(c.v)) { const o = ownRd.get(c.v) || ownRd.set(c.v, { n: c.bn || mcName(c.v), by: new Set() }).get(c.v); o.by.add(ovrK(r.src)); }
      (c.items || []).forEach(walk);
    };
    for (const x of r.effs) if (!x.note) (x.e.c || []).forEach(walk);
  }
  const shownK = new Set();               // the rows shown here with their menu
  for (const g of gk) {
    const rows = groups[g];
    // (a group's heading in each panel that lists one of its rows)
    if (rows.some(r => !isOut(r))) h += `<div class="lbl">${esc(g)}</div>`;
    if (rows.some(r => isOut(r))) hN += `<div class="lbl">${esc(g)}</div>`;
    for (const row of rows) {
      // text-only entries add nothing: the row's state and the active count come from its real effects alone
      // (a Code row whose cast decides a mode this setup reads keeps a live tick at any level: Rapid Realignment -> Directional Rack; so
      // does a stacking buff with a check you decide: ticked, it gives the level's start, Frida's Coercion: Instability III)
      const allNote = row.effs.every(x => x.note), anyOk = rowAnyOk(row), outR = isOut(row);
      const chP = rowChP(row, R);
      // a level-only row (all its effects stacking buffs): no tick, it is up while their level is 1 or more ('Vigor up', not 'on': a
      // Code row like Fearlessness isn't 'cast' just because Vigor is up)
      const lvs = [...new Map(row.effs.filter(x => x.lv).map(x => { const i = lvI(x.e); return [i.k, i]; })).values()];
      const lvFail = row.lvOnly && row.effs.filter(x => x.lv).every(x => x.failO);
      // the pill (pillOf: 'partly' when only some effects count; 'forced on / off' with what auto would give) and the auto / on / off
      // menu of a row the bench decides (next to the pill, inside the row's label: a select is interactive, so a click on it never reaches
      // the box)
      // (the pill reads the attack's other rounds too, pillX: a decided row that counts in some rounds and not in others is 'partly',
      // with a line per round; xr = what differs)
      const fo = row.forced, px = fo ? null : pillX(row, R, chP, RX), pl = fo ? pillOf(row, chP) : px.pl, xr = px && px.xr, natW = fo ? autoWord(S[id] || R.s, row) : "";
      const gainX = !!(xr && xr.gain.length);
      const ovrSel = (!outR || fo) && ovrMenuOK(row) ? `<select class="ovr${fo ? " set" : ""}" data-ovr="${esc(ovrK(row.src))}" aria-label="${esc(row.src.label)}: auto, on or off"
      title="auto: the bench decides from your setup, the target and the Situation · on: every effect of this row counts (its conditions taken as met) · off: none of them counts">${opt("", "auto", !fo)}${opt("on", "on", fo === "on")}${opt("off", "off", fo === "off")}</select>` : "";
      if (ovrSel) shownK.add(ovrK(row.src));
      const st = (pl ? `<span class="pill${pl[0] ? " " + pl[0] : ""}"${fo ? ` title="${esc(`Forced ${fo} with the menu next to it; auto would give: ${natW}`)}"` : pillTitle(pl[0]) ? ` title="${esc(pillTitle(pl[0]))}"` : ""}>${esc(pl[1])}</span>`
        : lvFail ? `<span class="pill">doesn't apply</span>` : `<span class="pill ${row.on ? "on" : ""}" title="counts through ${esc(lvs.map(i => i.n).join(" / "))}${lvs.some(i => i.has) ? " (set under Situation)" : ""}">${esc(lvs.map(i => i.n).join(" / "))} ${row.on ? "up" : "not up"}</span>`) + ovrSel;
      // ('N active' counts the rows that apply: tag on / partly / a chance / triggered, forced on, a row whose checked part
      // applies, a level row that is up; not "doesn't apply" or forced off)
      if (!outR && (fo ? fo === "on" : pl ? ["on", "partly", "triggered"].includes(pl[1]) || / chance$/.test(pl[1]) || (row.mixed && row.effs.some(x => !x.note && !x.eask && x.eok && !x.t1))
        : row.on && !lvFail)) onN++;
      // a row's level gains of one buff of one kind are summed into one line (two identical lines would merge into one, so top
      // star's Fury +2 would read '+1'); a gain at the start of each of your turns says so (Dawn's Bloom), a once-only one 'by your first attack'
      const lvaSum = new Map(); row.effs.forEach((x, j) => {
        if (!x.note && x.e.f === "lvadd") {
          const q = `${x.e.lvb}|${x.e.ea ? 1 : 0}|${x.eok ? 1 : 0}|${x.t1 ? 1 : 0}`;
          const o = lvaSum.get(q); if (o) { o.v += x.e.v; o.skip.add(j); } else lvaSum.set(q, { j, v: x.e.v, skip: new Set() });
        }
      });
      const lvaSkip = new Set([...lvaSum.values()].flatMap(o => [...o.skip])), lvaV = j => { for (const o of lvaSum.values()) if (o.j === j) return o.v; return null; };
      const fx = row.effs.map((x, j) => x.note ? (x.e.xn || folText(x.e))
        : x.e.f === "lvadd" ? (lvaSkip.has(j) ? "" : ((v, cap) => `${x.e.lbn || ""} +${v} ${v === 1 ? "stack" : "stacks"} ${x.e.ea ? `at the start of each of your turns${cap > 1 ? `, up to ${cap}` : ""}` : "by your first attack"}`)(lvaV(j), (LE.get(lvK(x.e.lvb, false)) || {}).cap) + (x.eok && !x.t1 ? "" : " ✕") + (x.t1 ? " (your first attack is on turn 1)" : "")
          + (() => { const k = lvK(x.e.lvb, false), y = LE.get(k); return y && !y.given && lvTyped(R.s, k) != null ? ` (start only; ${y.name} ×${lvOf(R.s, k)} is set under Situation)` : ""; })())
          : x.e.f === "lvmax" ? `${x.e.lbn || ""} cap +${x.e.v}` + (x.eok ? "" : " ✕")
            : x.pseudo ? folText(x.e) + (FOLLOW_F.has(x.e.f) && row.src.kind === "code" ? " (only when this skill is the attack)" : "") + (x.eok ? "" : " ✕")
              : x.ph ? phWords(x.e) + (x.eok ? " (hit by hit)" : " ✕") : x.e.f === "pwadj" ? pwText(x.e) : x.e.f === "aim" ? "Aims the attack" + (x.e.m ? " (" + wtNames(x.e.m) + ")" : "") + (x.eok ? "" : " ✕")
                : x.e.f === "gcrit" ? "Every shot crits (a sure crit)" + (x.eok ? "" : " ✕")
                  : x.e.f === "udg" ? "Your shots can't be dodged: every shot hits, with no hit roll" + (x.eok ? "" : " ✕")
                    : x.e.f === "ign" ? "Ignores the target's damage reductions: its negative DMG taken, damage factor and Final DMG count as 0, and its shield's cut doesn't apply" + (x.eok ? "" : " ✕")
                      : x.e.f === "defl" ? `A missed shot still deals ${pct(x.e.v || 0, 0)} of its plain damage (no crit)` + (x.eok ? "" : " ✕")
                        : x.e.f === "hfloor" ? `Hit chance at least ${pct(x.e.v || 0, 0)} on every shot` + (x.eok ? "" : " ✕")
                          : x.e.f === "ghc" ? `At least ${x.e.v} hit${x.e.v === 1 ? "" : "s"} land each round: once the shots left are needed to reach it, they hit with no roll` + (x.eok ? "" : " ✕")
                            : x.e.f === "hthr" ? `Shots always hit at ${pct(Math.max(0, 1 + (x.e.v || 0), ...(x.e.c || []).filter(c => c.t === "hitr" && (c.op || ">=").startsWith(">")).map(c => c.v)), 0)} hit chance or more` + (x.eok ? "" : " ✕")
                              // (an effect on one part also carries its text for all four parts, said once when all four match: partsOnce)
                              : ((hd, vl, tl) => x.e.part ? { t: `${hd} (${x.e.part}) ${vl}${tl}`, part: x.e.part, all: `${hd} ${vl} (all parts)${tl}` } : `${hd} ${vl}${tl}`)(
                                `${fLab(x.e.f).replace(/ \+$/, "")}${x.e.wt && LIMIT_F.has(x.e.f) ? " (" + (D.weapons && (TYPE_NAMES[x.e.wt] || x.e.wt)) + ")" : ""}${x.e.a ? " " + shownAttr(x.e.a) : ""}`,
                                perLv(x.e) ? (x.val != null ? `now ${sgn(x.val, x.e.f)} (${sgn(x.e.sp[1], x.e.f)} ${scWord(x.e)})` : `${sgn(x.e.sp[1], x.e.f)} ${scWord(x.e)}`) : scPerTxt(x.e, x.val != null ? x.val : effVal(R.s, row.src, x.e, true)) || `${sgn(x.val != null ? x.val : effVal(R.s, row.src, x.e, true), x.e.f)}${x.lv && x.val == null && lvOf(R.s, x.lvk) < 1 ? " per stack" : ""}${x.e.sc ? " (" + scWord(x.e) + ")" : ""}`,
                                `${x.chOff ? ` (${pct(R.chanceP[x.chk], 0)} chance: averaged into the attack, rolled in the fights)` : ""}${x.dup ? " (same buff as another row, counted once)" : x.lower ? " (a higher level of the same buff counts instead)" : ""}${!x.eok ? " ✕" : x.dyn && !x.sok ? " (not at this target HP; counts in the fight once met)" : row.mixed && !x.lv ? (x.eask ? (row.on || row.follow || row.cover ? "" : " (tick if met)") : " (counts without the tick)") : ""}`));
      // a stacking buff's 'gained after ...: tick if it's already up' reads as its level; a level check names where it is set
      // (a follower or covered row has no tick of its own: its conditions lose their ': tick if ...' part; the row's pointer line
      // says where it is set or why it is up. So does a row greyed because nothing on it applies in this attack)
      const noTick = t => row.follow || row.cover || !anyOk || fo ? String(t || "").replace(/: tick (?:if|for) [^(/]*?(?: \(a follow-up in the same combat has it\))?(?= \(| \/|$)/g, "") : t;
      // (a fact tick's condition says what its one tick under Situation reads; a forced row reads none. So does one inside a
      // 'when the attack starts' check (the Ballistics backpacks' Ballistic Calibration I / III: attack type and ideal range))
      const factSfx = c => fo || !R.sit ? ""
        : c.t === "ideal" && R.sit.use.has("ideal") ? ` (under Situation: ${R.sit.idealOn ? "at" : "not at"} ideal range, ${R.sit.idealSet ? "set by you" : "worked out from the distance"})`
          : c.t === "bkrange" && R.sit.use.has("bkr") ? ` (${R.sit.bkr ? "ticked" : "unticked"} under Situation)` : "";
      const cTxt = x => {
        const i = x.lv ? lvI(x.e) : null; return [...new Set((x.e.c || []).filter(c => !PH_C.has(c.t))
          .map(c => c.t === "castc" && row.src.castN != null ? `Set off by an earlier attack (${c.items.map(y => plainC(noTick(y.text))).join(" and ")})`
            : c.t === "castc" && c.items.some(factSfx) ? `${c.items.map(y => plainC(noTick(y.text)) + factSfx(y)).join(" and ")} (when the attack starts)`
              : i && isAfterC(c) ? `${i.tgt ? "on the target" : "up"} while ${i.n} is 1 or more${i.has ? " (set under Situation)" : ""}` : c.t === "buf" ? bufTxt(c, !!fo)     // (a forced row's checks name no input)
                : c.t === "apcost" && R.ctx && R.ctx.ap != null && !fo ? `${plainC(noTick(c.text))} (this attack: ${R.ctx.ap} AP, set under Situation)`
                  : factSfx(c) ? plainC(noTick(c.text)) + factSfx(c)
                    : c.t === "samewt" || c.t === "any" ? cWord(c) : plainC(noTick(c.text))).filter(Boolean))];
      };
      // effects of one row with different conditions (Move Amplifier - Re-ATK: DMG always, hit and crit during a Re-ATK): one line per
      // condition set; what every effect needs stays on the row's condition line
      const effC = row.effs.filter(x => !x.note).map(cTxt), common = effC.length ? effC[0].filter(t => effC.every(L => L.includes(t))) : [];
      const grpL = new Map(); row.effs.forEach((x, j) => { const k = x.note ? "" : cTxt(x).filter(t => !common.includes(t)).join(" · "); if (!fx[j]) return; if (!grpL.has(k)) grpL.set(k, []); if (!grpL.get(k).some(y => fxT(y) === fxT(fx[j]))) grpL.get(k).push(fx[j]); });
      const grouped = !allNote && grpL.size > 1;
      if (grouped && grpL.has("")) { const L = grpL.get(""); grpL.delete(""); grpL.set("", L); }     // the unconditioned line first
      const grpE = grouped ? [["", grpL.get("") || []], ...[...grpL].filter(([k]) => k)].filter(([, L]) => L.length) : [];
      const conds = allNote ? [] : grouped ? common : [...new Set(effC.flat())];
      // a row the bench decides by itself (no condition, or only ones it checks from the setup, the target and the Situation): a greyed
      // box showing whether it applies; only rows with something you decide take a tick
      // (a level-only row is decided by its buff's level, a Code row too: greyed, ticked while the buff is up)
      // (a row with the same buffs as a row shown before it follows that row's tick; one whose buffs are up already from a row that needs
      // no tick is on: both greyed, saying which row)
      const rel = row.follow ? `same buffs as ${row.followL}: tick it there` : row.cover ? `already up from ${shortList(row.cover)}` : "";
      const decided = (!row.ask && row.src.kind !== "code") || row.lvOnly || !!rel;
      const dTitle = row.lvOnly ? (lvFail ? "Doesn't apply in this attack" : `Counts through ${lvs.map(i => i.n).join(" / ")}${lvs.some(i => i.has) ? " (set under Situation)" : ""}`)
        : rel ? rel[0].toUpperCase() + rel.slice(1) : "Decided by your setup, the target and the Situation";
      const toggle = row.src.kind !== "ra" && !allNote ? `<input type="checkbox" data-tog="${esc(row.src.key)}" ${(fo ? fo === "on" : row.lvOnly ? row.on && !lvFail : rel ? row.on : decided ? anyOk || gainX : row.on) ? "checked" : ""} ${anyOk && !decided && !fo ? "" : "disabled"} aria-label="${esc(row.src.label)}"${fo ? ` title="${esc(`Forced ${fo} with the menu next to its tag; auto would give: ${natW}`)}"` : decided ? ` title="${esc(dTitle)}"` : ""}>` : `<span></span>`;
      // a forced row says so, and what auto would give, before its conditions
      // (in every round of the attack the row is in, each round named; forced off, the buffs it holds that other rows check still count)
      const K0 = ovrK(row.src), inR = fo ? RX.filter(o => !o.combo && !o.Xs.includes(rowR.get(row)) && o.Xs.some(X => X.rows.some(r => !r.hide && ovrK(r.src) === K0 && r.effs.some(x => !x.note)))).map(o => o.name) : [];
      const inW = inR.length ? `; the same in ${inR.join(" and ")}` : "";
      const holdN = fo === "off" ? [...new Set(((R.ctx.ownBy && R.ctx.ownBy.get(K0)) || []).filter(b => ownRd.has(b) && [...ownRd.get(b).by].some(k => k !== K0)).map(b => ownRd.get(b).n))] : [];
      const foL = fo ? `<span class="cd">${esc(fo === "on" ? `Forced on: every effect counts, its conditions taken as met${inW}${row.effs.some(x => x.lv) ? "; a stacking buff still counts by its level (set under Situation)" : ""}${row.effs.some(x => x.chq && x.chq.n) ? "; a random pick is still rolled" : ""}`
        : `Forced off: none of its effects count${inW}${holdN.length ? `; it still holds ${holdN.join(", ")}, which other rows check` : ""}`)} (auto: ${esc(natW)})</span>` : "";
      // where a decided row counts differently in another round of the attack: one line per round, with the checks that
      // make the difference ('Not in the Flurry Strike round: Skill AP cost ≥ 3 (that round: 0 AP)')
      // (a fact tick's check says where it is set, as on the row's own lines: factSfx)
      const xcW = (c, X, E) => c.t === "castc" ? `${c.items.map(y => plainC(noTick(y.text)) + factSfx(y)).join(" and ")} (when the attack starts)` : c.t === "buf" ? bufTxt(c, true)
        : c.t === "apcost" && X.ctx && X.ctx.ap != null ? `${plainC(noTick(c.text))} (that round: ${X.ctx.ap} AP)`
          : c.t === "thp" && E.hp.get(X) != null ? `${plainC(noTick(c.text))} (that round: about ${Math.round(E.hp.get(X))}%, what the earlier rounds leave)`
            : c.t === "samewt" || c.t === "any" ? cWord(c) : plainC(noTick(c.text)) + factSfx(c);
      const effW = y => `${fLab(y.e.f).replace(/ \+$/, "")}${y.e.a ? " " + shownAttr(y.e.a) : ""} ${sgn(effVal(R.s, row.src, y.e, true), y.e.f)}`;
      // (a difference the attack with no trigger has already is not repeated for its trigger outcomes; one only an outcome has says when:
      // 'Not in the Flurry Strike round when RA - Shock triggers: Target HP ≥ 50% (that round: about 46%, ...)')
      const xL = [];
      if (xr) {
        const mainOk = pl && (pl[1] === "on" || pl[1] === "partly"), lines = new Map();
        const put = (o, w, L) => {
          const k = w + "|" + o.base + "|" + L.join(" · "), q = lines.get(k) || lines.set(k, { w, base: o.base, L, plain: false, ras: new Set(), chance: false }).get(k);
          if (!o.combo) q.plain = true; else { o.ras.forEach(n => q.ras.add(n)); if (o.chance) q.chance = true; }
        };
        for (const o of xr.gain) {
          const why = new Set(), fw = new Set();
          for (const { x, y, X } of o.L) { if (x) (x.fc || []).filter(c => !(y.fc || []).includes(c)).forEach(c => why.add(xcW(c, X, o))); else fw.add(effW(y)); }
          put(o, "Counts in", [...fw, ...why].filter(Boolean));
        }
        if (mainOk) for (const o of xr.loss) {
          const why = new Set();
          for (const { x, y, X } of o.L) (y.fc || []).filter(c => !((x && x.fc) || []).includes(c)).forEach(c => why.add(xcW(c, X, o)));
          put(o, "Not in", [...why].filter(Boolean));
        }
        for (const q of lines.values()) {
          const r = [...q.ras], when = q.plain ? "" : ` when ${r.length ? `${r.join(" or ")} ${r.length > 1 ? "trigger" : "triggers"}${q.chance ? " or a chance effect fires" : ""}` : "a chance effect fires"}`;
          xL.push(`${q.w} ${q.base}${when}${q.L.length ? ": " + q.L.join(" · ") : ""}`);
        }
      }
      // the level of each stacking buff the row shows: read-only, set under Situation (no stacks box on a row)
      // and of the buff a value per level reads (White Stork's crit per Reinforced Ammo): read-only, its one input is under Situation
      const blv = [...new Map(row.effs.filter(x => !x.note && perLv(x.e)).map(x => {
        const b = perLvB(x.e), k = lvK(b, false), y = LE.get(k);
        return [k, y && !y.given ? { k, n: y.name, tgt: false, lvl: bufLvl(b, x.e, R.sit, R.ctx), typed: lvTyped(R.s, k) != null, has: true } : null];
      })).values()].filter(Boolean)
        .filter(i => !lvs.some(j => j.k === i.k));
      const stack = [...lvs, ...blv].map(lvSpan).join(" ");
      const rns = [...new Set(row.effs.map(x => x.e.rn).filter(Boolean))];   // what the effect really does where its game text says otherwise
      const fxH = grouped ? grpE.map(([k, L]) => `<div class="fx">${k || !common.length ? `<span class="gl">${esc(k || "Always")}:</span> ` : ""}${esc(partsOnce(L).join(" · "))}</div>`).join("")
        : `<div class="fx">${esc([...new Set(partsOnce(fx.filter(Boolean)))].join(" · "))}</div>`;
      // a 'no damage' row: read-only in "Not part of this attack" (no box, no 'no damage' tag: the panel's title says it)
      if (outR) {
        nN++; const apR = apOnly(row) && anyOk; if (apR) nAp++;
        hN += `<div class="src"><span></span><span><span class="nm">${esc(row.src.label)}</span> ${fo ? st + " " : ""}${stack}${fxH}${rns.length ? `<div class="warnline">${esc(rns.join(" · "))}</div>` : ""}</span>
      ${rel ? `<span class="cd">${esc(rel[0].toUpperCase() + rel.slice(1))}</span>` : ""}${apR ? `<span class="cd">Sets the cap and the starting value of AP before the attack (Situation)</span>` : ""}</div>`; continue;
      }
      h += `<label class="src">${toggle}<span><span class="nm">${esc(row.src.label)}</span> ${st} ${stack}${fxH}${rns.length ? `<div class="warnline">${esc(rns.join(" · "))}</div>` : ""}</span>
      ${rel ? `<span class="cd">${esc(rel[0].toUpperCase() + rel.slice(1))}</span>` : ""}${foL}${conds.length ? `<span class="cd">${esc(conds.join(" · "))}</span>` : ""}${xL.map(L => `<span class="cd xr">${esc(L)}</span>`).join("")}</label>`;
    }
  }
  // a row forced on another attack of this setup that a round of this attack reads, with no row here (the other arm's Flurry
  // Strike or the Peripheral Vision round reads the other weapon's refits and drop ability): read-only, saying where its menu is
  {
    const hid = [...((R.sit && R.sit.ovrRoot) || new Map())].filter(([K, o]) => !shownK.has(K) && o.rounds.some(y => y.n));
    if (hid.length) h += `<div class="lbl">Set on another attack</div>` + hid.map(([K, o]) => {
      const r0 = o.rounds.find(y => y.n), wid = o.wslot && R.weap && R.weap[o.wslot] && D.weapons[R.weap[o.wslot].id], hand = SLOTW[o.wslot || r0.slot] || o.wslot || r0.slot;
      const rs = [...new Set(o.rounds.filter(y => y.n).map(y => y.n))];
      return `<div class="src" data-ovrro="${esc(K)}"><span></span><span><span class="nm">${esc(o.label + (wid ? ` (${wid.n})` : ""))}</span> <span class="pill ask">forced ${esc(o.fo)}</span></span><span class="cd">${esc(`Its menu is on the ${hand} weapon's attacks; ${rs.join(" and ")} of this attack counts it as forced ${o.fo}`)}</span></div>`;
    }).join("");
  }
  const ndW = `another action, AP or movement for a later action, a link attack, the enemy's turn`;
  $(id + "-fx").innerHTML = (h || `<div class="meta">No bonuses that affect damage.</div>`)
    + (nN ? `<div class="meta">${nN} ${nN === 1 ? "row works" : "rows work"} outside this attack (${ndW}): listed under Not part of this attack, below Breakdown.</div>` : "");
  $(id + "-fxsum").textContent = `${onN} active`;
  $(id + "-nd").innerHTML = nN ? `<div class="meta">What these do happens outside this attack (${ndW}), so nothing here changes the numbers above${nAp ? "; max AP only sets the cap and the starting value of AP before the attack under Situation" : ""}.</div>${hN}`
    : `<div class="meta">Nothing in this setup works outside this attack.</div>`;
  $(id + "-ndsum").textContent = nN ? `${nN} listed` : "none";
}
/* a follow-up or extra-hit effect in words (the Bonuses rows) */
const GATE_W = { allHit: "when every shot of the attack lands", broke: "when the attack destroys a part", noBroke: "when the attack destroys no part", anyHit: "when a shot lands" };
const smAdj = a => a ? ` ${a < 0 ? "−" : "+"} ${Math.abs(a).toFixed(2)}` : "";
function folText(e) {
  const g = e.gate ? " " + GATE_W[e.gate] : "";
  if (e.f === "purs") {
    const P = (D.purs || {})[e.b] || {};
    return `Flurry Strike: ${pct(P.p || 0, 0)} chance, ${P.same ? "same arm" : "the other arm"}, ${P.sk ? `${esc(P.sk.n || "its own attack")} SkillM ${(P.sk.m + (P.adj || 0)).toFixed(2)}` : `extra attack SkillM${smAdj(P.adj) || " unchanged"}`}${P.once ? ", once per turn" : ""}${g}`;
  }
  if (e.f === "combo") {
    const C = (D.combo || {})[e.b] || {};
    return `Gusty Strike: ${pct(C.p || 0, 0)} chance${C.p ? "" : " (raised by chance bonuses)"}, ${C.same ? "same arm" : "the other arm"}, extra attack SkillM${smAdj(C.adj) || " unchanged"}${g}`;
  }
  if (e.f === "p2c") return "Flurry Strike fires before the target's retaliation, as a Gusty Strike";
  if (e.f === "after") {
    const A = (D.after || {})[e.b];
    return A ? `After the attack: ${A.sk.n || "a strike"} with your ${typesOf(A.wm)}, ${A.sk.h} shot${A.sk.h === 1 ? "" : "s"} × SkillM ${A.sk.m.toFixed(2)}${A.mode ? " (an area: counted on this target)" : ""}${g}` : "After the attack: a strike with no damage multiplier of its own (counted under Fixed DMG after the attack)";
  }
  if (e.f === "xps") {
    const x = e.xp || {};
    return x.t === "ecs" ? `Fixed hit on the same part after each landed shot: ${pct(x.v, 0)} × srcAtk` : x.t === "ec" ? `Fixed hit on another part after each landed shot: ${pct(x.v, 0)} × srcAtk`
      : `Splash on another part after each landed shot: ${pct(x.v, 0)} of that hit`;
  }
  if (e.f === "afx") {
    const a = e.afx || {}, fx = a.fx ? " × (1 + FixDMG%)" : "";      // fixed damage after the attack
    if (a.flat) return "The knock-back strike after the attack: 1 DMG on one part (it can't be dodged)";      // High Pressure Vibration
    return a.t === "bomb" ? `Fixed DMG after the attack: ${a.v}× ATK${fx} on one part${a.hit ? " (needs a hit that deals damage)" : ""}${a.blk ? " when the knock-back is blocked" : ""}`
      : a.t === "each" ? `Fixed DMG after the attack: ${a.v}× ATK${fx} on every part`
        : a.t === "split" ? `Fixed DMG after the attack: ${a.v}× weapon ATK${fx}, shared by all parts`
          : `Sets off the target's Short Circuit right after the attack: every part loses ${pct(a.v, 0)} of its max HP${fx} (each keeps 1 HP)`;
  }
  if (e.f === "ovp") { const [step, per, cap] = e.ovp || []; return `DMG +${pct(per || 0, 2)} per ${step} surplus ST Power (Power − Weight)${cap ? ", up to " + pct(cap, 0) : ""}`; }
  if (e.f === "exec") return `Execution after the attack: a part it hit below ${pct(e.v, 0)} HP is destroyed (the body too)`;
  if (e.f === "t4") return `Destroying a limb also deals ${pct(e.v, 0)} of its max HP to the body (Fixed DMG)`;
  return "";
}
/* shots per attack: a range when a weighted accessory (e.g. RA - Augmentation, bullets +1) changes it, with what sets the top */
/* one shot of a round by where it lands: limb / body (or the focused part), with crit */
function perPart(by, critDmg) {
  if (T.mode === "focus") return `<b>${fmt(by[T.part], 1)}</b> (crit ${fmt(by[T.part] * (1 + critDmg), 1)}) on the ${esc(T.part.toLowerCase())}`;
  const L = ["Left arm", "Right arm", "Legs"];
  if (L.some(p => Math.abs(by[p] - by["Left arm"]) > 0.05))
    return [...L, "Body"].map(p => `<b>${fmt(by[p], 1)}</b> on the ${p.toLowerCase()}`).join(" · ") + ` (crit ×${(1 + critDmg).toFixed(2)})`;
  return `<b>${fmt(by["Left arm"], 1)}</b> on a limb · <b>${fmt(by.Body, 1)}</b> on the body (crit ${fmt(by["Left arm"] * (1 + critDmg), 1)} / ${fmt(by.Body * (1 + critDmg), 1)})`;
}
function xpName(O) { const L = [...new Set(O.list.flatMap(o => xpsAll(o.R).map(x => x.n)))]; return L.join(" + ") || "Extra hits"; }
/* shots per attack over every round of its structure (the skill's own count when it has none) */
const nS = R => R.shotsS != null ? R.shotsS : R.shots;
const nSw = x => Math.abs(x - Math.round(x)) < 1e-9 ? fmt(Math.round(x)) : fmt(x, 2);          // a count on average (Rapid Strike's follow-up hit)
const shotW = n => `${nSw(n)} shot${Math.abs(n - 1) < 1e-9 ? "" : "s"}`;
/* the extra hits on every round of the attack (Collateral DMG follows each missile of a Full Salvo) */
const xpsAll = R => [R, ...((R.struct && R.struct.steps) || []).flatMap(x => x.streams.map(y => y.R))].flatMap(r => r.xps || []);
function shotsText(O) {
  const ns = O.list.map(o => nS(o.R)), lo = Math.min(...ns), hi = Math.max(...ns);
  if (lo === hi) return shotW(lo) + (Math.abs(lo - Math.round(lo)) > 1e-9 ? " on average" : "");
  const pHi = O.list.filter(o => nS(o.R) === hi).reduce((a, o) => a + o.p, 0);
  const ras = O.base.raStates.filter(x => x.mode === "chance").map(x => x.id)
    .filter(id => O.list.some(o => nS(o.R) !== lo && o.R.raStates.some(r => r.id === id && r.mode === "on")) && (D.components[raId(id)].fx || []).some(k => (D.fx[k] || []).some(e => e.f === "shots" || e.f === "shots_pct")));
  return `${lo}–${hi} shots (${hi} when ${ras.length ? esc(ras.map(id => D.components[raId(id)].n).join(" / ")) + " triggers" : "a trigger fires"} · ${pct(pHi, 0)} of attacks)`;
}
/* one shot's damage in words (no crit, the shot lands): on the focused part, else a limb and the body (each limb when they differ) */
function perTxt(R) {
  const by = R.shotBy, f = v => fmt(v, 1);
  if (T.mode === "focus") return `${f(by[T.part])} per shot on the ${T.part.toLowerCase()}`;
  const L = ["Left arm", "Right arm", "Legs"];
  return L.some(p => Math.abs(by[p] - by["Left arm"]) > 0.05) ? `per shot ${[...L, "Body"].map(p => `${f(by[p])} on the ${p.toLowerCase()}`).join(", ")}`
    : `${f(by["Left arm"])} per shot on a limb, ${f(by.Body)} on the body`;
}
/* a condition's text in plain game English, for the rows (display only; the catalog keeps the data's words, which are part
   of its items): "Buff [X] level >= 2" -> "X ≥ 2" (> 0 / >= 1: "X held"; < 1, <= 0, = 0: "X not held"); the skill group 'ActiveAttack'
   -> 'skill attack'; the part-destroyed checks (ActorBufActiveCondWapPartDestroiedByTarget.Check: an enemy attack on the
   holder destroyed its part; ...ByTypeTarget: the holder's attack destroyed the target's part; part -1 any, -2 either arm
   (IsDestroyWapPart(2) or (3)), 1-4 body / left arm / right arm / legs, 5 the whole unit); a trigger buff with no name is not named by its
   id; each condition of a 'gained after' list once; the Fury a 'gained after' list reads is what THAT attack spent (not this attack's
   'Fury stacks spent' box); a reload by weapon type; movement left in tiles */
const PD_PART = { "-1": "a part", "-2": "an arm", 1: "the body", 2: "the left arm", 3: "the right arm", 4: "the legs" };
const SYMW = { ">=": "≥", "<=": "≤", ">": ">", "<": "<", "=": "=" };
const OPN = { 0: ">=", 1: ">", 2: "<=", 3: "<", 4: "=" };
// a condition object in words: the weapons in two slots of one type or not (WeaponEquipSlotTypeWithWeaponBetweenIsEquip, the bench's 'samewt'),
// a 'one of' list item by item; any other: its text in plain words
const SLOTN = ["left hand", "right hand", "left shoulder", "right shoulder", "back"];
const cWord = c => c.t === "samewt" ? `the weapons in your ${SLOTN[c.a] || "slot " + c.a} and ${SLOTN[c.b] || "slot " + c.b} are ${c.same ? "of the same type" : "of different types"}`
  : c.t === "any" && c.items ? "one of: " + c.items.map(cWord).join(" / ") : plainC(c.text);
const lvWord = (n, op, v) => (op === ">" && +v === 0) || (op === ">=" && +v === 1) ? `${n} held` : (op === "<" && +v === 1) || ((op === "<=" || op === "=") && +v === 0) ? `${n} not held`
  : op === "=" ? `${n} ${+v === 1 ? "held at 1" : "at " + v}` : `${n} ${SYMW[op] || op} ${v}`;
const splitTop = t => {
  const out = []; let d = 0, cur = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]; if (ch === "(") d++; if (ch === ")") d--;
    if (d === 0 && t.startsWith(", ", i)) { out.push(cur); cur = ""; i++; continue; } cur += ch;
  }
  out.push(cur); return out;
};
function plainC(t) {
  if (!t) return t;
  let x = String(t)
    .replace(/Buff \[([^\]]+)\] level (>=|<=|>|<|=) (\d+)/g, (m, n, op, v) => lvWord(n, op, v))
    .replace(/Buff \[([^\]]+)\] held/g, "$1 held")
    .replace(/\bActiveAttack\b/g, "skill attack")
    .replace(/Wap Part Destroied By Target \((-?\d+)\)/g, (m, p) => +p === 5 ? "an enemy attack destroyed you" : `an enemy attack destroyed ${/^the /.test(PD_PART[p] || "") ? "your " + PD_PART[p].slice(4) : (PD_PART[p] || "a part") + " of yours"}`)
    .replace(/Wap Part Destroied By Type Target \((-?\d+)(?:, (\d+))?\)/g, (m, p, q) => (+p === 5 ? "the attack destroyed the target" : `the attack destroyed ${/^the /.test(PD_PART[p] || "") ? "the target's " + PD_PART[p].slice(4) : (PD_PART[p] || "a part") + " of the target"}`) + (+q === 1 ? " (any target it hits)" : ""))
    .replace(/Equipment Ammo Count Reset \((\d+)\)/g, (m, b) => `after reloading ${wtNames(+b) || "a weapon"}`)
    .replace(/Current Move Point Left \((?:(\d), )?(\d+)\)/g, (m, o, v) => `movement left ${SYMW[OPN[o || 0]]} ${+v / 1000} tile${+v === 1000 ? "" : "s"}`)
    // (CompareValue(CondParam1, count, CondParam2): one number printed is the operator when it is 1-4 with no value, else the value)
    .replace(/Curr Hit Count \((\d+)(?:, (\d+))?\)/g, (m, a, b) => { const [o, v] = b != null ? [+a, +b] : +a <= 4 ? [+a, 0] : [0, +a]; return `hit count ${SYMW[OPN[o]]} ${v}`; })
    // (TargetCountDamage: CondParam1 N, CondParam2 0 'at least', else 'at most': the units the attack damaged)
    .replace(/Target Count Damage \((\d+)(?:, (\d+))?\)/g, (m, a, b) => `the attack damages ${+b ? "at most" : "at least"} ${a} unit${+a === 1 ? "" : "s"}`)
    .replace(/Link Attackers Find After Attack \((\d+)(?:, (\d+))?\)/g, (m, a, b) => { const [o, v] = b != null ? [+a, +b] : [0, +a]; return `allies joining with a link attack ${SYMW[OPN[o]]} ${v}`; });
  // a 'gained after' note: "(<buff id>; after: ...)" / "(<buff id>)" lose the id; each condition of its list once; Fury spent on THAT attack
  x = x.replace(/\((\d{5,})(?:; |\))/g, (m, id) => m.endsWith(")") ? "" : "(");
  x = x.replace(/\s+$/, "").replace(/ \(\)$/, "");
  const ai = x.indexOf("after: ");
  if (ai >= 0 && x.endsWith(")")) {
    const head = x.slice(0, ai + 7), body = x.slice(ai + 7, -1);
    const L = []; for (const it of splitTop(body)) { const y = it.replace(/^Fury stacks spent (≥|≤|>|<|=) (\d+)$/, "$1 $2 Fury spent on that attack"); if (!L.includes(y)) L.push(y); }
    x = head + L.join(", ") + ")";
  }
  return x;
}
/* the attack's other versions (a version the game picks by a cast condition: Spirit Strike - EX at 8+ Vigor): what
   each does differently, what it needs and where that is set */
function verHints(R) {
  const s = R.s, A0 = s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].atk[R.W.type];
  if (!A0 || !A0.var || A0.var.length < 2) return [];
  const LE = new Map(lvEntries(R).map(x => [x.k, x])), P = A0.var.find(v => v.vn === R.sk.vn) || A0;
  // ('the other hand fires too' only when the version cast now has no second hand; when both fire, how they differ: one round
  // with the shots alternating, or each hand in a round of its own. And the buffs each version casts before its shots (Bullet Storm EX:
  // Hit Rate UP II, Crit Rate UP II), from the skill row's effects gated by that version's cast condition)
  const TWO = new Set(["dual", "hand2", "hand2x", "avg"]), skFx = (D.fx[(D.skills[s.atk.skill] || {}).fx] || []);
  // (an effect only this version casts: its conditions are this version's cast condition and nothing else; shown when the other version lacks it)
  const own = v => skFx.filter(e => !e.note && e.f !== "note" && (e.c || []).length && (e.c || []).every(c => c.t === "buf" && (v.cc || []).some(x => !x.bc && x.b === c.v && x.op === c.op && x.v === c.n)));
  const fxW = e => `${fLab(e.f).replace(/ \+$/, "")} ${sgn(e.v, e.f)}`;
  const desc = v => {
    const d = [], k = v.st && v.st.k, pk = P.st && P.st.k;
    if (k === "xhit" && v.st.sub && pk !== "xhit") d.push(`two strikes, the second at SkillM ${v.st.sub.m.toFixed(2)}`);
    const subN = (v.st && v.st.subs || []).map(x => x[1].n).join(", ");
    if (k === "hand2x" && pk !== "hand2x") d.push(TWO.has(pk) ? `each hand fires in a round of its own${subN ? `, the other hand ${subN}` : ""}` : `the other hand fires too: ${subN}`);
    // (a version with extra slots, Fate's Verdict - EX: its first round is both hands already; the difference is the other weapons' rounds)
    const two = x => TWO.has(x.st && x.st.k) || (x.st && x.st.k === "slots" && (x.st.pairs || []).some(y => y[1] && y[1].st && TWO.has(y[1].st.k)));
    if (k === "dual" && pk !== "dual" && pk !== "slots") d.push(two(P) ? "both hands fire in one round, their shots alternating" : "the other hand fires too, in the same round");
    if (k === "slots" && pk !== "slots") {
      const ex = (v.st.pairs || []).filter(y => y[0] >= 0 && y[1]);
      if (ex.length) d.push(`${ex.length} more round${ex.length === 1 ? "" : "s"} from your other weapons: ${[...new Set(ex.map(y => TYPE_NAMES[y[1].mt] || y[1].mt))].join(", ")}`);
    }
    if (pk === "slots" && k !== "slots") d.push("no rounds from your other weapons");
    if (k === "locks" && v.st.rep && !(P.st && P.st.rep)) d.push(`can lock the same target more than once`);
    if (v.m !== P.m) d.push(`SkillM ${v.m.toFixed(2)}`);
    if (v.h !== P.h) d.push(`${v.h} shots`);
    const mine = own(v).map(fxW), now = own(P).map(fxW), add = mine.filter(t => !now.includes(t)), lose = now.filter(t => !mine.includes(t));
    if (add.length) d.push(`with ${add.join(", ")}`);
    if (lose.length) d.push(`without ${lose.join(", ")}`);
    return d.length ? ` (${d.join("; ")})` : "";
  };
  const cw = c => {
    if (c.bc) return `when ${c.bc.map(x => x.text).join(" and ")} (set under Situation)`;
    const x = LE.get(lvK(c.b, false)), n = String(c.n || c.b).replace(/\.$/, ""), op = c.op || ">=";
    const onOff = (c.max || 1) <= 1 || (x && x.cap <= 1) ? (CMP[op](1, c.v) ? "on" : "off") : null;
    const when = onOff ? `with ${n} ${onOff}` : op === ">=" ? `at ${c.v}+ ${n}` : op === ">" ? `above ${c.v} ${n}` : op === "<" ? `below ${c.v} ${n}`
      : op === "<=" ? `at ${c.v} ${n} or less` : `at ${c.v} ${n}`;
    // (the giving row is ticked or not now: 'tick' it for a version that needs the buff on, 'untick' it for one that needs it off)
    const where = x && x.given ? `${onOff === "off" ? (x.ticked ? "untick" : "keep unticked") : (x.ticked ? "keep ticked" : "tick")} ${shortList(x.by.map(g => g.name))} under Bonuses & buffs`
      : `set ${n}${onOff ? "" : x && (x.stk || x.kind) ? " stacks" : " level"} under Situation`;
    return `${when}: ${where}`;
  };
  return A0.var.filter(v => v.vn && v.vn !== R.sk.vn).map(v => `${v.vn}${desc(v)} casts ${(v.cc || []).map(cw).join("; ")}`);
}
function renderOut(id, O, other, scale) {
  const el = $(id + "-out");
  if (!O) { el.innerHTML = `<div class="meta">Equip a weapon to see damage.</div>`; return; }
  const R = O.base, sim = O.sim, conf = T.conf;
  const d = (a, b) => { if (!other || !b) return ""; const x = a / b - 1; return `<span class="delta ${x > 0.0005 ? "up" : x < -0.0005 ? "down" : ""}">${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%</span>`; };
  const ras = Object.entries(O.ch).map(([k, p]) => `${D.components[raId(k)].n}${raId(k) !== k ? ` (${k.slice(0, 2)})` : ""} ${pct(p, 0)}`).join(" · ");
  const hov = (label, term) => `<span class="hov" title="${esc(term)}">${label}</span>`, tag = x => `<span class="tg">${x}</span>`;
  // where the shots go: the target's forced part or a Large Shield beat focus; an area attack goes round the parts
  const trR = (R.pw && R.pw.tr) || {}, al0 = aliveStart(), upP = q => q === "Body" || !al0 || al0.has(q);
  const fP = !trR.rot && !R.sk.av ? (trR.frc || []).find(upP) : null, lP = trR.lsh && upP(trR.lsh) ? trR.lsh : null;
  const spread = fP ? `every shot on its ${esc(fP.toLowerCase())} (its own rule)` : lP ? `every shot on its ${esc(lP.toLowerCase())} (Large Shield)`
    : T.mode === "focus" ? `focus on the ${esc(T.part.toLowerCase())} while it stands`
      : trR.rot ? `shots go round the parts${PARTS.some(q => !upP(q)) ? ", a turn on a destroyed part is lost" : ""}` : "shots scatter across parts";
  const avgOf = f => O.list.reduce((a, o) => a + o.p * f(o.R), 0);
  const pvE = avgOf(r => r.pv ? r.pv.exp : 0), gE = avgOf(r => r.gusty ? r.gusty.exp : 0), bE = avgOf(r => r.burnNow || 0), xE = avgOf(r => r.xpE || 0);
  const fE = avgOf(r => r.pursE || 0), aE = avgOf(r => r.afterE || 0), cE = avgOf(r => r.afxNow || 0);
  // the structure's further rounds: second hand, extra slots, lock-ons, the follow-up hit (each without its accessory extra hits)
  const KW = { hand2: "Second hand", slot: "Extra slots", lock: "Lock-ons", xhit: "Follow-up hit" }, kE = {};
  for (const k of Object.keys(KW)) kE[k] = avgOf(r => (r.kindE && r.kindE[k]) || 0);
  const mainE = O.exp - pvE - gE - bE - xE - fE - aE - cE - Object.values(kE).reduce((a, v) => a + v, 0);
  // tier 1: the fight
  let hist = "";
  if (sim.fights && scale) {
    // (a label is never cut to its first digit: it may overflow its bar (centred, not clipped), and the step leaves room for it
    // at phone width: about 280 px for the bars, gaps 2 px, ~7 px a digit; round steps (1, 2, 5, 10, 20 ...), none next to the highlighted one)
    const nB = scale.hi - scale.lo + 1, digW = 7 * String(scale.hi).length + 6, pitch = Math.max(1, 280 / nB);
    const need0 = Math.max(scale.hi - scale.lo > 30 ? 5 : scale.hi - scale.lo > 15 ? 2 : 1, Math.ceil(digW / pitch));
    const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(x => x >= need0) || 1000, near = Math.ceil(digW / pitch), bars = [];
    const lab = k => k === sim.need || ((step < 5 ? (k - scale.lo) % step === 0 : k % step === 0) && !(sim.need != null && Math.abs(k - sim.need) < near));
    for (let k = scale.lo; k <= scale.hi; k++) {
      const sh = (sim.hist[k] || 0) / sim.fights, cls = k === sim.need ? "q" : sim.need != null && k < sim.need ? "a" : "b";
      bars.push(`<div class="hb" title="${k} attacks: ${pct(sh, 1)} of fights"><div class="hbar ${cls}" style="height:${Math.round(sh / scale.max * 54)}px"></div><div class="hl${k === sim.need ? " on" : ""}">${lab(k) ? `<span>${k}</span>` : ""}</div></div>`);
    }
    hist = `<div class="hist" aria-hidden="true">${bars.join("")}</div><div class="hcap">fights ending at each attack count · highlighted bar = ${conf}% of fights done by here${scale.solo ? " · own scale (too far from the other setup to share one)" : ""}</div>`;
  }
  const brk = Object.entries(sim.brk || {}).map(([p, v]) => `<span>${p} <b>${v == null ? "—" : v}</b></span>`).join(" · ");
  const t1 = `<div class="tier">
    <div class="row"><span class="hd">${hov("How many attacks to kill", "Attacks_to_kill: simulated fights that repeat this attack, with the same bonuses ticked, until the body is at 0; every shot rolls hit, crit and the part it lands on; destroyed limbs drop out. A comparison number: real battles mix attacks")}</span>${tag(`simulated · ${sim.fights.toLocaleString()} fights · ${spread} · assumes this attack every time`)}</div>
    <div class="big"><span class="n">${sim.need == null ? "1,000+" : sim.need}</span><span class="u">attacks, ${conf}% sure · ${sim.avgKill == null ? "over 1,000" : sim.avgKill.toFixed(1)} attacks on average</span></div>
    ${hist}
    <div class="row tstats"><span class="hd">${hov("Parts broken by", `Attacks_to_break: attacks until each limb is destroyed, ${conf}% sure, while shots also land elsewhere; — = not before the kill`)}</span>${brk} · <span>Body (kill) <b>${sim.need == null ? "1,000+" : sim.need}</b></span></div></div>`;
  // tier 2: one attack
  const seg = (cls, label, v) => v > 0.5 ? `<div class="${cls}" style="flex:${v}" title="${esc(label)} ${fmt(v)}">${esc(label)} ${fmt(v)}</div>` : "";
  const hr = n => nS(R) ? pct(R.expHits / nS(R), 0) : "—", cf = R.crit > 0 ? ` × ${(1 + R.crit * R.critDmg).toFixed(3)} crit` : "";
  const per = T.mode === "focus" ? `${fmt(R.hitAvg, 1)}` : `${fmt(R.hitAvg, 1)} (avg over parts)`;
  // the share that lands differs from the hit chance: the miss-streak bonus lifts it, a hit-by-hit term (Andrea's dodge ramp) moves it
  const hitPH = !!(R.dp && R.segs.some(x => x.terms.some(q => q.f === "hitres" || q.f === "hitrate")));
  const moved = nS(R) > 1 && Math.abs(R.expHits / nS(R) - R.hit) > 0.0005, land = moved && (hitPH || R.TI.comp);
  const landW = !land ? "hit" : hitPH ? `land (${pct(R.hit, 1)} on the first shot; the hits that land${R.TI.comp ? " and the miss-streak bonus" : ""} change it)` : `land (${pct(R.hit, 1)} + miss-streak bonus)`;
  // a structure's rounds each have their own damage per shot: the line counts them and points to their own lines below
  const SR = R.struct && R.struct.steps.length ? R.struct : null;
  const eqs = [SR ? `${O.list.length > 1 ? "without triggers: " : ""}main = ${SR.steps.length} round${SR.steps.length === 1 ? "" : "s"}, ${shotW(nS(R))}, ${hr()} ${landW}; each round's shots and damage per shot are in its line below`
    : `${O.list.length > 1 ? "without triggers: " : ""}main = ${shotW(nS(R))} × ${hr()} ${landW} × ${per}${cf}`];
  if (R.pv) eqs.push(`PV = ${R.pv.shots} shot${R.pv.shots === 1 ? "" : "s"} × ${pct((R.pv.landed != null ? R.pv.landed : R.pv.R.expHits) / R.pv.shots, 0)} ${land ? "land" : "hit"} × ${fmt(R.pv.hitAvg, 1)}`);
  if (R.gusty) eqs.push(`Gusty Strike = ${pct(R.gusty.pAll != null ? R.gusty.pAll : R.gusty.p, 0)} × ${shotW(R.gusty.shots)} × ${fmt(R.gusty.R.hitAvg, 1)}`);
  for (const x of (R.purs && R.purs.list) || []) if (x.pDP > 0.0005) eqs.push(`Flurry Strike (${esc(x.name)}) = ${pct(x.pDP, 0)} × ${shotW(x.shots)} × ${fmt(x.R.hitAvg, 1)}`);
  for (const x of (R.after && R.after.list) || []) if (x.pDP > 0.0005) eqs.push(`${esc(x.name)} = ${x.pDP < 0.9995 ? pct(x.pDP, 0) + " × " : ""}${shotW(x.shots)} × ${fmt(x.R.hitAvg, 1)}`);
  if (R.burnSet) eqs.push(`terrain set off = ${fmt(R.burnNow)}`);
  if (R.afxL && R.afxL.length) eqs.push(`Fixed DMG after the attack = ${fmt(R.afxNow)}: ` + R.afxL.map(x => `${esc(x.n || "")} ${x.t === "scb" ? "Short Circuit set off, " + pct(x.v, 0) + " of each part's max HP"
    : x.t === "mhp" ? pct(x.v, 0) + " of each part's max HP" + (x.pre ? ", before the shots" : "") + (x.keep1 ? " (each part keeps 1 HP)" : "")
      : x.flat ? "the knock-back strike, 1 on one part" : x.t === "bomb" ? fmt(x.val) + " on one part" + (x.hit ? `, ${pct(1 - R.pNone, 0)} sure a hit deals damage` : "") + (x.blk ? " (the knock-back is blocked)" : "") : x.t === "each" ? fmt(x.val) + " on every part" : fmt(x.val) + " shared by the parts"}`).join(" + "));
  if (R.dp && R.segs.some(x => x.terms.length)) {
    const nm = [...new Set(R.segs.flatMap(x => x.terms.map(q => q.n)))];
    eqs.push(`hit by hit: ${esc(nm.join(", "))} change${nm.length === 1 ? "s" : ""} shot by shot (Breakdown → Hit by hit); the damage per shot in these lines is before ${nm.length === 1 ? "it" : "them"}`);
  }
  const xpOn = O.list.find(o => xpsAll(o.R).length);
  if (xpOn) {
    const XL = xpsAll(xpOn.R).filter((x, j, L) => L.findIndex(y => y.n === x.n) === j);
    eqs.push(XL.map(x => `${esc(x.n)} = ${pct(O.list.filter(o => xpsAll(o.R).some(y => y.n === x.n)).reduce((a, o) => a + o.p, 0), 0)} × ${xpOn.R.expHits.toFixed(2)} hits × ${x.t === "ec" || x.t === "ecs" ? `${pct(x.v, 0)} of srcAtk ${fmt(x.v * R.srcAtk, 1)}` : `${pct(x.v, 0)} of each hit`} ${x.t === "coll" ? `on ${x.parts === 3 ? "each other standing part" : x.parts === 1 ? "1 other part" : x.parts + " other parts"}` : x.t === "ecs" ? "on the part hit" : x.t === "rd" ? "on any standing part" : "on another part"}`).join(" · "));
  }
  const bl = (O.blended || []).map(k => D.components[raId(k)] ? D.components[raId(k)].n + (raId(k) !== k ? ` (${k.slice(0, 2)})` : "") : "a chance effect");
  const wr = (O.list.length > 1 ? `<div class="eqline">accessory triggers averaged in: ${esc(ras)}</div>` : "")
    + (bl.length ? `<div class="eqline">too many triggers to roll one by one: ${esc(shortList(bl))} ${bl.length === 1 ? "is" : "are"} counted at ${bl.length === 1 ? "its" : "their"} chance × ${bl.length === 1 ? "its" : "their"} effect (the ones that change this attack least); Attacks to kill doesn't roll ${bl.length === 1 ? "it" : "them"}</div>` : "");
  const t2 = `<div class="tier">
    <div class="row"><span class="hd">${hov("One attack, on average", "Avg_DMG_per_attack: calculated (not rolled); every hit, crit and trigger chance multiplied in; damage to the whole unit with all parts standing")}</span>${tag("calculated · all hit, crit and trigger chances included")}</div>
    <div class="big"><span class="n">${fmt(O.exp)}</span><span class="u">damage per attack · ${shotsText(O)}</span>${id === "B" && other ? d(O.exp, other.exp) : ""}</div>
    <div class="stack">${seg("s1", R.struct && R.struct.steps.length ? (R.struct.steps[0].kind === "lock" ? "Lock-ons" : "Main round") : "Main round", mainE + (R.struct && R.struct.steps.length && R.struct.steps[0].kind === "lock" ? kE.lock : 0))}${Object.entries(KW).map(([k, l]) => R.struct && R.struct.steps.length && R.struct.steps[0].kind === "lock" && k === "lock" ? "" : seg("s6", l, kE[k])).join("")}${seg("s2", "PV", pvE)}${seg("s3", "Gusty Strike", gE)}${seg("s7", "Flurry Strike", fE)}${seg("s8", "After combat", aE + cE)}${seg("s4", "Terrain set off", bE)}${seg("s5", xpName(O), xE)}</div>
    <div class="eqline">${eqs.join(" · ")}</div>${wr}
    <div class="row"><span class="hd">${hov("An unlucky attack", `Worst_${sim.tail}%_avg: the average of the worst ${sim.tail}% of 4,000 simulated single attacks (follows the certainty slider)`)}</span><span class="v2">${fmt(sim.worst)}</span><span class="hd">${Math.round(sim.worstPct * 100)}% of average</span>${tag(`simulated · worst ${sim.tail}% of 4,000 attacks`)}</div></div>`;
  // tier 3: one hit
  const R1 = firstR(R), limbs = ["Left arm", "Right arm", "Legs"], same = limbs.every(p => Math.abs(R1.shotBy[p] - R1.shotBy["Left arm"]) < 0.05);
  const hitCell = (lbl, p) => `<div><div class="hd">${hov(lbl, `DMG_per_shot_${p === "Body" ? "body" : "limb"}: one shot that lands on the ${p.toLowerCase()}, no crit, weighted accessories not triggered`)}</div><div class="v2">${fmt(R1.shotBy[p])}</div><div class="meta">crit ${fmt(R1.shotBy[p] * (1 + R1.critDmg))} · armor ${fmt(R1.armorBy[p], 1)}</div></div>`;
  const t3 = `<div class="tier">
    <div class="row"><span class="hd">One hit${R1 !== R ? ` (first round: ${esc(R1.sk.sn || bdSkill(R1))})` : ""}</span>${tag("calculated · the shot lands, no crit")}</div>
    <div class="hits">${same ? hitCell("On a limb", "Left arm") : limbs.map(p => hitCell("On the " + p.toLowerCase(), p)).join("")}${hitCell("On the body", "Body")}
      <div><div class="hd">${hov("Hit chance", "FinalHit_chance")}</div><div class="v2">${pct(R.hit)}</div><div class="meta">game shows ${gameHitPct(R.hitReal != null ? R.hitReal : R.hit)}%${R.defl > 0 && !R.udg && R.hit < 1 ? ` · a miss still deals ${pct(R.defl, 0)} of a plain shot (deflect)` : ""}${R.amiss && !R.udg ? ` · every shot misses: it dodges them all (${esc(R.missSrc.join(", "))})` : R.udg ? ` · every shot hits: it can't be dodged (${esc(R.udgSrc.join(", "))})` : R.hitReal != null && R.hitReal < R.hit && R.hit >= 1 ? ` · every shot hits: a sure hit at ${pct(R.hitThrAt != null ? R.hitThrAt : R.hitThr, 0)} hit chance or more (${esc(contribN(R, "hthr").join(", ") || "your setup")})` : hitPH && moved ? ` · on the first shot; ${pct(R.expHits / nS(R), 0)} of shots land, as it changes with ${R.segs.some(x => x.terms.some(q => q.kind !== "hpd" && (q.f === "hitres" || q.f === "hitrate"))) ? "the hits that land" : "the target's HP"} (Breakdown → Hit by hit)` : R.TI.comp && nS(R) > 1 ? ` · ${pct(R.expHits / nS(R), 0)} of shots land, with the miss-streak bonus` : ""}</div></div>
      <div><div class="hd">${hov("Crit chance", "FinalCrit_chance")}</div><div class="v2">${pct(R.crit)}</div><div class="meta">game shows ${Math.round(R.crit * 100)}%</div></div></div></div>`;
  const allBurn = PARTS.reduce((a, p) => a + R.burn[p], 0);
  // (the skill and the weapon named apart, so a weapon's own '- EX' doesn't read as the skill's version; the attack's
  // other versions, with what each needs and where that is set)
  const vh = verHints(R);
  el.innerHTML = `<div class="meta">${R.s.atk.skill === "normal" ? esc(bdSkill(R)) : "Skill: " + esc(bdSkill(R))} · weapon: ${esc(R.W.n)} · ${spread}</div>${vh.map(t => `<div class="meta">${esc(t)}</div>`).join("")}${t1}${t2}${t3}
  ${R.pv ? `<div class="tstats"><span>Peripheral Vision <b>${fmt(pvE)}</b> per attack</span>
    <span>${R.pv.shots} shots × ${perPart(R.pv.shotBy, R.pv.critDmg)} · ${esc(R.pv.R.W.n)} (other arm), SplashFactor ${R.pv.SF.toFixed(2)}</span></div>` : ""}
  ${R.gusty ? `<div class="tstats"><span>Gusty Strike <b>${fmt(gE)}</b> per attack</span>
    ${(R.gusty.list || [R.gusty]).map(G => `<span>${G.mode === "chance" ? pct(G.p, 0) + " chance" : G.mode === "on" ? (G.p ? "triggered" : "not triggered: another source fires") : "not triggered"} · ${shotW(G.shots)} × ${perPart(G.R.shotBy, G.R.critDmg)} · ${esc(G.c.n)}${G.slot !== R.atkSlot ? ` (${esc(G.R.W.n)}, the other arm)` : ""}, SkillM ${G.skillM.toFixed(2)}</span>`).join("")}</div>` : ""}
  ${structHtml(R, O)}
  ${followHtml(R, O)}
  ${R.burnSet ? `<div class="tstats"><span>${esc(bdSkill(R))} sets off the terrain right after the attack: <b>${fmt(allBurn)}</b> on all parts</span></div>` : ""}
  ${R.burnT ? `<div class="tstats"><span>+ Burning Terrain tick every enemy turn <b>${fmt(allBurn)}</b> on all parts (body ${fmt(R.burn.Body)})</span>
    <span>Attack + terrain per round <b>${fmt(O.exp + (T.mode === "focus" ? R.burn[T.part] : allBurn))}</b></span></div>` : ""}
  <div class="meta">srcAtk ${fmt(R.srcAtk, 1)} · Pilot_atr (${esc(shownAttr(R.attr))}) ${fmt(R.attribute)} vs eDef ${fmt(R.tg.def)} · body ${fmt(sim.hp)} HP${ras ? " · trigger chance: " + esc(ras) : ""}</div>`;
}
/* the structure's rounds in words: one line per round (runs of the same round merged), with its expected damage per attack */
const KIND_W = { hand2: "Second hand", slot: "Extra slot", lock: "Lock-on", xhit: "Follow-up hit" };
/* a segment's p x exp averaged over the trigger outcomes (the bars' basis); the setup itself when there is one outcome */
const segAvg = (R, O, j) => {
  const L = O && O.list.length > 1 ? O.list : [{ p: 1, R }];
  return L.reduce((a, o) => { const d = o.R.dp && o.R.dp.segs[j]; return a + (d ? o.p * d.p * d.exp : 0); }, 0);
};
/* the first round of the cast when it is another skill row than the one cast (Symphony of Tokamak: Blaze Howl): what One hit shows */
const firstR = R => { const y = R.struct && R.struct.steps.length && R.struct.steps[0].streams[0]; return y && y.sub && y.R && y.R !== R ? y.R : R; };
function structLines(R, O) {
  const S = R.struct; if (!S || !S.steps.length || !R.dp) return [];
  const out = [];
  S.steps.forEach((x, j) => {
    const d = R.dp.segs[j], dE = segAvg(R, O, j);
    const ws = x.streams.map(y => `${y.R.W.n} (${SLOTW[y.slot] || y.slot})`).join(" / ");
    // (each round's damage per shot, as the overview's line above it says)
    const sh = x.streams.length > 1 ? `${x.streams.map(y => y.n).join(" + ")} shots alternating (${x.streams.map(y => `${perTxt(y.R)} ${SLOTW[y.slot] || y.slot}`).join("; ")})`
      : `${shotW(x.streams[0].n)}, ${perTxt(x.streams[0].R)}`;
    const skm = [...new Set(x.streams.map(y => y.R.skillM.toFixed(2)))].join(" / "), sn = x.streams[0].R.sk.sn;
    const nm = stepName(x);
    const rep = x.streams.find(y => y.anpc) ? ` · a repeat on the same target: ×${(1 + x.streams.find(y => y.anpc).anpc).toFixed(2)} damage` : "";
    const cl = x.streams.some(y => (y.R.xps || []).some(q => q.t === "coll")) ? " · its Collateral DMG on the other parts included" : "";
    const txt = `${sh} · ${ws}, SkillM ${skm}${sn && sn !== bdSkill(R) ? ` (${sn})` : ""}${rep}${cl}${x.gate === "anyHit" ? ` · only when the main round lands (${pct(d.p, 0)})` : ""}`;
    const last = out[out.length - 1];
    if (last && last.txt === txt && last.kind === x.kind) { last.k++; last.e += dE; last.nm2 = nm; last.js.push(j); }
    else out.push({ nm, nm2: null, k: 1, e: dE, txt, kind: x.kind, js: [j] });
  });
  return out.map(r => ({ ...r, name: r.k > 1 ? (/ \d+$/.test(r.nm) ? `${r.nm}–${r.nm2.match(/\d+$/)[0]}` : `${r.nm} ×${r.k}`) : r.nm }));
}
/* Flurry Strike and after-combat strikes in words: one line each with its chance after priority and Gusty Strike */
/* a follow-up's damage per attack averaged over the trigger outcomes (the bars' basis) */
const folAvg = (R, O, kind, i) => {
  const L = O && O.list.length > 1 ? O.list : [{ p: 1, R }];
  return L.reduce((a, o) => { const y = ((o.R[kind] && o.R[kind].list) || [])[i]; return a + o.p * ((y && y.exp) || 0); }, 0);
};
function followHtml(R, O) {
  const P = R.purs, A = R.after, out = [], pG = R.gusty ? (R.gusty.pAll != null ? R.gusty.pAll : R.gusty.p) : 0;
  if (P) {
    for (const x of P.list) {
      const q = P.mode === "off" ? 0 : P.mode === "on" ? 1 : x.q, gw = x.gate ? `, ${GATE_W[x.gate]}` : "";
      const why = P.mode === "off" ? "set to not triggered" : P.post && P.ctr && !P.armOK ? "the firing arm doesn't survive the retaliation"
        : `${pct(q, 0)}${P.prate ? ` (incl. ${pct(P.prate, 0)} chance bonus)` : ""}${gw}${P.list.indexOf(x) ? " after the higher-priority ones" : ""}${pG ? ` × (1 − ${pct(pG, 0)} Gusty Strike)` : ""} = ${pct(x.pDP || 0, 1)}`;
      out.push(`<span>Flurry Strike (${esc(x.name)}) <b>${fmt(folAvg(R, O, "purs", P.list.indexOf(x)))}</b> per attack · ${why} · ${shotW(x.shots)} × ${perPart(x.R.shotBy, x.R.critDmg)} · ${esc(x.R.W.n)}${x.slot !== R.atkSlot ? " (the other arm)" : ""}, SkillM ${x.R.skillM.toFixed(2)}</span>`);
    }
    for (const x of P.skip) out.push(`<span class="meta">Flurry Strike (${esc(x.name)}): doesn't fire here, ${esc(x.why)}.</span>`);
    if (P.pre && P.list.length) out.push(`<span class="meta">A buff moves Flurry Strike before the target's retaliation (as a Gusty Strike): the firing arm needn't survive it.</span>`);
  }
  if (A) {
    for (const x of A.list) out.push(`<span>${esc(x.name)} <b>${fmt(folAvg(R, O, "after", A.list.indexOf(x)))}</b> per attack · after the attack, a strike of its own${x.gate ? ` ${GATE_W[x.gate]} (${pct(x.pDP || 0, 0)})` : ""} · ${shotW(x.shots)} × ${perPart(x.R.shotBy, x.R.critDmg)} · ${esc(x.R.W.n)}, SkillM ${x.R.skillM.toFixed(2)}${x.line ? " · along your attack's line, counted on this target" : x.area ? " · an area strike, counted on this target" : ""}</span>`);
    for (const x of A.skip) out.push(`<span class="meta">${esc(x.name)}: not counted, ${esc(x.why)}.</span>`);
  }
  return out.length ? `<div class="tstats">${out.join("")}</div>` : "";
}
const stepName = x => x.kind === "main" && !x.label ? (x.streams.length > 1 ? "Both weapons in one round" : "Main round") : x.label || KIND_W[x.kind] || "Round";
function structHtml(R, O) {
  const L = structLines(R, O), S = R.struct;
  const notes = [...((S && S.notes) || []), ...((R.plan && !R.struct && R.plan.notes) || [])];
  if (R.avgR) notes.unshift(`Two-hand average: shoots at the mean of both hands' srcAtk ${fmt(R.srcAtk1, 1)} / ${fmt(R.avgR.srcAtk1, 1)} = ${fmt(R.srcAtk, 1)}, and their mean hit and crit numbers.`);
  if (!L.length && !notes.length) return "";
  return `<div class="tstats">${L.map(r => `<span>${esc(r.name)} <b>${fmt(r.e)}</b> per attack · ${esc(r.txt)}</span>`).join("")}${notes.map(n => `<span class="meta">${esc(n)}</span>`).join("")}</div>`;
}
function renderSrc(id, R) {
  if (!R) { $(id + "-src").innerHTML = ""; return; }
  const a = shownAttr(R.attr), row = (l, v, n, scr, bat, cls) => `<tr class="${cls || ""}"><td>${l}${n ? `<div class="note">${n}</div>` : ""}</td><td class="num">${scr}</td><td class="num">${bat}</td><td class="num">${v}</td></tr>`;
  let h = `<table><tr><td class="lbl">${esc(a)} for ${esc(R.W.tn)}</td><td class="num lbl">Screen</td><td class="num lbl">Battle</td><td class="num lbl">Value</td></tr>
  ${row(`Lv${R.s.base && R.s.baseStar === R.s.star ? R.s.plvl : 70} base at potential ${R.s.star}`, fmt(baseOf(R.s, R.star)[R.attr], 1), "", "yes", "yes")}
  ${row("Bionic Computer neurons (all but capacity)", "+" + fmt(R.P.bionic[R.attr]), "", "yes", "yes")}
  ${row("Chips (attribute)", "+" + fmt(R.chipAttr), R.chipInferred ? "worked out from your screen value, assuming a full R&D tree" : R.chipKnown ? "from Chip Bonus" : "none entered", "yes", "yes")}
  ${row("R&D nodes (full tree)", `+${fmt(R.rdFlat)} · +${pct(R.rdPct, 0)}`, "", "yes", "yes")}
  ${row("Potential", "+" + pct(R.star.bonus, 0), "+2% per level", "yes", "yes")}
  ${row("Screen value", fmt(R.screen), R.entered ? (R.chipInferred ? "you entered it" : `you entered ${fmt(R.entered)}; calculated ${fmt(R.predicted)}`) : "calculated (no value entered)", "", "", "total")}
  ${row("Battle-only % (features, passives, skills)", "+" + pct(R.bPct, 1), "", "no", "yes")}
  ${R.bFlat ? row("Battle-only flat", (R.bFlat < 0 ? "−" : "+") + fmt(Math.abs(R.bFlat)), "", "no", "yes") : ""}
  ${row(`${esc(a)} in battle`, fmt(R.attribute, 1), "", "", "", "total")}</table>`;
  if (R.chipInferred) h += `<div class="meta">Enter the ${esc(a)} line from your Chip Bonus screen to check your R&amp;D instead.</div>`;
  if (R.implied != null) {
    const diff = R.implied - R.rdFlat;
    h += `<div class="${Math.abs(diff) > 60 ? "warnline" : "meta"}">From your screen value, R&amp;D adds about ${fmt(R.implied)} flat ${esc(a)}; a full ${esc(R.P.class || "")} tree adds ${fmt(R.rdFlat)}.
    ${Math.abs(diff) > 60 ? (diff < 0 ? "Your R&D for this class looks incomplete, or a chip value is missing." : "More than a full tree: check the chip values.") : "That matches a full tree."}</div>`;
  }
  $(id + "-src").innerHTML = h;
}
/* the whole-number hit % the game shows (StringFormatUtil.RoundingHitRate): cut down, 99.x shows 99, 0.x shows 1 */
const gameHitPct = p => { const v = p * 100; return v < 100 && v > 99 ? 99 : v > 0 && v < 1 ? 1 : Math.floor(v + 1e-9); };
/* where a stat's total comes from: R&D, each active bonus row, mid-fight bonuses */
// the rows that give a field (names only)
const contribN = (R, f) => [...new Set(R.rows.filter(row => row.effs.some(x => x.act && !x.dup && x.e.f === f)).map(row => row.src.label.replace(/^[^:]+: /, "")))];
function contrib(R, f, asPct) {
  const show = v => asPct ? pct(v, 1) : fmt(v, f === "skillM" ? 2 : 0);          // a skill multiplier bonus reads 0.15, not 0
  const parts = [];
  if (R.rdBy && R.rdBy[f]) parts.push(`R&D ${show(R.rdBy[f])}`);
  if (f === "dmgB" && R.ovp && R.ovp.b) parts.push(`${R.ovp.n || "surplus ST Power"} (Power ${fmt(R.ovp.P)} − Weight ${fmt(R.ovp.W)}) ${show(R.ovp.b)}`);
  const xk = { dmgB: 100, finalB: 100, hitrate: 100, crit_fin: 100, crit_dmg: 100, skillM: 1, shots: 1 }[f];
  if (xk && R.s.extra[f]) parts.push(`extra bonus ${show(R.s.extra[f] / xk)}`);
  for (const row of R.rows) {
    const v = row.effs.filter(x => x.act && !x.dup && !x.dyn && !x.ph && x.e.f === f).reduce((a, x) => a + (x.val != null ? x.val : effVal(R.s, row.src, x.e)), 0);
    if (v) parts.push(`${row.src.label.replace(/^[^:]+: /, "")} ${show(v)}`);
  }
  for (const q of R.bossYou || []) if (q.f === f) parts.push(`target's ${q.n} ${show(q.v)}`);    // put on you by the boss you attack
  for (const q of R.bossTgt || []) if (q.f === f) parts.push(`its ${q.n} ${show(q.v)}`);          // its own dodge / crit resist rows
  return parts;
}
/* the breakdown: one section per result, in the terms of the wiki page How the bench works */
const bdTerms = rows => `<table class="terms">${rows.filter(Boolean).map(([t, v, s, cls]) =>
  `<tr class="${cls || ""}"><td class="t">${t}</td><td class="v">${v}</td><td class="s">${s || ""}</td></tr>`).join("")}</table>`;
const bdSec = (title, result, eqs, body, notes) => `<div class="bdsec"><h4>${title}<span class="r">${result}</span></h4>
${eqs.map(([f, n]) => `<div class="eq">${f}${n ? `<br><span class="n">${n}</span>` : ""}</div>`).join("")}
${body}${notes && notes.length ? `<div class="bn">${notes.map(x => `<div>${x}</div>`).join("")}</div>` : ""}</div>`;
/* sources of a stat other than R&D, as "name +value" */
const bdSrc = (R, f, asPct) => contrib(R, f, asPct).filter(x => !x.startsWith("R&D ")).join(" + ") || "none";
function bdAttack(R) {
  const g = R.g, rd = R.rdBy || {};
  const atkWep = R.W.atk + R.impr + R.advAtk, atkRD = rd.atk_add || 0, atkBonus = g("atk_add") - atkRD;
  const fpRD = rd.fp_add || 0, fpBonus = g("fp_add") - fpRD, fpPctRD = rd.fp_pct || 0, fpPctBonus = g("fp_pct") - fpPctRD;
  const coeff = 1 + R.W.fvm, suit = 1 + R.suit.atk, rank = D.suit[String(R.star.rank)].n;
  const perPart = PARTS.map(p => fmt(partFpAt(R.s, R.st, p), 2) + (partLv(R.s, p) < 70 ? ` (Lv${partLv(R.s, p)})` : ""));
  const f2 = v => fmt(v, 2), p1 = v => pct(v, 1);
  // info only (read by nothing): srcAtk without ATK_bonus and FP_bonus (WEPdeployed), and also without FP%_bonus
  // (WEPoverview), each divided by the weapon's own Nshots_base (its Normal Attack's shots)
  const wN = (normalOf(R.W) || {}).h || R.W.shots || R.baseShots || 1, fpBase = (R.partFp + fpRD) * coeff;
  const wepOv = (atkWep + atkRD + fpBase * (1 + fpPctRD)) * (1 + g("atk_pct")) * suit / wN;
  const wepDp = (atkWep + atkRD + fpBase * (1 + fpPctRD + fpPctBonus)) * (1 + g("atk_pct")) * suit / wN;
  return bdSec("Weapon attack", "srcAtk " + fmt(R.srcAtk, 2), [
    ["srcAtk = (ATK_wep + ATK_bonus + ATK_RD + ATK_FP) × (1 + ATK%) × Suit_coeff",
      `= (${fmt(atkWep)} + ${fmt(atkBonus)} + ${fmt(atkRD)} + ${fmt(R.fpEff, 1)}) × ${(1 + g("atk_pct")).toFixed(3)} × ${suit.toFixed(3)} = ${f2(R.srcAtk)}`],
    ["ATK_FP = (FP_parts + FP_bonus + FP_RD) × Wep_coeff × (1 + FP%_RD + FP%_bonus)",
      `= (${f2(R.partFp)} + ${fmt(fpBonus)} + ${fmt(fpRD)}) × ${coeff.toFixed(4)} × (1 + ${fpPctRD.toFixed(3)} + ${fpPctBonus.toFixed(3)}) = ${fmt(R.fpEff, 1)}`]],
    bdTerms([
      ["ATK_wep", fmt(atkWep), `${esc(R.W.n)}: base ${fmt(R.W.atk)} + improvement ${R.impr} (${R.rdEd && R.rdEd.impr === "save" ? "your unit's" : R.rdEd && R.rdEd.impr ? "your value" : "max"}) + advanced ATK ${R.advAtk}`],
      ["ATK_bonus", fmt(atkBonus), esc(bdSrc(R, "atk_add")) + " (this weapon's own rolls and passives)"],
      ["ATK_RD", fmt(atkRD), rdTag(R, "atk_add", esc(R.W.tn))],
      ["ATK_FP", fmt(R.fpEff, 1), "attack from firepower, worked out below", "sum"],
      ["ATK%", p1(g("atk_pct")), esc(bdSrc(R, "atk_pct", true))],
      ["Suit_coeff", suit.toFixed(3), `${esc(R.P.name)} potential ${R.s.star} → ${esc(rank)} (the game's label for this rank is a fixed % and isn't used in the math)`],
      ["FP_parts", f2(R.partFp), `${esc(R.st.n)}: ${perPart.join(" + ")} (body, arms, legs at their grade)`],
      ["FP_bonus", fmt(fpBonus), esc(bdSrc(R, "fp_add"))],
      ["FP_RD", fmt(fpRD), rdTag(R, "fp_add", esc(R.st.cls) + " ST")],
      ["Wep_coeff", coeff.toFixed(4), `${esc(R.W.tn)}: 1 + FireValueMulti (${R.W.fvm.toFixed(4)}), the share of FP this weapon type turns into attack`],
      ["FP%_RD", p1(fpPctRD), rdTag(R, "fp_pct")],
      ["FP%_bonus", p1(fpPctBonus), esc(bdSrc(R, "fp_pct", true))]]),
    [`Weapon side: ATK_wep + ATK_bonus + ATK_RD = ${fmt(atkWep)} + ${fmt(atkBonus)} + ${fmt(atkRD)} = ${fmt(atkWep + atkBonus + atkRD)}, vs ATK_FP ${fmt(R.fpEff, 0)}: ${R.fpEff > atkWep + atkBonus + atkRD ? "firepower (ST grade, FP rolls) is the bigger share" : "the weapon side (weapon, its rolls, R&D) is the bigger share"} of this weapon's attack.`,
      "srcAtk is the attack value the game uses for each shot.",
    `<span class="wepv">WEPoverview = ${f2(wepOv)}</span> <span class="n">(srcAtk without ATK_bonus, FP_bonus and FP%_bonus, ÷ Nshots_base ${wN})</span>`,
    `<span class="wepv">WEPdeployed = ${f2(wepDp)}</span> <span class="n">(srcAtk without ATK_bonus and FP_bonus, ÷ Nshots_base ${wN})</span>`]);
}

/* armor and one shot's damage on a given part (same rules as outcomes()) */
function bdArmor(R, part) {
  const raw = R.tg.armor_base ? R.tg.armor_base[part] : R.tg.armor[part] / (1 + R.amul), cuts = R.armorPct.all + R.armorPct[part];
  return { raw, cuts, armor: Math.max(0, raw * (1 + R.amul + cuts - (R.s.extra.shred || 0) / 100)) };
}
const bdShot = (R, part) => Math.max(1, Math.max(0, R.perBefore - bdArmor(R, part).armor / 10) * R.Kp(part, H_START()));
/* the target's damage-taken terms that count on a shot at this part (at the target HP slider), as "name +x%" */
// (a term the same on all four parts, with the same value and conditions, reads "(all parts)", not the part shown)
const tAll = (R, q) => !!q.part && PARTS.every(p => R.tterm.some(y => y.f === q.f && y.part === p && y.n === q.n && y.src === q.src && !!y.boss === !!q.boss && y.v === q.v
  && JSON.stringify(y.c) === JSON.stringify(q.c)));
const tTerms = (R, f, part) => R.tterm.filter(q => q.f === f && (q.part == null || q.part === part) && q.c.every(c => partCond(c, part, H_START()) === true))
  .map(q => `${q.boss ? "target: " : ""}${q.n}${q.part ? " (" + (tAll(R, q) ? "all parts" : q.part.toLowerCase()) + ")" : ""} ${pct(q.v, 1)}`);
function bdPilot(R) {
  const a = esc(shownAttr(R.attr)), x = (R.r - 1 / R.r) / 1.5;
  return bdSec("Attribute vs Defense", "AtrDef_coeff ×" + R.pmult.toFixed(4), [
    ["AtrDef_ratio = Pilot_atr ÷ eDef", `= ${fmt(R.attribute)} ÷ ${fmt(R.tg.def)} = ${R.r.toFixed(4)}`],
    ["AtrDef_coeff = 1 + ⅔ × atan((AtrDef_ratio − 1/AtrDef_ratio) ÷ 1.5) ÷ (π/2)", `= 1 + ⅔ × atan(${x.toFixed(4)}) ÷ 1.5708 = ${R.pmult.toFixed(4)}`]],
    bdTerms([
      ["Pilot_atr", fmt(R.attribute, 1), `${a} in battle (pilot screen value + battle-only bonuses; see “Where your numbers come from”)`],
      ["eDef", fmt(R.tg.def), `${esc(R.tg.boss)}: Defense incl. its own buffs`],
      ["AtrDef_ratio", R.r.toFixed(4), ""],
      ["AtrDef_coeff", R.pmult.toFixed(4), "", "sum"]]),
    ["Equal Pilot_atr and eDef give 1.0; it runs from 0.333 to 1.667."]);
}
function bdArmorSec(R) {
  const A = bdArmor(R, T.part), cutSrc = [];
  for (const row of R.rows) for (const x of row.effs)
    if (x.act && !x.dup && !x.ph && x.e.f === "armor_pct" && (!x.e.part || x.e.part === T.part))
      cutSrc.push(`${row.src.label.replace(/^[^:]+: /, "")} ${pct(-effVal(R.s, row.src, x.e), 1)}`);
  if (R.s.extra.shred) cutSrc.push(`extra bonus ${R.s.extra.shred}%`);
  const later = [...new Set(R.rows.flatMap(row => row.effs.filter(x => x.act && !x.dup && x.ph && x.e.f === "armor_pct" && (!x.e.part || x.e.part === T.part))
    .map(x => row.src.label.replace(/^[^:]+: /, ""))))];                     // cuts that grow with the hits that land: shot by shot, not in this sum
  const shred = -A.cuts + (R.s.extra.shred || 0) / 100;
  return bdSec(`Target armor · ${T.mode === "focus" ? esc(T.part.toLowerCase()) : "a limb (shots scatter; body " + fmt(R.armorBy.Body, 1) + ")"}`, "eArmor " + fmt(A.armor, 1), [
    ["eArmor = eArmor_base × (1 + eArmorBuff% − ArmorShred%)",
      `= ${fmt(A.raw, 1)} × (1 + ${R.amul.toFixed(3)} − ${shred.toFixed(3)}) = ${fmt(A.armor, 1)}  ·  eArmor ÷ 10 = ${fmt(A.armor / 10, 1)}`]],
    bdTerms([
      ["eArmor_base", fmt(A.raw, 1), `${esc(R.tg.boss)} ${T.mode === "focus" ? esc(T.part.toLowerCase()) : "limb"} at its level and grade, before buffs (vision *_armor_base; shown with buffs ${fmt(R.tg.armor[T.part], 1)})`],
      ["eArmorBuff%", pct(R.amul, 1), "target's own buffs (already in its shown armor)"],
      ["ArmorShred%", pct(shred, 1), esc((cutSrc.join(" + ") || "none") + (later.length ? ` (${later.join(", ")}: grows with each hit that lands, see Hit by hit)` : ""))],
      ["eArmor", fmt(A.armor, 1), "the part's armor the game uses for the shot", "sum"]]),
    [`All armor % add into one sum, each counted once; it stops at 0. Each part has its own armor: body ${fmt(bdArmor(R, "Body").armor, 1)}, limbs ${fmt(bdArmor(R, "Left arm").armor, 1)}.`]);
}
const bdSkill = R => R.sk.n === "Normal Attack (Normal Attack)" ? "Normal Attack" : R.sk.vn || R.sk.n;
/* InGameDMGPreview (info only, read by nothing): the game's attack preview, 'Attack W+G×N'. The game works it out with the
   same per-shot formula (ActorActiveSkillAttackBase.CalcFinalDamage4PreviewWithEquipment: CalcDmgPerAttack / CalcFinalDamage)
   after adding only the attacking skill's own before / after-cast buffs (SkillPipeLinePreviewStart -> AttachPreviewBuf), so what is attached
   when the attack starts (your armor cuts, Kagutsuchi's target-terrain DMG, Assault Weapon modification ...; walk tag pv) and accessory
   triggers are not in it. On the body; white = (srcAtk × AtrDef_coeff ÷ Nshots_base − armor ÷ 10) × SkillM × (1 + DMG%), green = white ×
   FinalDMG%, × the shots; rounded (e.g. in-game 1165+175×9 on Flame terrain, 1089+163×8 off). Standard attacks only:
   the game has its own preview for two-hand, area, multi-round and structured attacks */
function previewOf(R) {
  if (!R || R.avgR || R.areaN || (R.sk && R.sk.st) || (R.rounds || 1) > 1 || R.s._xatk) return null;
  let P; try { P = compute({ ...R.s, _pv: 1 }); } catch (e) { return null; }
  if (!P || P.perBefore == null) return null;
  const full = bdShot(P, "Body"), fin = P.g("finalB"), white = full / Math.max(1e-9, 1 + fin);
  return { w: Math.round(white), gr: Math.round(full - white), n: P.nShots, hit: P.hit, crit: P.crit };
}
function bdDamage(R) {
  const g = R.g, parts = ["Body", "Left arm", "Right arm", "Legs"];
  const per = {}; for (const p of parts) per[p] = bdShot(R, p);
  const limb = (per["Left arm"] + per["Right arm"] + per["Legs"]) / 3, avg = parts.reduce((a, p) => a + per[p], 0) / 4;
  const cm = 1 + R.critDmg, A = bdArmor(R, T.part), H0 = H_START(), dbp = R.dB(T.part, H0), npc = R.npcF(T.part, H0), shf = (R.shF || {})[T.part] || 1;
  const skillSrc = [`${esc(bdSkill(R))} ${R.sk.m.toFixed(2)}`].concat(contrib(R, "skillM").map(esc)).join(" + ");
  const shotLine = R.shots !== R.baseShots ? `; fires Nshots = ${R.shots}` + ((R.rounds || 1) > 1 ? ` (${R.rounds} rounds of ${R.shots / R.rounds})` : ` (base ${R.baseShots} + shot adds)`) : "";
  return bdSec("Damage per shot", (T.mode === "focus" ? "DMG_per_shot " : "DMG_per_shot_limb ") + fmt(R.shot, 1), [
    [`DMG_per_shot = (srcAtk × AtrDef_coeff ÷ Nshots_base − eArmor ÷ 10) × SkillM × (1 + DMG%)${npc !== 1 ? " × (1 + eDMGFactor%)" : ""} × (1 + FinalDMG%)${shf !== 1 ? " × (1 + ShieldCut%)" : ""} × (1 + CritDMG%) [crit only]`,
    `= (${fmt(R.srcAtk, 2)} × ${R.pmult.toFixed(4)} ÷ ${R.baseShots} − ${fmt(A.armor / 10, 1)}) × ${R.skillM.toFixed(2)} × ${Math.max(0, 1 + dbp).toFixed(3)}${npc !== 1 ? " × " + npc.toFixed(3) : ""} × ${(1 + g("finalB")).toFixed(3)}${shf !== 1 ? " × " + shf.toFixed(2) : ""} = ${fmt(R.shot, 1)}  ·  crit × ${cm.toFixed(2)} = ${fmt(R.shotCrit, 1)}`]],
    bdTerms([
      ["Nshots_base", R.baseShots, R.areaN ? `${esc(bdSkill(R))} is an area attack: one shot on each of the target's 4 parts, so the divisor is 4 and shot bonuses don't add shots${shotLine}`
        : `${esc(bdSkill(R))}: the skill's base shot count, the divisor${shotLine}`],
      ["SkillM", R.skillM.toFixed(2), skillSrc],
      ["DMG%", pct(dbp, 1), esc([...contrib(R, "dmgB", true), ...tTerms(R, "dmgB", T.part)].join(" + ") || "none") +
        (T.mode === "focus" ? "" : " (on a limb; per part below)")],
      ...(npc !== 1 ? [["eDMGFactor%", pct(npc - 1, 1), esc(tTerms(R, "npcB", T.part).join(" + ")) + ": the target's own damage factor, a separate (1 + x) (DefenderNpcDamgeMulti)"]] : []),
      ["FinalDMG%", pct(g("finalB"), 1), esc(contrib(R, "finalB", true).join(" + ") || "none")],
      ...(R.shd ? [["ShieldCut%", pct((R.shd.f || 0), 0), `shots on its ${esc(R.shd.arm.toLowerCase())} (${esc(R.shd.n)}): a separate (1 + x)${shf === 1 ? (T.part === R.shd.arm ? "; this attack gets past it" : "; not on this part") : ""}`]] : []),
      ["CritDMG%", pct(R.critDmg, 1), `weapon ${pct(R.W.crit_dmg, 0)}` + (g("crit_dmg") ? " + " + esc(contrib(R, "crit_dmg", true).join(" + ")) : "") +
        (R.critT ? ` + target crit DMG taken ${pct(R.critT, 0)}` : "")]]) +
    `<div class="sub">By part (no crit · crit)</div>` +
    bdTerms([
      ["DMG_per_shot_body", fmt(per.Body, 1), `crit ${fmt(per.Body * cm, 1)} · armor ${fmt(bdArmor(R, "Body").armor, 1)}`],
      ["DMG_per_shot_limb", fmt(limb, 1), `crit ${fmt(limb * cm, 1)} · armor ${fmt(bdArmor(R, "Left arm").armor, 1)}`],
      ["DMG_per_shot_anyPart", fmt(R.hitAvg, 1), `crit ${fmt(R.hitAvg * cm, 1)} · ${T.mode === "focus" ? "focus: " + esc(T.part.toLowerCase()) + " only" : "this attack's part weights: " + PARTS.map(p => `${p.toLowerCase()} ${pct(R.wts[p], 0)}`).join(", ")} (all parts standing)`, "sum"]]),
    [...(R.ignS ? ["This attack ignores the target's damage reductions: each of its damage-taken totals below 0 (DMG taken on the whole unit and on the hit part, its damage factor, its side of Final DMG) counts as 0, and its shield's cut doesn't apply; your own bonuses stay."] : []),
      "Every bracket stops at 0: the armor, SkillM and each (1 + …%) can't go below zero; a shot that lands deals at least 1.",
      "DMG% adds your damage % and the target's damage taken; a damage taken on one part (Downwind, Broken Arm, the boss's body −75%) counts only on a shot at that part, and one that depends on that part's HP is checked shot by shot in Attacks to kill.",
      "The attack is divided by Nshots_base even when buffs add shots, so each extra shot is one more full share.",
    (pvw => pvw ? `<span class="wepv">InGameDMGPreview = ${pvw.w} + ${pvw.gr} × ${pvw.n}</span> <span class="n">(the game's attack preview: on the body, without your armor cuts and the bonuses attached when the attack starts or by an accessory trigger; hit ${pct(pvw.hit, 0)}, crit ${pct(pvw.crit, 0)})</span>`
      : `<span class="n">InGameDMGPreview: not shown for this attack type (the game has its own preview for it)</span>`)(previewOf(R))]);
}
function bdCrit(R) {
  const g = R.g, add = [], mul = [];
  for (const row of R.rows) {
    // (a value from the situation, per level or by hit chance, as compute() worked it out: x.val, as contrib() reads it)
    const val = f => row.effs.filter(x => x.act && !x.dup && !x.ph && x.e.f === f).reduce((a, x) => a + (x.val != null ? x.val : effVal(R.s, row.src, x.e)), 0);
    const v = val("crit_rate"), m = val("crit_mul"), nm = row.src.label.replace(/^[^:]+: /, "");
    if (v) add.push(`${nm} ${pct(v, 1)}`);
    if (m) mul.push(`${nm} ${pct(m, 1)}`);
  }
  if (R.s.extra.crit_rate) add.push(`extra bonus ${R.s.extra.crit_rate}%`);
  const rate = g("crit_rate"), feat = g("crit_mul"), total = rate * (1 + feat), fin = g("crit_fin");
  const bonus = g("crit_app_flat") + g("crit_app_fin"), wep = R.W.crit_app + g("crit_app_add"), cp = g("crit_app_pct");
  const rres = (R.tg.crit_rate_res || 0) + g("critres"), q = R.Sv / R.Tv;
  return bdSec("Crit chance", "FinalCrit_chance " + pct(R.crit, 1), [
    ["CritRate_total = CritRate × (1 + CritRate_feat)", `= ${pct(rate, 1)} × ${(1 + feat).toFixed(3)} = ${pct(total, 2)}`],
    ["CritPts_total = CritPts_chips + CritPts_bonus + (CritPts_wep + CritPts_RD) × (1 + CritPts%_bonus)",
      `= ${fmt(R.chipCrit)} + ${fmt(bonus, 2)} + (${fmt(wep)} + ${fmt(R.rdCrit)}) × ${(1 + cp).toFixed(3)} = ${fmt(R.Sv)}`],
    ["CritPts_term = 0.3 × atan((CritPts_total/eCritPtsRes − eCritPtsRes/CritPts_total) ÷ 0.5) ÷ (π/2)",
      Number.isFinite(q) && q > 0 ? `= 0.3 × atan((${q.toFixed(4)} − ${(1 / q).toFixed(4)}) ÷ 0.5) ÷ 1.5708 = ${pct(R.critTerm, 2)}`
        : `CritPts_total is 0, so the term sits at its floor: ${pct(R.critTerm, 2)}`],
    [`FinalCrit_chance = CritRate_total${fin ? " + CritRate_final" : ""} + CritPts_term − eCritRateRes`,
    `= ${pct(total, 2)}${fin ? ` ${fin < 0 ? "−" : "+"} ${pct(Math.abs(fin), 1)}` : ""} ${R.critTerm < 0 ? "−" : "+"} ${pct(Math.abs(R.critTerm), 2)} − ${pct(rres, 1)}${R.critAdj ? ` + ${pct(R.critAdj, 1)} extra` : ""} = ${pct(R.crit, 2)} → game shows ${Math.round(R.crit * 100)}%`]],
    bdTerms([
      ["CritRate", pct(rate, 1), esc(add.join(" + ") || "none")],
      ["CritRate_feat", pct(feat, 1), esc(mul.join(" + ") || "none") + " (features only; multiplies CritRate)"],
      fin ? ["CritRate_final", pct(fin, 1), esc(contrib(R, "crit_fin", true).join(" + ")) + " (added after the multiplier)"] : null,
      ["CritPts_chips", fmt(R.chipCrit), "chips (×2 at full chip growth)"],
      ["CritPts_bonus", fmt(bonus, 2), esc([...contrib(R, "crit_app_flat"), ...contrib(R, "crit_app_fin").map(x => x.replace(/ [\d.,]+$/, ` +${g("crit_app_fin")} (no real effect)`))].join(" + ") || "none")],
      ["CritPts_wep", fmt(wep), esc(R.W.n) + (g("crit_app_add") ? " + " + esc(contrib(R, "crit_app_add").join(" + ")) : "")],
      ["CritPts_RD", fmt(R.rdCrit), rdTag(R, "crit", esc(R.W.tn))],
      ["CritPts%_bonus", pct(cp, 1), esc(contrib(R, "crit_app_pct", true).join(" + ") || "none")],
      ["CritPts_total", fmt(R.Sv), "", "sum"],
      ["eCritPtsRes", fmt(R.Tv), `${esc(R.tg.boss)}: body value + its crit-resist buffs (same for every part)`],
      ["eCritRateRes", pct(rres, 1), rres ? esc("target crit-rate resist and your debuffs on it" + ((R.bossTgt || []).some(q => q.f === "critres") || R.tg.crit_rate_res ? ": " + [...(R.tg.crit_rate_res ? [`its own ${pct(R.tg.crit_rate_res, 1)}`] : []), ...contrib(R, "critres", true)].join(" + ") : "")) : "none"]]),
    [...(R.sureCrit ? [`A sure crit: ${R.sureCrit.join(", ")} makes every shot of this round crit, whatever the terms above.`] : []),
      "CritPts_term runs from −30% to +30% crit chance and is 0 when CritPts_total equals eCritPtsRes.",
      "Crit chance is capped at 0% and 100%; each shot rolls it."]);
}
function bdHit(R) {
  const g = R.g, arms = R.arms.map(x => x.toLowerCase()).join(" + "), nA = R.arms.length, suit = R.suit.hit, cat = g("hit_cat_pct");
  const wb = g("whit_add"), ab = g("ahit_add") * nA, ch = R.chipHit * nA, q = R.H / R.Dg, term = 0.5 * atanN(R.hitX / R.hitK);
  const rdShort = x => x.replace(/^R&D .*/, R.rdEd && Object.keys(R.rdEd).length ? "R&D (see R&D panel)" : "R&D, full tree");
  const notes = ["Suit% = Suit_coeff − 1; for hit it is added inside the % sum, not multiplied.",
    "HitPts_term runs from −0.5 to +0.5, so hit chance runs from 0.4 to 1.4 × HitRate_wep before the adds; capped at 100%."];
  if (nA > 1) notes.push("Two-handed weapon: both arms count (halved if the other arm is destroyed).");
  if (R.TI.comp) notes.push(`${esc(R.W.tn)}: each miss in a row adds 10% to HitRate_wep for the next shot (the game adds its 5% miss bonus twice; reset by a hit): after 1 miss ${pct(R.hitAfter(1), 1)}, after 2 ${pct(R.hitAfter(2), 1)}; expected hits ${R.expHits.toFixed(2)} of ${R.shots}.`);
  if (!R.legsGone && R.Dg > 0 && !R.udg && R.hitAfterL(0) > R.hit) notes.push(`Once its legs are destroyed (later in the fight, or by an earlier shot of this attack), the shots after that face no dodge: ${pct(R.hitAfterL(0), 1)} (Attacks to kill counts this).`);
  return bdSec("Hit chance", "FinalHit_chance " + pct(R.hit, 1), [
    [`HitPts_wep = (HitPts_wep_base + HitPts_wep_bonus) × (1 + HitPts%_wep${cat ? " + HitPts%_cat" : ""} + Suit%)`,
    `= (${fmt(R.W.hit)} + ${fmt(wb)}) × (1 + ${g("whit_pct").toFixed(3)}${cat ? ` + ${cat.toFixed(3)}` : ""} + ${suit.toFixed(3)}) = ${fmt(R.wHit)}`],
    [`HitPts_arm = (HitPts_arm_base + HitPts_arm_bonus + HitPts_chips) × (1 + HitPts%_arm${cat ? " + HitPts%_cat" : ""} + Suit%)`,
    `= (${fmt(R.armHit)} + ${fmt(ab)} + ${fmt(ch)}) × (1 + ${g("ahit_pct").toFixed(3)}${cat ? ` + ${cat.toFixed(3)}` : ""} + ${suit.toFixed(3)}) = ${fmt(R.aHit)}`],
    ["HitPts_term = 0.5 × atan((HitPts_total/eDodgePts − eDodgePts/HitPts_total) ÷ Hit_k) ÷ (π/2)",
      Number.isFinite(q) && q > 0 ? `= 0.5 × atan((${q.toFixed(4)} − ${(1 / q).toFixed(4)}) ÷ ${R.hitK}) ÷ 1.5708 = ${term.toFixed(4)}`
        : R.legsGone ? `= ${term.toFixed(4)}: its legs are destroyed, which leaves it no dodge (eDodgePts 0), so the term is at its maximum`
          : `= ${term.toFixed(4)}: the target has no dodge (eDodgePts 0, e.g. ${esc(R.tg.mech)} legs carry no dodge value), so the term is at its maximum`],
    ["FinalHit_chance = HitRate_wep × (0.9 + HitPts_term) + HitRate_bonus − eHitRateRes",
      `= ${R.W.rate} × (0.9 + ${term.toFixed(4)}) ${g("hitrate") < 0 ? "−" : "+"} ${pct(Math.abs(g("hitrate")), 1)} − ${pct(R.hitRes, 1)} = ${pct(R.hitReal != null ? R.hitReal : R.hit, 2)} → game shows ${gameHitPct(R.hitReal != null ? R.hitReal : R.hit)}%`],
    ...(R.hitThr != null && R.hitThr < 1 ? [["Sure hit: a shot whose FinalHit_chance is at least 1 + HitRate_threshold always hits, with no roll",
      `threshold ${pct(R.hitThr, 0)} (${esc(contrib(R, "hthr", true).join(" + ") || "your setup")}): ${R.hitReal >= R.hitThr ? `${pct(R.hitReal, 1)} is over it, so every shot of this round hits` : `${pct(R.hitReal, 1)} is under it, so each shot rolls`}${R.TI.comp && R.hitReal < R.hitThr ? " (a miss streak can lift a later shot over it)" : ""}`]] : []),
    ...(R.TI.comp && nS(R) > 1 ? [
      ["FinalHit_chance after m misses in a row = (HitRate_wep + 0.10 × m) × (0.9 + HitPts_term) + HitRate_bonus − eHitRateRes",
        `${esc(R.W.tn)} (HitRateCompensation: the game adds its 0.05 twice per miss): after 1 miss = (${R.W.rate} + 0.10) × ${(0.9 + term).toFixed(4)} … = ${pct(R.hitAfter(1), 1)} · after 2 = ${pct(R.hitAfter(2), 1)} · reset by a hit`],
      ["Shots_land = expected hits over the attack ÷ Nshots",
        `= ${R.expHits.toFixed(2)} ÷ ${nS(R)} = ${pct(R.expHits / nS(R), 1)} (the “land” share the attack's average uses; the game's preview shows FinalHit_chance without the bonus)`]] : [])],
    bdTerms([
      ["HitPts_wep_base", fmt(R.W.hit), esc(R.W.n)],
      ["HitPts_wep_bonus", fmt(wb), esc(contrib(R, "whit_add").map(rdShort).join(" + ") || "none")],
      ["HitPts%_wep", pct(g("whit_pct"), 1), esc(contrib(R, "whit_pct", true).map(rdShort).join(" + ") || "none")],
      cat ? ["HitPts%_cat", pct(cat, 1), esc(contrib(R, "hit_cat_pct", true).join(" + "))] : null,
      ["Suit%", pct(suit, 0), "Suit_coeff − 1"],
      ["HitPts_wep", fmt(R.wHit), "", "sum"],
      ["HitPts_arm_base", fmt(R.armHit), `${esc(R.st.n)} ${esc(arms)}`],
      ["HitPts_arm_bonus", fmt(ab), esc(contrib(R, "ahit_add").map(rdShort).join(" + ") || "none") + (nA > 1 ? " (× 2 arms)" : "")],
      ["HitPts_chips", fmt(ch), "chips"],
      ["HitPts%_arm", pct(g("ahit_pct"), 1), esc(contrib(R, "ahit_pct", true).map(rdShort).join(" + ") || "none")],
      ["HitPts_arm", fmt(R.aHit), "", "sum"],
      ["HitPts_total", fmt(R.H), "weapon + arm", "sum"],
      ["eDodgePts", fmt(R.Dg), R.legsGone ? "its legs are destroyed: no dodge" : `${esc(R.tg.boss)} leg dodge` + (R.Dg !== R.tg.dodge ? ` ${fmt(R.tg.dodge)} with your cuts (${esc(contrib(R, "dodge_pct", true).concat(contrib(R, "dodge_add", true)).join(" + "))}): (base ${fmt(R.tg.dodge_base != null ? R.tg.dodge_base : R.tg.dodge)} + adds) × (1 + its own ${pct(R.tg.dmul || 0, 1)} + cuts)` : "")],
      ["Hit_k", R.hitK, R.hitK === 4 ? `4: HitPts_total is below eDodgePts but above the ${esc(R.W.tn)} threshold ${fmt(R.TI.thr)}` : "0.5 (normal)"],
      ["HitRate_wep", R.W.rate, `${esc(R.W.n)} hit rate`],
      ["HitRate_bonus", pct(g("hitrate"), 1), esc(contrib(R, "hitrate", true).join(" + ") || "none")],
      ["eHitRateRes", pct(R.hitRes, 1), R.hitRes ? esc("target hit reduction (its dodge rate; your dodge debuffs lower it): " + [...(R.tg.hit_res ? [`its own ${pct(R.tg.hit_res, 1)}`] : []), ...contrib(R, "hitres", true)].join(" + ")) : "none"]]),
    notes);
}
/* ------------------------------------------------------------------ Weapons & R&D panel
   R&D defaults to the full tree. Overrides are global (both setups, like the game's account-wide R&D) and saved in the
   same storage as the loadouts: this browser's storage ("bench-rd").
   Keys: "<group>|<field>|<attribute>|<ss>" for R&D node totals (group = pilot class, "type:<Weapon>" or "<Class> ST"),
   "crit|<Weapon>" for R&D crit points, "impr|<Weapon>" for the improvement refit. */
let RD_SIDE = "A";
let RDO = {};   // global R&D overrides
function showView(v) {
  $("view-bench").hidden = v !== "bench"; $("view-bench-notes").hidden = v !== "bench"; $("view-rd").hidden = v !== "rd";
  $("tab-bench").setAttribute("aria-selected", v === "bench"); $("tab-rd").setAttribute("aria-selected", v === "rd");
  try { localStorage.setItem("bench-view", v); } catch (e) { }
  if (v === "rd") renderRD();
}
const rdKey = (g, e) => `${g}|${e.f}|${e.a || ""}|${e.c && e.c.some(c => c.t === "parts_ss") ? 1 : 0}`;
const RD_DEF = {};
function rdDefaults(g) {               // full-tree total per key for one group
  if (RD_DEF[g]) return RD_DEF[g];
  const T = g.startsWith("type:") ? g.slice(5) : null, out = {};
  for (const e of D.rd[g] || []) { if (T && e.wt && e.wt !== T) continue; const k = rdKey(g, e); out[k] = (out[k] || 0) + e.v; }
  return RD_DEF[g] = out;
}
const rdOv = (s, k) => k in RDO ? RDO[k] : null;
function rdScale(s, g, e) {            // factor applied to one R&D entry: your total ÷ the full-tree total
  const k = rdKey(g, e), o = rdOv(s, k); if (o == null) return 1;
  const d = rdDefaults(g)[k]; return d ? o / d : 1;
}
const WTYPES = () => {
  const m = {};
  for (const W of Object.values(D.weapons)) {
    const t = m[W.type] ||= { tn: W.tn, fvm: W.fvm, shots: W.shots, impr: 0 };
    t.impr = Math.max(t.impr, W.impr || 0); if (W.na && !t.na) t.na = W.na;
  }   // a type with no default attack shows its weapons' own
  return Object.entries(m).sort((a, b) => a[1].tn.localeCompare(b[1].tn));
};
function rdCell(s, k, def, isPct, title) {
  const o = rdOv(s, k), v = o == null ? def : o;
  const show = isPct ? +(v * 100).toFixed(2) : +(+v).toFixed(2);
  return `<input type="number" class="rdin${o != null ? " ed" : ""}" data-rdk="${esc(k)}" data-pct="${isPct ? 1 : 0}" data-def="${def}" value="${show}" title="${esc(title || "")} · full tree ${isPct ? pct(def, 1) : fmt(def, 2)}">`;
}
function renderRD() {
  const box = $("rd-body"); if (!box) return;
  const s = S.A; if (!s) { box.innerHTML = ""; return; }
  const nEd = Object.keys(RDO).length, both = [S.A, S.B].filter(Boolean);
  const used = new Set(both.flatMap(x => Object.values(equipped(x)).map(w => D.weapons[w.id] && D.weapons[w.id].type)));
  const usedSt = new Set(both.map(x => D.sts[x.st].cls)), usedPc = new Set(both.map(x => D.pilots[x.pilot].class));
  const wt = WTYPES().map(([T, x]) => {
    const g = "type:" + T, d = rdDefaults(g), k = f => `${g}|${f}||0`;
    return `<tr class="${used.has(T) ? "use" : ""}"><td>${esc(x.tn)}</td><td class="num">${(1 + x.fvm).toFixed(4)}</td><td class="num">${(x.na || D.normal[T] || { h: x.shots }).h || x.shots}</td>
    <td class="num">${((x.na || D.normal[T] || {}).m || 1).toFixed(2)}</td>
    <td>${rdCell(s, k("atk_add"), d[k("atk_add")] || 0, false, "ATK_RD")}</td>
    <td>${rdCell(s, k("whit_add"), d[k("whit_add")] || 0, false, "HitPts_wep_RD (the R&D part of HitPts_wep_bonus)")}</td>
    <td>${rdCell(s, "crit|" + T, (D.rdcrit || {})[String(D.wtBits[T] || 0)] || 0, false, "CritPts_RD")}</td>
    <td>${rdCell(s, "impr|" + T, x.impr, false, "improvement refit")}</td></tr>`;
  }).join("");
  const stRows = ["Light", "Medium", "Heavy"].map(c => {
    const g = c + " ST", d = rdDefaults(g), k = (f, ss) => `${g}|${f}||${ss}`;
    return `<tr class="${usedSt.has(c) ? "use" : ""}"><td>${c} ST</td>
    <td>${rdCell(s, k("fp_add", 0), d[k("fp_add", 0)] || 0, false, "FP_RD")}</td>
    <td>${rdCell(s, k("fp_add", 1), d[k("fp_add", 1)] || 0, false, "FP_RD with SS parts (scaled by the share of SS parts)")}</td>
    <td>${rdCell(s, k("fp_pct", 0), d[k("fp_pct", 0)] || 0, true, "FP%_RD")}</td>
    <td>${rdCell(s, k("ahit_add", 0), d[k("ahit_add", 0)] || 0, false, "HitPts_arm_RD (the R&D part of HitPts_arm_bonus)")}</td>
    <td>${rdCell(s, k("ahit_pct", 0), d[k("ahit_pct", 0)] || 0, true, "HitPts%_arm_RD (the R&D part of HitPts%_arm)")}</td></tr>`;
  }).join("");
  const classes = [...new Set(Object.values(D.pilots).map(p => p.class).filter(Boolean))].sort();
  const pcRows = classes.map(c => {
    const d = rdDefaults(c);
    return `<tr class="${usedPc.has(c) ? "use" : ""}"><td>${esc(c)}</td>${ATTRS.map(a => `<td>${rdCell(s, `${c}|attr_add|${a}|0`, d[`${c}|attr_add|${a}|0`] || 0, false, shownAttr(a) + " +")}
    ${rdCell(s, `${c}|attr_pct|${a}|0`, d[`${c}|attr_pct|${a}|0`] || 0, true, shownAttr(a) + " %")}</td>`).join("")}</tr>`;
  }).join("");
  box.innerHTML = `<div class="rdtop"><span class="meta">${nEd ? `${nEd} value${nEd > 1 ? "s" : ""} changed from the full tree` : "all at full tree"} · applies to both setups · saved automatically in this browser</span>
    ${nEd ? `<button type="button" id="rd-reset">Reset to full tree</button>` : ""}</div>
  <div class="meta">Edit a number to match an R&amp;D tree that isn't finished; changed cells are outlined. Bold rows are what setups A and B use now.</div>
  <div class="sub">Weapon types</div>
  <div class="tablebox"><table class="rdt"><thead><tr><th>Type</th><th>Wep_coeff</th><th>Nshots_base</th><th>Normal SkillM</th><th>ATK_RD</th><th>HitPts_wep_RD</th><th>CritPts_RD</th><th>Improvement</th></tr></thead><tbody>${wt}</tbody></table></div>
  <div class="sub">ST class</div>
  <div class="tablebox"><table class="rdt"><thead><tr><th>Class</th><th>FP_RD</th><th>FP_RD (SS parts)</th><th>FP%_RD</th><th>HitPts_arm_RD</th><th>HitPts%_arm_RD</th></tr></thead><tbody>${stRows}</tbody></table></div>
  <div class="sub">Pilot class <span class="meta">(attribute + and %; only used when the pilot screen value is left blank)</span></div>
  <div class="tablebox"><table class="rdt"><thead><tr><th>Class</th>${ATTRS.map(a => `<th>${shownAttr(a)}</th>`).join("")}</tr></thead><tbody>${pcRows}</tbody></table></div>`;
  const rs = $("rd-reset"); if (rs) rs.addEventListener("click", () => { RDO = {}; saveRD(); renderRD(); renderSide("A"); renderSide("B"); update(); });
  box.querySelectorAll("input.rdin").forEach(inp => inp.addEventListener("input", e => {
    const el = e.target, k = el.dataset.rdk, def = +el.dataset.def, v = el.value === "" ? null : +el.value / (el.dataset.pct === "1" ? 100 : 1);
    if (v == null || Math.abs(v - def) < 1e-9) delete RDO[k]; else RDO[k] = v;
    el.classList.toggle("ed", k in RDO); saveRDSoon(); updateSoon();
  }));
}

const rdTag = (R, f, extra) => (R.rdEd && R.rdEd[f] ? "R&D, your value" : "R&D, full tree") + (extra ? ` (${extra})` : "");
/* the attack's structure: every round it fires inside the one cast, with its weapon, shots, SkillM and expected damage */
function bdStruct(R, O) {
  const S = R.struct; if (!S) return "";
  const L = structLines(R, O), rows = [];
  for (const g of L) {
    const x = S.steps[g.js[0]];
    for (const y of x.streams) rows.push([esc(g.name) + (x.streams.length > 1 ? ` · ${SLOTW[y.slot] || y.slot}` : ""),
    `${g.k > 1 ? g.k + " × " : ""}${y.n} × ${fmt(y.R.shotBy[T.mode === "focus" ? T.part : "Body"], 1)}`,
    `${esc(y.R.W.n)} (${SLOTW[y.slot] || y.slot}) · srcAtk ${fmt(y.R.srcAtk, 1)} ÷ Nshots_base ${y.R.baseShots} · SkillM ${y.R.skillM.toFixed(2)}${y.R.sk.sn && y.R.sk.sn !== bdSkill(R) ? ` (${esc(y.R.sk.sn)})` : ""} · hit ${pct(y.R.hit, 1)} · crit ${pct(y.R.crit, 1)} · per shot on the ${(T.mode === "focus" ? T.part : "Body").toLowerCase()}`]);
    rows.push(["", fmt(g.e), `${O && O.list.length > 1 ? "per attack, accessory triggers averaged in (the shot values above: none triggered) · " : ""}${g.js[0] ? "a new round" + (g.k > 1 ? " each" : "") + ": the shot number, the round's landed hits and the miss streak start again; this attack's landed hits and crits carry on" : "starts the attack"}${x.gate === "anyHit" ? ` · fires only when the main round lands a hit (${pct(R.dp.segs[g.js[0]].p, 0)})` : ""}`, "sum"]);
  }
  const notes = [...(S.notes || [])];
  if (R.avgR) notes.push(`Two-hand average (both hands in one round): srcAtk (${fmt(R.srcAtk1, 1)} + ${fmt(R.avgR.srcAtk1, 1)}) ÷ 2 = ${fmt(R.srcAtk, 1)}; the hit points, base hit rate, hit bonus, crit points, crit bonus and crit damage are averaged the same way.`);
  if (S.steps.some(x => x.streams.length > 1)) notes.push("Both weapons in one round: shots alternate A, B, A, B and, when one weapon has more, its extra shots come last. Each shot uses its own weapon's srcAtk, hit and crit and keeps its own miss-streak bonus; the shot number and the landed hits count both weapons.");
  if (R.accFire && R.accFire.length > 1) notes.push("This skill uses more than one weapon, so every weapon it uses fires its accessories; what a triggered one gives reaches every round of the attack.");
  if (S.steps.some(x => x.streams.some(y => y.R.sk.sg != null && y.R.sk.sg !== R.sk.g))) notes.push("A round of another skill row inside the same attack: effects that check the attack type read the skill you cast, not that row's own type.");
  if (S.k === "xhit" && R.plan.st.part) notes.push("The follow-up hit lands on the same part as the first hit when that part still stands; here it rolls the attack's own part weights.");
  if (S.k === "havoc" && S.info.havoc) notes.push(`${S.info.havoc.min} hits, plus 1 per AP left after the cost (${S.info.havoc.left} left). In Attacks to kill it stops after the first ${S.info.havoc.min} once a part is destroyed.`);
  if (S.k === "ammo" && S.info.ammo) notes.push(`${S.info.ammo.n} attacks: one per round in the magazine${R.plan.st.plus ? " plus one" : ""}${R.plan.st.full ? " (a full magazine, none spent)" : ""}; assumes this target is the only one under Magnetic Lock. Each repeat on the same target deals ${pct(Math.max(0, 1 + R.plan.st.add), 0)} of its damage (DMG ${R.plan.st.add < 0 ? "−" : "+"}${pct(Math.abs(R.plan.st.add), 0)}, a factor of its own, as the skill's text says); its SkillM stays ${R.sk.m.toFixed(2)}.`);
  if (S.k === "salvo" && S.info.salvo) notes.push(`${S.info.salvo.n} missiles on this target: at most ${R.plan.st.max} per target marked [Lock], one per round in the two launchers (${S.info.salvo.mag}: this one's and the other one's taken as full) and one per AP; assumes this target is the only one marked [Lock]. The left launcher fires first and takes the odd one; then they alternate. Each missile's Collateral DMG on the other parts is counted (Breakdown → Collateral DMG).`);
  if (S.cant) notes.unshift(S.cant);
  if (!rows.length && !notes.length) return "";
  return bdSec("Attack structure", L.length ? `${S.steps.length} round${S.steps.length === 1 ? "" : "s"} · ${fmt(L.reduce((a, r) => a + r.e, 0))} per attack${O && O.list.length > 1 ? " (accessory triggers averaged in)" : ""}` : "", [
    ["Avg_DMG_per_attack = Σ rounds of the cast (+ follow-up rounds below)", "each round is computed shot by shot with the counts the earlier rounds left (Breakdown → Hit by hit)"]],
    rows.length ? bdTerms(rows) : "", notes.map(esc));
}
function bdPV(R) {
  const P = R.pv; if (!P) return "";
  const R2 = P.R, g = R2.g, flame = g("splash"), npc = R2.npcF(T.part, H_START());
  return bdSec("Follow-up round · Peripheral Vision", "DMG_per_shot_PV " + fmt(P.shot, 1) + (T.mode === "focus" ? "" : " (limb)"), [
    [`DMG_per_shot_PV = (srcAtk_PV × AtrDef_coeff ÷ Nshots_base − eArmor ÷ 10) × SkillM × SplashFactor × (1 + DMG%)${npc !== 1 ? " × (1 + eDMGFactor%)" : ""}`,
    `= (${fmt(R2.srcAtk, 2)} × ${R2.pmult.toFixed(4)} ÷ ${R2.baseShots} − ${fmt(P.armor / 10, 1)}) × ${R2.skillM.toFixed(2)} × ${P.SF.toFixed(2)} × ${Math.max(0, 1 + R2.dB(T.part, H_START())).toFixed(3)}${R2.npcF(T.part, H_START()) !== 1 ? " × " + R2.npcF(T.part, H_START()).toFixed(3) : ""} = ${fmt(P.shot, 1)}  ·  crit × ${(1 + R2.critDmg).toFixed(2)} = ${fmt(P.shotCrit, 1)}`],
    ["SplashFactor = SplashFactor_base + Flame DMG %", `= ${P.base.toFixed(2)} + ${flame.toFixed(2)} = ${P.SF.toFixed(2)}`]],
    bdTerms([
      ["srcAtk_PV", fmt(R2.srcAtk, 2), `${esc(R2.W.n)} in the ${P.slot === "LH" ? "left" : "right"} hand (the opposite arm), its own weapon attack`],
      ["Nshots", P.shots, "same skill and shot count as the main round (Whoosh! +1 on Burning Terrain)"],
      ["SkillM", R2.skillM.toFixed(2), "the same skill as the main round"],
      ["SplashFactor_base", P.base.toFixed(2), "TCS 1 0.20 (Core Talent 1 alone 0.15), from the game data"],
      ["Flame DMG %", pct(flame, 1), esc(contrib(R2, "splash", true).join(" + ") || "none") + " (FlamethrowerSplashFactorAdd)"],
      ["eArmor", fmt(P.armor, 1) + (T.mode === "focus" ? "" : ` limb · ${fmt(R.armorBy.Body, 1)} body`), (T.mode === "focus" ? "" : "shots scatter like the main round; ") + "the main round's target armor: armor cuts from the attacking hand's accessories (Piercing) cover both rounds"],
      ["DMG%", pct(R2.dB(T.part, H_START()), 1), "same buckets as the main round, incl. the target's damage taken on the part hit"],
      ...(npc !== 1 ? [["eDMGFactor%", pct(npc - 1, 1), esc(tTerms(R2, "npcB", T.part).join(" + ")) + ": the target's own damage factor, a separate (1 + x), as in the main round"]] : []),
      ["FinalDMG%", "—", "not applied to the follow-up round (Perfect Position's +15% counts only on the main round)"],
      ["FinalHit_chance", pct(R2.hit, 1), "the opposite arm's weapon and arm hit"],
      ["FinalCrit_chance", pct(P.crit, 1), "the opposite arm's weapon crit"]]),
    ["Fires after an active Flamethrower attack that sweeps a line (a LineSplashAttack skill: Normal Attacks and line skills, not Code skills or area skills such as Wildfire), from the other arm's Flamethrower.",
      "It goes to a random enemy the other Flamethrower can reach that this attack didn't hit, and comes back to this target only when there is none: set “Peripheral Vision round” in the Situation panel (work it out from the enemies in range, this target, another enemy whose line still crosses this target, or another enemy)."]);
}
function bdGusty(R) {
  const G = R.gusty; if (!G) return "";
  const R2 = G.R, g = R2.g, dropped = R.g("skillM") - g("skillM"), npc = R2.npcF(T.part, H_START());
  return bdSec("Gusty Strike (extra attack)", "DMG_per_shot_GS " + fmt(G.shot, 1) + (T.mode === "focus" ? "" : " (limb)"), [
    [`DMG_per_shot_GS = (srcAtk × AtrDef_coeff ÷ Nshots_GS − eArmor ÷ 10) × SkillM_GS × (1 + DMG%)${npc !== 1 ? " × (1 + eDMGFactor%)" : ""} × (1 + FinalDMG%)`,
    `= (${fmt(R2.srcAtk, 2)} × ${R2.pmult.toFixed(4)} ÷ ${R2.baseShots} − ${fmt(R2.armor / 10, 1)}) × ${R2.skillM.toFixed(2)} × ${Math.max(0, 1 + R2.dB(T.part, H_START())).toFixed(3)}${R2.npcF(T.part, H_START()) !== 1 ? " × " + R2.npcF(T.part, H_START()).toFixed(3) : ""} × ${(1 + g("finalB")).toFixed(3)} = ${fmt(G.shot, 1)}  ·  crit × ${(1 + R2.critDmg).toFixed(2)} = ${fmt(G.shotCrit, 1)}`],
    ["SkillM_GS = extra attack 0.5 + combo adjustment + SkillM bonuses that count on extra attacks",
      `= ${(D.xatk[R.W.type].m).toFixed(2)} ${G.c.adj < 0 ? "−" : "+"} ${Math.abs(G.c.adj).toFixed(2)} + ${g("skillM").toFixed(2)} = ${R2.skillM.toFixed(2)}`]],
    bdTerms([
      ["Trigger", G.mode === "chance" ? pct(G.p, 0) + " per attack (weighted)" : G.mode === "on" ? "triggered" : "not triggered", esc(G.c.n) + " · " + esc(G.c.d || "")],
      ["Nshots_GS", G.shots, `the ${esc(R.W.tn)} extra attack's own shot count (${R2.baseShots}) plus shot bonuses, same arm and weapon`],
      ["SkillM bonuses", g("skillM").toFixed(2), dropped ? `${dropped.toFixed(2)} of the main attack's SkillM bonus is for other attack types only (e.g. Salty Dog: Normal Attack) and drops out` : "same as the main attack"],
      ["eArmor", fmt(R2.armor, 1), R2.armor === R.armor ? "same as the main attack (Moonflower's Armor Down II lasts the turn)" : `main attack ${fmt(R.armor, 1)}: armor cuts tied to the attack type differ`],
      ["DMG% / FinalDMG%", pct(R2.dB(T.part, H_START()), 1) + " / " + pct(g("finalB"), 1), "the bonuses whose conditions also hold for an extra attack, plus the target's damage taken"],
      ...(npc !== 1 ? [["eDMGFactor%", pct(npc - 1, 1), esc(tTerms(R2, "npcB", T.part).join(" + ")) + ": the target's own damage factor, a separate (1 + x), as in the main attack"]] : []),
      ["FinalHit_chance / FinalCrit_chance", pct(R2.hit, 1) + " / " + pct(R2.crit, 1), "its own rolls"]]),
    ["Fires before the target's retaliation, from the arm its source names. When it can fire: " + (G.list || [G]).map(x => `${x.c.n}: ${x.c.d || "its own conditions"}`).join(" · "),
      "A new attack of its own: armor cuts that last only the main combat (Marksmanship at ideal range) don't reach it; if you ticked one, this round is slightly high."]);
}
/* Flurry Strike and after-combat strikes: one row per eligible source with its chance after priority and Gusty Strike */
/* why a follow-up has no chance here (its line says so instead of 'when it fires 0') */
function noFire(R, x, kind) {
  const P = R.purs;
  if (kind === "purs") { if (P.mode === "off") return "set to not triggered"; if (P.post && P.ctr && !P.armOK) return "the firing arm doesn't survive the retaliation"; }
  if (x.gate) return `it needs the attack to ${{ allHit: "land every shot", broke: "destroy a part", noBroke: "destroy no part", anyHit: "land a shot" }[x.gate]}, which this setup rules out`;
  return kind === "purs" && P.list.length > 1 ? "a source with a higher priority always fires first" : "it can't fire in this setup";
}
function bdFollow(R, O) {
  const P = R.purs, A = R.after; if ((!P || (!P.list.length && !P.skip.length)) && (!A || !A.list.length)) return "";
  const rows = [], pG = R.gusty ? (R.gusty.pAll != null ? R.gusty.pAll : R.gusty.p) : 0;
  for (const x of (P && P.list) || []) rows.push([`Flurry Strike · ${esc(x.name)}`, pct(x.pDP || 0, 1),
  `priority ${x.prio} · own chance ${pct(x.P.p, 0)}${P.prate ? ` + ${pct(P.prate, 0)} bonus` : ""} = ${pct(x.q, 0)}${x.gate ? ` · ${GATE_W[x.gate]}` : ""} · ${shotW(x.shots)} · ${esc(x.R.W.n)} (${SLOTW[x.slot] || x.slot}) · srcAtk ${fmt(x.R.srcAtk, 1)} · SkillM ${x.R.skillM.toFixed(2)} · hit ${pct(x.R.hit, 1)} · crit ${pct(x.R.crit, 1)} · ${(x.pDP || 0) > 0 ? `when it fires ${fmt(x.expIf || 0)}` : `doesn't fire: ${esc(noFire(R, x, "purs"))}`}`]);
  for (const x of (P && P.skip) || []) rows.push([`Flurry Strike · ${esc(x.name)}`, "—", esc(x.why)]);
  for (const x of (A && A.list) || []) rows.push([esc(x.name), pct(x.pDP || 0, 0), `after the attack · ${shotW(x.shots)} · ${esc(x.R.W.n)} (${SLOTW[x.slot] || x.slot}) · srcAtk ${fmt(x.R.srcAtk, 1)} · SkillM ${x.R.skillM.toFixed(2)} · ${(x.pDP || 0) > 0 ? `when it fires ${fmt(x.expIf || 0)}` : `doesn't fire: ${esc(noFire(R, x, "after"))}`}`]);
  const tot = (R.pursE || 0) + (R.afterE || 0);
  return bdSec("Follow-up attacks · Flurry Strike and after-combat strikes", fmt(tot) + " per attack", [
    ["P(Flurry Strike k) = (1 − P(Gusty Strike)) × q_k × Π over the eligible ones with a higher priority (1 − q_j)",
      `q = its own chance + Flurry Strike chance bonuses${pG ? `; Gusty Strike ${pct(pG, 0)} comes first` : ""}`],
    ["DMG_per_shot_FS = (srcAtk × AtrDef_coeff ÷ Nshots_FS − eArmor ÷ 10) × (extra attack SkillM + adjustment + SkillM bonuses) × (1 + DMG%) × (1 + FinalDMG%)",
      "its own attack: srcAtk, armor and bonuses are read again, its own hit and crit rolls"]],
    bdTerms(rows),
    ["Flurry Strike fires after the target's retaliation, from the arm the source names, at the same target, with that weapon's extra attack (its own shot count). Every source whose conditions hold rolls on its own; of those that pass, the highest priority fires (a tie: the first one listed). It is never in the same attack as a Gusty Strike.",
      "It is a new attack for the counts of the attack (only hits on the target in the whole attack carry on), so effects that build up shot by shot start again. It reads the target's HP the attack's rounds left, your HP after the retaliation, its own AP cost (none) and what the main skill used up (Fury), and your accessories roll again for it.",
      "An after-combat strike is a skill of its own cast when the attack ends: every count starts again (a first-hit shield blocks its first hit again)."]);
}
/* Fia's Tokamak Sphere: the hits that pass the sphere deal 0.6x again in the new direction (from the skill's text) */
function bdTkm(R) {
  const x = xpsAll(R).find(q => q.t === "rd"); if (!x) return "";
  return bdSec("Tokamak Sphere redirect", `${pct(x.v, 0)} of each landed hit`, [
    ["Redirect_hit = 0.6 × the damage that hit dealt (crit included), on any standing part of this target", "only when the target is also in the line the sphere redirects to (Situation panel)"]],
    "", ["From the skill's text: each hit of a Rail Gun or Flamethrower area attack that passes the sphere deals 0.6× its damage again in the new direction.",
    "Flat: no armor, damage bonuses or crit of its own, and it never counts as a hit."]);
}
/* Collateral DMG on the other parts */
function bdColl(R) {
  const L = [R, ...((R.struct && R.struct.steps) || []).flatMap(x => x.streams.map(y => y.R))].flatMap(r => r.xps.filter(x => x.t === "coll").map(x => ({ x, r })));
  if (!L.length) {
    const m = R.g("coll") + (R.sk.cm != null ? R.sk.cm : ((R.sk.A || {}).cm || 0));
    return m > 0 ? bdSec("Collateral DMG", "not on this attack", [], "", [`Collateral DMG ${pct(m, 0)}: it only follows a round of 1 shot; this round fires ${R.shots / (R.rounds || 1)}.`]) : "";
  }
  const { x, r } = L[0], cm = r.sk.cm != null ? r.sk.cm : ((r.sk.A || {}).cm || 0);
  return bdSec("Collateral DMG on the other parts", `${pct(x.v, 0)} of each landed hit on ${x.parts === 3 ? "every other standing part" : x.parts + " other part" + (x.parts === 1 ? "" : "s")}`, [
    ["Collateral_hit = Collateral% × the damage that hit dealt (crit included), on each of up to N other standing parts",
      `Collateral% = ${pct(cm, 0)} the skill's own + ${pct(r.g("coll"), 0)} your effects = ${pct(x.v, 0)} · N = ${x.parts === 3 ? "every other standing part (no part count, or 3 or more)" : x.parts}`]],
    bdTerms([["Collateral% from your effects", pct(r.g("coll"), 0), esc(contrib(r, "coll", true).join(" + ") || "none")],
    ["Part count +", fmt(r.g("colln")), esc(contrib(r, "colln").join(" + ") || "none (every other standing part)")]]),
    ["Only after a round of 1 shot (a missile, a Polearm hit), or with a skill made for it; a hit that deals nothing gives none.",
      "Flat: no armor, damage bonuses or crit of its own, and it never counts as a hit. The parts are picked at random among the other standing ones, each once.",
      "It counts toward breaking those parts and toward the kill when one of them is the body."]);
}
/* what lands after the attack: fixed damage (one part / every part / shared / Short Circuit set off), execution, Terminator 4 */
function bdAfter(R) {
  const L = R.afxL || [], tg = R.tg, fb = R.g("fixB"), dec = tg.exdec, fx = fb ? ` × (1 + ${pct(fb, 0)} FixDMG%)` : "";
  if (!L.length && !(R.execT > 0) && !(R.t4 > 0)) return "";
  const rows = L.map(x => [esc(x.n || "Fixed DMG"), x.t === "scb" || x.t === "mhp" ? pct(x.v, 0) + " max HP" : fmt(x.val, x.t === "split" ? 1 : 0), x.t === "mhp"
    ? `each standing part loses ${pct(x.v, 0)} of its max HP${x.pre ? "" : fx} × (1 + ${pct(tg.fixres || 0, 0)} its Percentage DMG taken)${tg.fixav ? "; this target avoids ratio damage: 0" : ""}`
    + (x.pre ? "; made before the shots, and your own parts lose the same share (Your HP counts that much lower for this skill)" : "") + (x.keep1 ? "; each part keeps 1 HP" : "")
    + (x.hit ? `; needs a hit that deals damage: ${pct(1 - R.pNone, 1)} of attacks` : "")
    : x.brk ? `${x.v} × ATK ${fmt(Math.floor(R.srcAtk))}${fx} ${x.t === "bomb" ? "on one part" : x.t === "each" ? "on every standing part" : "shared by the standing parts"}, only when this attack destroys a part (Situation; in Attacks to kill each fight decides it)`
      : x.t === "scb"
        ? `Short Circuit set off: each standing part loses ${pct(x.v, 0)}${fx} of its max HP × (1 + ${pct(tg.fixres || 0, 0)} its Percentage DMG taken)${tg.fixav ? "; this target avoids ratio damage: 0" : ""}; each part keeps 1 HP`
        : x.flat ? `the knock-back strike after combat: 1 DMG on one part (${R.afxP ? "its " + esc(R.afxP.toLowerCase()) : "picked at random among the standing parts"}); it can't be dodged, and its skill multiplier is 0`
          : x.t === "bomb" ? `${x.v} × ATK ${fmt(Math.floor(R.srcAtk))}${fx} on one part (${R.afxP ? "its " + esc(R.afxP.toLowerCase()) : "picked at random among the standing parts"})${x.hit ? `; needs a hit that deals damage: ${pct(1 - R.pNone, 1)} of attacks` : ""}${x.blk ? "; when the knock-back is blocked (Situation)" : ""}`
            : x.t === "each" ? `${x.v} × ATK ${fmt(Math.floor(R.srcAtk))}${fx} on every standing part`
              : `${x.v} × weapon ATK ${fmt(R.srcAtk, 1)}${fx}, shared by the standing parts`]);
  if (R.execT > 0) rows.push(["Execution", pct(R.execT, 0), "after the attack, a part a landed hit reached is destroyed when its HP is below this share of its max (the body too: a kill)"
    + (dec ? `; this target's Anti-Execution: body ${dec.Body >= 1 ? "immune" : pct(R.execT * (1 - dec.Body), 1)}, limbs ${pct(R.execT * (1 - (dec["Left arm"] || 0)), 1)}` : "") + ". Counted in Attacks to kill."]);
  if (R.t4 > 0) rows.push(["Terminator 4", pct(R.t4, 0), `destroying a limb deals this share of its max HP to the body${tg.fixav ? "; this target avoids ratio damage: 0" : ""}. Counted in Attacks to kill.`]);
  return bdSec("After the attack", R.afxNow ? "+" + fmt(R.afxNow) + " per attack" : "", [["Fixed DMG after the attack: once per cast, after every round, follow-up and the retaliation",
    "flat: no hit roll, armor, damage bonuses, crit or shield cut"]], bdTerms(rows), []);
}
function bdXp(R) {
  const L = ((R.w && R.w.comps) || []).map(c => ({ c, C: D.components[c.id] })).filter(x => x.C && x.C.xp);      // the attacking weapon's accessories only
  if (!L || !L.length) return "";
  const ok = x => !x.wm || x.wm & (D.wtBits[R.W.type] || 0);
  const fb = R.g("fixB");
  const rows = L.flatMap(({ c, C }) => C.xp.map(x => [C.n + " " + C.q, x.t === "ec" ? `${pct(x.v, 0)} × srcAtk${fb ? ` × (1 + ${pct(fb, 0)} FixDMG%)` : ""} = ${fmt(x.v * R.srcAtk * (1 + fb), 1)}` : `${pct(x.v, 0)} × that hit's damage`,
  ok(x) ? `per landed shot of the main round, to 1 random other standing part (never the part hit) · ${c.mode === "chance" ? "weighted by its trigger chance" : c.mode === "on" ? "set to triggered" : "set to not triggered"}`
    : `does not apply to ${esc(R.W.tn)} (works with Knuckles, Polearm, Pile Bunker, Small Shield, Light Rifle, Sniper Rifle, Large Shield, Rail Gun, Alter-Blade)`]));
  return bdSec("Accessory extra hits", R.xpE ? "+" + fmt(R.xpE) + " per attack when triggered" : "", [
    ["Explosive_Charge_hit = EC% × srcAtk × (1 + FixDMG%) · Splash_hit = Splash% × the landed shot's damage (crit included)",
      "flat: no armor, damage bonuses or crit of their own (Explosive Charge II: 0.24 × srcAtk; Splash II: 0.16 × the landed shot)"]],
    bdTerms(rows),
    ["They land on another part, so they count toward breaking that part and toward the kill when it is the body.",
      "The target's Percentage DMG resistance (eFixRatioRes%, e.g. the training dummy's −66%) does not apply: both hits are built as FixDamageType RawValue, and the resistance (BattleActorCompBodyPartBase.CalcFixDamage, property 491) only multiplies MaxHpRatio and CurrHpRatio damage (PureMaxHpRatio is not reduced; OtherWapPartMaxHpRatio passes through).",
      "FixDMG% = AttackerFixDamageRatioMulti (e.g. Ascendancy Core): it scales Explosive Charge only.",
      "Main round only: the RA's buff is removed after that single attack (DetachPeriod AfterSingleSkill4Attacker), so Gusty Strike doesn't get it."]);
}
function bdBurn(R) {
  if (!R.burnT) return "";
  const res = R.tg.fixres || 0, all = PARTS.reduce((a, p) => a + R.burn[p], 0), bp = T.mode === "focus" ? T.part : "Body";
  return bdSec("Burning Terrain tick", "on all parts " + fmt(all), [
    [`Burn_tick = part max HP × Burn% × (1 + eFixRatioRes%${R.burnOwn ? " + FixDMG%" : ""}), rounded, at least 1`, `= ${fmt(R.tg.hp[bp])} × ${pct(R.burnPct, 0)} × (1 ${res < 0 ? "−" : "+"} ${Math.abs(res).toFixed(2)}${R.burnOwn ? ` + ${R.g("fixB").toFixed(2)}` : ""}) = ${fmt(R.burn[bp])} on the ${esc(bp.toLowerCase())}`]],
    bdTerms([
      ["Burn%", pct(R.burnPct, 0), "Burning Terrain: Percentage DMG, a share of each part's max HP, on every enemy turn it stays on the tile (game data)"],
      ...(R.burnOwn ? [["FixDMG%", pct(R.g("fixB"), 0), "your Fixed DMG % (AttackerFixDamageRatioMulti): the tick takes its caster's, and the terrain is yours (set under Situation: Terrain under the target, made by you)"]] : []),
      ["eFixRatioRes%", pct(res, 0), res ? `${esc(R.tg.boss)}: Percentage DMG taken ${pct(res, 0)} (Immunity: Superconducting Core / Four Blocks / Ace${res < -1 ? "; two of them add up, and the tick stops at 1" : ""})` : "none"],
      ...PARTS.map(p => [`Burn_tick ${p.toLowerCase()}`, fmt(R.burn[p]), `max HP ${fmt(R.tg.hp[p])}`]),
      ["Burn_tick (all parts)", fmt(all), "", "sum"]]),
    [...(R.burnNow ? [`${esc(bdSkill(R))} also sets the terrain off right after the attack: one extra tick, included in Avg DMG per attack.`] : []),
      "Doesn't depend on your attack, DMG % or crit; the same terrain on one tile doesn't stack. A FixDMG% bonus (Fixed DMG +X%, AttackerFixDamageRatioMulti, e.g. Fixed Scope) on the unit the game counts as the terrain's caster can raise it; not modelled.",
      "In Attacks to kill it hits every standing part once after each attack (one attack per enemy turn). Lasts 2 turns unless something extends it."]);
}
/* hit by hit: the effects that change with the hits that land during the attack, and the expected damage of each shot */
function bdPerHit(R, O) {
  if (!R.dp || !R.segs.some(x => x.terms.length)) return "";
  const terms = [];
  for (const sg of R.segs) for (const q of sg.terms) if (!terms.some(t => t.n === q.n && t.w === q.w)) terms.push(q);
  const hpdN = [...new Set(terms.filter(q => q.kind === "hpd").map(q => q.n))];          // the effects that read the target's HP
  const segName = (x, j) => x.kind === "pv" ? "Peripheral Vision round" : x.kind === "gusty" ? "Gusty Strike round"
    : x.kind === "purs" ? `Flurry Strike round (${(R.purs.list[x.ref] || {}).name || ""})` : x.kind === "after" ? (R.after.list[x.ref] || {}).name || "After-combat strike"
      : R.struct && R.struct.steps.length ? stepName(R.struct.steps[R.dp.segs.indexOf(x)] || { kind: x.kind, label: x.label, streams: [] }) : (R.rounds || 1) > 1 ? `Round ${j + 1} of ${R.rounds}` : "Main round";
  let mj = 0;
  const names = R.dp.segs.map((x, j) => segName(x, x.kind === "main" ? mj++ : 0)), cnt = {}, seen2 = {};
  for (const n of names) cnt[n] = (cnt[n] || 0) + 1;
  const ramp = R.dp.segs.map((x, j) => {
    const L = x.perShot.map(v => fmt(v, 0)), nm = cnt[names[j]] > 1 && !/ \d+$/.test(names[j]) ? `${names[j]} ${seen2[names[j]] = (seen2[names[j]] || 0) + 1}` : names[j];
    if (!(x.p > 0)) return [nm, "—", "doesn't fire in this setup"];
    return [nm, fmt(x.exp, 0), `${(x.kind === "gusty" || x.kind === "purs" || x.kind === "after" || x.gate) && x.p < 1 ? `when it fires (${pct(x.p, 0)} of attacks): ` : ""}shot by shot ${L.length > 14 ? L.slice(0, 14).join(" · ") + " …" : L.join(" · ")} · ${x.landed.toFixed(2)} hits land${x.crits > 0.005 ? `, ${x.crits.toFixed(2)} crit${Math.abs(x.crits - 1) < 0.005 ? "" : "s"}` : ""}`];
  });
  // the results panel averages the trigger chances in; this breakdown is the setup with none of them triggered
  return bdSec("Hit by hit", (O && O.list.length > 1 ? "Avg DMG per attack without triggers " : "Avg DMG per attack ") + fmt(R.expAtk), [
    [`DMG_shot_k = the shot's own damage with what the earlier shots of this attack did (hits landed, crits, its number in the round${hpdN.length ? ", the target's HP" : ""}), averaged over every way they can have gone`,
    `${terms.length} effect${terms.length === 1 ? " changes" : "s change"} shot by shot; the attack's average sums every shot of every round`]],
    bdTerms([...partsOnce(terms.map(q => {
      const r = JSON.stringify([q.n, q.boss ? "target" : "yours", q.w]), w0 = pFree(q.w);       // (one row for all four parts)
      return q.part && q.boss && w0 !== q.w ? { t: r, part: q.part, all: JSON.stringify([q.n, "target", w0 + " (all parts)"]) } : r;
    })).map(r => JSON.parse(r)).map(([n, who, w]) => [esc(n), who, esc(w)]),
    ...ramp.map(r => [esc(r[0]), r[1], esc(r[2]), "sum"])]),
    [...(hpdN.length ? [`${hpdN.join(" and ")} follow${hpdN.length === 1 ? "s" : ""} the target's HP lost and ${hpdN.length === 1 ? "is" : "are"} read again before every shot: here each shot reads the HP the earlier shots are expected to leave, starting from the target HP set above; Attacks to kill reads the HP the fight has left.`] : []),
      "Counts the game keeps during one attack: hits that landed earlier in this round, in this attack and on the target, crits earlier in this attack, and the shot's number in its round (misses count there). The shot itself is never counted, a miss adds no landed hit, and extra hits (Explosive Charge, Splash) never count.",
      "The next round of a skill that fires several rounds starts the round count and the miss-streak bonus again. A Gusty Strike is a new attack for these counts (only hits on the target in the whole attack carry on). The Peripheral Vision round keeps counting from the main round.",
      "Every attack starts these counts from 0, so they need no setting. In Attacks to kill each shot reads them as it happens, together with the parts still standing."]);
}
function renderBd(id, R, O) {
  if (!R) { $(id + "-bd").innerHTML = ""; return; }
  const R1 = firstR(R);
  $(id + "-bd").innerHTML = bdAttack(R) + bdPilot(R) + bdArmorSec(R) + (R1 !== R ? `<div class="meta">Damage per shot below: the cast's first round, ${esc(R1.sk.sn || bdSkill(R1))} (each round's own numbers: Attack structure).</div>` : "")
    + bdDamage(R1) + bdStruct(R, O) + bdPerHit(R, O) + bdPV(R) + bdGusty(R) + bdFollow(R, O) + bdColl(R) + bdTkm(R) + bdXp(R) + bdAfter(R) + bdCrit(R) + bdHit(R) + bdBurn(R);
}

/* the target's own effects on the damage it takes: a switch each, a stack count when it stacks (default: the fight-start state) */
const typesOf = bits => Object.entries(D.wtBits || {}).filter(([, b]) => bits & b).map(([k]) => TYPE_NAMES[k] || k).join(" + ");
/* the target's own situation scalers (White Flame, Douglas, Georgia): what they read */
function sitWords(e) {
  const p = e.sp || [], sc = SC(e.sc), lab = e.part ? e.part + " DMG taken" : "DMG taken", v = x => (x >= 0 ? "+" : "−") + +(Math.abs(x) * 100).toFixed(1) + "%";
  if (sc === "HpLoss") {
    const lo = p[0] || 0, top = p[1] || 0, mh = p[2] == null ? 1 : p[2], neg = e.f === "hitres" || e.f === "critres";
    const L = e.f === "hitres" ? "Your hit chance" : e.f === "critres" ? "Your crit rate" : lab, q = x => v(neg ? -x : x), hw = tWhole() / 100, now = hw >= mh ? 0 : hw <= lo ? top : top * (mh - hw) / (mh - lo);
    return `${L} ${q(top / ((mh - lo) * 100))} per 1% of its HP lost${lo > 0 ? `, ${q(top)} from ${+(lo * 100).toFixed(0)}% HP down` : ""} (at the target HP set above: ${now ? q(now) : "0%"}; Attacks to kill follows its HP)`;
  }
  if (sc === "BufCategorySetInfo") return `${lab} ${v(p[1] || 0)} per debuff it carries, ${p[1] > 0 ? "up to" : "down to"} ${v(p[2] || 0)} (the debuffs this setup puts on it, plus “Other debuffs on the target” under Situation)`;
  if (sc === "NearbyActorCount") {
    const f = FORM_R[p[0]] || ["m", 0], area = f[0] === "c" ? `in the ${2 * f[1] + 1}×${2 * f[1] + 1} square around it` : `within ${f[1]} tile${f[1] === 1 ? "" : "s"} of it`;
    return `${lab} ${v(p[3] || 0)}${p[4] && p[4] !== p[3] ? "" : " per"} ${p[1] === 0 ? "other enemy" : p[1] === 1 ? "of your units" : "unit"} ${area}${p[2] > 1 ? ` (from ${p[2]})` : ""}, ${(p[4] || p[3]) > 0 ? "up to" : "down to"} ${v(p[5] || 0)} (set “Other enemies within ${f[1]} tile${f[1] === 1 ? "" : "s"} of the target${f[0] === "c" ? " (diagonals count)" : ""}” under Situation; none at the start)`;
  }
  return lab + " (from the situation)";
}
function tfxHtml(tg) {
  const L = bossFx(tg); if (!L.length) return "";
  const word = e => e.side === "you" ? `Your ${(FIELD[e.f] || e.f).replace(/ \+$/, "").replace(/^Hit chance$/, "hit chance")}` : e.f === "npcB" ? "Damage factor" : e.f === "critT" ? "Crit DMG taken" : e.f === "hitres" ? "Your hit chance"
    : e.f === "critres" ? "Your crit rate" : (e.part ? e.part + " DMG taken" : "DMG taken");
  const wv = e => e.side !== "you" && (e.f === "hitres" || e.f === "critres") ? -e.val : e.val;       // its dodge / crit resist: your chance falls
  const an = t => (/^[AEIOU]/.test(t) ? "an " : "a ") + t;
  const cw = c => {
    if (c.t === "bgear") return `while it carries ${typesOf(c.v).split(" + ").map(an).join(" or ")}`; if (c.t === "any") return (c.items || []).map(cw).join(" or ");
    if (c.t === "wtype") return `against ${wtNames(c.v)} attacks`;
    if (c.text && c.t !== "bphp") return c.text; const p = (c.part === "arm" ? "left or right arm" : (c.part || "").toLowerCase());
    const pl = p === "legs";
    return c.v === 0 && c.op === "<=" ? `once its ${p} ${pl ? "are" : "is"} destroyed` : c.v === 0 && c.op === ">" ? `while its ${p} ${pl ? "stand" : "stands"}` : `while its ${p} HP ${c.op.replace(">=", "≥").replace("<=", "≤")} ${c.v}%`;
  };
  const by = {}; for (const e of L) (by[e.b] ||= []).push(e);
  // one control per row: a stacking row has its stacks box (0 = not held; no tick), a group of levels the game keeps one of
  // (Alert Mode I / II / III) one choice, any other row its tick
  const grpN = {}; for (const es of Object.values(by)) if (es[0].grp) (grpN[es[0].grp] ||= []).push(es);
  const grpDone = new Set();
  // a stacking row: its value for one stack, then what it gives at the stacks set now (bossFx's val is the total at those stacks)
  const stkV = x => {
    const w1 = x.side !== "you" && (x.f === "hitres" || x.f === "critres") ? -x.v : x.v, lp = x.lpm || 1;
    const per = Math.abs(lp - 1) < 1e-9 ? `${sgn(w1, "dmgB")} per stack` : `${sgn(w1, "dmgB")} at 1 stack, ${sgn(w1 * lp, "dmgB")} per stack after`;
    return `${per} (${x.use ? `now ${sgn(wv(x), "dmgB")} at ${x.lvl} stack${x.lvl === 1 ? "" : "s"}` : "not held now"})`;
  };
  // (its note: the stacks box is the row's one control, 0 = not held; there is no tick to set)
  const stkNote = t => String(t || "").replace(/tick it and set the stacks (\w+) holds/g, "set the stacks $1 holds (0: none)")
    .replace(/tick (?:it|if it holds)(?: when it holds)?/g, "set its stacks when it holds it (0: not held)");
  const whatOf = (es, stk) => {
    const e = es[0];
    const ctr = x => (x.sc && PH_SC[SC(x.sc)]) || (x.c || []).some(c => PH_C.has(c.t)), isPH = x => ctr(x) || x.f === "imm";
    const ti = D.targets.indexOf(tg), own = c => c.t === "bgear" || c.t === "tbuf" || (c.t === "any" && (c.items || []).some(own));
    const L = es.filter(x => x.f).map(x => {
      const oc = (x.c || []).filter(c => !PH_C.has(c.t)), ow = oc.length ? ", " + oc.map(cw).join(", ") : "";
      const off = oc.filter(own).some(c => condState(c, {}, {}) !== true) ? (oc.some(c => c.t === "tbuf") ? " (not now: see the tick above)" : " (not with the weapons set above)") : "";
      if (x.f === "udg") return `It can't dodge: your shots always hit, with no hit roll${ow}${off}`;
      if (x.f === "miss") return `It dodges every shot: your attack misses, whatever your hit chance${ow}${off}`;
      const pw_ = q => q === "rand" ? "a random arm or its legs" : q.length === 4 ? "every part" : q.length === 2 && q.includes("Left arm") && q.includes("Right arm") ? "either arm"
        : q.length === 1 ? "its " + q[0].toLowerCase() : "its " + q.map(x => x.toLowerCase()).join(", ");
      if (x.f === "guts") return `Guts: ${pw_(x.parts)} keeps 1 HP instead of being destroyed${x.per ? ` (${x.per} time${x.per === 1 ? "" : "s"} per turn; the fight counts once per attack)` : ""}${ow}${off} · Attacks to kill`;
      if (x.f === "xhp") return `Temporary HP on ${pw_(x.parts)}: ${stk ? `${pct(x.v, 0)} of its max HP per stack (${x.use ? `now ${pct(x.val, 0)} at ${x.lvl} stack${x.lvl === 1 ? "" : "s"}` : "not held now"})` : `${pct(x.val, 0)} of its max HP`}, used up before its HP${ow}${off} · Attacks to kill`;
      if (x.f === "force") {
        const wt = oc.find(c => c.t === "wtype"), bp = oc.find(c => c.t === "bphp" && c.part === x.part), rest = oc.filter(c => c !== wt && c !== bp);
        const pl = x.part === "Legs";
        return `${wt ? `With ${wtNames(wt.v)} attacks, your` : "Your"} shots only hit its ${x.part.toLowerCase()}${bp ? ` while ${pl ? "they stand" : "it stands"}` : ""}${rest.length ? ", " + rest.map(cw).join(", ") : ""}${off} (area and even-spread attacks aren't affected)`;
      }
      // (an effect on one part also carries its words for all four parts, said once when all four match: partsOnce)
      if (isPH(x)) {
        const pw = q => phWords({ ...q, c: (q.c || []).filter(c => PH_C.has(c.t)) }, true), tl = ow + off + (ctr(x) ? " · hit by hit" : "");
        return x.part ? { t: pw(x) + tl, part: x.part, all: pw({ ...x, part: null }) + " (all parts)" + tl } : pw(x) + tl;
      }
      if (x.sc) return sitWords(x) + ow;
      const wd = word(x), vt = stk ? stkV(x) : sgn(wv(x), "dmgB"), owT = ow ? " " + ow.slice(2).replace(/, /g, " and ") : "";
      return x.part && wd.startsWith(x.part + " ") ? { t: `${wd} ${vt}${owT}`, part: x.part, all: `${wd.slice(x.part.length + 1)} ${vt} (all parts)${owT}` } : `${wd} ${vt}${owT}`;
    });
    return partsOnce(L).join(" · ");
  };
  const rows = Object.values(by).map(es => {
    const e = es[0], stk = e.f && (e.max || 1) > 1 && e.lpm, G = e.grp && grpN[e.grp].length > 1 ? grpN[e.grp] : null;
    if (G) {
      if (grpDone.has(e.grp)) return ""; grpDone.add(e.grp);
      const ws = G.map(x => x[0].n.split(" ")), nw = ws[0].findIndex((w, j) => ws.some(y => y[j] !== w)), gn = (nw < 0 ? ws[0] : ws[0].slice(0, nw)).join(" ") || e.n;
      const cur = G.find(x => x[0].use), mod = G.some(x => x[0].f);
      return `<label class="src"><span></span><span><span class="nm">${esc(gn)}</span>
    ${mod ? `<select data-tgrp="${esc(e.grp)}" aria-label="${esc(gn)}">${[["", "none"], ...G.map(x => [x[0].b, x[0].n])].map(([v, l]) => opt(v, l, cur ? String(v) === String(cur[0].b) : v === "")).join("")}</select>` : ""}
    <div class="fx">${esc(G.map(x => `${x[0].n}: ${whatOf(x) || "not modelled yet"}`).join(" · "))}</div>${e.d ? `<span class="desc">${esc(G.map(x => x[0].d).filter(Boolean).join(" / "))}</span>` : ""}
    ${e.note ? `<span class="cd">${esc(e.note)}</span>` : ""}</span></label>`;
    }
    const what = whatOf(es, stk);
    return `<label class="src">${e.f && !stk ? `<input type="checkbox" data-tfx="${e.b}" ${e.use ? "checked" : ""}>` : `<span></span>`}<span><span class="nm">${esc(e.n)}</span>
    ${stk ? `<label class="stk">stacks <input type="number" min="0" max="${Math.min(e.max, 99)}" value="${e.use ? e.lvl : 0}" data-tlvl="${e.b}" title="0: it doesn't hold it"></label>` : ""}
    <div class="fx">${esc(what || "not modelled yet: " + (e.note || ""))}</div>${e.d ? `<span class="desc">${esc(e.d)}</span>` : ""}
    ${e.f && e.note ? `<span class="cd">${esc(stk ? stkNote(e.note) : e.note)}</span>` : ""}</span></label>`;
  });
  // its own state the bench can't see: its weapon set (some effects depend on it) and buffs of its own other effects need
  const conds = L.flatMap(e => (e.c || []).flatMap(function f(c) { return c.t === "any" ? (c.items || []).flatMap(f) : [c]; }));
  const ti = D.targets.indexOf(tg), g0 = tg.gear || 0, alts = [...new Set(conds.filter(c => c.t === "bgear" && !(c.v & g0)).map(c => c.v))];
  const ctl = [];
  if (alts.length && g0) ctl.push(`<label class="f"><span class="lbl">${esc(tg.boss)}'s weapons</span><select data-tgear="1">${[[g0, typesOf(g0) + " (fight start)"], ...alts.map(b => [b, gearName(b)])]
    .map(([b, l]) => opt(b, l, b === tgGear(ti))).join("")}</select><span class="desc">some of its effects depend on the weapons it carries; it can switch them later in the fight${tg.alt ? `. Its counter weapons (Can the target retaliate? under Situation) and its shield follow this` : ""}</span></label>`);
  for (const c of conds.filter((c, j, a) => c.t === "tbuf" && a.findIndex(x => x.t === "tbuf" && x.v === c.v) === j))
    ctl.push(`<label><input type="checkbox" data-tbuf="${c.v}" ${tgBuf(ti, c.v) ? "checked" : ""}> ${esc(tg.boss)} holds ${esc(c.bn || "that buff")} <span class="meta">${(tg.tb0 || []).includes(c.v) ? "held from the start of the fight" : "none at the start of the fight"}</span></label>`);
  return `<div class="lbl" style="margin-top:6px">Its effects on your attacks</div>
  <div class="meta">Set as at the start of the fight; untick, pick another level or change the stacks (0: it doesn't hold it) for later in the fight. Part conditions are checked shot by shot in Attacks to kill. Effects marked hit by hit change with the hits that land during your attack; every attack starts them again, so they need no setting.</div>
  ${ctl.length ? `<div class="checks fxchecks">${ctl.join("")}</div>` : ""}
  <div class="tfx">${rows.join("")}</div>`;
}
/* the stage's other bosses and what the stage does to them (tg.tnote), and the armor stacks it holds (tg.stk) */
/* the boss's abilities and its stage's effects as the game describes them, so whatever the bench doesn't model
   can be typed into the boxes (Other buffs on it; Extra bonuses for what lands on you); the wiki has the full entries */
function abilHtml(tg) {
  const ab = (tg.ab || []).map(k => (D.abil || {})[k]).filter(Boolean), se = (tg.se || []).map(i => (D.stagefx || [])[i]).filter(Boolean);
  if (!ab.length && !se.length) return "";
  const ti = D.targets.indexOf(tg);
  const link = WIKI ? `<button type="button" data-wiki-boss="${ti}">This boss in the wiki</button>`
    : `<span class="meta">(the wiki's Bosses, Enemy skills and Stage effects sheets have the full entries)</span>`;
  // under an ability, what each effect it names does ([Malfunction]: your next attack -50%), from the effect's own text
  const gl = g => (g || []).length ? `<span class="desc" style="opacity:.85">${g.map(([n, t]) => `<b>[${esc(n)}]</b> ${esc(t)}`).join("<br>")}</span>` : "";
  const one = (n, tag, d, w, g) => `<div style="padding:4px 0;border-bottom:1px dotted var(--line)"><b>${esc(n)}</b> <span class="meta">${esc(tag)}</span>${w ? ` <span class="meta">· ${esc(w)}</span>` : ""}${d ? `<span class="desc">${esc(d)}</span>` : ""}${gl(g)}</div>`;
  return `<details class="abil" style="margin-top:6px"><summary class="lbl">Its abilities and its stage (${ab.length + se.length})</summary>
  <div class="meta">As the game describes them, with what each named effect does. What the bench doesn't model as a row above: what sits on the target goes in its Other buffs on it; what it puts on your unit, and isn't a row above, goes in your Extra bonuses. ${link}</div>
  <div class="tfx">${ab.map(a => one(a.n, a.t === "skill" ? "skill" : "passive", a.d, "", a.g)).join("")}${se.map(x => one(x.n, "stage: " + x.k, x.d, x.w, x.g)).join("")}</div></details>`;
}
function tnoteHtml(tg) {
  return (tg.tnote || []).length ? `<div class="meta" style="margin-top:4px">${tg.tnote.map(esc).join("<br>")}</div>` : "";
}
/* what other sources put on the target (its allies' support skills, the stage's later buffs, anything not
   listed as a row): four boxes in %, per target; the target's note names what its stage can give it */
const TX_FIELDS = [["dmgB", "DMG taken %", "added to its DMG taken (same sum as your Damage %)"], ["npcB", "Damage factor %", "its own factor (eDMGFactor), a separate multiplier"],
["hitres", "Dodge / hit resist %", "lowers your hit chance"], ["critres", "Crit resist %", "lowers your crit rate"]];
const tgX = ti => (((T.tfx || {})[ti] || {})._x) || {};
function txHtml(tg) {
  const ti = D.targets.indexOf(tg), x = tgX(ti);
  return `<div class="lbl" style="margin-top:6px">Other buffs on it</div><div class="grid">${TX_FIELDS.map(([k, l, h]) =>
    `<label class="f"><span class="lbl">${l}</span><input type="number" step="any" data-tx="${k}" value="${x[k] || 0}" title="${esc(h)}"></label>`).join("")}</div>
  <div class="meta">For what your teammates, its allies or the stage put on it, not listed above (start of the fight: 0; a cut is negative). Don't add it to your Extra bonuses as well; an armor cut goes in each setup's Armor shred %, crit DMG taken in its Crit damage +. Instability has its own count under each setup's Situation. When an effect of yours counts the debuffs on it, count a debuff typed here under Situation: Other debuffs on the target.</div>`;
}
function stkHtml(tg) {
  if (!(tg.stk || []).length) return "";
  const ti = D.targets.indexOf(tg), pc = x => +(x * 100).toFixed(1) + "%";
  const rows = tg.stk.map(x => {
    const n = tgStk(ti, x), now = stkVal(x, n);
    return `<label class="src"><span></span><span><span class="nm">${esc(x.n)}</span>${x.src ? ` <span class="meta">(${esc(x.src)})</span>` : ""}
    <label class="stk">stacks <input type="range" min="0" max="${x.max}" step="1" value="${n}" data-tstk="${x.b}" aria-label="${esc(x.n)} stacks"> <b data-tstkv="${x.b}">${n}</b></label>
    <div class="fx">Armor +${pc(x.v * (x.lpm || 1))} per stack on every part · now +${pc(now)}${n !== x.def ? ` (start of the fight: ${x.def})` : ""}</div>
    ${x.note ? `<span class="cd">${esc(x.note)}</span>` : ""}</span></label>`;
  });
  return `<div class="lbl" style="margin-top:6px">Stacks it holds</div>
  <div class="meta">Set as at the start of the fight; change the count for later in the fight. It stays the same during one attack. The armor above follows it.</div>
  <div class="tfx">${rows.join("")}</div>`;
}
let updPending = false;
const updateSoon = () => { if (updPending) return; updPending = true; setTimeout(() => { updPending = false; update(); }, 16); };
/* a redraw keeps the keyboard focus on the same control, so arrow keys keep stepping through a select (a module or grade select,
   a row's auto / on / off menu) instead of focus falling back to the page after one step. The control is found again by its id, else by its
   data-ovr / data-sit / data-tog / data-sect / data-tdead key (the same one among those with that key in its panel) */
const FOCUS_D = ["ovr", "sit", "tog", "sect", "tdead"];
function focusKey() {
  try {
    const a = typeof document !== "undefined" && document.activeElement;
    if (!a || a === document.body || !a.tagName) return null;
    if (a.id) return { id: a.id };
    const d = FOCUS_D.find(x => a.dataset && a.dataset[x] != null); if (!d) return null;
    const box = a.closest("[id]"), sel = `[data-${d}="${CSS.escape(a.dataset[d])}"]`;
    return { d, sel, box: box && box.id, n: box ? [...box.querySelectorAll(sel)].indexOf(a) : 0 };
  } catch (e) { return null; }
}
function refocus(k) {
  if (!k) return;
  try {
    const a = document.activeElement; if (a && a !== document.body && a.isConnected) return;   // focus is still on a live control
    let el = null;
    if (k.id) el = document.getElementById(k.id);
    else {
      const box = k.box ? document.getElementById(k.box) : document; const L = box ? [...box.querySelectorAll(k.sel)] : [];
      el = L[Math.max(0, Math.min(k.n, L.length - 1))] || null;
    }
    if (el && el.isConnected && !el.disabled && el.focus) el.focus({ preventScroll: true });
  } catch (e) { }
}
function update() { const k = focusKey(); update0(); refocus(k); }
function update0() {
  applyStk(T.target);
  const tg = D.targets[T.target];
  $("t-hpv").textContent = T.hp + "%";
  $("t-stats").innerHTML = [["Model", tg.mech + (tg.cls ? " · " + tg.cls : "")], ["Defense", fmt(tg.def)], ["Armor body / limb", fmt(tg.armor.Body) + " / " + fmt(tg.armor["Left arm"])], ["Dodge", fmt(tg.dodge)], ["Crit resist", fmt(tg.crit_res)], ["HP body / limb", fmt(tg.hp.Body) + " / " + fmt(tg.hp["Left arm"])]]
    .map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join("");
  if (WIKI) $("t-stats").insertAdjacentHTML("beforeend", `<button type="button" data-wiki-boss="${T.target}">This boss in the wiki</button>`);
  const rowFx = bossFx(tg).filter(e => e.f);
  const bfx = (list, head) => list && list.length ? `<div class="lbl" style="margin-top:6px">${head}</div><div class="tfx">${list.map(b => `<div style="padding:4px 0;border-bottom:1px dotted var(--line)">
    <b>${esc(b.n)}</b>${(() => {
      const x = (tg.stk || []).find(q => String(q.b) === String(b.id)); if (x) return ` ×${tgStk(T.target, x)} <span class="meta">(see Stacks it holds)</span>`;
      // a buff with a row under Its effects on your attacks: its state there (one input), not the one-stack text alone
      const y = rowFx.find(q => String(q.b) === String(b.id)); if (!y) return "";
      return `${(y.max || 1) > 1 && y.lpm ? ` ×${y.use ? y.lvl : 0}` : ""}, ${y.use ? "on" : "off"} <span class="meta">(set under Its effects on your attacks)</span>`;
    })()}${(tg.sfx || []).some(x => x.id === b.id) ? ` <span class="meta">(from the stage)</span>` : ""}
    ${b.d ? `<span class="desc">${esc(b.d)}</span>` : ""}${b.fx.length ? `<span class="desc">Applies to the target: ${esc(b.fx.join(" · "))}</span>` : ""}</div>`).join("")}</div>` : "";
  $("t-fx").innerHTML = tnoteHtml(tg) + abilHtml(tg) + stkHtml(tg) + tfxHtml(tg) + txHtml(tg) + `<div class="meta">Buffs on the target. Their stats (HP, armor, Defense, dodge, crit and hit resist) are already in the numbers above.</div>
  ${bfx(tg.bfx, "Target's buffs") || `<div class="meta">${esc(tg.buffs || "No buffs")}</div>`}
  <div class="meta">Debuffs the enemy or stage puts on your units, other than the rows above, are off by default; add them under each setup's Extra bonuses (negative values).</div>`;
  $("t-dead").innerHTML = `<span class="lbl">Already destroyed</span>` + LIMBS.map(p => `<label><input type="checkbox" data-tdead="${p}" ${T.dead.has(p) ? "checked" : ""}> ${p.toLowerCase()}</label>`).join("")
    + `<span class="meta">start of the fight: none. Destroyed legs leave it no dodge; Attacks to kill starts from here<span id="t-whole">${wholeNote()}</span></span>`;
  // one home each: its arm under Already destroyed, its weapon set under its weapons; the tick is only for Shield Disable,
  // Defense Disabled or a stun, and it is greyed (no shield) while either of the others says so
  const shNow = tgShield(T.target), shAny = shNow || tg.shd || (tg.alt && tg.alt.shd) || null;
  $("t-shield").hidden = !shAny;
  if (shAny) {
    const sh = shAny, arm = sh.arm.toLowerCase();
    const why = !shNow ? `no shield while it carries ${esc(gearName(tgGear(T.target)))} (set under ${esc(tg.boss)}'s weapons)` : T.dead.has(sh.arm) ? `its ${arm} is destroyed (ticked under Already destroyed): no shield` : "";
    const on = !why && !(T.shOff || {})[T.target];
    // (greyed: no shield in play, so what a shield does is said as a condition, with no 'untick it' and no note about a working shield)
    const eff = `shots there deal ×${(1 + (sh.f || 0)).toFixed(2)}`;
    $("t-shield").innerHTML = `<label><input type="checkbox" data-tshield="1" ${on ? "checked" : ""}${why ? " disabled" : ""}> <b>Shield working</b> <span class="meta">${why ? why : `${esc(sh.n)} in its ${arm}${tg.shield_hp ? ` (${fmt(tg.shield_hp)} shield HP, part of that arm's HP)` : ""}`}</span></label>
    ${why ? `<div class="meta">Not counted now. ${!shNow ? `With ${sh === tg.shd ? "its fight-start weapons" : "its other weapons"} it carries ${esc(sh.n)} in its ${arm}` : `Its ${esc(sh.n)} was in its ${arm}`} (a ${sh.kind} Shield: while it works, ${sh.kind === "Large"
        ? "every shot goes to that arm" : `that arm is hit more often (+${fmt(sh.w)} hit weighting)`} and ${eff}).</div>`
        : `<div class="meta">${sh.kind === "Large" ? `Large Shield: every shot goes to its ${arm} while it stands` : `Small Shield: its ${arm} is hit more often (+${fmt(sh.w)} hit weighting)`}, and ${eff}.
    Skills that get past shields (every area attack and some others) aren't affected. Untick it while it holds Shield Disable, Defense Disabled or a stun (its arm destroyed and its weapon set are read from Already destroyed${tg.alt ? ` and ${esc(tg.boss)}'s weapons` : ""}).</div>${sh.note ? `<div class="meta">${esc(sh.note)}</div>` : ""}`}`;
  }
  const nOn = bossFx(tg).filter(e => e.use).length;
  const sk = (tg.stk || []).map(x => `${x.n} ${tgStk(T.target, x)}`);
  $("t-fxsum").textContent = [nOn ? `${nOn} damage-taken effect${nOn > 1 ? "s" : ""} on` : "", ...sk].filter(Boolean).join(" · ")
    || (tg.role === "companion" ? "second boss" : tg.buffs ? "boss buffs in its stats" : "");
  // the input panels follow every change (each setup's outcomes, no fight simulation); the results wait for Calculate
  const O = {};
  for (const id of ["A", "B"]) O[id] = outcomes(S[id]);
  for (const id of ["A", "B"]) { const R = O[id] && O[id].base; LASTR[id] = R || null; if (R) taRefresh(id, S[id], R); }
  for (const id of ["A", "B"]) { showLoaded(id); const R = O[id] && O[id].base; renderSit(id, R); renderFx(id, R, O[id]); }
  LASTO = O;
  setStale(true);
}
/* results: the panels Calculate fills, dimmed while a change hasn't been calculated yet */
const RESULT_IDS = () => ["compare", "A-out", "B-out", "A-src", "B-src", "A-bd", "B-bd"];
let STALE = true, CALCULATED = false, CALC_BUSY = false, LASTO = null;
const LAST = {};
function setStale(on) {
  STALE = on;
  RESULT_IDS().forEach(k => { const e = $(k); if (e) e.classList.toggle("stale", on && CALCULATED); });
  const b = $("calc-btn"); if (!b) return;
  b.classList.toggle("ready", on);
  b.disabled = CALC_BUSY;
  b.querySelector(".t").textContent = CALC_BUSY ? "Calculating…" : on ? "Calculate" : "Up to date";
  b.title = on ? "Settings changed since the last calculation" : "Results match the current settings";
}
function calculateSoon() {
  if (CALC_BUSY) return;
  CALC_BUSY = true; setStale(STALE);
  // let the button paint "Calculating…" before the simulation blocks the page
  setTimeout(() => { try { calculate(); } finally { CALC_BUSY = false; setStale(false); } }, 30);
}
function calculate() {
  const O = LASTO || {};
  if (!LASTO) for (const id of ["A", "B"]) O[id] = outcomes(S[id]);
  const nF = Math.min(...["A", "B"].filter(id => O[id]).map(id => fightCount(O[id])));      // same number of fights for both
  for (const id of ["A", "B"]) if (O[id]) O[id].sim = simulate(O[id], T.conf, nF);
  // both histograms on one scale, so the two setups line up across the page
  // (when the two are too far apart to share one, each gets its own and says so)
  const rangeOf = id => {
    if (!O[id] || !O[id].sim.fights) return null; const ks = Object.keys(O[id].sim.hist).map(Number).filter(k => k <= 1000);
    return ks.length ? { lo: Math.min(...ks), hi: Math.max(...ks), max: Math.max(...Object.entries(O[id].sim.hist).filter(([k]) => +k <= 1000).map(([, n]) => n / O[id].sim.fights)) } : null;
  };
  const ra = rangeOf("A"), rb = rangeOf("B"), scales = { A: ra, B: rb };
  if (ra && rb) {
    const lo = Math.min(ra.lo, rb.lo), hi = Math.max(ra.hi, rb.hi), own = Math.max(ra.hi - ra.lo, rb.hi - rb.lo);
    if (hi - lo <= 2 * own + 4) scales.A = scales.B = { lo, hi, max: Math.max(ra.max, rb.max), shared: true };
    else { scales.A = { ...ra, solo: true }; scales.B = { ...rb, solo: true }; }
  }
  for (const id of ["A", "B"]) { const R = O[id] && O[id].base; renderOut(id, O[id], id === "B" ? O.A : null, scales[id]); renderSrc(id, R); renderBd(id, R, O[id]); }
  for (const id of ["A", "B"]) LAST[id] = {out: $(id + "-out").innerHTML, src: $(id + "-src").innerHTML, bd: $(id + "-bd").innerHTML};
  CALCULATED = true;
  if (O.A && O.B) {
    const dd = (b, a, lbl, isPts) => {
      const x = isPts ? (b - a) * 100 : (a ? b / a - 1 : 0) * 100;
      return `<span>${lbl} <span class="delta ${x > 0.05 ? "up" : x < -0.05 ? "down" : ""}">${x >= 0 ? "+" : ""}${x.toFixed(1)}${isPts ? " pts" : "%"}</span></span>`;
    };
    $("compare").innerHTML = `<div class="tstats" style="color:var(--ink)"><b style="font:700 16px var(--f-display);letter-spacing:.04em">B VS A</b>` + (O.A.sim.need && O.B.sim.need ? `<span>Attacks to kill <span class="delta ${O.B.sim.need < O.A.sim.need ? "up" : O.B.sim.need > O.A.sim.need ? "down" : ""}">${O.B.sim.need - O.A.sim.need >= 0 ? "+" : ""}${O.B.sim.need - O.A.sim.need}</span> <span class="meta">(${O.B.sim.need} vs ${O.A.sim.need}, ${T.conf}% sure)</span></span>` : "")
      + dd(O.B.exp, O.A.exp, "Avg DMG per attack") + dd(O.B.sim.worstPct, O.A.sim.worstPct, "Unlucky attack", true) + dd(O.B.base.hit, O.A.base.hit, "FinalHit_chance", true) + dd(O.B.base.crit, O.A.base.crit, "FinalCrit_chance", true) + (() => {
        const a = O.A.base, b = O.B.base, why = [];
        if (a.baseShots !== b.baseShots) why.push("Nshots_base"); if (bdSkill(a) !== bdSkill(b)) why.push("skill");
        if (Math.abs(a.suit.atk - b.suit.atk) > 1e-9) why.push("Suit_coeff");
        const x = (a.srcAtk ? b.srcAtk / a.srcAtk - 1 : 0) * 100;
        return why.length ? `<span>srcAtk <span class="delta" title="Not a like-for-like comparison">${x >= 0 ? "+" : ""}${x.toFixed(1)}%</span> <span class="meta">(different ${why.join(", ")})</span></span>`
          : dd(b.srcAtk, a.srcAtk, "srcAtk");
      })()
      + `</div><div class="meta">B compared with A: green = B is better (attacks to kill: fewer is better). % = relative difference; pts = percentage points (B − A); unlucky attack = the worst ${100 - T.conf}% of attacks as a share of the average.</div>`;
  } else $("compare").innerHTML = `<div class="meta">Equip a weapon on both setups to compare.</div>`;
}

/* ------------------------------------------------------------------ save / load (kept in this browser's storage) */
let SAVES = [];
const LS = "bench-loadouts";
let rdTimer = null;
const saveRDSoon = () => { clearTimeout(rdTimer); rdTimer = setTimeout(saveRD, 600); };
async function saveRD() {
  const rec = { v: JSON.stringify(RDO), saved: new Date().toISOString().slice(0, 16).replace("T", " ") };
  try { localStorage.setItem("bench-rd", rec.v); } catch (e) { }
}
async function loadRD() {
  try {
    RDO = JSON.parse(localStorage.getItem("bench-rd") || "{}");
  } catch (e) { RDO = {}; }
  renderSide("A"); renderSide("B"); renderRD(); update(); calculateSoon();
}
async function refreshSaves() {
  try { SAVES = JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { SAVES = []; }
  SAVES.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  ["A", "B"].forEach(fillSaves);
}
/* "Loaded: …" above the setup; marked "edited since" once anything differs from what was loaded */
// (an empty Situation is the same as none, so a Situation compute() starts on a setup doesn't read as an edit)
// (a box typed and cleared again leaves an empty container (s.sit.mode = {}) or the HP box's 100, the same as never typed:
// empty values and containers are dropped and Your HP 100 reads as unset, so clearing a box back to its start isn't an edit)
const snapPrune = v => {
  if (v === undefined || v === null || v === "") return undefined; if (typeof v !== "object" || Array.isArray(v)) return v;
  const o = {}; for (const [k, x] of Object.entries(v)) { const y = snapPrune(x); if (y !== undefined) o[k] = y; } return Object.keys(o).length ? o : undefined;
};
// (the rows' overrides and the parts' 'set by you' markers too: emptied, they read as unset)
const snap = s => JSON.stringify({
  ...s, loaded: undefined, name: undefined, sit: snapPrune(s.sit), ovr: snapPrune(s.ovr), grU: snapPrune(s.grU), mdU: snapPrune(s.mdU),
  extra: s.extra ? { ...s.extra, ohp: s.extra.ohp == null || s.extra.ohp === "" || +s.extra.ohp === 100 ? undefined : s.extra.ohp } : s.extra
});
function markLoaded(s, info) { s.loaded = { ...info, snap: snap(s) }; }
function showLoaded(id) {
  const s = S[id], el = $(id + "-loaded"); if (!el) return;
  el.hidden = !s.loaded; if (!s.loaded) return;
  const edited = snap(s) !== s.loaded.snap;
  el.innerHTML = `<span class="lbl">Loaded save</span> <b>${esc(s.loaded.label)}</b>${edited ? ' <span class="pill">edited since</span>' : ""}`;
}
function fillSaves(id) {
  const el = $(id + "-svlist"); if (!el) return;
  el.innerHTML = SAVES.length ? SAVES.map(x => opt(x.id, `${x.name} · ${x.saved || ""}`)).join("") : opt("", "No saved loadouts yet");
}
async function saveLoadout(id) {
  const s = S[id], name = ($(id + "-svname").value || "").trim() || (D.pilots[s.pilot].name + " loadout");
  s.name = name;
  const existing = SAVES.find(x => x.name === name);
  const rec = { name, saved: new Date().toISOString().slice(0, 16).replace("T", " "), state: JSON.stringify(s) };
  const docId = existing ? existing.id : "lo_" + Date.now().toString(36);
  try {
    const all = SAVES.filter(x => x.id !== docId); all.push({ id: docId, ...rec }); localStorage.setItem(LS, JSON.stringify(all));
    $(id + "-svmsg").textContent = `Saved "${name}" in this browser only`;
  } catch (e) { $(id + "-svmsg").textContent = "Could not save: " + (e && e.code || e); }
  await refreshSaves();
}
function loadLoadout(id) {
  const x = SAVES.find(v => v.id === $(id + "-svlist").value);
  if (!x) return;
  try {
    const st = JSON.parse(x.state); if (!D.pilots[st.pilot] || !D.sts[st.st]) throw 0;
    for (const w of Object.values(st.w || {})) if (w && !D.weapons[w.id] && D.alias[w.id]) w.id = D.alias[w.id];
    for (const w of Object.values(st.w || {})) if (w) for (const c of w.comps || []) if (D.components[c.id] && D.components[c.id].k === "RA" && !c.mode) c.mode = "chance";
    st.skills = (st.skills || []).map((k, i, a) => a.indexOf(k) === i ? k : null);
    // older saves aren't converted; what the page doesn't read is dropped, so no second
    // copy of a value stays: the rows' stacks boxes (st.stk), the separate Instability box (st.sit.st.instab: Instability is one count, the target's
    // Instability level), the ticks of rows a buff's level decides (level-only rows) and of rows the bench decides in this attack
    // (e.g. Venus MK7 unticked in an older save: Special Load decides it)
    st.tog ||= {}; st.extra ||= {}; delete st.stk;
    // no part counts as set by you after a load (the body's next pick updates every part); an override other than on / off goes
    st.grU = {}; st.mdU = {};
    if (st.ovr) { for (const [k, v] of Object.entries(st.ovr)) if (v !== "on" && v !== "off") delete st.ovr[k]; if (!Object.keys(st.ovr).length) delete st.ovr; }
    // (an older save's copy of the terrain in Extra bonuses; the terrain is Situation > Terrain under the target / under you alone)
    for (const k of ["burnT", "burnOwn", "burnSelf"]) delete st.extra[k];
    // (Peripheral Vision's tick in older saves: the Situation select alone sets it; an after-combat RA's tick keyed by a weapon slot: it is one row
    // per accessory 'rah:<id>')
    delete st.extra.pvOff;
    for (const k of Object.keys(st.tog)) if (/^rah:[A-Z]{2}:/.test(k)) delete st.tog[k];
    if (st.sit && st.sit.st) delete st.sit.st.instab;
    // (and older saves' level entries under keys the page doesn't read: a family's higher level (stored under its lowest level's key), Euphoria
    // (stored as its count), a stacking debuff on the target (stored under 't:' + its key))
    if (st.sit && st.sit.mode) {
      const FX = Object.values(D.fx).flat();
      for (const k of Object.keys(st.sit.mode)) {
        if (!/^\d+$/.test(k)) continue; const b = +k, L = FX.filter(e => e.b === b && isLv(e));
        if (String(lvK(b, false)) !== k || (L.length && L.every(e => e.tgt))) delete st.sit.mode[k];
      }
    }
    // (and of the rows whose buffs are up already from a row that needs none.) Whether a row is decided, covered or a follower
    // depends on the attack, so a tick goes only when NO attack of the setup reads it: on every attack the row shows on (either hand, every
    // skill) it is level-only, decided or covered. Wyatt's The Exiled 4 is covered on Twin-Blade Saw and live on Normal Attack: kept. A
    // follower's tick is read through its group (the group is on while any of its rows is ticked): kept. A row hidden on some attack: kept
    try {
      const weap = equipped(st), dead = new Map();
      for (const slot of Object.keys(weap)) for (const [k] of attackOpts({ ...st, atk: { slot, skill: "normal" } }, weap)) {
        let R0 = null; try { R0 = compute(JSON.parse(JSON.stringify({ ...st, atk: { slot, skill: k } }))); } catch (e) { }
        if (R0) for (const r of R0.rows) if (r.src.kind !== "ra")
          dead.set(r.src.key, dead.get(r.src.key) !== false && !r.hide && !r.follow && (r.lvOnly || !!r.cover || (!(r.a0 ? r.a0.ask : r.ask) && r.src.kind !== "code")));
      }   // (a forced row by its natural ask)
      for (const [k, d] of dead) if (d) delete st.tog[k];
    } catch (e) { }
    try { compute(st); } catch (e) { }          // (on the setup itself before its snapshot: what it fills in isn't an edit)
    delete st.loaded; markLoaded(st, { kind: "save", label: x.name }); S[id] = st; renderSide(id); update(); $(id + "-svmsg").textContent = `Loaded "${x.name}"`;
  }
  catch (e) { $(id + "-svmsg").textContent = "That loadout no longer matches the game data."; }
}
let delArmed = null;
async function deleteLoadout(id) {
  const x = SAVES.find(v => v.id === $(id + "-svlist").value);
  if (!x) return;
  if (delArmed !== x.id) { delArmed = x.id; $(id + "-svmsg").textContent = `Press Delete again to remove "${x.name}".`; return; }
  delArmed = null;
  try {
    localStorage.setItem(LS, JSON.stringify(SAVES.filter(v => v.id !== x.id)));
    $(id + "-svmsg").textContent = `Deleted "${x.name}"`;
  } catch (e) { $(id + "-svmsg").textContent = "Could not delete: " + (e && e.code || e); }
  await refreshSaves();
}

/* export / import. Export: every saved loadout as one file, or as text to copy where a viewer blocks downloads (the bench
   inside the wiki). Import: an export (text or file), or a units file ({units: [...]} in the bench's unit form): each unit becomes a saved
   loadout named "<pilot> (<where it was saved>)"; a unit whose pilot or ST the bench doesn't list is skipped and named. A loadout with
   the name of one already saved replaces it, as Save does. */
const IO_FORMAT = "mecharashi-bench-loadouts";
const exportText = () => JSON.stringify({
  format: IO_FORMAT, version: 1, exported: new Date().toISOString(),
  loadouts: SAVES.map(({ name, saved, state }) => ({ name, saved, state }))
}, null, 1);
function ioBox(id, mode) {
  const box = $(id + "-io"); if (!box) return;
  if (!mode || box.dataset.mode === mode) { box.innerHTML = ""; box.dataset.mode = ""; return; }
  box.dataset.mode = mode;
  if (mode === "export") {
    box.innerHTML = `<span class="meta">${SAVES.length} saved loadout${SAVES.length === 1 ? "" : "s"}. Save the file, or copy the text somewhere
    safe; Import reads either back.</span><textarea readonly id="${id}-iotxt"></textarea>
    <div class="saves"><button type="button" id="${id}-iofile">Save as a file</button><button type="button" id="${id}-iocopy">Copy the text</button>
    <button type="button" id="${id}-iox">Close</button></div>`;
    $(id + "-iotxt").value = exportText();
    $(id + "-iofile").addEventListener("click", () => exportFile(id));
    $(id + "-iocopy").addEventListener("click", async () => {
      const ta = $(id + "-iotxt");
      try { await navigator.clipboard.writeText(ta.value); $(id + "-svmsg").textContent = "Copied."; }
      catch (e) { ta.focus(); ta.select(); $(id + "-svmsg").textContent = "Selected: press Ctrl+C to copy."; }
    });
  } else {
    box.innerHTML = `<span class="meta">Paste an export or a units file, or pick the file.</span><textarea id="${id}-iotxt" placeholder="Paste here"></textarea>
    <div class="saves"><input type="file" id="${id}-iofilein" accept=".json,application/json,text/plain">
    <button type="button" id="${id}-iogo">Import</button><button type="button" id="${id}-iox">Cancel</button></div>`;
    $(id + "-iofilein").addEventListener("change", e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => importText(id, String(rd.result)); rd.readAsText(f);
    });
    $(id + "-iogo").addEventListener("click", () => importText(id, $(id + "-iotxt").value));
  }
  $(id + "-iox").addEventListener("click", () => ioBox(id, null));
}
async function exportFile(id) {
  const name = `bench_loadouts_${new Date().toISOString().slice(0, 10)}.json`, blob = new Blob([exportText()], { type: "application/json" });
  try {
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
    $(id + "-svmsg").textContent = `Saved ${name} (if nothing was saved, this page blocks downloads: copy the text instead).`;
  } catch (e) { $(id + "-svmsg").textContent = "This page can't save files: copy the text instead."; }
}
function unitToSave(u) {
  const P = u && D.pilots[u.pilot];
  if (!P) return { why: `a pilot the bench doesn't list (${u && u.pilot})` };
  if (!D.sts[u.st]) return { why: `${P.name} (its ST isn't in the bench's list)` };
  let s; try { s = fromUnit(u); } catch (e) { return { why: `${P.name} (could not be read)` }; }
  return { rec: { name: s.name, state: JSON.stringify(s) } };
}
async function importText(id, text) {
  const msg = m => { $(id + "-svmsg").textContent = m; };
  let o; try { o = JSON.parse(text); } catch (e) { return msg("That isn't an export or a units file: the text is not valid JSON."); }
  let recs = [];
  const skipped = [];
  if (o && o.format === IO_FORMAT && Array.isArray(o.loadouts))
    recs = o.loadouts.filter(x => x && x.name && x.state).map(x => ({ name: String(x.name), state: typeof x.state === "string" ? x.state : JSON.stringify(x.state) }));
  else if (o && Array.isArray(o.units))
    for (const u of o.units) { const r = unitToSave(u); if (r.rec) recs.push(r.rec); else skipped.push(r.why); }
  else return msg("That isn't an export of saved loadouts or a units file.");
  const saved = new Date().toISOString().slice(0, 16).replace("T", " ");
  let added = 0, replaced = 0;
  try {
    const all = SAVES.slice();
    for (const [i, r] of recs.entries()) {
      const ex = all.find(x => x.name === r.name), docId = ex ? ex.id : "lo_" + Date.now().toString(36) + i.toString(36);
      const rec = { name: r.name, saved, state: r.state };
      const k = all.findIndex(x => x.id === docId); if (k >= 0) all[k] = { id: docId, ...rec }; else all.push({ id: docId, ...rec });
      ex ? replaced++ : added++;
    }
    localStorage.setItem(LS, JSON.stringify(all));
  } catch (e) { return msg("Could not save the imported loadouts: " + (e && e.code || e)); }
  await refreshSaves();
  ioBox(id, null);
  msg(`Imported ${added + replaced}: ${added} new, ${replaced} replaced (in this browser only)`
    + (skipped.length ? `. Skipped ${skipped.length}: ${skipped.join("; ")}` : "") + ".");
}

/* ------------------------------------------------------------------ icon dropdowns */
/* a native <select> can't show images, so a select whose options carry data-icon gets a button + list in its place;
   the select stays (hidden) as the source of truth: picking sets its value and fires "change" for the wiring */
let ICON_MENU = null;
function closeIconMenu(focus) { if (!ICON_MENU) return; const m = ICON_MENU; ICON_MENU = null; m.list.remove(); m.btn.setAttribute("aria-expanded", "false"); if (focus) m.btn.focus(); }
const iconImg = (src, cls) => src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">` : `<span class="${cls}"></span>`;
function iconSelects(root) {
  root.querySelectorAll("select").forEach(selEl => {
    if (selEl.dataset.iconized || !selEl.querySelector("option[data-icon]")) return;
    selEl.dataset.iconized = "1"; selEl.hidden = true;
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "isel"; btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
    const paint = () => { const o = selEl.options[selEl.selectedIndex];
      btn.innerHTML = iconImg(o && o.dataset.icon, "ico") + `<span class="t">${esc(o ? o.text : "")}</span><span class="car" aria-hidden="true">▾</span>`; btn.disabled = selEl.disabled; };
    paint(); selEl.after(btn);
    selEl.addEventListener("change", paint);
    btn.addEventListener("click", () => ICON_MENU && ICON_MENU.btn === btn ? closeIconMenu() : openIconMenu(selEl, btn));
    btn.addEventListener("keydown", e => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key) && !ICON_MENU) { e.preventDefault(); openIconMenu(selEl, btn); } });
  });
}
function openIconMenu(selEl, btn) {
  closeIconMenu();
  const list = document.createElement("div"); list.className = "isel-list"; list.setAttribute("role", "listbox");
  const opts = [...selEl.options], many = opts.length > 12;
  list.innerHTML = (many ? `<input type="text" class="isel-q" placeholder="Filter…" aria-label="Filter">` : "") + `<div class="isel-items">` +
    [...selEl.children].map(c => c.tagName === "OPTGROUP" ? `<div class="isel-g">${esc(c.label)}</div>` + [...c.children].map(o => itemHtml(o)).join("") : itemHtml(c)).join("") + `</div>`;
  function itemHtml(o) { return `<div class="isel-o${o.selected ? " on" : ""}" role="option" data-i="${o.index}" aria-selected="${o.selected}">${iconImg(o.dataset.icon, "ico")}<span>${esc(o.text)}</span></div>`; }
  document.body.append(list);
  const r = btn.getBoundingClientRect(), below = innerHeight - r.bottom, up = below < 260 && r.top > below;
  list.style.left = Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 260) - 8)) + "px"; list.style.minWidth = r.width + "px";
  list.style.maxHeight = Math.max(160, Math.min(380, (up ? r.top : below) - 12)) + "px";
  if (up) list.style.bottom = (innerHeight - r.top + 4) + "px"; else list.style.top = (r.bottom + 4) + "px";
  ICON_MENU = {list, btn};
  btn.setAttribute("aria-expanded", "true");
  const items = () => [...list.querySelectorAll(".isel-o:not([hidden])")];
  let cur = items().findIndex(x => x.classList.contains("on"));
  const mark = i => { const its = items(); if (!its.length) return; cur = (i + its.length) % its.length; its.forEach((x, j) => x.classList.toggle("hi", j === cur)); its[cur].scrollIntoView({block: "nearest"}); };
  const pick = el => { const i = +el.dataset.i; closeIconMenu(true); if (selEl.selectedIndex !== i) { selEl.selectedIndex = i; selEl.dispatchEvent(new Event("change", {bubbles: true})); } };
  list.addEventListener("mousedown", e => { if (!e.target.closest(".isel-q")) e.preventDefault(); });
  list.addEventListener("click", e => { const o = e.target.closest(".isel-o"); if (o) pick(o); });
  list.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); mark(cur + (e.key === "ArrowDown" ? 1 : -1)); }
    else if (e.key === "Enter") { e.preventDefault(); const its = items(); if (its[cur]) pick(its[cur]); }
    else if (e.key === "Escape" || e.key === "Tab") { e.preventDefault(); closeIconMenu(true); } });
  const q = list.querySelector(".isel-q");
  if (q) q.addEventListener("input", () => { const t = q.value.trim().toLowerCase();
    list.querySelectorAll(".isel-o").forEach(o => { o.hidden = !!t && !o.textContent.toLowerCase().includes(t); });
    list.querySelectorAll(".isel-g").forEach(g => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains("isel-g")) { any ||= !n.hidden; n = n.nextElementSibling; } g.hidden = !any; });
    mark(0); });
  list.tabIndex = -1; (q || list).focus({preventScroll: true});
  if (cur >= 0) mark(cur);
}
document.addEventListener("mousedown", e => { if (ICON_MENU && !ICON_MENU.list.contains(e.target) && !ICON_MENU.btn.contains(e.target)) closeIconMenu(); });
addEventListener("resize", () => closeIconMenu());
addEventListener("scroll", e => { if (ICON_MENU && !ICON_MENU.list.contains(e.target)) closeIconMenu(); }, true);


/* ------------------------------------------------------------------ init */
/* the one target-change routine (the target list and the wiki's 'make this boss the target'): a new target starts with nothing
   destroyed */
function setTarget(i) {
  T.target = i; T.dead = new Set();
  const el = $("t-target"); if (el && String(el.value) !== String(i)) { el.value = String(i); el.dispatchEvent(new Event("change")); return; }
  update();
}
function init() {
  $("meta").textContent = `Damage Bench v${BENCH_VERSION}`;      // +0.01 per published change
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
  { let v = "bench"; try { v = localStorage.getItem("bench-view") || "bench"; } catch (e) { } showView(v === "rd" ? "rd" : "bench"); }
  const groups = {};
  D.targets.forEach((t, i) => (groups[t.content] ||= []).push(i));
  $("t-target").innerHTML = Object.entries(groups).map(([g, is]) => `<optgroup label="${esc(g)}">` + is.map(i => opt(i, D.targets[i].label, i === T.target, icon("boss", D.targets[i].boss))).join("") + `</optgroup>`).join("");
  $("calc-btn").addEventListener("click", calculateSoon);
  $("t-target").addEventListener("change", e => setTarget(+e.target.value));
  iconSelects($("t-target").parentNode);
  $("t-dead").addEventListener("change", e => { const p = e.target.dataset.tdead; if (!p) return; if (e.target.checked) T.dead.add(p); else T.dead.delete(p); update(); });
  $("t-shield").addEventListener("change", e => { if (!e.target.dataset.tshield) return; T.shOff[T.target] = !e.target.checked; update(); });
  $("t-fx").addEventListener("input", e => {
    const k = e.target.dataset.tstk; if (!k) return;      // the count while dragging; the bench updates on release
    const v = document.querySelector(`[data-tstkv="${k}"]`); if (v) v.textContent = e.target.value;
  });
  $("t-fx").addEventListener("change", e => {
    const b = e.target.dataset.tfx, l = e.target.dataset.tlvl, gr = e.target.dataset.tgear, tb = e.target.dataset.tbuf, sk = e.target.dataset.tstk, tg = e.target.dataset.tgrp;
    // a group of levels (Alert Mode I / II / III): one choice, the others off ('none': all off)
    if (tg != null && tg !== "") {
      const set = (T.tfx[T.target] ||= {}), v = e.target.value;
      for (const y of D.targets[T.target].dfx || []) if (String(y.grp) === tg) (set[y.b] ||= {}).on = String(y.b) === v;
      update(); return;
    }
    if (sk) {
      const x = (D.targets[T.target].stk || []).find(y => String(y.b) === sk);
      if (x) (T.tfx[T.target] ||= {})["stk:" + sk] = { lvl: Math.max(0, Math.min(x.max, Math.round(+e.target.value) || 0)) }; update(); return;
    }
    if (gr) { (T.tfx[T.target] ||= {})._gear = +e.target.value; update(); return; }
    if (tb) { (T.tfx[T.target] ||= {})["buf:" + tb] = { on: e.target.checked }; update(); return; }
    const tx = e.target.dataset.tx;
    if (tx) { ((T.tfx[T.target] ||= {})._x ||= {})[tx] = +e.target.value || 0; update(); return; }
    if (!b && !l) return;
    const set = (T.tfx[T.target] ||= {}), k = b || l, cur = set[k] || (set[k] = {});
    // (a stacking row: its count, 0 = it doesn't hold it, no tick)
    if (b) cur.on = e.target.checked; else { const n = Math.max(0, Math.min(+e.target.max || 99, Math.round(+e.target.value) || 0)); cur.on = n > 0; if (n > 0) cur.lvl = n; else delete cur.lvl; }
    // rows of one buff group are one choice (the game keeps only one level: Alert Mode I / II / III)
    if (b && e.target.checked || l && cur.on) {
      const row = (D.targets[T.target].dfx || []).find(y => String(y.b) === String(k));
      if (row && row.grp) for (const y of D.targets[T.target].dfx) if (y.grp === row.grp && String(y.b) !== String(k)) (set[y.b] ||= {}).on = false;
    }
    update();
  });
  $("t-part").addEventListener("change", e => { const v = e.target.value; if (v === "scatter") T.mode = "scatter"; else { T.mode = "focus"; T.part = v; } update(); });
  $("t-hp").addEventListener("input", e => { T.hp = +e.target.value; $("t-hpv").textContent = T.hp + "%"; const w = $("t-whole"); if (w) w.textContent = wholeNote(); updateSoon(); });
  $("t-conf").addEventListener("input", e => { T.conf = +e.target.value; $("t-confv").textContent = T.conf + "%"; updateSoon(); });
  S.A = blankSide(pilotIds[0]);            // blank setups; your units and loadouts come from Save / load (Import)
  S.B = blankSide(pilotIds[0]);
  renderSide("A"); renderSide("B"); update();
  refreshSaves(); loadRD();
}
init();
/* wiki -> bench: put a pilot in a setup (as picking it in the Pilot list: the mech stays when the pilot can drive its class, else a blank
   side of the pilot's own class), make a boss the target; each request is answered with an ack */
function wikiSetPilot(m) {
  const side = m.side === "B" ? "B" : "A", id = String(m.pilotId || ""), P = D.pilots[id];
  if (!P) return toWiki("ack", { req: m.req, ok: false, message: "this pilot is not in the bench's data" });
  const old = S[side], n = blankSide(id);
  if (P.stars[0] && P.stars[0].drive === stClass(old)) {
    // (the same list as the Pilot select: the parts' levels and the 'own ST not in the data' note go along with the ST)
    for (const k of KEEP_ON_PILOT) if (old[k] !== undefined) n[k] = old[k];
    if (P.class === D.pilots[old.pilot].class) n.pf = old.pf;
  }
  S[side] = n; showView("bench"); renderSide(side); update();
  toWiki("ack", { req: m.req, ok: true });
}
function wikiSetTarget(m) {
  const L = D.targets, same = (a, b) => a != null && b != null && String(a) === String(b);
  let i = m.bossId ? L.findIndex(t => same(t.bid, m.bossId)) : -1;
  if (i < 0 && m.battle != null) {
    const c = []; L.forEach((t, k) => { if (same(t.battle, m.battle) && (!m.boss || t.boss === m.boss)) c.push(k); });
    if (c.length) i = c[Math.min(+m.nth || 0, c.length - 1)];
  }
  if (i < 0 && m.label) i = L.findIndex(t => t.label === m.label);
  if (i < 0) return toWiki("ack", { req: m.req, ok: false, message: "this boss is not one of the bench's targets" });
  showView("bench"); setTarget(i);
  toWiki("ack", { req: m.req, ok: true });
}
if (WIKI) {
  window.addEventListener("message", e => {
    const m = e.data;
    if (e.source !== WIKI || !m || m.src !== "mecharashi-wiki") return;
    if (m.type === "setPilot") wikiSetPilot(m);
    else if (m.type === "setTarget") wikiSetTarget(m);
    else if (m.type === "theme") { if (m.theme === "auto") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = m.theme; }
  });
  /* bench -> wiki: buttons with data-wiki="kind:id" (pilot:10103118 ...) or data-wiki-boss="<target index>" open that page in the wiki */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-wiki]"), t = e.target.closest("[data-wiki-boss]");
    if (b) { const [kind, id] = b.dataset.wiki.split(":"); toWiki("openWiki", { kind, id, name: b.dataset.wikiName || "" }); }
    else if (t) { const tg = D.targets[+t.dataset.wikiBoss]; if (tg) toWiki("openWiki", { kind: "boss", bossId: tg.bid, battle: tg.battle, name: tg.boss }); }
  });
  toWiki("ready", { version: BENCH_VERSION });
}
