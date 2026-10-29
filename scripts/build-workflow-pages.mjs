// Generates the workflow pages from assets/data/workflow.json, and the
// numbered series on the home page.
//
// The seven pages share one skeleton and differ only in content, so they are
// generated rather than hand-copied seven times and left to drift. The
// generated HTML is committed; nothing is built at request time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAME, ORIGIN, PERSON_ID, WEBSITE_ID, backLink, chrome, escape, renderSection, renderSeries, sectionHead, tableRow } from './site-chrome.mjs';
import { injectBlock } from './render-work.mjs';

const SERIES_ID = `${ORIGIN}/workflow/#series`;
const AUTHOR = { '@type': 'Person', '@id': PERSON_ID, name: NAME, url: `${ORIGIN}/` };
const INDEX = {
  title: 'The workflow',
  description:
    'Seven practices for running a fleet of AI coding agents, each derived from a working artifact rather than written as advice.',
  headline: 'Seven practices, each derived from something that runs.',
};

// One article: a reading column on the grid, a mono line naming the file the
// practice comes from, and the next part as a ruled row.
function renderPage(page, index, total, next) {
  const canonical = `${ORIGIN}/workflow/${page.slug}/`;
  const { head, footer } = chrome({
    title: page.title,
    description: page.description,
    canonical,
    current: '/writing/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      '@id': `${canonical}#article`,
      headline: page.headline,
      description: page.description,
      url: canonical,
      dateModified: page.dateModified,
      inLanguage: 'en',
      author: AUTHOR,
      about: page.title,
      isPartOf: { '@id': SERIES_ID },
    },
  });
  const nextLink = next
    ? `
    <nav class="next wrap" aria-labelledby="next-title">
      <div class="col">
        ${sectionHead('<h2 class="label" id="next-title">Next in the series</h2>', '', '<a href="/workflow/">All seven</a>')}
        <ol class="table" role="list">
          ${tableRow({ n: String(index + 2).padStart(2, '0'), title: next.title, line: escape(next.short), href: `/workflow/${next.slug}/` })}
        </ol>
      </div>
    </nav>`
    : '';
  return `${head}
    <header class="page-head wrap">
      <div class="col">
${backLink('/workflow/', 'The workflow', `Part ${index + 1} of ${total}`)}
        <h1 class="h2">${escape(page.headline)}</h1>
        <p class="lede">${page.lede}</p>
        <p class="meta">From <code>${escape(page.artifact)}</code> · ${escape(page.shape)} · <span class="verified">Verified ${escape(page.dateModified)}</span></p>
      </div>
    </header>

    <div class="wrap">
      <article class="prose col">
${page.sections.map(renderSection).join('\n\n')}
      </article>
    </div>
${nextLink}
${footer}`;
}

function renderIndex(pages) {
  const canonical = `${ORIGIN}/workflow/`;
  const dateModified = pages.map((page) => page.dateModified).sort().at(-1);
  const { head, footer } = chrome({
    title: INDEX.title,
    description: INDEX.description,
    canonical,
    current: '/writing/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': SERIES_ID,
      name: INDEX.title,
      headline: INDEX.headline,
      description: INDEX.description,
      url: canonical,
      dateModified,
      inLanguage: 'en',
      author: AUTHOR,
      isPartOf: { '@id': WEBSITE_ID },
      hasPart: pages.map((page) => ({
        '@type': 'TechArticle',
        '@id': `${ORIGIN}/workflow/${page.slug}/#article`,
        headline: page.headline,
        url: `${ORIGIN}/workflow/${page.slug}/`,
      })),
    },
  });
  return `${head}
    <header class="page-head wrap">
${backLink('/writing/', 'Writing')}
      <h1 class="title title--sentence display">${escape(INDEX.headline)}</h1>
      <div class="intro grid">
        <p class="lede">${escape(INDEX.description)} Every page names the file it comes from and, where it counts something, the command that recounts it.</p>
        <dl class="facts">
          <div><dt>Practices</dt><dd>${pages.length}</dd></div>
          <div><dt>Last verified</dt><dd><span class="verified">${escape(dateModified)}</span></dd></div>
        </dl>
      </div>
    </header>

    <section class="block wrap" aria-labelledby="series-title">
      ${sectionHead(`<h2 class="label" id="series-title">The series (${pages.length})</h2>`, '', '<span>Read</span>')}
${renderSeries(pages)}
    </section>
${footer}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const spec = JSON.parse(await readFile(join(root, 'assets/data/workflow.json'), 'utf8'));

const written = [];
for (const [index, page] of spec.entries()) {
  const target = join(root, 'workflow', page.slug, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderPage(page, index, spec.length, spec[index + 1]));
  written.push(`workflow/${page.slug}/index.html`);
}
const indexTarget = join(root, 'workflow', 'index.html');
await mkdir(dirname(indexTarget), { recursive: true });
await writeFile(indexTarget, renderIndex(spec));
written.push('workflow/index.html');

const homePath = join(root, 'index.html');
const homeSeries = `      ${sectionHead(`<span><a href="/workflow/">The series (${spec.length})</a></span>`, '', '<span>Read</span>')}
${renderSeries(spec)}`;
await writeFile(homePath, injectBlock(await readFile(homePath, 'utf8'), 'workflow', 'home', homeSeries, 'index.html'));
written.push('index.html (workflow series)');

console.log(`Generated ${written.length} workflow pages:`);
for (const path of written) console.log(`  ${path}`);
