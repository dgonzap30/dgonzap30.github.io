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

// The DGZ trace mark, inline so it takes the header's ink. The route draws
// itself again on hover.
const MARK = `<svg class="brand-mark" viewBox="0 0 48 48" width="28" height="28" aria-hidden="true" focusable="false"><path pathLength="1" d="M8 8h16c10 0 16 6 16 16s-6 16-16 16H8V8h24L16 32h16v-8h8" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="square" stroke-linejoin="round"/><circle class="brand-dot" cx="40" cy="24" r="2.5"/></svg>`;

const block = (name, content) => `<!-- chrome:${name}:start -->\n${content}\n<!-- chrome:${name}:end -->`;

export function headAssets() {
  return block(
    'assets',
    `  <link rel="preload" href="/assets/fonts/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/newsreader-roman-latin.woff2" as="font" type="font/woff2" crossorigin>
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

// `current` is the nav href this page belongs under; `home` drops the name
// from the header because the home page's h1 already says it.
export function siteHeader(current, { home = false } = {}) {
  const items = NAV.map(
    ([href, label]) =>
      `        <li><a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a></li>`,
  ).join('\n');
  const name = home ? '' : `<span class="brand-name">${NAME}</span>`;
  return block(
    'header',
    `  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="/" aria-label="${NAME}, home">${MARK}${name}</a>
    <nav aria-label="Primary">
      <ul class="nav-links" role="list">
${items}
      </ul>
    </nav>
  </header>`,
  );
}

// LOJIK links keep the referrer (no noreferrer) so its lead attribution can
// file these visits as referrals from this site instead of direct traffic.
export function siteFooter() {
  return block(
    'footer',
    `  <footer class="site-footer">
    <div class="footer-inner shell">
      <p class="footer-name"><strong>${NAME}</strong> · Founder-engineer, Mexico City</p>
      <ul class="footer-links" role="list">
        <li><a href="mailto:${EMAIL}">Email</a></li>
        <li><a href="https://www.linkedin.com/in/diego-gonzap/" target="_blank" rel="me noopener noreferrer">LinkedIn</a></li>
        <li><a href="https://github.com/dgonzap30" target="_blank" rel="me noopener noreferrer">GitHub</a></li>
        <li><a href="https://wearelojik.com/" target="_blank" rel="noopener">LOJIK</a></li>
        <li><a href="/links/">Links</a></li>
      </ul>
    </div>
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

// page: { title, description, canonical, current?, home?, ogType?, ogImage?,
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
  <meta name="theme-color" content="#f2f4f3">
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
${siteHeader(page.current, { home: page.home })}

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

// One prose section: a serif h2, paragraphs, an optional list and an optional
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

// The workflow series as a numbered path: a rail that draws as you scroll,
// one node per practice, each linking to its article and naming its source.
export function renderSeries(pages, indent = '      ') {
  const items = pages
    .map(
      (page, index) =>
        `${indent}  <li class="series-item"><a class="series-link" href="/workflow/${page.slug}/"><span class="series-num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="series-title">${escape(page.title)}</span><span class="series-line">${escape(page.description)}</span></a></li>`,
    )
    .join('\n');
  return `${indent}<ol class="series" role="list">\n${items}\n${indent}</ol>`;
}

// Breadcrumb back to a parent index.
export const backLink = (href, label) => `    <p class="page-back meta"><a href="${href}">${escape(label)}</a> /</p>`;
