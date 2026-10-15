const D = window.BenchData;
const BENCH_VERSION = "0.80";      // bump by .01 per published change; 1.0 when ready for regular use
const PARTS = ["Body", "Left arm", "Right arm", "Legs"];
const SLOTS = [["RH", "Right hand"], ["LH", "Left hand"], ["RS", "Right shoulder"], ["LS", "Left shoulder"], ["BK", "Back"]];
const CATS = ["Melee", "Assault", "Sniper", "Heavy"];
const ATTRS = ["Melee", "Assault", "Snipe", "Ranged", "Mechanic", "Defense"];
const RD_CAT = {Melee: "Melee Weapon", Assault: "Assault Weapon", Sniper: "Ranged Weapon", Heavy: "Tactical Weapon", FixedArms: "Tactical Weapon"};
const FIELD = {attr_add: "Attribute +", attr_pct: "Attribute %", atk_add: "Attack +", atk_pct: "Attack %", fp_add: "FP +", fp_pct: "FP %",
  whit_add: "Weapon hit +", whit_pct: "Weapon hit %", ahit_add: "Arm hit +", ahit_pct: "Arm hit %", hitrate: "Hit chance +", hit_cat_pct: "Weapon & arm hit %", dodge_rate: "Hit taken −", crit_rate: "Crit rate +", crit_mul: "Crit rate × (features)",
  crit_app_add: "Weapon crit points +", crit_app_flat: "Crit points +", crit_app_pct: "Weapon crit points %", crit_app_fin: "Crit points (final) +", crit_fin: "Crit rate after features +", crit_dmg: "Crit damage +", dmgB: "Damage %", finalB: "Final damage %", npcB: "Target damage factor %",
  skillM: "Skill multiplier +", fixB: "Fixed DMG % (Explosive Charge)", splash: "Flame DMG %", shots: "Shots +", shots_pct: "Shots %", hitres: "Target hit reduction", critres: "Target crit-rate resist", armor_pct: "Target armor %", pwhit: "Target hit weighting +",
  br: "Ideal range (tiles)", brin: "Ideal range reaches closer by", brout: "Ideal range reaches farther by", brx: "Ideal range grows with attack range", brm: "Other hand's ideal range counts", rng: "Attack range +", mov: "Movement +", ammo: "Magazine +", apmax: "Max AP +", aim: "Aims the attack"};
/* part-targeting effects (BufFuncType_WapPartDamageWeightAdjust): text per mode */
const PWMODE = {1: "Hit weighting of the lowest-HP part +", 2: "Hit weighting of the highest-HP part +", 3: "Hit weighting +", 4: "Shots always hit", 5: "Shots always hit the body",
  6: "Shots always hit the lowest-HP part", 7: "Shots always hit the highest-HP part", 8: "Shots always hit the lowest HP % part", 9: "Shots always hit the highest HP % part",
  10: "Shots always hit an arm", 11: "Shots always hit a damaged part", 12: "Shots always hit an arm carrying a weapon"};
const wtNames = m => Object.entries(D.wtBits || {}).filter(([, b]) => m & b).map(([k]) => TYPE_NAMES[k] || k).join(" / ");
const TYPE_NAMES = {Knuckle: "Knuckles", Rod: "Polearm", PileBunker: "Pile Bunker", Buckler: "Small Shield", MachineGun: "Machine Gun", HeavyMachineGun: "Heavy Machine Gun",
  ShotGun: "Shotgun", LightSniper: "Light Rifle", HeavySniper: "Sniper Rifle", Missile: "Missile Launcher", Rocket: "Rocket Launcher", Shield: "Large Shield",
  RailGun: "Rail Gun", Flamethrower: "Flamethrower", Saw: "Chainsaw", Blade: "Alter-Blade", Funnel: "Cutter"};
const pwText = e => e.m <= 3 ? `${PWMODE[e.m]}${e.m === 3 && e.pt ? " (" + e.pt.toLowerCase() + ")" : ""} ${fmt(e.v)}` : e.m === 4 ? (e.pt ? `Shots always hit the ${e.pt.toLowerCase()}` : "Shots always hit a damaged part") : PWMODE[e.m];
const PCT = new Set(["fixB", "splash", "shots_pct","hitres","critres","attr_pct","atk_pct","fp_pct","whit_pct","ahit_pct","hit_cat_pct","dodge_rate","hitrate","crit_rate","crit_mul","crit_app_pct","crit_dmg","dmgB","finalB","armor_pct","npcB"]);
const atanN = x => Math.atan(x) / (Math.PI / 2);
const fmt = (x, d = 0) => Number.isFinite(x) ? x.toLocaleString("en-US", {minimumFractionDigits: d, maximumFractionDigits: d}) : "–";
const pct = (x, d = 1) => Number.isFinite(x) ? (x * 100).toFixed(d) + "%" : "–";
const sgn = (v, f) => PCT.has(f) ? (v >= 0 ? "+" : "") + +(v * 100).toFixed(1) + "%" : (v >= 0 ? "+" : "") + fmt(v, Math.abs(v) < 10 && v % 1 ? 2 : 0);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
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
const catLabel = c => ({Melee: "Melee", Assault: "Assault", Sniper: "Ranged", Heavy: "Tactical"}[c] || c);
const SEC_N = {"α": "a", "β": "b", "γ1": "y1", "γ2": "y2"};      // chip sectors as the game writes them (Neural Drive - y1); the data and saved loadouts keep the Greek keys
const secName = sec => "Neural Drive - " + (SEC_N[sec] || sec);

/* ------------------------------------------------------------------ state */
const T = {target: Math.max(0, D.targets.findIndex(t => t.content === "Live Ammunition Training")), part: "Left arm", mode: "scatter", hp: 100, conf: 90,
  tfx: {}};       // the boss's damage-taken effects you switched: {target index: {buff id: {on, lvl}}}
const S = {A: null, B: null};

function blankSide(pilot) {
  const P = D.pilots[pilot] || D.pilots[pilotIds[0]];
  const dcls = (P.stars[0] && P.stars[0].drive) || "Medium";
  const st = stIds.find(k => D.sts[k].cls === dcls) || stIds[0];
  const s = {pilot, star: 0, screen: {}, chips: {}, skills: [null, null, null], ex: null, pf: [null, null, null], stf: [null, null, null], wf: [null, null, null],
    sect: {"γ1": [false, false, false, false, false], "γ2": [false, false, false, false, false]}, st, pst: {}, grades: {}, mods: {}, back: null,
    w: {}, atk: {slot: "RH", skill: "normal"}, tog: {}, stk: {}, extra: {dmgB: 0, finalB: 0, hitrate: 0, crit_rate: 0, crit_fin: 0, shred: 0, attr: 0}};
  PARTS.forEach(p => { s.grades[p] = D.sts[st].parts[p].grades.length - 1; s.mods[p] = null; });
  const wid = Object.keys(D.weapons).find(k => D.weapons[k].slot === "Hand" && D.weapons[k].cat === "Assault" && D.weapons[k].cls.includes(dcls) && wOk(k));
  if (wid) s.w.RH = newWeapon(wid);
  return s;
}
function newWeapon(id) {
  const W = D.weapons[id];
  return {id, impr: true, atk: W.adv[1] || 0, opts: [null, null], drop: null, comps: []};
}
function fromUnit(u) {
  const s = blankSide(u.pilot);
  Object.assign(s, {star: u.star, screen: {...u.screen}, chips: {...u.chips}, skills: u.skills.slice(0, 3), ex: u.ex, pf: u.pf.slice(), stf: u.stf.slice(), wf: u.wf.slice(),
    sect: JSON.parse(JSON.stringify(u.sect)), secOff: (u.secOff || []).slice(), st: D.sts[u.st] ? u.st : s.st, grades: {...u.grades}, mods: {}, back: u.back ? "bp:" + u.back : null, w: {}});
  s.pst = {}; for (const p of PARTS) if (u.pst && u.pst[p] && u.pst[p] !== s.st && D.sts[u.pst[p]]) s.pst[p] = u.pst[p];
  for (const p of PARTS) { s.mods[p] = u.mods[p]; const pr = stOf(s).parts[p]; if (!pr.grades[s.grades[p]]) s.grades[p] = pr.grades.length - 1; }
  for (const [slot, w] of Object.entries(u.w)) {
    if (!D.weapons[w.id]) continue;
    s.w[slot] = {id: w.id, impr: w.impr, atk: w.atk, opts: [w.opts[0] || null, w.opts[1] || null].map(o => o && D.fx[o.fx] ? {fx: o.fx, v: o.v} : null),
                 drop: w.drop, comps: w.comps.map(c => ({id: c.id, mode: "off"}))};
  }
  if (u.w.BK && D.weapons[u.w.BK.id]) s.back = "w";
  s.atk = {slot: s.w.RH ? "RH" : Object.keys(s.w)[0] || "RH", skill: "normal"};
  for (const w of Object.values(s.w)) for (const c of w.comps) if (D.components[c.id] && D.components[c.id].k === "RA") c.mode = "chance";
  s.name = D.pilots[u.pilot].name + " (" + u.from + ")";
  return s;
}

/* ------------------------------------------------------------------ rules */
const stClass = s => D.sts[s.st].cls;
/* backpacks for this class: one entry per name + rarity tier (R / SR / SSR… have different strengths), lowest tier first;
   copies of a tier with no effects (trial / enemy versions) are left out unless it is the one equipped */
const RAR = ["C", "R", "SR", "SSR", "SSSR"];
function backList(cls, cur) {
  const keep = {};
  for (const k of Object.keys(D.backs)) { const B = D.backs[k]; if (!backFits(B, cls) || RAR.indexOf(B.q) < RAR.indexOf("SR")) continue;   // SR (purple) and up
    const key = B.n + "|" + B.q + "|" + B.fx.join(","), prev = keep[key];        // same name, tier and effects = one entry
    if (!prev) keep[key] = k; }
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
  return {n: B.n, cls: B.cls, mixed: true, parts: Object.fromEntries(PARTS.map(p => [p, D.sts[partST(s, p)].parts[p]]))};
}
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
    if (slot === "BK") return W.slot === "Back" && (W.type === "RailGun" || W.type === "Funnel" || W.type === "Missile") ;
    return false;
  }).sort((a, b) => (D.weapons[a].tn + D.weapons[a].n).localeCompare(D.weapons[b].tn + D.weapons[b].n));
}
function equipped(s) {             // slot -> weapon state, with fixed weapons and blocked slots resolved
  const fixed = fixedWeapons(s), out = {};
  for (const [slot] of SLOTS) {
    if (fixed[slot]) { out[slot] = {id: fixed[slot], impr: false, atk: 0, opts: [null, null], drop: null, comps: [], fixed: true}; continue; }
    if (slot === "LH" && s.w.RH && D.weapons[s.w.RH.id].slot === "DoubleHand") continue;
    if ((slot === "RS" || slot === "LS") && (stClass(s) !== "Medium" || Object.keys(fixed).length)) continue;
    if (slot === "BK" && s.back !== "w") continue;
    if (s.w[slot] && D.weapons[s.w[slot].id]) out[slot] = s.w[slot];
  }
  return out;
}

/* ------------------------------------------------------------------ effects */
/* an effect's value in this setup: the rolled value for a refit option, scaled by the stacks set for its row */
function effVal(s, src, e) {
  let v = src.vset != null && e.hi != null ? src.vset : e.v;
  if (e.stk) { const n = Math.max(1, Math.min(e.stk, (s.stk || {})[src.key] || 1)); v *= 1 + (e.lpm || 1) * (n - 1); }
  return v;
}
const SLOT5 = ["LH", "RH", "LS", "RS", "BK"];
function condState(c, ctx, W) {
  const S = ctx.sit, held = c.h || ctx.held;
  switch (c.t) {
    case "tsize": return ctx.tcls === c.v;
    case "osize": return (held === "target" ? ctx.tcls : ctx.ocls) === c.v;           // the holder's ST class
    case "thp": case "ohp": { const hp = c.t === "thp" || held === "target" ? T.hp : ctx.ohp == null ? 100 : ctx.ohp;      // own HP: the Own HP % box (whole unit)
      return {">=": hp >= c.v, ">": hp > c.v, "<=": hp <= c.v, "<": hp < c.v, "=": hp === c.v}[c.op]; }
    case "wtype": return !!((c.v || 0) & (D.wtBits[W.type] || 0));
    case "parts_ss": return true;
    case "pclass": return ctx.pclass === c.v;
    case "flame": return c.who === "target" ? !!ctx.burnT : !!ctx.burnSelf;
    case "sgroup": return ctx.sg == null ? null : !!(ctx.sg & c.v);       // the attacking skill's group (Normal Attack 1, ActiveAttack 2, Gusty Strike (extra attack) 256)
    case "buf": {                                      // held from the start by one of the setup's skills / nodes / talent (level 1), else ask
      if (!ctx.own || !ctx.own.has(c.v)) {                // not held from the start: "level 0" checks pass, others may still come mid-fight
        const ok0 = {">=": 0 >= c.n, ">": 0 > c.n, "<=": 0 <= c.n, "<": 0 < c.n, "=": 0 === c.n}[c.op];
        return ok0 ? true : kitBufs().has(c.v) ? false : null; }        // a pilot-kit buff this setup doesn't have stays at level 0
      const lv = 1, ok = {">=": lv >= c.n, ">": lv > c.n, "<=": lv <= c.n, "<": lv < c.n, "=": lv === c.n}[c.op];
      return ok ? true : c.n <= 1 ? false : null; }               // held at level 1: "< 1" / "≤ 0" fail; higher levels may stack up mid-fight
    case "any": { const r = c.items.map(x => condState(x, ctx, W)); return r.some(x => x === true) ? true : r.every(x => x === false) ? false : null; }
    case "tphp": case "bphp": case "parts": return partCond(c, null, H_START());   // the target's parts, at the target HP slider
    case "apcost": return ctx.ap == null ? null : CMP[c.op || ">="](ctx.ap, c.v);   // the attacking skill's AP cost
    case "bkrange": { const w = ctx.wts || {}; return ctx.slot === "BK" ? !!(w.LH || w.RH) : !!w.BK; }   // in range: taken as met
    case "stage": return !!((ctx.stage || 0) & c.v);                       // the bench's attack is a First attack (Gusty Strike: Combo)
    case "samewt": { const SL = ["LH", "RH", "LS", "RS", "BK"], x = (ctx.wts || {})[SL[c.a]], y = (ctx.wts || {})[SL[c.b]];
      return !x || !y ? false : (x === y) === !!c.same; }
    case "hitmm": return null;                                              // depends on the part hit: checked per shot (partCond)
    // ---- Situation (v0.80): the setup, the attack and your inputs; S = null while the bounds are worked out (limitSums)
    case "never": return false;
    case "slotwt": { if (held === "target") return null;           // the boss's own loadout isn't known
      const ts = c.s === 12 ? Object.values(ctx.wts || {}) : [(ctx.wts || {})[SLOT5[c.s]]];
      return ts.some(x => x && ((D.wtBits[x] || 0) & c.m)); }
    case "samecat": { if (held === "target") return null; const a = (ctx.wid || {})[SLOT5[c.a]], b = (ctx.wid || {})[SLOT5[c.b]];
      if (!a || !b || !D.weapons[a] || !D.weapons[b]) return false; return c.same ? D.weapons[a].cat === D.weapons[b].cat : D.weapons[a].cat !== D.weapons[b].cat; }
    case "wcount": { if (held === "target") return null; let n = 0, two = false;
      for (const sl of ["LH", "RH"]) { const id = (ctx.wid || {})[sl]; if (!id || !D.weapons[id]) continue; if (D.weapons[id].slot === "DoubleHand") two = true; else n++; }
      return CMP[c.op](n + (two ? 1 : 0), c.n); }
    case "tacn": return new Set(Object.values(ctx.wts || {}).filter(x => ["Missile", "Rocket", "RailGun", "Funnel"].includes(x))).size === c.n;
    case "incd": { const sl = SLOT5[c.s]; if (!(ctx.wid || {})[sl]) return false; if (sl === ctx.slot) return !c.cd;   // the attacking weapon isn't reloading
      if (!S) return null; return c.cd ? S.st.reload : !S.st.reload; }
    case "zone": { if (String(ctx.pid) !== String(c.p)) return CMP[c.op](0, c.n);
      let k = 0; for (let i = 0; i < 6; i++) if (((D.pilots[ctx.pid].sectors || {})[c.sec] || [])[i] && secOn(ctx.s, c.sec, i)) k++;
      return CMP[c.op](k, c.n); }
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
    case "lasttgt": { if (!S) return null; const same = ctx.stage === 256 && !ctx.mainAoe ? true : S.last; return c.v ? same : !same; }
    case "ideal": return S ? S.inIdeal : null;
    case "dist": return S ? CMP[c.op](c.mode === 1 ? S.cheb : S.dist, c.v) : null;
    case "moved": return S ? CMP[c.op](S.moved, c.v) : null;
    case "still": return S ? (c.v ? S.moved > 0 : S.moved === 0) : null;
    case "thru": return S ? S.thru : null;
    case "diag": return S ? (c.v === 0 ? S.dir === "diag" : c.v === 1 ? S.dir !== "line" : S.dir === "line") : null;
    case "adist": return S ? (held === "target" ? CMP[c.op](S.distA, c.v) : false) : null;
    case "lindist": return S ? (held === "target" ? null : S.dir === "line" && CMP[c.op](S.distA, c.v)) : null;
    case "bdist": return S ? CMP[c.op](held === "target" ? (c.min ? S.dist : S.distA) : 0, c.v) : null;
    case "terr": { if (!S) return null; const tt = held === "target" ? S.tTgt : S.tYou, mine = held === "target" ? "enemy" : "you";
      if (tt.cat === "none") return false; return c.p === 0 ? true : c.p === 1 ? tt.side === mine : tt.side !== mine && tt.side !== "env"; }
    case "terrs": { if (!S) return null; const unit = c.u ? "target" : held, tt = unit === "target" ? S.tTgt : S.tYou, side = unit === "target" ? "enemy" : "you";
      const match = tt.cat === c.cat && (c.side === 0 || (c.side === 1 ? tt.side === side : tt.side !== side && tt.side !== "env")) && (!c.mine || tt.mine);
      return c.on === 1 ? match : c.on === 0 ? !match : false; }
    case "nearE": { if (!S) return null;
      if (held === "target") return CMP[c.op](S.aTn(c.r) + (c.xsrc ? 0 : S.dist <= c.r ? 1 : 0), c.n);   // the target's enemies: your side
      return CMP[c.op](S.enemiesWithin("m", c.r), c.n); }
    case "nearA": { if (!S) return null; if (held === "target") return CMP[c.op](S.eTn("m", c.r), c.n);
      return CMP[c.op](c.r >= 99 ? S.alliesWithin("all", 99) : S.alliesWithin("m", c.r), c.n); }
    case "neart": { if (!S || held === "target") return null;
      const n = c.filt === 5 ? S.enemiesWithin(c.m, c.r) : c.filt === 2 ? S.alliesWithin(c.m, c.r) : c.filt === 10 ? S.st.crash : c.filt === 11 ? S.st.intim
        : 1 + S.enemiesWithin(c.m, c.r) + S.alliesWithin(c.m, c.r);
      return CMP[c.op](n, c.n); }
    case "tnear": return S ? (held === "target" ? null : CMP[c.op](S.eTn(c.m, c.r), c.n)) : null;
    case "aoe": return S ? (ctx.A && ctx.A.aoe ? CMP[c.op](S.area, c.n) : false) : null;
    case "stc": return S ? CMP[c.op](S.area, c.n) : null;
    case "named": return S ? CMP[c.op](S.st[c.k] ? 1 : 0, c.n) : null;
    case "ammo": { if (!S) return null; if (c.w === 3 && ctx.grp && ctx.grp !== "Attacking weapon") return c.v === -1;   // another weapon: taken as full
      return c.v === -1 ? S.ammoFull : S.ammoMax ? S.ammo === c.v : false; }
    case "reatk": return S ? (c.v === 1 ? S.reatk : !S.reatk) : null;
    case "camp": { const own = !ctx.counter, holderOwn = held === "target" ? !own : own; return c.same ? holderOwn : !holderOwn; }
    case "cancnt": { if (!S) return null; if ((c.p2 === 0) !== (held !== "target")) return false; if (!ctx.A || !ctx.A.cnt) return false;
      return c.can ? S.canCounter : !S.canCounter; }
    case "turn": return S ? CMP[c.op](S.turn, c.n) : null;
    case "hpcmp": return held === "target" ? CMP[c.op](T.hp, T.hp) : CMP[c.op](ctx.ohp, T.hp);
    case "remain": return c.mode === 0 && held !== "target" ? CMP[c.op](4, c.n) : partCond({t: "parts", op: c.op, n: c.n}, null, H_START());
    case "xhp": return S ? (held === "target" ? null : c.v ? S.xhp : !S.xhp) : null;
    case "ophp": return c.v === 0 && c.op === "<=" ? false : CMP[c.op || ">="](ctx.ohp, c.v);   // your parts: the Own HP % box
    default: return null;
  }
}
/* the target's part state for part-HP conditions: frac(p) = HP / max HP, alive(p), abs(p) = HP (before the attack, for hitmm).
   H_START: every part at the target HP slider (the calculated numbers); the fight simulation builds one from its own HP. */
