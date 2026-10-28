/* ONE MORE DAY — renderer: composes set, people, effects, inserts, titles and subtitles for frame t. */
'use strict';

function bike(x, y, s, face, spin = 0) {
  c.save(); c.translate(x, y); c.scale(s * face, s);
  const r = 62;
  for (const wx of [-105, 105]) { c.strokeStyle = '#1e1e22'; c.lineWidth = 9; c.beginPath(); c.arc(wx, -r, r, 0, 7); c.stroke(); c.strokeStyle = 'rgba(120,120,120,.6)'; c.lineWidth = 2; for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 4; c.beginPath(); c.moveTo(wx + Math.cos(a) * r, -r + Math.sin(a) * r); c.lineTo(wx - Math.cos(a) * r, -r - Math.sin(a) * r); c.stroke(); } }
  c.strokeStyle = '#3a6aa0'; c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-105, -r); c.lineTo(-20, -r); c.lineTo(60, -175); c.lineTo(-45, -175); c.lineTo(-20, -r); c.moveTo(-45, -175); c.lineTo(-105, -r); c.moveTo(60, -175); c.lineTo(105, -r); c.moveTo(60, -175); c.lineTo(72, -218); c.stroke();
  c.strokeStyle = '#222'; c.lineWidth = 9; c.beginPath(); c.moveTo(52, -218); c.lineTo(100, -222); c.stroke(); c.fillStyle = '#222'; rr(-78, -198, 62, 15, 7); c.fill();
  c.restore();
}

