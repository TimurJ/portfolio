# portfolio

Personal portfolio site — a minimalist, static single page built with [Astro](https://astro.build). Design and style tokens come from a custom design — see [docs/design.md](docs/design.md). Project structure, styling policy, and the decision record live in [docs/architecture.md](docs/architecture.md).

## Commands

| Command        | Action                                   |
| :------------- | :--------------------------------------- |
| `pnpm install` | Install dependencies                     |
| `pnpm dev`     | Start the dev server at `localhost:4321` |
| `pnpm build`   | Build the production site to `./dist/`   |
| `pnpm preview` | Preview the production build locally     |
| `pnpm check`   | Type-check `.astro`/`.ts` files          |
| `pnpm format`  | Format the codebase with Prettier        |

Requires Node ≥ 22.12 and pnpm (pinned via the `packageManager` field).

## Deploying

Deploys to Cloudflare Workers as static assets via Workers Builds — see [docs/deploying.md](docs/deploying.md). Pre-launch items are tracked in [docs/launch-checklist.md](docs/launch-checklist.md).
