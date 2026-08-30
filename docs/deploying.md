# Deploying

The site deploys to Cloudflare Workers as a static-assets Worker. `wrangler.jsonc` has no `main`, so
there is no Worker script and no server code — Cloudflare serves `./dist` directly, with
`not_found_handling: "404-page"` so an unknown path gets the built 404 page rather than a bare
status.

## Deploys

Every push to `main` that passes CI deploys, from the last step of the `ci` job in
`.github/workflows/ci.yml`. The step is guarded on `github.event_name == 'push' && github.ref ==
'refs/heads/main'`, so pull requests run the gates and skip the deploy.

It runs `pnpm exec wrangler deploy` rather than `cloudflare/wrangler-action`, resolving the version
pinned exactly — not with a caret — in `devDependencies`.

### One-time setup

1. Cloudflare → **Manage Account → API Tokens → Create Token**
   ([direct link](https://dash.cloudflare.com/profile/api-tokens)), using the **Edit Cloudflare
   Workers** template. Narrow the zone policy from _All Domains_ to _Specified Domains →
   timurjalilov.com_; leave the permission groups as the template set them. The one that matters for
   the custom domain is **Workers Routes Write** (under Developer Platform) — attaching a Custom
   Domain creates a DNS record, but it does so through the Workers API, so no DNS permission is
   needed. The OAuth token wrangler uses locally confirms this: it holds `workers_routes (write)` and
   only `zone (read)`, and has attached the domain successfully.
2. GitHub → **Settings → Secrets and variables → Actions**, two repository secrets:
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Those are the names wrangler's CLI reads.

The current token is `portfolio-github-actions`, **expiring 31 August 2027**. When it lapses the
deploy step fails on a `main` push and the live site keeps serving the last deploy — nothing goes
down. Renew by repeating step 1 and re-running `gh secret set CLOUDFLARE_API_TOKEN`.

### CI does not prompt, and that cuts both ways

Wrangler branches on `process.stdout.isTTY`. Without a terminal it skips the conflict changeset and
sets `override_existing_origin` and `override_existing_dns_record` to `true`.

So CI never hangs on a confirmation, and needs no `--yes` flag. It also never asks before repointing
a conflicting Custom Domain or overwriting a conflicting DNS record — the 100117 error under
[Migration notes](#migration-notes-august-2026), which stopped an interactive deploy, would simply
have proceeded. **The `routes` entry in `wrangler.jsonc` is authoritative over the dashboard, so
editing that line is a production DNS change rather than a config tweak.**

### Manual deploy

```sh
pnpm run deploy
```

The escape hatch, not the normal path; it builds and deploys from the working tree, skipping every
gate CI runs. Requires `pnpm exec wrangler login` once. The explicit `run` matters: bare
`pnpm deploy` invokes pnpm's built-in workspace-deploy command, not this script.

If deploying from any build image, note that both `sharp` — which `astro:assets` invokes to generate
the portrait's webp variants — and `wrangler` itself are `devDependencies`. An image that installs
production dependencies only fails at the build step and again at the deploy step.

## The domain

`timurjalilov.com` is registered at GoDaddy and its zone is on Cloudflare; GoDaddy is registrar only.

### Current DNS — three records

| Name                      | Type   | Value                   | Proxy                        |
| :------------------------ | :----- | :---------------------- | :--------------------------- |
| `timurjalilov.com`        | Worker | `portfolio`             | Proxied (Cloudflare-managed) |
| `www.timurjalilov.com`    | CNAME  | `timurjalilov.com`      | Proxied                      |
| `_dmarc.timurjalilov.com` | TXT    | `v=DMARC1; p=reject; …` | DNS only                     |

There are no `MX` records — the domain sends and receives no mail, which is why the DMARC policy can
be `p=reject`.

### `www` is a redirect, not a second custom domain

`www` is a proxied CNAME plus a Redirect Rule (`https://www.*` → `https://${1}`, 301), so the site
has exactly one canonical host — matching the `<link rel="canonical">`, `og:url`, and sitemap `<loc>`
the build emits from `site` in `astro.config.mjs`. A second custom domain would serve the same page
on two hostnames and split them.

One consequence, measured rather than assumed: **that 301 carries none of the `public/_headers`
rules** — no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`. `wrangler.jsonc`
binds one hostname, `timurjalilov.com`; `www` is not in `routes`, so the Worker is not bound to it
and never generates that response. `_headers` is applied by the Worker's asset handler, so it cannot
reach a response the Worker did not produce.

## HSTS

HSTS is configured in the dashboard under **SSL/TLS → Edge Certificates → HTTP Strict Transport
Security**, not in `public/_headers` — see Decisions for why.

Because that makes it the one piece of this setup with no representation in the repo, check it
rather than assume it — this file cannot go stale if it carries its own test:

```sh
curl -sSI https://timurjalilov.com/ | grep -i strict-transport-security
```

No output means HSTS is off. As configured it answers:

```
strict-transport-security: max-age=31536000; includeSubDomains
```

Measured on both the apex 200 and the `www` 301 — so the edge does attach HSTS to a Redirect Rule
response, which is what makes the dashboard the only placement that covers both. Cloudflare's docs
do not state this either way; it is recorded here because it was tested.

Settings:

| Setting                         | Value                            |
| :------------------------------ | :------------------------------- |
| Max Age Header                  | 12 months (Cloudflare's maximum) |
| Apply HSTS policy to subdomains | On                               |
| Preload                         | Off                              |
| No-Sniff Header                 | On                               |

`preload` stays off deliberately: submission is easy and removal takes months of browser release
cycles, which is a poor trade for a personal site. Dropping from Vercel's 24 months to 12 is not a
regression — `max-age` is a sliding window refreshed on every visit, not a countdown.

Before changing any of this, read Cloudflare's warning: with HSTS live, pausing Cloudflare, setting
the record to DNS only, or disabling HTTPS makes the site unreachable until the max-age expires.

## Decisions

Refactors and alternatives considered and deliberately not taken, in the same spirit as
[architecture.md](architecture.md)'s Decisions section.

- **Deploy as a step in the `ci` job, not a `needs: ci` job.** A separate job gets its own green
  check, but jobs do not share a filesystem: it would reinstall dependencies and rebuild to produce
  bytes the `ci` job already has on disk. The `if:` guard gives the same "only from a green main"
  guarantee for free. The cost is that the README's CI badge now means two things — on `main`, gates
  _and_ deploy; on a PR, gates only — so an expired token reddens it for a publishing hiccup. A
  separate job would not fix that (the badge tracks the whole run), and a separate workflow that
  could is an artifact round-trip and a `workflow_run` trigger to disambiguate a badge.
- **HSTS in the dashboard, not `public/_headers`.** `_headers` is applied by the Worker's asset
  handler, and the `www` 301 never reaches the Worker, so a policy set there would cover the apex and
  silently miss the redirect a visitor typing the bare domain hits first. Both halves of that are
  measured: the 301 carries none of the `_headers` rules, and it does carry the dashboard's HSTS.
  Setting it in both places would be worse than either — `_headers` joins duplicate header values
  with a comma, so the browser would receive `max-age=…, max-age=…`.
- **`pnpm exec wrangler deploy` over `cloudflare/wrangler-action`.** Reuses the exactly-pinned
  dependency — the same supply-chain posture as the SHA-pinned actions in the same workflow — and
  adds no third party to the path that holds deploy credentials.
- **Workers Builds disconnected**, not merely declined. Cloudflare's dashboard git integration was
  connected to this repo and showed up as a second required check on pull requests. It deploys on
  push with no reference to CI, so it can ship a commit whose tests failed — and alongside the step
  above it would have deployed every merge twice. The CI step is the one kept because a red test run
  stops it. If it is ever reconnected, remove the deploy step in the same change; two deploy paths
  for one Worker is a race with no owner.
- **`preview_urls: false` is declared, not left to default.** Wrangler derives it independently of
  `workers_dev` and sends `undefined` when the key is absent, so the dashboard's stored value wins —
  and the config schema's advertised `default: false` is not applied by the deploy path. It also
  warns about the mismatch only on a TTY, so CI would never surface it. Each deploy makes a version,
  and with previews on each is reachable at `<version>-portfolio.<subdomain>.workers.dev`; unlike the
  `workers.dev` hostname that URL is version-prefixed and unlinked, so the risk is an unintentionally
  shareable copy rather than a crawlable one.
- **`cancel-in-progress` scoped to `pull_request`** rather than left unconditional, so a second push
  to `main` cannot cancel a deploy in flight. Reasoned beside the YAML it governs, in `ci.yml`.
- **`timeout-minutes: 10` left as-is** despite the job now ending in a production deploy. The ten
  most recent CI runs took 36–72 seconds, so the cap has roughly an 8× margin and the upload is
  0.34 KiB. A slow `pnpm install` or Playwright download trips the timeout well before the deploy
  step starts — a failed check, not a truncated deploy. Raising it would only blunt its real job of
  catching a hang.
- **No `observability` block.** There is no `main` and so no user code, which leaves no invocation
  logs to persist.
- **`compatibility_date` left at `2026-08-16`.** Compatibility flags gate runtime behaviour for
  Worker code; there is none here.

## Migration notes (August 2026)

The domain previously served a React app on Vercel, so this was a live-site replacement rather than
a first launch. Three things from that cutover are worth keeping.

- **Delete the apex `A` record before attaching the custom domain.** Leaving it in place fails the
  deploy outright:

  ```
  ✘ [ERROR] A request to the Cloudflare API failed [code: 100117]
    Hostname 'timurjalilov.com' already has externally managed DNS records (A, CNAME, etc).
    Delete them first or try a different hostname.
  ```

  Cloudflare states the rule as "You cannot create a Custom Domain on a hostname with an existing
  CNAME DNS record". Attaching the domain is what _creates_ the record; it will not take over one
  that is already there.

- **Grey-cloud every record before changing nameservers.** With all records set to DNS only, the
  Cloudflare nameservers returned byte-identical answers to the GoDaddy ones, so there was no window
  in which some resolvers got a working site and others did not. That mattered more than it usually
  would: Vercel was sending `Strict-Transport-Security: max-age=63072000`, which removes any HTTP
  fallback for two years — a broken HTTPS window would have had no graceful degradation at all.

- **Check `dig DS` and `dig DNSKEY` first.** Both were empty here, meaning DNSSEC was off. A signed
  delegation pointing at nameservers that cannot serve the signatures is the one failure mode on a
  nameserver migration that takes the domain down hard rather than degrading.
