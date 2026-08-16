# Launch checklist

Items deliberately deferred from the post-scaffold audit (2026-08-16), with the trigger for doing each. Nothing here is forgotten — it's waiting on the page build or the production domain.

## When the production domain is decided

- **Set `site` in `astro.config.mjs`** (e.g. `site: "https://example.com"`). It drives canonical URLs, Open Graph URLs, and sitemap/RSS entries via `Astro.site`. Deliberately unset for now: a wrong host (such as a temporary workers.dev URL) baked into canonical links is worse than none.

## With the page build

- **Add `@astrojs/sitemap` and `public/robots.txt`** — both depend on `site` being set.
- **Add a 404 page** (`src/pages/404.astro`) and set `"not_found_handling": "404-page"` in the `assets` block of `wrangler.jsonc`.
- **Replace the placeholder `<title>Astro</title>` / `<h1>`** in `src/pages/index.astro` and add a meta description. Do not deploy before this.
- **Review font preloads**: all four Archivo weights (400/500/600/800) are currently loaded with `preload` on the `<Font>` component. Once the real page exists, preload only the weights used above the fold.

## When upstream allows

- **TypeScript 7**: currently out of range — `@astrojs/check` declares peer support for `^5 || ^6` only. Bump when its peer range admits `^7`.
