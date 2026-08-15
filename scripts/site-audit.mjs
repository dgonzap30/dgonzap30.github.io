import { access, readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_PAGES = [
  'index.html',
  '404.html',
  'work/pazz/index.html',
  'work/lojik/index.html',
];

const REQUIRED_ASSETS = [
  'favicon.svg',
  'assets/css/fonts.css',
  'assets/css/tokens.css',
  'assets/css/base.css',
  'assets/css/components.css',
  'assets/css/pages.css',
  'assets/js/site.js',
  'assets/fonts/instrument-sans-latin.woff2',
  'assets/fonts/newsreader-roman-latin.woff2',
  'assets/fonts/newsreader-italic-latin.woff2',
  'assets/fonts/OFL-Instrument-Sans.txt',
  'assets/fonts/OFL-Newsreader.txt',
  'assets/brand/dgz-trace.svg',
  'assets/brand/dgz-lockup.svg',
  'assets/brand/dgz-compact.svg',
  'assets/brand/dgz-reversed.svg',
  'assets/brand/favicon.svg',
  'assets/brand/favicon-32.png',
  'assets/brand/apple-touch-icon.png',
  'assets/graphics/system-trace.svg',
  'assets/graphics/pazz-handoff.svg',
  'assets/graphics/lojik-evidence.svg',
  'assets/graphics/operating-range.svg',
  'assets/media/diego-headshot.webp',
  'assets/social/home.png',
  'assets/social/pazz.png',
  'assets/social/lojik.png',
];

const BANNED_PHRASES = [
  'student',
  'finishing',
  'incoming',
  'venture studio',
  'rebuilt end to end',
];

const HTML_BUDGET = 75 * 1024;
const SVG_BUDGET = 20 * 1024;
const SCRIPT_BUDGET = 12 * 1024;
const HEADSHOT_BUDGET = 180 * 1024;
const FONT_BUDGET = 160 * 1024;

function matches(html, expression) {
  return [...html.matchAll(expression)];
}

function textContent(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, entity) => ({
      nbsp: ' ',
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
    })[entity.toLowerCase()])
    .replace(/\s+/g, ' ')
    .trim();
}

function auditHeadings(relativePath, html, errors) {
  const h1Count = matches(html, /<h1\b[^>]*>/gi).length;
  if (h1Count !== 1) {
    errors.push(`${relativePath}: expected exactly one h1, found ${h1Count}`);
  }
}

function auditIds(relativePath, html, errors) {
  const seen = new Set();
  for (const match of matches(html, /\bid\s*=\s*["']([^"']+)["']/gi)) {
    const id = match[1];
    if (seen.has(id)) errors.push(`${relativePath}: duplicate id: ${id}`);
    seen.add(id);
  }
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1] ?? null;
}

