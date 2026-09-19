# Timur Jalilov — Portfolio

[![CI](https://github.com/TimurJ/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/TimurJ/portfolio/actions/workflows/ci.yml)

Personal portfolio site — a minimalist static site, one page and a blog, live at [timurjalilov.com](https://timurjalilov.com).

![The portfolio's home screen](docs/screenshot.webp)

## Stack

- **[Astro](https://astro.build), static output, no client framework** — everything renders to HTML at build time; a page this size doesn't earn a runtime. Behavior is a handful of vanilla scripts, each colocated with the component whose markup it drives.
- **[Tailwind CSS v4](https://tailwindcss.com)** over a design-token layer — tokens live once in CSS and surface as utilities; responsive tiers follow a single styling policy documented in [docs/architecture.md](docs/architecture.md).
- **TypeScript on Astro's `strictest` preset** — section order, nav targets, and content consts are typed contracts, so a renamed section is a compile error, not a dead link.
- **CI** runs the same gates as `pnpm verify`: formatting, ESLint (with `jsx-a11y`), typecheck, `node:test` unit tests for the pure helpers, build, and a Playwright smoke suite that boots the built site and scans it with axe in both themes.

Design fidelity, structure, and the decision record live in the docs:
[architecture](docs/architecture.md) · [design](docs/design.md) · [deploying](docs/deploying.md)

## Commands

| Command           | Action                                              |
| :---------------- | :-------------------------------------------------- |
| `pnpm install`    | Install dependencies                                |
| `pnpm dev`        | Start the dev server at `localhost:4321`            |
| `pnpm build`      | Build the production site to `./dist/`              |
| `pnpm preview`    | Preview the production build locally                |
| `pnpm lint`       | Lint with ESLint                                    |
| `pnpm typecheck`  | Type-check `.astro`/`.ts` files                     |
| `pnpm format`     | Format the codebase with Prettier                   |
| `pnpm test:unit`  | `node:test` over the pure helpers in `src/lib`      |
| `pnpm test:e2e`   | Smoke + axe scan over `./dist` (build first)        |
| `pnpm verify`     | All CI gates: format, lint, types, unit, build, e2e |
| `pnpm run deploy` | Manual build and deploy (CI deploys `main`)         |

Requires Node ≥ 24.16 and pnpm (pinned via the `packageManager` field). `pnpm test:e2e` — and so
`pnpm verify` — additionally needs a browser, which `pnpm install` does not fetch: run
`pnpm exec playwright install chromium` once.

## Deploying

Every push to `main` that passes CI deploys to Cloudflare Workers as static assets, from the last
step of the CI job. `pnpm run deploy` is the manual escape hatch — see
[docs/deploying.md](docs/deploying.md) for the domain, DNS, and HSTS setup.

## License

[MIT](LICENSE)
