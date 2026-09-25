// Generates the workflow pages from assets/data/workflow.json.
//
// The seven pages share one skeleton and differ only in content, so they are
// generated rather than hand-copied seven times and left to drift. The
// generated HTML is committed; nothing is built at request time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAME, ORIGIN, PERSON_ID, WEBSITE_ID, backLink, chrome, escape, renderSection } from './site-chrome.mjs';

const SERIES_ID = `${ORIGIN}/workflow/#series`;
const AUTHOR = { '@type': 'Person', '@id': PERSON_ID, name: NAME, url: `${ORIGIN}/` };
const INDEX = {
  title: 'The workflow',
  description:
    'Seven practices for running a fleet of AI coding agents, each derived from a working artifact rather than written as advice.',
  headline: 'Seven practices, each derived from something that runs.',
};

function renderPage(page, next) {
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
    <nav class="section shell" aria-labelledby="next-title">
      <div class="section-head"><h2 class="section-title" id="next-title">Next in the series</h2><a class="section-link" href="/workflow/">All seven</a></div>
      <ul class="rows rows--compact" role="list">
        <li class="row"><a class="row-link" href="/workflow/${next.slug}/"><span class="row-title">${escape(next.title)}</span><span class="row-meta meta">→</span><span class="row-line">${escape(next.description)}</span></a></li>
      </ul>
    </nav>`
    : '';
  return `${head}
    <header class="page-head shell">
${backLink('/workflow/', 'The workflow')}
      <h1>${escape(page.headline)}</h1>
      <p class="lede">${page.lede}</p>
      <p class="page-meta meta">From <code>${escape(page.artifact)}</code> · ${escape(page.shape)} · Verified ${escape(page.dateModified)}</p>
    </header>

    <div class="shell">
      <article class="prose">
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
  const rows = pages
    .map(
      (page) =>
        `        <li class="row"><a class="row-link" href="/workflow/${page.slug}/"><span class="row-title">${escape(page.title)}</span><span class="row-line">${escape(page.description)}</span><span class="row-meta meta"><code>${escape(page.artifact)}</code></span></a></li>`,
    )
    .join('\n');
  return `${head}
    <header class="page-head shell">
${backLink('/writing/', 'Writing')}
      <h1>${escape(INDEX.headline)}</h1>
      <p class="lede">${escape(INDEX.description)} Every page names the file it comes from and, where it counts something, the command that recounts it.</p>
      <p class="page-meta meta">${pages.length} practices · Last verified ${escape(dateModified)}</p>
    </header>

    <div class="shell">
      <ol class="rows rows--series" role="list">
${rows}
      </ol>
    </div>
${footer}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const spec = JSON.parse(await readFile(join(root, 'assets/data/workflow.json'), 'utf8'));

const written = [];
for (const [index, page] of spec.entries()) {
  const target = join(root, 'workflow', page.slug, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderPage(page, spec[index + 1]));
  written.push(`workflow/${page.slug}/index.html`);
}
const indexTarget = join(root, 'workflow', 'index.html');
await mkdir(dirname(indexTarget), { recursive: true });
await writeFile(indexTarget, renderIndex(spec));
written.push('workflow/index.html');

console.log(`Generated ${written.length} workflow pages:`);
for (const path of written) console.log(`  ${path}`);
