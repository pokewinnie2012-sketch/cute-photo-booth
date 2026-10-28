/* ONE MORE DAY — people: semi-realistic figures with expressions, lip-sync, blinking, breathing and lighting.
   A figure is drawn in local units (1000 = full height, feet at y=0, facing +x) and lit on its own layer. */
'use strict';

const CAST = {
  kan:     { skin: '#e9b892', hair: 'kan',   hc: '#2a1b14', iris: '#3a2416', male: true, eye: 1.0, jaw: 1.0, wear: { teen: 'school_m', adult: 'casual_m', older: 'casual_m2' }, tee: '#5b7fa6' },
  film:    { skin: '#f4cfb4', hair: 'film',  hc: '#140d0b', iris: '#4a2a18', male: false, eye: 1.08, jaw: .92, wear: { teen: 'school_f', adult: 'casual_f' }, tee: '#f2e6da' },
  film2:   { skin: '#f4cfb4', hair: 'film2', hc: '#2a1812', iris: '#4a2a18', male: false, eye: 1.08, jaw: .92, wear: { adult: 'casual_f2' }, tee: '#c9d8e8' },
  fon:     { skin: '#efc4a6', hair: 'fon',   hc: '#3a2418', iris: '#3a2418', male: false, eye: 1.04, jaw: .94, wear: { teen: 'school_f', adult: 'casual_f3' }, tee: '#e3a6b4' },
  tae:     { skin: '#d9a47c', hair: 'tae',   hc: '#121212', iris: '#2a1a10', male: true, eye: .95, jaw: 1.04, wear: { teen: 'school_m', adult: 'casual_m' }, tee: '#3f7a5a' },
  ball:    { skin: '#e3b18b', hair: 'ball',  hc: '#1c1410', iris: '#2a1a10', male: true, eye: .9, jaw: 1.18, wide: 1.25, wear: { teen: 'school_m', adult: 'casual_m' }, tee: '#c98a3a' },
  ton:     { skin: '#efc3a0', hair: 'ton',   hc: '#151519', iris: '#2a1a10', male: true, eye: .95, jaw: .98, glasses: true, wear: { teen: 'school_m', adult: 'casual_m' }, tee: '#6a6aa8' },
  kong:    { skin: '#d39f78', hair: 'kong',  hc: '#0d0d10', iris: '#1a120c', male: true, eye: .92, jaw: 1.0, lids: .55, wear: { teen: 'school_m', adult: 'casual_m' }, tee: '#2f2f38' },
  mom:     { skin: '#e6b893', hair: 'mom',   hc: '#2a201c', iris: '#2a1a10', male: false, eye: .98, jaw: .98, age: 45, wear: { any: 'home_f' }, tee: '#d9826a' },
  dad:     { skin: '#d2a07a', hair: 'dad',   hc: '#3a3634', iris: '#24160e', male: true, eye: .9, jaw: 1.1, age: 50, mustache: true, wear: { teen: 'police', adult: 'home_m', any: 'home_m' }, tee: '#7a6a58' },
  doctor:  { skin: '#e8c0a0', hair: 'ton',   hc: '#1a1a1a', iris: '#24160e', male: true, eye: .92, jaw: 1.02, glasses: true, age: 40, wear: { any: 'doctor' } },
  teacher: { skin: '#dcab85', hair: 'bald',  hc: '#55504c', iris: '#24160e', male: true, eye: .9, jaw: 1.06, glasses: true, age: 50, wear: { any: 'teacher' } },
  teacher2:{ skin: '#e5b993', hair: 'ton',   hc: '#2a2420', iris: '#24160e', male: true, eye: .92, jaw: 1.0, glasses: true, age: 38, wear: { any: 'teacher2' } },
  clerk:   { skin: '#f0c8aa', hair: 'bun',   hc: '#1a1210', iris: '#2a1a10', male: false, eye: 1.0, jaw: .94, wear: { any: 'clerk' } },
  fkan:    { skin: '#dcaa84', hair: 'fkan',  hc: '#241a14', iris: '#3a2416', male: true, eye: .95, jaw: 1.02, stubble: true, lids: .7, wear: { any: 'jacket' } },
  child:   { skin: '#f2c8a8', hair: 'child', hc: '#20140e', iris: '#3a2416', male: false, eye: 1.25, jaw: .85, kid: true, wear: { any: 'kid' }, tee: '#ffd36a' },
};
CAST.kanyoung = Object.assign({}, CAST.kan);
CAST.filmyoung = Object.assign({}, CAST.film);
CAST.kan2 = Object.assign({}, CAST.kan, { hair: 'ton', glasses: true, wear: { any: 'office_m' } });
CAST.groom = { skin: '#e2b08a', hair: 'ton', hc: '#1a1410', iris: '#2a1a10', male: true, eye: .95, jaw: 1.02, wear: { any: 'suit_m' } };
const NAMES = { kan: 'กันต์', film: 'ฟิล์ม', film2: 'ฟิล์ม', fon: 'ฝน', tae: 'เต้', ball: 'บอล', ton: 'ต้น', kong: 'ก้อง', mom: 'แม่', dad: 'พ่อฟิล์ม', doctor: 'หมอ', teacher: 'ครู', teacher2: 'อาจารย์', clerk: 'พนักงาน', fkan: 'กันต์', child: 'ลูก' };

/* ---------- expressions ---------- */
const EXPR = {
  neutral: { brow: [0, 0], lid: 1, mouth: 0, open: 0 },
  smile:   { brow: [0, .1], lid: .85, mouth: .7, open: 0 },
  soft:    { brow: [.15, 0], lid: .85, mouth: .35, open: 0 },
  happy:   { brow: [.2, .2], lid: .7, mouth: 1, open: .35 },
  laugh:   { brow: [.25, .2], lid: .35, mouth: 1, open: .7 },
  sad:     { brow: [.8, -.3], lid: .72, mouth: -.6, open: 0 },
  cry:     { brow: [1, -.4], lid: .55, mouth: -.8, open: .15, tears: 1 },
  angry:   { brow: [-.9, .3], lid: .82, mouth: -.35, open: 0 },
  shock:   { brow: [.9, .9], lid: 1.25, mouth: -.1, open: .55 },
  shy:     { brow: [.4, 0], lid: .75, mouth: .3, open: 0, blush: .8, look: [-.6, .5] },
  tease:   { brow: [-.2, .6], lid: .8, mouth: .55, open: 0, smirk: 1 },
  tired:   { brow: [.2, -.2], lid: .55, mouth: -.2, open: 0 },
  worried: { brow: [.7, 0], lid: .95, mouth: -.3, open: 0 },
  calm:    { brow: [0, 0], lid: .72, mouth: 0, open: 0 },
  cold:    { brow: [-.4, .1], lid: .78, mouth: -.15, open: 0 },
  weak:    { brow: [.6, -.3], lid: .4, mouth: -.3, open: .1, pale: .4 },
  whisper: { brow: [.3, 0], lid: .8, mouth: 0, open: 0 },
  shout:   { brow: [.4, .5], lid: 1.1, mouth: 0, open: .3 },
};
function blendExpr(a, b, k) {
  const A = EXPR[a] || EXPR.neutral, B = EXPR[b] || EXPR.neutral, o = {};
  for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const va = A[key] ?? (Array.isArray(B[key]) ? [0, 0] : 0), vb = B[key] ?? (Array.isArray(A[key]) ? [0, 0] : 0);
    o[key] = Array.isArray(va) ? va.map((v, i) => lerp(v, vb[i], k)) : lerp(va, vb, k);
  }
  return o;
}