const H_START = () => ({s: T.hp / 100, max: D.targets[T.target].hp, alive: T._alive || null});      // s: every part at this fraction of max HP
const CMP = {">=": (a, b) => a >= b, ">": (a, b) => a > b, "<=": (a, b) => a <= b, "<": (a, b) => a < b, "=": (a, b) => a === b};
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
  if (c.t === "parts") return CMP[c.op || ">="](1 + ["Left arm", "Right arm", "Legs"].filter(q => hUp(H, q)).length, c.n || 0);
  if (c.part === "arm") return partOne(c, H, "Left arm") || partOne(c, H, "Right arm");
  if (c.part !== "Body" && c.part !== "Left arm" && c.part !== "Right arm" && c.part !== "Legs") return false;   // whole-unit HP: never on an ST
  return partOne(c, H, c.part);
}
const isAfter = e => (e.c || []).some(c => c.t === "after");
const OPC = {">=": 0, ">": 1, "<=": 2, "<": 3, "=": 4};
/* compiled part conditions in the fight simulation (H = {hp, max, alive, h0}): same rules as partCond */
function simConds(cs, p, H) {
  for (const c of cs) {
    if (c.pc) {
      const n = 1 + (H.alive.has("Left arm") ? 1 : 0) + (H.alive.has("Right arm") ? 1 : 0) + (H.alive.has("Legs") ? 1 : 0), o = c.o;
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
let RK_SET = null;
const RK = () => RK_SET || (RK_SET = new Set(D.reatk || []));
function sources(s, atkSlot, weap) {
  const P = D.pilots[s.pilot], star = P.stars[Math.min(s.star, P.stars.length - 1)], out = [];
  const add = (key, label, group, fx, kind, extra = {}) => { const ks = (Array.isArray(fx) ? fx : [fx]).filter(k => k && D.fx[k]);
    if (ks.some(k => RK().has(k))) (out.rk ||= []).push(label.replace(/^[^:]+: /, ""));
    if (ks.length) out.push({key, label, group, fx: ks, kind, ...extra}); };
  for (const k of P.auto) add("auto:" + k, D.skills[k].n, "Pilot", D.skills[k].fx, "passive");
  if (star.talent) add("talent", "Talent: " + D.skills[star.talent].n, "Pilot", D.skills[star.talent].fx, "passive");
  const xk = s.atk.skill && s.atk.skill !== "normal" && ![...s.skills, s.ex].includes(s.atk.skill) ? s.atk.skill : null;
  for (const k of [...s.skills, s.ex, xk]) {
    if (!k || !D.skills[k]) continue;
    const sk = D.skills[k], isAtk = s.atk.skill === k;
    if (sk.type === "ActiveAttack" && !isAtk) continue;
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
  if (s.back && s.back.startsWith("bp:") && D.backs[s.back.slice(3)]) { const B = D.backs[s.back.slice(3)];
    const active = B.fx.some(k => (D.fx[k] || []).some(e => e.tgt));
    add("bp", `Backpack: ${B.n} (${B.q})` + (active ? " (when used)" : ""), "ST", B.fx, active ? "code" : "passive"); }
  // a weapon's "carried" passives count once even when both hands hold the same weapon (e.g. two Kagutsuchi: Chain Blaze +20% once)
  const carried = new Set();
  for (const [slot, w] of Object.entries(weap)) { const W = D.weapons[w.id]; (W.gfx || []).forEach((k, i) => { if (carried.has(k)) return; carried.add(k);
    add(`g:${slot}:${i}`, `${W.n} (carried)`, "Weapons", k, "passive"); }); }
  s.wf.forEach((f, i) => f && D.features[f] && add("wf:" + i, "Weapon feature: " + D.features[f].n, "Features", D.features[f].fx, "passive"));
  const w = weap[atkSlot];
  if (w) {
    const W = D.weapons[w.id];
    (W.fx || []).forEach((k, i) => add("wfx:" + i, W.n + " built-in", "Attacking weapon", k, "passive"));
    w.opts.forEach((o, i) => o && add("opt:" + i, "Refit: " + optName(W, o.fx), "Attacking weapon", o.fx, "passive", {vset: o.v}));
    if (w.drop) { const d = W.drops.find(x => String(x.id) === String(w.drop)); if (d) add("drop", "Drop ability: " + d.n, "Attacking weapon", d.fx, "passive"); }
    for (const c of w.comps) { const C = D.components[c.id]; if (!C || C.k !== "RA") continue;
      // what an RA gives right away is weighted by its trigger chance; what it gives after combat (High-Spirited, Energized,
      // Innervate, Shudder) never reaches the attack that triggers it: a row that starts off, for an attack made with it already up
      const ks = (C.fx || []).filter(k => D.fx[k]), now = ks.filter(k => D.fx[k].some(e => !isAfter(e))), later = ks.filter(k => D.fx[k].some(isAfter));
      if (now.length) add("ra:" + c.id, C.n, "Accessories", now, "ra", {ra: c, only: "now"});
      else if (C.xp) out.push({key: "ra:" + c.id, label: C.n, group: "Accessories", fx: [], kind: "ra", ra: c});
      if (later.length) add("rah:" + c.id, C.n + " (from an earlier trigger)", "Accessories", later, "passive", {only: "after"}); }
    for (const [slot, ow] of Object.entries(weap)) { if (slot === atkSlot) continue;                 // the other weapons' after-combat RAs
      for (const c of ow.comps || []) { const C = D.components[c.id]; if (!C || C.k !== "RA") continue;
        const later = (C.fx || []).filter(k => D.fx[k] && D.fx[k].some(isAfter));
        if (later.length) add(`rah:${slot}:${c.id}`, `${C.n} (${D.weapons[ow.id] ? D.weapons[ow.id].n : slot}, from an earlier trigger)`, "Accessories", later, "passive", {only: "after"}); } }
  }
  return out;
}
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
  return Object.entries(moduleCounts(s)).map(([mid, n]) => { const M = D.modules[mid], lv = Math.min(n, M.max); return {mid, M, lv, L: M.levels[lv - 1]}; }).filter(x => x.L);
}
const QNAME = ["1 chevron", "2 chevrons", "3 chevrons", "rainbow"];
function qualityLabel(grades, i) { return grades.length > 1 ? `${QNAME[i]} (${grades[i].g})` : `fixed (${grades[i].g} stats)`; }
function stRange(k) { const g = D.sts[k].parts.Body.grades; return g.length > 1 ? `4 grades` : `fixed grade`; }
function moduleOf(itemId) {
  for (const [mid, M] of Object.entries(D.modules)) { const it = M.items.find(i => i.id === String(itemId)); if (it) return {id: mid, plus: it.plus, n: it.n}; }
  return null;
}
function fxText(fx) { return (D.fx[fx] || []).map(e => e.f === "pwadj" ? pwText(e) : `${FIELD[e.f] || e.f}${e.f === "pwhit" ? " (" + e.part.toLowerCase() + ")" : ""} ${sgn(e.v, e.f)}`).join(" · "); }
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
  const base = Math.max(0, ...[...R.ctx.own].map(b => (D.xround || {})[String(b)] || 0));
  const other = {RH: "LH", LH: "RH"}[s.atk.slot], ow = other && equipped(s)[other];
  return base && ow && D.weapons[ow.id] && D.weapons[ow.id].type === "Flamethrower" ? base : 0;
}
function pvRound(s, R, raOverride) {
  if (s._noPV || s.extra.pvOff) return null;
  const base = pvBase(s, R);
  if (!base) return null;
  const other = {RH: "LH", LH: "RH"}[s.atk.slot];
  const R2 = compute({...s, atk: {...s.atk, slot: other}, _noPV: true}, raOverride);
  if (!R2) return null;
  const SF = base + R2.g("splash");
  // same combat, same target: the PV round meets the armor the main round left (e.g. Piercing fired by the attacking hand's
  // accessories at the start of combat covers both rounds), not the opposite weapon's own accessories
  // the round's own DMG% bucket (yours + the target's DMG taken for the part hit) and the target's damage factor; no FinalDMG%
  const armor = R.armor, H0 = H_START(), mult = (p, H) => Math.max(0, R2.skillM) * Math.max(0, SF) * Math.max(0, 1 + R2.dB(p, H)) * R2.npcF(p, H);
  const pre = p => Math.max(0, R2.perBefore - R.armorBy[p] / 10);
  const shot = Math.max(1, Math.max(0, R2.perBefore - armor / 10) * mult(T.part, H0));
  const shotBy = Object.fromEntries(PARTS.map(p => [p, Math.max(1, pre(p) * mult(p, H0))]));
  const shotAt = R2.dyn ? (p, H) => Math.max(1, pre(p) * mult(p, H)) : p => shotBy[p];
  const hitAvg = PARTS.reduce((a, p) => a + R.wts[p] * shotBy[p], 0);
  return {R: R2, armor, base, SF, shot, shotCrit: shot * (1 + R2.critDmg), shots: R2.shots, hitAfter: R2.hitAfter, crit: R2.crit, critDmg: R2.critDmg,
          shotBy, shotAt, dyn: R2.dyn, mult, wts: R.wts, hitAvg, exp: R2.expHits * hitAvg * (1 + R2.crit * R2.critDmg), slot: other};
}
/* which part a shot lands on: the attack's weight profile over the parts still standing (focus: the chosen part while it stands);
   a profile with no weight left on standing parts falls back to an even split */
function partWeights(sk, alive, pw) {
  const ok = p => !alive || alive.has(p) || p === "Body", parts = PARTS.filter(ok);
  const one = p => Object.fromEntries(PARTS.map(x => [x, x === p ? 1 : 0]));
  const even = L => Object.fromEntries(PARTS.map(x => [x, L.includes(x) ? 1 / L.length : 0]));
  if (T.mode === "focus" && ok(T.part)) return one(T.part);
  if (sk.av) return even(parts);
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
  const prof = (D.pwt || {})[String(sk.pw || 4)] || {Body: 25, "Left arm": 25, "Right arm": 25, Legs: 25};
  const w = {}; let tot = 0;
  for (const p of PARTS) w[p] = ok(p) ? Math.max(0, (prof[p] || 0) + (hit[p] || 0)) : 0;
  for (const a of adj) if (a.m <= 3) { const p = a.m === 1 ? by(cur, 1) : a.m === 2 ? by(cur, -1) : a.pt; if (p && ok(p)) w[p] = Math.max(0, w[p] + a.v); }
  for (const p of PARTS) tot += w[p];
  if (!tot) return even(parts);
  for (const p of PARTS) w[p] /= tot;
  return w;
}
/* Gusty Strike (BufFuncType_AttackerComb, e.g. Erinys "Mode - Martial"): after the attack, a chance to fire the same arm's
   extra attack (the weapon type's DefaultExtraAttackSkill, SkillAttackMulti 0.5, its own shot count) with the combo's adjustment
   added to SkillM (Martial -0.1 -> 0.4). Only for attacks whose skill group matches (Martial 259: Normal Attack 1, ActiveAttack
   (weapon skills) 2, Gusty Strike (extra attack) 256). Its own hit and crit rolls, every damage bonus of the main round.
   Observed in battle: Gusty Strike / main round = 0.4 after armor, exact. */
function gustyRound(s, R, raOverride) {
  const X = (D.xatk || {})[R.W.type];
  if (!X || !X.m) return null;
  R.ctx.held = "you";
  const combos = R.mlv.flatMap(x => (x.L.combo || []).map(c => ({...c, mod: x.M.n})))
    .filter(c => c.same && (c.mask & (R.sk.g || 0)) && (c.c || []).every(k => condState(k, R.ctx, R.W) === true));
  if (!combos.length) return null;
  const c = combos.reduce((a, b) => (b.p > a.p ? b : a));
  const mode = s.extra.gusty || "chance", p = mode === "off" ? 0 : mode === "on" ? 1 : Math.min(1, c.p);
  // the extra attack as its own attack (skill group 256): bonuses tied to other attack types drop out (Salty Dog's Normal Attack SkillM)
  const R2 = compute({...s, _mainAoe: (R.ctx.A || {}).aoe === 1, _sitMain: R.sit, _xatk: {n: "Gusty Strike", m: X.m + c.adj, h: X.h || 1, g: 256, pw: X.xpw || 4, av: X.xav || 0, A: X.x || {}}}, raOverride);
  if (!R2) return null;
  return {c, mode, p, R: R2, shots: R2.shots, baseShots: R2.baseShots, skillM: R2.skillM, shot: R2.shot, shotCrit: R2.shotCrit,
          hitAfter: R2.hitAfter, crit: R2.crit, exp: p * R2.expAtk};
}
/* ------------------------------------------------------------------ Situation (v0.80) */
/* The situation of this one attack, typed in by you but kept inside the game's rules: the attack's range, your move points and max AP,
   the weapon's magazine, what can grant a Re-ATK. The rules come from the game code (ActorBufActiveCond*, ActorBufPropertiesModifyInBattleBy*),
   checked in battle (see the Damage formula page). Distances are Manhattan tiles to the target's nearest tile. */
const LIMIT_F = new Set(["br", "brin", "brout", "brx", "brm", "rng", "mov", "ammo", "apmax"]);
const FORM_R = {2: ["m", 0], 3: ["m", 1], 4: ["m", 2], 5: ["m", 3], 6: ["m", 4], 7: ["m", 5], 30: ["c", 1], 31: ["c", 2], 64: ["all", 99]};
const SC = n => String(n || "").replace(/^(Properties)?Modify(InBattle)?By/, "");
// condition types that read the Situation (an effect failing only these still shows which inputs it reads)
const SIT_T = new Set(["reatk", "xact", "ideal", "dist", "adist", "bdist", "lindist", "diag", "moved", "still", "thru", "turn", "nearE", "nearA", "neart", "tnear",
  "aoe", "stc", "terr", "terrs", "bcat", "ammo", "mancost", "xhp", "lasttgt", "nolink", "linkj", "cancnt", "named", "incd", "hpcmp", "ohp", "ophp", "hitr"]);
const LATE_C = new Set(["bcat", "hitr"]), HIT_SC = new Set(["HitRate"]), CRIT_SC = new Set(["CriticalRate"]);
const SITN = (v, d) => v === undefined || v === null || v === "" || !Number.isFinite(+v) ? d : +v;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const SDIRS = ["line", "diag", "other"];
const SC_WORD = {TargetDistance: "per tile to the target", MoveDistanceOnlyAttacker: "per tile moved", TargetDistanceWithSkillSelectGrid: "by distance from the area's centre",
  LeftMovePoint: "per tile of movement left", TerrainActorCount: "per unit on your field", NearbyActorCount: "by units nearby", TargetCount: "per unit the attack covers",
  OwnScopeBufCategoryTargetNum: "per marked enemy", AllActorBufCategoryNum: "per Appointed ally", BufCategoryEnhance: "per buff you carry",
  BufCategorySetInfo: "per buff carried", TargetBufCategorySetInfo: "per Scar on the target", DefenderActorDamgeMulti: "by your DMG taken down",
  SkillApCost: "by the skill's AP cost", CurrentAp: "by AP before the attack", HpLoss: "by HP lost", SkillManualBufLevelCost: "per Fury stack spent",
  CurrEquipmentDefaultSkillSelectableGrid: "per enemy in your weapon's range", HitRate: "by your hit chance", CriticalRate: "by your crit chance"};
/* limits from the setup: ideal range (base / closer / farther by weapon type), attack range, movement, magazine, max AP; only effects
   whose conditions hold without the Situation (they set its bounds) */
/* a row's on state as compute() decides it before its conditions: RA rows by their trigger, Code rows (skills you cast) off until ticked */
const rowOnFor = (s, src) => src.kind !== "ra" && (s.tog[src.key] !== undefined ? !!s.tog[src.key] : src.kind !== "code" && src.only !== "after");
function limitSums(srcs, ctx, W, s) {
  const out = {br: {}, brin: {}, brout: {}, rng: {}, ammo: {}, mov: 0, apmax: 0, brx: 0, brm: 0};
  for (const src of srcs) {
    if (!rowOnFor(s, src)) continue;
    for (const k of src.fx) for (const e of D.fx[k] || []) {
      if (!LIMIT_F.has(e.f) || (isAfter(e) && s.tog[src.key] !== true && !s._held) || (e.wc && e.wc !== W.cat)) continue;
      if (s._held && e.ids && !e.ids.some(b => s._held.has(b))) continue;       // test harness only (s._held): only the buffs it says are held
      ctx.held = e.tgt ? "target" : "you";
      // counts when no condition fails and any undecided one is ticked on its row (taken as met by the test harness)
      const st = (e.c || []).filter(c => !LATE_C.has(c.t) && c.t !== "after").map(c => c.t === "prob" || c.t === "pick" ? false : condState(c, ctx, W));
      if (st.includes(false) || (st.includes(null) && !(s.tog[src.key] === true || s._held))) continue;
      const v = effVal(s, src, e);
      if (e.f === "mov" || e.f === "apmax" || e.f === "brx" || e.f === "brm") out[e.f] += v; else out[e.f][e.wt || ""] = (out[e.f][e.wt || ""] || 0) + v;
    }
  }
  ctx.held = "you";
  return out;
}
/* the Situation for this attack: your inputs (s.sit), clamped to what the rules allow, and the values the conditions read */
function sitResolve(s, ctx, sk, W, st, star, lim, tg) {
  const u = s.sit || (s.sit = {}), A = sk.A || {}, N = D.normal[W.type] || {};
  const rg = A.rg || N.rg || [1, 1, []];
  const rangeAdd = Math.max(0, Math.round((lim.rng[W.type] || 0) + (lim.rng[""] || 0)));
  const maxR = rangeAdd > 0 && rg[2] && rg[2].length ? rg[2][Math.min(rangeAdd, rg[2].length) - 1] : rg[1];
  const minR = Math.min(Math.max(1, rg[0] || 0), maxR), rangeExt = maxR - rg[1];
  const sq = rg[3] || 0, maxD = sq ? 2 * maxR : maxR;          // farthest Manhattan distance the form reaches
  // ideal range (BestRangeDistanceGetInternal): [base - min(base, closer), base + max(0, farther) + (Hyperfire: the extra attack range actually
  // gained)]; no base and nothing farther = none. KALAVINKA (MergeAssistHandBestRangeDistance): the other hand's weapon type's range counts too
  const realAdd = rg[2] ? Math.min(rangeAdd, rg[2].length) : 0;
  const iv = wt => { const b = Math.trunc(lim.br[wt] || 0), f = Math.max(0, Math.trunc(lim.brout[wt] || 0)), n = Math.min(b, Math.trunc(lim.brin[wt] || 0));
    return {base: b, lo: b - n, hi: b + f + (b > 0 && lim.brx ? realAdd : 0), has: b > 0 || f > 0}; };
  const I0 = iv(W.type), other = lim.brm ? (ctx.wts || {})[{LH: "RH", RH: "LH"}[ctx.slot]] : null, I1 = other && other !== W.type ? iv(other) : null;
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
  const furyMax = A.mc ? Math.max(0, Math.min(A.mc[1], apMax - (sk.ap || 0))) : 0;      // each stack costs 1 AP more
  const fury = A.mc ? clampN(Math.round(SITN(u.fury, furyMax)), 0, furyMax) : 0;
  const apCost = Math.max(0, (sk.ap || 0) + fury);                                     // Fury Unleashed: +1 AP per stack spent
  const ap = clampN(Math.round(SITN(u.ap, Math.max(apCost, apMax - 2))), Math.min(apCost, apMax), apMax);
  const ammoMax = W.ammo ? W.ammo + Math.round(lim.ammo[W.type] || 0) : 0;
  const ammo = ammoMax ? clampN(Math.round(SITN(u.ammo, ammoMax)), 1, ammoMax) : 0;      // an empty weapon is reloading and can't fire
  // units around: what you entered for each radius; within r = the largest count entered for a radius <= r; the target counts when inside
  const upto = (o, r) => Object.entries(o || {}).filter(([k]) => +k <= r).reduce((a, [, v]) => Math.max(a, Math.max(0, +v || 0)), 0);
  const tIn = (m, r) => m === "all" ? 1 : (m === "c" ? cheb : dist) <= r ? 1 : 0;
  const enemiesWithin = (m, r) => tIn(m, r) + (m === "all" ? Math.max(0, SITN(u.eAll, 0)) : m === "c" ? Math.max(upto(u.eSq, r), upto(u.eN, r)) : upto(u.eN, r));
  const alliesWithin = (m, r) => m === "all" || r >= 99 ? Math.max(SITN(u.aAll, 1), upto(u.aN, 99)) : m === "c" ? Math.max(upto(u.aSq, r), upto(u.aN, r)) : upto(u.aN, r);
  const eTn = (m, r) => m === "c" ? Math.max(upto((u.eT || {}).c, r), upto((u.eT || {}).m, r)) : upto((u.eT || {}).m, r);
  const aTn = r => upto(u.aT, r);
  const terr = (o, legacy, mine) => { const x = o || (legacy ? {cat: "flame", by: mine ? "you" : "ally"} : {cat: "none", by: "you"});
    return {cat: x.cat || "none", by: x.by || "you", side: x.by === "enemy" ? "enemy" : x.by === "map" ? "env" : "you", mine: (x.by || "you") === "you"}; };
  const tTgt = terr(u.tTgt, s.extra.burnT, s.extra.burnOwn), tYou = terr(u.tYou, s.extra.burnSelf, false);
  const st0 = u.st || {}, stn = k => Math.max(0, SITN(st0[k], 0));
  // the target can retaliate (TargetCanCounterAttack): a class it can counter, not marked 'target cannot retaliate' (SkillFlag 4),
  // and one of its counter weapons reaches you (Rhombus forms by Manhattan, Square forms by Chebyshev)
  const ctrAuto = !((A.sf || 0) & 4) && T.hp > 0 && (tg.ctr || []).some(w => { const d = w.sq ? cheb : dist; return d >= w.min && d <= w.max; });
  const canCounter = u.ctr === "yes" ? true : u.ctr === "no" ? false : ctrAuto;
  return {u, A, minR, maxR, maxD, sq, okDir, rangeAdd, rangeExt, furyMax, ideal, idealHas, inIdeal, base, dist, dir, cheb, foot, anc, distA: dist + anc, mov, moved, locked, thru: moved > 0 && !!u.thru,
    fury, apMax, apCost, ap, ammoMax, ammo, ammoFull: ammoMax ? ammo >= ammoMax : true, turn: Math.max(1, Math.round(SITN(u.turn, 2))),
    enemiesWithin, alliesWithin, eTn, aTn, area: Math.max(1, Math.round(SITN(u.area, 1))), aoeD: Math.max(0, Math.round(SITN(u.aoeD, 0))), tTgt, tYou,
    bufE: Math.max(0, SITN(u.bufE, 0)), debW: Math.max(0, SITN(u.debW, 0)), xhp: !!u.xhp, last: !!u.last, link: Math.max(0, Math.round(SITN(u.link, 0))),
    inRng: Math.max(1, Math.round(SITN(u.inRng, 1))), reatk: !locked && !!u.reatk, reSame: !locked && !!u.reatk && !!u.reSame, ctrAuto, canCounter,
    st: {stealth: !!st0.stealth, asuka: !!st0.asuka, rei: !!st0.rei, reload: !!st0.reload, instab: stn("instab"), scarsT: stn("scarsT"), scarsAll: stn("scarsAll"),
         crash: stn("crash"), intim: stn("intim"), timid: stn("timid"), maglock: stn("maglock"), appointed: stn("appointed"), dtd: stn("dtd"), field: stn("field")},
    use: new Map()};
}
/* aiming: the attack skill aims, or an aim effect in your setup covers this weapon (mask 0 = any weapon) and its conditions hold */
function aimFromSetup(srcs, ctx, W, s) {
  for (const src of srcs) {
    if (!rowOnFor(s, src)) continue;
    for (const k of src.fx) for (const e of D.fx[k] || []) {
      if (e.f !== "aim" || (isAfter(e) && s.tog[src.key] !== true && !s._held) || (e.m && !(e.m & (D.wtBits[W.type] || 0)))) continue;
      if (s._held && e.ids && !e.ids.some(b => s._held.has(b))) continue;
      ctx.held = "you"; let ok = true, ask = false;
      for (const c of e.c || []) { if (LATE_C.has(c.t) || c.t === "after") continue; const r = c.t === "prob" || c.t === "pick" ? false : condState(c, ctx, W); if (r === false) { ok = false; break; } if (r === null) ask = true; }
      if (ok && (!ask || s.tog[src.key] === true || s._held)) return true;
    }
  }
  return false;
}
/* buffs held at the attack, counted by category: held = [{side, cats, n}] (n stacks for Overlap buffs); ALL = the buff has every category */
function catCount(S, held, side, set, all) {
  let n = 0;
  for (const h of held || []) if (h.side === side && (all ? set.every(c => h.cats.includes(c)) : set.some(c => h.cats.includes(c)))) n += h.n;
  const has = c => set.length === 1 ? set[0] === c : !all && set.includes(c);
  if (side === "you") { if (has("Enhance")) n += S.bufE; if (has("Invisible") && S.st.stealth) n += 1; }
  else { if (has("Weak")) n += S.debW; if (has("Unbalanced")) n += S.st.instab; if (has("BattleDamage")) n += S.st.scarsT; }
  return n;
}
function bcatState(c, S, held, holder) {
  const side = holder === "target" ? (c.w === 0 ? "target" : c.w === 2 ? "you" : null) : (c.w === 0 ? "you" : c.w === 1 ? "target" : null);
  if (!side) return false;
  return CMP[c.op || ">="](catCount(S, held, side, D.bset[String(c.set)] || [], false), c.n);
}
/* a scaling effect's value from the Situation (ActorBufPropertiesModifyInBattleBy*.GetPropertiesValue); x = {held, hit, crit} */
function scVal(e, S, ctx, x) {
  const p = e.sp || [], tr = Math.trunc, cap = (v, c, dir) => dir > 0 ? Math.min(c, v) : Math.max(c, v);
  switch (SC(e.sc)) {
    case "TargetDistance": { const d = S.distA; return d >= p[1] ? p[0] * (Math.min(d, p[2]) - p[1] + 1) : 0; }
    case "MoveDistanceOnlyAttacker": return p[0] * Math.min(S.moved, tr(p[1]));
    case "TargetDistanceWithSkillSelectGrid": return S.A.aoe === 1 && e.tgt ? cap(p[0] + p[1] * S.aoeD, p[2], p[1]) : 0;
    case "LeftMovePoint": { if (!p[0]) return 0; const left = Math.max(0, Math.floor(S.mov) - S.moved) * 1000; return cap(tr(Math.min(left, tr(p[1])) / 1000) * p[0], p[2], p[0]); }
    case "TerrainActorCount": { if (!ctx.counter) return 0; const d = S.st.field - p[2]; return d <= 0 ? 0 : cap(d * p[3], p[4], d * p[3]); }
    case "NearbyActorCount": { const f = p[0] < 0 ? ["m", S.maxR] : FORM_R[p[0]] || ["m", 0];
      if (p[0] < 0 && S.sq) f[0] = "c";                     // your reach with a Square form counts diagonals as 1
      const n = p[1] === 0 ? S.alliesWithin(f[0], f[1]) : p[1] === 1 ? S.enemiesWithin(f[0], f[1]) : S.alliesWithin(f[0], f[1]) + S.enemiesWithin(f[0], f[1]);
      return n <= 0 || n < p[2] ? 0 : cap(p[3] + (n - p[2]) * p[4], p[5], p[4]); }
    case "TargetCount": return S.area < p[2] ? 0 : cap((S.area - p[2] + 1) * p[0], p[1], p[0]);
    case "OwnScopeBufCategoryTargetNum": { const v = ({72: S.st.scarsAll, 26: S.st.timid, 75: S.st.maglock}[p[2]] || 0) * p[3]; return p[4] ? cap(v, p[4], p[4]) : v; }
    case "AllActorBufCategoryNum": { const v = (p[1] === 73 ? S.st.appointed : 0) * p[2]; return p[3] ? cap(v, p[3], p[3]) : v; }
    case "DefenderActorDamgeMulti": { if (!ctx.counter) return 0; const d = S.st.dtd - p[1]; return d <= 0 ? 0 : cap(d * p[2], p[3], d * p[2]); }
    case "SkillApCost": { const cost = (S.A.sf || 0) & 0x2000 ? Math.max(S.apCost, S.ap) : S.apCost, start = p[0] === -1 ? S.apCost : p[0];
      return cost < start ? 0 : cap((cost - start) * p[1], p[2], p[1]); }
    case "CurrentAp": { const mn = tr(p[1]), mx = tr(p[2]); return S.ap < mn ? 0 : (Math.min(S.ap, mx) - mn + 1) * p[0]; }
    case "HpLoss": { const hp = (e.tgt ? T.hp : ctx.ohp) / 100, mh = p[2] == null ? 1 : p[2]; return hp >= mh ? 0 : hp <= p[0] ? p[1] : p[1] * (mh - hp) / (mh - p[0]); }
    case "SkillManualBufLevelCost": { if (!(S.A.mc && S.A.mc[0] === p[0])) return 0; const d = S.fury - p[1]; return d <= 0 ? 0 : cap(d * p[2], p[3], d * p[2]); }
    case "CurrEquipmentDefaultSkillSelectableGrid": { const d = S.inRng - p[0]; return d <= 0 ? 0 : cap(d * p[1], p[2], d * p[1]); }
    case "BufCategoryEnhance": return Math.min(catCount(S, x.held, "you", ["Enhance"], false), tr(p[1])) * p[0];
    case "BufCategorySetInfo": return cap(catCount(S, x.held, e.tgt ? "target" : "you", D.bset[String(p[0])] || [], true) * p[1], p[2], p[1]);
    case "TargetBufCategorySetInfo": return cap(catCount(S, x.held, "target", D.bset[String(p[0])] || [], true) * p[1], p[2], p[1]);
    case "HitRate": { const d = x.hit - p[0]; if (d <= 0) return 0; const v = d * 100 * p[1]; return p[2] ? cap(v, p[2], p[2]) : v; }
    case "CriticalRate": { const d = x.crit - p[0]; if (d <= 0) return 0; const v = d * 100 * p[1]; return p[2] ? cap(v, p[2], p[2]) : v; }
  }
  return 0;
}
/* which Situation inputs this setup reads (the panel shows only those), with the effects that read them */
function noteUse(S, e, lbl) {
  const name = String(lbl).replace(/^(Skill|EX|Module|Talent|Refit|Pilot feature|ST feature|Weapon feature|Drop ability|Backpack): /, "");
  const add = k => { if (!S.use.has(k)) S.use.set(k, new Set()); S.use.get(k).add(name); };
  let held = e.tgt ? "target" : "you";
  const area = (m, r, who) => add((who === "e" ? (m === "c" ? "eSq:" : "eN:") : (m === "c" ? "aSq:" : "aN:")) + r);
  const walkC = c => { const hh = held; if (c.h) held = c.h; switch (c.t) {
    case "reatk": add("reatk"); break;
    case "xact": add("reatk"); add("reSame"); break;
    case "ideal": add("dist"); break;
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
    case "bcat": { const set = D.bset[String(c.set)] || [], side = held === "target" ? (c.w === 0 ? "target" : c.w === 2 ? "you" : null) : (c.w === 0 ? "you" : c.w === 1 ? "target" : null);
      if (side === "you") { if (set.includes("Enhance")) add("bufE"); if (set.includes("Invisible")) add("st:stealth"); }
      if (side === "target") { if (set.includes("Weak")) add("debW"); if (set.includes("Unbalanced")) add("st:instab"); if (set.includes("BattleDamage")) add("st:scarsT"); } break; }
    case "ammo": add("ammo"); break;
    case "mancost": add("fury"); break;
    case "xhp": add("xhp"); break;
    case "lasttgt": add("last"); break;
    case "nolink": case "linkj": add("link"); break;
    case "cancnt": add("ctr"); add("dist"); if ((D.targets[T.target].ctr || []).some(w => w.sq)) add("dir"); break;
    case "named": add("st:" + c.k); break;
    case "incd": add("st:reload"); break;
    case "hpcmp": case "ohp": case "ophp": add("ohp"); break;
    case "any": (c.items || []).forEach(walkC); break;
  } held = hh; };
  (e.c || []).forEach(walkC);
  if (e.sc) switch (SC(e.sc)) {
    case "TargetDistance": add("dist"); add("anc"); break;
    case "MoveDistanceOnlyAttacker": case "LeftMovePoint": add("moved"); break;
    case "TargetDistanceWithSkillSelectGrid": add("aoeD"); break;
    case "TerrainActorCount": add("st:field"); break;
    case "NearbyActorCount": { const p = e.sp || [], f = p[0] < 0 ? [S.sq ? "c" : "m", S.maxR] : FORM_R[p[0]] || ["m", 0];
      if (p[1] !== 0) { add("dist"); if (f[0] === "all") add("eAll"); else area(f[0], f[1], "e"); }
      if (p[1] !== 1) { if (f[0] === "all") add("aAll"); else area(f[0], f[1], "a"); } break; }
    case "TargetCount": add("area"); break;
    case "OwnScopeBufCategoryTargetNum": { const k = {72: "scarsAll", 26: "timid", 75: "maglock"}[(e.sp || [])[2]]; if (k) add("st:" + k); break; }
    case "AllActorBufCategoryNum": add("st:appointed"); break;
    case "BufCategoryEnhance": add("bufE"); break;
    case "BufCategorySetInfo": add(e.tgt ? "debW" : "bufE"); break;
    case "TargetBufCategorySetInfo": add("st:scarsT"); break;
    case "DefenderActorDamgeMulti": add("st:dtd"); break;
    case "SkillApCost": if ((S.A.sf || 0) & 0x2000) add("ap"); break;
    case "CurrentAp": add("ap"); break;
    case "HpLoss": if (!e.tgt) add("ohp"); break;
    case "SkillManualBufLevelCost": add("fury"); break;
    case "CurrEquipmentDefaultSkillSelectableGrid": add("inRng"); break;
  }
}
function compute(s, raOverride) {
  const weap = equipped(s);
  const atkSlot = weap[s.atk.slot] ? s.atk.slot : Object.keys(weap)[0];
  const w = weap[atkSlot];
  if (!w) return null;
  const W = D.weapons[w.id], P = D.pilots[s.pilot], star = P.stars[Math.min(s.star, P.stars.length - 1)];
  const st = stOf(s), tg = D.targets[T.target];
  const own = new Set(); const ownAdd = k => ((D.skills[k] || {}).gb || []).forEach(b => own.add(b));
  P.auto.forEach(ownAdd); if (star.talent) ownAdd(star.talent); s.skills.forEach(k => k && ownAdd(k)); if (s.ex) ownAdd(s.ex);
  for (const sec of Object.keys(P.sectors || {})) (P.sectors[sec] || []).forEach((k, i) => { if (secOn(s, sec, i)) ownAdd(k); });
  const mlv = moduleLevels(s); mlv.forEach(x => (x.L.gb || []).forEach(b => own.add(b)));
  const N = D.normal[W.type] || {m: W.nm, h: W.shots, n: "Normal Attack"};
  const XW = (D.xatk || {})[W.type] || {};
  let sk = {n: N.n && N.n !== "Normal Attack" ? N.n + " (Normal Attack)" : "Normal Attack", m: N.m, h: N.h, g: XW.ng || 1, pw: XW.npw || 4, av: XW.nav || 0, ap: N.ap, A: N};
  if (s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].atk[W.type]) { const a = D.skills[s.atk.skill].atk[W.type]; sk = {n: D.skills[s.atk.skill].n, m: a.m, h: a.h, g: a.g || 0, pw: a.pw || 4, av: a.av || 0, ap: a.ap, r: a.r || 1, A: a}; }
  if (s._xatk) sk = s._xatk;                              // Gusty Strike: the weapon type's extra attack
  const ctx = {tcls: tg.cls, ocls: st.cls, pclass: P.class, burnT: !!s.extra.burnT, burnSelf: !!s.extra.burnSelf, own, sg: sk.g, ap: sk.ap,
    stage: s._xatk ? 256 : 1, slot: atkSlot, wts: Object.fromEntries(Object.entries(weap).map(([k, x]) => [k, D.weapons[x.id] && D.weapons[x.id].type])),
    ohp: s.extra.ohp == null || s.extra.ohp === "" ? 100 : Math.max(0, Math.min(100, +s.extra.ohp))};
  // the attack's own flags (attack skill id, aim, trigger source, area, counterable, range, Fury cost) and its stage: a counter skill
  // (skill group 64) is made on the enemy's turn (stage Counter 4), a link-attack skill joins an ally's attack (stage Link 32)
  const A = sk.A || {};
  ctx.counter = !s._xatk && (((sk.g || 0) & 64) !== 0 || A.ft === "CounterAttack");
  if (!s._xatk) ctx.stage = ctx.counter ? 4 : A.ft === "LinkAttack" ? 32 : 1;
  Object.assign(ctx, {pid: s.pilot, s, A, held: "you", mainAoe: !!s._mainAoe, wid: Object.fromEntries(Object.entries(weap).map(([k, x]) => [k, x.id]))});
  const acc = {}, add = (k, v) => acc[k] = (acc[k] || 0) + v;
  const armorPct = {all: 0}; PARTS.forEach(p => armorPct[p] = 0);
  const pwAdj = [], pwHit = {};                           // part targeting: your weight adjusts / forced hits, the target's hit weighting
  const srcs = sources(s, atkSlot, weap), rows = [];
  // the Situation: bounds from the setup first (ideal range, attack range, movement, magazine, max AP), then your inputs inside them
  // (twice: limits whose own condition reads the Situation, e.g. Firepower Supremacy's range +1 with Fury spent, count on the second pass)
  // a Gusty Strike round is part of the same attack: it keeps the main attack's situation (AP cost, AP before, distance, tiles moved)
  let SIT;
  if (s._sitMain) SIT = ctx.sit = {...s._sitMain, A, fury: 0, use: new Map()};
  else {
    ctx.sit = sitResolve(s, ctx, sk, W, st, star, limitSums(srcs, ctx, W, s), tg);
    SIT = ctx.sit = sitResolve(s, ctx, sk, W, st, star, limitSums(srcs, ctx, W, s), tg);
  }
  ctx.burnT = SIT.tTgt.cat === "flame"; ctx.burnSelf = SIT.tYou.cat === "flame";
  ctx.aim = !!A.aim || aimFromSetup(srcs, ctx, W, s);
  const track = !raOverride && !s._xatk && !s._noPV;       // note which inputs the effects read (for the panel), once per setup
  const probEv = {}, pickEv = {}, chanceP = {};              // 'N% chance' effects and random picks: one roll per attack, averaged by outcomes()
  const ssShare = PARTS.filter(p => st.parts[p].grades[s.grades[p]].g.startsWith("SS")).length / 4;
  // R&D tree (full): class / ST size / weapon type; attribute parts are already in the screen value
  const rd = [], rdBy = {}, rdEd = {};
  for (const k of [P.class, "type:" + W.type, st.cls + " ST"])
    if (k && D.rd[k]) rd.push(...D.rd[k].map(e => ({...e, g: k})));
  for (const e of rd) {
    if (e.f.startsWith("attr")) continue;
    if (e.f === "crit_app_add") continue;          // R&D crit points are taken per weapon type (D.rdcrit) instead
    if (e.wt && e.wt !== W.type) continue;
    if (e.wc && e.wc !== W.cat) continue;
    const sc = rdScale(s, e.g, e); if (sc !== 1) rdEd[e.f] = true;
    const rv = e.v * sc * (e.c && e.c.some(c => c.t === "parts_ss") ? ssShare : 1);
    add(e.f, rv); rdBy[e.f] = (rdBy[e.f] || 0) + rv;
  }
  const raStates = [], stackSeen = {}, tterm = [];          // tterm: damage-taken terms on the target by part (yours and the boss's)
  const xps = [];                                        // RA extra hits on another part (Explosive Charge, Splash)
  for (const src of srcs) {
    let ask = false, ok = true;
    const effs = [];
    if (src.kind === "ra" && !src.fx.length) {           // extra hit only: its trigger state still counts
      const mode = raOverride && raOverride[src.ra.id] !== undefined ? raOverride[src.ra.id] : src.ra.mode;
      raStates.push({id: src.ra.id, mode});
      if (mode === "on" && !s._xatk) for (const x of D.components[src.ra.id].xp || []) if (!x.wm || x.wm & (D.wtBits[W.type] || 0)) xps.push({...x, n: D.components[src.ra.id].n});
      continue;
    }
    for (const k of src.fx) for (const e of D.fx[k]) {
      if (e.wt && e.wt !== W.type) continue;
      if (e.wc && e.wc !== W.cat) continue;
      if (src.only && (src.only === "after") !== isAfter(e)) continue;
      if (s._xatk && e.once) continue;                     // gone after the main round (Marksmanship's armor cut)
      // a damage-taken term on the target that depends on the part hit or its HP: kept per part and checked shot by shot
      const dyn = !!(e.tgt && (e.f === "dmgB" || e.f === "npcB") && (e.part || (e.c || []).some(c => c.t === "tphp" || c.t === "hitmm")));
      let eok = true, eask = false, sok = true, late = null, chk = null, chq = null, chOff = false, failOther = false, failFixed = false;
      ctx.held = e.tgt ? "target" : "you"; ctx.grp = src.group;
      // test harness only: s._held / s._theld = buff IDs held by you / the target at the cast;
      // an effect counts when its buff is held, and conditions the bench can't check are taken as met
      // (an effect on the target counts when the target holds it, or when you hold its chain's first buff: attack-time debuffs
      // such as Jammer - Armor are attached for the attack only and never show in the target's list between commands)
      if (s._held && src.kind !== "ra" && e.ids && !(e.tgt ? e.ids.some(b => s._theld.has(b)) || (!isAfter(e) && (e.rt || []).some(b => s._held.has(b)))
                                       : e.ids.some(b => s._held.has(b)))) eok = false;
      for (const c of e.c || []) {
        if (dyn && (c.t === "tphp" || c.t === "hitmm")) { if (c.t === "tphp" && partCond(c, null, H_START()) === false) sok = false; continue; }
        if (LATE_C.has(c.t)) { (late ||= []).push(c); continue; }          // decided once the held buffs / the hit chance are known
        if (c.t === "prob") {                                             // one roll per attack; outcomes() averages both results
          if (s._held) continue;
          const pk = "p:" + c.k + ":" + ((e.rt && e.rt[0]) || (e.ids && e.ids[0]) || src.key); chk = pk; chq = {k: pk, p: c.p};
          const pv = raOverride && raOverride[pk] !== undefined ? raOverride[pk] === "on" : s.tog[pk] !== undefined ? !!s.tog[pk] : false;
          if (!pv) { eok = false; chOff = true; } continue; }
        if (c.t === "pick") {                                             // one of n buffs picked at random each time it fires
          if (s._held) continue;
          const kk = "k:" + c.k + ":" + src.key; chk = kk; chq = {k: kk, p: 1 / c.n, n: c.n};
          if (!(raOverride && raOverride[kk] === c.i)) { eok = false; chOff = true; } continue; }
        const r = condState(c, ctx, W); if (r === false) { eok = false; failOther = true; if (!SIT_T.has(c.t)) failFixed = true; } if (r === null && !s._held) { ask = true; eask = true; }
      }
      if (track && !failFixed) noteUse(SIT, e, src.label);              // inputs only for effects this setup and attack can use
      if (chq) chanceP[chq.k] = chq.p;
      effs.push({e, eok, eask, dyn, sok: eok && sok, late, chk, chq, failO: failOther, chOff: chOff && !failOther});
    }
    if (!effs.length) continue;
    let on;
    if (src.kind === "ra") {
      const mode = raOverride && raOverride[src.ra.id] !== undefined ? raOverride[src.ra.id] : src.ra.mode;
      on = mode === "on"; raStates.push({id: src.ra.id, mode});
      if (on && !s._xatk) for (const x of D.components[src.ra.id].xp || []) if (!x.wm || x.wm & (D.wtBits[W.type] || 0)) xps.push({...x, n: D.components[src.ra.id].n});
    } else {
      const def = src.kind === "code" ? false : !ask;
      on = s.tog[src.key] !== undefined ? s.tog[src.key] : def;
    }
    // a passive row that mixes effects the calculator can check (class, size, HP, weapon type) with ones it can't:
    // the checked ones always apply, the box only switches the unchecked ones
    const mixed = (src.kind === "passive" || src.kind === "attack") && effs.some(x => x.eask) && effs.some(x => !x.eask && x.eok);
    for (const x of effs) x.act = x.eok && (on || (mixed && !x.eask));
    // a chance or random pick is rolled only for an effect this attack can get (its row on, its other conditions met)
    for (const x of effs) if (x.chq && !x.failO && (on || (mixed && !x.eask))) { probEv[x.chq.k] = x.chq.p; if (x.chq.n) pickEv[x.chq.k] = x.chq.n; }
    rows.push({src, effs, ask, on, mixed});
  }
  // buffs held at this attack, for 'carries N buffs of a category' checks and per-buff counters: each buff once, one per stack of an
  // Overlap / SameGroupOverLap buff (the ids repeat per stack; Accumulate buffs count once)
  // (lower levels of a buff family don't count: only its highest level is held)
  const topL = {}; for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp) topL[x.e.grp] = Math.max(topL[x.e.grp] || 0, x.e.lig || 0);
  const held = [], heldSeen = new Set();
  for (const r of rows) for (const x of r.effs) if (x.act && !x.late && x.e.ids && !(x.e.grp && (x.e.lig || 0) < topL[x.e.grp])) for (const b of x.e.ids) {
    const side = x.e.tgt ? "target" : "you", hk = side + b, bc = D.bcat[String(b)];
    if (heldSeen.has(hk) || !bc) continue; heldSeen.add(hk);
    held.push({side, cats: bc[0], n: x.e.stk && (bc[1] === "Overlap" || bc[1] === "SameGroupOverLap") ? Math.max(1, Math.min(x.e.stk, (s.stk || {})[r.src.key] || 1)) : 1}); }
  for (const r of rows) for (const x of r.effs) if (x.late && x.late.some(c => c.t === "bcat" && !bcatState(c, SIT, held, c.h || (x.e.tgt ? "target" : "you")))) { x.eok = false; x.act = false; }
  // a buff family held at several levels (same GroupId): only its highest level counts
  const topLvl = {};
  for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp) topLvl[x.e.grp] = Math.max(topLvl[x.e.grp] || 0, x.e.lig || 0);
  for (const r of rows) for (const x of r.effs) if (x.act && x.e.grp && (x.e.lig || 0) < topLvl[x.e.grp]) { x.act = false; x.lower = true; }
  // and a buff is held once: the same buff (family, or buff ID) reached through several rows counts once
  const famSeen = new Set();
  for (const r of rows) for (const x of r.effs) if (x.act && !x.e.stk && (x.e.grp || (x.e.ids && x.e.ids.length))) {
    const k = [x.e.grp || "id:" + x.e.ids.join(","), x.e.f, x.e.part || "", x.e.a || "", x.e.tgt ? 1 : 0].join("|");
    if (famSeen.has(k)) { x.act = false; x.dup = true; } else famSeen.add(k); }
  const hitLate = [];                                     // effects that read this attack's own hit / crit chance: added once those are known
  for (const {src, effs} of rows) {
    for (const x of effs) {
      const {e, act} = x;
      if (!act) continue;
      if ((e.sc && (HIT_SC.has(SC(e.sc)) || CRIT_SC.has(SC(e.sc)))) || (x.late && x.late.some(c => c.t === "hitr"))) { hitLate.push({x, src}); continue; }
      let v = e.sc ? scVal(e, SIT, ctx, {held}) : effVal(s, src, e);
      x.val = v;
      if (e.stk && e.b) {                       // same buff granted by another skill already counted: keep the larger one
        const k = e.b + ":" + e.f, prev = stackSeen[k];
        if (prev) { if (Math.abs(v) <= Math.abs(prev.v)) { x.dup = true; continue; } add(e.f + (e.a ? ":" + e.a : ""), -prev.v); prev.x.dup = true; }
        stackSeen[k] = {v, x};
      }
      if (x.dyn) { tterm.push({f: e.f, part: e.part || null, v, c: (e.c || []).filter(c => c.t === "tphp" || c.t === "hitmm"), n: e.n || src.label, src: src.label}); continue; }
      if (e.f === "armor_pct") { armorPct[e.part || "all"] += v; continue; }
      if (e.f === "pwadj") { pwAdj.push(e); continue; }
      if (e.f === "pwhit") { pwHit[e.part] = (pwHit[e.part] || 0) + v; continue; }
      add(e.f + (e.a ? ":" + e.a : ""), v);
    }
  }
  let critT = 0; const bossYou = [];
  ctx.held = "you";
  for (const e of bossFx(tg)) { if (!e.use) continue;
    const pc = (e.c || []).filter(c => c.t === "bphp" || c.t === "parts"), oc = (e.c || []).filter(c => c.t !== "bphp" && c.t !== "parts");
    if (oc.some(c => condState(c, ctx, W) !== true)) continue;          // weapon type / attack type: decided for this attack
    if (e.side === "you") { add(e.f, e.val); bossYou.push({f: e.f, v: e.val, n: e.n}); continue; }   // what the boss puts on whoever attacks it (Bertha: FinalDMG -80%)
    if (e.f === "critT") { if (pc.every(c => partCond(c, null, H_START()) !== false)) critT += e.val; continue; }
    tterm.push({f: e.f, part: e.part, v: e.val, c: pc, n: e.n, src: "target: " + e.n, boss: true}); }
  // test harness only: what the target picked up during the fight (other units' debuffs, its own later buffs)
  for (const q of s._tx || []) { if (q.f === "armor_pct") armorPct[q.part || "all"] += q.v; else if (q.f === "critT") critT += q.v;
    else if (q.f === "dmgB" || q.f === "npcB") tterm.push({f: q.f, part: q.part || null, v: q.v, c: [], n: "log: " + q.n, src: "log"}); else add(q.f, q.v); }
  const x = s.extra;
  if (x.dmgB) add("dmgB", x.dmgB / 100); if (x.finalB) add("finalB", x.finalB / 100);
  if (x.hitrate) add("hitrate", x.hitrate / 100); if (x.crit_rate) add("crit_rate", x.crit_rate / 100); if (x.crit_fin) add("crit_fin", x.crit_fin / 100); if (x.splash) add("splash", x.splash / 100);
  const g = k => acc[k] || 0;
  // attribute: screen value (entered, or predicted from base + Bionic Computer neurons + chips + full R&D), then battle-only % on top
  const attr = W.attr;
  const rdFlat = (D.rd[P.class] || []).filter(e => e.f === "attr_add" && e.a === attr).reduce((a, e) => a + e.v * rdScale(s, P.class, e), 0);
  const rdPct = (D.rd[P.class] || []).filter(e => e.f === "attr_pct" && e.a === attr).reduce((a, e) => a + e.v * rdScale(s, P.class, e), 0);
  const Pscreen = star.bonus + rdPct;
  const chipKnown = s.chips["attr:" + attr] != null;
  const entered = +s.screen[attr] || 0;
  let chipAttr = chipKnown ? s.chips["attr:" + attr] : 0, chipInferred = false;
  if (!chipKnown && entered) { chipAttr = Math.max(0, entered / (1 + Pscreen) - star.base[attr] - P.bionic[attr] - rdFlat); chipInferred = true; }
  const predicted = (star.base[attr] + P.bionic[attr] + chipAttr + rdFlat) * (1 + Pscreen);
  const screen = entered || predicted;
  const bPct = g("attr_pct:" + attr), bFlat = g("attr_add:" + attr) + (x.attr || 0);
  const attribute = (screen / (1 + Pscreen) + bFlat) * (1 + Pscreen + bPct);
  const implied = entered && chipKnown ? entered / (1 + Pscreen) - star.base[attr] - P.bionic[attr] - chipAttr : null;
  const suit = D.suit[String(star.rank)][st.cls] || {atk: 0, hit: 0};
  // attack
  const partFp = PARTS.reduce((a, p) => a + st.parts[p].grades[s.grades[p]].fp, 0);
  const fpEff = (partFp + g("fp_add")) * (1 + W.fvm) * (1 + g("fp_pct"));
  const imprO = rdOv(s, "impr|" + W.type), imprSave = typeof w.impr === "number" ? w.impr : null;
  const impr = imprO != null ? imprO : imprSave != null ? imprSave : W.impr || 0, advAtk = w.atk || 0;   // R&D panel value, else the loaded grade, else max
  if (imprO != null) rdEd.impr = true; else if (imprSave != null && imprSave !== (W.impr || 0)) rdEd.impr = "save";
  const atkFlat = W.atk + impr + advAtk + g("atk_add");
  const srcAtk = (atkFlat + fpEff) * (1 + g("atk_pct")) * (1 + suit.atk);
  const r = attribute / tg.def, pmult = 1 + 2 / 3 * atanN((r - 1 / r) / 1.5);
  // hit
  // hit (CalcHitValueTotal / CalcRealHitRate): weapon hit + the firing arm's hit (two-handed weapons: both arms)
  const TI = (D.hitthr || {})[W.type] || {thr: 0, comp: false, two: false};
  const armPart = atkSlot === "LH" ? "Left arm" : atkSlot === "RH" ? "Right arm" : "Left arm";
  const arms = TI.two ? ["Left arm", "Right arm"] : [armPart];
  const armHit = arms.reduce((a, p) => a + st.parts[p].grades[s.grades[p]].hit, 0);
  const chipHit = s.chips["hit:" + W.cat] || 0, chipCrit = s.chips["crit:" + W.cat] || 0;
  const wHitP = 1 + g("whit_pct") + g("hit_cat_pct") + suit.hit, aHitP = 1 + g("ahit_pct") + g("hit_cat_pct") + suit.hit;
  const wHit = (W.hit + g("whit_add")) * wHitP;
  const aHit = arms.reduce(a => a + (0 + g("ahit_add") + chipHit) * aHitP, 0) + armHit * aHitP;
  const H = wHit + aHit, Dg = tg.dodge;
  const hitX = H / Dg - Dg / H, hitK = hitX <= 0 && H > TI.thr ? 4 : 0.5;
  const hitRes = (tg.hit_res || 0) + g("hitres");
  // chance on a shot after m misses in a row (MG / HMG / Shotgun / Flamethrower: base rate +5% per miss, reset by a hit)
  const hitT = 0.9 + 0.5 * atanN(hitX / hitK), hitAdd = g("hitrate") - hitRes, hitMemo = [];
  const hitAfter = m => hitMemo[m] !== undefined ? hitMemo[m] : (hitMemo[m] = Math.max(0, Math.min(1, (W.rate + (TI.comp ? 0.05 * m : 0)) * hitT + hitAdd)));
  const hit = hitAfter(0);
  // read from this hit chance (Dominator Locator; 'Own hit rate >= N%' on a single-target attack): no effect of this kind changes the hit rate
  for (const {x, src} of hitLate) {
    const e = x.e; if (CRIT_SC.has(SC(e.sc))) continue;
    if (x.late && x.late.some(c => c.t === "hitr" && !(SIT.area <= 1 && CMP[c.op || ">="](hit, c.v)))) { x.eok = false; x.act = false; continue; }
    const v = e.sc ? scVal(e, SIT, ctx, {held, hit}) : effVal(s, src, e); x.val = v;
    if (e.f === "armor_pct") armorPct[e.part || "all"] += v; else add(e.f + (e.a ? ":" + e.a : ""), v);
  }
  // crit points CritPts_total (CalcActorCriticalAppendFinal): chips + actor adds + (weapon base + R&D for this weapon type + weapon adds) x (1 + weapon %)
  const rdCritDef = (D.rdcrit || {})[String(D.wtBits[W.type] || 0)] || 0, rdCritO = rdOv(s, "crit|" + W.type), rdCrit = rdCritO == null ? rdCritDef : rdCritO;
  if (rdCritO != null) rdEd.crit = true;
  const SvW = (W.crit_app + rdCrit + g("crit_app_add")) * (1 + g("crit_app_pct"));
  const Sv = chipCrit + g("crit_app_flat") + SvW + g("crit_app_fin"), Tv = tg.crit_res || 1;
  // crit chance (CalcRealCriticalRate) = rate adds x (1 + rate multis) + 0.3 x atanN((S/T - T/S) / 0.5) - target crit-rate resist
  const critTerm = Sv > 0 ? 0.3 * atanN((Sv / Tv - Tv / Sv) / 0.5) : -0.3;
  const critAdj = 0;   // the old global 'extra crit chance' box: now "Crit rate after features +" under Extra bonuses (crit_fin)
  const critBuffs = g("crit_rate") * (1 + g("crit_mul")) + g("crit_fin");
  const crit = Math.max(0, Math.min(1, critBuffs + critTerm - ((tg.crit_rate_res || 0) + g("critres")) + critAdj));
  for (const {x} of hitLate) if (CRIT_SC.has(SC(x.e.sc))) { const v = scVal(x.e, SIT, ctx, {held, hit, crit}); x.val = v; add(x.e.f, v); }   // by crit chance -> crit DMG
  const critDmg = Math.max(0, W.crit_dmg + g("crit_dmg") + critT);        // 1 + max0(attacker ratio + target crit DMG taken) (CalcFinalDamage)
  // skill
  // shots fired (OneRoundAttackCountGetDefault): n = base + adds; n + ceil(n x multi) (multi > 0) or + floor(n x multi), at least 1.
  // The attack is still divided by the skill's base count (CalcStandardAttackCount), so extra shots are extra damage.
  const baseShots = sk.h || 1, nShots = baseShots + Math.round(g("shots")), shotM = g("shots_pct");
  // 'N times' skills fire their round 1 + FuncParams[0] times (Shower 2 x 1 shot), each shot one share of the base count
  const rounds = sk.r || 1, shots = rounds * Math.max(1, nShots + (shotM > 0 ? Math.ceil(nShots * shotM - 1e-9) : Math.floor(nShots * shotM + 1e-9)));
  const skillM = sk.m + g("skillM");
  // per part: max0(SkillM) x max0(1 + DMG% + the target's DMG taken for that part) x max0(1 + its own damage factor) x max0(1 + FinalDMG%)
  // (CalcDmgPerAttack; the part term is the hit part's only). H = the target's part state (H_START, or the fight simulation's)
  // terms without a condition are summed once per part; only the ones with a part-HP condition are re-checked (per shot in the simulation)
  const sDB = {}, sNpc = {}, dynT = {};
  for (const p of PARTS) { sDB[p] = g("dmgB"); sNpc[p] = g("npcB"); dynT[p] = []; }
  for (const q of tterm) for (const p of PARTS) if (q.part == null || q.part === p) {
    if (q.c.length) dynT[p].push(q); else if (q.f === "dmgB") sDB[p] += q.v; else sNpc[p] += q.v; }
  const dynSum = (p, H, f) => { let a = 0;
    for (const q of dynT[p]) { if (q.f !== f) continue; let ok = true; for (const c of q.c) if (partCond(c, p, H) !== true) { ok = false; break; } if (ok) a += q.v; }
    return a; };
  const dB = (p, H) => sDB[p] + (dynT[p].length ? dynSum(p, H, "dmgB") : 0);
  const npcF = (p, H) => Math.max(0, 1 + sNpc[p] + (dynT[p].length ? dynSum(p, H, "npcB") : 0));
  const finM = Math.max(0, 1 + g("finalB")), skM = Math.max(0, skillM);
  const Kp = (p, H) => skM * Math.max(0, 1 + dB(p, H)) * npcF(p, H) * finM;
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
  for (const p of PARTS) { const raw = tg.armor_base ? tg.armor_base[p] : tg.armor[p] / (1 + amul);
    armorBy[p] = Math.max(0, raw * (1 + amul + armorPct.all + armorPct[p] - (s.extra.shred || 0) / 100)); }
  const base = {}; for (const p of PARTS) { base[p] = Math.max(0, perBefore - armorBy[p] / 10); shotBy[p] = Math.max(1, base[p] * Kp(p, H0)); }
  // the simulation's per-shot version: the same sums with the part-HP checks inlined (it runs for every simulated shot)
  const dynC = {}; for (const p of PARTS) dynC[p] = dynT[p].map(q => ({npc: q.f === "npcB", v: q.v, c: q.c.map(c => c.t === "hitmm" ? {mm: 1, max: !!c.max}
    : c.t === "parts" ? {pc: 1, o: OPC[c.op || ">="], v: c.n || 0}
    : {mm: 0, ps: c.part === "arm" ? ["Left arm", "Right arm"] : PARTS.includes(c.part) ? [c.part] : [], o: OPC[c.op || ">="], v: c.v || 0, dest: !!c.dest})}));
  const shotAt = (p, H) => {
    const L = dynC[p]; if (!L.length) return shotBy[p];
    let d = sDB[p], n = sNpc[p];
    for (const q of L) { if (simConds(q.c, p, H)) { if (q.npc) n += q.v; else d += q.v; } }
    return Math.max(1, base[p] * skM * Math.max(0, 1 + d) * Math.max(0, 1 + n) * finM);
  };
  const dyn = tterm.some(q => q.c.length);                 // some term switches with the target's part HP: the simulation re-checks it per shot
  const pwMax = {}; for (const p of PARTS) pwMax[p] = tg.hp[p] * T.hp / 100;
  const pw = {adj: pwAdj, hit: pwHit, max: pwMax, dyn: pwAdj.some(a => [1, 2, 6, 7, 8, 9, 11].includes(a.m) || (a.m === 4 && !a.pt))};
  const wts = partWeights(sk, null, pw), hitAvg = PARTS.reduce((a, p) => a + wts[p] * shotBy[p], 0);
  // expected hits per attack, following the miss streak (compensation)
  let dist = [1], expHits = 0;
  for (let i = 0; i < shots; i++) {
    const nd = new Array(dist.length + 1).fill(0);
    dist.forEach((q, m) => { if (!q) return; const p = hitAfter(m); expHits += q * p; nd[0] += q * p; nd[m + 1] += q * (1 - p); });
    dist = nd;
  }
  const expShot = (shots ? expHits / shots : 0) * hitAvg * (1 + crit * critDmg);
  const fixB = g("fixB");                                  // FixDMG%, the attacker's Fixed DMG +X% bonus, scales Explosive Charge (not Splash)
  for (const x of xps) if (x.t === "ec") x.val = x.v * srcAtk * (1 + fixB);
  const xpE = xps.reduce((a, x) => a + (x.t === "ec" ? expHits * x.val : x.v * expHits * hitAvg * (1 + crit * critDmg)), 0);
  const expAtk = expHits * hitAvg * (1 + crit * critDmg) + xpE;
  // tick = Max(Floor(part max HP x 12% x (1 + eFixRatioRes%) + 0.5), 1) (Percentage DMG, BattleActorCompBodyPartBase.CalcFixDamage): at least 1
  const burnPct = (D.terrain && D.terrain.burn) || 0.12, burnRes = 1 + (tg.fixres || 0) + (s.extra.burnOwn ? g("fixB") : 0);
  const burn = {}; for (const p of PARTS) burn[p] = s.extra.burnT ? Math.max(1, Math.round(tg.hp[p] * burnPct * burnRes)) : 0;
  // skills that set off the target's terrain after combat (Burning Spirit, Shared Resolve): one extra tick on this attack
  const burnSet = !s._xatk && s.extra.burnT && s.atk.skill !== "normal" && D.skills[s.atk.skill] && D.skills[s.atk.skill].tt;
  const burnNow = burnSet ? (T.mode === "focus" ? burn[T.part] : PARTS.reduce((a, p) => a + burn[p], 0)) : 0;   // the whole unit when shots scatter
  const R = {ctx, burn, burnNow, burnPct, burnRes, s, W, w, P, star, st, tg, atkSlot, attr, rdFlat, rdPct, Pscreen, chipAttr, chipInferred, chipKnown, predicted, entered, screen, bPct, bFlat, attribute, implied, suit,
    partFp, fpEff, impr, advAtk, atkFlat, srcAtk, r, pmult, armPart, arms, armHit, wHit, aHit, wHitP, aHitP, hitX, hitK, hitRes, hitAfter, expHits, TI, chipHit, chipCrit, H, Dg, hit, Sv, SvW, rdCrit, rdBy, rdEd, chipCrit, Tv, crit, critAdj, critBuffs, critDmg, sk, baseShots, shots,
    nShots, shotM, armorPct, skillM, K, armorBase, armorRaw, amul, armor, armorPctTot, armorCuts: armorPct.all + armorPct[T.part], perBefore, critTerm, shot, shotCrit, expShot, expAtk, rows, raStates, g, partHp: tg.hp[T.part], armorBy, shotBy, wts, hitAvg, burnSet, pw, xps, xpE, rounds, bossYou,
    tterm, dB, npcF, Kp, shotAt, dyn, critT, sit: SIT, probEv, pickEv, chanceP, held, rk: srcs.rk || []};
  R.mlv = mlv;
  R.gusty = s._xatk ? null : gustyRound(s, R, raOverride);
  if (R.gusty) R.expAtk += R.gusty.exp;
  R.pv = s._xatk ? null : pvRound(s, R, raOverride);
  if (R.pv) { R.expMain = R.expAtk; R.expAtk += R.pv.exp; }
  R.expAtk += burnNow;
  return R;
}

