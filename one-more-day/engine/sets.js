/* ONE MORE DAY — sets: painted once per (set, time of day, weather) into a cached layer; light & weather animate on top. */
'use strict';

const TOD = {
  morning: { sky: ['#8fc0ea', '#cfe4f4', '#f8e6cf'], sun: '#fff3d6', amb: '255,232,205', rim: '255,236,200', wall: .02, dir: -1, shadowA: .26, grade: { tint: 'rgba(255,214,170,.18)', lift: 'rgba(30,40,70,.06)' } },
  day:     { sky: ['#6fa8e2', '#b9d8f2', '#e8f2fa'], sun: '#ffffff', amb: '255,250,240', rim: '255,255,240', wall: 0, dir: -1, shadowA: .24, grade: { tint: 'rgba(255,240,220,.1)' } },
  dusk:    { sky: ['#4a5d98', '#c9809a', '#f7b27a'], sun: '#ffd09a', amb: '255,170,120', rim: '255,170,110', wall: -.06, dir: 1, shadowA: .34, grade: { tint: 'rgba(255,150,90,.22)', shadow: 'rgba(60,40,90,.35)' } },
  golden:  { sky: ['#5a6aa0', '#e89a7c', '#ffd08a'], sun: '#ffe0a8', amb: '255,190,130', rim: '255,200,130', wall: -.02, dir: 1, shadowA: .3, grade: { tint: 'rgba(255,170,90,.24)' } },
  night:   { sky: ['#060a1e', '#141c3e', '#2a3058'], sun: '#dfe8ff', amb: '120,140,210', rim: '150,180,255', wall: -.45, dir: -1, shadowA: .45, grade: { tint: 'rgba(40,60,140,.28)', shadow: 'rgba(10,15,40,.5)' } },
};
function todOf(o) { return TOD[o.tod] || TOD.day; }