/* ---------- outfits ---------- */
const OUTFITS = {
  school_m: { top: '#f7f6f2', sleeve: 'short', bottom: 'shorts', pants: '#1e2a48', shoes: '#151515', socks: '#f2f2f2', collar: 'shirt', emblem: true },
  school_f: { top: '#f8f7f3', sleeve: 'short', bottom: 'skirt', pants: '#1f2b4e', shoes: '#151515', socks: '#f2f2f2', collar: 'sailor', bow: '#1f2b4e', emblem: true },
  casual_m: { top: '$tee', sleeve: 'short', bottom: 'long', pants: '#3a4658', shoes: '#e8e8e8', collar: 'crew' },
  casual_m2:{ top: '#e9e4da', sleeve: 'long', bottom: 'long', pants: '#2c3444', shoes: '#4a3424', collar: 'shirt', jacket: '#4a5a4a' },
  casual_f: { top: '#f3ebe2', sleeve: 'short', bottom: 'skirtlong', pants: '#8aa2bf', shoes: '#f2f2f2', collar: 'round', cardigan: '#e8c8b4' },
  casual_f2:{ top: '$tee', sleeve: 'long', bottom: 'long', pants: '#3a3a48', shoes: '#f2f2f2', collar: 'round' },
  casual_f3:{ top: '$tee', sleeve: 'short', bottom: 'skirtlong', pants: '#3a3448', shoes: '#2a2a2a', collar: 'round' },
  rain_m:   { top: '#5b6f86', sleeve: 'short', bottom: 'long', pants: '#2a3240', shoes: '#cfcfcf', collar: 'crew', wet: true },
  rain_f:   { top: '#d8cfc8', sleeve: 'long', bottom: 'skirtlong', pants: '#5a6a80', shoes: '#efefef', collar: 'round', wet: true },
  black_m:  { top: '#1c1c20', sleeve: 'long', bottom: 'long', pants: '#16161a', shoes: '#0c0c0c', collar: 'shirt' },
  black_f:  { top: '#1c1c20', sleeve: 'long', bottom: 'skirtlong', pants: '#16161a', shoes: '#0c0c0c', collar: 'round' },
  office_m: { top: '#e7eef6', sleeve: 'long', bottom: 'long', pants: '#2d3340', shoes: '#1a1410', collar: 'shirt', tie: '#3a4a6a' },
  office_f: { top: '#f4f0ea', sleeve: 'long', bottom: 'skirtlong', pants: '#2d3340', shoes: '#1a1410', collar: 'shirt' },
  suit_m:   { top: '#f7f6f2', sleeve: 'long', bottom: 'long', pants: '#1f2533', shoes: '#0f0f0f', collar: 'shirt', jacket: '#1f2533', tie: '#7a2a3a' },
  gown_f:   { top: '#fbf8f2', sleeve: 'none', bottom: 'gown', pants: '#fbf8f2', shoes: '#fbf8f2', collar: 'bare' },
  dress_f:  { top: '$tee', sleeve: 'none', bottom: 'gown', pants: '$tee', shoes: '#2a2a2a', collar: 'bare' },
  police:   { top: '#8a6a4a', sleeve: 'short', bottom: 'long', pants: '#6e543a', shoes: '#141414', collar: 'shirt', badge: true },
  home_m:   { top: '#7a6a58', sleeve: 'short', bottom: 'long', pants: '#3a3a40', shoes: '#4a3a2a', collar: 'shirt' },
  home_f:   { top: '#d9826a', sleeve: 'short', bottom: 'skirtlong', pants: '#4a4060', shoes: '#4a3a2a', collar: 'round' },
  doctor:   { top: '#8fb8c8', sleeve: 'short', bottom: 'long', pants: '#8fb8c8', shoes: '#f0f0f0', collar: 'v', coat: '#f8f8f8' },
  teacher:  { top: '#dfe8f2', sleeve: 'long', bottom: 'long', pants: '#3a3a44', shoes: '#1a1410', collar: 'shirt' },
  teacher2: { top: '#c9d6c9', sleeve: 'long', bottom: 'long', pants: '#3a3a44', shoes: '#1a1410', collar: 'shirt' },
  clerk:    { top: '#f4f0ea', sleeve: 'long', bottom: 'skirtlong', pants: '#2a2a2a', shoes: '#1a1410', collar: 'shirt', vest: '#2a2a2a' },
  jacket:   { top: '#3a3a40', sleeve: 'long', bottom: 'long', pants: '#22242c', shoes: '#1a1a1a', collar: 'crew', jacket: '#262830' },
  kid:      { top: '$tee', sleeve: 'short', bottom: 'skirt', pants: '#6aa0d8', shoes: '#ff7a8a', socks: '#fff', collar: 'round' },
};
function outfitFor(id, p, wear, age) {
  if (wear && OUTFITS[wear]) return resolveOutfit(OUTFITS[wear], p);
  if (wear === 'rain') return resolveOutfit(OUTFITS[p.male ? 'rain_m' : 'rain_f'], p);
  if (wear === 'black') return resolveOutfit(OUTFITS[p.male ? 'black_m' : 'black_f'], p);
  if (wear === 'office') return resolveOutfit(OUTFITS[p.male ? 'office_m' : 'office_f'], p);
  if (wear === 'casual' && !p.wear.any) return resolveOutfit(OUTFITS[p.male ? 'casual_m' : (id === 'film' ? 'casual_f' : 'casual_f3')], p);
  if (wear === 'formal') return resolveOutfit(OUTFITS[p.male ? 'suit_m' : 'dress_f'], p);
  const key = p.wear[age] || p.wear.any || p.wear.adult || p.wear.teen;
  return resolveOutfit(OUTFITS[key], p);
}
function resolveOutfit(o, p) { const r = {}; for (const k in o) r[k] = o[k] === '$tee' ? (p.tee || '#888') : o[k]; return r; }

/* ---------- the lit person layer ---------- */
const PL = document.createElement('canvas'); PL.width = W; PL.height = H; const plc = PL.getContext('2d');

/* st: {x,y,s,face,turn,emo,emo2,emoK,talk,gaze:[x,y],arms:{F:[a1,a2],B:[a1,a2]},legs,lean,tilt,seat,kneel,lie,walk,blink,breath,
        wear,age,wet,blur,alpha,light:{dir,key,rim,amb},sil,hold,props} */
