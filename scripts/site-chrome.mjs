// Shared page chrome: one head, header and footer for every page.
//
// Generated pages (products, workflow, writing) call chrome() directly.
// Hand-written pages carry the same blocks between <!-- chrome:NAME:start -->
// and <!-- chrome:NAME:end --> markers, and build-chrome.mjs rewrites them
// from here, so no page can drift from the others.

export const ORIGIN = 'https://dgonzap30.github.io';
export const NAME = 'Diego González Zapiain';
export const PERSON_ID = 'https://wearelojik.com/about#diego';
export const WEBSITE_ID = `${ORIGIN}/#website`;
export const FEED_TITLE = `${NAME} — Writing`;
// Published on wearelojik.com/about too, so it is already public.
export const EMAIL = 'diego.gonzap@wearelojik.com';

export const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const NAV = [
  ['/projects/', 'Work'],
  ['/writing/', 'Writing'],
  ['/now/', 'Now'],
];

const block = (name, content) => `<!-- chrome:${name}:start -->\n${content}\n<!-- chrome:${name}:end -->`;

export function headAssets() {
  return block(
    'assets',
    `  <link rel="preload" href="/assets/fonts/GeneralSans-Semibold.otf" as="font" type="font/otf" crossorigin>
  <link rel="preload" href="/assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/brand/favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="alternate" type="application/rss+xml" title="${escape(FEED_TITLE)}" href="/feed.xml">
  <link rel="stylesheet" href="/assets/css/fonts.css">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/explorer.css">
  <link rel="stylesheet" href="/assets/css/pages.css">
  <script src="/assets/js/site.js" defer></script>`,
  );
}

// The bar: name, a Mexico City clock (site.js fills in the time), the nav and
// Email. `current` is the nav href this page belongs under.
export function siteHeader(current) {
  const items = NAV.map(
    ([href, label]) => `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`,
  ).join(', ');
  return block(
    'header',
    `  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="bar grid wrap">
    <a class="who" href="/">${NAME}</a>
    <p class="clock">Mexico City<span data-clock></span></p>
    <nav class="nav" aria-label="Primary">${items}</nav>
    <a class="mail" href="mailto:${EMAIL}">Email</a>
  </header>`,
  );
}

// LOJIK links keep the referrer (no noreferrer) so its lead attribution can
// file these visits as referrals from this site instead of direct traffic.
export function siteFooter() {
  return block(
    'footer',
    `  <footer class="foot grid wrap">
    <p class="foot-name">${NAME} · Mexico City</p>
    <p class="foot-lang">English and Spanish</p>
    <ul class="foot-links" role="list">
      <li><a href="mailto:${EMAIL}">Email</a></li>
      <li><a href="https://www.linkedin.com/in/diego-gonzap/" target="_blank" rel="me noopener noreferrer">LinkedIn</a></li>
      <li><a href="https://github.com/dgonzap30" target="_blank" rel="me noopener noreferrer">GitHub</a></li>
      <li><a href="https://wearelojik.com/" target="_blank" rel="noopener">LOJIK</a></li>
      <li><a href="/links/">Links</a></li>
    </ul>
  </footer>`,
  );
}

export function jsonLdScript(data) {
  const body = JSON.stringify(data, null, 2)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');
  return `  <script type="application/ld+json">\n${body}\n  </script>`;
}