/* the target's own effects on the damage it takes (tg.dfx, from its buffs at the start of the fight): your switch / stack count,
   else the fight-start state; value = v x (1 + LevelPropertiesMulti x (stacks - 1)) */
function bossFx(tg) {
  const set = (T.tfx || {})[T.target] || {};
  return (tg.dfx || []).map(e => { const u = set[e.b] || {}, on = u.on !== undefined ? u.on : e.on, lvl = Math.max(1, Math.min(e.max || 1, u.lvl || e.lvl || 1));
    return {...e, use: !!(on && e.f), lvl, val: e.v * (e.lpm ? 1 + e.lpm * (lvl - 1) : 1)}; });
}
/* accessories: chance an RA triggers this attack = 1 − Π over TAs whose condition is met of (1 − 0.4 / (TA factor × RA factor)) */
function raChances(s, R) { return accChances(R.w); }
function accChances(w) {
  const tas = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "TA");
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
  const ev = base.raStates.filter(x => x.mode === "chance").map(x => ({k: x.id, o: [["on", ch[x.id]], ["off", 1 - ch[x.id]]]}));
  for (const [k, p] of Object.entries(base.probEv || {})) if (!(base.pickEv || {})[k] && s.tog[k] === undefined) ev.push({k, o: [["on", p], ["off", 1 - p]]});
  for (const [k, n] of Object.entries(base.pickEv || {})) ev.push({k, o: [...Array(n).keys()].map(i => [i, 1 / n])});
  let combos = [{ov: {}, p: 1}];
  for (const e of ev) { const next = [];
    for (const c of combos) for (const [v, p] of e.o) if (p > 0) next.push({ov: {...c.ov, [e.k]: v}, p: c.p * p});
    if (next.length > 512) break; combos = next; }
  const list = ev.length ? combos.map(c => ({p: c.p, R: compute(s, c.ov)})) : [{p: 1, R: base}];
  const exp = list.reduce((a, o) => a + o.p * o.R.expAtk, 0);
  return {base, list, exp, ch};
}
/* the target-HP thresholds this setup's effects use (to re-check them during a fight) */
function thpConds(R) {
  const out = [], seen = new Set(), push = (op, v) => { const k = op + v; if (!seen.has(k)) { seen.add(k); out.push({op, v}); } };
  const FLIP = {">=": "<=", ">": "<", "<=": ">=", "<": ">", "=": "="};
  const walkC = (c, tgt) => { const h = c.h || (tgt ? "target" : "you");
    if (c.t === "thp" || (c.t === "ohp" && h === "target")) push(c.op || ">=", c.v);
    if (c.t === "hpcmp" && h === "you") push(FLIP[c.op || ">="], R.ctx.ohp);          // own HP >= target's  <=>  target <= own
    if (c.t === "any") (c.items || []).forEach(x => walkC(x, tgt)); };
  for (const r of R.rows) for (const x of r.effs) { (x.e.c || []).forEach(c => walkC(c, x.e.tgt));
    if (x.e.sc && SC(x.e.sc) === "HpLoss" && x.e.tgt) { const p = x.e.sp || [], lo = 100 * (p[0] || 0), hi = 100 * (p[2] == null ? 1 : p[2]);
      for (let v = lo; v < hi; v += Math.max(5, (hi - lo) / 8)) push(">=", Math.round(v)); } }        // linear: re-read in steps
  return out;
}
/* this setup reads how many of the target's parts still stand (WapPartRemainNums on your effects): the fight re-checks it per limb lost */
const readsParts = R => R.rows.some(r => r.effs.some(x => !x.dyn && (x.e.c || []).some(function f(c) { return c.t === "remain" || c.t === "parts" || (c.t === "any" && (c.items || []).some(f)); })));
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
/* how many fights fit the rolling budget for this setup (long fights vary little, so fewer of them are needed), 100 to 2,000;
   update() gives A and B the smaller of their two counts, so both are compared on the same number of fights */