function drawPerson(id, st, T) {
  const p = CAST[id]; if (!p) return;
  if (st.fast) { c.save(); c.globalAlpha = st.alpha ?? 1; figure(id, p, st, T); if (st.sil) { /* flat silhouettes are drawn by caller */ } c.restore(); return; }
  const m = c.getTransform();
  // screen-space box around the figure (props and umbrellas included) so all layer work stays small
  const sc0 = (st.s || 1) * .62 * (p.kid ? .62 : 1), ext = st.hold === 'umbrella' ? 1.6 : 1;
  const reach = st.arms && Math.max((st.arms.F || [0])[0], (st.arms.B || [0])[0]) > .25 ? 1.7 : 1;
  const xs = [-330 * ext * reach, 380 * ext * reach].map(v => v * sc0), ys = [-1080 * ext, 60].map(v => v * sc0);
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const lx of st.lie ? [-1100 * sc0, 1100 * sc0] : xs) for (const ly of st.lie ? [-700 * sc0, 200 * sc0] : ys) {
    const X = st.x + lx, Y = st.y + ly, sx = m.a * X + m.c * Y + m.e, sy = m.b * X + m.d * Y + m.f;
    bx0 = Math.min(bx0, sx); bx1 = Math.max(bx1, sx); by0 = Math.min(by0, sy); by1 = Math.max(by1, sy);
  }
  const pad = (st.blur || 0) * 3 + 4;
  bx0 = Math.max(0, Math.floor(bx0 - pad)); by0 = Math.max(0, Math.floor(by0 - pad)); bx1 = Math.min(W, Math.ceil(bx1 + pad)); by1 = Math.min(H, Math.ceil(by1 + pad));
  if (bx1 <= bx0 || by1 <= by0) return;
  const bw = bx1 - bx0, bh = by1 - by0;
  plc.setTransform(1, 0, 0, 1, 0, 0); plc.clearRect(bx0, by0, bw, bh); plc.setTransform(m);
  withCtx(plc, () => figure(id, p, st, T));
  // lighting on the person's own pixels
  const L = st.light || {};
  plc.setTransform(1, 0, 0, 1, 0, 0);
  const sx = m.a * st.x + m.c * st.y + m.e, s = Math.hypot(m.a, m.b) * (st.s || 1) * 0.62;
  const half = 140 * s * (p.wide || 1), top = m.d * (st.y) + m.f - 1000 * s, bot = m.d * st.y + m.f;
  const dir = (L.dir ?? -1);
  plc.globalCompositeOperation = 'source-atop';
  if (st.sil) { plc.fillStyle = st.sil; plc.fillRect(bx0, by0, bw, bh); }
  else {
    // shading across the body; limbs reaching out past it fall back to a gentler level
    const sh = L.shadow || '30,20,45', sa = L.shadowA ?? .32;
    plc.fillStyle = lgradOn(plc, sx - half * dir * 3, 0, sx + half * dir * 3, 0, [[0, `rgba(${sh},${sa * .25})`], [.3, 'rgba(0,0,0,0)'], [.517, 'rgba(0,0,0,0)'], [.667, `rgba(${sh},${sa})`], [1, `rgba(${sh},${sa * .45})`]]);
    plc.fillRect(bx0, by0, bw, bh);
    if (L.rim) { const ra = L.rimA ?? .55; plc.fillStyle = lgradOn(plc, sx + half * dir * .55, 0, sx + half * dir * 2.2, 0, [[0, 'rgba(0,0,0,0)'], [.3, `rgba(${L.rim},${ra})`], [.45, `rgba(${L.rim},${ra * .25})`], [1, 'rgba(0,0,0,0)']]); plc.fillRect(bx0, by0, bw, bh); }
    if (L.amb) { plc.globalAlpha = L.ambA ?? .14; plc.fillStyle = `rgb(${L.amb})`; plc.fillRect(bx0, by0, bw, bh); plc.globalAlpha = 1; }
    if (L.top) { plc.fillStyle = lgradOn(plc, 0, top, 0, bot, [[0, `rgba(${L.top},.18)`], [1, 'rgba(0,0,0,0)']]); plc.fillRect(bx0, by0, bw, bh); }
  }
  plc.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  if (st.blur) c.filter = `blur(${st.blur}px)`;
  c.globalAlpha = st.alpha ?? 1;
  c.drawImage(PL, bx0, by0, bw, bh, bx0, by0, bw, bh);
  c.restore();
}
function lgradOn(ctx, x0, y0, x1, y1, stops) { const g = ctx.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }

function figure(id, p, st, T) {
  const s = (st.s || 1) * 0.62 * (p.kid ? .62 : 1), f = st.face || 1;
  const of = outfitFor(id, p, st.wear, st.age || 'teen');
  const wet = st.wet || of.wet;
  const seed = id.length * 13 + id.charCodeAt(0);
  const breath = Math.sin(T * 1.7 + seed) * 2.5 * (st.breath ?? 1);
  c.save();
  c.translate(st.x, st.y);
  if (!st.lie && !st.sil) { c.fillStyle = 'rgba(0,0,0,.26)'; ell(0, 2, 110 * s, 14 * s); }
  c.scale(s * f, s);
  if (st.lie) c.rotate(-Math.PI / 2 * st.lie);
  const ground = st.ground ? 1 : 0, sit = st.seat && !ground ? 1 : 0, kneel = st.kneel ? 1 : 0;
  legs(p, of, st, T, sit, kneel, ground);
  c.translate(0, sit * 225 + kneel * 290 + ground * 450);
  c.rotate((st.lean || 0) * .12);
  const sw = (p.male ? 96 : 82) * (p.wide || 1);
  const A = st.arms || {};
  const headTf = () => { c.translate(0, -840 + breath); c.rotate((st.tilt || 0) + Math.sin(T * .9 + seed) * .012 + (st.nod || 0)); c.translate(0, 840); };
  c.save(); headTf(); hairBack(p, st.turn ?? .42, wet, T); c.restore();
  arm(p, of, -(sw - 20), A.B || [-.05, .12], -1, st, T, breath);
  torso(p, of, sw, breath, st);
  c.save(); headTf(); head(id, p, of, st, T, wet, seed); c.restore();
  arm(p, of, sw - 20, A.F || [.04, .14], 1, st, T, breath);
  if (st.hold === 'umbrella') umbrella(sw, breath);
  c.restore();
}

function limb(x0, y0, w0, x1, y1, w1, bulge = 0) {
  // tapered limb from (x0,y0) to (x1,y1), widths w0->w1, optional muscle bulge
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, wm = (w0 + w1) / 2 + bulge;
  c.beginPath();
  c.moveTo(x0 + nx * w0, y0 + ny * w0);
  c.quadraticCurveTo(mx + nx * wm * 1.08, my + ny * wm * 1.08, x1 + nx * w1, y1 + ny * w1);
  c.lineTo(x1 - nx * w1, y1 - ny * w1);
  c.quadraticCurveTo(mx - nx * wm * 1.08, my - ny * wm * 1.08, x0 - nx * w0, y0 - ny * w0);
  c.closePath(); c.fill();
  c.beginPath(); c.arc(x0, y0, w0, 0, Math.PI * 2); c.arc(x1, y1, w1, 0, Math.PI * 2); c.fill();
}

