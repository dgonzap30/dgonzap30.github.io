// Renderers for the work tiles, the compact product picker and the open-source
// rows, all from assets/data/work.json. Used by build-work.mjs (home and the
// work index) and build-explorer.mjs (the "More work" row on product pages).
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { escape } from './site-chrome.mjs';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = '/assets/media/home';

function webpSize(buffer) {
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === 'VP8X') {
      return [
        1 + buffer[data + 4] + (buffer[data + 5] << 8) + (buffer[data + 6] << 16),
        1 + buffer[data + 7] + (buffer[data + 8] << 8) + (buffer[data + 9] << 16),
      ];
    }
    if (type === 'VP8 ') return [buffer.readUInt16LE(data + 6) & 0x3fff, buffer.readUInt16LE(data + 8) & 0x3fff];
    if (type === 'VP8L') {
      const bits = buffer.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    offset = data + size + (size % 2);
  }
  throw new Error('WebP dimensions not found');
}

export async function loadWork() {
  const work = JSON.parse(await readFile(join(root, 'assets/data/work.json'), 'utf8'));
  const sizes = new Map();
  for (const product of work.products) {
    for (const name of [...product.media.images, product.thumb]) {
      if (!sizes.has(name)) sizes.set(name, webpSize(await readFile(join(root, `${MEDIA.slice(1)}/${name}.webp`))));
    }
  }
  return { ...work, sizes };
}

const external = (href) => /^https?:/.test(href);
const linkAttrs = (href) => (external(href) ? ' target="_blank" rel="noopener noreferrer"' : '');

function image(work, name, className, alt, eager, style = '') {
  const [width, height] = work.sizes.get(name);
  const loading = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<img class="${className}" src="${MEDIA}/${name}.webp" width="${width}" height="${height}" alt="${escape(alt)}"${style} ${loading} decoding="async">`;
}

// The tile's media layer, which drifts with scroll inside its plate. Phones
// fan out from the bottom edge (--k is each phone's place in the fan, centred
// on zero); a screen sits in a browser frame, with its address when public.
export function renderMedia(work, product, eager = false) {
  const { kind, images, url } = product.media;
  if (kind === 'phones') {
    const phones = images
      .map((name, index) => {
        const k = index - (images.length - 1) / 2;
        return image(work, name, 'phone', index === 0 ? product.alt : '', eager, ` style="--k: ${k}"`);
      })
      .join('\n            ');
    return `<div class="plate-media media--phones">
            ${phones}
          </div>`;
  }
  const address = url ? `<span class="frame-url">${escape(url)}</span>` : '';
  return `<div class="plate-media media--screen">
            <div class="frame"><span class="frame-bar" aria-hidden="true"><span class="frame-dots"></span>${address}</span>${image(work, images[0], 'screen', product.alt, eager)}</div>
          </div>`;
}

// A tile's plate carries the product's view-transition name, so it morphs
// into the hero of the product's own page.
export function renderTile(work, product, { level = 3, eager = false } = {}) {
  const extra = product.extra
    ? ` · <a class="tile-extra" href="${escape(product.extra.href)}"${linkAttrs(product.extra.href)}>${escape(product.extra.label)} <span aria-hidden="true">↗</span></a>`
    : '';
  return `      <article class="tile tile--${product.tile} reveal" data-tilt>
        <div class="plate plate--${product.plate}" style="view-transition-name: media-${product.id}">
          ${renderMedia(work, product, eager)}
        </div>
        <div class="tile-body">
          <h${level} class="tile-title"><a href="${product.href}">${escape(product.name)}</a></h${level}>
          <p class="tile-meta meta">${escape(product.meta)}${extra}</p>
          <p class="tile-line">${escape(product.line)}</p>
        </div>
      </article>`;
}

export function renderTiles(work, ids, options) {
  const products = ids.map((id) => {
    const product = work.products.find((entry) => entry.id === id);
    if (!product) throw new Error(`work.json has no product ${id}`);
    return product;
  });
  return `    <div class="work-grid">
${products.map((product, index) => renderTile(work, product, { ...options, eager: options?.eager && index === 0 })).join('\n')}
    </div>`;
}

// A compact list of products with a thumbnail, linking to each product page.
export function renderPicker(work, ids, label) {
  const items = ids
    .map((id) => {
      const product = work.products.find((entry) => entry.id === id);
      const [width, height] = work.sizes.get(product.thumb);
      return `        <li><a href="${product.href}"><span class="picker-thumb picker-thumb--${product.media.kind} plate--${product.plate}"><img src="${MEDIA}/${product.thumb}.webp" width="${width}" height="${height}" alt="" loading="lazy" decoding="async"></span><span><span class="picker-name">${escape(product.name)}</span><span class="picker-line">${escape(product.pickerLine)}</span></span></a></li>`;
    })
    .join('\n');
  return `      <ul class="explorer-picker" role="list" aria-label="${escape(label)}">
${items}
      </ul>`;
}

// The "More work" row at the foot of a product or case page.
export function renderMoreWork(work, currentId) {
  const others = work.products.filter((entry) => entry.id !== currentId).map((entry) => entry.id);
  return `    <nav class="more-work shell" aria-labelledby="more-work-title">
      <div class="section-head"><h2 class="section-title" id="more-work-title">More work</h2><a class="section-link" href="/projects/">All work <span aria-hidden="true">→</span></a></div>
${renderPicker(work, others, 'More work')}
    </nav>`;
}

export function renderOpenSource(work) {
  const rows = work.openSource
    .map(
      (repo) =>
        `        <li class="row"><a class="row-link" href="${escape(repo.href)}"${linkAttrs(repo.href)}><span class="row-title">${escape(repo.name)}</span><span class="row-meta meta">GitHub <span aria-hidden="true">↗</span></span><span class="row-line">${escape(repo.line)}</span></a></li>`,
    )
    .join('\n');
  return `      <ul class="rows rows--compact" role="list">
${rows}
      </ul>`;
}

// Swap the content between <!-- PREFIX:NAME:start --> and <!-- PREFIX:NAME:end -->.
export function injectBlock(html, prefix, name, content, path) {
  const pattern = new RegExp(`<!-- ${prefix}:${name}:start -->[\\s\\S]*?<!-- ${prefix}:${name}:end -->`);
  if (!pattern.test(html)) throw new Error(`${path}: missing marker ${prefix}:${name}`);
  return html.replace(pattern, () => `<!-- ${prefix}:${name}:start -->\n${content}\n<!-- ${prefix}:${name}:end -->`);
}