function fightCount(O) {
  const tg = D.targets[T.target], rb = O.base, shotsPer = rb.shots + (rb.pv ? rb.pv.shots : 0) + (rb.gusty ? rb.gusty.p * rb.gusty.shots : 0);
  const estK = Math.min(1000, Math.max(1, tg.hp.Body * T.hp / 100 / Math.max(1, O.exp * (rb.wts.Body || 0.25)) * 0.8));
  return Math.max(100, Math.min(2000, Math.round(400000 / (estK * Math.max(1, shotsPer)))));
}
function simulate(O, conf, nFights) {
  const rand = rng(12345), RUNS = 4000, CAP = 1000, BUDGET = 400000, tg = D.targets[T.target];
  const pickO = (OO = O) => { let u = rand(), o = OO.list[OO.list.length - 1]; for (const c of OO.list) { if (u < c.p) { o = c; break; } u -= c.p; } return o.R; };
  // 'Target HP >= / <= N%' effects (Forceful / Accurate Strike, Core Talent 2 ...) follow the fight: before each attack the game reads
  // the whole unit's HP (BattleActorCompHp4TacticalUnit.CurrHpPercentGet: four parts over their max), so the setup is recomputed
  // for each band of thresholds it crosses (cached)
  const thr = thpConds(O.base), cacheO = {}, parts = readsParts(O.base);
  const bandKey = (f, n) => thr.map(c => CMP[c.op || ">="](f, c.v) ? 1 : 0).join("") + (parts ? ":" + n : "");
  const outcomesAt = st => {
    if ((!thr.length && !parts) || !st) return O;
    const f = 100 * PARTS.reduce((a, p) => a + Math.max(0, st.hp[p]), 0) / PARTS.reduce((a, p) => a + tg.hp[p], 0), k = bandKey(f, st.alive.size);
    if (k === bandKey(T.hp, 3)) return O;
    if (!cacheO[k]) { const keep = T.hp, keepA = T._alive; T.hp = f; if (parts) T._alive = new Set(st.alive);
      try { cacheO[k] = outcomes(O.base.s) || O; } finally { T.hp = keep; T._alive = keepA; } }
    return cacheO[k];
  };
  const pick = (w) => { let u = rand(); for (const p of PARTS) { if (u < w[p]) return p; u -= w[p]; } return "Body"; };
  // one round of shots: hit (with the miss-streak bonus), part, crit; returns damage dealt (for the one-attack runs) and applies it to hp
  const round = (n, hitAfter, crit, critDmg, shotBy, sk, st, xp, at) => {
    let dmg = 0;
    // a term that depends on the target's part HP (Downwind >= 50%, Heinz's +25% once a limb is destroyed) follows the fight
    const H = at && st ? {hp: st.hp, max: tg.hp, alive: st.alive, h0: st.h0} : null;
    const sb = H ? p => at(p, H) : p => shotBy[p];
    for (let i = 0, m = 0; i < n; i++) {
      if (st && st.hp.Body <= 0) break;
      if (rand() >= hitAfter(m)) { m++; continue; } m = 0;
      if (sk.av && st && !(T.mode === "focus" && (T.part === "Body" || st.alive.has(T.part)))) {
        const L = PARTS.filter(x => x === "Body" || st.alive.has(x)), p = L[(st.rr = (st.rr || 0) + 1) % L.length];
        const d = sb(p) * (rand() < crit ? 1 + critDmg : 1); dmg += d; st.hp[p] -= d;
        if (p !== "Body" && st.hp[p] <= 0 && st.alive.has(p)) { st.alive.delete(p); st.wc = {}; st.broke[p] = st.k; }
        dmg += extra(xp, d, p, st);
        continue;
      }
      const w = !st ? sk.w0 : sk.R.pw.dyn ? partWeights(sk, st.alive, {...sk.R.pw, hp: st.hp}) : (st.wc[sk.key] || (st.wc[sk.key] = partWeights(sk, st.alive, sk.R.pw))), p = pick(w);
      const d = sb(p) * (rand() < crit ? 1 + critDmg : 1); dmg += d;
      if (st) { st.hp[p] -= d; if (p !== "Body" && st.hp[p] <= 0 && st.alive.has(p)) { st.alive.delete(p); st.wc = {}; st.broke[p] = st.k; } }
      dmg += extra(xp, d, p, st);
    }
    return dmg;
  };
  // RA extra hits (Explosive Charge: share of srcAtk; Splash: share of that shot's damage) on a random OTHER standing part
  const extra = (xp, d, p, st) => {
    if (!xp || !xp.length) return 0; let tot = 0;
    for (const x of xp) {
      const v = x.t === "ec" ? x.val : x.v * d;
      if (!st) { tot += v; continue; }
      const L = PARTS.filter(q => q !== p && (q === "Body" || st.alive.has(q))); if (!L.length) continue;
      const q = L[(rand() * L.length) | 0]; st.hp[q] -= v; tot += v;
      if (q !== "Body" && st.hp[q] <= 0 && st.alive.has(q)) { st.alive.delete(q); st.wc = {}; st.broke[q] = st.k; }
    }
    return tot;
  };
  const attack = (R, st) => {
    if (st) st.h0 = {...st.hp};                                  // HP before the attack (the lowest / highest-HP part checks)
    const sk = {pw: R.sk.pw, av: R.sk.av, w0: R.wts, R, key: "m"}; let d = round(R.shots, R.hitAfter, R.crit, R.critDmg, R.shotBy, sk, st, R.xps, R.dyn ? R.shotAt : null);
    if (R.pv) d += round(R.pv.shots, R.pv.hitAfter, R.pv.crit, R.pv.critDmg, R.pv.shotBy, sk, st, null, R.pv.dyn ? R.pv.shotAt : null);
    if (R.gusty && rand() < R.gusty.p) { const G = R.gusty.R; d += round(G.shots, G.hitAfter, G.crit, G.critDmg, G.shotBy, {pw: G.sk.pw, av: G.sk.av, w0: G.wts, R: G, key: "g"}, st, null, G.dyn ? G.shotAt : null); }
    if (R.burnSet) { if (st) burnAll(R, st); d += R.burnNow; }
    return d;
  };
  const burnAll = (R, st) => { for (const p of PARTS) if (p === "Body" || st.alive.has(p)) { st.hp[p] -= R.burn[p];
    if (p !== "Body" && st.hp[p] <= 0) { st.alive.delete(p); st.wc = {}; st.broke[p] = st.k; } } };
  // one attack, every part standing: the spread of a single attack
  const single = Array.from({length: RUNS}, () => attack(pickO(), null)).sort((a, b) => a - b);
  const mean = single.reduce((a, b) => a + b, 0) / RUNS, tail = Math.max(1, Math.round((100 - conf) / 100 * RUNS));
  const worst = single.slice(0, tail).reduce((a, b) => a + b, 0) / tail;
  // whole fights: attack until the body is at 0; the terrain tick hits every standing part after each attack (one attack per enemy turn)
  const kills = [], breaks = {"Left arm": [], "Right arm": [], Legs: []}, hp0 = {};
  for (const p of PARTS) hp0[p] = tg.hp[p] * T.hp / 100;
  function hp0Body() { return hp0.Body; }
  const FIGHTS = nFights || fightCount(O);
  if (mean > 0 || O.base.s.extra.burnT) for (let f = 0; f < FIGHTS; f++) {
    const st = {hp: {...hp0}, alive: new Set(PARTS.filter(p => p !== "Body")), broke: {}, k: 0, wc: {}};
    while (st.hp.Body > 0 && st.k < CAP) { st.k++; attack(pickO(outcomesAt(st)), st); if (st.hp.Body > 0 && O.base.s.extra.burnT) burnAll(O.base, st); }
    kills.push(st.hp.Body <= 0 ? st.k : CAP + 1);
    for (const p of Object.keys(breaks)) breaks[p].push(st.broke[p] || Infinity);
  }
  kills.sort((a, b) => a - b);
  const at = (arr, c) => arr.length ? arr[Math.min(arr.length - 1, Math.ceil(c / 100 * arr.length) - 1)] : null;
  const need = at(kills, conf), hist = {};
  for (const k of kills) hist[k] = (hist[k] || 0) + 1;
  const brk = {}; for (const [p, arr] of Object.entries(breaks)) { arr.sort((a, b) => a - b); const v = at(arr, conf); brk[p] = v === Infinity ? null : v; }
  return {mean, worst, worstPct: mean ? worst / mean : 0, tail: 100 - conf, need: need > CAP ? null : need,
          avgKill: kills.some(k => k > CAP) || !kills.length ? null : kills.reduce((a, b) => a + b, 0) / kills.length,
          hist, fights: kills.length, brk, hp: hp0.Body};
}

