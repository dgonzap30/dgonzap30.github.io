import assert from 'node:assert/strict';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { auditSite } from './site-audit.mjs';

const REQUIRED_PAGES = [
  'index.html',
  '404.html',
  'work/pazz/index.html',
  'work/lojik/index.html',
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const validHead = `
  <meta name="description" content="A useful description">
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="Example">
  <meta property="og:description" content="A useful description">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:image" content="https://example.com/social.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person"}</script>
`;

async function fixture(body) {
  const root = await mkdtemp(join(tmpdir(), 'systems-atlas-audit-'));
  for (const relativePath of REQUIRED_PAGES) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(
      absolutePath,
      `<!doctype html><html lang="en"><head><title>Example</title>${validHead}</head><body>${body}</body></html>`,
    );
  }
  return root;
}

test('reports duplicate ids and multiple h1 elements', async (context) => {
  const root = await fixture('<h1>A</h1><h1 id="same">B</h1><p id="same">C</p>');
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(result.errors.some((error) => error.includes('exactly one h1')));
  assert(result.errors.some((error) => error.includes('duplicate id: same')));
});

test('reports unsafe blank targets and missing local assets', async (context) => {
  const root = await fixture(
    '<h1>A</h1><a target="_blank" href="https://example.com">X</a><img src="missing.svg" alt="">',
  );
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(result.errors.some((error) => error.includes('noopener')));
  assert(result.errors.some((error) => error.includes('missing local asset')));
});

test('reports banned positioning language', async (context) => {
  const root = await fixture('<h1>Student building apps end to end</h1>');
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(result.errors.some((error) => error.includes('banned phrase: student')));
});

test('brand assets are clean, bounded, and path-based', async () => {
  const svgPaths = [
    'assets/brand/dgz-trace.svg',
    'assets/brand/dgz-lockup.svg',
    'assets/brand/dgz-compact.svg',
    'assets/brand/dgz-reversed.svg',
    'assets/brand/favicon.svg',
  ];

  for (const relativePath of svgPaths) {
    const absolutePath = join(repoRoot, relativePath);
    await access(absolutePath);
    const svg = await readFile(absolutePath, 'utf8');
    assert.match(svg, /viewBox="[^"]+"/);
    assert.doesNotMatch(svg, /<text\b/i);
    assert.doesNotMatch(svg, /<(?:filter|linearGradient|radialGradient)\b/i);
    assert(Buffer.byteLength(svg) < 20 * 1024, `${relativePath} exceeds 20 KB`);
  }

  const canonical = await readFile(join(repoRoot, 'assets/brand/dgz-trace.svg'), 'utf8');
  assert.match(canonical, /data-continuous-route="dgz"/);
});

test('brand raster fallbacks have exact dimensions', async () => {
  const expected = new Map([
    ['assets/brand/favicon-32.png', [32, 32]],
    ['assets/brand/apple-touch-icon.png', [180, 180]],
  ]);

  for (const [relativePath, dimensions] of expected) {
    const png = await readFile(join(repoRoot, relativePath));
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], dimensions);
  }
});
