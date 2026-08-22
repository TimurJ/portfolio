# Deploying

The site deploys to Cloudflare Workers as a static-assets Worker — no adapter, no server code. `wrangler.jsonc` points Cloudflare at the `./dist` build output.

## Automatic deploys (Workers Builds)

One-time setup in the Cloudflare dashboard:

1. **Workers & Pages → Create → Connect to Git** and pick the `TimurJ/portfolio` repo.
2. Build settings:
   - **Build command:** `pnpm build`
   - **Deploy command:** `pnpm exec wrangler deploy` (runs after install, so it
     resolves the wrangler version pinned in `devDependencies` — same
     supply-chain posture as the SHA-pinned CI actions)
3. Workers Builds detects pnpm from `pnpm-lock.yaml` and uses the version pinned in the `packageManager` field of package.json.

After that, every push to `main` deploys to production, and non-production branches get preview URLs on their builds.

## Manual deploy

```sh
pnpm run deploy
```

(Requires `wrangler login` the first time. The explicit `run` matters: bare
`pnpm deploy` invokes pnpm's built-in workspace-deploy command, not this
script.)