/* ---------- inserts (full frame, screen space) ---------- */
function phoneFrame(draw, tilt = -.03) {
  c.fillStyle = '#0d0e12'; c.fillRect(0, 0, W, H);
  glow(W / 2, H / 2, 900, 'rgba(120,150,220,.12)', 'source-over');
  c.save(); c.translate(W / 2, H / 2 + 20); c.rotate(tilt);
  c.fillStyle = '#e8b892'; ell(-300, 330, 150, 210, .5); ell(290, 300, 140, 200, -.5);
  c.fillStyle = '#121216'; rr(-250, -460, 500, 920, 60); c.fill();
  c.save(); rr(-230, -440, 460, 880, 46); c.clip(); c.fillStyle = '#f4f2ee'; c.fillRect(-230, -440, 460, 880); draw(); c.restore();
  c.fillStyle = '#121216'; rr(-60, -432, 120, 28, 14); c.fill();
  c.restore();
}
function chat(msgs, header = 'ฟิล์ม') {
  c.fillStyle = '#e9edf3'; c.fillRect(-230, -440, 460, 880);
  c.fillStyle = '#fff'; c.fillRect(-230, -440, 460, 110); text(header, 0, -365, { size: 30, weight: 600, color: '#222' });
  let y = -280;
  for (const m of msgs) {
    c.font = `400 28px ${FONT}`; const lines = wrap(c, m.text, 300), h = lines.length * 38 + 26, w = Math.max(...lines.map(l => c.measureText(l).width)) + 40;
    const x = m.me ? 210 - w : -210;
    c.fillStyle = m.me ? '#6fcf6a' : '#fff'; rr(x, y, w, h, 22); c.fill();
    lines.forEach((ln, i) => text(ln, x + 20, y + 32 + i * 38, { size: 28, weight: 400, color: '#222', align: 'left' }));
    y += h + 18;
  }
}
const INSERTS = {
  memories(t, k) {
    c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H);
    const imgs = ['#b8d8ff', '#ffe3c0', '#d8ffd8', '#ffd0e0'];
    const i = Math.floor(k * 6) % 4;
    c.save(); c.globalAlpha = .55 + .45 * Math.sin(k * 40);
    c.fillStyle = rgrad(W / 2, H / 2, 50, 900, [[0, imgs[i]], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
    c.filter = 'blur(6px)';
    if (i === 0) for (let j = 0; j < 6; j++) { c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(300 + j * 240, 300, 140, 16); }
    if (i === 1) { c.fillStyle = '#22473b'; c.fillRect(560, 300, 800, 380); }
    if (i === 2) { c.fillStyle = '#7fb26a'; c.fillRect(0, 700, W, 400); }
    c.filter = 'none';
    drawPerson('film', { x: W / 2 + (i - 1.5) * 120, y: 1200, s: 1.9, face: i % 2 ? 1 : -1, emo: 'laugh', light: { dir: -1 }, age: 'teen', blur: 5, blink: 1 }, t);
    c.restore();
  },
  telescope(t, k) {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, 380, 0, 7); c.clip();
    c.fillStyle = rgrad(W / 2, H / 2, 0, 400, [[0, '#14205a'], [1, '#05081c']]); c.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) { const tw = .5 + .5 * Math.sin(t * (1 + hash(i)) + i); c.fillStyle = `rgba(255,255,240,${tw * (.3 + hash(i + 2) * .7)})`; circ(W / 2 - 400 + hash(i + 1) * 800, H / 2 - 400 + hash(i + 3) * 800, .8 + hash(i + 4) * 2.2); }
    c.restore();
    c.strokeStyle = '#1a1a1a'; c.lineWidth = 50; c.beginPath(); c.arc(W / 2, H / 2, 405, 0, 7); c.stroke();
  },
  gemini(t, k) {
    INSERTS.telescope(t, k);
    const G = [[0, 0], [70, 30], [10, 120], [90, 150], [-20, 260], [60, 250], [-60, 380], [40, 400], [120, 330], [-100, 300]], E = [[0, 2], [2, 4], [4, 6], [4, 9], [1, 3], [3, 5], [5, 7], [5, 8], [2, 3]];
    c.save(); c.translate(W / 2 - 20, H / 2 - 230); c.scale(1.1, 1.1);
    c.strokeStyle = 'rgba(190,215,255,.75)'; c.lineWidth = 2.5;
    E.forEach(([a, b], i) => { const q = clamp(k * 1.6 * E.length - i); if (q <= 0) return; c.beginPath(); c.moveTo(...G[a]); c.lineTo(lerp(G[a][0], G[b][0], q), lerp(G[a][1], G[b][1], q)); c.stroke(); });
    G.forEach(([x, y], i) => { c.save(); c.shadowColor = '#fff6d0'; c.shadowBlur = i < 2 ? 30 : 12; c.fillStyle = '#fffbe8'; circ(x, y, i < 2 ? 8 : 4.5); c.restore(); });
    if (k > .5) { text('Castor', -14, -26, { size: 26, weight: 300, color: 'rgba(255,240,200,.85)', align: 'right' }); text('Pollux', 84, 4, { size: 26, weight: 300, color: 'rgba(255,240,200,.85)', align: 'left' }); }
    c.restore();
  },
  phone_necklace(t, k) { phoneFrame(() => { c.fillStyle = '#fbf6ee'; c.fillRect(-230, -440, 460, 880); c.strokeStyle = '#d9c38a'; c.lineWidth = 4; c.beginPath(); c.arc(0, -60, 150, .25, Math.PI - .25); c.stroke(); c.save(); c.shadowColor = '#fff'; c.shadowBlur = 20; c.fillStyle = '#f6e7b8'; poly([0, 70, -24, 110, 0, 150, 24, 110]); c.restore(); text('สร้อยคอจี้ดาวคู่', 0, 260, { size: 30, weight: 500, color: '#333' }); text('฿30,000', 0, 310, { size: 34, weight: 600, color: '#b8862a' }); }); },
  phone_msg_meet(t, k) { phoneFrame(() => chat([{ text: 'วันนี้เจอกันหน่อยนะ' }].concat(k > .6 ? [{ text: 'ได้', me: true }] : []))); },
  phone_photos(t, k) { phoneFrame(() => { c.fillStyle = '#111'; c.fillRect(-230, -440, 460, 880); for (let i = 0; i < 6; i++) { const x = -220 + (i % 2) * 225, y = -420 + Math.floor(i / 2) * 290 - k * 120; c.fillStyle = ['#cfe3f2', '#f6dcc4', '#e8f0d8', '#f2d6e2', '#dfe6f6', '#f6efd2'][i]; c.fillRect(x, y, 215, 280); c.save(); c.beginPath(); c.rect(x, y, 215, 280); c.clip(); drawPerson(i % 2 ? 'film' : 'kan', { x: x + 70, y: y + 520, s: .9, face: 1, emo: 'laugh', light: {}, age: 'teen', blink: 1 }, i); drawPerson(i % 2 ? 'kan' : 'film', { x: x + 150, y: y + 520, s: .88, face: -1, emo: 'smile', light: {}, age: 'teen', blink: 1 }, i + 1); c.restore(); } }); },
  chat_sorry(t, k) { const typed = 'ขอโทษ'; const n = k < .45 ? Math.ceil(k / .45 * typed.length) : k < .7 ? typed.length : Math.max(0, Math.ceil((1 - (k - .7) / .3) * typed.length)); phoneFrame(() => { chat([{ text: 'วันนี้เจอกันหน่อยนะ' }, { text: 'ได้', me: true }]); c.fillStyle = '#fff'; c.fillRect(-230, 360, 460, 80); c.fillStyle = '#f0f0f0'; rr(-210, 375, 360, 50, 25); c.fill(); text(typed.slice(0, n) + (Math.sin(t * 8) > 0 ? '|' : ''), -190, 400, { size: 28, weight: 400, color: '#222', align: 'left' }); }); },
  necklacebox(t, k) { c.fillStyle = '#16120e'; c.fillRect(0, 0, W, H); glow(W / 2, 420, 900, 'rgba(255,200,140,.25)', 'source-over'); c.fillStyle = '#5a3a24'; c.fillRect(0, 640, W, 440); c.save(); c.translate(W / 2, 640); c.fillStyle = '#1a2b4a'; rr(-170, -120, 340, 130, 14); c.fill(); c.fillStyle = '#22355a'; rr(-170, -260, 340, 150, 14); c.fill(); c.fillStyle = '#f4efe2'; rr(-150, -110, 300, 100, 10); c.fill(); c.strokeStyle = '#d9c38a'; c.lineWidth = 3; c.beginPath(); c.arc(0, -90, 70, .3, Math.PI - .3); c.stroke(); c.fillStyle = '#f6e7b8'; poly([0, -40, -12, -22, 0, -4, 12, -22]); c.restore(); },
  necklace(t, k) { INSERTS.necklacebox(t, k); },
  slide(title, body, draw) { c.fillStyle = '#1c1c24'; c.fillRect(0, 0, W, H); c.fillStyle = '#f2f2f6'; c.fillRect(260, 120, 1400, 760); text(title, 960, 210, { size: 58, weight: 600, color: '#1a2a5a' }); if (body) text(body, 960, 760, { size: 32, weight: 400, color: '#333', maxW: 1200 }); if (draw) draw(); },
  slide_wormhole(t, k) { INSERTS.slide('WORMHOLE — ทฤษฎีรูหนอน', 'อวกาศและเวลาเชื่อมโยงกันเป็น spacetime', () => { c.save(); c.translate(960, 480); c.strokeStyle = '#3a5aa0'; c.lineWidth = 2; for (let i = -8; i <= 8; i++) { c.beginPath(); for (let x = -500; x <= 500; x += 20) { const d = Math.exp(-(x * x) / 30000) * 140 * (1 + .1 * Math.sin(t)); c.lineTo(x, i * 18 + d * (i > 0 ? 1 : -1) * .6); } c.stroke(); } c.restore(); }); },
  slide_fold(t, k) { INSERTS.slide('จุดสองจุด… ทางลัดผ่านเวลา', '', () => { c.save(); c.translate(960, 520); const f = ease(clamp(k * 1.5)); c.strokeStyle = '#3a5aa0'; c.lineWidth = 3; c.beginPath(); c.moveTo(-460, -160 * f); c.quadraticCurveTo(0, -260 * f - 40, 460, -160 * f); c.moveTo(-460, 160 * f); c.quadraticCurveTo(0, 260 * f + 40, 460, 160 * f); c.stroke(); c.fillStyle = '#e04a4a'; circ(-300, -150 * f - 20, 14); circ(-300, 150 * f + 20, 14); c.strokeStyle = 'rgba(224,74,74,.6)'; c.setLineDash([10, 10]); c.beginPath(); c.moveTo(-300, -150 * f - 20); c.lineTo(-300, 150 * f + 20); c.stroke(); c.setLineDash([]); c.restore(); }); },
  slide_rules(t, k) { INSERTS.slide('การเดินทางข้ามเวลา', '', () => { ['1. วัตถุที่ผูกพันกับอารมณ์อย่างลึกซึ้ง', '2. จิตใจที่จดจ่อและเสียใจอย่างที่สุด', '3. รอยต่อของกาลเวลา (Spatial Junction)', '4. ทุกการแก้ไขมี “ราคาที่ต้องจ่าย”'].forEach((s, i) => text(s, 420, 360 + i * 110, { size: 40, weight: 400, color: '#222', align: 'left', alpha: clamp(k * 5 - i) })); }); },
  forum(t, k) { c.fillStyle = '#0c0e14'; c.fillRect(0, 0, W, H); c.fillStyle = '#f4f4f0'; c.fillRect(160, 80, 1600, 920); c.fillStyle = '#3a4a6a'; c.fillRect(160, 80, 1600, 70); text('webboard • เรื่องแปลก ๆ', 220, 115, { size: 30, color: '#fff', align: 'left', weight: 500 }); text('มีใครเคยเจอเหตุการณ์แปลก ๆ ที่ถนนเส้นนี้บ้าง?', 220, 210, { size: 42, weight: 600, color: '#1a1a1a', align: 'left' }); ['ผมเคยขับรถผ่านตอนกลางคืน บรรยากาศรอบตัวเปลี่ยนไปหมด', 'เคยเห็นคนที่ควรจะอยู่ที่อื่น เดินผ่านไปต่อหน้าเลย', 'เรื่องเล่าน่า อย่าคิดมาก', 'เจอกับตัวจริง ๆ ไม่ได้โม้'].forEach((s, i) => { c.fillStyle = '#e8e8e2'; rr(220, 290 + i * 140 - k * 120, 1480, 110, 10); c.fill(); text(s, 260, 345 + i * 140 - k * 120, { size: 32, weight: 400, color: '#333', align: 'left' }); }); glow(W / 2, H / 2, 1100, 'rgba(120,160,255,.08)'); },
  forum_quote(t, k) { INSERTS.forum(t, .9); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, H); c.fillStyle = '#fffbe8'; rr(260, 380, 1400, 260, 16); c.fill(); text('“ยายผมเคยเล่าว่า ถ้าใครเสียใจมากพอแล้วกลับไปที่นั่น\nบางทีอาจได้เจอสิ่งที่เสียไปอีกครั้ง”', 960, 510, { size: 40, weight: 500, color: '#2a1a0a' }); },
  dreamroad(t, k) { c.save(); withCtx(c, () => { SETS.road.paint({ tod: 'night', wx: 'rain' }); }); c.restore(); c.fillStyle = 'rgba(80,100,200,.25)'; c.fillRect(0, 0, W, H); rainFx(t); },
  dreamface(t, k) { c.fillStyle = '#0a0c1a'; c.fillRect(0, 0, W, H); c.save(); c.translate(W / 2, H / 2); c.scale(3.6, 3.6); c.translate(-W / 2, -H / 2 + 340); drawPerson('film', { x: W / 2, y: H, s: 1, face: -1, emo: 'soft', light: { dir: 1, rim: '200,220,255', rimA: .8 }, age: 'teen', blur: 3 * (1 - k), blink: 1 }, t); c.restore(); glow(W / 2, H / 2, 700, 'rgba(200,210,255,.18)'); },
  montage_day(t, k) { c.fillStyle = '#f6efe4'; c.fillRect(0, 0, W, H); const sc = Math.floor(k * 3) % 3; ['street', 'restaurant', 'park'].forEach((sid, i) => { if (i !== sc) return; withCtx(c, () => SETS[sid].paint({ tod: 'golden' })); drawPerson('kan', { x: 820, y: 905, s: 1.15, face: 1, emo: 'laugh', light: { dir: 1, rim: '255,200,130' }, age: 'adult', wear: 'casual', blink: 1, talk: .3 }, t); drawPerson('film', { x: 1100, y: 905, s: 1.12, face: -1, emo: 'laugh', light: { dir: 1, rim: '255,200,130' }, age: 'adult', wear: 'casual', blink: 1 }, t); }); },
  memory_laugh(t, k) { c.save(); c.translate(W / 2, H / 2); c.scale(2.7, 2.7); c.translate(-W / 2, -H / 2 + 230); withCtx(c, () => SETS.field.paint({ tod: 'golden' })); drawPerson('film', { x: W / 2, y: 905, s: 1, face: -1, emo: 'laugh', light: { dir: 1, rim: '255,200,130', rimA: .7 }, age: 'teen', blink: 1, talk: .4 }, t); c.restore(); grade({ sepia: .35, lift: 'rgba(255,230,190,.15)' }); },
  necklace_on(t, k) { c.fillStyle = '#2a2030'; c.fillRect(0, 0, W, H); glow(W / 2, H / 2, 900, 'rgba(255,200,170,.3)', 'source-over'); c.save(); c.translate(W / 2, H / 2 - 120); c.fillStyle = '#f4cfb4'; c.beginPath(); c.moveTo(-500, 700); c.quadraticCurveTo(-300, -40, 0, -120); c.quadraticCurveTo(300, -40, 500, 700); c.fill(); c.strokeStyle = '#e8d9a8'; c.lineWidth = 6; c.beginPath(); c.arc(0, 60, 230, .35, Math.PI - .35); c.stroke(); c.save(); c.shadowColor = '#fff'; c.shadowBlur = 30; c.fillStyle = '#f6e7b8'; poly([0, 270, -28, 310, 0, 350, 28, 310]); c.restore(); c.restore(); for (let i = 0; i < 20; i++) glow((i * 271) % W, 120 + (i * 97) % 300, 40, 'rgba(255,220,160,.4)'); },
  memory_fade(t, k) { INSERTS.memory_laugh(t, k); c.fillStyle = `rgba(0,0,0,${k * .9})`; c.fillRect(0, 0, W, H); c.save(); c.filter = `blur(${k * 12}px)`; c.drawImage(cv, 0, 0); c.restore(); },
  memory_beach(t, k) { withCtx(c, () => SETS.beach.paint({ tod: 'golden' })); drawPerson('film2', { x: W / 2 + 120, y: 905, s: 1.25, face: -1, emo: 'laugh', light: { dir: 1, rim: '255,200,130', rimA: .7 }, age: 'adult', wear: 'casual', blink: 1, talk: .3 }, t); drawPerson('kan', { x: W / 2 - 160, y: 905, s: 1.25, face: 1, emo: 'smile', light: { dir: 1, rim: '255,200,130', rimA: .7 }, age: 'adult', wear: 'casual', blink: 1 }, t); grade({ lift: 'rgba(255,220,180,.18)' }); glow(W / 2, H / 2, 900, 'rgba(255,230,200,.2)'); },
  memories_all(t, k) { const scenes = [['gate', 'morning', 'kan', 'film', 'shock', 'angry'], ['lab', 'night', 'kan', 'film', 'smile', 'soft'], ['field', 'golden', 'kan', 'film', 'shy', 'smile'], ['crossing', 'dusk', 'kan', 'film', 'cry', 'cry'], ['beach', 'golden', 'kan', 'film2', 'smile', 'laugh']]; const i = Math.min(scenes.length - 1, Math.floor(k * scenes.length)), [sid, tod, a, b, ea, eb] = scenes[i]; withCtx(c, () => SETS[sid].paint({ tod })); const age = b === 'film2' ? 'adult' : 'teen'; drawPerson(a, { x: 820, y: 905, s: 1.2, face: 1, emo: ea, light: { dir: 1, rim: '255,220,170' }, age, wear: b === 'film2' ? 'casual' : undefined, blink: 1 }, t); drawPerson(b, { x: 1100, y: 905, s: 1.17, face: -1, emo: eb, light: { dir: 1, rim: '255,220,170' }, age, wear: b === 'film2' ? 'casual' : undefined, blink: 1 }, t); grade({ sepia: .25, lift: 'rgba(255,230,200,.2)' }); const f = (k * scenes.length) % 1; c.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - f * 6) * .8})`; c.fillRect(0, 0, W, H); },
  phone_home(t, k) { phoneFrame(() => chat([{ text: 'กลับถึงบ้านแล้วนะ' }])); },
  pregnancy_test(t, k) { c.fillStyle = '#efe6da'; c.fillRect(0, 0, W, H); glow(W / 2, H / 2, 800, 'rgba(255,240,220,.4)', 'source-over'); c.save(); c.translate(W / 2, H / 2); c.rotate(-.2); c.fillStyle = '#f4cfb4'; ell(-40, 140, 260, 160); c.fillStyle = '#fafafa'; rr(-60, -360, 120, 620, 50); c.fill(); c.fillStyle = '#dfe6ee'; rr(-36, -180, 72, 160, 10); c.fill(); c.fillStyle = '#e04a6a'; c.fillRect(-26, -130, 52, 10); c.globalAlpha = clamp(k * 3); c.fillRect(-26, -90, 52, 10); c.restore(); },
  phone_mom(t, k) { phoneFrame(() => chat([{ text: 'กลับบ้านกินข้าวได้แล้วลูก' }].concat(k > .5 ? [{ text: 'ครับ กำลังจะไป', me: true }] : []), 'แม่')); },
};

/* ---------- title cards ---------- */
function titleCard(kind, t, k, sc) {
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  if (kind === 'maintitle2') {
    starsBg(t); const a = clamp(k * 3) * clamp((1 - k) * 4);
    text('ONE MORE DAY 2', W / 2, 470, { size: 110, weight: 300, color: '#fff', spacing: 16, alpha: a, shadow: 'rgba(255,200,220,.6)', shadowBlur: 30 });
    text('ขออีกหนึ่งวันกับเธอ', W / 2, 600, { size: 54, weight: 300, color: '#f2dde6', alpha: clamp(k * 3 - .4) * clamp((1 - k) * 4) });
  } else if (kind === 'maintitle') {
    starsBg(t); const a = clamp(k * 3) * clamp((1 - k) * 4);
    text('ONE MORE DAY', W / 2, 470, { size: 120, weight: 300, color: '#fff', spacing: 18, alpha: a, shadow: 'rgba(255,200,220,.6)', shadowBlur: 30 });
    text('แค่วันเดียวกับเธอ', W / 2, 600, { size: 54, weight: 300, color: '#f2dde6', alpha: clamp(k * 3 - .4) * clamp((1 - k) * 4) });
  } else if (kind === 'endtitle') {
    starsBg(t); text('ONE MORE DAY', W / 2, 470, { size: 110, weight: 300, color: '#fff', spacing: 18, alpha: clamp(k * 3) });
    text(sc.opts.part === '2' ? 'ขออีกหนึ่งวันกับเธอ' : 'แค่วันเดียวกับเธอ', W / 2, 590, { size: 50, weight: 300, color: '#f2dde6', alpha: clamp(k * 3 - .5) });
  } else if (kind === 'credits') {
    const lines = ['ONE MORE DAY', '', 'ดัดแปลงจากนิยายของ', 'ภูมินริศร์ โชติพงศ์ (Sawasdeekap)', '', 'แอนิเมชันและดนตรีประกอบ', 'สร้างด้วยโค้ดทั้งหมด', '', 'เสียงพากย์', 'AI (MMS Thai) ตรวจการออกเสียงด้วย Whisper', '', 'เรื่องสมมติ'];
    lines.forEach((s, i) => text(s, W / 2, H + 80 + i * 80 - k * (H + lines.length * 80), { size: i === 0 ? 64 : 40, weight: i === 0 ? 400 : 300, color: '#fff' }));
  } else if (kind === 'whiteout') { c.fillStyle = `rgba(255,255,255,${1 - k * .2})`; c.fillRect(0, 0, W, H); }
  else if (kind === 'flashcut') { c.fillStyle = Math.sin(k * 30) > 0 ? '#fff' : '#000'; c.fillRect(0, 0, W, H); c.fillStyle = 'rgba(255,60,60,.25)'; c.fillRect(0, H * hash(Math.floor(t * 20)), W, 60); }
}
function starsBg(t) { for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(255,255,245,${.2 + .5 * Math.abs(Math.sin(t * .6 + i))})`; circ(hash(i) * W, hash(i + 4) * H, .6 + hash(i + 7) * 1.6); } }

