// The timeline ruler: a row of ticks that grow near the pointer (like a dock),
// with one stop every few ticks. Moving over it, dragging it or pressing the
// arrow keys picks the nearest stop.
const MINOR_BETWEEN = 3; // small ticks between two stops
const STEP = MINOR_BETWEEN + 1;
const REACH = 1.9; // how many ticks wide the magnified zone is
const FOLLOW = 16; // how quickly the magnified zone follows the pointer

export function createRuler(root, { count, onChange, initial }) {
  const total = (count - 1) * STEP + 1;
  const ticks = [];
  const track = root.querySelector('.ticks');
  for (let i = 0; i < total; i++) {
    const tick = document.createElement('i');
    if (i % STEP === 0) tick.className = 'stop';
    track.append(tick);
    ticks.push(tick);
  }

  let active = initial;
  let focus = initial * STEP; // tick position the magnification is centred on
  let pointer = null; // tick position under the pointer, or null when it is away
  let last = performance.now();

  // With the class "reversed" on the ruler, today sits on the left and the past runs to the right.
  const reversed = () => root.classList.contains('reversed');
  const toTick = (clientX) => {
    const box = track.getBoundingClientRect();
    const along = (clientX - box.left) / box.width;
    return Math.min(total - 1, Math.max(0, (reversed() ? 1 - along : along) * (total - 1)));
  };

  function select(next) {
    next = Math.min(count - 1, Math.max(0, next));
    if (next === active) return;
    ticks[active * STEP].classList.remove('on');
    active = next;
    ticks[active * STEP].classList.add('on');
    root.setAttribute('aria-valuenow', String(active));
    onChange(active);
  }

  function onPointer(event) {
    pointer = toTick(event.clientX);
    select(Math.round(pointer / STEP));
  }
  root.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.buttons) onPointer(event);
  });
  root.addEventListener('pointerdown', (event) => {
    root.setPointerCapture(event.pointerId);
    onPointer(event);
  });
  const release = () => { pointer = null; };
  root.addEventListener('pointerleave', release);
  root.addEventListener('pointerup', (event) => { if (event.pointerType !== 'mouse') release(); });
  root.addEventListener('pointercancel', release);

  root.addEventListener('keydown', (event) => {
    const side = reversed() ? -1 : 1;
    const move = { ArrowLeft: -side, ArrowRight: side, ArrowDown: -1, ArrowUp: 1 }[event.key];
    if (move) select(active + move);
    else if (event.key === 'Home') select(0);
    else if (event.key === 'End') select(count - 1);
    else return;
    event.preventDefault();
  });

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = pointer ?? active * STEP;
    focus += (target - focus) * (1 - Math.exp(-FOLLOW * dt));
    for (let i = 0; i < total; i++) {
      const d = (i - focus) / REACH;
      ticks[i].style.setProperty('--grow', Math.exp(-d * d).toFixed(3));
    }
    requestAnimationFrame(frame);
  }

  ticks[active * STEP].classList.add('on');
  root.setAttribute('aria-valuemax', String(count - 1));
  root.setAttribute('aria-valuenow', String(active));
  requestAnimationFrame(frame);

  return { select, get active() { return active; } };
}
