// Generates the workflow pages from assets/data/workflow.json, and the
// numbered series on the home page.
//
// The seven pages share one skeleton and differ only in content, so they are
// generated rather than hand-copied seven times and left to drift. The
// generated HTML is committed; nothing is built at request time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NAME, ORIGIN, PERSON_ID, WEBSITE_ID, backLink, chrome, escape, renderSection, renderSeries } from './site-chrome.mjs';
import { injectBlock } from './render-work.mjs';

const SERIES_ID = `${ORIGIN}/workflow/#series`;
const AUTHOR = { '@type': 'Person', '@id': PERSON_ID, name: NAME, url: `${ORIGIN}/` };
const INDEX = {
  title: 'The workflow',
  description:
    'Seven practices for running a fleet of AI coding agents, each derived from a working artifact rather than written as advice.',
  headline: 'Seven practices, each derived from something that runs.',
};

// One article: a centred reading column, a mono line naming the file the
// practice comes from, and a reading-progress bar driven by the scroll.
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
    <nav class="next-part col" aria-labelledby="next-title">
      <div class="section-head"><h2 class="section-title" id="next-title">Next in the series</h2><a class="section-link" href="/workflow/">All seven</a></div>
      <a class="next-link" href="/workflow/${next.slug}/"><span class="meta">Part ${index + 2}</span><span class="next-title">${escape(next.title)}</span><span class="next-line">${escape(next.description)}</span></a>
    </nav>`
    : '';
  return `${head}
    <div class="read-progress" aria-hidden="true"></div>
    <header class="page-head page-head--article col">
      <p class="page-back meta"><a href="/workflow/">The workflow</a> / Part ${index + 1} of ${total}</p>
      <h1>${escape(page.headline)}</h1>
      <p class="lede">${page.lede}</p>
      <p class="page-meta meta">From <code>${escape(page.artifact)}</code> · ${escape(page.shape)} · <span class="verified">Verified ${escape(page.dateModified)}</span></p>
    </header>

    <article class="prose col">
${page.sections.map(renderSection).join('\n\n')}
    </article>
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
    <header class="page-head shell">
${backLink('/writing/', 'Writing')}
      <h1>${escape(INDEX.headline)}</h1>
      <p class="lede">${escape(INDEX.description)} Every page names the file it comes from and, where it counts something, the command that recounts it.</p>
      <p class="page-meta meta">${pages.length} practices · Last verified ${escape(dateModified)}</p>
    </header>

    <div class="shell">
${renderSeries(pages)}
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
  await writeFile(target, renderPage(page, index, spec.length, spec[index + 1]));
  written.push(`workflow/${page.slug}/index.html`);
}
const indexTarget = join(root, 'workflow', 'index.html');
await mkdir(dirname(indexTarget), { recursive: true });
await writeFile(indexTarget, renderIndex(spec));
written.push('workflow/index.html');

const homePath = join(root, 'index.html');
await writeFile(homePath, injectBlock(await readFile(homePath, 'utf8'), 'workflow', 'home', renderSeries(spec), 'index.html'));
written.push('index.html (workflow series)');

console.log(`Generated ${written.length} workflow pages:`);
for (const path of written) console.log(`  ${path}`);