/* ---------- painting helpers (draw into whatever context `c` points at) ---------- */
function sky(w, h, tod, o = {}) {
  c.fillStyle = lgrad(0, 0, 0, h, [[0, tod.sky[0]], [.55, tod.sky[1]], [1, tod.sky[2]]]); c.fillRect(0, 0, w, h);
  if (o.sun !== false) {
    const sx = o.sunX ?? w * .78, sy = o.sunY ?? (tod === TOD.dusk || tod === TOD.golden ? h * .78 : h * .22);
    glow(sx, sy, tod === TOD.night ? 160 : 520, tod === TOD.night ? 'rgba(200,215,255,.35)' : 'rgba(255,240,210,.55)', 'source-over');
    c.fillStyle = tod.sun; circ(sx, sy, tod === TOD.night ? 34 : 46);
  }
  if (tod === TOD.night) for (let i = 0; i < 220; i++) { c.fillStyle = `rgba(255,255,245,${.25 + hash(i) * .6})`; circ(hash(i + 1) * w, hash(i + 2) * h * .8, .6 + hash(i + 3) * 1.6); }
  else for (let i = 0; i < 9; i++) cloud(hash(i * 3) * w, h * (.1 + hash(i * 7) * .4), 120 + hash(i) * 180, tod);
}
function cloud(x, y, s, tod) {
  const col = tod === TOD.dusk || tod === TOD.golden ? 'rgba(255,205,190,.55)' : 'rgba(255,255,255,.7)';
  c.fillStyle = col;
  for (let k = 0; k < 6; k++) ell(x + (hash(x + k) - .5) * s * 1.6, y + (hash(y + k) - .5) * s * .25, s * (.35 + hash(k + x) * .35), s * (.18 + hash(k + y) * .12));
}
function haze(y0, y1, col) { c.fillStyle = lgrad(0, y0, 0, y1, [[0, 'rgba(0,0,0,0)'], [1, col]]); c.fillRect(-2000, y0, 8000, y1 - y0); }
function skyline(w, base, tod, layers = 2) {
  for (let L = 0; L < layers; L++) {
    const col = tod === TOD.night ? ['#141a34', '#0d1226'][L] : (tod === TOD.dusk || tod === TOD.golden ? ['#9a7f9a', '#7a6584'][L] : ['#a9bccf', '#8fa3ba'][L]);
    for (let i = 0; i < w / 70; i++) {
      const bw = 60 + hash(i * 3 + L) * 90, bh = 90 + hash(i + 11 + L * 5) * (L ? 260 : 180), x = i * 80 - 40 + L * 30;
      c.fillStyle = col; c.fillRect(x, base - bh, bw, bh + 4);
      if (tod === TOD.night) for (let k = 0; k < 6; k++) if (hash(i * 9 + k + L) > .55) { c.fillStyle = 'rgba(255,214,150,.75)'; c.fillRect(x + 8 + (k % 3) * 18, base - bh + 14 + Math.floor(k / 3) * 26, 8, 12); }
    }
  }
}
function tree(x, y, s, tod, kind = 'round') {
  const dark = tod === TOD.night ? .55 : 0;
  c.fillStyle = mixc('#5a4030', '#0a0a10', dark); c.beginPath(); c.moveTo(x - 14 * s, y); c.quadraticCurveTo(x - 6 * s, y - 120 * s, x - 10 * s, y - 220 * s); c.lineTo(x + 10 * s, y - 220 * s); c.quadraticCurveTo(x + 8 * s, y - 120 * s, x + 16 * s, y); c.fill();
  const g = [mixc('#2f6a3a', '#0a1410', dark), mixc('#3f8a4a', '#101c18', dark), mixc('#6fb26a', '#1a2a24', dark)];
  for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) {
    const a = hash(x + i * 7 + k) * Math.PI * 2, r = (60 + hash(i + x) * 50) * s;
    c.fillStyle = g[k]; circ(x + Math.cos(a) * r * (1 - k * .25) - (k - 1) * 14 * s, y - 260 * s + Math.sin(a) * r * .6 - k * 16 * s, (70 - k * 14) * s);
  }
}
function windowRect(x, y, w, h, tod, o = {}) {
  c.fillStyle = o.frame || '#e8e4dc'; c.fillRect(x - 10, y - 10, w + 20, h + 20);
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = lgrad(0, y, 0, y + h, [[0, tod.sky[0]], [1, tod.sky[2]]]); c.fillRect(x, y, w, h);
  if (o.view === 'trees') { for (let i = 0; i < 5; i++) tree(x + 40 + i * w / 4, y + h + 60, .7, tod); }
  if (o.view === 'city') skyline(w * 2, y + h, tod, 2);
  if (tod === TOD.night) for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(255,255,240,.7)'; circ(x + hash(i) * w, y + hash(i + 5) * h * .6, 1.2); }
  c.restore();
  c.fillStyle = o.frame || '#e8e4dc'; c.fillRect(x + w / 2 - 5, y, 10, h); c.fillRect(x, y + h * .45, w, 8);
  if (tod !== TOD.night) { c.fillStyle = 'rgba(255,255,255,.12)'; poly([x, y, x + w * .35, y, x, y + h * .6]); }
}
function lightShaft(x, y, w, h, dx, col) { c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = lgrad(x, y, x + dx, y + h, [[0, col], [1, 'rgba(0,0,0,0)']]); poly([x, y, x + w, y, x + w + dx, y + h, x + dx, y + h]); c.restore(); }
function planks(y0, y1, w, col) {
  c.fillStyle = col; c.fillRect(0, y0, w, y1 - y0);
  c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 2;
  for (let i = 0; i < 14; i++) { const k = Math.pow(i / 14, 1.7), y = lerp(y0, y1, k); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.fillStyle = lgrad(0, y0, 0, y1, [[0, 'rgba(0,0,0,.18)'], [1, 'rgba(255,255,255,.05)']]); c.fillRect(0, y0, w, y1 - y0);
}
function tiles(y0, y1, w, col, line = 'rgba(0,0,0,.08)') {
  c.fillStyle = col; c.fillRect(0, y0, w, y1 - y0);
  c.strokeStyle = line; c.lineWidth = 2;
  for (let i = 0; i < 10; i++) { const y = lerp(y0, y1, Math.pow(i / 10, 1.6)); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let i = -20; i < 40; i++) { c.beginPath(); c.moveTo(w / 2 + i * 60, y0); c.lineTo(w / 2 + i * 150, y1); c.stroke(); }
}
function wall(w, y0, y1, col, tod) { c.fillStyle = lgrad(0, y0, 0, y1, [[0, shade(col, -.06 + tod.wall)], [1, shade(col, tod.wall)]]); c.fillRect(0, y0, w, y1 - y0); }
function deskSchool(x, y, s = 1) { c.fillStyle = '#b98a58'; rr(x - 120 * s, y, 240 * s, 18 * s, 4); c.fill(); c.fillStyle = '#8a6440'; c.fillRect(x - 110 * s, y + 18 * s, 220 * s, 80 * s); c.fillStyle = '#555'; c.fillRect(x - 100 * s, y + 98 * s, 10 * s, 120 * s); c.fillRect(x + 90 * s, y + 98 * s, 10 * s, 120 * s); }
function chair(x, y, s = 1, col = '#8a6440') { c.fillStyle = col; rr(x - 50 * s, y - 120 * s, 100 * s, 120 * s, 8); c.fill(); c.fillRect(x - 55 * s, y, 110 * s, 14 * s); c.fillStyle = '#444'; c.fillRect(x - 48 * s, y + 14 * s, 8 * s, 110 * s); c.fillRect(x + 40 * s, y + 14 * s, 8 * s, 110 * s); }
function tableTop(x, y, w, col = '#c9a77c', leg = '#6a4a30') { c.fillStyle = shade(col, -.15); rr(x - w / 2, y, w, 22, 6); c.fill(); c.fillStyle = col; rr(x - w / 2, y - 6, w, 16, 6); c.fill(); c.fillStyle = leg; c.fillRect(x - w / 2 + 20, y + 22, 14, 180); c.fillRect(x + w / 2 - 34, y + 22, 14, 180); }
function shelfBooks(x, y, w, h, rows = 4) {
  c.fillStyle = '#6a4a34'; c.fillRect(x, y, w, h);
  for (let r = 0; r < rows; r++) {
    const ry = y + 12 + r * (h - 24) / rows, rh = (h - 24) / rows - 14;
    c.fillStyle = '#3a2820'; c.fillRect(x + 8, ry + rh, w - 16, 10);
    for (let bx = x + 12; bx < x + w - 24;) { const bw = 12 + hash(bx + r) * 18, bh = rh * (.65 + hash(bx * 3 + r) * .35); c.fillStyle = ['#8a3a3a', '#3a5a8a', '#4a7a4a', '#a88a3a', '#6a4a7a', '#d8cfc0'][Math.floor(hash(bx + r * 7) * 6)]; c.fillRect(bx, ry + rh - bh, bw, bh); bx += bw + 2; }
  }
}
function extras(t, n, y, s, area, seed = 0, tod) {
  for (let i = 0; i < n; i++) {
    const x = area[0] + ((hash(i + seed) * (area[1] - area[0]) + t * (30 + hash(i * 3) * 40) * (i % 2 ? 1 : -1)) % (area[1] - area[0]) + (area[1] - area[0])) % (area[1] - area[0]);
    c.save(); c.globalAlpha = .85;
    const id = ['tae', 'fon', 'ton', 'ball', 'kong', 'film'][i % 6];
    drawPerson(id, { x, y: y + (i % 3) * 18, s: s * (.9 + (i % 3) * .06), face: i % 2 ? 1 : -1, walk: t * 5 + i, fast: true, age: 'teen', emo: 'neutral', blink: 1 }, t + i);
    if (tod === TOD.night) { c.fillStyle = 'rgba(10,12,24,.6)'; }
    c.restore();
  }
}
function rainFx(t, k = 1, area = [0, 0, W, H]) {
  c.save(); c.strokeStyle = 'rgba(190,205,235,.35)'; c.lineWidth = 2;
  for (let i = 0; i < 260 * k; i++) {
    const x = area[0] + ((hash(i) * 1.3 * area[2] + t * 160) % (area[2] * 1.2)) - 80, y = area[1] + ((hash(i + 5) * area[3] + t * 2300 * (.8 + hash(i + 9) * .4)) % area[3]);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 46); c.stroke();
  }
  c.restore();
}
function dust(t, col = 'rgba(255,240,210,') {
  for (let i = 0; i < 40; i++) { const x = (hash(i) * W + Math.sin(t * .3 + i) * 40) % W, y = (hash(i + 3) * H + Math.cos(t * .2 + i) * 30); c.fillStyle = col + (.15 + .25 * Math.abs(Math.sin(t + i))) + ')'; circ(x, y, 1.5 + hash(i + 7) * 2); }
}

/* ---------- the sets ---------- */
const SETS = {};
function defSet(id, def) { SETS[id] = Object.assign({ w: W, floor: 905, horizon: 640, scale: 1, light: o => { const td = todOf(o); return { dir: td.dir, rim: td.rim, amb: td.amb, shadowA: td.shadowA }; } }, def); }

