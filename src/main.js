// Wires the parts together: the globe, the caption, the timeline ruler and the language switch.
import './style.css';
import { ERAS, HIGHLIGHT } from './eras.js';
import { LANGS, FLAGS } from './i18n.js';
import { createGlobe } from './globe.js';
import { loadMap } from './mapdata.js';
import { createRuler } from './ruler.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const first = 0;
const last = ERAS.length - 1;

const caption = document.querySelector('.caption');
const rulerEl = document.querySelector('.ruler');
const ends = rulerEl.querySelectorAll('.ends span');

// Persian unless the address says ?lang=en, so an English link can be shared.
let lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'fa';
// Opens on "Today", like the reference. ?stop=<id> opens another stop (used for the share image).
const asked = ERAS.findIndex((era) => era.id === new URLSearchParams(location.search).get('stop'));
let current = asked === -1 ? last : asked;
let globe = null; // created in start(), once the border data has loaded
const OUT_MS = 170; // must match caption-out in style.css

// The caption is replaced, not edited: the old one blurs away while the new one blurs in.
function setCaption(direction) {
  const text = ERAS[current][lang];
  // Only one old caption may linger, and only briefly, so two texts never pile up.
  for (const old of [...caption.children]) {
    if (reducedMotion || old.classList.contains('out')) { old.remove(); continue; }
    old.classList.add('out');
    old.setAttribute('aria-hidden', 'true');
    setTimeout(() => old.remove(), OUT_MS);
  }
  const block = document.createElement('div');
  block.className = 'block in';
  block.style.setProperty('--dir', String(direction));
  const title = document.createElement('h1');
  title.textContent = text.year;
  const line = document.createElement('p');
  const name = document.createElement('strong');
  name.textContent = text.name;
  line.append(name, ' ', text.desc);
  block.append(title, line);
  caption.append(block);

  ends[0].classList.toggle('on', current === first);
  ends[1].classList.toggle('on', current === last);
  rulerEl.setAttribute('aria-valuetext', `${text.year}: ${text.name}`);
}

function applyLang(next) {
  lang = next;
  const strings = LANGS[lang];
  document.documentElement.lang = lang;
  document.documentElement.dir = strings.dir;
  document.title = strings.title;
  rulerEl.classList.toggle('reversed', strings.todaySide === 'left');
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = strings[el.dataset.t]; });
  document.querySelectorAll('[data-t-html]').forEach((el) => { el.innerHTML = strings[el.dataset.tHtml]; });
  document.querySelectorAll('[data-t-label]').forEach((el) => { el.setAttribute('aria-label', strings[el.dataset.tLabel]); });
  ends[0].textContent = ERAS[first][lang].year;
  ends[1].textContent = ERAS[last][lang].year;
  document.querySelector('#langFlag').innerHTML = FLAGS[lang];
  document.querySelectorAll('.lang-item').forEach((item) => item.classList.toggle('on', item.dataset.lang === lang));
  setCaption(1);

  const url = new URL(location.href);
  if (lang === 'fa') url.searchParams.delete('lang');
  else url.searchParams.set('lang', lang);
  history.replaceState(null, '', url);
  if (globe) mapFont(lang).then(() => globe.setLang(lang));
}

// ---- language switch (flag pill) ----
const langBox = document.querySelector('.lang');
document.querySelectorAll('.lang-item').forEach((item) => {
  item.querySelector('.flag').innerHTML = FLAGS[item.dataset.lang];
  item.querySelector('.ln').textContent = LANGS[item.dataset.lang].native;
  item.addEventListener('click', () => {
    langBox.classList.remove('open');
    if (item.dataset.lang !== lang) applyLang(item.dataset.lang);
  });
});
document.querySelector('.lang-btn').addEventListener('click', () => {
  const open = langBox.classList.toggle('open');
  document.querySelector('.lang-btn').setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', (event) => { if (!langBox.contains(event.target)) langBox.classList.remove('open'); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') langBox.classList.remove('open'); });

// ---- sources dialog ----
const dialog = document.querySelector('dialog');
document.querySelector('.sources').addEventListener('click', () => dialog.showModal());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

applyLang(lang);

// ---- globe and ruler ----
async function start() {
  // The border data is a separate file so the page itself stays small.
  const map = await loadMap('/map.json');
  globe = createGlobe(document.querySelector('.globe canvas'), { eras: ERAS, map, reducedMotion, lang, highlight: HIGHLIGHT });
  globe.show(current);
  document.querySelector('.globe').classList.add('ready');

  createRuler(rulerEl, {
    count: ERAS.length,
    initial: current,
    onChange(index) {
      const direction = Math.sign(index - current) || 1;
      current = index;
      globe.show(index);
      setCaption(direction);
    },
  });

  // Names on the map are drawn as pictures, so redraw them once the real fonts have arrived.
  await mapFont(lang);
  globe.setLang(lang);
}

// Waits for the font the map names use in this language. The Persian font is only
// downloaded when Persian is actually shown.
function mapFont(language) {
  const wanted = language === 'fa' ? ['600 20px Ravi', 'ایران'] : ["700 20px 'Manrope Variable'", 'A'];
  return document.fonts.load(...wanted).catch(() => {});
}
start();

// GitHub star count in the footer. Live from the public API; hidden if it fails.
(async () => {
  const el = document.querySelector('.star-count');
  if (!el) return;
  try {
    const res = await fetch('https://api.github.com/repos/HamzehGhoreyshi/iran-map-timelaps');
    if (!res.ok) return;
    const { stargazers_count: n } = await res.json();
    if (typeof n !== 'number') return;
    el.textContent = n.toLocaleString('en');
    el.hidden = false;
    el.parentElement.setAttribute('aria-label', `Star this project on GitHub (${n} stars)`);
  } catch {}
})();
