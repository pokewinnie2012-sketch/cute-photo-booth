// Render an episode page frame-by-frame into a TikTok-ready 1080x1920 MP4 with the synthesized soundtrack.
// Usage: node export.js [episode.html] [out.mp4] [fps]   (default: ep1.html -> one-more-day-ep1.mp4)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

(async () => {
  const args = process.argv.slice(2);
  const html = path.resolve(__dirname, args[0] && args[0].endsWith('.html') ? args.shift() : 'ep1.html');
  const ep = (path.basename(html).match(/ep(\d+)/) || [, '1'])[1];
  const out = path.resolve(args[0] || path.join(__dirname, `one-more-day-ep${ep}.mp4`));
  const fps = Number(args[1] || 30);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + html + '?export=1');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

  const duration = await page.evaluate(() => window.DRAMA.duration);
  const wav = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'drama-')), 'audio.wav');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.DRAMA.renderWavBase64()), 'base64'));

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', wav, '-vf', 'hqdn3d=4:3:8:8', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    const data = await page.evaluate(t => { window.DRAMA.renderAt(t); return window.DRAMA.canvas.toDataURL('image/jpeg', 0.92); }, i / fps);
    if (!ff.stdin.write(Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r${Math.round(i / frames * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', code => code ? rej(new Error('ffmpeg exit ' + code)) : res()));
  await browser.close();
  console.log(`\nsaved ${out}`);
})();
