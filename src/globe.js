// The 3D globe: a minimal, near-white ball with thin grey borders.
// One sphere with a custom shader and three textures, all painted on 2D canvases:
//   - a small whole-world map (ivory sea, plain land) that is only really seen mid-spin
//   - two detailed "year" layers covering the region around Persia: today's countries, very
//     faint, with Persia of that year as a see-through colour on top. Two exist so one can
//     fade into the other.
// The shader adds the grid lines, the glossy light, and smears the map sideways in
// proportion to the spin speed, which gives the motion blur.
import * as THREE from 'three';
import { WINDOW } from './window.js';
import { LABELS } from './labels.js';

const LAYER_W = 3072;
const LAYER_H = Math.round((LAYER_W * (WINDOW.lat1 - WINDOW.lat0)) / (WINDOW.lon1 - WINDOW.lon0));
const WORLD_W = 2048;
const WORLD_H = 1024;

const CAMERA_DISTANCE = 1.75; // in globe radii: close, so the facing side looks magnified
const FRAME = 1.06; // canvas is a little larger than the globe so its edge is never cut
const SPIN_STIFFNESS = 6.5; // higher = faster spin
const AIM_SPEED = 3.5;
const FADE_SECONDS = 0.55;
const FADE_DELAY = 0.12;
const DEG = Math.PI / 180;

const SEA = '#fbfbfa';
const LAND = '#eeeeec';
const COAST = 'rgba(60, 60, 66, 0.3)';
const BORDER = 'rgba(60, 60, 66, 0.16)';
const INK = 'rgba(60, 60, 66, 0.55)';
const COUNTRY_STRENGTH = 0; // 0 = all countries share one quiet land tone (set above 0 for pastel tints)
const OVERLAY = 0.6; // how solid Persia's fill is: the countries underneath stay readable // how much of a neighbour's pastel shows over the plain land
const MAX_LABELS = 12;
const HOME = [53, 33]; // Iran: names closer to it win when space is short
const FONTS = { en: "'Manrope Variable', Manrope, sans-serif", fa: "Ravi, Vazirmatn, sans-serif" };
// Muted print colours for the neighbours. A state keeps its colour in every year.
const PASTELS = ['#cbd8b3', '#ecd9a0', '#e6c0b4', '#bdd6de', '#dccba8', '#d0c5dd', '#bccba2', '#efcfa9', '#c3d9cd', '#e3c9d2'];

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  #define TAPS 14
  uniform sampler2D uWorld;
  uniform sampler2D uLayerA;
  uniform sampler2D uLayerB;
  uniform float uMix;
  uniform float uBlur;
  uniform vec4 uWindow; // u0, v0, u1, v1 of the detailed layer on the globe
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // 1 on a grid line, 0 away from it. "value" is in degrees, lines repeat every "every" degrees.
  float gridLine(float value, float every, float width) {
    float d = abs(fract(value / every - 0.5) - 0.5) * every;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, d / fwidth(value));
  }

  void main() {
    vec3 world = vec3(0.0);
    vec4 layer = vec4(0.0);
    float jitter = hash(gl_FragCoord.xy);
    for (int i = 0; i < TAPS; i++) {
      float f = (float(i) + jitter) / float(TAPS) - 0.5;
      vec2 uv = vUv + vec2(f * uBlur, 0.0);
      world += texture2D(uWorld, uv).rgb;
      vec2 w = (uv - uWindow.xy) / (uWindow.zw - uWindow.xy);
      float inside = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
      vec4 a = texture2D(uLayerA, w);
      vec4 b = texture2D(uLayerB, w);
      // premultiply so transparent texels do not bleed their colour into the fade
      a.rgb *= a.a; b.rgb *= b.a;
      layer += mix(a, b, uMix) * inside;
    }
    world /= float(TAPS);
    layer /= float(TAPS);
    vec3 color = world * (1.0 - layer.a) + layer.rgb;

    // printed grid: a line every 15 degrees, a dashed equator. Meridians vanish while spinning.
    float lon = vUv.x * 360.0;
    float lat = vUv.y * 180.0;
    float still = 1.0 - smoothstep(0.0, 0.012, uBlur);
    float polar = smoothstep(4.0, 12.0, lat) * smoothstep(176.0, 168.0, lat);
    float grid = max(gridLine(lon, 15.0, 0.4) * still * polar, gridLine(lat, 15.0, 0.4));
    float equator = (1.0 - smoothstep(0.5, 1.4, abs(lat - 90.0) / fwidth(lat)))
      * mix(1.0, step(0.5, fract(lon / 2.4)), still);
    vec3 ink = vec3(0.24, 0.24, 0.27);
    color = mix(color, ink, grid * 0.09);
    color = mix(color, ink, equator * 0.22);

    // matte white ball: very soft shade, a cool grey rim, one small highlight
    vec3 n = normalize(vNormal);
    vec3 l = normalize(uLight);
    float lambert = dot(n, l);
    float facing = max(dot(n, vView), 0.0);
    float shade = mix(0.84, 1.0, smoothstep(-0.5, 0.75, lambert));
    float rim = pow(1.0 - facing, 2.4);
    vec3 h = normalize(l + vView);
    float gloss = pow(max(dot(n, h), 0.0), 110.0) * 0.36 + pow(max(dot(n, h), 0.0), 12.0) * 0.02;

    color *= shade;
    color = mix(color, vec3(0.56, 0.57, 0.6), rim * 0.42);
    color += vec3(gloss);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, ctx: canvas.getContext('2d'), texture };
}

