// Renders the work tiles, the "Also building" picker and the open-source rows
// into the home page and the work index from assets/data/work.json.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { injectBlock, loadWork, renderMoreWork, renderOpenSource, renderPicker, renderTiles, root } from './render-work.mjs';

const work = await loadWork();

const pages = {
  'index.html': {
    selected: renderTiles(work, ['intertitle', 'lojik', 'pazz'], { level: 3, eager: true }),
    also: renderPicker(work, ['maestro', 'temper', 'mimo'], 'Also building'),
    'open-source': renderOpenSource(work),
  },
  'projects/index.html': {
    all: renderTiles(work, ['intertitle', 'lojik', 'pazz', 'maestro', 'temper', 'mimo'], { level: 2, eager: true }),
    'open-source': renderOpenSource(work),
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