/* ------------------------------------------------------------------ rendering: setup */
/* attacks this setup can make: Normal Attack, the equipped attack skills / EX, and attacks other skills unlock */
function attackOpts(s, weap) {
  const W = weap[s.atk.slot] && D.weapons[weap[s.atk.slot].id], P = D.pilots[s.pilot], out = [["normal", "Normal Attack", W ? icon("weapon", weap[s.atk.slot].id) : ""]];
  const fits = k => D.skills[k] && D.skills[k].atk && (!W || D.skills[k].atk[W.type]);
  for (const k of [...s.skills, s.ex]) if (k && fits(k) && !out.some(o => o[0] === k)) out.push([k, (k === s.ex ? "EX: " : "") + D.skills[k].n, icon("skill", k)]);
  for (const x of P.xatk || []) if (fits(x.k) && !out.some(o => o[0] === x.k)) out.push([x.k, `${D.skills[x.k].n} (${x.via.toLowerCase()})`, icon("skill", x.k)]);
  return out;
}
function attackName(s) { return s.atk.skill && s.atk.skill !== "normal" && D.skills[s.atk.skill] ? D.skills[s.atk.skill].n : "Normal Attack"; }
function sel(id, opts, cur, empty) { return `<select id="${id}">${empty ? opt("", empty, !cur) : ""}${opts.map(([v, l, ic]) => opt(v, l, String(v) === String(cur), ic)).join("")}</select>`; }
function featureOpts(port, who, slotIdx, taken) {
  return byName(D.features).filter(k => { const F = D.features[k]; return F.port === port && (!who || F.for === who || F.for === "any" || !F.for)
    && (!F.slots || F.slots.split(",").includes(["I", "II", "III"][slotIdx])) && !(taken || []).some((x, j) => j !== slotIdx && x === k); }).map(k => [k, D.features[k].n, icon("feature", k)]);
}
let SHOW_ALL_STATS = false;
const EXTRA_FIELDS = [["attr", "Attribute +"], ["dmgB", "Damage %"], ["finalB", "Final damage %"], ["hitrate", "Hit chance +"],
  ["crit_rate", "Crit rate +"], ["crit_fin", "Crit rate after features +"], ["shred", "Armor shred %"], ["splash", "Flame DMG %"]];
/* full name + game description under a feature dropdown; flags features whose only effect does nothing */
function featDesc(k) {
  const F = k && D.features[k]; if (!F) return "";
  const fx = (D.fx[F.fx] || []), dead = fx.length && fx.every(e => e.f === "crit_app_fin");
  return `<span class="desc"><b>${esc(F.n)}</b> · ${esc(F.d || "")}${dead ? ' <span class="warnline">(does nothing measurable: adds +0.05 to the final crit points)</span>' : ""}</span>`;
}
function renderSide(id) {
  const s = S[id], P = D.pilots[s.pilot], st = stOf(s), el = $("side-" + id);
  const star = P.stars[Math.min(s.star, P.stars.length - 1)];
  const weap = equipped(s), fixed = fixedWeapons(s);
  const unitOpts = D.units.map((u, i) => [i, `${D.pilots[u.pilot].name} · ${u.from}`]);
  const skillOpts = P.skills.map(k => [k, `${D.skills[k].n} (${D.skills[k].type === "ActiveAttack" ? "ActiveAttack" : D.skills[k].type === "Code" ? "code" : "passive"})`, icon("skill", k)]);
  const exOpts = D.ex.map(k => [k, D.skills[k].n, icon("skill", k)]);
  const wcls = st.cls;
  const drive = p => D.pilots[p].stars[0] && D.pilots[p].stars[0].drive;
  const fitPilots = pilotIds.filter(p => drive(p) === wcls);
  const usedW = Object.values(weap).map(w => D.weapons[w.id]).filter(Boolean);
  const showAll = SHOW_ALL_STATS || !usedW.length;
  const shownAttrs = showAll ? ATTRS : ATTRS.filter(a => usedW.some(W => W.attr === a));
  const shownCats = showAll ? CATS : CATS.filter(c => usedW.some(W => W.cat === c));
  const sectorRows = sec => { const ks = P.sectors[sec] || [], fixedN = sec === "α" || sec === "β" ? 3 : 1;
    return `<div class="sector"><div class="lbl">${secName(sec)}</div>` + ks.map((k, i) => { const fixed = i < fixedN, on = secOn(s, sec, i), always = fixed;
      return `<label class="lvl${on ? "" : " dim"}"><input type="checkbox" ${always ? `${on ? "checked " : ""}disabled` : `data-sect="${sec}:${i - 1}" ${on ? "checked" : ""}`}>
        <span><b>L${i + 1} · ${esc(D.skills[k].n)}</b>${always ? ` <span class="pill">${on ? "always on" : "no chip power"}</span>` : ""}<span class="desc">${esc(D.skills[k].d || "")}</span></span></label>`; }).join("") + `</div>`; };
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
        ${PARTS.map(p => `<label class="f"><span class="lbl">${p} grade · Lv70</span>${sel(`${id}-gr-${p}`, st.parts[p].grades.map((g, i) => [i, qualityLabel(st.parts[p].grades, i)]), s.grades[p])}</label>`).join("")}
        ${PARTS.map(p => `<label class="f"><span class="lbl">${p} module</span>${sel(`${id}-md-${p}`, moduleOpts, s.mods[p], "—")}</label>`).join("")}</div>
      ${D.sts[s.st].hidden ? `<div class="meta">${hiddenOn(s) ? "Hidden modules active (full set, all parts SS)" : "Hidden modules off: they need all four parts from this ST, every part at rainbow (SS)"}; their effects also need Eruption Mod at L8.</div>` : ""}
      ${st.mixed ? `<div class="meta">Mixed set: each part's FP, hit, passives and built-in modules come from its own ST; the body's ST sets the class.</div>` : ""}
      <div class="meta">Module levels (built-in from grades + equipped): ${esc(Object.entries(moduleCounts(s)).map(([k, n]) => `${D.modules[k].n} L${Math.min(n, D.modules[k].max)}${n > D.modules[k].max ? " (max)" : ""}`).join(" · ") || "none")}</div>
    </div></details>
    <details class="sec" id="${id}-d-w"><summary><h3>Weapons</h3><span class="sub">attack with: ${esc(weap[s.atk.slot] ? D.weapons[weap[s.atk.slot].id].n : "—")} · ${esc(attackName(s))}</span></summary><div class="sbody">
      <div class="grid"><label class="f span2"><span class="lbl">Attack</span>${sel(id + "-atkskill", attackOpts(s, weap), s.atk.skill || "normal")}</label>
        <label class="f"><span class="lbl">Back slot</span>${sel(id + "-back", backOpts, s.back || "")}</label></div>
      ${SLOTS.map(([slot, label]) => slotHtml(id, s, slot, label, weap, fixed)).join("")}
    </div></details>
    <details class="sec" id="${id}-d-pilot"><summary><h3>Pilot</h3><span class="sub">${esc(P.name)} · ${esc(P.class || "")} · potential ${s.star}</span></summary><div class="sbody">
      <div class="grid">
        <label class="f span2"><span class="lbl">Pilot</span>${sel(id + "-pilot", (fitPilots.includes(s.pilot) ? fitPilots : [s.pilot, ...fitPilots]).map(p => [p, D.pilots[p].name + (D.pilots[p].class ? " · " + D.pilots[p].class : ""), icon("pilot", p)]), s.pilot)}</label>
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
        ${moduleLevels(s).some(x => x.L.combo) ? `<label class="f"><span class="lbl">Gusty Strike (${esc(moduleLevels(s).find(x => x.L.combo).L.combo[0].n)})</span>${sel(id + "-x-gusty", [["chance", "Weighted by its chance"], ["on", "Triggered"], ["off", "Not triggered"]], s.extra.gusty || "chance")}</label>` : ""}</div>
    </div></details>
    <details class="sec"><summary><h3>Extra bonuses</h3><span class="sub">${EXTRA_FIELDS.filter(([k]) => s.extra[k]).length || "none"}${EXTRA_FIELDS.some(([k]) => s.extra[k]) ? " set" : ""}</span></summary><div class="sbody"><div class="grid">
      ${EXTRA_FIELDS.map(([k, l]) => `<label class="f"><span class="lbl">${l}</span><input type="number" id="${id}-x-${k}" value="${s.extra[k] || 0}"></label>`).join("")}</div>
      <div class="meta">For effects the bench doesn't add by itself: stacks and triggers gained mid-fight, buffs from allies or the stage, debuffs you put on the target.
        Percent fields take whole numbers (12 = +12%). Crit rate + is added to CritRate, so it is multiplied by (1 + CritRate_feat); Crit rate after features + is CritRate_final, added after the multiplier. Armor shred % is added to ArmorShred%.</div></div></details>
    <details class="sec"><summary><h3>Where your numbers come from</h3></summary><div class="sbody tablebox" id="${id}-src"></div></details>
    <details class="sec"><summary><h3>Breakdown</h3></summary><div class="sbody tablebox" id="${id}-bd"></div></details>
    <details class="sec"><summary><h3>Save / load</h3></summary><div class="sbody"><div class="saves">
      <label class="f"><span class="lbl">Name</span><input type="text" id="${id}-svname" value="${esc(s.name || "")}" placeholder="e.g. Rosa — crit build"></label>
      <button type="button" id="${id}-save">Save</button></div>
      <div class="saves"><label class="f"><span class="lbl">Saved loadouts</span><select id="${id}-svlist"></select></label>
      <button type="button" id="${id}-load">Load</button><button type="button" id="${id}-del">Delete</button></div>
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
      <div class="f" style="display:grid;gap:4px;align-content:start"><span class="lbl">Improvement</span><span style="padding:5px 0">${esc((W.impr_n || "").replace(/^Improvement:\s*/, "") || "refit")} <b>+${rdOv(s, "impr|" + W.type) ?? (typeof w.impr === "number" ? w.impr : W.impr || 0)}</b> <span class="meta">(${rdOv(s, "impr|" + W.type) != null ? "your value" : typeof w.impr === "number" ? (w.impr === (W.impr || 0) ? "max, as loaded" : "as loaded") : "max"})</span></span></div>
      <label class="f span2"><span class="lbl">Advanced ATK <span id="${id}-wav-${slot}">+${w.atk}</span> (${W.adv[0]}–${W.adv[1]})</span><input type="range" id="${id}-wa-${slot}" min="${W.adv[0]}" max="${W.adv[1]}" value="${w.atk || W.adv[0]}"></label>
      ${[0, 1].map(i => { const o = w.opts[i], po = o && pool.find(x => x.fx === o.fx);
        const own = o && !po && D.fx[o.fx] ? [[o.fx, `${D.fx[o.fx][0].n || "current"} (yours)`, icon("adv", o.fx)]] : [];
        return `<label class="f span2"><span class="lbl">Advanced option ${i + 1}</span>${sel(`${id}-wo-${slot}-${i}`, own.concat(pool.filter(x => !w.opts.some((y, j) => j !== i && y && y.fx === x.fx)).map(x => [x.fx, `${x.n} (${x.lo}–${x.hi})`, icon("adv", x.fx)])), o ? o.fx : "", "—")}</label>
          <label class="f"><span class="lbl">Value</span><input type="number" id="${id}-wov-${slot}-${i}" ${po ? `min="${po.lo}" max="${po.hi}"` : o ? "" : "disabled"} value="${o && o.v != null ? o.v : po ? po.hi : ""}"></label>
          ${o ? `<div class="desc span3">${esc(po ? po.d : fxText(o.fx))}</div>` : ""}`; }).join("")}
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
function accHtml(id, s, slot, w, W) {
  const cap = W.load || 0;
  if (!cap) return `<div class="meta">No accessory slots.</div>`;
  const tas = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "TA"), ras = w.comps.filter(c => D.components[c.id] && D.components[c.id].k === "RA");
  const fits = k => Object.keys(D.components).filter(c => { const C = D.components[c]; return C.k === k && C.q === "SSR" && (!C.own || w.comps.some(x => x.id === c)) && (!C.fits || C.fits === "Any weapon" || C.fits.split(", ").includes(W.type)); })
    .sort((a, b) => D.components[a].n.localeCompare(D.components[b].n));
  const row = (c, i) => { const C = D.components[c.id]; const isTA = C.k === "TA";
    return `<div class="acc"><span><b>${esc(C.n)}</b> <span class="pill">${C.q}</span></span>
      ${isTA ? `<span class="pill">trigger</span>`
             : sel(`${id}-am-${slot}-${i}`, [["chance", `Weighted (${pct(chance[c.id] || 0, 0)} per attack)`], ["on", "Triggered"], ["off", "Not triggered"]], c.mode)}
      <span class="d">${esc(C.d || "")} · factor ${C.f}</span>
      <button type="button" data-accdel="${slot}:${i}">Remove</button></div>`; };
  const chance = accChances(w);
  let h = `<div class="lbl">Accessories ${w.comps.length}/${cap} (TA ${tas.length}/3 · RA ${ras.length}/3)</div>
    <div class="desc">A reaction (RA) fires only when one of the weapon's triggers (TA) fires. Weighted uses the chance that at least one trigger fires it this attack
      (0.4 ÷ TA factor ÷ RA factor per pair), assuming the triggers' conditions happen. Pick Not triggered if they won't, or Triggered to see the damage when it does.</div>`;
  h += w.comps.map((c, i) => D.components[c.id] ? row(c, i) : "").join("");
  if (w.comps.length < cap) h += `<div class="grid">
    ${tas.length < 3 ? `<label class="f span2"><span class="lbl">Add trigger (TA)</span>${sel(`${id}-addta-${slot}`, fits("TA").map(c => [c, D.components[c].n + (D.components[c].w ? " (two-handed only)" : ""), icon("comp", c)]), "", "—")}</label>` : ""}
    ${ras.length < 3 ? `<label class="f span2"><span class="lbl">Add reaction (RA)</span>${sel(`${id}-addra-${slot}`, fits("RA").map(c => [c, D.components[c].n + (D.components[c].w ? " (two-handed only)" : ""), icon("comp", c)]), "", "—")}</label>` : ""}</div>`;
  return h;
}

const OPEN = {};                         // which sections the viewer has open, kept across re-renders and loads
function wireSide(id) {
  $("side-" + id).querySelectorAll("details.sec").forEach((d, i) => { const k = id + ":" + i;
    if (k in OPEN) d.open = OPEN[k];
    d.addEventListener("toggle", () => { OPEN[k] = d.open; }); });
  const s = S[id], on = (sid, ev, fn) => { const e = $(sid); if (e) e.addEventListener(ev, fn); };
  const rer = () => { renderSide(id); update(); };
  const keepOpen = () => { const open = [...$("side-" + id).querySelectorAll("details.sec")].map(d => d.open); return () => [...$("side-" + id).querySelectorAll("details.sec")].forEach((d, i) => d.open = open[i]); };
  const reRender = () => { const r = keepOpen(); renderSide(id); r(); update(); };
  on(id + "-unit", "change", e => { if (e.target.value === "") return; const i = +e.target.value, u = D.units[i];
    S[id] = fromUnit(u); markLoaded(S[id], {kind: "battle", idx: i, label: `${D.pilots[u.pilot].name} · ${u.from}`}); reRender(); });
  on(id + "-blank", "click", () => { S[id] = blankSide(s.pilot); reRender(); });
  on(id + "-pilot", "change", e => { const n = blankSide(e.target.value);
    for (const k of ["st", "pst", "grades", "mods", "back", "w", "atk", "stf", "wf", "loaded"]) n[k] = s[k];
    if (D.pilots[n.pilot].class === D.pilots[s.pilot].class) n.pf = s.pf;                 // same class: its pilot features still fit
    S[id] = n; reRender(); });
  on(id + "-showall", "change", e => { SHOW_ALL_STATS = e.target.checked; ["A", "B"].forEach(x => { renderSide(x); }); update(); });
  on(id + "-star", "change", e => { s.star = +e.target.value; reRender(); });
  ATTRS.forEach(a => on(`${id}-sc-${a}`, "input", e => { s.screen[a] = e.target.value === "" ? null : +e.target.value; update(); }));
  ATTRS.forEach(a => on(`${id}-ch-attr-${a}`, "input", e => { if (e.target.value === "") delete s.chips["attr:" + a]; else s.chips["attr:" + a] = +e.target.value; update(); }));
  CATS.forEach(c => { on(`${id}-ch-hit-${c}`, "input", e => { s.chips["hit:" + c] = +e.target.value || 0; update(); });
                      on(`${id}-ch-crit-${c}`, "input", e => { s.chips["crit:" + c] = +e.target.value || 0; update(); }); });
  [0, 1, 2].forEach(i => { on(`${id}-sk-${i}`, "change", e => { s.skills[i] = e.target.value || null; reRender(); });
    on(`${id}-pf-${i}`, "change", e => { s.pf[i] = e.target.value || null; reRender(); });
    on(`${id}-stf-${i}`, "change", e => { s.stf[i] = e.target.value || null; reRender(); });
    on(`${id}-wf-${i}`, "change", e => { s.wf[i] = e.target.value || null; reRender(); }); });
  on(id + "-ex", "change", e => { s.ex = e.target.value || null; reRender(); });
  on(id + "-st", "change", e => { s.st = e.target.value; const cls = D.sts[s.st].cls;
    s.pst = Object.fromEntries(Object.entries(s.pst || {}).filter(([p, k]) => k !== s.st && D.sts[k] && D.sts[k].cls === cls));   // other parts keep their own ST when it fits
    PARTS.forEach(p => { if (partST(s, p) === s.st) s.grades[p] = D.sts[s.st].parts[p].grades.length - 1; });
    const dr = p => D.pilots[p].stars[0] && D.pilots[p].stars[0].drive;
    for (const [slot] of SLOTS) if (s.w[slot] && !D.weapons[s.w[slot].id].cls.includes(cls)) delete s.w[slot];   // weapons this class can't carry
    if (s.back && s.back.startsWith("bp:") && !backFits(D.backs[s.back.slice(3)], cls)) s.back = null;
    s.stf = s.stf.map(k => k && D.features[k] && (!D.features[k].for || ["any", cls].includes(D.features[k].for)) ? k : null);   // ST features for another class
    if (dr(s.pilot) !== cls) { const np = pilotIds.find(p => dr(p) === cls);                                     // a pilot who can drive it
      if (np) { const n = blankSide(np); for (const k of ["st", "pst", "grades", "mods", "back", "w", "atk", "stf", "wf", "loaded"]) n[k] = s[k]; S[id] = n; } }
    reRender(); });
  on(id + "-back", "change", e => { s.back = e.target.value || null; reRender(); });
  PARTS.slice(1).forEach(p => on(`${id}-pst-${p}`, "change", e => { (s.pst ||= {})[p] = e.target.value || null; if (!s.pst[p]) delete s.pst[p];
    s.grades[p] = stOf(s).parts[p].grades.length - 1; reRender(); }));
  PARTS.forEach(p => { on(`${id}-gr-${p}`, "change", e => { s.grades[p] = +e.target.value; reRender(); });
                       on(`${id}-md-${p}`, "change", e => { s.mods[p] = e.target.value || null; update(); }); });
  $("side-" + id).querySelectorAll(`input[name="${id}-atk"]`).forEach(r => r.addEventListener("change", e => { s.atk.slot = e.target.value; reRender(); }));
  on(id + "-atkskill", "change", e => { s.atk.skill = e.target.value || "normal"; reRender(); });
  for (const [slot] of SLOTS) {
    on(`${id}-w-${slot}`, "change", e => { s.w[slot] = e.target.value ? newWeapon(e.target.value) : undefined; if (e.target.value && !equipped(s)[s.atk.slot]) s.atk.slot = slot; reRender(); });
    const w = s.w[slot]; if (!w) continue;
    on(`${id}-wi-${slot}`, "change", e => { w.impr = e.target.value === "1"; update(); });
    on(`${id}-wa-${slot}`, "input", e => { w.atk = +e.target.value; $(`${id}-wav-${slot}`).textContent = "+" + w.atk; updateSoon(); });
    [0, 1].forEach(i => { on(`${id}-wo-${slot}-${i}`, "change", e => { w.opts[i] = e.target.value ? {fx: e.target.value, v: null} : null; reRender(); });
      on(`${id}-wov-${slot}-${i}`, "input", e => { if (w.opts[i]) { w.opts[i].v = +e.target.value; update(); } }); });
    on(`${id}-wd-${slot}`, "change", e => { w.drop = e.target.value || null; update(); });
    w.comps.forEach((c, i) => on(`${id}-am-${slot}-${i}`, "change", e => { c.mode = e.target.value; update(); }));
    on(`${id}-addta-${slot}`, "change", e => { if (e.target.value) { w.comps.push({id: e.target.value}); reRender(); } });
    on(`${id}-addra-${slot}`, "change", e => { if (e.target.value) { w.comps.push({id: e.target.value, mode: "chance"}); reRender(); } });
  }
  $("side-" + id).addEventListener("click", e => { const d = e.target.dataset.accdel; if (!d) return; const [slot, i] = d.split(":"); s.w[slot].comps.splice(+i, 1); reRender(); });
  $("side-" + id).addEventListener("change", e => {
    const sc = e.target.dataset.sect; if (sc) { const [sec, i] = sc.split(":"); s.sect[sec][+i] = e.target.checked; update(); }
    const tg = e.target.dataset.tog; if (tg) { s.tog[tg] = e.target.checked; update(); }
    const sk = e.target.dataset.sit; if (sk) { setSit(s, sk, e.target); update(); }
  });
  $("side-" + id).addEventListener("change", e => {
    const k = e.target.dataset.stk; if (!k) return;
    (s.stk ||= {})[k] = Math.max(1, Math.min(+e.target.max || 99, Math.round(+e.target.value) || 1)); update();
  });
  for (const [k] of EXTRA_FIELDS) on(`${id}-x-${k}`, "input", e => { s.extra[k] = +e.target.value || 0; updateSoon(); });
  on(`${id}-x-gusty`, "change", e => { s.extra.gusty = e.target.value; update(); });
  for (const k of ["burnT", "burnSelf", "pvOff", "burnOwn"]) on(`${id}-x-${k}`, "change", e => { s.extra[k] = e.target.checked; reRender(); });
  on(`${id}-x-ohp`, "input", e => { const v = Math.round(+e.target.value); s.extra.ohp = v >= 1 && v <= 100 ? v : 100; updateSoon(); });
  on(id + "-save", "click", () => saveLoadout(id));
  on(id + "-load", "click", () => loadLoadout(id));
  on(id + "-del", "click", () => deleteLoadout(id));
}