defSet('road', {
  w: 2600, horizon: 760,
  paint(o) {
    const td = todOf(o), w = 2600;
    sky(w, 760, td, { sunX: w * .7 });
    skyline(w, 700, td, 2);
    haze(400, 720, td === TOD.night ? 'rgba(40,50,90,.4)' : 'rgba(255,240,230,.35)');
    for (let i = 0; i < 7; i++) tree(120 + i * 380, 740, .9 + hash(i) * .3, td);
    c.fillStyle = td === TOD.night ? '#2a2c34' : '#8f8c88'; c.fillRect(0, 740, w, 60);                       // far sidewalk
    c.fillStyle = td === TOD.night ? '#16181f' : '#4a4c52'; c.fillRect(0, 790, w, 300);                      // road
    c.fillStyle = 'rgba(255,255,255,.75)'; for (let x = 0; x < w; x += 180) c.fillRect(x, 905, 100, 10);
    c.fillStyle = 'rgba(240,240,240,.85)'; for (let i = 0; i < 9; i++) c.fillRect(1180 + i * 36, 800, 22, 280);   // crosswalk
    for (let i = 0; i < 6; i++) { const x = 200 + i * 460; c.fillStyle = '#2a2a30'; c.fillRect(x - 5, 420, 10, 330); c.fillRect(x - 5, 420, 70, 8); c.fillStyle = td === TOD.night ? '#ffe3a8' : '#ccc'; ell(x + 66, 430, 16, 8); }
  },
  dyn(t, o) {
    const td = todOf(o);
    if (td === TOD.night) for (let i = 0; i < 6; i++) glow(200 + i * 460 + 66, 436, 220, 'rgba(255,200,130,.32)');
    if (o.wx === 'rain') { c.fillStyle = 'rgba(160,180,220,.07)'; c.fillRect(0, 790, 2600, 300); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,210,150,.08)'; ell(200 + i * 460 + 66, 900, 70, 200); } }
    if (o.cars !== false) for (let i = 0; i < 2; i++) { const x = ((t * (240 + i * 120) + i * 1300) % 3600) - 500, y = 830 + i * 34; c.fillStyle = 'rgba(20,22,30,.85)'; rr(x, y - 50, 260, 60, 18); c.fill(); rr(x + 50, y - 90, 150, 50, 16); c.fill(); if (td === TOD.night || o.wx === 'rain') { glow(x + 250, y - 26, 140, 'rgba(255,240,200,.5)'); glow(x + 6, y - 26, 60, 'rgba(255,60,60,.5)'); } }
  },
  front(t, o) { if (o.wx === 'rain') rainFx(t, 1.2, [0, 0, 2600, 1080]); },
});
defSet('crossing', Object.assign({}, SETS.road, { paint(o) { SETS.road.paint(Object.assign({}, o, {})); } }));

defSet('bedroom', {
  paint(o) {
    const td = todOf(o);
    wall(W, 0, 820, o.age === 'teen' ? '#cfe0ea' : '#dcd6cc', td);
    planks(820, H, W, '#b48a62');
    windowRect(180, 260, 420, 380, td, { view: 'trees' });
    c.fillStyle = '#f2a9b6'; poly([150, 230, 260, 230, 230, 690, 130, 690]); poly([520, 230, 630, 230, 650, 690, 550, 690]); c.fillStyle = '#8a6a50'; c.fillRect(140, 222, 500, 12);
    // poster of Gemini, shelf, desk
    c.fillStyle = '#18213e'; rr(860, 250, 200, 270, 8); c.fill(); c.strokeStyle = '#e7d6a8'; c.lineWidth = 5; rr(860, 250, 200, 270, 8); c.stroke();
    c.strokeStyle = 'rgba(200,215,255,.8)'; c.lineWidth = 2; const G = [[930, 300], [970, 320], [940, 360], [985, 380], [925, 430], [970, 425], [910, 480], [960, 490]]; c.beginPath(); [[0, 2], [2, 4], [4, 6], [1, 3], [3, 5], [5, 7], [2, 3]].forEach(([a, b]) => { c.moveTo(...G[a]); c.lineTo(...G[b]); }); c.stroke(); G.forEach(([x, y], i) => { c.fillStyle = '#fff6d0'; circ(x, y, i < 2 ? 6 : 3.5); });
    shelfBooks(1180, 300, 300, 200, 2);
    c.fillStyle = '#9a7650'; c.fillRect(1500, 600, 340, 24); c.fillStyle = '#7a5a3a'; c.fillRect(1510, 624, 20, 200); c.fillRect(1810, 624, 20, 200);
    c.fillStyle = '#e8e2d6'; rr(1560, 520, 120, 80, 6); c.fill();
    // bed
    c.fillStyle = '#7a5a40'; rr(240, 640, 40, 280, 8); c.fill();
    c.fillStyle = '#f2efe8'; rr(270, 770, 980, 120, 18); c.fill(); c.fillStyle = '#6a4a34'; c.fillRect(270, 880, 980, 40);
    c.fillStyle = '#ffffff'; rr(300, 720, 240, 76, 30); c.fill();
    if (o.mess) { for (let i = 0; i < 26; i++) { c.save(); c.translate(200 + hash(i) * 1500, 860 + hash(i + 3) * 180); c.rotate(hash(i + 1) * 3); c.fillStyle = '#f4f1ea'; c.fillRect(-40, -28, 80, 56); c.restore(); } }
  },
  dyn(t, o) { const td = todOf(o); if (td !== TOD.night) lightShaft(180, 260, 420, 620, 560, 'rgba(255,236,190,.18)'); else glow(1620, 560, 260, 'rgba(255,200,140,.18)'); },
  front(t, o) { c.fillStyle = '#86b2dc'; if (o.blanket) { rr(440, 668, 800, 250, 46); c.fill(); c.fillStyle = 'rgba(255,255,255,.18)'; rr(440, 668, 800, 26, 13); c.fill(); c.strokeStyle = 'rgba(40,70,110,.18)'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(560 + i * 170, 700); c.quadraticCurveTo(600 + i * 170, 800, 570 + i * 170, 910); c.stroke(); } } },
});
defSet('dorm', Object.assign({}, { paint(o) { SETS.bedroom.paint(Object.assign({}, o, { age: 'adult' })); c.fillStyle = '#4a4a52'; rr(1520, 470, 200, 130, 8); c.fill(); c.fillStyle = o.tod === 'night' ? '#9cc8ff' : '#cfe0f0'; rr(1532, 482, 176, 106, 4); c.fill(); }, dyn: (t, o) => { SETS.bedroom.dyn(t, o); if (o.tod === 'night') glow(1620, 535, 320, 'rgba(140,190,255,.22)'); } }));
SETS.dorm = Object.assign({}, SETS.bedroom, SETS.dorm, { front: SETS.bedroom.front });

