## Development

When starting the dev server, use background mode:

```
pnpm exec astro dev --background
```

Manage the background server with `pnpm exec astro dev stop`, `pnpm exec astro dev status`, and
`pnpm exec astro dev logs`. (`astro` is not on `PATH` — it resolves through pnpm.)

## Gates

`pnpm verify` must pass before anything is considered done: format check, ESLint, typecheck, build,
then the Playwright smoke and axe suite. `pnpm test:e2e` needs a browser that `pnpm install` does
not fetch — run `pnpm exec playwright install chromium` once.

## Styling policy

The invariant that governs every component is at `docs/architecture.md:56`: markup carries only
width-invariant utilities, and anything that changes across tiers lives in a scoped `<style>`.
Tier rules name the tier in a comment (`900/700 = tablet/phone`) rather than spelling
`--breakpoint-*`, which Tailwind's scanner would emit as a dead token.

## Documentation

`docs/architecture.md` documents the project structure — update it in the same PR as any change to
component boundaries, styling policy, or client scripts. Its Decisions section records refactors
deliberately _not_ taken; read it before proposing one. `docs/design.md` records the design source
and its token and type system, and names the deviations from it; the reasoning behind each one lives
in architecture.md's Decisions, so the two are read together rather than either being complete alone.
