// Progressive enhancement only. Every page reads and works without this file;
// it adds previous/next buttons and a position counter to product galleries.
(() => {
  function motionAllowed() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  document.querySelectorAll('[data-explorer-stage]').forEach(enhanceGallery);
})();
