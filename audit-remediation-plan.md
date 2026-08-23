# Full project audit — findings and remediation roadmap

## Context

All page sections are built. The repo is a public interview artifact meant to read as Senior/Tech Lead work, so this audit covered architecture, clean code, and general practice across config/toolchain, `src/`, content, assets, SEO, testing, and git hygiene.

**Key discovery: the audit baseline is `feat/contact-section`, not `main`.** That branch (5 commits, pushed) already fixes a large share of what an audit of `main` would flag: ESLint + jsx-a11y + Tailwind class sorting, security headers, LICENSE/README/package metadata, `.gitignore` (`.wrangler/`, `.playwright-mcp/`, `.env*.local`, `.claude/`), CI `permissions`/`concurrency`/`timeout`, pinned wrangler behind a `deploy` script, nav single-sourced in `lib/nav.ts` with typed `SectionId`, the `#contact` dead link (Contact section now exists), the theme-toggle accessible name, the theme-fade magic number (now `--theme-fade` token), the dead `--img` token, blog `cursor-pointer`, and icon-attr dedup. All findings below are **against the branch tip** and assume it merges first.

User decisions already made: minimal Playwright smoke + axe suite (yes); blog placeholder posts stay as-is; dedup goes shell + dot-label + type tokens.

## Prerequisite (user's job — git is not mine)

- Merge `feat/contact-section` into `main`. Everything below branches from the merged main, one PR-sized step at a time (build → verify → stop; user handles branch/commit/push/PR).
- Optional repo hygiene while there: delete the 11 already-merged local+remote branches; check `main` branch protection requires the CI check.

## Remediation roadmap (PR-sized steps, in order)

### PR 1 — Toolchain and docs polish (small, pure config)

- `tsconfig.json`: delete `include`/`exclude` — `astro/tsconfigs/base` already ships both with `${configDir}` (verified in `node_modules`); the local override drops `${configDir}` and, because an explicit `exclude` replaces TS's defaults, stops excluding `node_modules`.
- `.editorconfig`: add `[*.md] trim_trailing_whitespace = false` (two-space hard breaks).
- `.vscode/settings.json`: set Prettier as default formatter + format-on-save, completing the half-wired `extensions.json` recommendation.
- `.github/dependabot.yml`: weekly `github-actions` + `npm` update PRs — the SHA-pinned actions rot silently without it.
- `AGENTS.md`: prune the scaffold doc-links block (routing/middleware, framework components, i18n, content collections — none used; content collections explicitly deferred).
- `docs/design.md`: remove/replace the private `claude.ai` project link (unreachable for public readers).

### PR 2 — Favicon and head identity (highest visibility-to-effort)

- Replace stock Astro `public/favicon.svg`/`favicon.ico` with a simple "TJ" monogram in the site's ink/accent palette (both themes via `prefers-color-scheme` in the SVG). This is the single most visible scaffold leftover — a portfolio tab showing the Astro logo.
- Add `apple-touch-icon`, `theme-color` meta (both themes), `og:site_name`, and a JSON-LD `Person` block in `Base.astro` (name/url/jobTitle/sameAs from `lib/site.ts` — extend it with name/title/socials, which also consolidates the identity strings currently scattered across `index.astro` and `Hero.astro`).

### PR 3 — Launch-checklist items whose trigger has arrived

Per `docs/launch-checklist.md`, "can land with any section PR; latest by launch" — sections are done:

- `pnpm astro add sitemap` (`site` already set) + `public/robots.txt` referencing `/sitemap-index.xml` (per current Astro sitemap docs).
- `src/pages/404.astro` (uses `Base` + existing tokens) and `"not_found_handling": "404-page"` in `wrangler.jsonc`'s assets block.
- Tick these off in the checklist.

### PR 4 — Section dedup: shell, dot-label, type tokens

Duplication is now proven per the repo's own extraction rule (`docs/architecture.md`):

- Extract `Section.astro`: the shared `<section id class="mx-auto flex section-screen max-w-page flex-col">` → `SectionIntro` → `section-list` slot → `section-cue`/`ScrollCue` shell duplicated verbatim in `Experience.astro` and `Blog.astro` (intro props + `nextHref` + default slot; cue wrapper class passthrough for `.exp-cue`).
- Extract `DotLabel.astro`: the dot-and-label span duplicated at `Blog.astro`, `Experience.astro`, and (size-variant) `SectionIntro.astro`.
- Add type tokens to the `@theme` block in `global.css`: `--text-meta: 13px` (6 markup uses), `--text-body: 15px` (3 scoped uses), consumed as `text-meta` etc.; keeps the token layer single-source like color/breakpoints already are.
- Collapse the accent-underline CTA idiom (`border-b border-accent-text/40 pb-0.5 text-meta text-accent-text`) — a shared class or component alongside `BookCallCta`.
- Drop the 4× copy-pasted tier-legend comment and 3× `nextHref` JSDoc into the shared components.
- Update `docs/architecture.md` (same PR, per its own contract): component list, extraction rationale.