// Maps longitude/latitude to pixels of a canvas that covers the given box of the world.
function projector(box, width, height) {
  return {
    x: (lon) => ((lon - box.lon0) / (box.lon1 - box.lon0)) * width,
    y: (lat) => ((box.lat1 - lat) / (box.lat1 - box.lat0)) * height,
    perDegree: width / (box.lon1 - box.lon0),
  };
}

function trace(ctx, polygons, to) {
  ctx.beginPath();
  for (const polygon of polygons) {
    for (const ring of polygon) {
      ring.forEach(([lon, lat], i) => (i ? ctx.lineTo(to.x(lon), to.y(lat)) : ctx.moveTo(to.x(lon), to.y(lat))));
      ctx.closePath();
    }
  }
}

function pastelFor(name) {
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PASTELS[h % PASTELS.length];
}

function darker(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const part = (shift) => Math.round(((n >> shift) & 255) * (1 - amount));
  return `rgb(${part(16)},${part(8)},${part(0)})`;
}

function paintWorld(layer, land) {
  const { ctx } = layer;
  const to = projector({ lon0: -180, lon1: 180, lat0: -90, lat1: 90 }, WORLD_W, WORLD_H);
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  trace(ctx, land, to);
  ctx.fillStyle = LAND;
  ctx.fill('evenodd');
  ctx.lineWidth = 1;
  ctx.strokeStyle = COAST;
  ctx.stroke();
  layer.texture.needsUpdate = true;
}