function localTarget(root, pagePath, reference) {
  const cleanReference = reference.split('#')[0].split('?')[0];
  if (!cleanReference) return null;

  const relativeTarget = cleanReference.startsWith('/')
    ? cleanReference.slice(1)
    : join(dirname(pagePath), cleanReference);
  let absoluteTarget = resolve(root, normalize(relativeTarget));
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (absoluteTarget !== root && !absoluteTarget.startsWith(rootPrefix)) return 'OUTSIDE_ROOT';
  if (cleanReference.endsWith('/') || absoluteTarget === root) absoluteTarget = join(absoluteTarget, 'index.html');
  return absoluteTarget;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function auditLinksAndAssets(root, relativePath, html, errors) {
  const tags = matches(html, /<(?:a|img|script|link)\b[^>]*>/gi).map((match) => match[0]);

  for (const tag of tags) {
    const targetBlank = attribute(tag, 'target')?.toLowerCase() === '_blank';
    if (targetBlank && !attribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('noopener')) {
      errors.push(`${relativePath}: target=_blank link missing noopener`);
    }

    const reference = attribute(tag, 'href') ?? attribute(tag, 'src');
    if (!reference || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(reference)) continue;

    const target = localTarget(root, relativePath, reference);
    if (target === 'OUTSIDE_ROOT') {
      errors.push(`${relativePath}: local reference escapes site root: ${reference}`);
    } else if (target && !(await exists(target))) {
      errors.push(`${relativePath}: missing local asset: ${reference}`);
    }
  }
}

function hasMeta(html, attributeName, value) {
  const tags = matches(html, /<meta\b[^>]*>/gi).map((match) => match[0]);
  return tags.some((tag) => attribute(tag, attributeName)?.toLowerCase() === value.toLowerCase() && attribute(tag, 'content'));
}

function auditMetadata(relativePath, html, errors) {
  if (!/<title>[^<]+<\/title>/i.test(html)) errors.push(`${relativePath}: missing title`);
  if (!hasMeta(html, 'name', 'description')) errors.push(`${relativePath}: missing meta description`);
  if (!/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']https:\/\/[^"']+["'][^>]*>/i.test(html)) {
    errors.push(`${relativePath}: missing absolute canonical url`);
  }
  for (const property of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!hasMeta(html, 'property', property)) errors.push(`${relativePath}: missing ${property}`);
  }
  if (!hasMeta(html, 'name', 'twitter:card')) errors.push(`${relativePath}: missing twitter:card`);
  if (/fonts\.(?:googleapis|gstatic)\.com/i.test(html)) errors.push(`${relativePath}: external font dependency`);
  if (!/href=["']\/assets\/css\/fonts\.css["']/i.test(html)) errors.push(`${relativePath}: missing local font stylesheet`);

  const jsonLdBlocks = matches(
    html,
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!jsonLdBlocks.length) errors.push(`${relativePath}: missing JSON-LD`);
  for (const block of jsonLdBlocks) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON-LD: ${error.message}`);
    }
  }
}

function auditLanguage(relativePath, html, errors) {
  const text = textContent(html).toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    if (text.includes(phrase)) errors.push(`${relativePath}: banned phrase: ${phrase}`);
  }
  if (/\b[A-Z][A-Z0-9_]*_URL\b/.test(html)) {
    errors.push(`${relativePath}: unresolved URL placeholder`);
  }

  if (relativePath === 'index.html') {
    if (!text.includes('technical lead at pazz')) errors.push(`${relativePath}: missing PAZZ Technical Lead positioning`);
    if (!text.includes('co-founder & technical lead')) errors.push(`${relativePath}: missing LOJIK Co-Founder & Technical Lead positioning`);
    if (!text.includes('b.s. computer science') || !text.includes('university of wisconsin–madison')) {
      errors.push(`${relativePath}: missing completed UW–Madison credential`);
    }
  }

  if (relativePath === 'work/pazz/index.html') {
    if (!text.includes('technical lead')) errors.push(`${relativePath}: missing Technical Lead role`);
    if (text.includes('co-founder')) errors.push(`${relativePath}: PAZZ must not claim co-founder role`);
    if (!text.includes('evidence boundary')) errors.push(`${relativePath}: missing evidence boundary`);
  }

  if (relativePath === 'work/lojik/index.html') {
    if (!text.includes('co-founder & technical lead')) errors.push(`${relativePath}: missing Co-Founder & Technical Lead role`);
    if (!text.includes('evidence boundary')) errors.push(`${relativePath}: missing evidence boundary`);
  }
}

function auditBudget(relativePath, byteLength, limit, errors) {
  if (byteLength > limit) {
    errors.push(`${relativePath}: ${byteLength} bytes exceeds ${limit}-byte budget`);
  }
}

async function auditRequiredAssets(root, errors) {
  for (const relativePath of REQUIRED_ASSETS) {
    const absolutePath = join(root, relativePath);
    if (!(await exists(absolutePath))) {
      errors.push(`${relativePath}: missing required asset`);
      continue;
    }

    const { size } = await stat(absolutePath);
    const extension = extname(relativePath).toLowerCase();
    if (extension === '.svg') auditBudget(relativePath, size, SVG_BUDGET, errors);
    if (extension === '.woff2') auditBudget(relativePath, size, FONT_BUDGET, errors);
    if (relativePath === 'assets/js/site.js') auditBudget(relativePath, size, SCRIPT_BUDGET, errors);
    if (relativePath === 'assets/media/diego-headshot.webp') auditBudget(relativePath, size, HEADSHOT_BUDGET, errors);
  }
}

export async function auditSite(rootDir, options = {}) {
  const root = resolve(rootDir);
  const errors = [];
  const pages = [];

  for (const relativePath of REQUIRED_PAGES) {
    const absolutePath = join(root, relativePath);
    let html;
    try {
      html = await readFile(absolutePath, 'utf8');
    } catch {
      errors.push(`${relativePath}: missing required page`);
      continue;
    }

    pages.push(relativePath);
    auditHeadings(relativePath, html, errors);
    auditIds(relativePath, html, errors);
    await auditLinksAndAssets(root, relativePath, html, errors);
    auditMetadata(relativePath, html, errors);
    auditLanguage(relativePath, html, errors);
    auditBudget(relativePath, Buffer.byteLength(html), HTML_BUDGET, errors);
  }

  if (options.requireAssets !== false) await auditRequiredAssets(root, errors);
  return { errors, pages };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = process.argv[2] ?? '.';
  const result = await auditSite(root);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR ${error}`);
    console.error(`Site audit failed with ${result.errors.length} error(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Site audit passed: ${result.pages.length} pages, ${REQUIRED_ASSETS.length} required assets.`);
  }
}
