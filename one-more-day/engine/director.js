/* ONE MORE DAY — director: turns the timeline into characters, camera, effects and subtitles for any time t. */
'use strict';

const LINES = new Map(TL.lines.map(l => [l.id, l]));
const AGE = { teen: 'teen', adult: 'adult', older: 'adult' };

function sceneAt(t) { let lo = 0, hi = TL.scenes.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (TL.scenes[m].t0 <= t) lo = m; else hi = m - 1; } return TL.scenes[lo]; }
function shotAt(sc, t) { for (const s of sc.shots) if (t >= s.t0 && t < s.t1) return s; return sc.shots[sc.shots.length - 1] || { kind: 'wide', args: [], t0: sc.t0, t1: sc.t1 }; }
function lineAt(sc, t) { for (const id of sc.lines) { const l = LINES.get(id); if (t >= l.t0 && t < l.t1) return l; } return null; }
function setOpts(sc) { const o = Object.assign({}, sc.opts); return o; }

/* ---------- character states for a scene at time t ---------- */
function stageAt(sc, t) {
  const o = sc.opts, age = AGE[o.age] || 'teen';
  const ev = sc.cast.filter(e => e.t <= t + 1e-6);
  const base = ev.length ? ev[ev.length - 1] : (sc.cast[0] || { cast: [] });
  const castT = base.t ?? sc.t0;
  const chars = {};
  for (const cc of base.cast) {
    const lead = ['kan', 'film', 'film2'].includes(cc.id), wearAll = ['black', 'formal', 'office'].includes(o.wear) && !['mom', 'dad', 'doctor', 'teacher', 'teacher2', 'clerk'].includes(cc.id);
    chars[cc.id] = { id: cc.id, x: cc.x, s: cc.s, face: cc.face, states: new Set(cc.state), emo: 'neutral', show: !cc.state.includes('offscreen'), age,
      wear: lead || wearAll ? o.wear : undefined, hold: null, arms: null };
    const st = chars[cc.id];
    if (cc.state.includes('adult')) st.age = 'adult';
    if (cc.state.includes('young')) { st.age = 'teen'; st.wear = undefined; }
    if (cc.state.includes('bride')) st.wear = 'gown_f';
    if (o.kanwear && cc.id === 'kan') st.age = o.kanwear;
    for (const k of ['phone', 'book', 'papers', 'flower', 'box', 'necklace', 'pen', 'read', 'carry', 'paper', 'umbrella']) if (cc.state.includes(k)) st.hold = k === 'carry' || k === 'paper' ? 'papers' : k;
  }
  const set = SETS[o.set] || SETS.road;
  const fx = {};
  // apply actions in order
  for (const a of sc.actions) {
    if (a.t0 < castT - 1e-6 || a.t0 > t) continue;
    const k = prog(t, a.t0, a.t1), parts = a.do.split(/\s+/), verb = parts[0], who = chars[parts[1]], who2 = chars[parts[2]];
    const done = t >= a.t1;
    const move = (ch, spec, mode) => {
      const [x0, x1] = spec.split('>').map(Number);
      ch.x = lerp(x0, x1, mode === 'drift' ? k : ease(k) * .15 + k * .85);
      if (!done) { ch.walk = (t - a.t0) * (mode === 'run' ? 11 : mode === 'ride' ? 7 : 6.5); ch.run = mode === 'run'; }
      if (mode !== 'drift') ch.face = x1 >= x0 ? 1 : -1;
      ch.show = true;
    };
    switch (verb) {
      case 'walk': case 'run': case 'ride': case 'drift': if (who) { move(who, parts[2], verb); if (verb === 'ride') who.states.add('bike'); } break;
      case 'stand': if (who) { who.states.delete('sit'); who.states.delete('kneel'); who.states.delete('bike'); if (parts[2]) who.x = +parts[2]; } break;
      case 'standup': if (who) { who.states.delete('sit'); } break;
      case 'getup': if (who) { if (k < .4) who.states.add('ground'); else who.states.delete('ground'); } break;
      case 'helmet': if (who) who.helmet = true; break;
      case 'crash': fx.crash = { k, t0: a.t0 }; for (const ch of Object.values(chars)) if (ch.hold === 'read') { ch.states.add('ground'); ch.hold = null; } break;
      case 'laugh': case 'cry': case 'smile': case 'glare': if (who) who.emo = { laugh: 'laugh', cry: 'cry', smile: 'smile', glare: 'angry' }[verb]; break;
      case 'look': if (who) who.lookBack = !done; break;
      case 'turn': if (who && done) who.face = -who.face; else if (who && k > .5) who.face = -who.face; break;
      case 'wake': if (who) { if (k > .3) { who.states.delete('sleep'); who.states.add('sitbed'); who.emo = 'shock'; } } break;
      case 'enter': if (who) { const x1 = +(parts[2] || who.x); who.show = true; if (!done) { who.x = lerp(x1 + (x1 > set.w / 2 ? 400 : -400), x1, ease(k)); who.walk = (t - a.t0) * 6.5; } else who.x = x1; who.states.delete('offscreen'); } break;
      case 'exit': if (who) { if (done) who.show = false; else { who.x += (who.x > set.w / 2 ? 1 : -1) * ease(k) * 500; who.walk = (t - a.t0) * 6.5; } } break;
      case 'scope': if (who) who.scope = true; break;
      case 'unscope': if (who) who.scope = false; break;
      case 'hug': if (who && who2) { who.hug = who2.id; who2.hug = who.id; } break;
      case 'unhug': if (who && who2) { who.hug = who2.hug = null; } break;
      case 'hold': if (who && who2) { who.holdHand = who2.id; who2.holdHand = who.id; } break;
      case 'kiss': if (who && who2) { who.kiss = who2.id; who2.kiss = who.id; who.hug = who2.id; who2.hug = who.id; } break;
      case 'necklace': if (who && who2) { if (!done) who.necklaceTo = who2.id; who2.wearsNecklace = k > .6; } break;
      case 'give': if (who && who2) { if (done) { who2.hold = parts[3]; who.hold = null; } else who.giveTo = who2.id; } break;
      case 'shake': if (who && who2 && !done) { who.shakeWith = who2.id; who2.shakeWith = who.id; } break;
      case 'wave': case 'point': case 'wai': case 'choke': if (who && !done) who.gesture = verb; break;
      case 'grab': if (who && who2) { who.grab = who2.id; } break;
      case 'collapse': if (who) { who.states.add('kneel'); who.emo = 'cry'; } break;
      case 'kneel': if (who) { who.states.add('kneel'); if (parts[2]) who.x = +parts[2] - 90; } break;
      case 'fallen': if (who) { who.states.add('fallen'); if (parts[2]) who.x = +parts[2]; } break;
      case 'see': case 'phone': if (verb === 'phone' && who) who.hold = 'phone'; break;
      case 'fade': if (who) who.alpha = 1 - k; break;
      case 'group': fx.group = true; break;
      default: fx[verb] = { k, t0: a.t0, t1: a.t1, done, args: parts.slice(1) };
    }
  }
  if (fx.dreamwalk) { const f = chars.film; if (f) f.dream = true; }
  // expressions and talking from the dialogue
  const cur = lineAt(sc, t);
  for (const id of sc.lines) {
    const l = LINES.get(id); if (l.t0 > t) break;
    const ch = chars[l.who]; if (!ch || l.vo) continue;
    if (l.emo && l.emo !== 'shout' && l.emo !== 'whisper') ch.emo = l.emo;
    else if (l.t1 < t - 4) ch.emo = ch.emo === 'shock' || ch.emo === 'angry' ? 'neutral' : ch.emo;
  }
  if (cur && !cur.vo && chars[cur.who]) {
    const ch = chars[cur.who];
    ch.talk = (+cur.env[Math.floor((t - cur.t0) * TL.fps)] || 0) / 9;
    ch.speaking = cur;
    if (cur.emo) ch.emo = cur.emo === 'shout' ? (ch.emo === 'neutral' ? 'shout' : ch.emo) : cur.emo === 'whisper' ? 'soft' : cur.emo;
  }
  return { chars, fx, cur, set, age };
}

