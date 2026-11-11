// Builds public/favicon.svg: a tiny version of the globe with Iran highlighted.
// Run: node tools/build-icon.mjs   (after npm run data)
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const map = JSON.parse(await readFile(path.join(root, 'public', 'map.json'), 'utf8'));
const iran = map.eras.today.persia[0][0];

// Keep every n-th point: at 32 px nobody can see more detail than that.
const step = Math.ceil(iran.length / 48);
const points = iran.filter((_, i) => i % step === 0);
const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
const scale = 15 / Math.max((maxX - minX) * 0.84, maxY - minY); // 0.84 = cos(33 deg), Iran's latitude
const d = points
  .map(([x, y], i) => {
    const px = 16 + (x - (minX + maxX) / 2) * 0.84 * scale;
    const py = 16.2 - (y - (minY + maxY) / 2) * scale;
    return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`;
  })
  .join('') + 'Z';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs><radialGradient id="g" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eeeeec"/><stop offset="1" stop-color="#c4c5c9"/></radialGradient></defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <g fill="none" stroke="#6a6a72" stroke-opacity=".45" stroke-width=".7"><ellipse cx="16" cy="16" rx="7" ry="15"/><path d="M1.6 12q14.4 4 28.8 0M2.6 22q13.4 4 26.8 0"/></g>
  <path d="${d}" fill="#12c46b" stroke="#0f8a57" stroke-width=".9" stroke-linejoin="round"/>
  <circle cx="16" cy="16" r="14.6" fill="none" stroke="#6a6a72" stroke-opacity=".5" stroke-width=".8"/>
</svg>
`;
await writeFile(path.join(root, 'public', 'favicon.svg'), svg);
console.log('Saved public/favicon.svg');
