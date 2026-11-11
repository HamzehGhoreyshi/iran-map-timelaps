// Records the master demo video: a hand on the mouse scrubs the timeline from 844 BC to today.
//
// Same frame-by-frame method as record.mjs (the page's clock is replaced, so every frame is
// exactly 1/60 s after the last), plus a real mouse: each frame the script sends a genuine
// mouse move to Chrome, so the ruler reacts exactly as it does for a visitor (ticks magnify,
// stops change on hover). A macOS-style arrow is drawn on top, because headless Chrome films
// no system cursor. The arrow moves like a person: eased, slightly curved paths, a small
// overshoot on long moves, a little hand tremor while resting.
//
// The frame is filmed at 3x and scaled down to the output size, for clean edges.
// Needs: Google Chrome, ffmpeg, and `npm i --no-save puppeteer-core`. Run `npm run build` first.
//   node tools/record-cursor.mjs <out.mp4> [css width] [css height] [lang] [output width]
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const [out, width = '540', height = '540', lang = 'en', outWidth = '1080'] = process.argv.slice(2);
if (!out) throw new Error('usage: node tools/record-cursor.mjs <out.mp4> [width] [height] [lang] [output width]');
const W = Number(width), H = Number(height);
const OW = Number(outWidth), OH = Math.round((OW * H) / W / 2) * 2;
const SCALE = 3;
const DIST = path.resolve('dist');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FPS = 60;
const STOPS = 15;

// ---------- a tiny file server for dist/ ----------
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
await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });

// ---------- the page's clock, driven from here ----------
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
  window.__step = (ms) => {
    now += ms;
    const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
    timers = timers.filter((t) => t.at > now);
    for (const timer of due) timer.fn();
    const batch = frames;
    frames = [];
    for (const frame of batch) frame.fn(now);
    for (const animation of document.getAnimations()) {
      if (!seen.has(animation)) { seen.add(animation); animation.pause(); animation.currentTime = 0; }
      else animation.currentTime = Number(animation.currentTime) + ms;
    }
    return new Promise((done) => realFrame(() => realFrame(done)));
  };
});

await page.goto(`${origin}/?stop=parsua${lang === 'fa' ? '&lang=fa' : ''}`, { waitUntil: 'networkidle0' });
// Only the piece itself: no top bar, no footer. Plus the drawn cursor.
await page.addStyleTag({
  content: `.mark, .tools, .sig { display: none !important; }
  #cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none; will-change: transform;
    filter: drop-shadow(0 1.2px 1.6px rgba(0,0,0,.32)); }`,
});
// macOS-style arrow: black body, white rim. Drawn 1.3x the normal size so it reads on a phone;
// the tip (the hotspot) sits at (3.9, 3.9).
await page.evaluate(() => {
  const cursor = document.createElement('div');
  cursor.id = 'cursor';
  cursor.innerHTML = `<svg width="28.6" height="39" viewBox="0 0 22 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3 L3 20.2 L7.15 16.25 L10.05 23.05 L13.05 21.8 L10.2 15.1 L15.9 15.1 Z"
      fill="#000" stroke="#fff" stroke-width="1.7" stroke-linejoin="round" paint-order="stroke"/></svg>`;
  document.body.append(cursor);
});

const step = () => page.evaluate((ms) => window.__step(ms), 1000 / FPS);
await page.waitForSelector('.globe.ready');
await page.evaluate(() => document.fonts.ready);
for (let i = 0; i < FPS * 2.5; i++) await step();

// Where each stop sits on the ruler, in page pixels.
const geometry = await page.evaluate(() => {
  const stops = [...document.querySelectorAll('.ticks i.stop')].map((t) => { const b = t.getBoundingClientRect(); return b.left + b.width / 2; });
  const ticks = document.querySelector('.ticks').getBoundingClientRect();
  const ruler = document.querySelector('.ruler').getBoundingClientRect();
  return { stops, tickY: ticks.top + ticks.height * 0.55, ruler: { left: ruler.left, right: ruler.right, top: ruler.top, bottom: ruler.bottom } };
});
if (geometry.stops.length !== STOPS) throw new Error(`expected ${STOPS} stops, found ${geometry.stops.length}`);
// The ruler is drawn left to right in English (BC on the left) and mirrored in Persian.
const order = lang === 'fa' ? [...geometry.stops].sort((a, b) => b - a) : [...geometry.stops].sort((a, b) => a - b);

