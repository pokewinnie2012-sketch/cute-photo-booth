// Render a part of the movie to MP4: frames from movie.html (several browser workers in parallel), then the soundtrack.
// Usage: node tools/render.js <part> [out.mp4] [workers] [from-seconds] [to-seconds]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const [part = '1', outArg, workersArg = '3', fromArg, toArg] = process.argv.slice(2);
const out = path.resolve(outArg || path.join(ROOT, 'build', `one-more-day-part${part}.mp4`));
const workers = Number(workersArg);

async function renderRange(id, f0, f1, fps, segPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', e => console.error(`[w${id}] page error:`, e.message));
  await page.goto(`file://${ROOT}/movie.html?part=${part}&export=1`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'animation', '-pix_fmt', 'yuv420p', segPath], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const data = await page.evaluate(t => { MOVIE.renderAt(t); return MOVIE.canvas.toDataURL('image/jpeg', 0.92); }, f / fps);
    if (!ff.stdin.write(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % (fps * 20) === 0) console.log(`[w${id}] ${((f - f0) / (f1 - f0) * 100).toFixed(1)}%  ${((Date.now() - t0) / Math.max(1, f - f0)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', code => code ? rej(new Error('ffmpeg ' + code)) : res()));
  await browser.close();
}

(async () => {
  const tl = fs.readFileSync(path.join(ROOT, 'build', `part${part}.timeline.js`), 'utf8');
  const TL = JSON.parse(tl.slice(tl.indexOf('{'), tl.lastIndexOf('}') + 1));
  const fps = TL.fps;
  const F0 = Math.round((Number(fromArg) || 0) * fps), F1 = Math.round((toArg ? Number(toArg) : TL.total) * fps);
  const tmp = fs.mkdtempSync(path.join(ROOT, 'build', 'seg-'));
  const per = Math.ceil((F1 - F0) / workers), segs = [];
  await Promise.all([...Array(workers)].map((_, i) => {
    const a = F0 + i * per, b = Math.min(F1, a + per); if (a >= b) return null;
    const seg = path.join(tmp, `seg${i}.mp4`); segs[i] = seg;
    return renderRange(i, a, b, fps, seg);
  }));
  fs.writeFileSync(path.join(tmp, 'list.txt'), segs.filter(Boolean).map(s => `file '${s}'`).join('\n'));
  const audio = path.join(ROOT, 'build', `part${part}.m4a`);
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt')];
  if (fs.existsSync(audio)) args.push('-ss', String(F0 / fps), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest');
  args.push('-c:v', 'copy', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('saved', out);
})();