/* ---------- subtitles ---------- */
function subtitles(t) {
  const caps = TL.captions.find(cp => t >= cp.t0 && t < cp.t1);
  if (caps) { const a = clamp((t - caps.t0) / .6) * clamp((caps.t1 - t) / .6); text(caps.text, W / 2, H / 2, { size: 54, weight: 300, color: '#fff', alpha: a, lh: 1.6 }); return; }
  for (const l of TL.lines) {
    if (t < l.t0 - .05 || t >= l.s1) continue;
    const a = clamp((t - l.t0 + .05) / .12) * clamp((l.s1 - t) / .15);
    c.save(); c.font = `${l.vo ? 'italic ' : ''}400 40px ${FONT}`;
    const lines = wrap(c, l.text, 1500); c.restore();
    const y = H - BAR / 2 - (lines.length - 1) * 24;
    lines.forEach((ln, i) => text(ln, W / 2, y + i * 50, { size: 40, weight: 400, italic: l.vo, color: l.vo ? '#f3e7c8' : '#ffffff', alpha: a, shadow: 'rgba(0,0,0,.9)', shadowBlur: 8 }));
  }
}

/* ---------- frame ---------- */
const SCENE_FADE = .45;
function renderAt(t) {
  t = clamp(t, 0, TL.total - .001);
  const fi = Math.round(t * TL.fps);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none';
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const sc = sceneAt(t), shot = shotAt(sc, t), k = prog(t, shot.t0, shot.t1);
  const o = sc.opts, td = todOf(o);
  if (shot.kind === 'caption') { /* black, text drawn by subtitles() */ }
  else if (shot.kind === 'insert') { (INSERTS[shot.args[0]] || INSERTS.memories)(t, k); grade(gradeFor(o, td), t); }
  else if (shot.kind === 'title') {
    const stage = stageAt(sc, t);
    if (['maintitle', 'maintitle2', 'endtitle', 'credits', 'whiteout', 'flashcut', 'black'].includes(shot.args[0])) titleCard(shot.args[0], t, k, sc);
  } else drawScene(sc, shot, t, k);
  // dip to black between scenes
  const d0 = t - sc.t0, d1 = sc.t1 - t;
  if (d0 < SCENE_FADE) { c.fillStyle = `rgba(0,0,0,${1 - d0 / SCENE_FADE})`; c.fillRect(0, 0, W, H); }
  if (d1 < SCENE_FADE) { c.fillStyle = `rgba(0,0,0,${1 - d1 / SCENE_FADE})`; c.fillRect(0, 0, W, H); }
  post(t, fi, { vignette: o.grade === 'dream' ? .6 : .42 });
  subtitles(t);
}
function gradeFor(o, td) {
  const g = Object.assign({}, td.grade);
  if (o.grade === 'dream') Object.assign(g, { tint: 'rgba(80,100,200,.3)', desat: .35, lift: 'rgba(40,40,90,.12)' });
  if (o.grade === 'rain') Object.assign(g, { tint: 'rgba(70,100,140,.28)', desat: .3 });
  if (o.grade === 'mourning') Object.assign(g, { desat: .45, tint: 'rgba(120,120,140,.15)' });
  if (o.grade === 'lonely') Object.assign(g, { desat: .35, tint: 'rgba(60,80,140,.25)' });
  if (o.grade === 'hospital') Object.assign(g, { tint: 'rgba(160,220,210,.18)', desat: .25 });
  if (o.grade === 'warm' || o.grade === 'cafe') Object.assign(g, { tint: 'rgba(255,190,120,.18)' });
  if (o.grade === 'golden') Object.assign(g, { tint: 'rgba(255,170,90,.24)', lift: 'rgba(255,200,150,.06)' });
  if (o.grade === 'screen' || o.grade === 'dim') Object.assign(g, { tint: 'rgba(70,90,160,.25)' });
  return g;
}

