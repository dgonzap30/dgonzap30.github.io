# Systems Atlas

The source for [dgonzap30.github.io](https://dgonzap30.github.io/), Diego Gonzalez Zapiain's public engineering portfolio.

Systems Atlas is a dependency-free, progressively enhanced field guide to current technical leadership. It centers two active systems—PAZZ Marketplace and LOJIK Labs—and makes the operating decisions behind the work inspectable without publishing private product source, customer data, or internal topology.

## Routes

| Route                                                                        | Purpose                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/`                                                                          | Current work, operating method, selected public engineering, and profile                 |
| `/work/pazz/`                                                                | PAZZ technical-lead case study and sanitized marketplace handoff model                   |
| `/work/lojik/`                                                               | LOJIK company-building and accountable-delivery case study                               |
| `/projects/`                                                                 | A concise selection of public products, personal tools, and code                         |
| `/demos/mimo/`                                                               | Local Mimo interaction rehearsal with a descriptive transcript                           |
| `/demos/intertitle/`, `/demos/fcc/`, `/demos/temper/`, `/demos/season-room/` | Captured product or fixture walkthroughs; all steps remain visible without JavaScript    |
| `/demos/maestro/`                                                            | Real local Maestro application recording with synthetic telemetry, plus a spectrum still |
| `/404.html`                                                                  | Branded recovery state for unresolved routes                                             |

## Architecture

The site intentionally ships as plain HTML, CSS, JavaScript, and SVG. Its semantic content and navigation work without JavaScript; the script adds trace interaction, active-section navigation, and reveal behavior where motion preferences permit it.

Demo recordings use native, user-controlled video with metadata preload and descriptive text. Captured walkthrough controls only navigate recorded images; they do not simulate private backend behavior. Each route names its evidence form and the boundary of what it proves.

```text
assets/
├── brand/      DGZ Trace Mark, lockups, and icons
├── css/        Tokens, foundations, components, and page layouts
├── fonts/      Self-hosted OFL typefaces and license texts
├── graphics/   Sanitized system diagrams
├── js/         Progressive interaction layer
├── media/      Optimized public portrait
└── social/     Editable SVG sources and 1200 × 630 social cards
scripts/
├── site-audit.mjs       Publication audit
└── site-audit.test.mjs  Contract tests for pages, assets, and media
work/
├── lojik/      LOJIK case study
└── pazz/       PAZZ case study
```

## Local verification

Node.js and Python 3 are the only local requirements.

```bash
npm test
npm run check
npm run serve
```

- `npm test` verifies the audit contract, image dimensions, and publication assets.
- `npm run check` audits routes, metadata, JSON-LD, links, headings, IDs, language boundaries, and static performance budgets.
- `npm run serve` exposes the site at `http://127.0.0.1:4173` for browser QA.

## Publication standards

- Exactly one `h1` per route and semantic source order before styling.
- Keyboard-visible focus, reduced-motion support, and functional no-JavaScript navigation.
- HTML under 75 KB per page, SVG under 20 KB per asset, JavaScript under 12 KB, and the portrait under 180 KB.
- Social images at 1200 × 630 with editable SVG sources committed beside them.
- No third-party analytics, trackers, frameworks, build pipeline, or runtime dependency.

## Evidence boundary

PAZZ and LOJIK production source remain private. The public case studies describe role, scope, selected decisions, and sanitized system boundaries. They intentionally omit customer and supplier data, credentials, private routes, security details, internal incidents, unfinished work, and commercial metrics without an approved measurement record.

## Deployment

GitHub Pages serves the repository root from the protected `main` branch. The `.nojekyll` marker preserves the static directory structure; publishing requires a reviewed pull request and a live-route verification after merge.

## License

See [LICENSE](./LICENSE).
