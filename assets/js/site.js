document.documentElement.classList.add('js');

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setTraceStage(root, stage) {
  root.dataset.activeStage = stage || 'all';
  root.querySelectorAll('[data-trace-node]').forEach((node) => {
    const active = !stage || node.dataset.traceNode === stage;
    node.classList.toggle('is-active', Boolean(stage) && active);
    node.classList.toggle('is-muted', Boolean(stage) && !active);
  });
}

function enhanceTrace(root) {
  const controls = [...root.querySelectorAll('[data-trace-stage]')];
  const activate = (control) => setTraceStage(root, control.dataset.traceStage);

  controls.forEach((control) => {
    control.addEventListener('pointerenter', () => activate(control));
    control.addEventListener('focusin', () => activate(control));
    control.addEventListener('click', () => activate(control));
    control.addEventListener('pointerleave', () => {
      if (!control.matches(':focus-within')) setTraceStage(root, null);
    });
    control.addEventListener('focusout', (event) => {
      if (!control.contains(event.relatedTarget)) setTraceStage(root, null);
    });
  });
}

function enhanceReveals() {
  const items = [...document.querySelectorAll('[data-reveal]')];
  if (!motionAllowed() || !('IntersectionObserver' in window)) {
    items.forEach((item) => { item.dataset.visible = 'true'; });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.filter((entry) => entry.isIntersecting).forEach((entry) => {
      entry.target.dataset.visible = 'true';
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });

  items.forEach((item) => observer.observe(item));
}

function enhanceSectionNav() {
  const links = [...document.querySelectorAll('[data-section-link]')];
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const ratios = new Map();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
    const activeId = [...ratios.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!activeId || ratios.get(activeId) === 0) return;
    links.forEach((link) => {
      if (link.hash === `#${activeId}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: `-${Math.round(window.innerHeight * 0.2)}px 0px -55% 0px`, threshold: [0, 0.2, 0.5, 0.8] });

  sections.forEach((section) => observer.observe(section));
}

function enhanceProjectDirectory() {
  const controls = document.querySelector('[data-project-controls]');
  if (!controls) return;

  const search = document.querySelector('#project-search');
  const cards = [...document.querySelectorAll('[data-project-card]')];
  const groups = [...document.querySelectorAll('[data-project-group]')];
  const buttons = [...document.querySelectorAll('[data-project-filter]')];
  const resets = [...document.querySelectorAll('[data-project-reset]')];
  const count = document.querySelector('#project-count');
  const empty = document.querySelector('[data-project-empty]');
  let filter = 'all';

  function update() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const matchesFilter = filter === 'all' || card.dataset.category.split('|').includes(filter);
      const matchesQuery = !query || card.textContent.toLowerCase().includes(query);
      const show = matchesFilter && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });
    groups.forEach((group) => { group.hidden = ![...group.querySelectorAll('[data-project-card]')].some((card) => !card.hidden); });
    count.textContent = `${visible} ${visible === 1 ? 'project' : 'projects'} in view`;
    empty.hidden = visible !== 0;
  }

  controls.hidden = false;
  search.addEventListener('input', update);
  buttons.forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.projectFilter;
    buttons.forEach((item) => { const active = item === button; item.classList.toggle('is-selected', active); item.setAttribute('aria-pressed', String(active)); });
    update();
  }));
  resets.forEach((button) => button.addEventListener('click', () => {
    filter = 'all'; search.value = '';
    buttons.forEach((item) => { const active = item.dataset.projectFilter === 'all'; item.classList.toggle('is-selected', active); item.setAttribute('aria-pressed', String(active)); });
    update(); search.focus();
  }));
}

function initialize() {
  document.querySelectorAll('[data-trace-root]').forEach(enhanceTrace);
  enhanceReveals();
  enhanceSectionNav();
  enhanceProjectDirectory();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