// ---------- the hand: a list of moves and rests, turned into one position per frame ----------
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (a, b) => a + (b - a) * random();
const minJerk = (t) => t * t * t * (10 - 15 * t + 6 * t * t); // how a hand speeds up and slows down

const plan = []; // { from, to, start, end, bend } — positions between moves are rests
let clock = 0;
let at = { x: lang === 'fa' ? W + 30 : -30, y: H * 0.62 };
function rest(seconds) { clock += seconds; }
function move(to, seconds, { bend = between(-0.12, 0.12), overshoot = 0 } = {}) {
  if (overshoot) {
    const dx = to.x - at.x, dy = to.y - at.y;
    const past = { x: to.x + dx * overshoot, y: to.y + dy * overshoot + between(-1, 1) };
    plan.push({ from: at, to: past, start: clock, end: clock + seconds * 0.8, bend });
    clock += seconds * 0.8;
    at = past;
    plan.push({ from: at, to, start: clock, end: clock + seconds * 0.35, bend: 0 });
    clock += seconds * 0.35;
  } else {
    plan.push({ from: at, to, start: clock, end: clock + seconds, bend });
    clock += seconds;
  }
  at = to;
}

const onStop = (i) => ({ x: order[i] + between(-1.2, 1.2), y: geometry.tickY + between(-2.5, 2.5) });
// 1. The film opens with the hand already resting on the first stop.
at = onStop(0);
rest(1.0);
// 2. One stop at a time to today, pausing to read each caption.
for (let i = 1; i < STOPS; i++) {
  move(onStop(i), between(0.34, 0.44), { bend: between(-0.18, 0.18) });
  rest(i === STOPS - 1 ? 1.1 : between(1.22, 1.4));
}
// 3. The hand drifts away from the ruler and rests; the last frame is clean.
move({ x: order[STOPS - 1] + (lang === 'fa' ? -70 : 70), y: geometry.ruler.bottom + 26 }, 0.9, { bend: 0.12 });
rest(2.2);
const DURATION = clock;

function handAt(t) {
  const now = plan.find((p) => t >= p.start && t < p.end);
  let x, y;
  if (now) {
    const s = minJerk((t - now.start) / (now.end - now.start));
    const dx = now.to.x - now.from.x, dy = now.to.y - now.from.y;
    const arc = now.bend * Math.sin(Math.PI * s); // a slight curve sideways, as a wrist turns
    x = now.from.x + dx * s - dy * arc;
    y = now.from.y + dy * s + dx * arc;
  } else {
    const last = [...plan].reverse().find((p) => p.end <= t);
    ({ x, y } = last ? last.to : plan[0].from);
  }
  // A resting hand is never perfectly still: a slow tremor well under a pixel.
  x += 0.35 * Math.sin(t * 1.7) + 0.2 * Math.sin(t * 4.3 + 1);
  y += 0.3 * Math.sin(t * 1.3 + 2) + 0.18 * Math.sin(t * 3.7);
  return { x, y };
}

// ---------- film it ----------
const ffmpeg = spawn('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-vf', `scale=${OW}:${OH}:flags=lanczos`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const finished = new Promise((done) => ffmpeg.on('close', done));

const cdp = await page.createCDPSession();
const total = Math.round(DURATION * FPS);
for (let f = 0; f < total; f++) {
  const { x, y } = handAt(f / FPS);
  await page.mouse.move(x, y);
  await page.evaluate((cx, cy) => { document.getElementById('cursor').style.transform = `translate(${cx - 3.9}px, ${cy - 3.9}px)`; }, x, y);
  await step();
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false, clip: { x: 0, y: 0, width: W, height: H, scale: SCALE } });
  if (!ffmpeg.stdin.write(Buffer.from(data, 'base64'))) await new Promise((done) => ffmpeg.stdin.once('drain', done));
  if (f % 300 === 0) console.log(`${out}: frame ${f}/${total}`);
}
ffmpeg.stdin.end();
await finished;
await browser.close();
server.close();
console.log(`${out}: done (${DURATION.toFixed(1)} s)`);
