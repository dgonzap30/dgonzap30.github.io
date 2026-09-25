// Generates the workflow pages from assets/data/workflow.json.
//
// The site ships hand-written HTML on purpose. These seven pages share one
// skeleton and differ only in content, so they are generated to keep the
// chrome identical rather than hand-copied seven times and left to drift.
// The generated HTML is committed; nothing is built at request time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORIGIN, chrome as siteChrome, escape, renderSection } from './site-chrome.mjs';

function chrome(page) {
  const canonical = `${ORIGIN}/workflow/${page.slug}/`;
  return siteChrome({
    title: page.title,
    description: page.description,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: page.headline,
      url: canonical,
      dateModified: page.dateModified,
      author: { '@type': 'Person', name: 'Diego Gonzalez Zapiain' },
      about: page.title,
    },
  });
}

function renderPage(page) {
  const { head, footer } = chrome(page);
  const hero = `    <header class="case-hero shell">
      <div class="case-hero-main">
        <p class="kicker">Workflow</p>
        <h1>${escape(page.headline)}</h1>
        <p class="lede">${page.lede}</p>
      </div>
      <aside class="case-hero-aside" aria-label="Practice metadata">
        <p class="evidence-tag">Derived from a working artifact</p>
        <ul class="case-meta">
          <li><span>Artifact</span><strong>${escape(page.artifact)}</strong></li>
          <li><span>Shape</span><strong>${escape(page.shape)}</strong></li>
          <li><span>Last verified</span><strong>${escape(page.dateModified)}</strong></li>
        </ul>
      </aside>
    </header>`;
  const sections = page.sections.map(renderSection).join('\n\n');
  return `${head}
${hero}

${sections}
${footer}`;
}

function renderIndex(pages) {
  const page = {
    slug: '',
    title: 'The workflow',
    description:
      'Seven practices for running an agent fleet, each derived from a working artifact rather than written as advice.',
    headline: 'Seven practices, each derived from something that runs.',
    dateModified: pages[0]?.dateModified ?? '2026-09-11',
  };
  const { head, footer } = chrome(page);
  const rows = pages
    .map(
      (entry, index) => `    <section class="case-section shell" id="${entry.slug}">
      <p class="case-section-index">${String(index + 1).padStart(2, '0')}</p>
      <div class="case-section-main">
        <h2><a href="/workflow/${entry.slug}/">${escape(entry.title)}</a></h2>
        <p>${entry.lede}</p>
      </div>
      <aside class="case-note"><strong>Artifact</strong>${escape(entry.artifact)}</aside>
    </section>`,
    )
    .join('\n\n');
  const hero = `    <header class="case-hero shell">
      <div class="case-hero-main">
        <p class="kicker">Workflow</p>
        <h1>${escape(page.headline)}</h1>
        <p class="lede">${escape(page.description)}</p>
      </div>
      <aside class="case-hero-aside" aria-label="Series metadata">
        <p class="evidence-tag">Every page names its own source</p>
        <ul class="case-meta">
          <li><span>Practices</span><strong>${pages.length}</strong></li>
          <li><span>Last verified</span><strong>${escape(page.dateModified)}</strong></li>
        </ul>
      </aside>
    </header>`;
  return `${head}
${hero}

${rows}
${footer}`.replace(
    `<link rel="canonical" href="${ORIGIN}/workflow//">`,
    `<link rel="canonical" href="${ORIGIN}/workflow/">`,
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const spec = JSON.parse(await readFile(join(root, 'assets/data/workflow.json'), 'utf8'));

const written = [];
for (const page of spec) {
  const target = join(root, 'workflow', page.slug, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderPage(page));
  written.push(`workflow/${page.slug}/index.html`);
}
const indexTarget = join(root, 'workflow', 'index.html');
await mkdir(dirname(indexTarget), { recursive: true });
await writeFile(indexTarget, renderIndex(spec).replaceAll(`${ORIGIN}/workflow//`, `${ORIGIN}/workflow/`));
written.push('workflow/index.html');

console.log(`Generated ${written.length} workflow pages:`);
for (const path of written) console.log(`  ${path}`);
