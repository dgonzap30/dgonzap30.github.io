// Progressive enhancement only. Every page reads and works without this file.
// It keeps the bar's Mexico City clock current, adds previous/next buttons and
// a counter to product galleries, and on a fine pointer shows a work row's
// image beside the pointer. What moves is eased by CSS.
(() => {
  function motionAllowed() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // The clock ticks on the minute with a chained timeout.
  function startClock(slot) {
    const format = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
    });
    function tick() {
      slot.textContent = `, ${format.format(new Date())}`;
      window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    }
    tick();
  }

  function enhanceGallery(stage) {
    const track = stage.querySelector('.stage-track');
    const controls = stage.querySelector('.stage-controls');
    if (!track || !controls) return;
    const slides = [...track.children];
    if (slides.length < 2) return;

    const previous = controls.querySelector('[data-stage-prev]');
    const next = controls.querySelector('[data-stage-next]');
    const count = controls.querySelector('.stage-count');
    const inset = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;

    // The first slide whose leading edge sits at or past the scroll position.
    function currentIndex() {
      const edge = track.scrollLeft + inset() - 8;
      const index = slides.findIndex((slide) => slide.offsetLeft >= edge);
      return index === -1 ? slides.length - 1 : index;
    }

    function update() {
      const max = track.scrollWidth - track.clientWidth;
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
      if (count) count.textContent = `${currentIndex() + 1} / ${slides.length}`;
    }

    function go(step) {
      const target = slides[Math.min(slides.length - 1, Math.max(0, currentIndex() + step))];
      track.scrollTo({ left: target.offsetLeft - inset(), behavior: motionAllowed() ? 'smooth' : 'auto' });
    }

    previous.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    controls.hidden = false;
    update();
  }

  // The preview trails the pointer: each move sets a new position and the
  // CSS translate transition eases toward it. Near the right edge it flips to
  // the pointer's left, and it is clamped inside the window, also once a new
  // image loads. Escape hides it until a row is entered again. It is hidden
  // from assistive technology and never takes focus.
  function enhanceIndex(list) {
    const preview = list.parentElement.querySelector('.preview');
    const image = preview && preview.querySelector('img');
    if (!image) return;
    const rows = [...list.querySelectorAll('.row[data-preview]')];
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
    let shown = false;
    let preloaded = false;
    let x = 0;
    let y = 0;

    function place() {
      const width = image.offsetWidth;
      const half = image.offsetHeight / 2;
      const gap = 32;
      const side = x + gap + width > window.innerWidth - 16 ? x - gap - width : x + gap;
      const left = Math.min(Math.max(side, 16), window.innerWidth - width - 16);
      const top = Math.min(Math.max(y, half + 16), window.innerHeight - half - 16);
      preview.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
    }

    function show(row) {
      if (!pointer.matches) return;
      if (!preloaded) {
        rows.forEach((entry) => {
          new Image().src = entry.dataset.preview;
        });
        preloaded = true;
      }
      preview.dataset.kind = row.dataset.kind;
      if (image.getAttribute('src') !== row.dataset.preview) image.src = row.dataset.preview;
      if (shown) return;
      place();
      preview.getBoundingClientRect();
      preview.classList.add('on');
      shown = true;
    }

    function hide() {
      preview.classList.remove('on');
      shown = false;
    }

    rows.forEach((row) => {
      row.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        x = event.clientX;
        y = event.clientY;
        show(row);
      });
    });
    list.addEventListener('pointermove', (event) => {
      x = event.clientX;
      y = event.clientY;
      if (shown) place();
    });
    image.addEventListener('load', () => {
      if (shown) place();
    });
    list.addEventListener('pointerleave', hide);
    window.addEventListener('pagehide', hide);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hide();
    });
  }

  document.querySelectorAll('[data-clock]').forEach(startClock);
  document.querySelectorAll('[data-explorer-stage]').forEach(enhanceGallery);
  document.querySelectorAll('ol.index').forEach(enhanceIndex);
})();
