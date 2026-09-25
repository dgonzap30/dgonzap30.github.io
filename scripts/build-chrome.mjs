// Rewrites the shared chrome blocks in the hand-written pages from
// site-chrome.mjs. Each page keeps its own title, meta and JSON-LD; only the
// assets, header and footer between <!-- chrome:NAME:start/end --> markers
// are replaced. Generated pages get the same blocks from chrome() directly.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { headAssets, siteFooter, siteHeader } from './site-chrome.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Page → the nav item it sits under (null for none), and whether it is home.
const PAGES = [
  ['index.html', null, true],
  ['projects/index.html', '/projects/'],
  ['work/pazz/index.html', '/projects/'],
  ['work/lojik/index.html', '/projects/'],
  ['now/index.html', '/now/'],
  ['thanks/index.html', null],
  ['404.html', null],
];

function replaceBlock(html, name, content, path) {
  const pattern = new RegExp(`<!-- chrome:${name}:start -->[\\s\\S]*?<!-- chrome:${name}:end -->`);
  if (!pattern.test(html)) throw new Error(`${path}: missing marker chrome:${name}`);
  return html.replace(pattern, () => content);
}

for (const [path, current, home] of PAGES) {
  const file = resolve(root, path);
  let html = await readFile(file, 'utf8');
  html = replaceBlock(html, 'assets', headAssets(), path);
  html = replaceBlock(html, 'header', siteHeader(current, { home }), path);
  html = replaceBlock(html, 'footer', siteFooter(), path);
  await writeFile(file, html);
}
console.log(`Chrome synced into ${PAGES.length} hand-written pages.`);
