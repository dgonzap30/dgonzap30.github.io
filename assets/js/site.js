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

  // Only deliberate mouse movement selects a preview. Scroll-driven pointer
  // entry must never leave an old product floating over the next row.
  function enhanceIndex(list) {
    const preview = list.parentElement.querySelector('.preview');
    const image = preview && preview.querySelector('img');
    if (!image) return;
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 761px)');
    let active = null;
    let x = null;
    let y = null;

    function place() {
      const width = image.offsetWidth;
      const half = image.offsetHeight / 2;
      const gap = 40;
      const side = x + gap + width > window.innerWidth - 20 ? x - gap - width : x + gap;
      const left = Math.max(20, Math.min(side, window.innerWidth - width - 20));
      const top = Math.max(half + 20, Math.min(y, window.innerHeight - half - 20));
      preview.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
    }

    function reveal() {
      if (!active || !image.complete || !image.naturalWidth) return;
      place();
      preview.classList.add('on');
    }

    function hide() {
      preview.classList.remove('on');
      if (active) active.classList.remove('is-active');
      active = null;
    }

    function select(row) {
      if (active !== row) {
        hide();
        active = row;
        active.classList.add('is-active');
        preview.dataset.kind = row.dataset.kind;
        // Hide the previous product until this image has actually loaded.
        if (image.getAttribute('src') !== row.dataset.preview) image.src = row.dataset.preview;
      }
      reveal();
    }

    list.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !pointer.matches) return;
      if (event.clientX === x && event.clientY === y) return;
      x = event.clientX;
      y = event.clientY;
      const row = event.target.closest('.row[data-preview]');
      if (!row || !list.contains(row) || list.querySelector(':focus-visible')) {
        hide();
        return;
      }
      select(row);
    });
    image.addEventListener('load', reveal);
    image.addEventListener('error', hide);
    list.addEventListener('pointerleave', hide);
    list.addEventListener('focusin', hide);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('resize', hide, { passive: true });
    window.addEventListener('pagehide', hide);
    window.addEventListener('blur', hide);
    pointer.addEventListener('change', hide);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' || event.key === 'Tab') hide();
    });
  }

  document.querySelectorAll('[data-clock]').forEach(startClock);
  document.querySelectorAll('[data-explorer-stage]').forEach(enhanceGallery);
  document.querySelectorAll('ol.index').forEach(enhanceIndex);
})();