### PR 5 — Styling-policy reconciliation

`docs/architecture.md`'s stated invariant ("markup classes are width-invariant; tier-dependent properties live in scoped styles") is violated by `Header.astro` (responsive padding/gap/text utilities in markup, incl. the undocumented stacked `phone:max-tablet:` range variant), `ThemeToggle.astro`, and the `BookCallCta` call site. Recommended: move the header's tier-dependent declarations into its scoped `<style>` to match every section component, and note in the doc that named variants remain for one-off width-invariant toggles (`sr-only`, `flex-nowrap`). (Alternative — amending the doc to carve out chrome components — is weaker: two policies is the smell.)

### PR 6 — A11y and script robustness

- Name the section landmarks: `aria-labelledby` pointing at each `SectionIntro` `<h2>` (id prop threaded through), so sections are navigable regions.
- Skip link to `<main>` in `Base.astro` (standard expectation with a sticky nav).
- `Hero.astro` portrait alt: descriptive (e.g. "Portrait of Timur Jalilov") or `alt=""` — currently duplicates the adjacent `<h1>`.
- System theme default: when no stored choice, respect `prefers-color-scheme` in the `Base.astro` pre-paint script (dark-OS visitors currently always get light); extract shared `readTheme()`/`writeTheme()` into `lib/theme.ts` (the try/catch storage logic is duplicated in `Base.astro` and `ThemeToggle.astro`, with a writer/reader asymmetry). Behavior change — document in the Decisions section.
- Experience read-more progressive enhancement: the phone-tier clamp is CSS-only while expansion is JS-only, so with scripts blocked the content is unreachable; apply the clamp class from the script (or equivalent) so no-JS degrades to fully expanded text.
- Header nav lock: name the `900` ms constant with a comment that it's an upper-bound guess on non-author-controllable smooth-scroll duration; initialize `lockTimeout`/`switchTimeout` as `| undefined` (used-before-assignment under strictest).
- `Hero.astro`: derive the rail year at build time like the footer © year already does (hardcoded 2026 goes stale; also makes the two consistent).

### PR 7 — Playwright smoke + axe suite (user-approved)

- `pnpm create playwright` baseline trimmed to one project (chromium); config per current Astro testing docs: `webServer: { command: 'pnpm preview', url: 'http://localhost:4321/' }`, `reuseExistingServer: !process.env.CI`.
- One spec file, ~5 tests: page loads with zero console errors; theme toggle flips `data-theme` and persists across reload; anchor nav sets `aria-current="location"`; phone-viewport read-more expands (`aria-expanded`); `@axe-core/playwright` `AxeBuilder` scan with no violations (both themes).
- Add `test:e2e` script; append to `verify`; CI step after build (install chromium with `--with-deps`, cache browsers). Update the "No test suite" Decisions entry — the stance becomes "smoke + a11y gate, unit suites deferred until real logic exists".

### PR 8 — Asset and CSS pruning

- Drop unused Archivo weights 500/600/800 from the `<Font>` config (markup is `font-normal` throughout; checklist trigger "once all sections are built" has passed) — removes 6 dead `@font-face` blocks per page.
- Recompress `src/assets/portrait-bw.png` (1.28 MB source PNG → ~200 KB lossless-visual WebP/JPEG source; emitted variants unchanged) and `docs/screenshot.png` (295 KB → WebP/JPEG).
- Tick the font-weight checklist item.

## Explicitly not doing (decided or defensible-as-documented)

- Blog placeholder posts: stay as-is (user decision).
- CSP: deferred with written rationale in the checklist — correct call.
- Content collections, footer Résumé span, plaintext email, `body *` theme-fade selector, `--dot`/`--accent` twin tokens: documented/deliberate; not worth churn.

## Verification

- Every PR: `pnpm verify` (format:check → lint → typecheck → build).
- PR 2/3: build then inspect `dist/` for favicon links, JSON-LD, `sitemap-index.xml`, robots; `pnpm preview` + Playwright MCP (isolated/headless — never resize the user's Chrome) to eyeball the 404 page and tab icon.
- PR 4/5: visual parity check against the design at the four tiers via Playwright MCP screenshots before/after; no rendered-DOM diff expected beyond class names.
- PR 6: axe scan + keyboard walk (skip link, landmarks) in headless browser; verify dark-OS first visit gets dark theme via emulated `prefers-color-scheme`.
- PR 7: `pnpm test:e2e` green locally and in CI.
- PR 8: build output size diff; confirm only 2 `@font-face` blocks remain and the page renders identically.
