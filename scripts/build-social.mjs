// Renders the 1200 x 630 social cards in assets/social/ from the site's own
// tokens, fonts and home media. Optional and browser-based, so it is not part
// of `npm run build`: run it after changing a card or the media it shows.
//
//   npm run serve   # in another terminal
//   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs node scripts/build-social.mjs [base-url]
//
// Needs a local Chrome. PLAYWRIGHT_CORE defaults to a resolvable `playwright-core`.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE ?? 'playwright-core');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv[2] ?? 'http://127.0.0.1:4173';
const M = '/assets/media/home';

const style = `
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; background: var(--paper); color: var(--ink); }
  body { display: grid; grid-template-columns: 600px 1fr; font-family: var(--font-sans); }
  .copy { display: flex; flex-direction: column; padding: 64px 0 60px 72px; }
  .brand { display: flex; align-items: center; gap: 14px; font-size: 22px; font-weight: 500; }
  .brand img { width: 40px; height: 40px; }
  h1 { margin-top: auto; font: 400 76px/1.02 var(--font-serif); letter-spacing: -0.02em; }
  h1 em { font-style: italic; }
  p { margin-top: 22px; max-width: 30ch; font-size: 26px; line-height: 1.35; color: var(--ink-2); }
  .dot { color: var(--accent); }
  .nowrap { white-space: nowrap; }
  .h-sm { font-size: 64px; }
  .plate { position: relative; margin: 48px 48px 0 0; border-radius: 22px 22px 0 0; overflow: hidden; background: var(--plate); }
  .phones { position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; gap: 22px; padding-top: 90px; }
  .phones img { width: 232px; border-radius: 26px / 12px; box-shadow: 0 0 0 1px oklch(100% 0 0 / 0.12); }
  .phones img:nth-child(2) { margin-top: 52px; }
  .screen { position: absolute; left: 44px; top: 72px; width: 760px; border-radius: 10px 0 0 0;
    box-shadow: 0 0 0 1px oklch(0% 0 0 / 0.08), 0 30px 60px -30px oklch(0% 0 0 / 0.5); }
`;

const page = (plate, visual, title, line) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/css/fonts.css"><link rel="stylesheet" href="/assets/css/tokens.css">
<style>${style}</style></head><body>
<div class="copy">
  <div class="brand"><img src="/assets/brand/dgz-trace.svg" alt="">Diego González Zapiain</div>
  <h1${title.length > 60 ? ' class="h-sm"' : ''}>${title}</h1>
  <p>${line}</p>
</div>
<div class="plate" style="--plate: var(--plate-${plate})">${visual}</div>
</body></html>`;

const cards = {
  home: page(
    'intertitle',
    `<div class="phones"><img src="${M}/intertitle-tonight.webp" alt=""><img src="${M}/intertitle-film.webp" alt=""></div>`,
    '<span class="nowrap">Founder-engineer</span> in Mexico&nbsp;City<span class="dot">.</span>',
    'Co-founder of Lojik Labs, maker of Intertitle, Technical Lead at PAZZ.',
  ),
  pazz: page(
    'pazz',
    `<img class="screen" src="${M}/pazz-quote.webp" alt="">`,
    'PAZZ Marketplace<span class="dot">.</span>',
    'Technical Lead on the rebuild of a <span class="nowrap">vehicle-leasing</span> platform in Mexico.',
  ),
  lojik: page(
    'lojik',
    `<img class="screen" src="${M}/lojik-site.webp" alt="">`,
    'Lojik Labs<span class="dot">.</span>',
    'Co-Founder &amp; Technical Lead. Workflow software for businesses.',
  ),
};

const browser = await chromium.launch({ channel: 'chrome' });
const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const tab = await context.newPage();
for (const [name, html] of Object.entries(cards)) {
  // Load the site origin first so relative asset URLs and fonts resolve.
  await tab.goto(`${base}/404.html`);
  await tab.setContent(html, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: `${root}/assets/social/${name}.png` });
  console.log(`assets/social/${name}.png`);
}
await browser.close();
