// Product pages from assets/data/projects.json.
//
// Each product's captured screens render as one scrollable gallery on the
// product's own plate. The four /demos/<id>/ pages are generated whole; the
// PAZZ case study is hand-written, so its gallery and "More work" row are
// injected between <!-- explorer:NAME:start/end --> markers instead.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { ORIGIN, PERSON_ID, WEBSITE_ID, backLink, chrome, escape as esc } from './site-chrome.mjs';
import { injectBlock, loadWork, renderMoreWork, root } from './render-work.mjs';

const THANKS_URL = `${ORIGIN}/thanks/`;
const FORM_KINDS = new Set(['notify', 'waitlist']);

export const routeFor = (project) => (project.id === 'pazz' ? '/work/pazz/' : `/demos/${project.id}/`);

function renderChapter(chapter, index) {
  const media =
    chapter.mediaType === 'video'
      ? `<video controls playsinline preload="${chapter.poster ? 'none' : 'metadata'}"${chapter.poster ? ` poster="${esc(chapter.poster)}"` : ''} width="${chapter.width}" height="${chapter.height}" aria-label="${esc(chapter.alt)}">
              <source src="${esc(chapter.src)}" type="video/mp4">
            </video>`
      : `<a class="stage-media" href="${esc(chapter.src)}"><img src="${esc(chapter.src)}" width="${chapter.width}" height="${chapter.height}" alt="${esc(chapter.alt)}" ${index < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></a>`;
  const transcript = chapter.transcript
    ? `\n            <details class="chapter-transcript"><summary>Transcript</summary><p>${esc(chapter.transcript)}</p></details>`
    : '';
  return `          <figure class="stage-chapter" id="chapter-${chapter.id}" data-chapter="${chapter.id}">
            ${media}
            <figcaption class="chapter-caption"><strong>${esc(chapter.title)}.</strong> ${esc(chapter.caption)}</figcaption>${transcript}
          </figure>`;
}

function renderDisclosure(project, level) {
  if (!project.working.length && !project.remaining.length) return '';
  const list = (items) => items.map((item) => `<li>${esc(item)}</li>`).join('');
  return `
      <details class="stage-disclosure">
        <summary>What's working, and what's still in progress</summary>
        <p>${esc(project.engineeringNotes)}</p>
        <div class="stage-disclosure-grid">
          <div><h${level}>What's working</h${level}><ul>${list(project.working)}</ul></div>
          <div><h${level}>Still in progress</h${level}><ul>${list(project.remaining)}</ul></div>
        </div>
      </details>`;
}

// The gallery, its capture note and the engineering disclosure.
export function renderStage(project, { level = 2 } = {}) {
  const layout = project.chapters[0]?.layout ?? 'portrait';
  const labels = [...new Set(project.chapters.map((chapter) => chapter.syntheticLabel))].join(', ');
  return `      <div class="stage plate--${project.id}" data-explorer-stage data-layout="${layout}">
        <div class="stage-track" role="region" aria-label="${esc(project.name)} screens" tabindex="0">
${project.chapters.map(renderChapter).join('\n')}
        </div>
        <div class="stage-controls" hidden>
          <span class="stage-count meta" aria-live="polite"></span>
          <button type="button" data-stage-prev aria-label="Previous screen">←</button>
          <button type="button" data-stage-next aria-label="Next screen">→</button>
        </div>
      </div>
      <p class="stage-scope meta">${esc(project.demoScope)} ${esc(labels)}, captured ${esc(project.capturedAt)}.</p>${renderDisclosure(project, level)}`;
}

// The product's way in: a store or page link, or a notify form that posts to
// the LOJIK contact proxy and works without JavaScript.
export function renderWayIn(project) {
  const wayIn = project.wayIn;
  if (!wayIn.enabled) {
    return `<div class="stage-actions" data-way-in="${wayIn.kind}"><p class="way-note">${esc(wayIn.note)}</p></div>`;
  }
  if (FORM_KINDS.has(wayIn.kind)) {
    const id = project.id;
    return `<form class="stage-actions" data-way-in="${wayIn.kind}" method="post" action="${esc(wayIn.href)}">
      <p class="way-note">${esc(wayIn.note)}</p>
      <input type="hidden" name="intent" value="hi">
      <input type="hidden" name="redirect" value="${THANKS_URL}">
      <input type="hidden" name="message" value="${esc(wayIn.message)}">
      <p hidden><label for="${id}-website">Leave this field empty</label><input id="${id}-website" name="website" type="text" tabindex="-1" autocomplete="off"></p>
      <div class="notify-fields">
        <label class="visually-hidden" for="${id}-name">Name</label><input id="${id}-name" name="name" type="text" required maxlength="120" autocomplete="name" placeholder="Name">
        <label class="visually-hidden" for="${id}-email">Email</label><input id="${id}-email" name="email" type="email" required maxlength="200" autocomplete="email" placeholder="Email">
        <button class="button" type="submit">${esc(wayIn.label)}</button>
      </div>
    </form>`;
  }
  const external = /^https?:/.test(wayIn.href);
  const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<div class="stage-actions" data-way-in="${wayIn.kind}"><a class="button" href="${esc(wayIn.href)}"${attrs}>${esc(wayIn.label)}${external ? ' <span aria-hidden="true">↗</span>' : ''}</a></div>`;
}

function renderProductPage(project, work) {
  const canonical = `${ORIGIN}${routeFor(project)}`;
  const firstImage = project.chapters.find((chapter) => chapter.mediaType === 'image');
  const { head, footer } = chrome({
    title: project.page.title,
    description: project.page.description,
    canonical,
    current: '/projects/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${canonical}#page`,
      url: canonical,
      name: project.page.title,
      description: project.page.description,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      author: { '@id': PERSON_ID },
      primaryImageOfPage: firstImage ? `${ORIGIN}${firstImage.src}` : undefined,
      about: {
        ...project.app,
        name: project.name,
        description: project.purpose,
        creator: { '@id': PERSON_ID },
      },
    },
  });
  return `${head}
    <header class="page-head shell">
${backLink('/projects/', 'Work')}
      <h1>${esc(project.name)}</h1>
      <p class="lede">${esc(project.purpose)}</p>
      <p class="page-meta meta">${esc(project.category)} · ${esc(project.status)}</p>
      ${renderWayIn(project)}
    </header>

    <section class="product-gallery shell" aria-label="${esc(project.name)} screens">
${renderStage(project)}
    </section>

${renderMoreWork(work, project.id)}
${footer}`;
}

const projects = JSON.parse(await readFile(join(root, 'assets/data/projects.json'), 'utf8'));
const work = await loadWork();

for (const project of projects) {
  if (project.id === 'pazz') {
    const path = 'work/pazz/index.html';
    let html = await readFile(join(root, path), 'utf8');
    html = injectBlock(html, 'explorer', 'stage', renderStage(project, { level: 3 }), path);
    html = injectBlock(html, 'explorer', 'picker', renderMoreWork(work, project.id), path);
    await writeFile(join(root, path), html.replace(/[ \t]+$/gm, ''));
    continue;
  }
  const target = join(root, 'demos', project.id, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  // Template literals indent blank lines; strip trailing whitespace so the
  // generated HTML stays clean under `git diff --check`.
  await writeFile(target, renderProductPage(project, work).replace(/[ \t]+$/gm, ''));
}

console.log(`Product pages generated for ${projects.length} projects.`);
