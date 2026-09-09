document.documentElement.classList.add('js');

function motionAllowed() {
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

function enhanceNavToggle() {
  document.querySelectorAll('.site-nav').forEach((nav) => {
    const toggle = nav.querySelector('.nav-toggle');
    const links = nav.querySelector('.nav-links');
    if (!toggle || !links) return;

    const close = () => {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
      links.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', () => {
      if (links.classList.contains('is-open')) close();
      else open();
    });
    links.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && links.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target)) close();
    });
    window.matchMedia('(min-width: 48rem)').addEventListener('change', close);
  });
}

function pauseChapterMedia(chapter) {
  if (!chapter) return;
  const video = chapter.querySelector('video');
  if (video && !video.paused) video.pause();
}

function activateChapter(stage, chapterId, { focus = false, updateHash = false } = {}) {
  const chapters = [...stage.querySelectorAll('[data-chapter]')];
  const target = chapters.find((chapter) => chapter.dataset.chapter === chapterId) || chapters[0];
  if (!target) return;

  chapters.forEach((chapter) => {
    const isActive = chapter === target;
    if (!isActive) pauseChapterMedia(chapter);
    chapter.hidden = !isActive;
  });

  const tabs = [...stage.querySelectorAll('[data-chapter-tab]')];
  tabs.forEach((tab) => {
    const isActive = tab.dataset.chapterTab === target.dataset.chapter;
    tab.setAttribute('aria-selected', String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  stage.dataset.activeChapter = target.dataset.chapter;

  if (updateHash) {
    const url = new URL(window.location.href);
    url.hash = `chapter-${target.dataset.chapter}`;
    window.history.pushState({ chapter: target.dataset.chapter }, '', url);
  }

  if (focus) target.focus({ preventScroll: true });
}

function chapterFromHash(stage) {
  const hash = window.location.hash.replace('#chapter-', '');
  const chapters = [...stage.querySelectorAll('[data-chapter]')];
  return chapters.find((chapter) => chapter.dataset.chapter === hash)?.dataset.chapter ?? null;
}

function enhanceExplorerStage(stage) {
  const tabList = stage.querySelector('[data-chapter-tabs]');
  const chapters = [...stage.querySelectorAll('[data-chapter]')];
  if (!tabList || chapters.length < 2) return;

  const tabs = [...tabList.querySelectorAll('a[href^="#chapter-"]')];
  tabs.forEach((link) => {
    const chapterId = link.getAttribute('href').replace('#chapter-', '');
    link.dataset.chapterTab = chapterId;
    link.setAttribute('role', 'tab');
    link.addEventListener('click', (event) => {
      event.preventDefault();
      activateChapter(stage, chapterId, { updateHash: true });
    });
    link.addEventListener('keydown', (event) => {
      const currentIndex = tabs.indexOf(link);
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        tabs[(currentIndex + 1) % tabs.length].focus();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        tabs[(currentIndex - 1 + tabs.length) % tabs.length].focus();
      }
    });
  });
  tabList.setAttribute('role', 'tablist');

  window.addEventListener('popstate', () => {
    activateChapter(stage, chapterFromHash(stage) ?? stage.dataset.defaultChapter);
  });

  activateChapter(stage, chapterFromHash(stage) ?? stage.dataset.defaultChapter);
}

function enhanceStageDialog(stage) {
  const dialog = stage.querySelector('dialog[data-stage-dialog]');
  const openButton = stage.querySelector('[data-open-full-size]');
  if (!dialog || !openButton || typeof dialog.showModal !== 'function') return;

  const dialogBody = dialog.querySelector('[data-dialog-body]');
  let lastTrigger = null;

  openButton.addEventListener('click', () => {
    const active = stage.querySelector('[data-chapter]:not([hidden])');
    if (!active || !dialogBody) return;
    dialogBody.innerHTML = '';
    const clone = active.querySelector('img, video')?.cloneNode(true);
    if (clone) {
      clone.removeAttribute('width');
      clone.removeAttribute('height');
      if (clone.tagName === 'VIDEO') {
        clone.controls = true;
        clone.autoplay = false;
      }
      dialogBody.append(clone);
    }
    lastTrigger = openButton;
    dialog.showModal();
  });

  dialog.addEventListener('close', () => {
    const video = dialogBody?.querySelector('video');
    if (video) video.pause();
    lastTrigger?.focus();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function enhanceExplorer() {
  document.querySelectorAll('[data-explorer-stage]').forEach((stage) => {
    enhanceExplorerStage(stage);
    enhanceStageDialog(stage);
  });
}

function enhanceDisclosures() {
  document.querySelectorAll('[data-disclosure]').forEach((details) => {
    details.classList.add('is-enhanced');
  });
}

function initialize() {
  enhanceReveals();
  enhanceSectionNav();
  enhanceNavToggle();
  enhanceExplorer();
  enhanceDisclosures();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
  initialize();
}
