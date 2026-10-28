// Progressive enhancement only. Every page reads and works without this file.
// It adds previous/next buttons and a counter to product galleries, a sliding
// indicator to the header nav, pointer tilt to work tiles, on-screen placement
// for the home statement's product previews, and hands a clicked preview the
// name its product page morphs from. Everything that moves is driven by CSS
// from the variables set here.
(() => {
  function motionAllowed() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function finePointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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

  // One pill slides between nav items on hover and focus, and rests on the
  // current page. Without this, the current item carries its own pill.
  function enhanceNav(list) {
    const links = [...list.querySelectorAll('a')];
    if (!links.length) return;
    const current = links.find((link) => link.getAttribute('aria-current') === 'page');

    function moveTo(link) {
      if (!link) {
        list.style.setProperty('--ind-o', '0');
        return;
      }
      list.style.setProperty('--ind-x', `${link.offsetLeft}px`);
      list.style.setProperty('--ind-w', `${link.offsetWidth}px`);
      list.style.setProperty('--ind-o', '1');
    }

    for (const link of links) {
      link.addEventListener('pointerenter', () => moveTo(link));
      link.addEventListener('focus', () => moveTo(link));
    }
    list.addEventListener('pointerleave', () => moveTo(current));
    list.addEventListener('focusout', (event) => {
      if (!list.contains(event.relatedTarget)) moveTo(current);
    });
    window.addEventListener('resize', () => moveTo(current), { passive: true });
    if (document.fonts) document.fonts.ready.then(() => moveTo(current));

    moveTo(current);
    list.classList.add('is-enhanced');
    // Let the first position land before the indicator starts to glide.
    window.setTimeout(() => list.classList.add('is-ready'), 60);
  }

  // A tile's plate leans toward the pointer by at most a few degrees. CSS
  // eases it; leaving resets it.
  function enhanceTilt(tile) {
    const plate = tile.querySelector('.plate');
    if (!plate) return;

    tile.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      const box = plate.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
      const y = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height));
      tile.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`);
      tile.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
    });

    tile.addEventListener('pointerleave', () => {
      tile.style.setProperty('--ry', '0deg');
      tile.style.setProperty('--rx', '0deg');
    });
  }

  // A proof link's preview opens above its line when there is room, below
  // otherwise, shifted to stay on screen, and grows out of the chip.
  function enhanceProof(link) {
    const peek = link.querySelector('.peek');
    const chip = link.querySelector('.chip');
    if (!peek || !chip) return;

    const shell = link.closest('.shell');

    function place() {
      const edge = Math.max(16, shell ? shell.getBoundingClientRect().left : 0);
      const width = peek.offsetWidth;
      const height = peek.offsetHeight;
      const room = document.documentElement.clientWidth;
      const box = link.getBoundingClientRect();
      const dot = chip.getBoundingClientRect();
      const centred = box.left + box.width / 2 - width / 2;
      const left = Math.min(Math.max(centred, edge), room - edge - width);
      link.dataset.side = dot.top - 96 >= height ? 'above' : 'below';
      link.style.setProperty('--peek-dx', `${(left - centred).toFixed(1)}px`);
      link.style.setProperty('--peek-ox', `${(dot.left + dot.width / 2 - left).toFixed(1)}px`);
    }

    link.addEventListener('pointerenter', place);
    link.addEventListener('focus', place);
  }

  // Product pages share view-transition names with the home tiles. When a
  // proof link is followed, its open preview (or its chip) takes the name
  // instead, so that is what morphs into the product page's hero.
  let followed = null;
  document.addEventListener('click', (event) => {
    followed = event.target instanceof Element ? event.target.closest('a.proof') : null;
  });

  window.addEventListener('pageswap', (event) => {
    const link = followed;
    const url = event.activation && event.activation.entry && event.activation.entry.url;
    if (!event.viewTransition || !link || link.href !== url) return;
    const name = link.dataset.media;
    const peek = link.querySelector('.peek');
    const source = peek && getComputedStyle(peek).visibility === 'visible' ? peek : link.querySelector('.chip');
    const owners = [...document.querySelectorAll('[style*="view-transition-name"]')].filter(
      (element) => element.style.viewTransitionName === name,
    );
    owners.forEach((element) => element.style.setProperty('view-transition-name', 'none'));
    source.style.setProperty('view-transition-name', name);
    window.addEventListener(
      'pageshow',
      () => {
        source.style.removeProperty('view-transition-name');
        owners.forEach((element) => element.style.setProperty('view-transition-name', name));
      },
      { once: true },
    );
  });

  document.querySelectorAll('[data-explorer-stage]').forEach(enhanceGallery);
  document.querySelectorAll('.site-header .nav-links').forEach(enhanceNav);
  document.querySelectorAll('a.proof').forEach(enhanceProof);
  if (motionAllowed() && finePointer()) document.querySelectorAll('[data-tilt]').forEach(enhanceTilt);
})();
