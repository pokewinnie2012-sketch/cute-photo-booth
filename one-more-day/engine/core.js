/* ONE MORE DAY — core: canvas, math, color, cached layers, post-processing.
   Everything is deterministic in time t so any frame can be rendered on demand. */
'use strict';
const W = 1920, H = 1080;
const BAR = 138;                       // letterbox bars → 2.39:1 picture
const cv = document.getElementById('cv');
let c = cv.getContext('2d');
const FONT = 'Kanit, Loma, sans-serif';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const smooth = t => t * t * (3 - 2 * t);
function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)); }

function hex(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb(a, al = 1) { return `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${al})`; }
function mixc(a, b, t, al = 1) { const A = hex(a), B = hex(b); return rgb(A.map((v, i) => v + (B[i] - v) * t), al); }
function shade(h, k, al = 1) { const A = hex(h); return rgb(k >= 0 ? A.map(v => v + (255 - v) * k) : A.map(v => v * (1 + k)), al); }

function rr(x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function ell(x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); c.fill(); }
function circ(x, y, r) { ell(x, y, r, r); }
function poly(p, fill = true) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); if (fill) c.fill(); }
function lgrad(x0, y0, x1, y1, stops) { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function rgrad(x, y, r0, r1, stops) { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function glow(x, y, r, col, comp = 'lighter') { c.save(); c.globalCompositeOperation = comp; c.fillStyle = rgrad(x, y, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }

/* ---------- text ---------- */
const segmenter = Intl.Segmenter ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
function wrap(ctx, str, maxW) {
  const lines = [];
  for (const para of str.split('\n')) {
    const words = segmenter ? [...segmenter.segment(para)].map(s => s.segment) : para.split(/(\s+)/);
    let line = '';
    for (const w of words) {
      const test = line + w;
      if (/^[\s…!?.,)”"]+$/.test(w)) { line = test; continue; }
      if (ctx.measureText(test).width > maxW && line.trim()) { lines.push(line.trimEnd()); line = w.trimStart(); } else line = test;
    }
    lines.push(line);
  }
  return lines;
}
function text(str, x, y, o = {}) {
  c.save();
  c.font = `${o.italic ? 'italic ' : ''}${o.weight || 500} ${o.size || 40}px ${FONT}`;
  c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
  if (o.spacing) c.letterSpacing = o.spacing + 'px';
  const lines = o.maxW ? wrap(c, str, o.maxW) : str.split('\n');
  const lh = (o.size || 40) * (o.lh || 1.3), y0 = y - (lines.length - 1) * lh / 2;
  c.globalAlpha = o.alpha ?? 1;
  lines.forEach((ln, i) => {
    if (o.shadow) { c.shadowColor = o.shadow; c.shadowBlur = o.shadowBlur || 12; }
    if (o.stroke) { c.lineJoin = 'round'; c.strokeStyle = o.stroke; c.lineWidth = o.strokeW || 6; c.strokeText(ln, x, y0 + i * lh); }
    c.fillStyle = o.color || '#fff'; c.fillText(ln, x, y0 + i * lh);
  });
  c.restore();
  return lines.length;
}

/* ---------- cached layers: paint once at 2x, reuse every frame, with pre-blurred copies for depth of field ---------- */
const LAYERS = new Map();
function layer(key, w, h, paint, scale = 1.5) {
  let L = LAYERS.get(key);
  if (!L) {
    const cnv = document.createElement('canvas'); cnv.width = Math.ceil(w * scale); cnv.height = Math.ceil(h * scale);
    const ctx = cnv.getContext('2d'); ctx.scale(scale, scale);
    withCtx(ctx, paint);
    L = { cnv, w, h, scale, blur: {} };
    LAYERS.set(key, L);
    if (LAYERS.size > 14) LAYERS.delete(LAYERS.keys().next().value);
  }
  return L;
}
function blurred(L, px) {
  px = Math.round(px);
  if (px <= 0) return L.cnv;
  if (!L.blur[px]) {
    const b = document.createElement('canvas'); b.width = L.cnv.width; b.height = L.cnv.height;
    const bx = b.getContext('2d'); bx.filter = `blur(${px * L.scale}px)`; bx.drawImage(L.cnv, 0, 0); L.blur[px] = b;
  }
  return L.blur[px];
}
/* temporarily point the drawing helpers at another context */
let _ctxStack = [];
function withCtx(ctx, fn) { _ctxStack.push(c); c = ctx; try { fn(); } finally { c = _ctxStack.pop(); } }
function drawLayer(L, blurPx = 0, alpha = 1) { c.save(); c.globalAlpha = alpha; c.drawImage(blurred(L, blurPx), 0, 0, L.w, L.h); c.restore(); }

/* ---------- camera ---------- */
function applyCam(cam) { c.translate(W / 2, H / 2); c.rotate(cam.roll || 0); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y); }

/* ---------- post: grade, vignette, grain, letterbox ---------- */
const grainTiles = [];
for (let g = 0; g < 4; g++) {
  const n = document.createElement('canvas'); n.width = n.height = 256; const nx = n.getContext('2d'); const id = nx.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) { const v = hash(i * .37 + g * 999) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 9; }
  nx.putImageData(id, 0, 0); grainTiles.push(n);
}
function grade(g, t) {
  if (!g) return;
  if (g.tint) { c.save(); c.globalCompositeOperation = g.mode || 'soft-light'; c.fillStyle = g.tint; c.fillRect(0, 0, W, H); c.restore(); }
  if (g.lift) { c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = g.lift; c.fillRect(0, 0, W, H); c.restore(); }
  if (g.shadow) { c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = lgrad(0, 0, 0, H, [[0, 'rgba(255,255,255,1)'], [1, g.shadow]]); c.fillRect(0, 0, W, H); c.restore(); }
  if (g.desat) { c.save(); c.globalCompositeOperation = 'saturation'; c.fillStyle = `rgba(128,128,128,${g.desat})`; c.fillRect(0, 0, W, H); c.restore(); }
  if (g.sepia) { c.save(); c.globalCompositeOperation = 'color'; c.fillStyle = `rgba(160,120,80,${g.sepia})`; c.fillRect(0, 0, W, H); c.restore(); }
}
function post(t, fi, o = {}) {
  c.save();
  c.fillStyle = rgrad(W / 2, H / 2, H * .45, H * .95, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${o.vignette ?? .42})`]]); c.fillRect(0, 0, W, H);
  c.fillStyle = c.createPattern(grainTiles[fi % 4], 'repeat'); c.translate(-hash(fi) * 256, -hash(fi + 1) * 256); c.fillRect(0, 0, W + 256, H + 256);
  c.restore();
  c.fillStyle = '#000'; c.fillRect(0, 0, W, BAR); c.fillRect(0, H - BAR, W, BAR);
}