/* ------------------------------------------------------------------ rendering: the Situation panel */
function setSit(s, key, el) {
  const u = s.sit || (s.sit = {});
  let val = el.type === "checkbox" ? el.checked : el.tagName === "SELECT" ? el.value : el.value === "" ? undefined : +el.value;
  if (typeof val === "number") { if (el.min !== "" && val < +el.min) val = +el.min; if (el.max !== "" && val > +el.max) val = +el.max; }   // held to the box's bounds
  if (key === "ohp") { s.extra.ohp = val >= 1 && val <= 100 ? Math.round(val) : 100; return; }
  if (key === "pvOff") { s.extra.pvOff = !!val; return; }
  if (key.startsWith("tTgt.") || key.startsWith("tYou.")) {
    const [w, f] = key.split("."), legacy = w === "tTgt" ? {cat: s.extra.burnT ? "flame" : "none", by: s.extra.burnOwn ? "you" : "ally"} : {cat: s.extra.burnSelf ? "flame" : "none", by: "you"};
    u[w] = {...(u[w] || legacy), [f]: val};
    if (w === "tTgt") { s.extra.burnT = u.tTgt.cat === "flame"; s.extra.burnOwn = s.extra.burnT && u.tTgt.by === "you"; } else s.extra.burnSelf = u.tYou.cat === "flame";
    return; }
  const m = key.match(/^(eN|eSq|aN|aSq|aT|st):(.+)$/), mt = key.match(/^eT:(m|c):(\d+)$/);
  if (mt) { ((u.eT ||= {})[mt[1]] ||= {})[mt[2]] = val; return; }
  if (m) { (u[m[1]] ||= {})[m[2]] = val; return; }
  u[key] = val;
}
const shortList = L => L.length <= 3 ? L.join(", ") : L.slice(0, 3).join(", ") + ` and ${L.length - 3} more`;
const ST_IN = {stealth: ["You are in Stealth"], asuka: ["Asuka (EVA-02) is deployed on your team"], rei: ["Rei (EVA-00) is deployed on your team"],
  reload: ["One of your other weapons is reloading"], instab: ["Instability stacks on the target", 5], scarsT: ["Scars on the target", 5], scarsAll: ["Scars on all enemies", 20],
  crash: ["Enemies holding Crash in that area", 9], intim: ["Enemies holding Intimidation in that area", 9], timid: ["Enemies with Timidity right next to you", 8],
  maglock: ["Enemies under Magnetic Lock", 9], appointed: ["Allies with Appointed", 3], dtd: ["Your DMG taken down from elsewhere (%)", 100], field: ["Your units on your Defense Field", 9]};
function renderSit(id, R) {
  const el = $(id + "-sit"), sum = $(id + "-sitsum");
  if (!el) return;
  if (!R) { el.innerHTML = ""; if (sum) sum.textContent = ""; return; }
  const S = R.sit, s = R.s, use = S.use, has = k => use.has(k);
  const by = k => use.has(k) ? `read by ${esc(shortList([...use.get(k)]))}` : "";
  const numI = (k, lbl, v, a, b, note, dis) => `<label class="f"><span class="lbl">${lbl}</span><input type="number" data-sit="${k}" min="${a}" max="${b}" step="1" value="${v}"${dis ? " disabled" : ""}>${note ? `<span class="desc">${note}</span>` : ""}</label>`;
  const chk = (k, lbl, v, note) => `<label><input type="checkbox" data-sit="${k}" ${v ? "checked" : ""}> ${lbl}${note ? ` <span class="meta">${note}</span>` : ""}</label>`;
  const selI = (k, lbl, opts, cur, note) => `<label class="f"><span class="lbl">${lbl}</span><select data-sit="${k}">${opts.map(([v, l]) => opt(v, l, String(v) === String(cur))).join("")}</select>${note ? `<span class="desc">${note}</span>` : ""}</label>`;
  const grid = [], checks = [], notes = [];
  if (S.locked) notes.push(R.ctx.counter ? "A counter attack, made on the enemy's turn: no movement and no Re-ATK." : "A link attack, joining an ally's attack: no movement and no Re-ATK.");
  else if (has("reatk")) {
    checks.push(chk("reatk", "This attack is a Re-ATK (an extra action this turn)", S.reatk, R.rk.length ? `this setup can grant one: ${esc(shortList(R.rk))}` : "nothing in this setup grants one; an ally's skill can"));
    if (S.reatk && has("reSame")) checks.push(chk("reSame", "made with the skill that granted it", S.reSame));
  }
  const dNote = `attack range ${S.minR}–${S.maxR}${S.sq === 1 ? " (diagonal steps count 1)" : S.sq === 2 ? " (straight or diagonal lines)" : S.sq === 3 ? " (diagonals only)" : ""}${S.rangeExt ? ` (+${S.rangeExt} from your setup)` : ""}; ${S.idealHas ? `ideal range ${S.ideal[0]}–${S.ideal[1]}${S.inIdeal ? " (in it)" : ""}${S.foot ? "; any tile of this boss counts" : ""}` : "this weapon has no ideal range in this setup"}`;
  if (has("dist") || S.sq) grid.push(numI("dist", "Distance to the target (tiles)", S.dist, S.minR, S.maxD, dNote + (has("dist") ? `<br>${by("dist")}` : "")));
  if (has("dir") || S.sq) grid.push(selI("dir", "Direction to the target", [["line", "In a straight line"], ["diag", "Diagonal"], ["other", "Off the lines (e.g. 2 across, 1 up)"]]
    .filter(([d]) => S.okDir(S.dist, d)), S.dir, `diagonal steps count as 1 for square areas${has("dir") ? "; " + by("dir") : ""}`));
  if (has("anc") && S.foot) grid.push(numI("anc", "Extra tiles to the target's centre tile", S.anc, 0, S.foot, `this boss covers several tiles; per-tile effects measure to its anchor tile; ${by("anc")}`));
  if (has("moved")) grid.push(numI("moved", "Tiles moved before attacking", S.moved, 0, Math.floor(S.mov), `movement ${fmt(S.mov, S.mov % 1 ? 1 : 0)} tiles${S.locked ? "; not your own move" : ""}<br>${by("moved")}`, S.locked));
  if (has("thru") && S.moved >= 1) checks.push(chk("thru", "You moved through the target's tile", S.thru));
  if (has("ap")) grid.push(numI("ap", "AP before the attack", S.ap, Math.min(S.apCost, S.apMax), S.apMax, `max AP ${S.apMax}; this attack costs ${S.apCost}<br>${by("ap")}`));
  if (has("turn")) grid.push(numI("turn", "Battle turn", S.turn, 1, 99, by("turn")));
  if (S.A.mc) grid.push(numI("fury", "Fury stacks spent", S.fury, 0, S.furyMax, `each stack: +40% shots and +1 AP${S.furyMax < S.A.mc[1] ? `; at most ${S.furyMax} with max AP ${S.apMax}` : ""}`));
  if (has("ammo") && S.ammoMax) grid.push(numI("ammo", "Rounds in the magazine before firing", S.ammo, 1, S.ammoMax, `magazine ${S.ammoMax}; ${by("ammo")}`));
  if (has("area")) grid.push(numI("area", "Units the attack covers (incl. the target)", S.area, 1, 20, `${S.A.aoe === 1 ? "an area attack" : "the target plus any splash targets"}; ${by("area")}`));
  if (has("aoeD")) grid.push(numI("aoeD", "Tiles from the area's centre to the target", S.aoeD, 0, 6, by("aoeD")));
  // units around
  const u = S.u, val = (o, k, d = 0) => SITN((o || {})[k], d);
  for (const k of [...use.keys()].filter(k => /^(eN|eSq|aN|aSq|aT):|^eT:|^eAll$|^aAll$/.test(k)).sort()) {
    const [a, b, c] = k.split(":");
    const tgtNote = r => `the target (${S.dist} tiles away) ${S.dist <= r ? "counts as well" : "is farther"}`;
    const ring = r => 2 * r * (r + 1), sqr = r => (2 * r + 1) ** 2 - 1;            // tiles within r (Manhattan) / in the square, yours excluded
    if (a === "eN") grid.push(numI(k, `Other enemies within ${b} tiles of you`, val(u.eN, b), 0, ring(+b) - (S.dist <= +b ? 1 : 0), `${tgtNote(+b)}; ${by(k)}`));
    else if (a === "eSq") grid.push(numI(k, `Other enemies in the ${2 * b + 1}×${2 * b + 1} square around you`, val(u.eSq, b), 0, sqr(+b) - (S.cheb <= +b ? 1 : 0), `diagonals count; ${by(k)}`));
    else if (a === "aN") grid.push(numI(k, `Other allies within ${b} tiles of you`, val(u.aN, b), 0, Math.min(9, ring(+b)), by(k)));
    else if (a === "aSq") grid.push(numI(k, `Other allies in the ${2 * b + 1}×${2 * b + 1} square around you`, val(u.aSq, b), 0, Math.min(9, sqr(+b)), by(k)));
    else if (a === "aT") grid.push(numI(k, `Your other allies within ${b} tiles of the target`, val(u.aT, b), 0, 9, by(k)));
    else if (a === "eT") grid.push(numI(k, `Other enemies within ${c} tiles of the target${b === "c" ? " (diagonals count)" : ""}`, val((u.eT || {})[b], c), 0, 20, by(k)));
    else if (a === "eAll") grid.push(numI(k, "Other enemies on the map", SITN(u.eAll, 0), 0, 30, by(k)));
    else if (a === "aAll") grid.push(numI(k, "Allies still standing (anywhere)", SITN(u.aAll, 1), 0, 9, by(k)));
  }
  if (has("link")) grid.push(numI("link", "Allies joining with a link attack", S.link, 0, 3, by("link")));
  if (has("inRng")) grid.push(numI("inRng", "Enemies inside your weapon's normal-attack range (incl. the target)", S.inRng, 1, 20, by("inRng")));
  if (has("bufE")) { const own = catCount({...S, bufE: 0, st: {...S.st, stealth: false}}, R.held, "you", ["Enhance"], false);
    grid.push(numI("bufE", "Other buffs on you (allies, the stage)", S.bufE, 0, 30, `the bench already counts ${own} from this setup; ${by("bufE")}`)); }
  if (has("debW")) { const own = catCount({...S, debW: 0, st: {...S.st, instab: 0, scarsT: 0}}, R.held, "target", ["Weak"], false);
    grid.push(numI("debW", "Other debuffs on the target", S.debW, 0, 30, `the bench already counts ${own} from this setup; ${by("debW")}`)); }
  for (const [k, [lbl, mx]] of Object.entries(ST_IN)) if (has("st:" + k)) {
    if (mx == null) checks.push(chk("st:" + k, lbl, S.st[k], by("st:" + k))); else grid.push(numI("st:" + k, lbl, S.st[k], 0, mx, by("st:" + k))); }
  if (!R.s._xatk && pvBase(R.s, R)) checks.push(chk("pvOff", "The Peripheral Vision follow-up round goes to a different target", !!s.extra.pvOff, "leave off when it hits this target again"));
  if (has("xhp")) checks.push(chk("xhp", "You have temporary HP (a shield)", S.xhp, by("xhp")));
  if (has("last")) checks.push(chk("last", "Your previous single-target attack was on this target", S.last, by("last")));
  if (has("ctr")) grid.push(selI("ctr", "Can the target retaliate?", [["auto", `Work it out (${S.ctrAuto ? "yes" : "no"} at this distance)`], ["yes", "Yes"], ["no", "No"]], S.u.ctr || "auto",
    `from its counter weapons' reach and this attack; ${by("ctr")}`));
  // terrain and your HP: always
  const TCAT = [["none", "None"], ["flame", "Burning"], ["domain", "Domain"], ["guard", "Guard"], ["other", "Other terrain effect"]], TBY = [["you", "you"], ["ally", "an ally"], ["enemy", "the enemy"], ["map", "the map"]];
  grid.push(selI("tTgt.cat", "Terrain under the target", TCAT, S.tTgt.cat, S.tTgt.cat === "flame" ? "adds the Burning tick" + (has("tTgt") ? "; " + by("tTgt") : "") : has("tTgt") ? by("tTgt") : ""));
  if (S.tTgt.cat !== "none") grid.push(selI("tTgt.by", "…made by", TBY, S.tTgt.by, S.tTgt.cat === "flame" ? "yours: the tick takes your Fixed DMG %" : ""));
  if (has("tYou") || S.tYou.cat !== "none") { grid.push(selI("tYou.cat", "Terrain under you", TCAT, S.tYou.cat, by("tYou")));
    if (S.tYou.cat !== "none") grid.push(selI("tYou.by", "…made by", TBY, S.tYou.by)); }
  grid.push(numI("ohp", "Your HP % (all four parts)", R.ctx.ohp, 1, 100, has("ohp") ? by("ohp") : "decides “Own HP” bonuses"));
  el.innerHTML = `${notes.map(n => `<div class="meta">${n}</div>`).join("")}${checks.length ? `<div class="checks fxchecks">${checks.join("")}</div>` : ""}<div class="grid sitgrid">${grid.join("")}</div>
    <div class="meta">Only what this setup and attack depend on is listed; each box is limited to what the game allows. Defaults: a plain first attack on your turn, standing still, at ideal range (else your longest reach), nothing extra carried, full magazine.</div>`;
  if (sum) sum.textContent = [S.locked ? (R.ctx.counter ? "counter" : "link attack") : S.reatk ? "Re-ATK" : "your turn", has("dist") ? `${S.dist} tile${S.dist === 1 ? "" : "s"}${S.inIdeal ? " (ideal)" : ""}` : "",
    has("moved") ? (S.moved ? `moved ${S.moved}` : "not moved") : "", has("ap") ? `AP ${S.ap}` : "", S.tTgt.cat === "flame" ? "target on Burning" : ""].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ rendering: results */
function renderFx(id, R) {
  if (!R) { $(id + "-fx").innerHTML = ""; return; }
  const groups = {};
  for (const row of R.rows) (groups[row.src.group] ||= []).push(row);
  let h = "", onN = 0;
  const ORDER = ["ST", "Weapons", "Attacking weapon", "Accessories", "Pilot", "Features"];
  const gk = Object.keys(groups).sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  for (const g of gk) { const rows = groups[g];
    h += `<div class="lbl">${esc(g)}</div>`;
    for (const row of rows) {
      const anyOk = row.effs.some(x => x.eok || x.chOff);
      const chP = row.effs.filter(x => x.chk).map(x => R.chanceP[x.chk])[0];
      const st = row.src.kind === "ra" ? `<span class="pill ${row.on ? "on" : ""}">${row.on ? "triggered" : "by trigger"}</span>`
        : !anyOk ? `<span class="pill">doesn't apply</span>` : chP != null && !row.effs.some(x => x.eok) ? `<span class="pill on">${pct(chP, 0)} chance</span>`
        : row.on ? `<span class="pill on">on</span>` : row.ask ? `<span class="pill ask">check</span>` : `<span class="pill">off</span>`;
      if (row.on || row.mixed) onN++;
      const fx = row.effs.map(x => x.e.f === "pwadj" ? pwText(x.e) : x.e.f === "aim" ? "Aims the attack" + (x.e.m ? " (" + wtNames(x.e.m) + ")" : "") + (x.eok ? "" : " ✕")
        : `${FIELD[x.e.f] || x.e.f}${x.e.wt && LIMIT_F.has(x.e.f) ? " (" + (D.weapons && (TYPE_NAMES[x.e.wt] || x.e.wt)) + ")" : ""}${x.e.a ? " " + shownAttr(x.e.a) : ""}${x.e.part ? " (" + x.e.part + ")" : ""} ${sgn(x.val != null ? x.val : effVal(R.s, row.src, x.e), x.e.f)}${x.e.sc ? " (" + (SC_WORD[SC(x.e.sc)] || "by the situation") + ")" : ""}${x.chOff ? ` (${pct(R.chanceP[x.chk], 0)} chance: averaged into the attack, rolled in the fights)` : ""}${x.dup ? " (same buff as another row, counted once)" : x.lower ? " (a higher level of the same buff counts instead)" : ""}${!x.eok ? " ✕" : x.dyn && !x.sok ? " (not at this target HP; counts in the fight once met)" : row.mixed ? (x.eask ? (row.on ? "" : " (tick if met)") : " (always)") : ""}`);
      const conds = [...new Set(row.effs.flatMap(x => (x.e.c || []).map(c => c.text)))];
      const toggle = row.src.kind !== "ra" ? `<input type="checkbox" data-tog="${esc(row.src.key)}" ${row.on ? "checked" : ""} ${anyOk ? "" : "disabled"} aria-label="${esc(row.src.label)}">` : `<span></span>`;
      const smax = Math.max(0, ...row.effs.map(x => x.e.stk || 0));
      const sval = Math.max(1, Math.min(smax, (R.s.stk || {})[row.src.key] || 1));
      const stack = smax > 1 ? `<label class="stk" title="stacks (up to ${smax})">stacks <input type="number" min="1" max="${Math.min(smax, 99)}" value="${sval}" data-stk="${esc(row.src.key)}"></label>` : "";
      h += `<label class="src">${toggle}<span><span class="nm">${esc(row.src.label)}</span> ${st} ${stack}<div class="fx">${esc([...new Set(fx)].join(" · "))}</div></span>
        ${conds.length ? `<span class="cd">${esc(conds.join(" · "))}</span>` : ""}</label>`;
    }
  }
  $(id + "-fx").innerHTML = h || `<div class="meta">No bonuses that affect damage.</div>`;
  $(id + "-fxsum").textContent = `${onN} active`;
}
/* shots per attack: a range when a weighted accessory (e.g. Augmentation, bullets +1) changes it, with what sets the top */
/* one shot of a round by where it lands: limb / body (or the focused part), with crit */
function perPart(by, critDmg) {
  if (T.mode === "focus") return `<b>${fmt(by[T.part], 1)}</b> (crit ${fmt(by[T.part] * (1 + critDmg), 1)}) on the ${esc(T.part.toLowerCase())}`;
  const L = ["Left arm", "Right arm", "Legs"];
  if (L.some(p => Math.abs(by[p] - by["Left arm"]) > 0.05))
    return [...L, "Body"].map(p => `<b>${fmt(by[p], 1)}</b> on the ${p.toLowerCase()}`).join(" · ") + ` (crit ×${(1 + critDmg).toFixed(2)})`;
  return `<b>${fmt(by["Left arm"], 1)}</b> on a limb · <b>${fmt(by.Body, 1)}</b> on the body (crit ${fmt(by["Left arm"] * (1 + critDmg), 1)} / ${fmt(by.Body * (1 + critDmg), 1)})`;
}
function xpName(O) { const L = [...new Set(O.list.flatMap(o => o.R.xps.map(x => x.n)))]; return L.join(" + ") || "Extra hits"; }
function shotsText(O) {
  const ns = O.list.map(o => o.R.shots), lo = Math.min(...ns), hi = Math.max(...ns);
  if (lo === hi) return `${lo} shot${lo === 1 ? "" : "s"}`;
  const pHi = O.list.filter(o => o.R.shots === hi).reduce((a, o) => a + o.p, 0);
  const ras = O.base.raStates.filter(x => x.mode === "chance").map(x => x.id)
    .filter(id => O.list.some(o => o.R.shots !== lo && o.R.raStates.some(r => r.id === id && r.mode === "on")) && (D.components[id].fx || []).some(k => (D.fx[k] || []).some(e => e.f === "shots" || e.f === "shots_pct")));
  return `${lo}–${hi} shots (${hi} when ${ras.length ? esc(ras.map(id => D.components[id].n).join(" / ")) + " triggers" : "a trigger fires"} · ${pct(pHi, 0)} of attacks)`;
}
function renderOut(id, O, other, scale) {
  const el = $(id + "-out");
  if (!O) { el.innerHTML = `<div class="meta">Equip a weapon to see damage.</div>`; return; }
  const R = O.base, sim = O.sim, conf = T.conf;
  const d = (a, b) => { if (!other || !b) return ""; const x = a / b - 1; return `<span class="delta ${x > 0.0005 ? "up" : x < -0.0005 ? "down" : ""}">${x >= 0 ? "+" : ""}${(x * 100).toFixed(1)}%</span>`; };
  const ras = Object.entries(O.ch).map(([k, p]) => `${D.components[k].n} ${pct(p, 0)}`).join(" · ");
  const hov = (label, term) => `<span class="hov" title="${esc(term)}">${label}</span>`, tag = x => `<span class="tg">${x}</span>`;
  const spread = T.mode === "focus" ? `focus on the ${esc(T.part.toLowerCase())} while it stands` : "shots scatter across parts";
  const avgOf = f => O.list.reduce((a, o) => a + o.p * f(o.R), 0);
  const pvE = avgOf(r => r.pv ? r.pv.exp : 0), gE = avgOf(r => r.gusty ? r.gusty.exp : 0), bE = avgOf(r => r.burnNow || 0), xE = avgOf(r => r.xpE || 0), mainE = O.exp - pvE - gE - bE - xE;
  // tier 1: the fight
  let hist = "";
  if (sim.fights && scale) {
    const step = scale.hi - scale.lo > 30 ? 5 : scale.hi - scale.lo > 15 ? 2 : 1, bars = [];
    for (let k = scale.lo; k <= scale.hi; k++) {
      const sh = (sim.hist[k] || 0) / sim.fights, cls = k === sim.need ? "q" : sim.need != null && k < sim.need ? "a" : "b";
      bars.push(`<div class="hb" title="${k} attacks: ${pct(sh, 1)} of fights"><div class="hbar ${cls}" style="height:${Math.round(sh / scale.max * 54)}px"></div><div class="hl${k === sim.need ? " on" : ""}">${k === sim.need || (k - scale.lo) % step === 0 ? k : ""}</div></div>`);
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
  const hr = n => R.shots ? pct(R.expHits / R.shots, 0) : "—", cf = R.crit > 0 ? ` × ${(1 + R.crit * R.critDmg).toFixed(3)} crit` : "";
  const per = T.mode === "focus" ? `${fmt(R.hitAvg, 1)}` : `${fmt(R.hitAvg, 1)} (avg over parts)`;
  const land = R.TI.comp && R.shots > 1 && Math.abs(R.expHits / R.shots - R.hit) > 0.0005;     // miss-streak bonus lifts the share that lands
  const eqs = [`${O.list.length > 1 ? "without triggers: " : ""}main = ${R.shots} shot${R.shots === 1 ? "" : "s"} × ${hr()} ${land ? `land (${pct(R.hit, 1)} + miss-streak bonus)` : "hit"} × ${per}${cf}`];
  if (R.pv) eqs.push(`PV = ${R.pv.shots} shot${R.pv.shots === 1 ? "" : "s"} × ${pct(R.pv.R.expHits / R.pv.shots, 0)} ${land ? "land" : "hit"} × ${fmt(R.pv.hitAvg, 1)}`);
  if (R.gusty) eqs.push(`Gusty Strike = ${pct(R.gusty.p, 0)} × ${R.gusty.shots} shots × ${fmt(R.gusty.R.hitAvg, 1)}`);
  if (R.burnSet) eqs.push(`terrain set off = ${fmt(R.burnNow)}`);
  const xpOn = O.list.find(o => o.R.xps.length);
  if (xpOn) eqs.push(xpOn.R.xps.map(x => `${esc(x.n)} = ${pct(O.list.filter(o => o.R.xps.some(y => y.n === x.n)).reduce((a, o) => a + o.p, 0), 0)} × ${xpOn.R.expHits.toFixed(2)} hits × ${x.t === "ec" ? `${pct(x.v, 0)} of srcAtk ${fmt(x.v * R.srcAtk, 1)}` : `${pct(x.v, 0)} of each hit`} on another part`).join(" · "));
  const wr = O.list.length > 1 ? `<div class="eqline">accessory triggers averaged in: ${esc(ras)}</div>` : "";
  const t2 = `<div class="tier">
      <div class="row"><span class="hd">${hov("One attack, on average", "Avg_DMG_per_attack: calculated (not rolled); every hit, crit and trigger chance multiplied in; damage to the whole unit with all parts standing")}</span>${tag("calculated · all hit, crit and trigger chances included")}</div>
      <div class="big"><span class="n">${fmt(O.exp)}</span><span class="u">damage per attack · ${shotsText(O)}</span>${id === "B" && other ? d(O.exp, other.exp) : ""}</div>
      <div class="stack">${seg("s1", "Main round", mainE)}${seg("s2", "PV", pvE)}${seg("s3", "Gusty Strike", gE)}${seg("s4", "Terrain set off", bE)}${seg("s5", xpName(O), xE)}</div>
      <div class="eqline">${eqs.join(" · ")}</div>${wr}
      <div class="row"><span class="hd">${hov("An unlucky attack", `Worst_${sim.tail}%_avg: the average of the worst ${sim.tail}% of 4,000 simulated single attacks (follows the certainty slider)`)}</span><span class="v2">${fmt(sim.worst)}</span><span class="hd">${Math.round(sim.worstPct * 100)}% of average</span>${tag(`simulated · worst ${sim.tail}% of 4,000 attacks`)}</div></div>`;
  // tier 3: one hit
  const limbs = ["Left arm", "Right arm", "Legs"], same = limbs.every(p => Math.abs(R.shotBy[p] - R.shotBy["Left arm"]) < 0.05);
  const hitCell = (lbl, p) => `<div><div class="hd">${hov(lbl, `DMG_per_shot_${p === "Body" ? "body" : "limb"}: one shot that lands on the ${p.toLowerCase()}, no crit, weighted accessories not triggered`)}</div><div class="v2">${fmt(R.shotBy[p])}</div><div class="meta">crit ${fmt(R.shotBy[p] * (1 + R.critDmg))} · armor ${fmt(R.armorBy[p], 1)}</div></div>`;
  const t3 = `<div class="tier">
      <div class="row"><span class="hd">One hit</span>${tag("calculated · the shot lands, no crit")}</div>
      <div class="hits">${same ? hitCell("On a limb", "Left arm") : limbs.map(p => hitCell("On the " + p.toLowerCase(), p)).join("")}${hitCell("On the body", "Body")}
        <div><div class="hd">${hov("Hit chance", "FinalHit_chance")}</div><div class="v2">${pct(R.hit)}</div><div class="meta">game shows ${gameHitPct(R.hit)}%${R.TI.comp && R.shots > 1 ? ` · ${pct(R.expHits / R.shots, 0)} of shots land, with the miss-streak bonus` : ""}</div></div>
        <div><div class="hd">${hov("Crit chance", "FinalCrit_chance")}</div><div class="v2">${pct(R.crit)}</div><div class="meta">game shows ${Math.round(R.crit * 100)}%</div></div></div></div>`;
  const allBurn = PARTS.reduce((a, p) => a + R.burn[p], 0);
  el.innerHTML = `<div class="meta">${esc(bdSkill(R))} · ${esc(R.W.n)} · ${spread}</div>${t1}${t2}${t3}
    ${R.pv ? `<div class="tstats"><span>Peripheral Vision <b>${fmt(pvE)}</b> per attack</span>
      <span>${R.pv.shots} shots × ${perPart(R.pv.shotBy, R.pv.critDmg)} · ${esc(R.pv.R.W.n)} (other arm), SplashFactor ${R.pv.SF.toFixed(2)}</span></div>` : ""}
    ${R.gusty ? `<div class="tstats"><span>Gusty Strike <b>${fmt(gE)}</b> per attack</span>
      <span>${R.gusty.mode === "chance" ? pct(R.gusty.p, 0) + " chance" : R.gusty.mode === "on" ? "triggered" : "not triggered"} · ${R.gusty.shots} shots × ${perPart(R.gusty.R.shotBy, R.gusty.R.critDmg)} · ${esc(R.gusty.c.n)}, SkillM ${R.gusty.skillM.toFixed(2)}</span></div>` : ""}
    ${R.burnSet ? `<div class="tstats"><span>${esc(bdSkill(R))} sets off the terrain right after the attack: <b>${fmt(allBurn)}</b> on all parts</span></div>` : ""}
    ${R.s.extra.burnT ? `<div class="tstats"><span>+ Burning Terrain tick every enemy turn <b>${fmt(allBurn)}</b> on all parts (body ${fmt(R.burn.Body)})</span>
      <span>Attack + terrain per round <b>${fmt(O.exp + (T.mode === "focus" ? R.burn[T.part] : allBurn))}</b></span></div>` : ""}
    <div class="meta">srcAtk ${fmt(R.srcAtk, 1)} · Pilot_atr (${esc(shownAttr(R.attr))}) ${fmt(R.attribute)} vs eDef ${fmt(R.tg.def)} · body ${fmt(sim.hp)} HP${ras ? " · trigger chance: " + esc(ras) : ""}</div>`;
}
function renderSrc(id, R) {
  if (!R) { $(id + "-src").innerHTML = ""; return; }
  const a = shownAttr(R.attr), row = (l, v, n, scr, bat, cls) => `<tr class="${cls || ""}"><td>${l}${n ? `<div class="note">${n}</div>` : ""}</td><td class="num">${scr}</td><td class="num">${bat}</td><td class="num">${v}</td></tr>`;
  let h = `<table><tr><td class="lbl">${esc(a)} for ${esc(R.W.tn)}</td><td class="num lbl">Screen</td><td class="num lbl">Battle</td><td class="num lbl">Value</td></tr>
    ${row(`Lv70 base at potential ${R.s.star}`, fmt(R.star.base[R.attr], 1), "", "yes", "yes")}
    ${row("Bionic Computer neurons (all but capacity)", "+" + fmt(R.P.bionic[R.attr]), "", "yes", "yes")}
    ${row("Chips (attribute)", "+" + fmt(R.chipAttr), R.chipInferred ? "worked out from your screen value, assuming a full R&D tree" : R.chipKnown ? "from Chip Bonus" : "none entered", "yes", "yes")}
    ${row("R&D nodes (full tree)", `+${fmt(R.rdFlat)} · +${pct(R.rdPct, 0)}`, "", "yes", "yes")}
    ${row("Potential", "+" + pct(R.star.bonus, 0), "+2% per level", "yes", "yes")}
    ${row("Screen value", fmt(R.screen), R.entered ? (R.chipInferred ? "you entered it" : `you entered ${fmt(R.entered)}; calculated ${fmt(R.predicted)}`) : "calculated (no value entered)", "", "", "total")}
    ${row("Battle-only % (features, passives, skills)", "+" + pct(R.bPct, 1), "", "no", "yes")}
    ${R.bFlat ? row("Battle-only flat", "+" + fmt(R.bFlat), "", "no", "yes") : ""}
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
function contrib(R, f, asPct) {
  const show = v => asPct ? pct(v, 1) : fmt(v);
  const parts = [];
  if (R.rdBy && R.rdBy[f]) parts.push(`R&D ${show(R.rdBy[f])}`);
  const xk = {dmgB: "dmgB", finalB: "finalB", hitrate: "hitrate", crit_fin: "crit_fin"}[f];
  if (xk && R.s.extra[xk]) parts.push(`extra bonus ${show(R.s.extra[xk] / 100)}`);
  for (const row of R.rows) {
    const v = row.effs.filter(x => x.act && !x.dup && !x.dyn && x.e.f === f).reduce((a, x) => a + (x.val != null ? x.val : effVal(R.s, row.src, x.e)), 0);
    if (v) parts.push(`${row.src.label.replace(/^[^:]+: /, "")} ${show(v)}`);
  }
  for (const q of R.bossYou || []) if (q.f === f) parts.push(`target's ${q.n} ${show(q.v)}`);    // put on you by the boss you attack
  return parts;
}
/* new breakdown: one section per result, in the terms of the 'How damage works' page */
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
  const perPart = PARTS.map(p => fmt(R.st.parts[p].grades[R.s.grades[p]].fp, 2));
  const f2 = v => fmt(v, 2), p1 = v => pct(v, 1);
  return bdSec("Weapon attack", "srcAtk " + fmt(R.srcAtk, 2), [
      ["srcAtk = (ATK_wep + ATK_bonus + ATK_RD + ATK_FP) × (1 + ATK%) × Suit_coeff",
       `= (${fmt(atkWep)} + ${fmt(atkBonus)} + ${fmt(atkRD)} + ${fmt(R.fpEff, 1)}) × ${(1 + g("atk_pct")).toFixed(3)} × ${suit.toFixed(3)} = ${f2(R.srcAtk)}`],
      ["ATK_FP = (FP_parts + FP_bonus + FP_RD) × Wep_coeff × (1 + FP%_RD + FP%_bonus)",
       `= (${f2(R.partFp)} + ${fmt(fpBonus)} + ${fmt(fpRD)}) × ${coeff.toFixed(4)} × (1 + ${fpPctRD.toFixed(3)} + ${fpPctBonus.toFixed(3)}) = ${fmt(R.fpEff, 1)}`]],
    bdTerms([
      ["ATK_wep", fmt(atkWep), `${esc(R.W.n)}: base ${fmt(R.W.atk)} + improvement ${R.impr} (${R.rdEd && R.rdEd.impr === "save" ? "as loaded" : R.rdEd && R.rdEd.impr ? "your value" : "max"}) + advanced ATK ${R.advAtk}`],
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
     "srcAtk is the weapon's final attack value in battle."]);
}

/* armor and one shot's damage on a given part (same rules as outcomes()) */
function bdArmor(R, part) {
  const raw = R.tg.armor_base ? R.tg.armor_base[part] : R.tg.armor[part] / (1 + R.amul), cuts = R.armorPct.all + R.armorPct[part];
  return {raw, cuts, armor: Math.max(0, raw * (1 + R.amul + cuts - (R.s.extra.shred || 0) / 100))};
}
const bdShot = (R, part) => Math.max(1, Math.max(0, R.perBefore - bdArmor(R, part).armor / 10) * R.Kp(part, H_START()));
/* the target's damage-taken terms that count on a shot at this part (at the target HP slider), as "name +x%" */
const tTerms = (R, f, part) => R.tterm.filter(q => q.f === f && (q.part == null || q.part === part) && q.c.every(c => partCond(c, part, H_START()) === true))
  .map(q => `${q.boss ? "target: " : ""}${q.n}${q.part ? " (" + q.part.toLowerCase() + ")" : ""} ${pct(q.v, 1)}`);
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
    if (x.act && !x.dup && x.e.f === "armor_pct" && (!x.e.part || x.e.part === T.part))
      cutSrc.push(`${row.src.label.replace(/^[^:]+: /, "")} ${pct(-effVal(R.s, row.src, x.e), 1)}`);
  if (R.s.extra.shred) cutSrc.push(`extra bonus ${R.s.extra.shred}%`);
  const shred = -A.cuts + (R.s.extra.shred || 0) / 100;
  return bdSec(`Target armor · ${T.mode === "focus" ? esc(T.part.toLowerCase()) : "a limb (shots scatter; body " + fmt(R.armorBy.Body, 1) + ")"}`, "eArmor " + fmt(A.armor, 1), [
      ["eArmor = eArmor_base × (1 + eArmorBuff% − ArmorShred%)",
       `= ${fmt(A.raw, 1)} × (1 + ${R.amul.toFixed(3)} − ${shred.toFixed(3)}) = ${fmt(A.armor, 1)}  ·  eArmor ÷ 10 = ${fmt(A.armor / 10, 1)}`]],
    bdTerms([
      ["eArmor_base", fmt(A.raw, 1), `${esc(R.tg.boss)} ${T.mode === "focus" ? esc(T.part.toLowerCase()) : "limb"} at its level and grade, before buffs (vision *_armor_base; shown with buffs ${fmt(R.tg.armor[T.part], 1)})`],
      ["eArmorBuff%", pct(R.amul, 1), "target's own buffs (already in its shown armor)"],
      ["ArmorShred%", pct(shred, 1), esc(cutSrc.join(" + ") || "none")],
      ["eArmor", fmt(A.armor, 1), "the part's armor in battle", "sum"]]),
    [`All armor % add into one sum, each counted once; it stops at 0. Each part has its own armor: body ${fmt(bdArmor(R, "Body").armor, 1)}, limbs ${fmt(bdArmor(R, "Left arm").armor, 1)}.`]);
}
const bdSkill = R => R.sk.n === "Normal Attack (Normal Attack)" ? "Normal Attack" : R.sk.n;
function bdDamage(R) {
  const g = R.g, parts = ["Body", "Left arm", "Right arm", "Legs"];
  const per = {}; for (const p of parts) per[p] = bdShot(R, p);
  const limb = (per["Left arm"] + per["Right arm"] + per["Legs"]) / 3, avg = parts.reduce((a, p) => a + per[p], 0) / 4;
  const cm = 1 + R.critDmg, A = bdArmor(R, T.part), H0 = H_START(), dbp = R.dB(T.part, H0), npc = R.npcF(T.part, H0);
  const skillSrc = [`${esc(bdSkill(R))} ${R.sk.m.toFixed(2)}`].concat(contrib(R, "skillM").map(esc)).join(" + ");
  const shotLine = R.shots !== R.baseShots ? `; fires Nshots = ${R.shots}` + ((R.rounds || 1) > 1 ? ` (${R.rounds} rounds of ${R.shots / R.rounds})` : ` (base ${R.baseShots} + shot adds)`) : "";
  return bdSec("Damage per shot", (T.mode === "focus" ? "DMG_per_shot " : "DMG_per_shot_limb ") + fmt(R.shot, 1), [
      [`DMG_per_shot = (srcAtk × AtrDef_coeff ÷ Nshots_base − eArmor ÷ 10) × SkillM × (1 + DMG%)${npc !== 1 ? " × (1 + eDMGFactor%)" : ""} × (1 + FinalDMG%) × (1 + CritDMG%) [crit only]`,
       `= (${fmt(R.srcAtk, 2)} × ${R.pmult.toFixed(4)} ÷ ${R.baseShots} − ${fmt(A.armor / 10, 1)}) × ${R.skillM.toFixed(2)} × ${Math.max(0, 1 + dbp).toFixed(3)}${npc !== 1 ? " × " + npc.toFixed(3) : ""} × ${(1 + g("finalB")).toFixed(3)} = ${fmt(R.shot, 1)}  ·  crit × ${cm.toFixed(2)} = ${fmt(R.shotCrit, 1)}`]],
    bdTerms([
      ["Nshots_base", R.baseShots, `${esc(bdSkill(R))}: the skill's base shot count, the divisor${shotLine}`],
      ["SkillM", R.skillM.toFixed(2), skillSrc],
      ["DMG%", pct(dbp, 1), esc([...contrib(R, "dmgB", true), ...tTerms(R, "dmgB", T.part)].join(" + ") || "none") +
        (T.mode === "focus" ? "" : " (on a limb; per part below)")],
      ...(npc !== 1 ? [["eDMGFactor%", pct(npc - 1, 1), esc(tTerms(R, "npcB", T.part).join(" + ")) + ": the target's own damage factor, a separate (1 + x) (DefenderNpcDamgeMulti)"]] : []),
      ["FinalDMG%", pct(g("finalB"), 1), esc(contrib(R, "finalB", true).join(" + ") || "none")],
      ["CritDMG%", pct(R.critDmg, 1), `weapon ${pct(R.W.crit_dmg, 0)}` + (g("crit_dmg") ? " + " + esc(contrib(R, "crit_dmg", true).join(" + ")) : "") +
        (R.critT ? ` + target crit DMG taken ${pct(R.critT, 0)}` : "")]]) +
    `<div class="sub">By part (no crit · crit)</div>` +
    bdTerms([
      ["DMG_per_shot_body", fmt(per.Body, 1), `crit ${fmt(per.Body * cm, 1)} · armor ${fmt(bdArmor(R, "Body").armor, 1)}`],
      ["DMG_per_shot_limb", fmt(limb, 1), `crit ${fmt(limb * cm, 1)} · armor ${fmt(bdArmor(R, "Left arm").armor, 1)}`],
      ["DMG_per_shot_anyPart", fmt(R.hitAvg, 1), `crit ${fmt(R.hitAvg * cm, 1)} · ${T.mode === "focus" ? "focus: " + esc(T.part.toLowerCase()) + " only" : "this attack's part weights: " + PARTS.map(p => `${p.toLowerCase()} ${pct(R.wts[p], 0)}`).join(", ")} (all parts standing)`, "sum"]]),
    ["Every bracket stops at 0: the armor, SkillM and each (1 + …%) can't go below zero; a shot that lands deals at least 1.",
     "DMG% adds your damage % and the target's damage taken; a damage taken on one part (Downwind, Broken Arm, the boss's body −75%) counts only on a shot at that part, and one that depends on that part's HP is checked shot by shot in Attacks to kill.",
     "The attack is divided by Nshots_base even when buffs add shots, so each extra shot is one more full share.",
     `The attack preview uses the body and rounds down: ${fmt(Math.floor(per.Body + 1e-9))}.`]);
}
function bdCrit(R) {
  const g = R.g, add = [], mul = [];
  for (const row of R.rows) {
    const val = f => row.effs.filter(x => x.act && !x.dup && x.e.f === f).reduce((a, x) => a + effVal(R.s, row.src, x.e), 0);
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
       `= ${pct(total, 2)}${fin ? ` + ${pct(fin, 1)}` : ""} ${R.critTerm < 0 ? "−" : "+"} ${pct(Math.abs(R.critTerm), 2)} − ${pct(rres, 1)}${R.critAdj ? ` + ${pct(R.critAdj, 1)} extra` : ""} = ${pct(R.crit, 2)} → game shows ${Math.round(R.crit * 100)}%`]],
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
      ["eCritRateRes", pct(rres, 1), rres ? "target crit-rate resist and your debuffs on it" : "none"]]),
    ["CritPts_term runs from −30% to +30% crit chance and is 0 when CritPts_total equals eCritPtsRes.",
     "Crit chance is capped at 0% and 100%; each shot rolls it."]);
}
function bdHit(R) {
  const g = R.g, arms = R.arms.map(x => x.toLowerCase()).join(" + "), nA = R.arms.length, suit = R.suit.hit, cat = g("hit_cat_pct");
  const wb = g("whit_add"), ab = g("ahit_add") * nA, ch = R.chipHit * nA, q = R.H / R.Dg, term = 0.5 * atanN(R.hitX / R.hitK);
  const rdShort = x => x.replace(/^R&D .*/, R.rdEd && Object.keys(R.rdEd).length ? "R&D (see R&D panel)" : "R&D, full tree");
  const notes = ["Suit% = Suit_coeff − 1; for hit it is added inside the % sum, not multiplied.",
    "HitPts_term runs from −0.5 to +0.5, so hit chance runs from 0.4 to 1.4 × HitRate_wep before the adds; capped at 100%."];
  if (nA > 1) notes.push("Two-handed weapon: both arms count (halved if the other arm is destroyed).");
  if (R.TI.comp) notes.push(`${esc(R.W.tn)}: each miss in a row adds 5% to HitRate_wep for the next shot (reset by a hit): after 1 miss ${pct(R.hitAfter(1), 1)}, after 2 ${pct(R.hitAfter(2), 1)}; expected hits ${R.expHits.toFixed(2)} of ${R.shots}.`);
  return bdSec("Hit chance", "FinalHit_chance " + pct(R.hit, 1), [
      [`HitPts_wep = (HitPts_wep_base + HitPts_wep_bonus) × (1 + HitPts%_wep${cat ? " + HitPts%_cat" : ""} + Suit%)`,
       `= (${fmt(R.W.hit)} + ${fmt(wb)}) × (1 + ${g("whit_pct").toFixed(3)}${cat ? ` + ${cat.toFixed(3)}` : ""} + ${suit.toFixed(3)}) = ${fmt(R.wHit)}`],
      [`HitPts_arm = (HitPts_arm_base + HitPts_arm_bonus + HitPts_chips) × (1 + HitPts%_arm${cat ? " + HitPts%_cat" : ""} + Suit%)`,
       `= (${fmt(R.armHit)} + ${fmt(ab)} + ${fmt(ch)}) × (1 + ${g("ahit_pct").toFixed(3)}${cat ? ` + ${cat.toFixed(3)}` : ""} + ${suit.toFixed(3)}) = ${fmt(R.aHit)}`],
      ["HitPts_term = 0.5 × atan((HitPts_total/eDodgePts − eDodgePts/HitPts_total) ÷ Hit_k) ÷ (π/2)",
       Number.isFinite(q) && q > 0 ? `= 0.5 × atan((${q.toFixed(4)} − ${(1 / q).toFixed(4)}) ÷ ${R.hitK}) ÷ 1.5708 = ${term.toFixed(4)}`
         : `= ${term.toFixed(4)}: the target has no dodge (eDodgePts 0, e.g. ${esc(R.tg.mech)} legs carry no dodge value), so the term is at its maximum`],
      ["FinalHit_chance = HitRate_wep × (0.9 + HitPts_term) + HitRate_bonus − eHitRateRes",
       `= ${R.W.rate} × (0.9 + ${term.toFixed(4)}) + ${pct(g("hitrate"), 1)} − ${pct(R.hitRes, 1)} = ${pct(R.hit, 2)} → game shows ${gameHitPct(R.hit)}%`],
      ...(R.TI.comp && R.shots > 1 ? [
      ["FinalHit_chance after m misses in a row = (HitRate_wep + 0.05 × m) × (0.9 + HitPts_term) + HitRate_bonus − eHitRateRes",
       `${esc(R.W.tn)} (HitRateCompensation, CalcSrcHitRateCompensation 0.05): after 1 miss = (${R.W.rate} + 0.05) × ${(0.9 + term).toFixed(4)} … = ${pct(R.hitAfter(1), 1)} · after 2 = ${pct(R.hitAfter(2), 1)} · reset by a hit`],
      ["Shots_land = expected hits over the attack ÷ Nshots",
       `= ${R.expHits.toFixed(2)} ÷ ${R.shots} = ${pct(R.expHits / R.shots, 1)} (the “land” share the attack's average uses; the game's preview shows FinalHit_chance without the bonus)`]] : [])],
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
      ["eDodgePts", fmt(R.Dg), `${esc(R.tg.boss)} leg dodge`],
      ["Hit_k", R.hitK, R.hitK === 4 ? `4: HitPts_total is below eDodgePts but above the ${esc(R.W.tn)} threshold ${fmt(R.TI.thr)}` : "0.5 (normal)"],
      ["HitRate_wep", R.W.rate, `${esc(R.W.n)} hit rate`],
      ["HitRate_bonus", pct(g("hitrate"), 1), esc(contrib(R, "hitrate", true).join(" + ") || "none")],
      ["eHitRateRes", pct(R.hitRes, 1), R.hitRes ? "target hit reduction (your dodge debuffs lower it)" : "none"]]),
    notes);
}
/* ------------------------------------------------------------------ Weapons & R&D panel
   R&D defaults to the full tree. Overrides are global (both setups, like the game's account-wide R&D) and saved in the
   same storage as the loadouts: the db record "rd" when signed in, browser storage otherwise.
   Keys: "<group>|<field>|<attribute>|<ss>" for R&D node totals (group = pilot class, "type:<Weapon>" or "<Class> ST"),
   "crit|<Weapon>" for R&D crit points, "impr|<Weapon>" for the improvement refit. */
