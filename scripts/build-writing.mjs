// Generates /writing/, one page per post, and /feed.xml from assets/data/writing.json.
//
// Posts here are the canonical versions; LinkedIn and X link back to them.
// Same approach as the workflow pages: shared chrome, generated HTML committed.
// Run `node scripts/build-sitemap.mjs` afterwards so the sitemap lists new posts.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORIGIN, chrome, escape, renderSection } from './site-chrome.mjs';

const BLOG_ID = `${ORIGIN}/writing/#blog`;
const FEED_TITLE = 'Diego González Zapiain — Writing';
const FEED_DESCRIPTION =
  'Long posts on building software with a fleet of AI agents, the products that come out of it, and taste.';
const AUTHOR = {
  '@type': 'Person',
  '@id': 'https://wearelojik.com/about#diego',
  name: 'Diego González Zapiain',
  url: `${ORIGIN}/`,
};
const FEED_LINK = `  <link rel="alternate" type="application/rss+xml" title="${FEED_TITLE}" href="/feed.xml">\n`;

const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

function renderPost(post) {
  const canonical = `${ORIGIN}/writing/${post.slug}/`;
  const { head, footer } = chrome({
    title: post.title,
    description: post.description,
    canonical,
    current: '/writing/',
    extraHead: FEED_LINK,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${canonical}#post`,
      headline: post.headline,
      name: post.title,
      description: post.description,
      url: canonical,
      mainEntityOfPage: canonical,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      inLanguage: 'en',
      image: `${ORIGIN}/assets/social/home.png`,
      author: AUTHOR,
      publisher: { '@id': AUTHOR['@id'] },
      isPartOf: { '@id': BLOG_ID },
    },
  });
  const updated =
    post.dateModified !== post.datePublished
      ? `\n          <li><span>Updated</span><strong>${escape(longDate(post.dateModified))}</strong></li>`
      : '';
  const hero = `    <header class="case-hero shell">
      <div class="case-hero-main">
        <p class="kicker">Writing</p>
        <h1>${escape(post.headline)}</h1>
        <p class="lede">${post.lede}</p>
      </div>
      <aside class="case-hero-aside" aria-label="Post metadata">
        <p class="evidence-tag">Published ${escape(longDate(post.datePublished))}</p>
        <ul class="case-meta">
          <li><span>Author</span><strong><a href="/">Diego González Zapiain</a></strong></li>${updated}
        </ul>
      </aside>
    </header>`;
  const sections = post.sections.map(renderSection).join('\n\n');
  return `${head}
${hero}

${sections}
${footer}`;
}

function renderIndex(posts) {
  const canonical = `${ORIGIN}/writing/`;
  const { head, footer } = chrome({
    title: 'Writing',
    description: `${FEED_DESCRIPTION} By Diego González Zapiain.`,
    canonical,
    current: '/writing/',
    extraHead: FEED_LINK,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': BLOG_ID,
      name: FEED_TITLE,
      description: FEED_DESCRIPTION,
      url: canonical,
      inLanguage: 'en',
      author: AUTHOR,
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        '@id': `${ORIGIN}/writing/${post.slug}/#post`,
        headline: post.headline,
        url: `${ORIGIN}/writing/${post.slug}/`,
        datePublished: post.datePublished,
      })),
    },
  });
  const rows = posts.length
    ? posts
        .map(
          (post, index) => `    <section class="case-section shell" id="${post.slug}">
      <p class="case-section-index">${String(posts.length - index).padStart(2, '0')}</p>
      <div class="case-section-main">
        <h2><a href="/writing/${post.slug}/">${escape(post.headline)}</a></h2>
        <p>${escape(post.description)}</p>
      </div>
      <aside class="case-note"><strong>Published</strong>${escape(longDate(post.datePublished))}</aside>
    </section>`,
        )
        .join('\n\n')
    : `    <section class="case-section shell" id="first-post">
      <p class="case-section-index">00</p>
      <div class="case-section-main">
        <h2>The first post is in progress</h2>
        <p>Until then, <a href="/now/">Now</a> has what I'm building this month.</p>
      </div>
    </section>`;
  const latest = posts[0] ? escape(longDate(posts[0].datePublished)) : '—';
  const hero = `    <header class="case-hero shell">
      <div class="case-hero-main">
        <p class="kicker">Writing</p>
        <h1>Long posts, dated.</h1>
        <p class="lede">${escape(FEED_DESCRIPTION)} Each post here is the canonical version; LinkedIn and X link back to it.</p>
      </div>
      <aside class="case-hero-aside" aria-label="Writing metadata">
        <p class="evidence-tag">Also as <a href="/feed.xml">RSS</a></p>
        <ul class="case-meta">
          <li><span>Posts</span><strong>${posts.length}</strong></li>
          <li><span>Latest</span><strong>${latest}</strong></li>
        </ul>
      </aside>
    </header>`;
  return `${head}
${hero}

${rows}
${footer}`;
}

function renderFeed(posts) {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${escape(post.headline)}</title>
      <link>${ORIGIN}/writing/${post.slug}/</link>
      <guid isPermaLink="true">${ORIGIN}/writing/${post.slug}/</guid>
      <pubDate>${new Date(`${post.datePublished}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${escape(post.description)}</description>
    </item>`,
    )
    .join('\n');
  // lastBuildDate follows the newest post, not the clock, so rebuilds are byte-stable.
  const built = posts[0]
    ? `\n    <lastBuildDate>${new Date(`${posts[0].dateModified}T12:00:00Z`).toUTCString()}</lastBuildDate>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(FEED_TITLE)}</title>
    <link>${ORIGIN}/writing/</link>
    <description>${escape(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>${built}${items ? `\n${items}` : ''}
  </channel>
</rss>
`;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const posts = JSON.parse(await readFile(join(root, 'assets/data/writing.json'), 'utf8')).sort((a, b) =>
  b.datePublished.localeCompare(a.datePublished),
);

const written = [];
for (const post of posts) {
  const target = join(root, 'writing', post.slug, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderPost(post));
  written.push(`writing/${post.slug}/index.html`);
}
await mkdir(join(root, 'writing'), { recursive: true });
await writeFile(join(root, 'writing', 'index.html'), renderIndex(posts));
written.push('writing/index.html');
await writeFile(join(root, 'feed.xml'), renderFeed(posts));
written.push('feed.xml');

console.log(`Generated ${written.length} writing files:`);
for (const path of written) console.log(`  ${path}`);
