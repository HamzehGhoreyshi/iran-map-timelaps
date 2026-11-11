// The 3D globe: a minimal, near-white ball with thin grey borders.
// It is one sphere drawn with plain WebGL (no 3D library: one ball does not need one).
// The map on it comes from three pictures, all painted on 2D canvases:
//   - a small whole-world map that is only really seen mid-spin
//   - two detailed "year" layers covering the region around Persia: today's countries, very
//     faint, with Persia of that year as a see-through colour on top. Two exist so one can
//     fade into the other.
// The shader adds the grid lines and the light, and smears the map sideways in proportion
// to the spin speed, which gives the motion blur.
import { WINDOW } from './window.js';
import { LABELS } from './labels.js';

const WORLD_W = 2048;
const WORLD_H = 1024;

const CAMERA_DISTANCE = 1.75; // in globe radii: close, so the facing side looks magnified
const FRAME = 1.06; // canvas is a little larger than the globe so its edge is never cut
const SPIN_STIFFNESS = 6.5; // higher = faster spin
const AIM_SPEED = 3.5;
const FADE_SECONDS = 0.55;
const FADE_DELAY = 0.12;
const BLUR_TAPS = 14; // samples per pixel while spinning; 1 is used when the globe is still
const DEG = Math.PI / 180;

const SEA = '#fbfbfa';
const LAND = '#eeeeec';
const COAST = 'rgba(60, 60, 66, 0.23)';
const BORDER = 'rgba(60, 60, 66, 0.16)';
const INK = 'rgba(60, 60, 66, 0.55)';
const OVERLAY = 0.32; // how solid Persia's fill is: light, so the countries underneath stay readable
const MAX_LABELS = 12;
const HOME = [53, 33]; // Iran: names closer to it win when space is short
const FONTS = { en: "'Manrope Variable', Manrope, sans-serif", fa: 'Ravi, Vazirmatn, sans-serif' };

const VERTEX = /* glsl */ `#version 300 es
  in vec3 aPosition;
  in vec2 aUv;
  uniform mat3 uTurn;      // the globe's rotation
  uniform float uDistance; // camera distance
  uniform float uZoom;     // 1 / tan(half the viewing angle)
  out vec2 vUv;
  out vec3 vNormal;
  out vec3 vView;
  void main() {
    vec3 p = uTurn * aPosition;
    vec3 fromCamera = p - vec3(0.0, 0.0, uDistance);
    vUv = aUv;
    vNormal = p; // on a ball of radius 1 the surface direction equals the position
    vView = normalize(-fromCamera);
    gl_Position = vec4(fromCamera.xy * uZoom, 0.0, -fromCamera.z);
  }
`;

const FRAGMENT = /* glsl */ `#version 300 es
  precision highp float;
  uniform sampler2D uWorld;
  uniform sampler2D uLayerA;
  uniform sampler2D uLayerB;
  uniform float uMix;
  uniform float uBlur;
  uniform int uTaps;
  uniform vec4 uWindow; // u0, v0, u1, v1 of the detailed layer on the globe
  uniform vec3 uLight;
  in vec2 vUv;
  in vec3 vNormal;
  in vec3 vView;
  out vec4 outColor;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  // screen colours <-> light amounts, so fades and shading mix the way light does
  vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
  vec3 toScreen(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }

  // 1 on a grid line, 0 away from it. "value" is in degrees, lines repeat every "every" degrees.
  float gridLine(float value, float every, float width) {
    float d = abs(fract(value / every - 0.5) - 0.5) * every;
    return 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, d / fwidth(value));
  }

  void main() {
    vec3 world = vec3(0.0);
    vec4 layer = vec4(0.0);
    float jitter = uTaps > 1 ? hash(gl_FragCoord.xy) : 0.5;
    for (int i = 0; i < uTaps; i++) {
      float f = (float(i) + jitter) / float(uTaps) - 0.5;
      vec2 uv = vUv + vec2(f * uBlur, 0.0);
      world += toLinear(texture(uWorld, uv).rgb);
      vec2 w = (uv - uWindow.xy) / (uWindow.zw - uWindow.xy);
      float inside = step(0.0, w.x) * step(w.x, 1.0) * step(0.0, w.y) * step(w.y, 1.0);
      vec4 a = texture(uLayerA, w);
      vec4 b = texture(uLayerB, w);
      // weight colour by opacity so see-through texels do not bleed into the fade
      a.rgb = toLinear(a.rgb) * a.a;
      b.rgb = toLinear(b.rgb) * b.a;
      layer += mix(a, b, uMix) * inside;
    }
    world /= float(uTaps);
    layer /= float(uTaps);
    vec3 color = world * (1.0 - layer.a) + layer.rgb;

    // grid: a faint line every 15 degrees and the equator. Meridians vanish while spinning.
    float lon = vUv.x * 360.0;
    float lat = vUv.y * 180.0;
    float still = 1.0 - smoothstep(0.0, 0.012, uBlur);
    float polar = smoothstep(4.0, 12.0, lat) * smoothstep(176.0, 168.0, lat);
    float grid = max(gridLine(lon, 15.0, 0.4) * still * polar, gridLine(lat, 15.0, 0.4));
    float equator = (1.0 - smoothstep(0.5, 1.4, abs(lat - 90.0) / fwidth(lat)))
      * mix(1.0, step(0.5, fract(lon / 2.4)), still);
    vec3 ink = toLinear(vec3(0.24, 0.24, 0.27));
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
    color = mix(color, toLinear(vec3(0.56, 0.57, 0.6)), rim * 0.42);
    color += vec3(gloss);

    outColor = vec4(toScreen(color), 1.0);
  }
`;