let RD_SIDE = "A";
let RDO = {};   // global R&D overrides
function showView(v) {
  $("view-bench").hidden = v !== "bench"; $("view-bench-notes").hidden = v !== "bench"; $("view-rd").hidden = v !== "rd";
  $("tab-bench").setAttribute("aria-selected", v === "bench"); $("tab-rd").setAttribute("aria-selected", v === "rd");
  try { localStorage.setItem("bench-view", v); } catch (e) {}
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
const WTYPES = () => { const m = {};
  for (const W of Object.values(D.weapons)) { const t = m[W.type] ||= {tn: W.tn, fvm: W.fvm, shots: W.shots, impr: 0};
    t.impr = Math.max(t.impr, W.impr || 0); }
  return Object.entries(m).sort((a, b) => a[1].tn.localeCompare(b[1].tn)); };
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
    return `<tr class="${used.has(T) ? "use" : ""}"><td>${esc(x.tn)}</td><td class="num">${(1 + x.fvm).toFixed(4)}</td><td class="num">${(D.normal[T] || {h: x.shots}).h || x.shots}</td>
      <td class="num">${((D.normal[T] || {}).m || 1).toFixed(2)}</td>
      <td>${rdCell(s, k("atk_add"), d[k("atk_add")] || 0, false, "ATK_RD")}</td>
      <td>${rdCell(s, k("whit_add"), d[k("whit_add")] || 0, false, "HitPts_wep_RD (the R&D part of HitPts_wep_bonus)")}</td>
      <td>${rdCell(s, "crit|" + T, (D.rdcrit || {})[String(D.wtBits[T] || 0)] || 0, false, "CritPts_RD")}</td>
      <td>${rdCell(s, "impr|" + T, x.impr, false, "improvement refit")}</td></tr>`; }).join("");
  const stRows = ["Light", "Medium", "Heavy"].map(c => { const g = c + " ST", d = rdDefaults(g), k = (f, ss) => `${g}|${f}||${ss}`;
    return `<tr class="${usedSt.has(c) ? "use" : ""}"><td>${c} ST</td>
      <td>${rdCell(s, k("fp_add", 0), d[k("fp_add", 0)] || 0, false, "FP_RD")}</td>
      <td>${rdCell(s, k("fp_add", 1), d[k("fp_add", 1)] || 0, false, "FP_RD with SS parts (scaled by the share of SS parts)")}</td>
      <td>${rdCell(s, k("fp_pct", 0), d[k("fp_pct", 0)] || 0, true, "FP%_RD")}</td>
      <td>${rdCell(s, k("ahit_add", 0), d[k("ahit_add", 0)] || 0, false, "HitPts_arm_RD (the R&D part of HitPts_arm_bonus)")}</td>
      <td>${rdCell(s, k("ahit_pct", 0), d[k("ahit_pct", 0)] || 0, true, "HitPts%_arm_RD (the R&D part of HitPts%_arm)")}</td></tr>`; }).join("");
  const classes = [...new Set(Object.values(D.pilots).map(p => p.class).filter(Boolean))].sort();
  const pcRows = classes.map(c => { const d = rdDefaults(c);
    return `<tr class="${usedPc.has(c) ? "use" : ""}"><td>${esc(c)}</td>${ATTRS.map(a => `<td>${rdCell(s, `${c}|attr_add|${a}|0`, d[`${c}|attr_add|${a}|0`] || 0, false, shownAttr(a) + " +")}
      ${rdCell(s, `${c}|attr_pct|${a}|0`, d[`${c}|attr_pct|${a}|0`] || 0, true, shownAttr(a) + " %")}</td>`).join("")}</tr>`; }).join("");
  box.innerHTML = `<div class="rdtop"><span class="meta">${nEd ? `${nEd} value${nEd > 1 ? "s" : ""} changed from the full tree` : "all at full tree"} · applies to both setups · saved automatically ${STORE ? "to your account" : "in this browser"}</span>
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
      ["FinalDMG%", "—", "not applied to the follow-up round (Perfect Position +15% counts only on the main round)"],
      ["FinalHit_chance", pct(R2.hit, 1), "the opposite arm's weapon and arm hit"],
      ["FinalCrit_chance", pct(P.crit, 1), "the opposite arm's weapon crit"]]),
    ["Fires after every active Flamethrower attack (not Code skills), at one random target: counted as hitting this target again unless you tick “goes to a different target” in the Situation panel.",
     "Checked against observed battle damage: exact per shot."]);
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
    ["Fires before the target's retaliation, from the same arm. Triggers on attacks in Martial's skill groups 1 / 2 / 256 (Normal Attack / ActiveAttack / Gusty Strike (extra attack)): Normal Attacks and ActiveAttack (weapon skill) attacks, not Code skills.",
     "Checked against observed battles: SkillM 0.4 against 1.0 / 1.1 / 1.3 main attacks, exact. Armor cuts that last only the main combat (Marksmanship at ideal range) were missing from it; if you ticked one, this round is slightly high."]);
}
function bdXp(R) {
  const L = ((R.w && R.w.comps) || []).map(c => ({c, C: D.components[c.id]})).filter(x => x.C && x.C.xp);      // the attacking weapon's accessories only
  if (!L || !L.length) return "";
  const ok = x => !x.wm || x.wm & (D.wtBits[R.W.type] || 0);
  const fb = R.g("fixB");
  const rows = L.flatMap(({c, C}) => C.xp.map(x => [C.n + " " + C.q, x.t === "ec" ? `${pct(x.v, 0)} × srcAtk${fb ? ` × (1 + ${pct(fb, 0)} FixDMG%)` : ""} = ${fmt(x.v * R.srcAtk * (1 + fb), 1)}` : `${pct(x.v, 0)} × that hit's damage`,
    ok(x) ? `per landed shot of the main round, to 1 random other standing part (never the part hit) · ${c.mode === "chance" ? "weighted by its trigger chance" : c.mode === "on" ? "set to triggered" : "set to not triggered"}`
          : `does not apply to ${esc(R.W.tn)} (works with Knuckles, Polearm, Pile Bunker, Small Shield, Light Rifle, Sniper Rifle, Large Shield, Rail Gun, Alter-Blade)`]));
  return bdSec("Accessory extra hits", R.xpE ? "+" + fmt(R.xpE) + " per attack when triggered" : "", [
      ["Explosive_Charge_hit = EC% × srcAtk × (1 + FixDMG%) · Splash_hit = Splash% × the landed shot's damage (crit included)",
       "flat: no armor, damage bonuses or crit of their own (e.g. Explosive Charge II = 0.24 × srcAtk; Splash II = 0.16 × the landed hit)"]],
    bdTerms(rows),
    ["They land on another part, so they count toward breaking that part and toward the kill when it is the body.",
     "The target's Percentage DMG resistance (eFixRatioRes%, e.g. the training dummy's −66%) does not apply: both hits are built as FixDamageType RawValue, and the resistance (BattleActorCompBodyPartBase.CalcFixDamage, property 491) only multiplies MaxHpRatio and CurrHpRatio damage (PureMaxHpRatio is not reduced; OtherWapPartMaxHpRatio passes through).",
     "FixDMG% = AttackerFixDamageRatioMulti (e.g. Ascendancy Core): it scales Explosive Charge only.",
     "Main round only: the RA's buff is removed after that single attack (DetachPeriod AfterSingleSkill4Attacker), so Gusty Strike doesn't get it."]);
}
function bdBurn(R) {
  if (!R.s.extra.burnT) return "";
  const res = R.tg.fixres || 0, all = PARTS.reduce((a, p) => a + R.burn[p], 0), bp = T.mode === "focus" ? T.part : "Body";
  return bdSec("Burning Terrain tick", "on all parts " + fmt(all), [
      [`Burn_tick = part max HP × Burn% × (1 + eFixRatioRes%${R.s.extra.burnOwn ? " + FixDMG%" : ""}), rounded, at least 1`, `= ${fmt(R.tg.hp[bp])} × ${pct(R.burnPct, 0)} × (1 ${res < 0 ? "−" : "+"} ${Math.abs(res).toFixed(2)}${R.s.extra.burnOwn ? ` + ${R.g("fixB").toFixed(2)}` : ""}) = ${fmt(R.burn[bp])} on the ${esc(bp.toLowerCase())}`]],
    bdTerms([
      ["Burn%", pct(R.burnPct, 0), "Burning Terrain: Percentage DMG, a share of each part's max HP, on every enemy turn it stays on the tile (game data)"],
      ...(R.s.extra.burnOwn ? [["FixDMG%", pct(R.g("fixB"), 0), "your Fixed DMG % (AttackerFixDamageRatioMulti): the tick takes its caster's, and you ticked that the terrain is yours"]] : []),
      ["eFixRatioRes%", pct(res, 0), res ? `${esc(R.tg.boss)}: Percentage DMG taken ${pct(res, 0)} (Immunity: Superconducting Core / Four Blocks / Ace${res < -1 ? "; two of them add up, and the tick stops at 1" : ""})` : "none"],
      ...PARTS.map(p => [`Burn_tick ${p.toLowerCase()}`, fmt(R.burn[p]), `max HP ${fmt(R.tg.hp[p])}`]),
      ["Burn_tick (all parts)", fmt(all), "", "sum"]]),
    [...(R.burnNow ? [`${esc(bdSkill(R))} also sets the terrain off right after the attack: one extra tick, included in Avg DMG per attack.`] : []),
     "Doesn't depend on your attack, DMG % or crit; the same terrain on one tile doesn't stack. A FixDMG% bonus (Fixed DMG +X%, AttackerFixDamageRatioMulti, e.g. Fixed Scope) on the unit the game counts as the terrain's caster can raise it; not modelled.",
     "In Attacks to kill it hits every standing part once after each attack (one attack per enemy turn). Lasts 2 turns unless something extends it."]);
}
function renderBd(id, R) {
  if (!R) { $(id + "-bd").innerHTML = ""; return; }
  $(id + "-bd").innerHTML = bdAttack(R) + bdPilot(R) + bdArmorSec(R) + bdDamage(R) + bdPV(R) + bdGusty(R) + bdXp(R) + bdCrit(R) + bdHit(R) + bdBurn(R);
}

