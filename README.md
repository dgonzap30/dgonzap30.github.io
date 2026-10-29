# dgonzap30.github.io

The source for [dgonzap30.github.io](https://dgonzap30.github.io/), the personal site of Diego González Zapiain: founder-engineer in Mexico City, co-founder of LOJIK, maker of Intertitle, and Technical Lead at PAZZ.

The site is plain HTML, CSS and SVG with no runtime dependency. Every page reads and works without JavaScript; `assets/js/site.js` only keeps the bar's clock current, adds previous/next buttons and a counter to product galleries, and shows a work row's preview beside the pointer.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Who Diego is, selected work, writing and open source |
| `/projects/` | Current products, dated app captures and labeled design work |
| `/work/pazz/`, `/work/lojik/` | Case studies: role, decisions and evidence boundary |
| `/demos/<product>/` | Product pages generated from `projects.json`, including Pocket, Dicta, DreamMe, Ledger and Rundown |
| `/writing/`, `/workflow/` | Posts, the seven-part workflow series, and `/feed.xml` |
| `/now/` | What's being built this month, dated |
| `/links/` | One-column link hub for profile bios (`noindex`) |
| `/thanks/`, `/404.html` | Form confirmation and recovery (both `noindex`) |

## Design system

An index on paper: warm white ground, near-black ink, two greys, hairline rules and one green that only marks proof (a verified date). Everything sits on a twelve-column grid with an 8px spacing scale. General Sans sets display type at size; Inter sets text at 13, 14 and 17px; mono is for code only. Tokens live in `assets/css/tokens.css`, and the contrast pairs are pinned by a test.

General Sans ships as the foundry's unmodified OpenType files under the ITF Free Font License (`assets/fonts/LICENSE-FFL.txt`); the FFL forbids converting or subsetting them, and a test pins their hashes. Inter ships under the SIL Open Font License (`assets/fonts/OFL-Inter.txt`). No font service is used.

Motion stays in CSS: the home name rises in place, sections enter as they scroll into view, and pages morph into each other with cross-document view transitions. A work row's preview follows deliberate pointer movement and clears on scrolling or keyboard navigation; other rows keep their contrast. Reduced motion disables animation, and every page works without JavaScript.

## Generated pages

Generated HTML is committed. Rebuild after changing data or shared chrome:

```bash
npm run build
```

| Script | Writes |
| --- | --- |
| `build-chrome.mjs` | Shared head, header and footer into hand-written pages (between `chrome:*` markers) |
| `build-work.mjs` | The work index, "More work" and open source from `assets/data/work.json` |
| `build-explorer.mjs` | `/demos/<product>/` pages and the PAZZ gallery from `assets/data/projects.json` |
| `build-writing.mjs` | `/writing/`, `/feed.xml` and the home writing rows from `assets/data/writing.json` |
| `build-workflow-pages.mjs` | `/workflow/` from `assets/data/workflow.json` |
| `build-sitemap.mjs` | `/sitemap.xml` from every indexable route |

Social cards (`assets/social/*.png`, 1200 × 630) come from `scripts/build-social.mjs`, which renders them in Chrome from the same tokens and media. It needs a browser, so it isn't part of `npm run build`; see the comment at the top of the script.

## Local verification

Node.js and Python 3 are the only requirements.

```bash
npm test        # contract tests: pages, registry, galleries, forms, media, contrast
npm run check   # audit: metadata, JSON-LD, links, headings, IDs, banned phrases, size budgets
npm run serve   # http://127.0.0.1:4173 for browser QA
```

## Publication standards

- One `h1` per route, a unique title and description, an absolute canonical, and Open Graph and Twitter metadata.
- Person, WebSite and Blog JSON-LD share one `@id` graph with LOJIK's profile of Diego.
- Keyboard-visible focus, reduced-motion support, and working no-JavaScript navigation.
- HTML under 75 KB per page, SVG under 20 KB, JavaScript under 12 KB, portrait under 180 KB.
- No third-party analytics, trackers, frameworks or runtime dependencies.

## Evidence boundary

PAZZ and LOJIK production source remain private. The public case studies describe role, scope, selected decisions, and sanitized system boundaries. They intentionally omit customer and supplier data, credentials, private routes, security details, internal incidents, unfinished work, and commercial metrics without an approved measurement record.

## Deployment

GitHub Pages serves the repository root from the protected `main` branch. The `.nojekyll` marker preserves the static directory structure; publishing requires a reviewed pull request and a live-route verification after merge.

## License

See [LICENSE](./LICENSE).
