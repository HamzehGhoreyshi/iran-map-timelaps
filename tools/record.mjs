// Records the timelapse as a perfectly smooth video, frame by frame.
//
// How it works: the built site (dist/) is opened in Chrome without a window. The page's
// clock is replaced with one this script controls, so each video frame is exactly 1/60 s
// after the last, however long the computer takes to draw it. Every frame is a screenshot
// sent straight to ffmpeg. The top bar and footer are hidden: only the globe, caption and
// ruler are filmed. The film walks from 844 BC to today, one stop at a time.
//
// Needs: Google Chrome, ffmpeg, and `npm i --no-save puppeteer-core`. Run `npm run build` first.
//   node tools/record.mjs <out.mp4> <width> <height> [lang] [dist folder]
// Width and height are the CSS size of the page; the video is twice that (retina).
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const [out, width = '540', height = '540', lang = 'en', distArg = 'dist'] = process.argv.slice(2);
if (!out) throw new Error('usage: node tools/record.mjs <out.mp4> <width> <height> [lang] [dist]');
const W = Number(width), H = Number(height);
const DIST = path.resolve(distArg);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 60;
const STOPS = 15;
const OPEN_HOLD = 1.3; // seconds on the first stop
const PER_STOP = 1.7; // seconds per stop: the spin plus time to read the caption
const END_HOLD = 2.4; // seconds on "Today"

// A tiny file server for dist/.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(DIST, name === '/' ? 'index.html' : name);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-color-profile=srgb'],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });

// Replace the page's clock before any of its code runs.
await page.evaluateOnNewDocument(() => {
  const realFrame = window.requestAnimationFrame.bind(window);
  let now = 0;
  let frames = [];
  let timers = [];
  let id = 1;
  const seen = new WeakSet();
  performance.now = () => now;
  Date.now = () => 1700000000000 + now;
  window.requestAnimationFrame = (fn) => { frames.push({ id: ++id, fn }); return id; };
  window.cancelAnimationFrame = (handle) => { frames = frames.filter((f) => f.id !== handle); };
  window.setTimeout = (fn, delay = 0, ...args) => { timers.push({ id: ++id, at: now + delay, fn: () => fn(...args) }); return id; };
  window.clearTimeout = (handle) => { timers = timers.filter((t) => t.id !== handle); };

  // Moves the page forward by `ms` and resolves once the browser has drawn the result.
  window.__step = (ms) => {
    now += ms;
    const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
    timers = timers.filter((t) => t.at > now);
    for (const timer of due) timer.fn();
    const batch = frames;
    frames = [];
    for (const frame of batch) frame.fn(now);
    // CSS animations and transitions are frozen and moved by hand, on the same clock.
    for (const animation of document.getAnimations()) {
      if (!seen.has(animation)) { seen.add(animation); animation.pause(); animation.currentTime = 0; }
      else animation.currentTime = Number(animation.currentTime) + ms;
    }
    return new Promise((done) => realFrame(() => realFrame(done)));
  };
});

await page.goto(`${origin}/?stop=parsua${lang === 'fa' ? '&lang=fa' : ''}`, { waitUntil: 'networkidle0' });
// Only the piece itself: no top bar, no footer.
await page.addStyleTag({ content: '.mark, .tools, .sig { display: none !important; }' });

const step = () => page.evaluate((ms) => window.__step(ms), 1000 / FPS);
// Let the globe appear, the fonts arrive and everything settle before filming.
await page.waitForSelector('.globe.ready');
await page.evaluate(() => document.fonts.ready);
for (let i = 0; i < FPS * 2.5; i++) await step();

const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const finished = new Promise((done) => ffmpeg.on('close', done));

const cdp = await page.createCDPSession();
const total = Math.round((OPEN_HOLD + (STOPS - 1) * PER_STOP + END_HOLD) * FPS);
let moved = 0;
for (let f = 0; f < total; f++) {
  // Time for the next stop? Press the same key a visitor would.
  const wanted = Math.min(STOPS - 1, Math.max(0, Math.floor((f / FPS - OPEN_HOLD) / PER_STOP) + 1));
  if (wanted > moved) {
    moved = wanted;
    await page.evaluate(() => document.querySelector('.ruler').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
  }
  await step();
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: W, height: H, scale: 2 } });
  if (!ffmpeg.stdin.write(Buffer.from(data, 'base64'))) await new Promise((done) => ffmpeg.stdin.once('drain', done));
  if (f % 300 === 0) console.log(`${out}: frame ${f}/${total}`);
}
ffmpeg.stdin.end();
await finished;
await browser.close();
server.close();
console.log(`${out}: done`);
