# Launch checklist

Items deliberately deferred from the post-scaffold audit (2026-08-16), with the trigger for doing each. Nothing here is forgotten — it's waiting on the page build or the production domain.

## Production domain

Decided: **https://timurjalilov.com** (registered at GoDaddy; currently pointing at the old Vercel portfolio, which stays live until cutover). `site` is set in `astro.config.mjs`; it's inert build metadata and does not affect DNS or the old site.

## With the remaining page build

- **Add `@astrojs/sitemap` and `public/robots.txt`** — `site` is already set, so these can land with any section PR; latest by launch.
- **Add a 404 page** (`src/pages/404.astro`) and set `"not_found_handling": "404-page"` in the `assets` block of `wrangler.jsonc`.
- **Add an `og:image` social card** — `Base.astro` ships `og:title/description/url/type` and `twitter:card: summary`, but no image yet; design a social card (or crop the portrait), drop it in `public/`, and add `og:image` + switch the card type if it warrants `summary_large_image`.
- **Review font weights**: all four Archivo weights (400/500/600/800) are configured, but the Home section uses only 400 — the `<Font>` component already preloads just `weight: 400`, and unused weights are only fetched if a rule references them. Once all sections are built, drop weights nothing uses and extend the preload filter to whatever is above the fold.

## Domain cutover (after the new site is deployed and verified)

None of this lives in the repo; it retires the old Vercel portfolio, so do it last.

1. **Deploy and verify** the new site on its `portfolio.<account>.workers.dev` URL. Canonical tags pointing at timurjalilov.com from the preview URL are correct, not a problem.
2. **Move DNS to Cloudflare**: add timurjalilov.com as a site in the Cloudflare account (free plan), let it import the existing DNS records, then switch the nameservers at GoDaddy to Cloudflare's. The imported records still point at Vercel, so the old site keeps serving through propagation.
3. **Attach the custom domain to the Worker** (Worker settings → custom domains → timurjalilov.com). Cloudflare creates the DNS record and certificate; this is the moment traffic flips to the new site. Reversible by deleting the custom domain.

Steps 2–3 can wait any amount of time after the deploy with no downside.

## When upstream allows

- **TypeScript 7**: currently out of range — `@astrojs/check` declares peer support for `^5 || ^6` only. Bump when its peer range admits `^7`.