function legs(p, of, st, T, sit, kneel, ground) {
  const w = st.walk ? Math.sin(st.walk) : 0, amt = st.walk ? (st.run ? .7 : .38) : 0;
  const skirt = of.bottom.startsWith('skirt') || of.bottom === 'gown';
  const longP = of.bottom === 'long' || of.bottom === 'gown';
  const hipW = p.male ? 40 : 42;
  const leg = (side, phase) => {
    const hx = side * hipW * .62 + (ground ? 0 : 0), hy = ground ? -40 : -490;
    let kx, ky, ax, ay;
    if (ground) { kx = hx + 220; ky = -70 - side * 10; ax = kx + 210; ay = -40; }
    else if (sit) { kx = hx + 230; ky = -260; ax = kx + 6; ay = -30; }
    else if (kneel) { if (side > 0) { kx = hx + 150; ky = -300; ax = kx + 10; ay = -30; } else { kx = hx + 20; ky = -10; ax = kx - 210; ay = -20; } }
    else {
      const a = phase * amt, b = Math.max(0, -phase) * amt * 1.5 + (st.run ? .35 * Math.max(0, Math.sin((st.walk || 0) + 1.2)) : 0);
      kx = hx + Math.sin(a) * 235; ky = hy + Math.cos(a) * 235;
      ax = kx + Math.sin(a - b) * 215; ay = ky + Math.cos(a - b) * 215;
    }
    c.fillStyle = longP ? of.pants : p.skin;
    limb(hx, hy, 40, kx, ky, 25, 4);
    c.fillStyle = (longP ? of.pants : p.skin);
    limb(kx, ky, 25, ax, ay, 17, 5);
    if (of.socks) { c.fillStyle = of.socks; limb(kx + (ax - kx) * .72, ky + (ay - ky) * .72, 19, ax, ay, 18); }
    c.fillStyle = of.shoes;
    c.beginPath(); c.moveTo(ax - 22, ay - 6); c.quadraticCurveTo(ax - 26, ay + 30, ax, ay + 34); c.lineTo(ax + 74, ay + 34); c.quadraticCurveTo(ax + 82, ay + 14, ax + 50, ay + 4); c.quadraticCurveTo(ax + 20, ay - 10, ax - 22, ay - 6); c.fill();
    c.fillStyle = 'rgba(255,255,255,.14)'; rr(ax - 8, ay + 26, 70, 6, 3); c.fill();
  };
  leg(-1, -w); leg(1, w);
  if (ground) { if (skirt) { c.fillStyle = of.pants; c.beginPath(); c.moveTo(-70, -120); c.lineTo(66, -120); c.lineTo(250, -60); c.lineTo(250, 0); c.lineTo(-60, 0); c.closePath(); c.fill(); } return; }
  if (sit) {
    if (skirt) { c.fillStyle = of.pants; c.beginPath(); c.moveTo(-70, -330); c.lineTo(66, -330); c.lineTo(240, -300); c.lineTo(250, -232); c.lineTo(-56, -232); c.closePath(); c.fill(); }
    else if (of.bottom === 'shorts') { c.fillStyle = of.pants; c.beginPath(); c.moveTo(-72, -330); c.lineTo(70, -330); c.lineTo(160, -300); c.lineTo(165, -222); c.lineTo(-60, -226); c.closePath(); c.fill(); }
    return;
  }
  if (kneel) return;
  if (of.bottom === 'long') { c.fillStyle = of.pants; c.beginPath(); c.moveTo(-76, -580); c.lineTo(76, -580); c.quadraticCurveTo(82, -500, 64, -440); c.lineTo(-64, -440); c.quadraticCurveTo(-82, -500, -76, -580); c.fill(); }
  if (of.bottom === 'shorts') {
    c.fillStyle = of.pants;
    c.beginPath(); c.moveTo(-74, -575); c.lineTo(74, -575); c.lineTo(80, -470); c.lineTo(78, -370); c.lineTo(8, -380); c.lineTo(0, -450); c.lineTo(-8, -380); c.lineTo(-78, -370); c.lineTo(-80, -470); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -560); c.lineTo(0, -450); c.stroke();
  }
  if (skirt) {
    const len = of.bottom === 'skirt' ? 230 : (of.bottom === 'gown' ? 560 : 380), flare = of.bottom === 'gown' ? 170 : 40;
    c.fillStyle = of.pants;
    c.beginPath(); c.moveTo(-64, -585); c.lineTo(64, -585); c.quadraticCurveTo(80 + flare * .5, -585 + len * .6, 84 + flare, -585 + len);
    c.quadraticCurveTo(0, -585 + len + 18, -84 - flare, -585 + len); c.quadraticCurveTo(-80 - flare * .5, -585 + len * .6, -64, -585); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 3;
    for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 17, -580); c.lineTo(i * (25 + flare / 5), -590 + len); c.stroke(); }
  }
}