// ---------- painting the map on 2D canvases ----------

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext('2d') };
}

// Maps longitude/latitude to pixels of a canvas that covers the given box of the world.
function projector(box, width, height) {
  return {
    x: (lon) => ((lon - box.lon0) / (box.lon1 - box.lon0)) * width,
    y: (lat) => ((box.lat1 - lat) / (box.lat1 - box.lat0)) * height,
    perDegree: width / (box.lon1 - box.lon0),
  };
}

function trace(ctx, rings, to) {
  for (const ring of rings) {
    ctx.moveTo(to.x(ring[0]), to.y(ring[1]));
    for (let i = 2; i < ring.length; i += 2) ctx.lineTo(to.x(ring[i]), to.y(ring[i + 1]));
    ctx.closePath();
  }
}

function paintWorld({ ctx }, rings) {
  const to = projector({ lon0: -180, lon1: 180, lat0: -90, lat1: 90 }, WORLD_W, WORLD_H);
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  ctx.beginPath();
  trace(ctx, rings, to);
  ctx.fillStyle = LAND;
  ctx.fill('evenodd');
  ctx.lineWidth = 1;
  ctx.strokeStyle = COAST;
  ctx.stroke();
}

// Prints the names of a few countries. Each name sits at the roomiest point of its country
// (worked out in tools/build-data.mjs), sized to fit, and is skipped if it would touch another.
function paintLabels(ctx, to, countries, lang) {
  const wanted = countries
    .filter((country) => country.label && LABELS[country.name])
    .map((country) => {
      const { lon, lat, room } = country.label;
      const away = Math.hypot(lon - HOME[0], lat - HOME[1]);
      return { ...country.label, text: LABELS[country.name][lang], score: room * Math.exp(-away / 45) };
    })
    .sort((a, b) => b.score - a.score);

  const placed = [];
  const weight = lang === 'fa' ? 600 : 700;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = lang === 'en' ? `${to.perDegree * 0.08}px` : '0px';
  for (const label of wanted) {
    if (placed.length === MAX_LABELS) break;
    const text = lang === 'en' ? label.text.toUpperCase() : label.text;
    // The map is stretched sideways away from the equator; widen the text so it looks normal on the globe.
    const stretch = 1 / Math.cos(label.lat * DEG);
    let size = Math.min(Math.max(label.room * 0.34, 0.8), 1.35) * to.perDegree * (lang === 'fa' ? 1.2 : 1);
    ctx.font = `${weight} ${size}px ${FONTS[lang]}`;
    const fit = (label.room * 3.4 * to.perDegree) / (ctx.measureText(text).width * stretch);
    if (fit < 1) {
      size = Math.max(size * fit, 0.75 * to.perDegree);
      ctx.font = `${weight} ${size}px ${FONTS[lang]}`;
    }
    const width = ctx.measureText(text).width * stretch;
    const x = to.x(label.lon);
    const y = to.y(label.lat);
    const box = [x - width / 2 - 10, y - size * 0.8, x + width / 2 + 10, y + size * 0.8];
    if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    placed.push(box);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(stretch, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// The part of a year layer that never changes: today's countries and their names.
// It is painted once per language and then copied under every year.
function paintBase({ canvas, ctx }, countries, lang) {
  const to = projector(WINDOW, canvas.width, canvas.height);
  const line = canvas.width / 3072; // stroke widths were tuned on a 3072 px wide layer
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.lineJoin = 'round';

  // Coastline first, as a wider line; the land fill then covers its inner half and every
  // inland border, so only the true coast keeps the stronger line.
  ctx.beginPath();
  for (const country of countries) trace(ctx, country.rings, to);
  ctx.lineWidth = 2.4 * line;
  ctx.strokeStyle = COAST;
  ctx.stroke();
  ctx.fillStyle = LAND;
  ctx.fill('nonzero');

  ctx.lineWidth = 1 * line;
  ctx.strokeStyle = BORDER;
  for (const country of countries) {
    ctx.beginPath();
    trace(ctx, country.rings, to);
    ctx.stroke();
  }
  paintLabels(ctx, to, countries, lang);
}

// One year = the shared base + Persia of that year as a see-through colour on top,
// so you can read which of today's countries it covered.
function paintYear({ canvas, ctx }, base, era, shape, color) {
  const to = projector(WINDOW, canvas.width, canvas.height);
  const line = canvas.width / 3072;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(base.canvas, 0, 0);

  if (shape.rings.length) {
    ctx.beginPath();
    trace(ctx, shape.rings, to);
    ctx.fillStyle = color;
    ctx.globalAlpha = OVERLAY;
    ctx.fill('evenodd');
    ctx.globalAlpha = 1;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3 * line;
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
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * line;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Where the globe should point for a stop: the middle of its territory,
// kept close to Iran so the country never drifts out of the centre.
function aimFor(era, shape) {
  if (era.center) return era.center;
  const [minX, minY, maxX, maxY] = shape.bbox;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return [clamp((minX + maxX) / 2, 44, 60), clamp((minY + maxY) / 2, 29, 36)];
}

// ---------- WebGL plumbing ----------

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

// A ball of radius 1 as a grid of triangles. Each corner knows its place on the map (uv).
function buildSphere(gl, program, columns = 96, rows = 64) {
  const corners = [];
  for (let r = 0; r <= rows; r++) {
    const lat = (r / rows - 0.5) * Math.PI;
    for (let c = 0; c <= columns; c++) {
      const lon = (c / columns - 0.5) * Math.PI * 2;
      corners.push(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon), c / columns, r / rows);
    }
  }
  const triangles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * (columns + 1) + c, b = a + 1, d = a + columns + 1, e = d + 1;
      triangles.push(a, b, d, b, e, d);
    }
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  const uv = gl.getAttribLocation(program, 'aUv');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 20, 0);
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 20, 12);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
  return triangles.length;
}

export function createGlobe(canvas, { eras, map, reducedMotion, lang, highlight }) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
  if (!gl) throw new Error('WebGL 2 is not available');

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const count = buildSphere(gl, program);
  gl.enable(gl.CULL_FACE); // only the side facing us is drawn
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // canvas top = north

  const uniform = (name) => gl.getUniformLocation(program, name);
  const sharpness = gl.getExtension('EXT_texture_filter_anisotropic');

  // Sends a painted canvas to the graphics card as texture number `unit`.
  function upload(unit, source, repeat) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (sharpness) gl.texParameterf(gl.TEXTURE_2D, sharpness.TEXTURE_MAX_ANISOTROPY_EXT, 8);
  }
  for (let unit = 0; unit < 3; unit++) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  }

  const world = makeCanvas(WORLD_W, WORLD_H);
  paintWorld(world, map.world);
  upload(0, world.canvas, true);

  // Big screens get a sharper year layer; phones a lighter one.
  const pixels = canvas.clientWidth * Math.min(window.devicePixelRatio, 2);
  const layerW = pixels > 760 ? 3072 : 2048;
  const layerH = Math.round((layerW * (WINDOW.lat1 - WINDOW.lat0)) / (WINDOW.lon1 - WINDOW.lon0));
  const base = makeCanvas(layerW, layerH);
  paintBase(base, map.countries, lang);
  // Two year layers. `shown` and `incoming` are their texture numbers (1 or 2); they swap roles.
  const layers = { 1: makeCanvas(layerW, layerH), 2: makeCanvas(layerW, layerH) };
  const stopOn = { 1: null, 2: null }; // which stop each layer currently holds
  let shown = 1, incoming = 2;

  const halfAngle = Math.asin(1 / CAMERA_DISTANCE) * FRAME;
  gl.uniform1f(uniform('uDistance'), CAMERA_DISTANCE);
  gl.uniform1f(uniform('uZoom'), 1 / Math.tan(halfAngle));
  gl.uniform1i(uniform('uWorld'), 0);
  gl.uniform3f(uniform('uLight'), -0.8, 0.78, 0.5);
  gl.uniform4f(
    uniform('uWindow'),
    (WINDOW.lon0 + 180) / 360, (WINDOW.lat0 + 90) / 180,
    (WINDOW.lon1 + 180) / 360, (WINDOW.lat1 + 90) / 180,
  );
  const uTurn = uniform('uTurn'), uMix = uniform('uMix'), uBlur = uniform('uBlur'), uTaps = uniform('uTaps');
  const uLayerA = uniform('uLayerA'), uLayerB = uniform('uLayerB');

  let index = -1;
  let spin = 0, spinVelocity = 0, spinTarget = 0; // extra turns, in radians
  let aim = [53, 33], aimTarget = [53, 33];
  let mix = 0;
  let fade = 0; // seconds since the current fade started
  let fading = false;
  let last = performance.now();

  function resize() {
    const size = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio, 2));
    if (!size || canvas.width === size) return;
    canvas.width = canvas.height = size;
    gl.viewport(0, 0, size, size);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  function paint(unit, stop) {
    const era = eras[stop];
    paintYear(layers[unit], base, era, map.eras[era.id], highlight);
    upload(unit, layers[unit].canvas, false);
    stopOn[unit] = stop;
  }

  function show(next) {
    if (next === index) return;
    const era = eras[next];
    const direction = next > index ? 1 : -1;

    // If the last fade is mostly done, the incoming layer becomes the shown one.
    if (mix > 0.5) [shown, incoming] = [incoming, shown];
    paint(incoming, next);
    mix = 0;
    fade = 0;
    fading = true;
    aimTarget = aimFor(era, map.eras[era.id]);

    if (index === -1) {
      aim = [...aimTarget];
      mix = 1;
      fading = false;
    } else if (!reducedMotion && Math.abs(spinTarget - spin) < Math.PI * 3) {
      spinTarget += direction * Math.PI * 2; // one full turn per step, never a long queue
    }
    index = next;
  }

  // Reprints the names in another language (also used once the fonts have loaded).
  function setLang(next) {
    lang = next;
    paintBase(base, map.countries, lang);
    for (const unit of [1, 2]) if (stopOn[unit] !== null) paint(unit, stopOn[unit]);
  }

  const turn = new Float32Array(9);
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
      mix = t * t * (3 - 2 * t);
      if (t === 1) fading = false;
    }

    // Rotation = spin around the pole, then tilt so the aimed latitude faces the camera.
    const sway = reducedMotion ? 0 : Math.sin(now / 2600) * 0.045;
    const nod = reducedMotion ? 0 : Math.sin(now / 3700) * 0.02;
    const yaw = -Math.PI / 2 - aim[0] * DEG + spin + sway;
    const pitch = aim[1] * DEG + nod;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // columns of (tilt matrix x spin matrix)
    turn.set([cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy]);

    // blur length = how far the surface travels during a 1/50 s exposure, in map widths
    const blur = Math.min(Math.abs(spinVelocity) / 50 / (Math.PI * 2), 0.09);

    gl.uniformMatrix3fv(uTurn, false, turn);
    gl.uniform1i(uLayerA, shown);
    gl.uniform1i(uLayerB, incoming);
    gl.uniform1f(uMix, mix);
    gl.uniform1f(uBlur, blur);
    gl.uniform1i(uTaps, blur > 0.0004 ? BLUR_TAPS : 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { show, setLang };
}
