// Shared page chrome for the generated pages (workflow, writing).
//
// One copy of the head, nav and footer, so generated pages can't drift from
// each other. Hand-written pages carry the same markup; keep them in step.

export const ORIGIN = 'https://dgonzap30.github.io';

export const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const navItem = (href, label, current) =>
  `        <li><a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a></li>`;

export function chrome(page) {
  const canonical = page.canonical;
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
  <meta property="og:type" content="${page.ogType ?? 'article'}">
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
${page.extraHead ?? ''}  <script type="application/ld+json">
${JSON.stringify(
  page.jsonLd,
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
${navItem('/now/', 'Now', page.current)}
${navItem('/writing/', 'Writing', page.current)}
${navItem('/workflow/', 'Workflow', page.current)}
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

export function renderSection(section, index) {
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