function torso(p, of, sw, breath, st) {
  const top = -842 + breath;
  const ww = (p.male ? 70 : 56) * (p.wide || 1), hw = (p.male ? 76 : 80) * (p.wide || 1);
  const bottom = (of.bottom === 'shorts' || of.bottom === 'long') && !of.jacket && !of.coat ? -560 : -500;
  c.fillStyle = p.skin; limb(0, -880 + breath, p.male ? 21 : 18, 0, top + 10, p.male ? 23 : 20);
  c.fillStyle = lgrad(0, -882 + breath, 0, top + 6, [[0, 'rgba(110,55,40,.26)'], [.55, 'rgba(110,55,40,.08)'], [1, 'rgba(110,55,40,0)']]); limb(0, -880 + breath, p.male ? 21 : 18, 0, top + 10, p.male ? 23 : 20);
  const col = of.top;
  const body = () => {
    c.beginPath();
    c.moveTo(-26, top); c.quadraticCurveTo(-sw * .6, top + 2, -sw + 6, top + 22);
    c.quadraticCurveTo(-sw - 4, top + 50, -sw + 14, top + 110);
    c.quadraticCurveTo(-ww - 6, -660, -ww, -600); c.quadraticCurveTo(-hw, -540, -hw, bottom);
    c.lineTo(hw, bottom); c.quadraticCurveTo(hw, -540, ww, -600); c.quadraticCurveTo(ww + 6, -660, sw - 14, top + 110);
    c.quadraticCurveTo(sw + 4, top + 50, sw - 6, top + 22); c.quadraticCurveTo(sw * .6, top + 2, 26, top); c.closePath();
  };
  c.fillStyle = col; body(); c.fill();
  c.save(); body(); c.clip();
  c.fillStyle = lgrad(-sw, 0, sw, 0, [[0, 'rgba(30,30,60,.13)'], [.35, 'rgba(30,30,60,0)'], [.8, 'rgba(255,255,255,.04)'], [1, 'rgba(30,30,60,.06)']]); c.fillRect(-sw - 20, top - 20, sw * 2 + 40, 600);
  c.strokeStyle = 'rgba(0,0,0,.06)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-ww + 8, -600); c.quadraticCurveTo(-ww + 30, -640, -ww + 24, -700); c.stroke();
  c.restore();
  if (of.jacket || of.coat || of.cardigan) {
    const jc = of.jacket || of.coat || of.cardigan, low = of.coat ? -300 : (of.cardigan ? -520 : -470);
    for (const sd of [-1, 1]) {
      c.fillStyle = jc; c.beginPath();
      c.moveTo(sd * 26, top - 2); c.quadraticCurveTo(sd * sw * .55, top, sd * (sw + 2), top + 26); c.quadraticCurveTo(sd * (sw + 10), top + 60, sd * (sw - 10), top + 112);
      c.quadraticCurveTo(sd * (ww + 4), -660, sd * (ww + 4), -600); c.quadraticCurveTo(sd * (hw + 8), -540, sd * (hw + 10), low); c.lineTo(sd * 16, low); c.lineTo(sd * 14, top + 150); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.14)'; poly([sd * 14, top + 150, sd * 30, top - 2, sd * 6, top + 50]);
    }
  }
  if (of.vest) { c.fillStyle = of.vest; c.beginPath(); c.moveTo(-sw * .62, top + 26); c.quadraticCurveTo(-ww, -640, -hw + 4, -520); c.lineTo(hw - 4, -520); c.quadraticCurveTo(ww, -640, sw * .62, top + 26); c.lineTo(22, top + 130); c.lineTo(-22, top + 130); c.closePath(); c.fill(); }
  if (of.collar === 'shirt') { c.fillStyle = shade(col.startsWith('#') ? col : '#ffffff', .25); poly([-30, top - 6, -2, top + 44, -6, top + 4, -46, top + 18]); poly([30, top - 6, 2, top + 44, 6, top + 4, 46, top + 18]); c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, top + 44); c.lineTo(0, bottom); c.stroke(); for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(0,0,0,.16)'; circ(5, top + 80 + i * 66, 3.5); } }
  if (of.collar === 'sailor') { c.fillStyle = '#ffffff'; poly([-36, top - 4, 0, top + 54, 36, top - 4, 28, top + 10, 0, top + 34, -28, top + 10]); }
  if (of.collar === 'crew' || of.collar === 'round') { c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, top + 4, 30, 14, 0, .1, Math.PI - .1); c.stroke(); }
  if (of.collar === 'v') { c.fillStyle = p.skin; poly([-22, top - 2, 0, top + 46, 22, top - 2]); }
  if (of.collar === 'bare') { c.fillStyle = p.skin; c.beginPath(); c.moveTo(-sw + 14, top + 26); c.quadraticCurveTo(0, top + 76, sw - 14, top + 26); c.lineTo(sw - 24, top); c.lineTo(-sw + 24, top); c.closePath(); c.fill(); }
  if (of.bow) { c.fillStyle = of.bow; poly([0, top + 28, -32, top + 12, -28, top + 50]); poly([0, top + 28, 32, top + 12, 28, top + 50]); poly([-7, top + 28, 7, top + 28, 15, top + 110, 0, top + 99, -15, top + 110]); circ(0, top + 29, 9); }
  if (of.tie) { c.fillStyle = of.tie; poly([-9, top + 28, 9, top + 28, 15, top + 190, 0, top + 210, -15, top + 190]); }
  if (of.emblem) { c.fillStyle = '#2d4fa3'; circ(-44, top + 88, 7); c.fillRect(24, top + 84, 30, 4); }
  if (of.badge) { c.fillStyle = '#d4b04a'; poly([-48, top + 76, -38, top + 66, -28, top + 76, -38, top + 96]); }
  if (bottom === -560) { c.fillStyle = '#161616'; rr(-hw + 2, -580, (hw - 2) * 2, 14, 4); c.fill(); }
  if (st.pregnant) { c.fillStyle = col; ell(sw * .55, -640, 70, 92); c.fillStyle = 'rgba(0,0,0,.06)'; ell(sw * .45, -600, 50, 40); }
  if (st.wet || of.wet) { c.save(); body(); c.clip(); c.fillStyle = 'rgba(25,35,60,.2)'; c.fillRect(-sw - 20, top, sw * 2 + 40, 400); c.restore(); }
}

function arm(p, of, x, ang, side, st, T, breath) {
  const [a1, a2] = ang;
  const sleeveCol = of.coat || of.jacket || of.cardigan || of.top;
  const longSleeve = of.sleeve === 'long' || of.coat || of.jacket || of.cardigan;
  const y0 = -812 + breath;
  const ex = x + Math.sin(a1) * 165, ey = y0 + Math.cos(a1) * 165;
  const hx = ex + Math.sin(a1 + a2) * 150, hy = ey + Math.cos(a1 + a2) * 150;
  c.fillStyle = longSleeve ? sleeveCol : p.skin; limb(x + Math.sin(a1) * 14, y0 + Math.cos(a1) * 14, 25, ex, ey, 20, 4);
  if (!longSleeve && of.sleeve !== 'none') {
    const sx1 = x + Math.sin(a1) * 84, sy1 = y0 + Math.cos(a1) * 84, nx = Math.cos(a1), ny = -Math.sin(a1);
    c.fillStyle = sleeveCol; c.beginPath();
    c.moveTo(x - nx * 31 - Math.sin(a1) * 16, y0 - ny * 31 - Math.cos(a1) * 16); c.quadraticCurveTo(x - Math.sin(a1) * 40, y0 - 44, x + nx * 31 - Math.sin(a1) * 16, y0 + ny * 31 - Math.cos(a1) * 16);
    c.lineTo(sx1 + nx * 34, sy1 + ny * 34); c.lineTo(sx1 - nx * 34, sy1 - ny * 34); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.08)'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx1 + nx * 32, sy1 + ny * 32); c.lineTo(sx1 - nx * 32, sy1 - ny * 32); c.stroke();
  }
  c.fillStyle = longSleeve ? sleeveCol : p.skin; limb(ex, ey, 20, hx, hy, 15, 3);
  if (longSleeve) { c.fillStyle = p.skin; limb(hx - Math.sin(a1 + a2) * 6, hy - Math.cos(a1 + a2) * 6, 14, hx, hy, 14); }
  // hand
  c.save(); c.translate(hx, hy); c.rotate(-(a1 + a2));
  c.fillStyle = p.skin;
  c.beginPath(); c.moveTo(-15, -4); c.quadraticCurveTo(-19, 30, -10, 52); c.quadraticCurveTo(0, 60, 10, 52); c.quadraticCurveTo(17, 28, 15, -4); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(13, 18, 7, 15, -.5, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(120,60,40,.25)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-6, 30); c.lineTo(-5, 50); c.moveTo(2, 31); c.lineTo(3, 53); c.stroke();
  if (side > 0 && st.hold && st.hold !== 'umbrella') prop(st.hold, 0);
  c.restore();
}
function prop(kind, ang) {
  c.save(); c.translate(0, 34); c.rotate(ang);
  if (kind === 'phone') { c.fillStyle = '#16161a'; rr(-26, -54, 52, 100, 10); c.fill(); c.fillStyle = '#8fc4ff'; rr(-21, -48, 42, 86, 7); c.fill(); }
  if (kind === 'book' || kind === 'read') { c.fillStyle = '#3a6ab0'; rr(-60, -40, 120, 84, 6); c.fill(); c.fillStyle = '#fff'; c.fillRect(-56, -36, 112, 6); }
  if (kind === 'papers') { c.fillStyle = '#f6f4ee'; rr(-80, -60, 160, 110, 4); c.fill(); c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 2; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-80, -40 + i * 18); c.lineTo(80, -40 + i * 18); c.stroke(); } }
  if (kind === 'flower') { c.strokeStyle = '#4a8a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 20); c.lineTo(0, -90); c.stroke(); c.fillStyle = '#ffb3c6'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circ(Math.cos(a) * 16, -100 + Math.sin(a) * 16, 13); } c.fillStyle = '#ffd36a'; circ(0, -100, 9); }
  if (kind === 'box') { c.fillStyle = '#1a2b4a'; rr(-30, -26, 60, 46, 6); c.fill(); c.fillStyle = '#d4b04a'; c.fillRect(-30, -6, 60, 5); }
  if (kind === 'necklace') { c.strokeStyle = '#e8d9a8'; c.lineWidth = 3; c.beginPath(); c.arc(0, -10, 34, .2, Math.PI - .2); c.stroke(); c.fillStyle = '#f2e4b0'; circ(0, 24, 7); }
  if (kind === 'test') { c.fillStyle = '#f2f2f2'; rr(-12, -70, 24, 120, 8); c.fill(); c.fillStyle = '#e04a6a'; c.fillRect(-4, -30, 8, 4); c.fillRect(-4, -20, 8, 4); }
  if (kind === 'pen') { c.fillStyle = '#2a4a8a'; rr(-5, -60, 10, 90, 4); c.fill(); }
  c.restore();
}
function umbrella(sw, breath) {
  c.save(); c.translate(sw + 30, -640 + breath);
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 60); c.lineTo(-20, -420); c.stroke();
  c.translate(-20, -420);
  c.fillStyle = '#3a5a8a'; c.beginPath(); c.moveTo(-300, 70); c.quadraticCurveTo(0, -150, 300, 70);
  for (let i = 0; i < 6; i++) c.quadraticCurveTo(300 - i * 100 - 50, 30, 300 - (i + 1) * 100, 70);
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.moveTo(-200, 40); c.quadraticCurveTo(0, -110, 120, 0); c.lineTo(0, -40); c.closePath(); c.fill();
  c.restore();
}

