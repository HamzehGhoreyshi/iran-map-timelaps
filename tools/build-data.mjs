// Builds public/map.json from the open "historical-basemaps" border files.
// Run: npm run data
// For every stop in src/eras.js it downloads the border file of that year into
// tools/source-data/ (once) and saves three things:
//   - eras:      the outline(s) of Persia in each year
//   - countries: today's countries near Persia (the map that shows underneath)
//   - world:     all land, coarse (only seen while the globe spins)
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ERAS } from '../src/eras.js';
import { WINDOW } from '../src/window.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(here, 'source-data');
const OUT = path.join(here, '..', 'public', 'map.json');
const BASE = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson';

const DETAIL = 0.035; // degrees: points closer to a straight line than this are dropped
const WORLD_DETAIL = 0.15;
const MIN_RING_AREA = 0.03; // square degrees: drops specks that are invisible on the globe
const round = (n) => Math.round(n * 100) / 100;

async function loadWorld(file) {
  const local = path.join(SRC_DIR, `world_${file}.geojson`);
  try {
    await access(local);
  } catch {
    const res = await fetch(`${BASE}/world_${file}.geojson`);
    if (!res.ok) throw new Error(`Download failed for ${file}: ${res.status}`);
    await mkdir(SRC_DIR, { recursive: true });
    await writeFile(local, await res.text());
  }
  return JSON.parse(await readFile(local, 'utf8'));
}

function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

// Douglas-Peucker line simplification: keeps the points that carry the shape.
function simplify(ring, tolerance) {
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a];
    const [bx, by] = ring[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      // distance to the line a-b (or to the point itself when a ring starts and ends on it)
      const d = len
        ? Math.abs((ring[i][0] - ax) * dy - (ring[i][1] - ay) * dx) / len
        : Math.hypot(ring[i][0] - ax, ring[i][1] - ay);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tolerance) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  const out = [];
  ring.forEach((p, i) => { if (keep[i]) out.push([round(p[0]), round(p[1])]); });
  return out;
}

function bbox(ring) {
  let minX = 180, maxX = -180, minY = 90, maxY = -90;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

const inWindow = ([minX, minY, maxX, maxY]) =>
  maxX > WINDOW.lon0 && minX < WINDOW.lon1 && maxY > WINDOW.lat0 && minY < WINDOW.lat1;

// Turns one GeoJSON feature into a list of polygons (each a list of rings).
function polygonsOf(feature, { tolerance, windowOnly, minArea = MIN_RING_AREA }) {
  const polys = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
  const out = [];
  for (const poly of polys) {
    if (ringArea(poly[0]) < minArea) continue;
    if (windowOnly && !inWindow(bbox(poly[0]))) continue;
    const rings = poly
      .filter((ring, i) => i === 0 || ringArea(ring) >= MIN_RING_AREA)
      .map((ring) => simplify(ring, tolerance))
      .filter((ring) => ring.length > 3);
    if (rings.length) out.push(rings);
  }
  return out;
}

// Finds a good spot for a name inside a shape: the point (on a grid, inside the part of
// the map that faces the viewer) that is farthest from the shape's own border.
const LABEL_BOX = { lon0: 12, lon1: 96, lat0: 8, lat1: 60 };
function inside(rings, x, y) {
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[i], [x2, y2] = ring[j];
      if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) hit = !hit;
    }
  }
  return hit;
}
function distanceToBorder(rings, x, y) {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x1, y1] = ring[j], [x2, y2] = ring[i];
      const dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
      best = Math.min(best, Math.hypot(x - x1 - t * dx, y - y1 - t * dy));
    }
  }
  return best;
}
function labelSpot(polygons) {
  let spot = null;
  for (const rings of polygons) {
    const [minX, minY, maxX, maxY] = bbox(rings[0]);
    const x0 = Math.max(minX, LABEL_BOX.lon0), x1 = Math.min(maxX, LABEL_BOX.lon1);
    const y0 = Math.max(minY, LABEL_BOX.lat0), y1 = Math.min(maxY, LABEL_BOX.lat1);
    const step = Math.max(0.4, Math.max(x1 - x0, y1 - y0) / 40);
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        if (!inside(rings, x, y)) continue;
        // also keep away from the edge of the facing area
        const room = Math.min(distanceToBorder(rings, x, y), x - LABEL_BOX.lon0, LABEL_BOX.lon1 - x, y - LABEL_BOX.lat0, LABEL_BOX.lat1 - y);
        if (!spot || room > spot.room) spot = { lon: round(x), lat: round(y), room: round(room) };
      }
    }
  }
  return spot;
}

// Packs rings small: whole numbers in hundredths of a degree, each point stored as the
// step from the previous one ([x0, y0, dx, dy, dx, dy, ...]). src/mapdata.js unpacks it.
function pack(polygons) {
  return polygons.flat().map((ring) => {
    const points = ring.slice(0, -1); // the last point repeats the first
    const out = [];
    let px = 0, py = 0;
    for (const [x, y] of points) {
      const ix = Math.round(x * 100), iy = Math.round(y * 100);
      out.push(ix - px, iy - py);
      px = ix; py = iy;
    }
    return out;
  });
}

const eras = {};
for (const era of ERAS) {
  if (!era.names) { eras[era.id] = { bbox: null, rings: [] }; continue; }
  const world = await loadWorld(era.file);
  const persia = [];
  for (const feature of world.features) {
    if (feature.geometry && era.names.includes(feature.properties.NAME)) {
      persia.push(...polygonsOf(feature, { tolerance: DETAIL }));
    }
  }
  if (!persia.length) throw new Error(`No shape found for "${era.id}" (${era.names.join(', ')} in ${era.file})`);

  // Bounding box of the big pieces only, used to aim the globe.
  const biggest = Math.max(...persia.map((p) => ringArea(p[0])));
  const boxes = persia.filter((p) => ringArea(p[0]) >= biggest * 0.05).map((p) => bbox(p[0]));
  const box = [
    Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3])),
  ];
  eras[era.id] = { bbox: box, rings: pack(persia) };
  console.log(era.id.padEnd(12), `${persia.length} piece(s)`);
}

// Today's world, twice:
//   - world: all land, coarse. Only seen small or blurred, mid-spin.
//   - countries: today's countries near Persia, detailed. This is the map that stays
//     visible underneath Persia in every year. `label` is where its name goes.
const modern = await loadWorld('2010');
const world = [];
const countries = [];
for (const feature of modern.features) {
  if (!feature.geometry) continue;
  world.push(...polygonsOf(feature, { tolerance: WORLD_DETAIL, minArea: 0.4 }));
  const polygons = polygonsOf(feature, { tolerance: DETAIL, windowOnly: true });
  if (!polygons.length) continue;
  const name = feature.properties.NAME || '';
  const spot = name ? labelSpot(polygons) : null;
  countries.push({ name, rings: pack(polygons), ...(spot && spot.room >= 0.9 ? { label: [spot.lon, spot.lat, spot.room] } : {}) });
}
console.log(`${countries.length} modern countries`);

await mkdir(path.dirname(OUT), { recursive: true });
const json = JSON.stringify({ world: pack(world), countries, eras });
await writeFile(OUT, json);
console.log('Saved', path.relative(process.cwd(), OUT), `${Math.round(json.length / 1024)} KB`);
