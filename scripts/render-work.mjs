// Renderers for the work index, the "More work" table and the open-source
// table, all from assets/data/work.json. Used by build-work.mjs (home and the
// work index) and build-explorer.mjs (the "More work" table on product pages).
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { escape, sectionHead, tableRow } from './site-chrome.mjs';

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
  const projects = JSON.parse(await readFile(join(root, 'assets/data/projects.json'), 'utf8'));
  // Index previews follow the gallery's selected image so a gallery refresh
  // cannot leave an unrelated old thumbnail on the home page.
  work.products = work.products.map((product) => {
    const project = projects.find((entry) => entry.id === product.id);
    const chapter = project?.chapters.find((entry) => entry.id === project.defaultChapter && entry.mediaType === 'image')
      ?? project?.chapters.find((entry) => entry.mediaType === 'image');
    return { ...product, previewSrc: product.previewSrc ?? chapter?.src ?? `${MEDIA}/${product.image}.webp` };
  });
  const sizes = new Map();
  for (const product of work.products) {
    sizes.set(product.id, webpSize(await readFile(join(root, product.previewSrc.slice(1)))));
  }
  return { ...work, sizes };
}

const find = (work, id) => {
  const product = work.products.find((entry) => entry.id === id);
  if (!product) throw new Error(`work.json has no product ${id}`);
  return product;
};

// LOJIK links keep the referrer so its lead attribution files the visit.
const linkAttrs = (href) =>
  /^https:\/\/wearelojik\.com\//.test(href) ? ' target="_blank" rel="noopener"' : ' target="_blank" rel="noopener noreferrer"';

// One row of the index. The name links to the product's page and that link
// covers the row; an outside link (the App Store, the company site) sits on
// top as the row's last column. On a fine pointer the row's image follows the
// pointer as a preview; on touch or narrow screens it shows inline.
function renderRow(work, product, index, { level, long }) {
  const [width, height] = work.sizes.get(product.id);
  const src = product.previewSrc;
  const go = product.go.href
    ? `<a class="row-go" href="${escape(product.go.href)}"${linkAttrs(product.go.href)}>${escape(product.go.label)} <span aria-hidden="true">↗</span></a>`
    : `<span class="row-go" aria-hidden="true">${escape(product.go.label)} →</span>`;
  return `        <li class="row grid" data-preview="${src}" data-kind="${product.kind}">
          <img class="row-img${product.kind === 'phone' ? ' phone' : ''}" src="${src}" width="${width}" height="${height}" alt="" loading="lazy" decoding="async">
          <h${level} class="row-t display"><a class="row-link" href="${product.href}"><span class="row-name" style="view-transition-name: title-${product.id}">${escape(product.name)}</span></a><sup aria-hidden="true">${String(index + 1).padStart(2, '0')}</sup></h${level}>
          <p class="row-r"><b>${escape(product.role)}</b> <span>${escape(long ? product.line : product.short)}</span>${product.mediaNote ? `<small class="row-note">${escape(product.mediaNote)}</small>` : ''}</p>
          ${go}
        </li>`;
}

// The work index: a ruled head, one row per product, and the shared preview.
export function renderIndex(work, ids, { label, level = 3, long = false }) {
  const rows = ids.map((id, index) => renderRow(work, find(work, id), index, { level, long })).join('\n');
  const tag = level > 2 ? `h${level - 1}` : 'p';
  return `      ${sectionHead(`<${tag} class="label">${label} (${ids.length})</${tag}>`, 'Role', '<span>Open</span>')}
      <ol class="index" role="list">
${rows}
      </ol>
      <div class="preview" aria-hidden="true"><img src="${find(work, ids[0]).previewSrc}" alt="" loading="lazy" decoding="async"></div>`;
}

// The "More work" table at the foot of a product or case page.
export function renderMoreWork(work, currentId) {
  const rows = work.products
    .map((product, index) => ({ product, n: String(index + 1).padStart(2, '0') }))
    .filter(({ product }) => product.id !== currentId)
    .map(({ product, n }) => `        ${tableRow({ n, title: product.name, line: escape(product.pickerLine), href: product.href, level: 3 })}`)
    .join('\n');
  return `    <nav class="more wrap" aria-labelledby="more-work-title">
      ${sectionHead('<h2 class="label" id="more-work-title">More work</h2>', '', '<a href="/projects/">All work →</a>')}
      <ol class="table" role="list">
${rows}
      </ol>
    </nav>`;
}

export function renderOpenSource(work, level = 3) {
  const rows = work.openSource
    .map((repo) => `        ${tableRow({ n: '↗', title: repo.name, line: escape(repo.line), href: repo.href, go: '↗', level })}`)
    .join('\n');
  return `      ${sectionHead(`<h${level - 1} class="label" id="oss-title">Open source (${work.openSource.length})</h${level - 1}>`, '', '<a href="https://github.com/dgonzap30" target="_blank" rel="noopener noreferrer">GitHub ↗</a>')}
      <ol class="table" role="list">
${rows}
      </ol>`;
}

// Swap the content between <!-- PREFIX:NAME:start --> and <!-- PREFIX:NAME:end -->.
export function injectBlock(html, prefix, name, content, path) {
  const pattern = new RegExp(`<!-- ${prefix}:${name}:start -->[\\s\\S]*?<!-- ${prefix}:${name}:end -->`);
  if (!pattern.test(html)) throw new Error(`${path}: missing marker ${prefix}:${name}`);
  return html.replace(pattern, () => `<!-- ${prefix}:${name}:start -->\n${content}\n<!-- ${prefix}:${name}:end -->`);
}