// Prints the names of a few neighbours. Each name sits at the roomiest point of its state
// (worked out in tools/build-data.mjs), sized to fit, and is skipped if it would touch another.
function paintLabels(ctx, to, others, lang) {
  const wanted = others
    .filter((other) => other.label && LABELS[other.name])
    .map((other) => {
      const { lon, lat, room } = other.label;
      const away = Math.hypot(lon - HOME[0], lat - HOME[1]);
      return { ...other.label, text: LABELS[other.name][lang], score: room * Math.exp(-away / 45) };
    })
    .sort((a, b) => b.score - a.score);

  const placed = [];
  const seen = new Set();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = lang === 'en' ? '2px' : '0px';
  for (const label of wanted) {
    if (placed.length === MAX_LABELS) break;
    if (seen.has(label.text)) continue;
    const text = lang === 'en' ? label.text.toUpperCase() : label.text;
    // The map is stretched sideways away from the equator; widen the text so it looks normal on the globe.
    const stretch = 1 / Math.cos((label.lat * Math.PI) / 180);
    let size = Math.min(Math.max(label.room * 0.34, 0.8), 1.35) * to.perDegree * (lang === 'fa' ? 1.2 : 1);
    ctx.font = `${lang === 'fa' ? 600 : 700} ${size}px ${FONTS[lang]}`;
    const fit = (label.room * 3.4 * to.perDegree) / (ctx.measureText(text).width * stretch);
    if (fit < 1) {
      size = Math.max(size * fit, 0.75 * to.perDegree);
      ctx.font = `${lang === 'fa' ? 600 : 700} ${size}px ${FONTS[lang]}`;
    }
    const width = ctx.measureText(text).width * stretch;
    const x = to.x(label.lon);
    const y = to.y(label.lat);
    const box = [x - width / 2 - 10, y - size * 0.8, x + width / 2 + 10, y + size * 0.8];
    if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    placed.push(box);
    seen.add(label.text);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretch, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// Draws one stop: plain land, today's countries very faintly with their names, then
// Persia of that year as a see-through colour on top, so you can read which of
// today's countries it covered.
function paintLayer(layer, era, shape, map, lang, color) {
  const { ctx } = layer;
  const to = projector(WINDOW, LAYER_W, LAYER_H);
  ctx.clearRect(0, 0, LAYER_W, LAYER_H);
  ctx.lineJoin = 'round';

  trace(ctx, map.land, to);
  ctx.fillStyle = LAND;
  ctx.fill('evenodd');
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = COAST;
  ctx.stroke();

  for (const country of map.countries) {
    trace(ctx, country.polygons, to);
    ctx.fillStyle = pastelFor(country.name);
    ctx.globalAlpha = COUNTRY_STRENGTH;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = BORDER;
    ctx.stroke();
  }
  paintLabels(ctx, to, map.countries, lang);

  if (shape.persia.length) {
    trace(ctx, shape.persia, to);
    ctx.fillStyle = color;
    ctx.globalAlpha = OVERLAY;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  if (era.marker) {
    const x = to.x(era.marker.lon);
    const y = to.y(era.marker.lat);
    const radius = era.marker.radius * to.perDegree;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.2);
    glow.addColorStop(0, color);
    glow.addColorStop(0.45, `${color}b0`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = darker(color, 0.35);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  layer.texture.needsUpdate = true;
}

// Where the globe should point for a stop: the middle of its territory,
// kept close to Iran so the country never drifts out of the centre.
function aimFor(era, shape) {
  if (era.center) return era.center;
  const [minX, minY, maxX, maxY] = shape.bbox;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return [clamp((minX + maxX) / 2, 44, 60), clamp((minY + maxY) / 2, 29, 36)];
}

export function createGlobe(canvas, { eras, map, reducedMotion, lang, highlight }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const halfAngle = Math.asin(1 / CAMERA_DISTANCE);
  const camera = new THREE.PerspectiveCamera(((2 * halfAngle) / DEG) * FRAME, 1, 0.1, 10);
  camera.position.z = CAMERA_DISTANCE;

  const world = makeCanvas(WORLD_W, WORLD_H);
  world.texture.wrapS = THREE.RepeatWrapping;
  paintWorld(world, map.land);

  const layers = [makeCanvas(LAYER_W, LAYER_H), makeCanvas(LAYER_W, LAYER_H)]; // [shown, incoming]
  const painted = new Map(); // which stop each layer currently shows
  const uniforms = {
    uWorld: { value: world.texture },
    uLayerA: { value: layers[0].texture },
    uLayerB: { value: layers[1].texture },
    uMix: { value: 0 },
    uBlur: { value: 0 },
    uWindow: {
      value: new THREE.Vector4(
        (WINDOW.lon0 + 180) / 360, (WINDOW.lat0 + 90) / 180,
        (WINDOW.lon1 + 180) / 360, (WINDOW.lat1 + 90) / 180,
      ),
    },
    uLight: { value: new THREE.Vector3(-0.8, 0.78, 0.5) },
  };

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 160, 96),
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT }),
  );
  const tilt = new THREE.Group(); // tilts the pole so the aimed latitude faces the camera
  tilt.add(sphere);
  const scene = new THREE.Scene();
  scene.add(tilt);

  let index = -1;
  let spin = 0, spinVelocity = 0, spinTarget = 0; // extra turns, in radians
  let aim = [53, 33], aimTarget = [53, 33];
  let fade = 0; // seconds since the current fade started
  let fading = false;
  let last = performance.now();

  function resize() {
    const size = canvas.clientWidth;
    if (size) renderer.setSize(size, size, false);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function show(next) {
    if (next === index) return;
    const era = eras[next];
    const shape = map.eras[era.id];
    const direction = next > index ? 1 : -1;

    // If the last fade is mostly done, the incoming layer becomes the shown one.
    if (uniforms.uMix.value > 0.5) {
      layers.reverse();
      uniforms.uLayerA.value = layers[0].texture;
      uniforms.uLayerB.value = layers[1].texture;
    }
    paintLayer(layers[1], era, shape, map, lang, highlight);
    painted.set(layers[1], next);
    uniforms.uMix.value = 0;
    fade = 0;
    fading = true;
    aimTarget = aimFor(era, shape);

    if (index === -1) {
      aim = [...aimTarget];
      uniforms.uMix.value = 1;
      fading = false;
    } else if (!reducedMotion && Math.abs(spinTarget - spin) < Math.PI * 3) {
      spinTarget += direction * Math.PI * 2; // one full turn per step, never a long queue
    }
    index = next;
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Critically damped spring: starts fast, lands softly, no overshoot.
    const pull = SPIN_STIFFNESS * SPIN_STIFFNESS * (spinTarget - spin) - 2 * SPIN_STIFFNESS * spinVelocity;
    spinVelocity += pull * dt;
    spin += spinVelocity * dt;

    const k = 1 - Math.exp(-AIM_SPEED * dt);
    aim[0] += (aimTarget[0] - aim[0]) * k;
    aim[1] += (aimTarget[1] - aim[1]) * k;

    if (fading) {
      fade += dt;
      const t = Math.min(Math.max((fade - (reducedMotion ? 0 : FADE_DELAY)) / FADE_SECONDS, 0), 1);
      uniforms.uMix.value = t * t * (3 - 2 * t);
      if (t === 1) fading = false;
    }

    const sway = reducedMotion ? 0 : Math.sin(now / 2600) * 0.045;
    const nod = reducedMotion ? 0 : Math.sin(now / 3700) * 0.02;
    sphere.rotation.y = -Math.PI / 2 - aim[0] * DEG + spin + sway;
    tilt.rotation.x = aim[1] * DEG + nod;

    // blur length = how far the surface travels during a 1/50 s exposure, in texture widths
    uniforms.uBlur.value = Math.min(Math.abs(spinVelocity) / 50 / (Math.PI * 2), 0.09);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Reprints the names in another language (also used once the fonts have loaded).
  function setLang(next) {
    lang = next;
    for (const [layer, stop] of painted) paintLayer(layer, eras[stop], map.eras[eras[stop].id], map, lang, highlight);
  }

  return { show, setLang };
}
