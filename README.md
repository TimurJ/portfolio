# portfolio

[![CI](https://github.com/TimurJ/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/TimurJ/portfolio/actions/workflows/ci.yml)

Personal portfolio site — a minimalist, static single page, live at [timurjalilov.com](https://timurjalilov.com).

![The portfolio's home screen](docs/screenshot.png)

## Stack

- **[Astro](https://astro.build), static output, no client framework** — everything renders to HTML at build time; a page this size doesn't earn a runtime. Behavior is a handful of vanilla scripts, each colocated with the component whose markup it drives.
- **[Tailwind CSS v4](https://tailwindcss.com)** over a design-token layer — tokens live once in CSS and surface as utilities; responsive tiers follow a single styling policy documented in [docs/architecture.md](docs/architecture.md).
- **TypeScript on Astro's `strictest` preset** — section order, nav targets, and content consts are typed contracts, so a renamed section is a compile error, not a dead link.
- **CI** runs the same gates as `pnpm verify`: formatting, ESLint (with `jsx-a11y`), typecheck, build.

Design fidelity, structure, and the decision record live in the docs:
[architecture](docs/architecture.md) · [design](docs/design.md) · [deploying](docs/deploying.md) · [launch checklist](docs/launch-checklist.md)

## Commands

| Command           | Action                                   |
| :---------------- | :--------------------------------------- |
| `pnpm install`    | Install dependencies                     |
| `pnpm dev`        | Start the dev server at `localhost:4321` |
| `pnpm build`      | Build the production site to `./dist/`   |
| `pnpm preview`    | Preview the production build locally     |
| `pnpm lint`       | Lint with ESLint                         |
| `pnpm typecheck`  | Type-check `.astro`/`.ts` files          |
| `pnpm format`     | Format the codebase with Prettier        |
| `pnpm verify`     | All CI gates: format, lint, types, build |
| `pnpm run deploy` | Build and deploy to Cloudflare Workers   |

Requires Node ≥ 24.16 and pnpm (pinned via the `packageManager` field).

## Deploying

Deploys to Cloudflare Workers as static assets via Workers Builds — see [docs/deploying.md](docs/deploying.md). Pre-launch items are tracked in [docs/launch-checklist.md](docs/launch-checklist.md).

## License

[MIT](LICENSE)
