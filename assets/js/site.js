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

function initialize() {
  document.querySelectorAll('[data-trace-root]').forEach(enhanceTrace);
  enhanceReveals();
  enhanceSectionNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