/* ---------- head ---------- */
function head(id, p, of, st, T, wet, seed) {
  const tn = st.turn ?? .42;
  const ex = blendExpr(st.emo || 'neutral', st.emo2 || st.emo || 'neutral', st.emoK || 0);
  const age = p.age || 0;
  const hy = -935;
  const jaw = p.jaw || 1;
  const skin = ex.pale ? mixc(p.skin, '#d8d0d0', ex.pale) : p.skin;
  // ear (on the side away from the face direction)
  if (tn > .08) { c.fillStyle = shade(p.skin, -.06); ell(-50 + tn * 10, hy + 10, 10, 17); c.fillStyle = 'rgba(120,60,40,.25)'; ell(-48 + tn * 10, hy + 12, 5, 9); }
  // face shape
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(-tn * 5, hy - 14, 54, 60, 0, Math.PI * .95, Math.PI * 2.05);
  c.bezierCurveTo(54, hy + 10, 50 * jaw - tn * 4, hy + 40, 26 + tn * 12, hy + 62);
  c.quadraticCurveTo(tn * 18 + 4, hy + 74, -14 + tn * 16, hy + 64);
  c.bezierCurveTo(-40 * jaw + tn * 18, hy + 46, -50 + tn * 10, hy + 18, -54 - tn * 5 + tn * 6, hy - 6);
  c.closePath(); c.fill();
  // skin shading: far side + under-brow
  c.fillStyle = lgrad(-56, 0, 50, 0, [[0, 'rgba(150,80,60,.22)'], [.45, 'rgba(150,80,60,0)']]);
  c.fill();
  // eyes
  const blink = st.blink ?? 1;
  const look = ex.look ? [ex.look[0], ex.look[1]] : (st.gaze || [0, 0]);
  const eyeY = hy - 2, sz = p.eye || 1;
  const eyes = [[22 + tn * 14, 1 + tn * .08], [-19 + tn * 17, 1 - tn * .42]];
  const lidBase = (ex.lid ?? 1) > 1 ? ex.lid : (ex.lid ?? 1) * (p.lids || 1);
  for (const [exX, wk] of eyes) eye(p, exX, eyeY, 21 * sz * wk, 9.5 * sz, lidBase * blink, look, tn, p);
  // brows
  c.strokeStyle = shade(p.hc, .1); c.lineCap = 'round';
  for (const [bx, wk, side] of [[22 + tn * 14, 1, 1], [-19 + tn * 17, 1 - tn * .4, -1]]) {
    const inner = ex.brow[0], outer = ex.brow[1];
    const ix = bx - side * 12 * wk, ox = bx + side * 16 * wk;
    c.lineWidth = p.male ? 5.5 : 4;
    c.beginPath(); c.moveTo(ix, eyeY - 18 - inner * 6); c.quadraticCurveTo(bx, eyeY - 23 - Math.max(inner, outer) * 4, ox, eyeY - 17 - outer * 5); c.stroke();
  }
  // nose
  const nx = tn * 22 + 3;
  c.strokeStyle = 'rgba(140,70,50,.38)'; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(nx - 6, eyeY + 4); c.quadraticCurveTo(nx - 3, eyeY + 20, nx + 3, eyeY + 30); c.stroke();
  c.fillStyle = 'rgba(140,70,50,.22)'; ell(nx - 2, eyeY + 33, 9, 4);
  c.fillStyle = 'rgba(255,255,255,.18)'; ell(nx + 2, eyeY + 24, 3, 5);
  // cheeks
  const blush = (ex.blush || 0) + (st.blush || 0);
  if (blush) { c.fillStyle = `rgba(235,110,120,${.2 * blush})`; ell(24 + tn * 14, eyeY + 26, 16, 8); ell(-20 + tn * 18, eyeY + 26, 12 * (1 - tn * .4), 7); }
  // mouth
  mouthDraw(p, tn, eyeY + 50, ex, st.talk || 0, T);
  // tears
  const tears = Math.max(ex.tears || 0, st.tears || 0);
  if (tears) {
    c.strokeStyle = `rgba(200,225,255,${.65 * tears})`; c.lineWidth = 3;
    for (const [tx, k] of [[22 + tn * 14, 1], [-19 + tn * 17, .7]]) { c.beginPath(); c.moveTo(tx + 4, eyeY + 8); c.quadraticCurveTo(tx + 8, eyeY + 30, tx + 3, eyeY + 30 + 26 * k * tears); c.stroke(); }
    c.fillStyle = `rgba(220,240,255,${.8 * tears})`; ell(26 + tn * 14, eyeY + 9, 7, 2.5);
  }
  if (p.stubble) { c.fillStyle = 'rgba(40,30,30,.14)'; c.beginPath(); c.moveTo(-36 + tn * 16, hy + 30); c.quadraticCurveTo(tn * 18, hy + 80, 44, hy + 20); c.quadraticCurveTo(tn * 18, hy + 56, -36 + tn * 16, hy + 30); c.fill(); }
  if (p.mustache) { c.fillStyle = shade(p.hc, .1); c.beginPath(); c.moveTo(nx - 18, eyeY + 42); c.quadraticCurveTo(nx, eyeY + 34, nx + 18, eyeY + 42); c.quadraticCurveTo(nx, eyeY + 46, nx - 18, eyeY + 42); c.fill(); }
  if (age > 40) { c.strokeStyle = 'rgba(120,60,40,.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(nx + 10, eyeY + 34); c.quadraticCurveTo(nx + 18, eyeY + 48, nx + 14, eyeY + 58); c.stroke(); }
  hairFront(p, tn, wet, T);
  if (st.helmet) { c.fillStyle = '#3a6fc0'; c.beginPath(); c.ellipse(-tn * 4, hy - 30, 66, 60, 0, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(62, hy - 16); c.lineTo(-64, hy - 16); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; ell(-20, hy - 70, 26, 10, -.3); c.strokeStyle = '#222'; c.lineWidth = 3; c.beginPath(); c.moveTo(-50, hy - 14); c.quadraticCurveTo(-30 + tn * 10, hy + 60, 20 + tn * 10, hy + 66); c.stroke(); }
  if (p.glasses) { c.strokeStyle = 'rgba(30,30,30,.85)'; c.lineWidth = 2.5; for (const [gx, wk] of eyes) { rr(gx - 17 * wk, eyeY - 12, 34 * wk, 22, 6); c.stroke(); } c.beginPath(); c.moveTo(eyes[1][0] + 15, eyeY - 4); c.lineTo(eyes[0][0] - 15, eyeY - 4); c.stroke(); }
}

function eye(p, x, y, w, h, open, look, tn, P) {
  open = clamp(open, 0, 1.3);
  const hh = h * open;
  c.save();
  if (open < .12) {
    c.strokeStyle = '#2a1a14'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x - w / 2, y); c.quadraticCurveTo(x, y + 4, x + w / 2, y - 1); c.stroke();
    c.restore(); return;
  }
  // almond
  c.beginPath(); c.moveTo(x - w / 2, y + 1); c.bezierCurveTo(x - w / 4, y - hh * 1.15, x + w / 4, y - hh * 1.2, x + w / 2, y - 1);
  c.bezierCurveTo(x + w / 4, y + hh * .8, x - w / 4, y + hh * .75, x - w / 2, y + 1); c.closePath();
  c.fillStyle = '#f4eee8'; c.fill();
  c.save(); c.clip();
  const ix = x + look[0] * w * .18 + tn * 2.5, iy = y + look[1] * 2.5 - .5;
  const ir = h * .78;
  c.fillStyle = rgrad(ix, iy - 2, 1, ir, [[0, shade(p.iris, .25)], [.6, p.iris], [1, shade(p.iris, -.45)]]); circ(ix, iy, ir);
  c.fillStyle = '#0a0606'; circ(ix, iy, ir * .45);
  c.fillStyle = 'rgba(255,255,255,.9)'; circ(ix - ir * .35, iy - ir * .4, ir * .26); c.fillStyle = 'rgba(255,255,255,.5)'; circ(ix + ir * .35, iy + ir * .35, ir * .12);
  c.fillStyle = 'rgba(60,30,20,.22)'; c.fillRect(x - w, y - hh * 1.3, w * 2, hh * .55);         // lid shadow
  c.restore();
  // upper lid + lashes, crease, lower lid
  c.strokeStyle = '#1e120e'; c.lineWidth = 3.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - w / 2, y + 1); c.bezierCurveTo(x - w / 4, y - hh * 1.15, x + w / 4, y - hh * 1.2, x + w / 2 + 2, y - 2); c.stroke();
  if (!P.male) { c.lineWidth = 2; c.beginPath(); c.moveTo(x + w / 2, y - 2); c.lineTo(x + w / 2 + 5, y - 6); c.moveTo(x + w / 2 - 3, y - hh * .8); c.lineTo(x + w / 2 + 2, y - hh * 1.2); c.stroke(); }
  c.strokeStyle = 'rgba(120,60,40,.35)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - w * .35, y - hh - 4); c.quadraticCurveTo(x, y - hh * 1.5 - 5, x + w * .42, y - hh - 3); c.stroke();
  c.strokeStyle = 'rgba(120,60,40,.3)'; c.beginPath(); c.moveTo(x - w * .35, y + hh * .7); c.quadraticCurveTo(x, y + hh * 1.05, x + w * .4, y + hh * .55); c.stroke();
  c.restore();
}