defSet('house', {
  w: 2400,
  paint(o) {
    const td = todOf(o), w = 2400;
    sky(w, 700, td);
    for (let i = 0; i < 6; i++) {
      const x = i * 420 - 60, h = 460 + hash(i + 3) * 120;
      c.fillStyle = ['#efe0c8', '#e4d6e6', '#d8e6d4', '#f0d8c0', '#dde4f0', '#f2e6c4'][i]; c.fillRect(x, 820 - h, 400, h);
      c.fillStyle = '#a65c48'; poly([x - 20, 820 - h, x + 200, 820 - h - 110, x + 420, 820 - h]);
      windowRect(x + 50, 820 - h + 80, 110, 110, td, { frame: '#f4efe6' }); windowRect(x + 240, 820 - h + 80, 110, 110, td, { frame: '#f4efe6' });
      c.fillStyle = '#6e8a5a'; c.fillRect(x + 20, 700, 360, 120); for (let k = 0; k < 4; k++) { c.fillStyle = '#4f8a4a'; circ(x + 60 + k * 90, 696, 44); }
      c.fillStyle = '#5a5a60'; c.fillRect(x + 150, 640, 110, 180);
    }
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(0, 210 + i * 20); for (let x = 0; x <= w; x += 600) c.quadraticCurveTo(x + 300, 270 + i * 20, x + 600, 210 + i * 20); c.stroke(); }
    c.fillStyle = '#8a8a8a'; for (let x = 400; x <= w; x += 600) c.fillRect(x - 8, 160, 16, 680);
    c.fillStyle = '#9a9a9e'; c.fillRect(0, 820, w, 70); c.fillStyle = '#5a5c62'; c.fillRect(0, 890, w, 200);
    c.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 0; x < w; x += 220) c.fillRect(x, 1000, 120, 10);
    c.fillStyle = '#1f6fb0'; rr(1720, 560, 150, 60, 8); c.fill(); text('ซอย 7', 1795, 591, { size: 34, color: '#fff' });
  },
});
defSet('gate', {
  w: 2200,
  paint(o) {
    const td = todOf(o), w = 2200;
    sky(w, 640, td);
    c.fillStyle = shade('#ece2d0', td.wall); c.fillRect(0, 300, w, 520);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 18; k++) { c.fillStyle = td === TOD.night ? '#20283e' : shade('#7ea4c4', td.wall); c.fillRect(40 + k * 120, 340 + r * 110, 80, 70); }
    c.fillStyle = shade('#b4553e', td.wall); c.fillRect(0, 286, w, 20);
    for (const x of [140, 600, 1500, 2050]) tree(x, 860, 1.1, td);
    c.fillStyle = '#c9c2b6'; c.fillRect(0, 820, w, 270);
    c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 8; i++) c.fillRect(0, 840 + i * 30, w, 2);
    c.fillStyle = '#e9e5dd'; c.fillRect(700, 540, 70, 300); c.fillRect(1420, 540, 70, 300);
    c.fillStyle = '#1f3270'; rr(660, 460, 870, 110, 12); c.fill(); c.strokeStyle = '#e7c35a'; c.lineWidth = 6; rr(670, 470, 850, 90, 10); c.stroke();
    text(o.sign || 'โรงเรียนมัธยม', 1095, 516, { size: 46, weight: 600, color: '#f3d36b' });
  },
  dyn(t, o) { if (o.crowd !== false) extras(t, 5, 820, .62, [0, 2200], 3, todOf(o)); },
});
defSet('classroom', {
  paint(o) {
    const td = todOf(o);
    wall(W, 0, 830, '#dde6d6', td); planks(830, H, W, '#a87c50');
    c.fillStyle = '#7b5734'; rr(520, 230, 880, 400, 12); c.fill(); c.fillStyle = '#22473b'; c.fillRect(538, 248, 844, 364);
    text('สู้ ๆ นะ ม.4', 960, 330, { size: 44, weight: 400, color: 'rgba(240,245,235,.85)' });
    for (let i = 0; i < 3; i++) windowRect(40 + i * 0, 220, 300, 420, td, { view: 'trees' });
    c.fillStyle = '#2b4a9a'; rr(860, 150, 200, 64, 10); c.fill(); text('ม.4/3', 960, 182, { size: 34, color: '#fff' });
    c.fillStyle = '#fff'; circ(1600, 200, 46); c.strokeStyle = '#333'; c.lineWidth = 5; c.beginPath(); c.arc(1600, 200, 46, 0, 7); c.stroke();
    for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) deskSchool(420 + k * 380 + r * 60, 700 + r * 40, .8 + r * .1);
  },
  dyn(t, o) { if (todOf(o) !== TOD.night) lightShaft(40, 220, 300, 640, 700, 'rgba(255,236,190,.16)'); dust(t); },
  front(t, o) { deskSchool(560, 830, 1.25); deskSchool(1380, 830, 1.25); },
});
defSet('hall', {
  horizon: 700,
  paint(o) {
    const td = todOf(o);
    c.fillStyle = lgrad(0, 0, 0, H, [[0, '#2a1d2c'], [1, '#3a2a30']]); c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffe9cc'; c.fillRect(300, 160, 1320, 520); c.fillStyle = '#b0203a'; poly([0, 120, 360, 120, 300, 700, 0, 700]); poly([W, 120, 1560, 120, 1620, 700, W, 700]); c.fillRect(0, 100, W, 70);
    c.fillStyle = '#ff9ab5'; rr(560, 220, 800, 120, 18); c.fill(); text('กิจกรรม Buddy ม.4', 960, 280, { size: 54, weight: 600, color: '#fff' });
    c.fillStyle = '#5a3a2a'; c.fillRect(0, 680, W, 50);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) { const x = 60 + i * 160 + (r % 2) * 80, y = 760 + r * 90; c.fillStyle = '#f2efe8'; rr(x - 54, y + 10, 108, 120, 40); c.fill(); c.fillStyle = ['#17120f', '#2b1913', '#121212', '#3a2a20'][(i + r) % 4]; ell(x, y, 46, 50); }
  },
  dyn(t) { glow(960, 300, 900, 'rgba(255,230,190,.08)'); },
  front() { c.fillStyle = '#4a2a20'; c.fillRect(0, 930, W, 160); c.fillStyle = '#5e382a'; for (let i = 0; i < 13; i++) rr(i * 152, 905, 140, 60, 12), c.fill(); },
  floor: 1000, scale: .9,
});
defSet('courtyard', {
  w: 2400,
  paint(o) {
    const td = todOf(o), w = 2400;
    sky(w, 700, td);
    c.fillStyle = shade('#ece2d0', td.wall); c.fillRect(0, 260, w, 520);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 20; k++) { c.fillStyle = td === TOD.night ? '#20283e' : shade('#7ea4c4', td.wall); c.fillRect(30 + k * 120, 300 + r * 110, 80, 70); }
    c.fillStyle = shade('#b4553e', td.wall); c.fillRect(0, 246, w, 20);
    for (const x of [120, 900, 1700, 2300]) tree(x, 840, 1.2, td);
    c.fillStyle = mixc('#9ccf7a', '#2a3a2a', td === TOD.night ? .7 : 0); c.fillRect(0, 780, w, 320);
    c.fillStyle = '#d8cfbf'; poly([600, 780, 1500, 780, 1900, 1080, 300, 1080]);
  },
  dyn(t, o) { extras(t, 3, 790, .5, [0, 2400], 9, todOf(o)); },
});
defSet('field', Object.assign({}, { w: 2400, paint(o) { const td = todOf(o), w = 2400; sky(w, 760, td, { sunX: 1700 }); skyline(w, 700, td, 1); for (const x of [200, 760, 1500, 2200]) tree(x, 760, 1, td); c.fillStyle = mixc('#8cc06a', '#2a3a2a', td === TOD.night ? .7 : 0); c.fillRect(0, 740, w, 360); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 6; c.beginPath(); c.ellipse(1200, 980, 1100, 220, 0, 0, Math.PI * 2); c.stroke(); } }));
defSet('corridor', {
  w: 2600,
  paint(o) {
    const td = todOf(o), w = 2600;
    wall(w, 0, 820, '#e6e0d2', td);
    for (let i = 0; i < 7; i++) { windowRect(80 + i * 380, 200, 240, 360, td, { view: 'trees' }); }
    c.fillStyle = '#b8b0a2'; c.fillRect(0, 600, w, 20);
    tiles(820, H, w, '#cfc6b6');
    for (let i = 0; i < 4; i++) { c.fillStyle = '#8a5a34'; c.fillRect(300 + i * 640, 420, 160, 400); }
  },
  dyn(t, o) { if (todOf(o) !== TOD.night) for (let i = 0; i < 7; i++) lightShaft(80 + i * 380, 200, 240, 640, 420, 'rgba(255,230,180,.12)'); },
});
defSet('pavilion', {
  w: 2400,
  paint(o) {
    const td = todOf(o), w = 2400;
    sky(w, 700, td); for (const x of [100, 700, 1400, 2100]) tree(x, 760, 1.1, td);
    c.fillStyle = mixc('#9ccf7a', '#2a3a2a', td === TOD.night ? .7 : 0); c.fillRect(0, 740, w, 340);
    c.fillStyle = '#7a5a40'; for (const x of [260, 2140]) c.fillRect(x, 220, 40, 680);
    c.fillStyle = '#9a4a3a'; poly([160, 240, 1200, 90, 2240, 240, 2240, 270, 160, 270]);
    c.fillStyle = '#d8c8b0'; c.fillRect(200, 880, 2000, 40);
  },
  front(t, o) { tableTop(1150, 760, 1700, '#d8c4a4', '#6a4a30'); },
});
defSet('lab', {
  paint(o) {
    const td = todOf(o);
    wall(W, 0, 830, '#dcece2', td); tiles(830, H, W, '#bdb5a6');
    windowRect(1000, 200, 760, 470, td, { view: 'city' });
    c.fillStyle = '#9a7a5a'; for (let r = 0; r < 3; r++) c.fillRect(60, 280 + r * 160, 520, 14);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) { const x = 90 + i * 70, y = 280 + r * 160; c.fillStyle = ['#7fd0c0', '#f2a0b8', '#a8c8ff', '#ffd27a'][(i + r) % 4]; rr(x - 18, y - 66, 36, 66, 8); c.fill(); }
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 7; c.beginPath(); c.moveTo(1500, 560); c.lineTo(1460, 820); c.moveTo(1500, 560); c.lineTo(1550, 820); c.moveTo(1500, 560); c.lineTo(1505, 820); c.stroke();
    c.save(); c.translate(1500, 552); c.rotate(-.55); c.fillStyle = '#f2f2f6'; rr(-150, -24, 290, 48, 20); c.fill(); c.fillStyle = '#3a6ab0'; c.fillRect(-150, -24, 46, 48); c.restore();
  },
  dyn(t, o) { if (todOf(o) === TOD.night) glow(960, 160, 700, 'rgba(255,240,210,.12)'); else lightShaft(1000, 200, 760, 640, -500, 'rgba(255,214,170,.14)'); },
  front(t, o) { c.fillStyle = '#23272e'; rr(500, 830, 920, 30, 6); c.fill(); c.fillStyle = '#e6dfd2'; c.fillRect(512, 860, 896, 240); if (o.spill) { c.fillStyle = 'rgba(192,112,255,.75)'; ell(980, 834, 160 * o.spill, 14); } else { c.fillStyle = 'rgba(200,235,255,.75)'; rr(940, 740, 60, 92, 10); c.fill(); c.fillStyle = '#c070ff'; c.fillRect(946, 790, 48, 38); } c.fillStyle = 'rgba(200,235,255,.75)'; rr(640, 760, 56, 72, 10); c.fill(); },
});
defSet('filmhouse', {
  w: 2400,
  paint(o) {
    const td = todOf(o), w = 2400;
    sky(w, 700, td);
    c.fillStyle = shade('#efe6d6', td.wall); c.fillRect(1000, 240, 1100, 600); c.fillStyle = shade('#7a4a3a', td.wall); poly([960, 250, 1550, 90, 2140, 250]);
    windowRect(1120, 380, 220, 200, td, { frame: '#fff' }); windowRect(1780, 380, 220, 200, td, { frame: '#fff' });
    c.fillStyle = '#6a4a34'; c.fillRect(1460, 520, 180, 320);
    c.fillStyle = '#8a8a8e'; c.fillRect(0, 690, w, 30); for (let x = 0; x < w; x += 60) c.fillRect(x, 600, 10, 100);
    for (const x of [200, 700]) tree(x, 760, 1.1, td);
    c.fillStyle = '#a8a49c'; c.fillRect(0, 820, w, 270); c.fillStyle = '#c4c0b8'; c.fillRect(0, 820, w, 30);
    if (o.porch !== false) { c.fillStyle = '#9a7650'; c.fillRect(1300, 760, 500, 30); }
  },
  dyn(t, o) {
    const td = todOf(o);
    if (td === TOD.night || o.tod === 'dusk') glow(1550, 560, 300, 'rgba(255,200,130,.25)');
    if (o.police) { c.fillStyle = '#f2f2f2'; rr(1780, 760, 420, 110, 30); c.fill(); rr(1860, 700, 240, 80, 24); c.fill(); c.fillStyle = '#1f3a7a'; c.fillRect(1790, 800, 400, 22); c.fillStyle = '#2a2a2a'; circ(1860, 870, 34); circ(2110, 870, 34); c.fillStyle = Math.sin(t * 8) > 0 ? '#e33' : '#36f'; rr(1950, 686, 60, 16, 6); c.fill(); }
  },
});
defSet('dining', {
  paint(o) {
    const td = todOf(o);
    wall(W, 0, 820, '#efe2cc', td); planks(820, H, W, '#9a7250');
    windowRect(140, 220, 380, 340, td, { view: 'trees' });
    c.fillStyle = '#f2f2ec'; rr(1300, 320, 440, 300, 10); c.fill(); c.fillStyle = '#8a8a8a'; rr(1320, 340, 400, 120, 6); c.fill();
    c.fillStyle = '#c9b089'; c.fillRect(1240, 620, 560, 200);
    c.fillStyle = '#6a4a34'; rr(820, 120, 280, 40, 8); c.fill(); glow(960, 200, 420, 'rgba(255,214,150,.3)', 'source-over');
  },
  dyn(t, o) { glow(960, 220, 700, 'rgba(255,200,130,.12)'); },
  front(t, o) { tableTop(900, 800, 900, '#b8875a', '#5a3a24'); c.fillStyle = '#f4f1ea'; ell(780, 798, 70, 16); ell(1020, 798, 70, 16); c.fillStyle = '#e8a04a'; ell(780, 794, 44, 8); },
});
defSet('bookstore', {
  paint(o) { const td = todOf(o); wall(W, 0, 830, '#efe6d6', td); planks(830, H, W, '#a07c58'); for (let i = 0; i < 6; i++) shelfBooks(40 + i * 320, 160, 300, 640, 5); },
  dyn(t) { glow(960, 100, 900, 'rgba(255,230,190,.1)'); },
  front(t) { c.fillStyle = '#7a5a40'; rr(1500, 800, 420, 280, 8); c.fill(); for (let i = 0; i < 4; i++) { c.fillStyle = ['#8a3a3a', '#3a5a8a', '#d8cfc0', '#4a7a4a'][i]; c.fillRect(1520 + i * 96, 780, 86, 22); } },
});
defSet('street', {
  w: 3000,
  paint(o) {
    const td = todOf(o), w = 3000;
    sky(w, 640, td, { sunX: 2200 });
    for (let i = 0; i < 9; i++) { const x = i * 340, h = 420 + hash(i) * 200, col = ['#d8c6b0', '#c9d4dc', '#e2cfc6', '#cfd8c6'][i % 4];
      c.fillStyle = shade(col, td.wall); c.fillRect(x, 820 - h, 330, h);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { c.fillStyle = td === TOD.night ? (hash(i + r + k) > .5 ? '#ffd690' : '#1a2238') : shade('#8eaac4', td.wall); c.fillRect(x + 30 + k * 100, 820 - h + 40 + r * 110, 70, 70); }
      c.fillStyle = ['#c0392b', '#2e86c1', '#27ae60', '#d4ac0d'][i % 4]; c.fillRect(x + 20, 640, 290, 40); }
    c.fillStyle = '#b8b2a8'; c.fillRect(0, 820, w, 120); c.fillStyle = '#56585e'; c.fillRect(0, 940, w, 140);
    for (let i = 0; i < 10; i++) { c.fillStyle = '#2a2a30'; c.fillRect(150 + i * 320, 400, 8, 430); }
  },
  dyn(t, o) { const td = todOf(o); if (td === TOD.night || o.tod === 'dusk' || o.tod === 'golden') for (let i = 0; i < 10; i++) glow(154 + i * 320, 410, 160, 'rgba(255,200,130,.25)'); extras(t, 4, 840, .6, [0, 3000], 21, td); },
});
defSet('cafe', {
  paint(o) { const td = todOf(o); wall(W, 0, 820, '#e6d6c2', td); planks(820, H, W, '#8a6448'); windowRect(80, 160, 760, 520, td, { view: 'city', frame: '#3a2a20' }); windowRect(1080, 160, 760, 520, td, { view: 'city', frame: '#3a2a20' }); for (let i = 0; i < 5; i++) { c.fillStyle = '#2a2420'; c.fillRect(200 + i * 380, 0, 4, 120); c.fillStyle = '#ffd690'; ell(202 + i * 380, 130, 22, 14); } },
  dyn(t) { for (let i = 0; i < 5; i++) glow(202 + i * 380, 140, 200, 'rgba(255,200,130,.3)'); },
  front(t) { tableTop(960, 800, 640, '#b8875a', '#3a2a20'); c.fillStyle = '#f4f1ea'; rr(800, 760, 56, 44, 10); c.fill(); rr(1060, 760, 56, 44, 10); c.fill(); c.fillStyle = '#6a3a1a'; ell(828, 762, 24, 6); ell(1088, 762, 24, 6); },
});
defSet('jewelry', {
  paint(o) { const td = todOf(o); wall(W, 0, 820, '#efe8e0', td); tiles(820, H, W, '#e6dcd0'); for (let i = 0; i < 4; i++) { c.fillStyle = '#d4c4a8'; c.fillRect(120 + i * 460, 260, 380, 300); c.fillStyle = '#f8f4ee'; c.fillRect(140 + i * 460, 280, 340, 260); for (let k = 0; k < 5; k++) { c.strokeStyle = '#e8d9a8'; c.lineWidth = 3; c.beginPath(); c.arc(190 + i * 460 + k * 62, 360, 22, .2, Math.PI - .2); c.stroke(); c.fillStyle = '#fff4c8'; circ(190 + i * 460 + k * 62, 384, 5); } } },
  dyn(t) { glow(960, 120, 900, 'rgba(255,245,220,.18)'); for (let i = 0; i < 12; i++) { const k = Math.pow(Math.max(0, Math.sin(t * 2 + i * 3)), 8); c.fillStyle = `rgba(255,255,255,${k})`; circ(190 + (i % 4) * 460 + (i % 5) * 62, 380, 3 + k * 4); } },
  front(t) { c.fillStyle = 'rgba(220,235,245,.35)'; c.fillRect(0, 760, W, 120); c.fillStyle = '#c8b8a0'; c.fillRect(0, 870, W, 210); },
});
defSet('hospital', {
  w: 2600,
  paint(o) { const td = todOf(o), w = 2600; wall(w, 0, 820, '#dfe8ea', td); tiles(820, H, w, '#cfd6d8'); c.fillStyle = '#c8d4d8'; c.fillRect(0, 560, w, 20); for (let i = 0; i < 4; i++) { c.fillStyle = '#8fb0c0'; c.fillRect(200 + i * 640, 380, 220, 440); c.fillStyle = '#e8eef0'; c.fillRect(220 + i * 640, 400, 180, 160); } c.fillStyle = '#c0392b'; rr(1240, 230, 300, 70, 8); c.fill(); text('ห้องฉุกเฉิน', 1390, 266, { size: 38, color: '#fff' }); for (let i = 0; i < 6; i++) { c.fillStyle = '#5a7080'; rr(260 + i * 340, 760, 160, 60, 10); c.fill(); } },
  dyn(t) { for (let i = 0; i < 5; i++) { c.fillStyle = 'rgba(240,250,255,.85)'; c.fillRect(200 + i * 500, 40, 300, 14); glow(350 + i * 500, 60, 320, 'rgba(220,240,255,.14)'); } },
});
defSet('funeral', {
  paint(o) {
    const td = todOf(o);
    c.fillStyle = '#e9e1d2'; c.fillRect(0, 0, W, 820); planks(820, H, W, '#7a5a40');
    c.fillStyle = '#c9a24a'; rr(660, 120, 600, 520, 10); c.fill(); c.fillStyle = '#efe6d2'; rr(690, 150, 540, 460, 6); c.fill();
    for (let i = 0; i < 14; i++) { c.fillStyle = ['#ffffff', '#f2f2f2', '#fff6dc'][i % 3]; circ(620 + i * 50, 640 + Math.sin(i) * 10, 34); circ(640 + i * 50, 600 + Math.cos(i) * 12, 28); }
    c.fillStyle = '#2a2a2a'; rr(840, 220, 240, 300, 6); c.fill();
    c.fillStyle = '#f4cfb4'; rr(860, 240, 200, 260, 4); c.fill();
    withCtx(c, () => { c.save(); c.beginPath(); c.rect(860, 240, 200, 260); c.clip(); c.fillStyle = '#c8b8a8'; c.fillRect(860, 240, 200, 260); c.restore(); });
  },
  dyn(t) { for (const x of [600, 1320]) { c.fillStyle = '#f2f2f2'; rr(x - 12, 520, 24, 120, 6); c.fill(); glow(x, 510, 90, 'rgba(255,200,120,.5)'); c.fillStyle = '#ffd27a'; ell(x, 506 + Math.sin(t * 9 + x) * 2, 8, 16); } },
  portrait: true,
});
defSet('lecture', {
  paint(o) { const td = todOf(o); c.fillStyle = '#2a2a34'; c.fillRect(0, 0, W, H); c.fillStyle = '#f2f2f6'; c.fillRect(300, 120, 1320, 560); for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) { const x = 120 + i * 210 + (r % 2) * 100, y = 760 + r * 70; c.fillStyle = '#e6e2da'; rr(x - 54, y + 10, 108, 110, 40); c.fill(); c.fillStyle = ['#17120f', '#2b1913', '#121212', '#3a2a20'][(i + r) % 4]; ell(x, y, 44, 48); } },
  dyn(t) { c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = lgrad(960, 1080, 960, 120, [[0, 'rgba(160,190,255,.14)'], [1, 'rgba(160,190,255,0)']]); poly([900, 1080, 1020, 1080, 1620, 120, 300, 120]); c.restore(); },
  floor: 1000, scale: .92,
});
defSet('restaurant', {
  paint(o) { const td = todOf(o); wall(W, 0, 820, '#e9d2b6', td); planks(820, H, W, '#7a5236'); for (let i = 0; i < 4; i++) { c.fillStyle = '#c0392b'; c.fillRect(120 + i * 460, 140, 300, 60); text(['ข้าวผัด', 'ต้มยำ', 'ส้มตำ', 'ก๋วยเตี๋ยว'][i], 270 + i * 460, 171, { size: 36, color: '#fff' }); } windowRect(1420, 260, 380, 360, td, { view: 'city', frame: '#5a3a24' }); for (let i = 0; i < 6; i++) { c.fillStyle = '#ffd690'; ell(160 + i * 320, 90, 26, 18); } },
  dyn(t) { for (let i = 0; i < 6; i++) glow(160 + i * 320, 100, 220, 'rgba(255,190,120,.28)'); },
  front(t) { tableTop(1150, 800, 1500, '#c8a070', '#4a3020'); for (let i = 0; i < 6; i++) { c.fillStyle = '#f4f1ea'; ell(560 + i * 220, 796, 70, 14); c.fillStyle = ['#e8a04a', '#c8502a', '#5aa84a'][i % 3]; ell(560 + i * 220, 792, 46, 8); } },
});
defSet('park', {
  w: 2400,
  paint(o) { const td = todOf(o), w = 2400; sky(w, 760, td, { sunX: 1800 }); skyline(w, 700, td, 1); for (let i = 0; i < 8; i++) tree(80 + i * 320, 780, 1 + hash(i) * .4, td); c.fillStyle = mixc('#8cc06a', '#2a3a2a', td === TOD.night ? .7 : 0); c.fillRect(0, 760, w, 340); c.fillStyle = '#d8cfbf'; poly([0, 960, w, 900, w, 1000, 0, 1060]); },
  front(t, o) { c.fillStyle = '#7a5a40'; rr(560, 790, 800, 26, 8); c.fill(); c.fillRect(600, 816, 20, 120); c.fillRect(1300, 816, 20, 120); c.fillStyle = '#6a4a34'; rr(560, 700, 800, 20, 8); c.fill(); },
});