/* ---------- pose: turn a character's situation into drawing parameters ---------- */
function poseFor(ch, stage, sc, t, L) {
  const o = sc.opts, chars = stage.chars;
  const set = stage.set;
  const st = { x: ch.x, y: set.horizon + (set.floor - set.horizon) * (ch.s || 1), s: (ch.s || 1) * set.scale, face: ch.face, emo: ch.emo, talk: ch.talk || 0, light: L, age: ch.age, wear: ch.wear, helmet: ch.helmet, alpha: ch.alpha };
  const seed = ch.id.charCodeAt(0) * 7 + ch.id.length;
  // blink every few seconds
  const bp = 2.6 + hash(seed) * 2.4, bk = ((t + hash(seed + 1) * bp) % bp);
  st.blink = bk < .13 ? Math.abs(bk - .065) / .065 : 1;
  // eyes on whoever is talking, small saccades otherwise
  const sp = stage.cur && !stage.cur.vo ? chars[stage.cur.who] : null;
  const target = sp && sp !== ch ? sp : Object.values(chars).find(o2 => o2 !== ch && o2.show);
  const sac = (noise1(t * .7 + seed) - .5) * .5;
  st.gaze = [target ? (Math.sign(target.x - ch.x) === ch.face ? .35 : -.5) + sac * .3 : sac, (noise1(t * .5 + seed * 3) - .5) * .4];
  if (ch.lookBack) { st.turn = .05; st.gaze = [-.8, 0]; }
  if (ch.walk != null) st.walk = ch.walk;
  if (ch.run) st.run = true;
  if (ch.states.has('sit')) st.seat = true;
  if (ch.states.has('kneel')) st.kneel = true;
  if (ch.hold) st.hold = ch.hold === 'read' ? 'book' : ch.hold;
  if (o.wx === 'rain' && !ch.states.has('car') && ['kan', 'film'].includes(ch.id)) st.wet = true;
  // arms
  let F = null, B = null;
  if (ch.speaking && !st.walk && !ch.hug) { const g = clamp((noise1(t * .8 + seed) - .35) * 2.5); F = [.06 + g * .2, .15 + g * (.45 + noise1(t * 1.6 + seed) * .35)]; }
  if (st.hold === 'phone') F = ch.states.has('phone') || ch.hold === 'phone' ? [.35, 2.55] : F;
  if (['book', 'papers', 'box', 'flower', 'necklace', 'pen'].includes(st.hold)) { F = [.55, 1.35]; if (st.hold === 'papers' || st.hold === 'book') B = [.5, 1.3]; }
  if (st.hold === 'umbrella') F = [.95, 1.75];
  if (st.walk != null && !ch.states.has('bike')) { const sw = Math.sin(st.walk) * (st.run ? .7 : .35); F = F || [-sw, .2 + (st.run ? .9 : .1)]; B = B || [sw, .2 + (st.run ? .9 : .1)]; }
  if (ch.states.has('bike')) { F = [.62, .55]; B = [.55, .6]; st.bikeRide = true; }
  if (ch.hug) { const other = chars[ch.hug]; if (other) { F = [.3, .85]; B = [.25, .9]; st.turn = .6; } }
  if (ch.holdHand) { const other = chars[ch.holdHand]; if (other && Math.sign(other.x - ch.x) === ch.face) F = [.32, .05]; else B = [.32, .05]; }
  if (ch.necklaceTo) { F = [1.9, .9]; B = [1.75, .95]; }
  if (ch.giveTo) F = [1.0, .2];
  if (ch.shakeWith) F = [.9, .05];
  if (ch.gesture === 'wave') F = [2.5, .5 + Math.sin(t * 12) * .35];
  if (ch.gesture === 'point') F = [1.45, .05];
  if (ch.gesture === 'wai') { F = [.5, 2.2]; B = [.45, 2.25]; }
  if (ch.gesture === 'choke') F = [.6, 2.4];
  if (ch.emo === 'cry' && !ch.hug && !st.walk && ch.states.has('kneel') === false && hash(seed) > .5) F = [.55, 2.5];
  if (ch.scope) { st.lean = 1.3; st.tilt = .25; F = [.9, .7]; B = [.8, .8]; }
  if (ch.states.has('ground')) { st.ground = true; st.emo = ch.emo === 'neutral' ? 'shock' : ch.emo; F = [.35, .1]; B = [-.35, .1]; }
  if (ch.states.has('fallen')) { st.lie = 1; st.y = set.floor - 20; st.emo = ch.emo === 'neutral' ? 'weak' : ch.emo; st.blink = .25; }
  if (ch.states.has('sleep')) { st.lie = 1; st.y = set.floor - 150; st.emo = 'calm'; st.blink = 0; }
  if (ch.states.has('sitbed')) { st.seat = true; st.noLegs = true; st.y = set.floor + 70; if (sc.opts.set === 'bedroom') st.x = ch.x - 440; }  // sits up where the pillow is
  if ((ch.states.has('sitbed') || ch.states.has('sleep')) && !st.wear) st.wear = 'home';
  if (ch.states.has('ghost')) { st.alpha = (ch.alpha ?? 1) * .55; st.glow = true; }
  if (ch.states.has('car')) st.carSeat = true;
  if (ch.wearsNecklace || (ch.id === 'film2' && o.wear === 'formal')) st.necklace = true;
  if (ch.states.has('pregnant')) st.pregnant = true;
  if (ch.states.has('test')) st.hold = 'test';
  if (ch.states.has('bride')) st.wear = 'gown_f';
  if (ch.states.has('young')) { st.age = 'teen'; st.wear = undefined; }
  if (F) (st.arms = st.arms || {}).F = F;
  if (B) (st.arms = st.arms || {}).B = B;
  if (ch.dream) { st.sil = 'rgba(246,233,255,.92)'; }
  return st;
}

