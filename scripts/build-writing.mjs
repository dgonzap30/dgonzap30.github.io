// Generates /writing/, one page per post, /feed.xml, and the newest posts on
// the home page (folded into "How I work"), from assets/data/writing.json,
// plus the workflow series from assets/data/workflow.json.
//
// Posts here are the canonical versions; LinkedIn and X link back to them.
// Run `node scripts/build-sitemap.mjs` afterwards so the sitemap lists new posts.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEED_TITLE, NAME, ORIGIN, PERSON_ID, WEBSITE_ID, backLink, chrome, escape, renderSection, renderSeries, sectionHead, tableRow } from './site-chrome.mjs';
import { injectBlock } from './render-work.mjs';

const BLOG_ID = `${ORIGIN}/writing/#blog`;
const FEED_DESCRIPTION =
  'Long posts on building software with a fleet of AI agents, the products that come out of it, and taste.';
const AUTHOR = { '@type': 'Person', '@id': PERSON_ID, name: NAME, url: `${ORIGIN}/` };

const longDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

const time = (iso) => `<time datetime="${iso}">${escape(longDate(iso))}</time>`;

const shortDate = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function postRow(post) {
  return tableRow({ n: escape(shortDate(post.datePublished)), title: post.headline, line: escape(post.description), href: `/writing/${post.slug}/` });
}

function postsTable(posts, label, indent = '      ') {
  return `${indent}${sectionHead(`<h2 class="label" id="posts-title">${label} (${posts.length})</h2>`, '', '<a href="/writing/">All writing →</a>')}
${indent}<ol class="table" role="list">
${posts.map((post) => `${indent}  ${postRow(post)}`).join('\n')}
${indent}</ol>`;
}

function renderPost(post) {
  const canonical = `${ORIGIN}/writing/${post.slug}/`;
  const { head, footer } = chrome({
    title: post.title,
    description: post.description,
    canonical,
    current: '/writing/',
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
      publisher: { '@id': PERSON_ID },
      isPartOf: { '@id': BLOG_ID },
    },
  });
  const updated = post.dateModified !== post.datePublished ? ` · Updated ${time(post.dateModified)}` : '';
  return `${head}
    <header class="page-head wrap">
      <div class="col">
${backLink('/writing/', 'Writing')}
        <h1 class="h2">${escape(post.headline)}</h1>
        <p class="lede">${post.lede}</p>
        <p class="meta">${time(post.datePublished)}${updated}</p>
      </div>
    </header>

    <div class="wrap">
      <article class="prose col">
${post.sections.map(renderSection).join('\n\n')}
      </article>
    </div>
${footer}`;
}

function renderIndex(posts, series) {
  const canonical = `${ORIGIN}/writing/`;
  const { head, footer } = chrome({
    title: 'Writing',
    description: `${FEED_DESCRIPTION} By ${NAME}.`,
    canonical,
    current: '/writing/',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': BLOG_ID,
      name: FEED_TITLE,
      description: FEED_DESCRIPTION,
      url: canonical,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
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
  const postsSection = posts.length ? `${postsTable(posts, 'Posts')}\n` : '';
  return `${head}
    <header class="page-head wrap">
      <h1 class="title display">Writing</h1>
      <div class="intro grid">
        <p class="lede">${escape(FEED_DESCRIPTION)}</p>
        <dl class="facts">
          <div><dt>Series</dt><dd><a href="/workflow/">The workflow</a>, ${series.length} parts</dd></div>
          <div><dt>Feed</dt><dd><a href="/feed.xml">RSS</a></dd></div>
        </dl>
      </div>
    </header>

    <section class="block wrap" aria-labelledby="series-title">
${postsSection}      ${sectionHead(`<h2 class="label" id="series-title">The workflow (${series.length})</h2>`, '', '<a href="/workflow/">The series →</a>')}
${renderSeries(series)}
    </section>
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
const series = JSON.parse(await readFile(join(root, 'assets/data/workflow.json'), 'utf8'));

const written = [];
for (const post of posts) {
  const target = join(root, 'writing', post.slug, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, renderPost(post));
  written.push(`writing/${post.slug}/index.html`);
}
await mkdir(join(root, 'writing'), { recursive: true });
await writeFile(join(root, 'writing', 'index.html'), renderIndex(posts, series));
written.push('writing/index.html');
await writeFile(join(root, 'feed.xml'), renderFeed(posts));
written.push('feed.xml');

// Home folds the three newest posts into "How I work", under the series.
const homePath = join(root, 'index.html');
const homeRows = posts.length ? postsTable(posts.slice(0, 3), 'Writing') : '';
await writeFile(homePath, injectBlock(await readFile(homePath, 'utf8'), 'writing', 'home', homeRows, 'index.html'));
written.push('index.html (writing rows)');

console.log(`Generated ${written.length} writing files:`);
for (const path of written) console.log(`  ${path}`);
