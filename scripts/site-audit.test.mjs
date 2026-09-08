import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { auditSite } from "./site-audit.mjs";

const REQUIRED_PAGES = [
  "index.html",
  "404.html",
  "work/pazz/index.html",
  "work/lojik/index.html",
  "projects/index.html",
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function pngDimensions(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === "VP8X") {
      const width = 1 + buffer[data + 4] + (buffer[data + 5] << 8) +
        (buffer[data + 6] << 16);
      const height = 1 + buffer[data + 7] + (buffer[data + 8] << 8) +
        (buffer[data + 9] << 16);
      return [width, height];
    }
    if (type === "VP8 ") {
      return [
        buffer.readUInt16LE(data + 6) & 0x3fff,
        buffer.readUInt16LE(data + 8) & 0x3fff,
      ];
    }
    if (type === "VP8L") {
      const bits = buffer.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    offset = data + size + (size % 2);
  }
  throw new Error("WebP dimensions not found");
}

function oklchToLinearRgb([lightness, chroma, hue]) {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
}

function contrastRatio(first, second) {
  const luminance = (color) =>
    0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
  const firstLuminance = luminance(oklchToLinearRgb(first));
  const secondLuminance = luminance(oklchToLinearRgb(second));
  return (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function oklchToken(css, name) {
  const match = css.match(
    new RegExp(`--${name}: oklch\\(([\\d.]+)%\\s+([\\d.]+)\\s+([\\d.]+)\\)`),
  );
  assert(match, `missing oklch token: ${name}`);
  return [Number(match[1]) / 100, Number(match[2]), Number(match[3])];
}

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
  const root = await mkdtemp(join(tmpdir(), "systems-atlas-audit-"));
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

test("reports duplicate ids and multiple h1 elements", async (context) => {
  const root = await fixture(
    '<h1>A</h1><h1 id="same">B</h1><p id="same">C</p>',
  );
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(result.errors.some((error) => error.includes("exactly one h1")));
  assert(result.errors.some((error) => error.includes("duplicate id: same")));
});

test("reports unsafe blank targets and missing local assets", async (context) => {
  const root = await fixture(
    '<h1>A</h1><a target="_blank" href="https://example.com">X</a><img src="missing.svg" alt="">',
  );
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(result.errors.some((error) => error.includes("noopener")));
  assert(result.errors.some((error) => error.includes("missing local asset")));
});

test("reports banned positioning language", async (context) => {
  const root = await fixture("<h1>Student building apps end to end</h1>");
  context.after(() => rm(root, { recursive: true, force: true }));

  const result = await auditSite(root, { requireAssets: false });

  assert(
    result.errors.some((error) => error.includes("banned phrase: student")),
  );
});

test("brand assets are clean, bounded, and path-based", async () => {
  const svgPaths = [
    "assets/brand/dgz-trace.svg",
    "assets/brand/dgz-lockup.svg",
    "assets/brand/dgz-compact.svg",
    "assets/brand/dgz-reversed.svg",
    "assets/brand/favicon.svg",
  ];

  for (const relativePath of svgPaths) {
    const absolutePath = join(repoRoot, relativePath);
    await access(absolutePath);
    const svg = await readFile(absolutePath, "utf8");
    assert.match(svg, /viewBox="[^"]+"/);
    assert.doesNotMatch(svg, /<text\b/i);
    assert.doesNotMatch(svg, /<(?:filter|linearGradient|radialGradient)\b/i);
    assert(Buffer.byteLength(svg) < 20 * 1024, `${relativePath} exceeds 20 KB`);
  }

  const canonical = await readFile(
    join(repoRoot, "assets/brand/dgz-trace.svg"),
    "utf8",
  );
  assert.match(canonical, /data-continuous-route="dgz"/);

  const rootFavicon = await readFile(join(repoRoot, "favicon.svg"), "utf8");
  const brandFavicon = await readFile(
    join(repoRoot, "assets/brand/favicon.svg"),
    "utf8",
  );
  assert.equal(rootFavicon, brandFavicon);
});

test("brand raster fallbacks have exact dimensions", async () => {
  const expected = new Map([
    ["assets/brand/favicon-32.png", [32, 32]],
    ["assets/brand/apple-touch-icon.png", [180, 180]],
  ]);

  for (const [relativePath, dimensions] of expected) {
    const png = await readFile(join(repoRoot, relativePath));
    assert.deepEqual(pngDimensions(png), dimensions);
  }
});

test("graphics are accessible, bounded SVG documents", async () => {
  const graphicPaths = [
    "assets/graphics/system-trace.svg",
    "assets/graphics/pazz-handoff.svg",
    "assets/graphics/lojik-evidence.svg",
    "assets/graphics/operating-range.svg",
  ];

  for (const relativePath of graphicPaths) {
    const svg = await readFile(join(repoRoot, relativePath), "utf8");
    assert.match(svg, /<title\b[^>]*>[^<]+<\/title>/i);
    assert.match(svg, /<desc\b[^>]*>[^<]+<\/desc>/i);
    assert.doesNotMatch(svg, /<(?:filter|linearGradient|radialGradient)\b/i);
    assert(Buffer.byteLength(svg) < 20 * 1024, `${relativePath} exceeds 20 KB`);
  }
});

test("javascript is a small progressive enhancement", async () => {
  const script = await readFile(join(repoRoot, "assets/js/site.js"), "utf8");
  assert(Buffer.byteLength(script) < 12 * 1024, "site.js exceeds 12 KB");
  for (
    const functionName of [
      "motionAllowed",
      "setTraceStage",
      "enhanceTrace",
      "enhanceReveals",
      "enhanceSectionNav",
    ]
  ) {
    assert.match(script, new RegExp(`function ${functionName}\\(`));
  }
  assert.doesNotMatch(script, /\bsetInterval\s*\(/);
  assert.doesNotMatch(script, /\brequestAnimationFrame\s*\(/);
});

test("dark-surface palette maintains WCAG AA contrast", async () => {
  const tokens = await readFile(
    join(repoRoot, "assets/css/tokens.css"),
    "utf8",
  );
  const components = await readFile(
    join(repoRoot, "assets/css/components.css"),
    "utf8",
  );
  const carbon = oklchToken(tokens, "carbon");

  assert(contrastRatio(oklchToken(tokens, "night-soft"), carbon) >= 4.5);
  assert(contrastRatio(oklchToken(tokens, "vermilion-light"), carbon) >= 4.5);
  assert.match(
    components,
    /\.site-footer \.kicker\s*{[^}]*color:\s*var\(--night-soft\)/s,
  );
});

test("fonts are self-hosted, licensed, and bounded", async () => {
  const fontPaths = [
    "assets/fonts/instrument-sans-latin.woff2",
    "assets/fonts/newsreader-roman-latin.woff2",
    "assets/fonts/newsreader-italic-latin.woff2",
  ];

  for (const relativePath of fontPaths) {
    const font = await readFile(join(repoRoot, relativePath));
    assert.equal(font.subarray(0, 4).toString("ascii"), "wOF2");
    assert(font.length < 160 * 1024, `${relativePath} exceeds 160 KB`);
  }

  for (const name of ["OFL-Instrument-Sans.txt", "OFL-Newsreader.txt"]) {
    const license = await readFile(
      join(repoRoot, `assets/fonts/${name}`),
      "utf8",
    );
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
  }

  const fontCss = await readFile(
    join(repoRoot, "assets/css/fonts.css"),
    "utf8",
  );
  assert.match(fontCss, /font-family: "Instrument Sans"/);
  assert.match(fontCss, /font-family: "Newsreader"/);
  assert.doesNotMatch(fontCss, /https?:\/\//);

  for (const relativePath of REQUIRED_PAGES) {
    const html = await readFile(join(repoRoot, relativePath), "utf8");
    assert.match(html, /href="\/assets\/css\/fonts\.css"/);
    assert.doesNotMatch(html, /fonts\.(?:googleapis|gstatic)\.com/);
  }
});

test("case studies preserve role and evidence boundaries", async () => {
  const pazz = (await readFile(join(repoRoot, "work/pazz/index.html"), "utf8"))
    .toLowerCase();
  const lojik =
    (await readFile(join(repoRoot, "work/lojik/index.html"), "utf8"))
      .toLowerCase();

  assert.match(pazz, /technical lead/);
  assert.doesNotMatch(pazz, /co-founder/);
  assert.match(pazz, /evidence boundary/);
  assert.match(pazz, /private commercial platform/);

  assert.match(lojik, /co-founder &amp; technical lead/);
  assert.match(lojik, /evidence boundary/);
  assert.match(lojik, /company-building and systems-design case study/);

  for (const html of [pazz, lojik]) {
    assert.doesNotMatch(html, /\b\d+(?:\.\d+)?%\b/);
    assert.doesNotMatch(html, /\$\s?\d/);
  }
});

test("media and social cards meet publication dimensions and budgets", async () => {
  const headshotPath = join(repoRoot, "assets/media/diego-headshot.webp");
  const headshot = await readFile(headshotPath);
  assert.deepEqual(webpDimensions(headshot), [460, 460]);
  assert(
    (await stat(headshotPath)).size < 180 * 1024,
    "headshot exceeds 180 KB",
  );

  for (const name of ["home", "pazz", "lojik"]) {
    const png = await readFile(join(repoRoot, `assets/social/${name}.png`));
    assert.deepEqual(
      pngDimensions(png),
      [1200, 630],
      `${name} social card has incorrect dimensions`,
    );
  }
});

test("project registry and rendered directory stay in sync", async () => {
  const registry = JSON.parse(
    await readFile(join(repoRoot, "assets/data/projects.json"), "utf8"),
  );
  const directory = await readFile(
    join(repoRoot, "projects/index.html"),
    "utf8",
  );
  const renderedIds = [
    ...directory.matchAll(/<article id="([^"]+)" class="(?:curated-card|curated-code-proof)/g),
  ].map((match) => match[1]);

  assert.equal(
    new Set(registry.map((project) => project.id)).size,
    registry.length,
    "registry ids must be unique",
  );
  assert.deepEqual(
    new Set(renderedIds),
    new Set(registry.map((project) => project.id)),
  );
  for (const project of registry) {
    const card = directory.match(
      new RegExp(`<article\\s+id="${project.id}"[\\s\\S]*?<\\/article>`),
    )?.[0] ?? "";
    const normalizedCard = card.replace(/&amp;/g, "&").replace(/&rsquo;/g, "’").replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    assert(
      normalizedCard.includes(project.name),
      `${project.id} is missing its registry name`,
    );
    assert(
      normalizedCard.includes(project.description),
      `${project.id} is missing its registry description`,
    );
    assert(
      normalizedCard.includes(project.stage),
      `${project.id} is missing its registry stage`,
    );
  }
  assert.deepEqual(
    renderedIds,
    ["neopazz", "lojik", "intertitle", "uno-tally", "reading-list", "brainkit"],
  );
});