/* ---------- camera ---------- */
function headPos(st) { const s = st.s * .62; const drop = st.seat ? 225 * s : st.kneel ? 290 * s : 0; return [st.x + st.face * 6 * s, st.y - 935 * s + drop]; }
function cameraFor(shot, stage, poses, sc, t) {
  const set = stage.set, k = prog(t, shot.t0, shot.t1);
  const P = id => poses[id];
  let cam = { x: Math.min(set.w, W) / 2, y: H / 2, z: 1, blur: 0, focus: null };
  const visible = Object.keys(poses);
  const center = visible.length ? visible.reduce((a, id) => a + poses[id].x, 0) / visible.length : set.w / 2;
  const kind = shot.kind, a = shot.args || [];
  if (kind === 'wide' || kind === 'back' || kind === 'track' || kind === 'over' || kind === 'low' || kind === 'high') {
    cam.z = kind === 'track' ? 1.25 : kind === 'over' ? 1.35 : 1.0;
    cam.x = kind === 'wide' ? clamp(center, W / 2, set.w - W / 2) : center;
    cam.y = H / 2 + (kind === 'over' ? -40 : 0);
    if (kind === 'low') { cam.z = 1.2; cam.y = H / 2 + 60; }
  } else if ((kind === 'two') && P(a[0])) {
    const p1 = P(a[0]), p2 = P(a[1]) || p1; const [h1x, h1y] = headPos(p1), [h2x, h2y] = headPos(p2);
    const span = Math.abs(h1x - h2x) + 520 * p1.s;
    cam.z = clamp(W * .78 / span, 1, 2.2);
    cam.x = (h1x + h2x) / 2; cam.y = Math.min(h1y, h2y) + 190 / cam.z;
    cam.blur = 2;
  } else if (['cu', 'mcu', 'ots', 'extreme', 'pov'].includes(kind) && P(a[0])) {
    const p = P(a[0]); const [hx, hy] = headPos(p);
    const zz = { cu: 3.6, mcu: 2.45, ots: 3.0, extreme: 6, pov: 3.6 }[kind] / p.s;
    cam.z = zz;
    cam.x = hx + p.face * (W * .14) / zz; cam.y = hy + ({ cu: 150, mcu: 170, ots: 150, extreme: 0, pov: 150 }[kind]) / zz;
    cam.focus = a[0]; cam.ots = kind === 'ots' ? a[1] : null; cam.blur = kind === 'mcu' ? 4 : 6;
  } else {
    cam.x = clamp(center, W / 2, set.w - W / 2);
  }
  // slow push-in and a breath of handheld
  cam.z *= 1 + .035 * ease(k);
  const hh = kind === 'cu' || kind === 'ots' || kind === 'mcu' ? 1 : .5;
  cam.x += (noise1(t * .45 + 3) - .5) * 9 * hh / cam.z; cam.y += (noise1(t * .38 + 7) - .5) * 7 * hh / cam.z;
  cam.roll = (noise1(t * .3) - .5) * .004 * hh;
  // stay inside the set
  const hw = W / 2 / cam.z, hh2 = H / 2 / cam.z;
  cam.x = clamp(cam.x, hw, Math.max(hw, set.w - hw)); cam.y = clamp(cam.y, hh2, H - hh2 + 60);
  return cam;
}
