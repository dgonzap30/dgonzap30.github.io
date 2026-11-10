import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');

// Model the public DOM/event contract, including an image loading out of order.
function fixture() {
  function target(extra = {}) {
    const listeners = new Map();
    const classes = new Set();
    return {
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
      addEventListener(name, fn) { listeners.set(name, fn); },
      emit(name, event = {}) { listeners.get(name)?.(event); },
      ...extra,
    };
  }
  const rows = ['one', 'two'].map((id) => target({ dataset: { preview: `/${id}.webp`, kind: 'screen' } }));
  rows.forEach((row) => { row.closest = () => row; });
  const image = target({ complete: true, naturalWidth: 380, offsetWidth: 380, offsetHeight: 250, currentSrc: '/one.webp' });
  Object.defineProperty(image, 'src', { set(value) { this.currentSrc = value; this.complete = false; this.naturalWidth = 0; } });
  image.getAttribute = () => image.currentSrc;
  const preview = target({ style: {}, dataset: {}, querySelector: () => image });
  let focused = false;
  const list = target({ parentElement: { querySelector: () => preview }, contains: (row) => rows.includes(row), querySelector: () => focused, querySelectorAll: () => rows });
  const pointer = target({ matches: true });
  const window = target({ innerWidth: 1280, innerHeight: 900, matchMedia: () => pointer });
  const document = target({ querySelectorAll: (selector) => selector === 'ol.index' ? [list] : [] });
  vm.runInNewContext(script, { window, document, Image: class {} });
  function move(row, x = 300, y = 350, pointerType = 'mouse') { list.emit('pointermove', { target: row, clientX: x, clientY: y, pointerType }); }
  function load() { image.complete = true; image.naturalWidth = 380; image.emit('load'); }
  const shown = () => preview.classList.contains('on');
  return { rows, list, image, preview, window, document, pointer, move, load, shown, focus: () => { focused = true; list.emit('focusin'); } };
}

test('scroll clears the selected product; a stationary pointer cannot reopen it', () => {
  const f = fixture();
  f.move(f.rows[0]);
  assert(f.shown());
  f.window.emit('scroll');
  assert(!f.shown());
  assert(!f.rows[0].classList.contains('is-active'));
  f.move(f.rows[1]);
  assert(!f.shown(), 'a scroll-generated pointer event must stay dismissed');
  f.move(f.rows[1], 301);
  assert.equal(f.image.currentSrc, '/two.webp');
  assert(!f.shown(), 'the previous image cannot appear while the next loads');
  f.load();
  assert(f.shown());
  assert(f.rows[1].classList.contains('is-active'));
});

test('movement within the list switches product without relying on pointer entry', () => {
  const f = fixture();
  f.move(f.rows[0]);
  f.move(f.rows[1], 305);
  assert(!f.rows[0].classList.contains('is-active'));
  assert.equal(f.image.currentSrc, '/two.webp');
  f.load();
  assert(f.shown());
});

test('a late image load cannot resurrect a dismissed preview', () => {
  for (const dismiss of [
    (f) => f.window.emit('scroll'),
    (f) => f.list.emit('pointerleave'),
    (f) => f.document.emit('keydown', { key: 'Escape' }),
    (f) => f.window.emit('pagehide'),
    (f) => f.window.emit('resize'),
    (f) => f.window.emit('blur'),
    (f) => f.pointer.emit('change'),
    (f) => f.image.emit('error'),
  ]) {
    const f = fixture();
    f.move(f.rows[1]);
    dismiss(f);
    f.load();
    assert(!f.shown());
  }
});

test('keyboard focus and touch do not trigger floating previews', () => {
  const f = fixture();
  f.move(f.rows[0], 300, 350, 'touch');
  assert(!f.shown());
  f.move(f.rows[0]);
  assert(f.shown());
  f.focus();
  f.move(f.rows[1], 305);
  f.load();
  assert(!f.shown());
});

test('previews respect the pointer breakpoint and stay within the viewport', () => {
  const f = fixture();
  f.pointer.matches = false;
  f.move(f.rows[0]);
  assert(!f.shown());
  f.pointer.matches = true;
  f.move(f.rows[0], 1270, 895);
  const [left, top] = f.preview.style.translate.match(/\d+/g).map(Number);
  assert(left >= 20 && left + f.image.offsetWidth <= 1260);
  assert(top - f.image.offsetHeight / 2 >= 20 && top + f.image.offsetHeight / 2 <= 880);
});
