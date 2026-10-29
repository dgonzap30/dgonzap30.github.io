// Renders the work index and the open-source table into the home page and the
// work index, and the "More work" table into the LOJIK case study, from
// assets/data/work.json.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { injectBlock, loadWork, renderIndex, renderMoreWork, renderOpenSource, root } from './render-work.mjs';

const work = await loadWork();
const all = work.products.map((product) => product.id);

const pages = {
  'index.html': {
    index: renderIndex(work, all, { label: 'Work', level: 3 }),
    'open-source': renderOpenSource(work, 3),
  },
  'projects/index.html': {
    index: renderIndex(work, all, { label: 'Products', level: 2, long: true }),
    'open-source': renderOpenSource(work, 3),
  },
  'work/lojik/index.html': {
    more: renderMoreWork(work, 'lojik'),
  },
};

for (const [path, blocks] of Object.entries(pages)) {
  const file = join(root, path);
  let html = await readFile(file, 'utf8');
  for (const [name, content] of Object.entries(blocks)) html = injectBlock(html, 'work', name, content, path);
  await writeFile(file, html);
}
console.log(`Work rendered into ${Object.keys(pages).length} pages.`);
