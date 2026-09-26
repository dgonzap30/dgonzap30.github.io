# dgonzap30.github.io

The source for [dgonzap30.github.io](https://dgonzap30.github.io/), the personal site of Diego González Zapiain: founder-engineer in Mexico City, co-founder of Lojik Labs, maker of Intertitle, and Technical Lead at PAZZ.

The site is plain HTML, CSS and SVG with no runtime dependency. Every page reads and works without JavaScript; `assets/js/site.js` only adds previous/next buttons and a counter to product galleries.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Who Diego is, selected work, writing and open source |
| `/projects/` | Every product, with screens from current builds |
| `/work/pazz/`, `/work/lojik/` | Case studies: role, decisions and evidence boundary |
| `/demos/<product>/` | Product pages for Intertitle, Maestro, Temper and Mimo, generated from `projects.json` |
| `/writing/`, `/workflow/` | Posts, the seven-part workflow series, and `/feed.xml` |
| `/now/` | What's being built this month, dated |
| `/thanks/`, `/404.html` | Form confirmation and recovery (both `noindex`) |

## Design system

White paper, neutral ink and one accent, the vermilion dot from the DGZ mark. Each product has its own tinted plate, and every capture rises from the plate's bottom edge. Newsreader sets display type; Instrument Sans sets everything else. Tokens live in `assets/css/tokens.css`, and the contrast pairs are pinned by a test.

## Generated pages

Generated HTML is committed. Rebuild after changing data or shared chrome:

```bash
npm run build
```

| Script | Writes |
| --- | --- |
| `build-chrome.mjs` | Shared head, header and footer into hand-written pages (between `chrome:*` markers) |
| `build-work.mjs` | Work tiles, the "Also building" picker, "More work" and open source from `assets/data/work.json` |
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
- Person, WebSite and Blog JSON-LD share one `@id` graph with Lojik Labs' profile of Diego.
- Keyboard-visible focus, reduced-motion support, and working no-JavaScript navigation.
- HTML under 75 KB per page, SVG under 20 KB, JavaScript under 12 KB, portrait under 180 KB.
- No third-party analytics, trackers, frameworks or runtime dependencies.

## Evidence boundary

PAZZ and Lojik Labs production source remain private. The public case studies describe role, scope, selected decisions, and sanitized system boundaries. They intentionally omit customer and supplier data, credentials, private routes, security details, internal incidents, unfinished work, and commercial metrics without an approved measurement record.

## Deployment

GitHub Pages serves the repository root from the protected `main` branch. The `.nojekyll` marker preserves the static directory structure; publishing requires a reviewed pull request and a live-route verification after merge.

## License

See [LICENSE](./LICENSE).