function mouthDraw(p, tn, y, ex, talk, T) {
  const x = tn * 18 + 2, w = 17 * (1 - tn * .18);
  const curve = ex.mouth || 0, open = Math.max(ex.open || 0, talk);
  const lip = p.male ? '#b07068' : '#c9706e';
  const sm = (ex.smirk || 0);
  if (open > .06) {
    const oh = 3 + open * 13;
    c.fillStyle = '#3a1514'; c.beginPath(); c.moveTo(x - w, y - curve * 3); c.quadraticCurveTo(x, y - 2 - curve * 2, x + w, y - curve * 3 - sm * 3); c.quadraticCurveTo(x, y + oh + curve * 2, x - w, y - curve * 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.moveTo(x - w * .7, y - 1); c.quadraticCurveTo(x, y + 2, x + w * .7, y - 1); c.lineTo(x + w * .6, y + 2 + Math.min(4, oh * .25)); c.quadraticCurveTo(x, y + 4 + Math.min(4, oh * .25), x - w * .6, y + 2 + Math.min(4, oh * .25)); c.fill();
    if (oh > 9) { c.fillStyle = '#b8555a'; ell(x, y + oh * .7, w * .45, oh * .2); }
    c.strokeStyle = lip; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - w, y - curve * 3); c.quadraticCurveTo(x, y - 3 - curve * 2, x + w, y - curve * 3 - sm * 3); c.stroke();
    c.fillStyle = shade(lip, .15, .55); c.beginPath(); c.moveTo(x - w * .8, y + oh * .9); c.quadraticCurveTo(x, y + oh + 6, x + w * .8, y + oh * .9); c.quadraticCurveTo(x, y + oh + 1, x - w * .8, y + oh * .9); c.fill();
  } else {
    c.strokeStyle = shade(lip, -.2); c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - w, y - curve * 4); c.quadraticCurveTo(x, y + curve * 4, x + w, y - curve * 4 - sm * 5); c.stroke();
    c.fillStyle = shade(lip, .1, .5); c.beginPath(); c.moveTo(x - w * .7, y + 2 + Math.max(0, curve) * 2); c.quadraticCurveTo(x, y + 9 + curve * 2, x + w * .7, y + 2 + Math.max(0, curve) * 2); c.quadraticCurveTo(x, y + 4 + curve * 3, x - w * .7, y + 2 + Math.max(0, curve) * 2); c.fill();
  }
}