/* ---------- part 2 ---------- */
defSet('office', {
  paint(o) { const td = todOf(o); wall(W, 0, 820, '#e8ecf0', td); tiles(820, H, W, '#c8ccd2'); windowRect(1100, 160, 760, 520, td, { view: 'city', frame: '#d8dde4' }); for (let i = 0; i < 3; i++) { c.fillStyle = '#f4f6f8'; c.fillRect(80 + i * 330, 260, 280, 200); c.fillStyle = '#8ab0d8'; c.fillRect(100 + i * 330, 280, 240, 40); } for (let i = 0; i < 9; i++) { c.fillStyle = '#ffffff'; c.fillRect(i * 220, 40, 160, 12); } },
  dyn(t) { for (let i = 0; i < 9; i++) glow(80 + i * 220, 50, 180, 'rgba(230,240,255,.18)'); },
  front(t) { c.fillStyle = '#d8d2c8'; rr(380, 780, 900, 26, 6); c.fill(); c.fillStyle = '#9a948a'; c.fillRect(400, 806, 860, 280); c.fillStyle = '#222'; rr(540, 600, 300, 180, 10); c.fill(); c.fillStyle = '#7ab0e8'; rr(552, 612, 276, 156, 6); c.fill(); c.fillStyle = '#333'; c.fillRect(680, 780, 20, 10); },
});
defSet('wedding', {
  paint(o) {
    const td = todOf(o), night = o.tod === 'night';
    c.fillStyle = lgrad(0, 0, 0, 820, [[0, night ? '#2a2038' : '#f6ece8'], [1, night ? '#3a2a40' : '#f2dcd6']]); c.fillRect(0, 0, W, 820);
    planks(820, H, W, night ? '#5a3a34' : '#c8a088');
    c.fillStyle = night ? '#e8c0d0' : '#ffffff'; for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(i * 300, 0); c.quadraticCurveTo(i * 300 + 150, 160, i * 300 + 300, 0); c.lineTo(i * 300 + 300, 10); c.quadraticCurveTo(i * 300 + 150, 175, i * 300, 10); c.fill(); }
    c.fillStyle = '#f8f2ea'; rr(660, 220, 600, 460, 300); c.fill(); for (let i = 0; i < 30; i++) { c.fillStyle = ['#f7c4d2', '#ffffff', '#f2a8b8', '#e8f0d8'][i % 4]; circ(680 + hash(i) * 560, 240 + hash(i + 3) * 120 + (i % 2) * 330, 22); }
    text('Fon ♡ Kit', 960, 470, { size: 70, weight: 300, color: '#b0607a' });
    for (let i = 0; i < 4; i++) { c.fillStyle = '#6a6070'; c.fillRect(150 + i * 480, 600, 4, 220); c.fillStyle = '#ffe8f0'; ell(152 + i * 480, 600, 70, 20); }
  },
  dyn(t, o) {
    const night = o.tod === 'night';
    for (let i = 0; i < 40; i++) { const x = (i * 53) % W, y = 40 + (i % 5) * 18 + Math.sin(i) * 10; glow(x, y, night ? 40 : 18, night ? 'rgba(255,220,160,.6)' : 'rgba(255,240,200,.3)'); }
    if (night) { c.save(); c.globalCompositeOperation = 'screen'; for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(${['255,150,200', '150,180,255', '255,220,150'][i]},.08)`; const a = t * .5 + i * 2; poly([960 + Math.cos(a) * 200, 0, 960 + Math.cos(a) * 200 + 160, 0, 960 + Math.cos(a) * 900 + 300, 1080, 960 + Math.cos(a) * 900 - 300, 1080]); } c.restore(); }
  },
});
defSet('beach', {
  w: 2600, horizon: 700,
  paint(o) {
    const td = todOf(o), w = 2600;
    sky(w, 700, td, { sunX: 1700, sunY: o.tod === 'golden' ? 640 : 200 });
    c.fillStyle = lgrad(0, 640, 0, 780, [[0, mixc('#3a7ab0', '#1a2a4a', o.tod === 'night' ? .8 : 0)], [1, mixc('#6ab0d0', '#203050', o.tod === 'night' ? .8 : 0)]]); c.fillRect(0, 640, w, 140);
    if (o.tod === 'golden') { c.fillStyle = 'rgba(255,200,120,.45)'; for (let i = 0; i < 18; i++) c.fillRect(1700 - 60 - hash(i) * 120, 650 + i * 7, 120 + hash(i + 2) * 200, 3); }
    c.fillStyle = mixc('#efdcb6', '#3a3440', o.tod === 'night' ? .75 : 0); c.fillRect(0, 760, w, 340);
    c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 40; i++) ell(hash(i) * w, 800 + hash(i + 2) * 280, 30, 4);
    for (const x of [120, 2450]) { c.strokeStyle = mixc('#6a5038', '#111', o.tod === 'night' ? .6 : 0); c.lineWidth = 18; c.beginPath(); c.moveTo(x, 900); c.quadraticCurveTo(x + 30, 600, x + 90, 420); c.stroke(); c.fillStyle = mixc('#3f7a3a', '#0a1410', o.tod === 'night' ? .7 : 0); for (let k = 0; k < 6; k++) { c.save(); c.translate(x + 90, 420); c.rotate(k * 1.05); ell(80, 0, 110, 22); c.restore(); } }
  },
  dyn(t, o) {
    const night = o.tod === 'night';
    for (let i = 0; i < 4; i++) { const y = 760 + Math.sin(t * .8 + i) * 6 + i * 3; c.fillStyle = `rgba(255,255,255,${night ? .15 : .45 - i * .08})`; c.fillRect(0, y, 2600, 4); }
    if (night) { glow(400, 900, 260, 'rgba(255,170,100,.28)'); }
  },
});
defSet('livingroom', {
  paint(o) { const td = todOf(o); wall(W, 0, 820, '#efe6da', td); planks(820, H, W, '#b08a64'); windowRect(160, 180, 560, 480, td, { view: 'trees' }); c.fillStyle = '#8a9a8a'; rr(1100, 560, 640, 220, 40); c.fill(); c.fillStyle = '#a0b0a0'; rr(1120, 480, 600, 140, 40); c.fill(); for (let i = 0; i < 3; i++) { c.fillStyle = '#e8d8c0'; rr(1200 + i * 150, 220, 110, 140, 6); c.fill(); } c.fillStyle = '#5a8a4a'; circ(900, 700, 70); c.fillStyle = '#7a5a40'; c.fillRect(870, 740, 60, 80); },
  dyn(t, o) { if (todOf(o) !== TOD.night) lightShaft(160, 180, 560, 640, 700, 'rgba(255,236,190,.16)'); },
});
defSet('garden', {
  w: 2400,
  paint(o) { const td = todOf(o), w = 2400; sky(w, 700, td, { sunX: 1900 }); c.fillStyle = shade('#efe2cc', td.wall); c.fillRect(1500, 300, 800, 480); c.fillStyle = '#a65c48'; poly([1460, 310, 1900, 160, 2340, 310]); windowRect(1600, 420, 200, 180, td, { frame: '#fff' }); windowRect(2000, 420, 200, 180, td, { frame: '#fff' }); for (const x of [150, 600, 1200]) tree(x, 800, 1.1, td); c.fillStyle = mixc('#8cc06a', '#2a3a2a', 0); c.fillRect(0, 760, w, 340); for (let i = 0; i < 60; i++) { c.fillStyle = ['#ff9ab0', '#ffd36a', '#ffffff', '#c79aff'][i % 4]; circ(hash(i) * 1400, 780 + hash(i + 3) * 60, 7); } },
});