// page: { title, description, canonical, current?, ogType?, ogImage?,
//         ogImageAlt?, noindex?, fullTitle?, jsonLd, extraHead? }
export function chrome(page) {
  const title = page.fullTitle ?? `${page.title} — ${NAME}`;
  const image = page.ogImage ?? `${ORIGIN}/assets/social/home.png`;
  const imageAlt = page.ogImageAlt ?? `${NAME}: founder-engineer in Mexico City`;
  const robots = page.noindex ? '\n  <meta name="robots" content="noindex">' : '';
  return {
    head: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${escape(title)}</title>
  <meta name="description" content="${escape(page.description)}">
  <link rel="canonical" href="${page.canonical}">${robots}
  <meta name="author" content="${NAME}">
  <meta name="theme-color" content="#faf8f5">
  <meta property="og:site_name" content="${NAME}">
  <meta property="og:title" content="${escape(page.ogTitle ?? title)}">
  <meta property="og:description" content="${escape(page.description)}">
  <meta property="og:type" content="${page.ogType ?? 'article'}">
  <meta property="og:url" content="${page.canonical}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escape(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(page.ogTitle ?? title)}">
  <meta name="twitter:description" content="${escape(page.description)}">
  <meta name="twitter:image" content="${image}">
${headAssets()}
${page.extraHead ?? ''}${jsonLdScript(page.jsonLd)}
</head>
<body>
${siteHeader(page.current)}

  <main id="main-content">`,
    footer: `  </main>

${siteFooter()}
</body>
</html>
`,
  };
}

// A list whose every point opens with a bolded term ("<strong>Term</strong> —
// what it means") is a set of definitions, so it renders as one: terms
// beside their meanings, never as bold-lead bullets.
const TERM = /^<strong>([^<]+)<\/strong>\s*[—–-]\s*([\s\S]+)$/;

// One prose section: an h2, paragraphs, an optional list and an optional
// note. Notes sit inline under the text, never in a side rail.
export function renderSection(section) {
  const body = [`      <h2>${escape(section.heading)}</h2>`];
  for (const paragraph of section.body) body.push(`      <p>${paragraph}</p>`);
  if (section.points?.length && section.points.every((point) => TERM.test(point))) {
    body.push('      <dl class="terms">');
    for (const point of section.points) {
      const [, term, meaning] = point.match(TERM);
      body.push(`        <div><dt>${term}</dt><dd>${meaning}</dd></div>`);
    }
    body.push('      </dl>');
  } else if (section.points?.length) {
    body.push('      <ul>');
    for (const point of section.points) body.push(`        <li>${point}</li>`);
    body.push('      </ul>');
  }
  if (section.note) {
    body.push(`      <aside class="note"><strong>${escape(section.note.label)}</strong> ${section.note.text}</aside>`);
  }
  return `    <section class="prose-section" id="${section.id}">
${body.join('\n')}
    </section>`;
}

// A ruled table row: number, name, one line, arrow. `href` may be external.
export function tableRow({ n, title, line, href, go = '→', level = 0 }) {
  const external = /^https?:/.test(href);
  const rel = external ? (/^https:\/\/wearelojik\.com\//.test(href) ? ' target="_blank" rel="noopener"' : ' target="_blank" rel="noopener noreferrer"') : '';
  const name = level ? `<h${level} class="h3">${escape(title)}</h${level}>` : `<span class="h3">${escape(title)}</span>`;
  return `<li><a class="grid" href="${escape(href)}"${rel}><span class="n label" aria-hidden="true">${n}</span>${name}<span class="small">${line}</span><span class="go" aria-hidden="true">${go}</span></a></li>`;
}

// The workflow series as a ruled table, one row per practice, each linking to
// its article with the practice's short line.
export function renderSeries(pages, indent = '      ') {
  const items = pages
    .map(
      (page, index) =>
        `${indent}  ${tableRow({ n: String(index + 1).padStart(2, '0'), title: page.title, line: escape(page.short), href: `/workflow/${page.slug}/` })}`,
    )
    .join('\n');
  return `${indent}<ol class="table" role="list">\n${items}\n${indent}</ol>`;
}

// Section head: one rule, a label, a column label and an optional link.
export const sectionHead = (first, second = '', third = '') =>
  `<div class="head grid label">${first}<span>${second}</span>${third || '<span></span>'}</div>`;

// Breadcrumb back to a parent index.
export const backLink = (href, label, rest = '') =>
  `    <p class="crumb label"><a href="${href}">${escape(label)}</a> /${rest ? ` ${rest}` : ''}</p>`;
