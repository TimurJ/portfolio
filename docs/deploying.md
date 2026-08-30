# Deploying

The site deploys to Cloudflare Workers as a static-assets Worker — no adapter, no server code. `wrangler.jsonc` points Cloudflare at the `./dist` build output.

## Custom domain cutover

`wrangler.jsonc` declares no route on purpose: the domain is not on the Cloudflare account yet, and a
route naming a zone that doesn't exist fails the deploy. So the first deploy lands on
`portfolio.<subdomain>.workers.dev`, which is where to verify it. Two things are true while it stays
that way:

- `workers_dev` defaults to `true` **because** `routes` is empty — wrangler resolves
  `config.workers_dev ?? (routes.length === 0)` — so the site is publicly reachable there.
- Every absolute URL the build emits already points at `https://timurjalilov.com`, derived from
  `site` in `astro.config.mjs`: the canonical tag, `og:url`, `og:image`, the `Sitemap:` line in
  `robots.txt`, and the sitemap's own `<loc>`. The workers.dev copy is therefore an indexable
  duplicate whose every tag points somewhere else.

One edit closes both. Once the domain is registered and its zone is active on the account, add to
`wrangler.jsonc` and redeploy:

```jsonc
"routes": [{ "pattern": "timurjalilov.com", "custom_domain": true }],
"workers_dev": false,
```

The route attaches the domain on deploy, so the binding is in the repo rather than only in the
dashboard; `workers_dev: false` retires the duplicate.

Two things have no repo-side equivalent and stay dashboard-only:

- **HSTS.** Cloudflare does not send `Strict-Transport-Security` by default; enable it under
  SSL/TLS → Edge Certificates once the domain serves over HTTPS. It could go in `public/_headers`
  instead, but a `max-age` committed to git is much harder to back out of than a toggle.
- **`www`.** Nothing currently answers on `www.timurjalilov.com`. If it should, that needs a second
  custom domain plus a redirect rule — a `_redirects` file cannot help with a hostname that never
  reaches the Worker.

## Automatic deploys (Workers Builds)

One-time setup in the Cloudflare dashboard:

1. **Workers & Pages → Create → Connect to Git** and pick the `TimurJ/portfolio` repo.
2. Build settings:
   - **Build command:** `pnpm build`
   - **Deploy command:** `pnpm exec wrangler deploy` (runs after install, so it
     resolves the wrangler version pinned in `devDependencies` — same
     supply-chain posture as the SHA-pinned CI actions)
3. Workers Builds detects pnpm from `pnpm-lock.yaml` and uses the version pinned in the `packageManager` field of package.json.

Worth checking on the first remote build: both `sharp` (which `astro:assets` invokes to generate the
portrait's webp variants) and `wrangler` itself are `devDependencies`, so a build image that installs
production dependencies only would fail at the build step and again at the deploy step.

After that, every push to `main` deploys to production, and non-production branches get preview URLs on their builds.

## Manual deploy

```sh
pnpm run deploy
```

(Requires `wrangler login` the first time. The explicit `run` matters: bare
`pnpm deploy` invokes pnpm's built-in workspace-deploy command, not this
script.)
