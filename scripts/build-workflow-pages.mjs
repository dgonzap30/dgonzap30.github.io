// Generates the workflow pages from assets/data/workflow.json.
//
// The site ships hand-written HTML on purpose. These seven pages share one
// skeleton and differ only in content, so they are generated to keep the
// chrome identical rather than hand-copied seven times and left to drift.
// The generated HTML is committed; nothing is built at request time.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://dgonzap30.github.io';

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function chrome(page) {
  const canonical = `${ORIGIN}/workflow/${page.slug}/`;
  return {
    head: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escape(page.title)} — Diego Gonzalez Zapiain</title>
  <meta name="description" content="${escape(page.description)}">
  <meta name="theme-color" content="#171c23">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escape(page.title)}">
  <meta property="og:description" content="${escape(page.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ORIGIN}/assets/social/home.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(page.title)}">
  <meta name="twitter:description" content="${escape(page.description)}">
  <meta name="twitter:image" content="${ORIGIN}/assets/social/home.png">
  <link rel="preload" href="/assets/fonts/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/newsreader-roman-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/fonts.css">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/pages.css">
  <script src="/assets/js/site.js" defer></script>
  <script type="application/ld+json">
${JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.headline,
    url: canonical,
    dateModified: page.dateModified,
    author: { '@type': 'Person', name: 'Diego Gonzalez Zapiain' },
    about: page.title,
  },
  null,
  2,
)
  .split('\n')
  .map((line) => `    ${line}`)
  .join('\n')}
  </script>
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <header class="site-header">
    <nav class="site-nav shell" aria-label="Primary navigation">
      <a class="brand" href="/" aria-label="Diego Gonzalez Zapiain, home">
        <img src="/assets/brand/dgz-trace.svg" width="48" height="48" alt="">
        <span>Diego Gonzalez Zapiain</span>
      </a>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="primary-nav"><span class="nav-toggle-icon" aria-hidden="true"><span></span></span>Menu</button>
      <ul class="nav-links" id="primary-nav">
        <li><a href="/workflow/">Workflow</a></li>
        <li><a href="/projects/">All products</a></li>
        <li><a href="/#approach">Approach</a></li>
        <li><a class="nav-external" href="https://github.com/dgonzap30" target="_blank" rel="me noopener noreferrer">GitHub</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content">`,
    footer: `  </main>

  <footer class="site-footer">
    <div class="footer-inner shell">
      <p class="kicker">Continue the atlas</p>
      <h2 class="footer-title">Accountability is a systems property.</h2>
      <div class="contact-paths">
        <a class="contact-path" href="/workflow/"><span>Every practice in this series</span><strong>The workflow index</strong></a>
        <a class="contact-path" href="https://wearelojik.com/" target="_blank" rel="noopener noreferrer"><span>Recurring business workflow · Systems delivery</span><strong>Start a LOJIK review</strong></a>
      </div>
      <div class="footer-meta"><span>Diego Gonzalez Zapiain</span><span>LOJIK Labs · Co-Founder &amp; Technical Lead</span></div>
    </div>
  </footer>
</body>
</html>
`,
  };
}

function renderSection(section, index) {
  const body = [];
  body.push(`      <div class="case-section-main">`);
  body.push(`        <h2>${escape(section.heading)}</h2>`);
  for (const paragraph of section.body) body.push(`        <p>${paragraph}</p>`);
  if (section.points?.length) {
    body.push(`        <ul class="decision-list">`);
    for (const point of section.points) body.push(`          <li>${point}</li>`);
    body.push(`        </ul>`);
  }
  body.push(`      </div>`);
  const note = section.note
    ? `\n      <aside class="case-note"><strong>${escape(section.note.label)}</strong>${section.note.text}</aside>`
    : '';
  return `    <section class="case-section shell" id="${section.id}">
      <p class="case-section-index">${String(index + 1).padStart(2, '0')}</p>
${body.join('\n')}${note}
    </section>`;
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