/* the target's own effects on the damage it takes: a switch each, a stack count when it stacks (default: the fight-start state) */
function tfxHtml(tg) {
  const L = bossFx(tg); if (!L.length) return "";
  const word = e => e.side === "you" ? `Your ${FIELD[e.f] || e.f}` : e.f === "npcB" ? "Damage factor" : e.f === "critT" ? "Crit DMG taken" : (e.part ? e.part + " DMG taken" : "DMG taken");
  const cw = c => { if (c.text && c.t !== "bphp") return c.text; const p = (c.part === "arm" ? "left or right arm" : (c.part || "").toLowerCase());
    const pl = p === "legs";
    return c.v === 0 && c.op === "<=" ? `once its ${p} ${pl ? "are" : "is"} destroyed` : c.v === 0 && c.op === ">" ? `while its ${p} ${pl ? "stand" : "stands"}` : `while its ${p} HP ${c.op.replace(">=", "≥").replace("<=", "≤")} ${c.v}%`; };
  const by = {}; for (const e of L) (by[e.b] ||= []).push(e);
  const rows = Object.values(by).map(es => { const e = es[0], stk = e.f && (e.max || 1) > 1 && e.lpm;
    const what = es.filter(x => x.f).map(x => `${word(x)} ${sgn(x.val, "dmgB")}${(x.c || []).length ? " " + x.c.map(cw).join(" and ") : ""}`).join(" · ");
    return `<label class="src">${e.f ? `<input type="checkbox" data-tfx="${e.b}" ${e.use ? "checked" : ""}>` : `<span></span>`}<span><span class="nm">${esc(e.n)}</span>
      ${stk ? `<label class="stk">stacks <input type="number" min="1" max="${Math.min(e.max, 99)}" value="${e.lvl}" data-tlvl="${e.b}"></label>` : ""}
      <div class="fx">${esc(what || "not modelled yet: " + (e.note || ""))}</div>${e.d ? `<span class="desc">${esc(e.d)}</span>` : ""}
      ${e.f && e.note ? `<span class="cd">${esc(e.note)}</span>` : ""}</span></label>`; });
  return `<div class="lbl" style="margin-top:6px">Effects on the damage it takes</div>
    <div class="meta">Set as at the start of the fight; untick or change the stacks for later in the fight. Part conditions are checked shot by shot in Attacks to kill.</div>
    <div class="tfx">${rows.join("")}</div>`;
}
let updPending = false;
const updateSoon = () => { if (updPending) return; updPending = true; setTimeout(() => { updPending = false; update(); }, 16); };
function update() {
  const tg = D.targets[T.target];
  $("t-hpv").textContent = T.hp + "%";
  $("t-stats").innerHTML = [["Model", tg.mech + (tg.cls ? " · " + tg.cls : "")], ["Defense", fmt(tg.def)], ["Armor body / limb", fmt(tg.armor.Body) + " / " + fmt(tg.armor["Left arm"])], ["Dodge", fmt(tg.dodge)], ["Crit resist", fmt(tg.crit_res)], ["HP body / limb", fmt(tg.hp.Body) + " / " + fmt(tg.hp["Left arm"])]]
    .map(([k, v]) => `<span>${k} <b>${esc(v)}</b></span>`).join("");
  const bfx = (list, head) => list && list.length ? `<div class="lbl" style="margin-top:6px">${head}</div><div class="tfx">${list.map(b => `<div style="padding:4px 0;border-bottom:1px dotted var(--line)">
      <b>${esc(b.n)}</b>${(tg.sfx || []).some(x => x.id === b.id) ? ` <span class="meta">(from the stage)</span>` : ""}
      ${b.d ? `<span class="desc">${esc(b.d)}</span>` : ""}${b.fx.length ? `<span class="desc">Applies to the target: ${esc(b.fx.join(" · "))}</span>` : ""}</div>`).join("")}</div>` : "";
  $("t-fx").innerHTML = tfxHtml(tg) + `<div class="meta">Buffs on the target. Their stats (HP, armor, Defense, dodge, crit and hit resist) are already in the numbers above.</div>
    ${bfx(tg.bfx, "Target's buffs") || `<div class="meta">${esc(tg.buffs || "No buffs")}</div>`}
    <div class="meta">Debuffs the enemy or stage puts on your units are off by default; add them under each setup's Extra bonuses (negative values).</div>`;
  $("t-shield").hidden = !tg.shield;
  if (tg.shield) $("t-shield").innerHTML = `<b>This boss carries a shield</b> (${esc(tg.shield)}${tg.shield_hp ? `, shield HP ${fmt(tg.shield_hp)}` : ""}). Shield blocking isn't modelled yet: hits the shield takes and its HP aren't counted, so attacks to kill and break may come out lower than in the fight.`;
  const nOn = bossFx(tg).filter(e => e.use).length;
  $("t-fxsum").textContent = nOn ? `${nOn} damage-taken effect${nOn > 1 ? "s" : ""} on` : tg.buffs ? "boss buffs in its stats" : "";
  // the input panels follow every change (one compute per setup); the results wait for Calculate
  for (const id of ["A", "B"]) { showLoaded(id); const R = S[id] && compute(S[id]); renderSit(id, R); renderFx(id, R); }
  setStale(true);
}
/* results: the panels Calculate fills, dimmed while a change hasn't been calculated yet */
const RESULT_IDS = () => ["compare", "A-out", "B-out", "A-src", "B-src", "A-bd", "B-bd"];
let STALE = true, CALCULATED = false, CALC_BUSY = false;
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
  const O = {};
  for (const id of ["A", "B"]) O[id] = outcomes(S[id]);
  const nF = Math.min(...["A", "B"].filter(id => O[id]).map(id => fightCount(O[id])));      // same number of fights for both
  for (const id of ["A", "B"]) if (O[id]) O[id].sim = simulate(O[id], T.conf, nF);
  // both histograms on one scale, so the two setups line up across the page
  // (when the two are too far apart to share one, each gets its own and says so)
  const rangeOf = id => { if (!O[id] || !O[id].sim.fights) return null; const ks = Object.keys(O[id].sim.hist).map(Number).filter(k => k <= 1000);
    return ks.length ? {lo: Math.min(...ks), hi: Math.max(...ks), max: Math.max(...Object.entries(O[id].sim.hist).filter(([k]) => +k <= 1000).map(([, n]) => n / O[id].sim.fights))} : null; };
  const ra = rangeOf("A"), rb = rangeOf("B"), scales = {A: ra, B: rb};
  if (ra && rb) { const lo = Math.min(ra.lo, rb.lo), hi = Math.max(ra.hi, rb.hi), own = Math.max(ra.hi - ra.lo, rb.hi - rb.lo);
    if (hi - lo <= 2 * own + 4) scales.A = scales.B = {lo, hi, max: Math.max(ra.max, rb.max), shared: true};
    else { scales.A = {...ra, solo: true}; scales.B = {...rb, solo: true}; } }
  for (const id of ["A", "B"]) { const R = O[id] && O[id].base; renderOut(id, O[id], id === "B" ? O.A : null, scales[id]); renderSrc(id, R); renderBd(id, R); }
  for (const id of ["A", "B"]) LAST[id] = {out: $(id + "-out").innerHTML, src: $(id + "-src").innerHTML, bd: $(id + "-bd").innerHTML};
  CALCULATED = true;
  if (O.A && O.B) {
    const dd = (b, a, lbl, isPts) => { const x = isPts ? (b - a) * 100 : (a ? b / a - 1 : 0) * 100;
      return `<span>${lbl} <span class="delta ${x > 0.05 ? "up" : x < -0.05 ? "down" : ""}">${x >= 0 ? "+" : ""}${x.toFixed(1)}${isPts ? " pts" : "%"}</span></span>`; };
    $("compare").innerHTML = `<div class="tstats" style="color:var(--ink)"><b style="font:700 16px var(--f-display);letter-spacing:.04em">B VS A</b>` + (O.A.sim.need && O.B.sim.need ? `<span>Attacks to kill <span class="delta ${O.B.sim.need < O.A.sim.need ? "up" : O.B.sim.need > O.A.sim.need ? "down" : ""}">${O.B.sim.need - O.A.sim.need >= 0 ? "+" : ""}${O.B.sim.need - O.A.sim.need}</span> <span class="meta">(${O.B.sim.need} vs ${O.A.sim.need}, ${T.conf}% sure)</span></span>` : "")
      + dd(O.B.exp, O.A.exp, "Avg DMG per attack") + dd(O.B.sim.worstPct, O.A.sim.worstPct, "Unlucky attack", true) + dd(O.B.base.hit, O.A.base.hit, "FinalHit_chance", true) + dd(O.B.base.crit, O.A.base.crit, "FinalCrit_chance", true) + (() => { const a = O.A.base, b = O.B.base, why = [];
        if (a.baseShots !== b.baseShots) why.push("Nshots_base"); if (bdSkill(a) !== bdSkill(b)) why.push("skill");
        if (Math.abs(a.suit.atk - b.suit.atk) > 1e-9) why.push("Suit_coeff");
        const x = (a.srcAtk ? b.srcAtk / a.srcAtk - 1 : 0) * 100;
        return why.length ? `<span>srcAtk <span class="delta" title="Not a like-for-like comparison">${x >= 0 ? "+" : ""}${x.toFixed(1)}%</span> <span class="meta">(different ${why.join(", ")})</span></span>`
          : dd(b.srcAtk, a.srcAtk, "srcAtk"); })()
      + `</div><div class="meta">B compared with A: green = B is better (attacks to kill: fewer is better). % = relative difference; pts = percentage points (B − A); unlucky attack = the worst ${100 - T.conf}% of attacks as a share of the average.</div>`;
  } else $("compare").innerHTML = `<div class="meta">Equip a weapon on both setups to compare.</div>`;
}

/* ------------------------------------------------------------------ save / load (your private store; falls back to this browser) */
let STORE = null, UID = null, SAVES = [];
const LS = "bench-loadouts";
async function initStore() {
  try {
    const user = await claude.use("user"), db = await claude.use("db");
    UID = user ? await user.id() : null;
    if (db && UID) STORE = db.collection("data/users/" + UID);
  } catch (e) { STORE = null; }
  await refreshSaves();
  await loadRD();
}
let rdTimer = null;
const saveRDSoon = () => { clearTimeout(rdTimer); rdTimer = setTimeout(saveRD, 600); };
async function saveRD() {
  const rec = {v: JSON.stringify(RDO), saved: new Date().toISOString().slice(0, 16).replace("T", " ")};
  try { if (STORE) await STORE.doc("rd").set(rec); else localStorage.setItem("bench-rd", rec.v); } catch (e) {}
}
async function loadRD() {
  try {
    if (STORE) { const d = await STORE.doc("rd").get(); RDO = d && d.exists ? JSON.parse(d.data().v || "{}") : {}; }
    else RDO = JSON.parse(localStorage.getItem("bench-rd") || "{}");
  } catch (e) { RDO = {}; }
  renderSide("A"); renderSide("B"); renderRD(); update(); calculateSoon();
}
async function refreshSaves() {
  if (STORE) {
    try { const snap = await STORE.get(); SAVES = snap.docs.filter(d => d.id.startsWith("lo_")).map(d => ({id: d.id, ...d.data()})); }
    catch (e) { SAVES = []; }
  } else {
    try { SAVES = JSON.parse(localStorage.getItem(LS) || "[]"); } catch (e) { SAVES = []; }
  }
  SAVES.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  ["A", "B"].forEach(fillSaves);
}
/* "Loaded: …" above the setup; marked "edited since" once anything differs from what was loaded */
const snap = s => JSON.stringify({...s, loaded: undefined, name: undefined});
function markLoaded(s, info) { s.loaded = {...info, snap: snap(s)}; }
function showLoaded(id) {
  const s = S[id], el = $(id + "-loaded"); if (!el) return;
  el.hidden = !s.loaded; if (!s.loaded) return;
  const edited = snap(s) !== s.loaded.snap;
  el.innerHTML = `<span class="lbl">${s.loaded.kind === "battle" ? "Loaded unit" : "Loaded save"}</span> <b>${esc(s.loaded.label)}</b>${edited ? ' <span class="pill">edited since</span>' : ""}`;
}
function fillSaves(id) {
  const el = $(id + "-svlist"); if (!el) return;
  el.innerHTML = SAVES.length ? SAVES.map(x => opt(x.id, `${x.name} · ${x.saved || ""}`)).join("") : opt("", "No saved loadouts yet");
}
async function saveLoadout(id) {
  const s = S[id], name = ($(id + "-svname").value || "").trim() || (D.pilots[s.pilot].name + " loadout");
  s.name = name;
  const existing = SAVES.find(x => x.name === name);
  const rec = {name, saved: new Date().toISOString().slice(0, 16).replace("T", " "), state: JSON.stringify(s)};
  const docId = existing ? existing.id : "lo_" + Date.now().toString(36);
  try {
    if (STORE) await STORE.doc(docId).set(rec);
    else { const all = SAVES.filter(x => x.id !== docId); all.push({id: docId, ...rec}); localStorage.setItem(LS, JSON.stringify(all)); }
    $(id + "-svmsg").textContent = `Saved "${name}"` + (STORE ? "" : " in this browser only");
  } catch (e) { $(id + "-svmsg").textContent = "Could not save: " + (e && e.code || e); }
  await refreshSaves();
}
function loadLoadout(id) {
  const x = SAVES.find(v => v.id === $(id + "-svlist").value);
  if (!x) return;
  try { const st = JSON.parse(x.state); if (!D.pilots[st.pilot] || !D.sts[st.st]) throw 0;
    for (const w of Object.values(st.w || {})) if (w && !D.weapons[w.id] && D.alias[w.id]) w.id = D.alias[w.id];
    for (const w of Object.values(st.w || {})) if (w) for (const c of w.comps || []) if (D.components[c.id] && D.components[c.id].k === "RA" && !c.mode) c.mode = "chance";
    st.skills = (st.skills || []).map((k, i, a) => a.indexOf(k) === i ? k : null);
    delete st.loaded; markLoaded(st, {kind: "save", label: x.name}); S[id] = st; renderSide(id); update(); $(id + "-svmsg").textContent = `Loaded "${x.name}"`; }
  catch (e) { $(id + "-svmsg").textContent = "That loadout no longer matches the game data."; }
}
let delArmed = null;
async function deleteLoadout(id) {
  const x = SAVES.find(v => v.id === $(id + "-svlist").value);
  if (!x) return;
  if (delArmed !== x.id) { delArmed = x.id; $(id + "-svmsg").textContent = `Press Delete again to remove "${x.name}".`; return; }
  delArmed = null;
  try {
    if (STORE) await STORE.doc(x.id).delete();
    else localStorage.setItem(LS, JSON.stringify(SAVES.filter(v => v.id !== x.id)));
    $(id + "-svmsg").textContent = `Deleted "${x.name}"`;
  } catch (e) { $(id + "-svmsg").textContent = "Could not delete: " + (e && e.code || e); }
  await refreshSaves();
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
function init() {
  $("meta").textContent = `Damage Bench v${BENCH_VERSION}`;      // 1.0 = ready for regular use
  $("meta").title = `Game build ${D.meta.build} · data built ${D.meta.built}`;
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => showView(b.dataset.view)));
  { let v = "bench"; try { v = localStorage.getItem("bench-view") || "bench"; } catch (e) {} showView(v === "rd" ? "rd" : "bench"); }
  const groups = {};
  D.targets.forEach((t, i) => (groups[t.content] ||= []).push(i));
  $("t-target").innerHTML = Object.entries(groups).map(([g, is]) => `<optgroup label="${esc(g)}">` + is.map(i => opt(i, D.targets[i].label, i === T.target, icon("boss", D.targets[i].boss))).join("") + `</optgroup>`).join("");
  $("calc-btn").addEventListener("click", calculateSoon);
  $("t-target").addEventListener("change", e => { T.target = +e.target.value; update(); });
  iconSelects($("t-target").parentNode);
  $("t-fx").addEventListener("change", e => { const b = e.target.dataset.tfx, l = e.target.dataset.tlvl; if (!b && !l) return;
    const set = (T.tfx[T.target] ||= {}), k = b || l, cur = set[k] || (set[k] = {});
    if (b) cur.on = e.target.checked; else cur.lvl = Math.max(1, Math.min(+e.target.max || 99, Math.round(+e.target.value) || 1));
    update(); });
  $("t-part").addEventListener("change", e => { const v = e.target.value; if (v === "scatter") T.mode = "scatter"; else { T.mode = "focus"; T.part = v; } update(); });
  $("t-hp").addEventListener("input", e => { T.hp = +e.target.value; $("t-hpv").textContent = T.hp + "%"; updateSoon(); });
  $("t-conf").addEventListener("input", e => { T.conf = +e.target.value; $("t-confv").textContent = T.conf + "%"; updateSoon(); });
  const iA = D.units.length ? 0 : -1;
  S.A = iA >= 0 ? fromUnit(D.units[iA]) : blankSide(pilotIds[0]);
  S.B = iA >= 0 ? fromUnit(D.units[iA]) : blankSide(pilotIds[0]);
  renderSide("A"); renderSide("B"); update();
  if (window.claude && claude.use) initStore(); else { refreshSaves(); loadRD(); }
}
init();