/* ---------- hair ---------- */
function strands(col, pts, n, len, T, sway = 0) {
  c.strokeStyle = col; c.lineWidth = 2;
  for (let i = 0; i < n; i++) { const [x, y] = pts(i / n); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4 + Math.sin(T * 1.3 + i) * sway, y + len * .5, x + 2 + Math.sin(T + i) * sway * 1.5, y + len); c.stroke(); }
}
function hairBack(p, tn, wet, T) {
  const hc = wet ? shade(p.hc, -.2) : p.hc, hy = -935, sway = wet ? 0 : 3;
  c.fillStyle = hc;
  switch (p.hair) {
    case 'film': case 'film2': {
      const len = p.hair === 'film' ? 350 : 250;
      c.beginPath(); c.moveTo(-70 - tn * 6, hy - 40); c.quadraticCurveTo(-90, hy + 120, -80 + Math.sin(T * .8) * sway, hy + len);
      c.quadraticCurveTo(-10, hy + len + 20, 62, hy + len - 20 + Math.sin(T * .8 + 1) * sway); c.quadraticCurveTo(80, hy + 120, 66, hy - 40); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,255,255,.05)'; ell(-40, hy + 120, 20, 140, .1);
      break;
    }
    case 'fon': { c.beginPath(); c.moveTo(-72, hy - 30); c.quadraticCurveTo(-84, hy + 60, -68, hy + 100); c.lineTo(66, hy + 100); c.quadraticCurveTo(82, hy + 60, 70, hy - 30); c.closePath(); c.fill(); break; }
    case 'mom': case 'bun': { circ(-56 + tn * 4, hy - 30, 30); break; }
    case 'child': { circ(-50, hy - 40, 22); circ(50, hy - 40, 22); break; }
    default: { c.beginPath(); c.ellipse(-tn * 5, hy - 16, 60, 66, 0, Math.PI * .85, Math.PI * 2.15); c.fill(); }
  }
}
function hairFront(p, tn, wet, T) {
  const hc = wet ? shade(p.hc, -.15) : p.hc, hy = -935, hl = shade(p.hc, .35, .55);
  c.fillStyle = hc;
  const crown = () => { c.beginPath(); c.ellipse(-tn * 5, hy - 22, 58, 56, 0, Math.PI * 1.02, Math.PI * 1.98); };
  switch (p.hair) {
    case 'kan': case 'fkan': {
      crown(); c.lineTo(58, hy - 14); c.quadraticCurveTo(20, hy - 44, -10, hy - 40); c.quadraticCurveTo(-40, hy - 34, -58, hy - 4); c.closePath(); c.fill();
      const tufts = p.hair === 'fkan' ? 7 : 6;
      for (let i = 0; i < tufts; i++) {           // fringe strands sweeping toward the far side
        const bx = 46 - i * 17 + tn * 6, by = hy - 58 + Math.abs(i - 2.5) * 3, tipx = bx - 20 - i * 2, tipy = hy - 18 + (i % 2) * 8 + (p.hair === 'fkan' ? 8 : 0);
        c.beginPath(); c.moveTo(bx + 9, by); c.quadraticCurveTo(bx + 4, (by + tipy) / 2 + 6, tipx, tipy); c.quadraticCurveTo(bx - 8, (by + tipy) / 2, bx - 9, by); c.closePath(); c.fill();
      }
      for (const [x0, y0] of [[-44, hy - 62], [-24, hy - 74], [0, hy - 78], [24, hy - 72]]) { c.beginPath(); c.moveTo(x0 - 12, y0 + 8); c.quadraticCurveTo(x0 - 6, y0 - 12, x0 + 4, y0 - 16); c.quadraticCurveTo(x0 + 6, y0 - 2, x0 + 12, y0 + 6); c.closePath(); c.fill(); }
      c.strokeStyle = hl; c.lineWidth = 3; c.beginPath(); c.arc(-tn * 5, hy - 22, 46, Math.PI * 1.22, Math.PI * 1.58); c.stroke();
      c.strokeStyle = shade(p.hc, -.3, .6); c.lineWidth = 1.6; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(30 - i * 16, hy - 56); c.quadraticCurveTo(22 - i * 16, hy - 40, 14 - i * 17, hy - 26); c.stroke(); }
      break;
    }
    case 'film': case 'film2': {
      crown(); c.lineTo(60, hy + 10);
      c.quadraticCurveTo(44, hy - 30, 16 + tn * 8, hy - 34); c.quadraticCurveTo(-6, hy - 26, -20 + tn * 8, hy - 16); c.quadraticCurveTo(-40, hy - 8, -58, hy + 30); c.closePath(); c.fill();
      // side locks framing the face
      c.beginPath(); c.moveTo(54, hy - 10); c.quadraticCurveTo(66, hy + 60, 56 + Math.sin(T) * 2, hy + (p.hair === 'film' ? 170 : 110)); c.lineTo(44, hy + 60); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-56, hy - 6); c.quadraticCurveTo(-64, hy + 70, -50, hy + (p.hair === 'film' ? 180 : 120)); c.lineTo(-44, hy + 40); c.closePath(); c.fill();
      c.strokeStyle = hl; c.lineWidth = 3; c.beginPath(); c.arc(-tn * 5, hy - 22, 48, Math.PI * 1.2, Math.PI * 1.55); c.stroke();
      if (p.hair === 'film2') { c.fillStyle = '#e8c86a'; rr(34, hy - 52, 26, 9, 4); c.fill(); }
      break;
    }
    case 'fon': { crown(); c.lineTo(62, hy - 24); c.quadraticCurveTo(30, hy - 30, 2, hy - 22); c.quadraticCurveTo(-30, hy - 30, -60, hy - 22); c.closePath(); c.fill(); c.strokeStyle = hl; c.lineWidth = 3; c.beginPath(); c.arc(-tn * 5, hy - 22, 48, Math.PI * 1.2, Math.PI * 1.55); c.stroke(); c.fillStyle = '#b07bff'; ell(44, hy - 40, 10, 6); break; }
    case 'tae': case 'ball': { crown(); c.lineTo(56, hy - 22); c.quadraticCurveTo(0, hy - 40, -56, hy - 20); c.closePath(); c.fill(); c.fillStyle = shade(p.hc, .25, .35); ell(0, hy - 50, 40, 10); break; }
    case 'ton': case 'teacher2': { crown(); c.lineTo(58, hy - 18); c.quadraticCurveTo(10, hy - 46, -20, hy - 30); c.quadraticCurveTo(-44, hy - 22, -58, hy - 10); c.closePath(); c.fill(); c.strokeStyle = hl; c.lineWidth = 2.5; c.beginPath(); c.arc(-tn * 5, hy - 22, 46, Math.PI * 1.3, Math.PI * 1.7); c.stroke(); break; }
    case 'kong': { crown(); c.lineTo(58, hy - 4); c.quadraticCurveTo(20, hy - 14, 0, hy - 6); c.quadraticCurveTo(-30, hy - 18, -58, hy); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-20, hy - 40); c.quadraticCurveTo(20, hy - 10, 46, hy - 6); c.lineTo(30, hy - 34); c.closePath(); c.fill(); break; }
    case 'mom': case 'bun': { crown(); c.lineTo(58, hy - 10); c.quadraticCurveTo(30, hy - 50, 2, hy - 44); c.quadraticCurveTo(-30, hy - 50, -58, hy - 10); c.closePath(); c.fill(); c.strokeStyle = hl; c.lineWidth = 2.5; c.beginPath(); c.arc(-tn * 5, hy - 22, 46, Math.PI * 1.2, Math.PI * 1.5); c.stroke(); break; }
    case 'dad': { crown(); c.lineTo(56, hy - 24); c.quadraticCurveTo(0, hy - 52, -56, hy - 20); c.closePath(); c.fill(); c.fillStyle = 'rgba(200,200,200,.35)'; ell(-44, hy - 10, 8, 18); break; }
    case 'bald': { c.fillStyle = hc; c.beginPath(); c.ellipse(-50, hy - 6, 10, 26, 0, 0, Math.PI * 2); c.fill(); ell(52, hy - 6, 6, 20); c.fillStyle = 'rgba(255,255,255,.18)'; ell(-6, hy - 58, 26, 8); break; }
    case 'child': { crown(); c.lineTo(58, hy - 4); c.lineTo(-58, hy - 4); c.closePath(); c.fill(); c.fillStyle = '#ff7a8a'; circ(-46, hy - 46, 8); circ(46, hy - 46, 8); break; }
  }
}
