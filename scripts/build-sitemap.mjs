// Generates /sitemap.xml from every published index.html route.
//
// Run after adding or removing a page (build-writing.mjs and
// build-workflow-pages.mjs don't call it). Output is sorted and has no
// timestamps, so an unchanged site rebuilds byte-identical. Pages that ask
// not to be indexed (the form thank-you page) are left out.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ORIGIN } from './site-chrome.mjs';

const SKIP = new Set(['.git', '.github', 'assets', 'node_modules', 'scripts']);

async function routes(root, dir = root) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) found.push(...(await routes(root, join(dir, entry.name))));
    } else if (entry.name === 'index.html') {
      const html = await readFile(join(dir, entry.name), 'utf8');
      if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
      const path = relative(root, dir).split(sep).join('/');
      found.push(path ? `/${path}/` : '/');
    }
  }
  return found;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const urls = (await routes(root)).sort();
const body = urls.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n');
await writeFile(
  join(root, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`,
);
console.log(`Generated sitemap.xml with ${urls.length} routes.`);
