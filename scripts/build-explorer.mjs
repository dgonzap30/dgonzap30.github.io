import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function routeFor(project) {
  return project.id === 'pazz' ? '/work/pazz/' : `/demos/${project.id}/`;
}

export function renderPicker(projects, activeId) {
  const items = projects
    .map((project) => {
      const current = project.id === activeId ? ' aria-current="page"' : '';
      const pending = project.pending ? ' data-pending="true"' : '';
      return `<li><a href="${routeFor(project)}"${current}${pending}><strong>${esc(project.shortLabel)}</strong><span class="picker-category">${esc(project.category)}</span></a></li>`;
    })
    .join('');
  return `<nav class="explorer-picker-nav" aria-label="Products"><ul class="explorer-picker">${items}</ul></nav>`;
}

function renderChapterMedia(chapter) {
  if (chapter.mediaType === 'video') {
    const poster = chapter.poster ? ` poster="${esc(chapter.poster)}"` : '';
    return `<video class="chapter-media" controls playsinline preload="metadata"${poster} width="${chapter.width}" height="${chapter.height}" aria-label="${esc(chapter.alt)}">
            <source src="${esc(chapter.src)}" type="video/mp4" />
            Your browser does not support the video element.
          </video>`;
  }
  return `<img src="${esc(chapter.src)}" width="${chapter.width}" height="${chapter.height}" alt="${esc(chapter.alt)}" loading="lazy" />`;
}

function renderChapter(chapter) {
  const kicker = chapter.mediaType === 'video' ? 'Recorded walkthrough · native controls' : 'Captured product tour';
  const transcript = chapter.transcript
    ? `<div class="chapter-transcript"><strong>Descriptive transcript.</strong> ${esc(chapter.transcript)}</div>`
    : '';
  return `<div class="stage-chapter" id="chapter-${chapter.id}" data-chapter="${chapter.id}" data-layout="${chapter.layout}" tabindex="-1">
          <p class="chapter-kicker">${kicker} · <span class="synthetic-label">${esc(chapter.syntheticLabel)}</span> · Captured ${esc(chapter.capturedAt)}</p>
          ${renderChapterMedia(chapter)}
          <p class="chapter-caption"><strong>${esc(chapter.title)}.</strong> ${esc(chapter.caption)}</p>
          ${transcript}
        </div>`;
}

function renderTabs(chapters, defaultId) {
  if (chapters.length < 2) return '';
  const tabs = chapters
    .map((chapter) => `<a href="#chapter-${chapter.id}" aria-selected="${chapter.id === defaultId}">${esc(chapter.title)}</a>`)
    .join('');
  return `<div class="chapter-tabs" data-chapter-tabs aria-label="Chapters">${tabs}</div>`;
}

function renderDisclosure(project) {
  if (!project.working.length && !project.remaining.length) return '';
  return `<details class="stage-disclosure" data-disclosure>
        <summary>Engineering detail: what's working, what's still in progress</summary>
        <p>${esc(project.engineeringNotes)}</p>
        <div class="stage-disclosure-grid">
          <div>
            <h4>What's working</h4>
            <ul>${project.working.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          </div>
          <div>
            <h4>Still in progress</h4>
            <ul>${project.remaining.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
          </div>
        </div>
      </details>`;
}

function renderPendingStage(project) {
  const links = project.publicLinks
    .map((link) => `<a class="text-link" href="${esc(link.href)}"${/^https?:/.test(link.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(link.label)} <span aria-hidden="true">→</span></a>`)
    .join('');
  return `<div class="explorer-stage" data-explorer-stage data-default-chapter="">
      <header class="stage-header">
        <div>
          <h2 class="stage-name">${esc(project.name)}</h2>
          <p class="stage-purpose">${esc(project.purpose)}</p>
        </div>
        <span class="stage-status">${esc(project.status)}</span>
      </header>
      <div class="stage-pending">
        <p><strong>Capture pending.</strong> ${esc(project.pendingNote)}</p>
        ${links ? `<div class="stage-actions">${links}</div>` : ''}
      </div>
    </div>`;
}

export function renderStage(project) {
  if (project.pending && !project.chapters.length) return renderPendingStage(project);

  const chapters = project.chapters.map(renderChapter).join('');
  const tabs = renderTabs(project.chapters, project.defaultChapter);
  const pendingBanner = project.pending
    ? `<p class="stage-scope"><strong>Partial capture.</strong> ${esc(project.pendingNote)}</p>`
    : '';

  return `<div class="explorer-stage" data-explorer-stage data-default-chapter="${esc(project.defaultChapter)}">
      <header class="stage-header">
        <div>
          <h2 class="stage-name">${esc(project.name)}</h2>
          <p class="stage-purpose">${esc(project.purpose)}</p>
        </div>
        <span class="stage-status">${esc(project.status)}</span>
      </header>
      <div class="stage-viewer">
        ${chapters}
      </div>
      ${tabs}
      <div class="stage-caption-row">
        <p class="stage-scope">${esc(project.demoScope)}</p>
        <div class="stage-actions">
          <button type="button" class="stage-open-full" data-open-full-size>Open full size</button>
        </div>
      </div>
      ${pendingBanner}
      ${renderDisclosure(project)}
      <dialog data-stage-dialog aria-label="${esc(project.name)} full-size view">
        <button type="button" class="dialog-close" data-dialog-close aria-label="Close full-size view" formmethod="dialog">Close</button>
        <div data-dialog-body></div>
      </dialog>
    </div>`;
}

async function injectMarkers(relativePath, replacements) {
  const filePath = resolve(root, relativePath);
  let html = await readFile(filePath, 'utf8');
  for (const [name, content] of Object.entries(replacements)) {
    const pattern = new RegExp(`<!-- explorer:${name}:start -->[\\s\\S]*?<!-- explorer:${name}:end -->`);
    const replacement = `<!-- explorer:${name}:start -->\n${content}\n<!-- explorer:${name}:end -->`;
    if (!pattern.test(html)) throw new Error(`${relativePath}: missing marker explorer:${name}`);
    html = html.replace(pattern, replacement);
  }
  // Template literals indent their blank lines, which lands trailing whitespace in
  // the generated HTML and trips `git diff --check`. Strip it at the write seam so
  // every generated route stays clean no matter how a chapter template is written.
  html = html.replace(/[ \t]+$/gm, '');
  await writeFile(filePath, html);
}

async function main() {
  const projects = JSON.parse(await readFile(resolve(root, 'assets/data/projects.json'), 'utf8'));
  const byId = new Map(projects.map((project) => [project.id, project]));

  await injectMarkers('index.html', {
    picker: renderPicker(projects, 'maestro'),
    stage: renderStage(byId.get('maestro')),
  });

  await injectMarkers('projects/index.html', {
    picker: renderPicker(projects, 'maestro'),
    stage: renderStage(byId.get('maestro')),
  });

  for (const project of projects) {
    const route = project.id === 'pazz' ? 'work/pazz/index.html' : `demos/${project.id}/index.html`;
    await injectMarkers(route, {
      picker: renderPicker(projects, project.id),
      stage: renderStage(project),
    });
  }

  console.log(`Explorer generated for ${projects.length} projects.`);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  await main();
}