function drawScene(sc, shot, t, k) {
  const o = Object.assign({}, sc.opts);
  const stage = stageAt(sc, t), set = stage.set, td = todOf(o);
  if (stage.fx.policecar || sc.id.includes('dad') && !sc.id.includes('dad2') && o.age === 'teen') o.police = true;
  if (stage.fx.spill) o.spill = clamp(stage.fx.spill.k * 2);
  if (sc.id === 'p1_lab' && stage.fx.spill && stage.fx.spill.done) o.spill = 1;
  const L = Object.assign(set.light(o), {});
  if (o.grade === 'dream') Object.assign(L, { rim: '170,190,255', amb: '120,140,220', ambA: .2 });
  // poses
  const poses = {};
  for (const ch of Object.values(stage.chars)) if (ch.show) poses[ch.id] = poseFor(ch, stage, sc, t, L);
  // hugging couples move together
  for (const ch of Object.values(stage.chars)) if (ch.hug && poses[ch.id] && poses[ch.hug]) { const a = poses[ch.id], b = poses[ch.hug]; const mid = (a.x + b.x) / 2, gap = 28 * a.s; if (a.x < b.x) { a.x = mid - gap; b.x = mid + gap; } else { a.x = mid + gap; b.x = mid - gap; } a.face = Math.sign(b.x - a.x) || 1; b.face = -a.face; }
  // hand-holding couples stand close enough for their hands to meet
  for (const ch of Object.values(stage.chars)) if (ch.holdHand && !ch.hug && poses[ch.id] && poses[ch.holdHand] && ch.id < ch.holdHand) { const a = poses[ch.id], b = poses[ch.holdHand]; const mid = (a.x + b.x) / 2, gap = 92 * a.s; if (Math.abs(a.x - b.x) > gap * 2) { const d = Math.sign(b.x - a.x) || 1; a.x = mid - d * gap; b.x = mid + d * gap; } }
  const cam = cameraFor(shot, stage, poses, sc, t);
  if (stage.fx.accident || stage.fx.crash) { const sk = stage.fx.accident ? 18 : 10; cam.x += (hash(Math.floor(t * 30)) - .5) * sk / cam.z; cam.y += (hash(Math.floor(t * 30) + 3) - .5) * sk / cam.z; }
  // set
  const key = `${o.set}|${o.tod}|${o.wx}|${o.age}|${o.mess ? 1 : 0}|${o.police ? 1 : 0}`;
  const Lr = layer(key, set.w, H, () => set.paint(o));
  c.save(); applyCam(cam);
  drawLayer(Lr, cam.blur);
  if (set.dyn) set.dyn(t, o);
  if (set.portrait && stage.fx.portrait !== undefined || set.portrait) funeralPortrait(t);
  // people, back to front
  const order = Object.keys(poses).sort((a, b) => (poses[a].s - poses[b].s) || (poses[a].y - poses[b].y));
  for (const id of order) {
    const st = poses[id];
    if (cam.focus && id !== cam.focus && id !== cam.ots) st.blur = Math.max(st.blur || 0, 3);
    if (st.bikeRide) bike(st.x - 10 * st.face, st.y, st.s, st.face, (st.walk || 0) * 1.3);
    if (stage.chars[id].states.has('car')) carInterior(t, st);
    if (st.glow) glow(st.x, st.y - 380 * st.s, 500 * st.s, 'rgba(255,240,220,.25)');
    drawPerson(id, st, t + hash(id.length) * 10);
    if (st.necklace) necklaceOn(st);
  }
  if (set.front) set.front(t, Object.assign({ blanket: Object.values(stage.chars).some(ch => ch.states.has('sleep') || ch.states.has('sitbed')) }, o));
  if (cam.ots && poses[cam.ots]) otsShoulder(cam.ots, poses[cam.ots], cam);
  c.restore();
  // scene effects in screen space
  sceneFx(stage.fx, t, o, sc);
  grade(gradeFor(o, td), t);
}
function necklaceOn(st) { const s = st.s * .62; c.save(); c.translate(st.x, st.y - 820 * s); c.scale(s * st.face, s); c.strokeStyle = '#e8d9a8'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -10, 34, .3, Math.PI - .3); c.stroke(); c.fillStyle = '#f6e7b8'; poly([0, 22, -8, 30, 0, 40, 8, 30]); c.restore(); }
function otsShoulder(id, st, cam) {
  // the listener's shoulder and the back of their head, out of focus in the foreground
  const s = st.s * .62, [hx, hy] = headPos(st);
  const p = CAST[id] || CAST.kan, of = outfitFor(id, p, st.wear, st.age === 'adult' ? 'adult' : st.age || 'teen');
  const shirt = (of && of.top) || '#2a2a30', hair = shade(p.hc, .08);
  c.save(); c.filter = `blur(${Math.round(14 / cam.z * 2.4)}px)`;
  const fx = cam.x - st.face * W * .37 / cam.z, fy = cam.y - 20 / cam.z, k = s * 1.3;
  // shoulder and upper back, then neck and the back of the head
  c.fillStyle = shade(shirt, -.35); c.beginPath();
  c.moveTo(fx - 300 * k, fy + 700 * k); c.quadraticCurveTo(fx - 270 * k, fy + 150 * k, fx - 20 * k, fy + 100 * k);
  c.quadraticCurveTo(fx + 240 * k, fy + 110 * k, fx + 280 * k, fy + 700 * k); c.fill();
  c.fillStyle = shade(p.skin, -.45); ell(fx + st.face * 8 * k, fy + 80 * k, 30 * k, 60 * k);
  c.fillStyle = hair; ell(fx, fy, 64 * k, 76 * k); if (!p.male) ell(fx - st.face * 6 * k, fy + 90 * k, 60 * k, 110 * k);
  c.fillStyle = 'rgba(255,255,255,.07)'; ell(fx + st.face * 24 * k, fy - 26 * k, 26 * k, 40 * k);
  c.restore();
}
function carInterior(t, st) {
  const s = st.s;
  c.save(); c.fillStyle = '#1c1e24'; c.fillRect(st.x - 700, st.y - 900 * s * .62 - 200, 1400, 1300);
  c.fillStyle = '#3a4050'; rr(st.x - 560, st.y - 520 * s * .62 - 250, 1000, 520, 30); c.fill();
  c.fillStyle = 'rgba(110,130,170,.55)'; c.fillRect(st.x - 520, st.y - 520 * s * .62 - 220, 920, 420);
  rainFx(t, .6, [st.x - 520, st.y - 520 * s * .62 - 220, 920, 420]);
  for (let i = 0; i < 5; i++) glow(st.x - 400 + i * 200 + Math.sin(t + i) * 30, st.y - 360, 70, 'rgba(255,90,80,.35)');
  c.restore();
}
function funeralPortrait(t) {
  c.save(); c.beginPath(); c.rect(860, 240, 200, 260); c.clip();
  c.fillStyle = '#d8cfc4'; c.fillRect(860, 240, 200, 260);
  drawPerson('film', { x: 955, y: 1250, s: 1.6, face: 1, turn: .2, emo: 'smile', light: { dir: -1 }, age: 'adult', wear: 'casual', blink: 1 }, 0);
  c.restore();
  c.fillStyle = 'rgba(30,30,30,.9)'; c.beginPath(); c.moveTo(860, 240); c.lineTo(920, 240); c.lineTo(860, 300); c.fill();
}
function sceneFx(fx, t, o, sc) {
  if (o.wx === 'rain') { c.fillStyle = 'rgba(120,140,180,.08)'; c.fillRect(0, 0, W, H); }
  if (fx.headlights) { const k = easeIn(fx.headlights.k); c.save(); c.globalCompositeOperation = 'lighter'; glow(W * .62, H * .55, 200 + k * 1800, `rgba(255,255,235,${.3 + k * .7})`); glow(W * .38, H * .55, 200 + k * 1800, `rgba(255,255,235,${.3 + k * .7})`); c.restore(); }
  if (fx.accident) { const k = fx.accident.k; c.fillStyle = `rgba(255,255,255,${k < .35 ? k / .35 : Math.max(0, 1 - (k - .35) * 3)})`; c.fillRect(0, 0, W, H); if (k > .5) { c.fillStyle = `rgba(0,0,0,${(k - .5) * 2})`; c.fillRect(0, 0, W, H); } }
  if (fx.slowmo) { c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = 'rgba(255,200,220,.12)'; c.fillRect(0, 0, W, H); c.restore(); for (let i = 0; i < 30; i++) { const y = (hash(i) * H + t * 30) % H; c.fillStyle = 'rgba(255,215,235,.6)'; ell((hash(i + 3) * W + Math.sin(t + i) * 40) % W, y, 9, 5, t + i); } }
  if (fx.distort) { const k = fx.distort.k; c.save(); c.globalCompositeOperation = 'screen'; c.fillStyle = `rgba(150,170,255,${k * .5})`; c.fillRect(0, 0, W, H); c.restore(); for (let i = 0; i < 8; i++) { const y = hash(Math.floor(t * 18) + i) * H; c.drawImage(cv, 0, y, W, 30, (hash(i + t) - .5) * 80 * k, y, W, 30); } }
  if (fx.silence) { c.fillStyle = `rgba(20,30,60,${fx.silence.k * .3})`; c.fillRect(0, 0, W, H); }
  if (fx.timepass) { const k = fx.timepass.k; c.fillStyle = `rgba(255,170,90,${Math.sin(k * Math.PI) * .25})`; c.fillRect(0, 0, W, H); text('หลายชั่วโมงต่อมา…', W / 2, 220, { size: 46, weight: 300, color: '#fff', alpha: Math.sin(k * Math.PI) }); }
  if (fx.alarm) { if (Math.sin(t * 25) > 0) text('♪', 1650, 470, { size: 60, color: 'rgba(255,255,255,.7)' }); }
}
