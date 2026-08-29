# Architecture

A one-page static site: Astro renders everything to HTML at build time, and the client ships no framework — just a few small vanilla scripts, each owned by the component whose markup it drives. There is no adapter and no server code; the output deploys as static assets (see [deploying.md](deploying.md)). Rendering fidelity is specified by the design file, not by this doc (see [design.md](design.md)).

## Layout

```
src/
  pages/index.astro       The page: assembles the layout, header, and sections
  pages/404.astro         Error page: Base + a way back home (noindex)
  pages/robots.txt.ts     Generated robots.txt, pointing at the sitemap
  layouts/Base.astro      <head>, fonts, and the pre-paint theme script
  components/
    Header.astro          Sticky nav; owns --headerH and the active-link highlight
    ThemeToggle.astro     Light/dark switch
    Section.astro         Shared list-section shell (intro, row list, scroll cue)
    SectionIntro.astro    Shared section header (eyebrow, title, blurb, CTA slot)
    BookCallCta.astro     Shared "Book A Call" link (header + section intros)
    ScrollCue.astro       Shared "Scroll Down" link (each section's cue)
    DotLabel.astro        Shared dot-and-label mark (intro eyebrows, row meta)
    Hero.astro            Page section
    Experience.astro      Page section
    Blog.astro            Page section
    Contact.astro         Page section (contact CTA)
    Footer.astro          Site footer; owns --footerH
  styles/global.css       Design tokens, Tailwind setup, base styles
  lib/theme.ts            Theme storage-key / attribute constants
  lib/nav.ts              Section order, ids, and labels (the single source)
  lib/site.ts             Site identity: email, name, role, socials (page title, Hero, Contact, Footer, Base's JSON-LD)
  lib/icons.ts            Shared presentation attrs for inline stroke icons
  assets/                 Images processed by astro:assets
public/                   Files served verbatim (favicons, _headers, og.jpg)
scripts/og-card.html      Source for public/og.jpg — rendered once at 1200×630, not built
scripts/rasterize-favicon.mjs  Regenerates favicon.ico + apple-touch-icon.png from favicon.svg
```

## Page composition

`index.astro` is the only content page (`404.astro` is a chrome-less error page: `Base` + a way back home, served by the Worker via `not_found_handling: "404-page"`, and the one page that passes `Base`'s `noindex` — it ships as a directly reachable static asset, so it takes a `robots` directive instead of a canonical). It composes `Base` → `Header` → one component per page section, in scroll order. Section order itself lives once, in `lib/nav.ts` (`sections`): the header and footer navs render it, the page derives each section's scroll-cue target (`nextHref`) from it, and each section declares its own `id` as a typed `SectionId` against it (the two list sections hand theirs to `Section`) — so a renamed or reordered section is a type error, not a dead link. `titleIdOf` sits beside `hrefOf` for the same reason: a `<section>` is exposed as a `region` landmark only once it has an accessible name, so every section points `aria-labelledby` at its own heading, and both the id and the reference are derived from the one `SectionId`. `SectionIntro` therefore takes `titleId` as a _required_ prop — an unnamed section is a silent accessibility regression, so it is a type error instead — while `Section` derives it from the section id rather than asking its consumer for it. The chain ends at Contact, which takes no `nextHref` and carries no scroll cue; the site footer (`Footer`) follows as a sibling _after_ `<main>`, because a `<footer>` nested in `<main>` (or any section) loses its `contentinfo` landmark role.

Ownership boundaries:

- **`Base.astro`** owns the document: metadata, the Fonts API setup, and the inline pre-paint script — which resolves the theme and raises the `data-js` flag, the two things that have to be settled before the first paint rather than after it.
- **`Header.astro`** owns everything header-shaped: the nav (it renders the shared `lib/nav.ts` sections — the highlight script still skips links whose section doesn't exist), the measured `--headerH` custom property that `section-screen` heights and the anchor-scroll offset depend on, the scroll-driven active-link highlight, and the skip link. The skip link ships here rather than in `Base` because it exists to skip the nav: `404.astro` has no chrome, so a skip link there would be a focusable no-op pointing at the only thing on the page. The cost is one contract with the consuming page — `index.astro`'s `<main>` carries `id="main"`, and both ends say so.
- **Section components** are self-contained: markup, section-scoped styles, behavior, and content live in one file. Section content is a typed const in the component's frontmatter — with a single consumer and a handful of entries, colocated data beats indirection. Content collections are reserved for genuinely repeating content (future blog article pages — the homepage blog section is a typed const like every other section).
- **Shared components** are extracted only when duplication is proven in the design source, not anticipated. `SectionIntro` exists because the Experiences and Blog intros are identical in the design down to their responsive tiers — and Contact consumes it too, as the `closer` variant (roomier padding, centered aside, its own tier steps) with its two mailto buttons passed through the named `cta` slot in place of the default `BookCallCta`; `Section` because those same two sections open with a byte-identical shell (intro → `section-list` of rows → `section-cue`), so they now supply only their rows through its slot, with the intro props picked off `SectionIntro`'s own type (`ComponentProps`) so the two can't drift; `BookCallCta` because the header and section intros carry the same CTA; `ScrollCue` because every section ends in the same cue; `DotLabel` because the design's dot-and-label mark is the same in the row meta and, one size up, in every intro eyebrow. Contact takes none of the shell — no row list, no cue — so it keeps composing `SectionIntro` directly.

Per-consumer variation enters through props and slots (e.g. `condensed`, `closer`, `compact`, `class`, the `cta` slot), never by reaching into the component from outside. The default `scopedStyleStrategy` doesn't carry a parent's scope into a child component, so a scoped class name passed inward would never match the rule that named it. Two consequences run through the shared components: placement styling (`.hero-scroll`) lives on a wrapper the consumer owns; and where the override would have to land _inside_ a shared component it becomes a prop instead — `Section`'s `condensed` tightens the intro and the closing cue together, for a section that must fit one small-phone screen (the cue's share lives with the `section-cue` utility in `global.css`, keyed off a `data-condensed` attribute, so the cue's whole padding ladder stays in one place and `Section` ships no styles of its own), and `BookCallCta`'s `compact` steps its type down on small phones for the header's tight row, where the section intros keep the base size. Inheriting the step in from a consumer-owned ancestor — the `DotLabel` trick below — can't work here: the CTA sets its own `text-meta`, and a class always beats an inherited value. `DotLabel` therefore accepts only width-invariant utilities, and the tier-dependent size of the rows it sits in is set on a consumer-owned ancestor (`.exp-head`, `.blog-meta`) and inherited in.

## Styling policy

One invariant carries the whole styling system:

> Markup classes are width-invariant Tailwind utilities only. Every property that changes across responsive tiers lives in the component's scoped `<style>`, written as plain range media queries — unless the whole rule is system-owned in `global.css` (the shared section rhythm below), in which case its tier steps live there with it.

The invariant holds for the chrome as well as the sections — `Header` and `ThemeToggle` earn no carve-out, since two policies would be the real smell. It has exactly one exception, and it is about the utility rather than the component: a variant may stay in markup when the utility it modifies is a bundle with no single-declaration equivalent. `sr-only` is the only such utility in play (nine declarations; hand-copying them into a scoped block is worse, and `@apply` there would need a `@reference` import of `global.css`), and it has two uses: `ThemeToggle`'s phone-tier label, which is the responsive case, and the skip link's `focus:not-sr-only`, which is the state case. Everything else — a gap, a padding, a font size, a `flex-wrap` — is one declaration and moves. The skip link shows where the boundary sits: the reveal is a markup variant because it toggles the bundle, while the positioning that keeps the revealed link out of the header's flow is a single declaration, so it lives in the scoped block (and wins, because component styles are unlayered while Tailwind's utilities are layered).

Inside a scoped block, a unique semantic element is selected by its tag (`header`, `nav`, `nav a`, ThemeToggle's `button`) and only non-semantic wrappers earn a class (`.header-actions`, `.exp-head`, `.blog-meta`, `.intro-aside`). Astro scopes every rule to its own component, so a tag selector can't reach past the file that wrote it.

State follows the same split: single-element state stays in markup as variants (Experience's `hover:border-accent-text`), while relational state — a parent's hover driving descendants, like Blog's rows — lives in the scoped `<style>`, where utilities could only express it by adding `group` plumbing to the markup.

Two facts force this split:

- Astro's scoped-style compiler does not process selectors inside Tailwind `@variant` blocks — rules there lose their scoping attribute and `:global()` is left unstripped — so scoped styles cannot use Tailwind's responsive variants.
- The breakpoint tokens in `global.css` compile to strict `width <` media queries, so the scoped blocks use the same range syntax (`(width < 900px)`, `(700px <= width < 900px)`) to keep both halves of the system agreeing at the boundary.

Design tokens are defined once in `global.css` and exposed as Tailwind utilities via `@theme inline` (values and roles are tabled in [design.md](design.md)). The two repeated type sizes are tokens on the same footing: `--text-meta` (13px — nav, cues, CTAs, labels) and `--text-body` (15px body copy at its base tier — the Hero blurb, Experience descriptions, and Blog's date/read-time column), used as `text-meta`/`text-body` in markup and as `var(…)` for the base tier in scoped styles. Their block is `@theme static`, and the keyword is load-bearing: Tailwind emits a theme variable only where it sees the utility used and never scans Astro's scoped `<style>` blocks, so without it those `var()` references would break the day the last markup use went away — silently, as an inherited font-size rather than an error. Tier steps off those bases stay literal, because they are tier values rather than tokens. The scale stops there by decision, not omission: each token names one recurring role, while the remaining repeated size (11px — intro eyebrows, Hero's rail label, the footer labels, Experience's pills) spans four roles with different tier behavior, so there is no single token to name. Named breakpoint variants (`max-tablet:`, `max-phone:`, `max-phone-sm:`) exist for the one markup exception above — every variant left in markup is a `max-*` one, and no min-width or stacked variant survives; media-query literals in scoped styles carry a comment naming the tier they belong to, and name the tier rather than the token (a `--breakpoint-*` spelled inside an `.astro` file is a variable reference to Tailwind's scanner, which then emits the token whether or not any rule uses it).

Four layout primitives are system-owned in `global.css` rather than re-encoded per component: the responsive `--gutter` custom property (the shared section gutter — conditions can't read variables, but declarations can), the `section-screen` utility (a section's viewport-filling height under the header), the `section-list` utility (a section's evenly-distributed content list, inset by the gutter), and the `section-cue` utility (the flat-bottom scroll-cue rhythm for in-flow sections; an absolutely-positioned cue opts out).

## Theming

- The OS preference is the default; dark is the `data-theme="dark"` attribute on `<html>`. The pre-paint script resolves stored choice first, `prefers-color-scheme` second — and only a stored `"light"` opts out of the OS default, so a missing or corrupt value falls through to it rather than pinning light. Light remains the default in CSS (the token block is unconditional and the dark block overrides it), which is why the attribute is set before first paint rather than by a media query. The attribute name and storage key are constants in `lib/theme.ts`; `global.css` co-owns the values (its dark variant and token block hard-code the attribute), and both files say so.
- The theme-flip fade is temporal: `ThemeToggle` puts `.theme-switching` on the root only for the duration of a toggle, so the 500ms color transition runs exactly then — hovers stay instant and the first paint can't flash.
- Reduced motion: smooth anchor scrolling opts out via `prefers-reduced-motion` (a page-length scroll is large motion); the small transitions — theme fade, read-more expand, nav highlight — do not.

## Client JavaScript

Behavior is colocated: each component carries its own `<script>`, which Astro bundles as a deferred module and dedupes across uses — scripts run once, after the document is parsed, with no ready-state wrappers. The one exception is deliberate: the theme init in `Base.astro` is `is:inline` because it must run before first paint.

| Script                | Responsibility                                                                                                                                                                  |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Base.astro` (inline) | Before first paint: flag `<html>` with `data-js` for progressive enhancements to gate on, and resolve the theme — stored choice first, OS preference otherwise                  |
| `Header.astro`        | Measure the header into `--headerH` (ResizeObserver); sync the active nav link on scroll, with a short lock on clicks to hashes the nav owns so the highlight moves immediately |
| `ThemeToggle.astro`   | Flip `data-theme`, persist the choice, run the temporal fade (duration read from the `--theme-fade` token, so CSS and cleanup timeout can't drift)                              |
| `Experience.astro`    | Read-more expand/collapse on the phone tier, animating through an explicit pixel height                                                                                         |
| `Footer.astro`        | Measure the footer into `--footerH` (ResizeObserver), which Contact's screen-height formula subtracts                                                                           |

## Decisions

Choices a reviewer might question, and why they went this way:

- **`svh` for section heights** — equals `vh` on desktop and stays stable on mobile when the browser chrome collapses; `dvh` would resize sections mid-scroll.
- **`lh` for the read-more clamp** — `3lh` derives "three lines" from the element's real line-height instead of encoding it a second time; browsers below the unit's floor (older than the mask-image floor below) simply don't clamp.
- **`aria-current="location"` for the active nav link** — the semantically correct signal for "current place in the page", and the styling hook, in one attribute; a `data-` attribute would duplicate state assistive tech can't see.
- **Unprefixed `mask-image` only** — the build's CSS minifier strips `-webkit-` prefixes per its Baseline browser targets, so authoring them would be dead source; pre-Baseline browsers lose only a cosmetic fade, never the content clamp.
- **Design-file dead code is not ported** — the design's pill-balancing script (guard condition can never hold) and its 640px article rule (fully shadowed by a later block) are provably inert, so the implementation omits them rather than shipping code that never runs.
- **Blog rows are non-link `<article>`s** — the design marks them up as anchors, but their `href="#blog"` self-reference is a dead link: a focusable tab stop with no destination that would scroll-jump on click. The hover treatment stays — design fidelity carried ahead of the real links — but the design's pointer cursor does not: a pointer promises a click target that doesn't exist yet. The rows become real `<a>` links (and regain the cursor for free) when article pages exist.
- **Color literals that shadow tokens become tokens** — e.g. the design's hard-coded article hairline is `border-hair` here, so dark mode keeps a visible border.
- **`section-screen` is height-only** — the utility owns only the height formula; the page-width cap is the plain markup pair `mx-auto max-w-page`, carried by the header and each capped box (section roots, Contact's CTA and the footer's inner) rather than bundled into the utility, so a full-bleed panel like the footer can span the viewport width.
- **The footer is a `<main>` sibling with a measured height** — the design draws Contact's CTA and the site footer sharing the final screen, but a `<footer>` inside the section can't be a `contentinfo` landmark. So `Footer` sits after `<main>` and mirrors Header's measured-custom-property pattern (`--footerH`), and Contact's `contact-screen` subtracts both chrome heights to keep the pair filling one viewport. Without JS the fallback is `0px`: the CTA takes the full screen and the footer follows.
- **In-page links say ↓, external links say ↗** — the scroll cues and `BookCallCta` jump within the page, so they share the ↓ glyph; ↗ is reserved for links that leave the page (the footer's GitHub/LinkedIn, mailto CTAs), keeping the affordance vocabulary consistent.
- **Footer contrast lifts are theme variables** — the footer inverts (`bg-ink` flips with the theme), so in dark mode 50%-opacity text sits on a light panel and falls to ~3.5:1. The dim levels are theme-conditional values, not element state, so they live with the other theme-conditional values in `global.css` (`--on-ink-dim`/`--on-ink-mid`, lifted in the dark block) and the markup consumes them as `opacity-(--var)` utilities.
- **The theme fade is 500ms, not the design's ~260ms** — a deliberate deviation: the full-page flip reads better slowed down. The duration is single-sourced as `--theme-fade` in `global.css`; ThemeToggle's cleanup timeout derives from it.
- **No test suite** — deliberate: a static one-page site whose only logic is four small DOM scripts. The gates are `pnpm verify` (formatting, ESLint with `jsx-a11y`, strictest typecheck, build) plus pixel-verification against the design; a unit suite here would snapshot markup no consumer depends on. Real interactive logic — article pages, forms — is the trigger to add Vitest/Playwright.
- **The underlined-CTA class string stays inline** — `border-b border-accent-text/40 pb-0.5 text-meta text-accent-text` repeats across a `<button>` (Experience's read-more), a `<span>` whose hover is driven by its parent row (Blog), and an `<a>` (404). Extracting it would mean a component that can't be one (three elements, three hover stories) or a custom utility, which buys four declarations at the price of a second vocabulary beside Tailwind. The type token already removes the only magic number in it.
- **The skip link's target carries no `tabindex="-1"`** — the conventional attribute is there to make a non-focusable `<main>` receive focus, and browsers stopped needing it: the sequential focus navigation starting point has shipped in Firefox, Chrome, Edge and Safari since 2013–2016, and current cross-browser testing of skip links without the attribute (four browsers, five screen readers) finds no failures. It is not free either — `tabindex="-1"` on a `<main>` can break the back button on iOS. So the attribute would buy a fixed problem at the price of a live one. Verified here: activating the link puts the next Tab on the first control inside `<main>`.
- **The theme init is duplicated rather than shared with `lib/theme.ts`** — the obvious cleanup is a `readTheme()`/`writeTheme()` pair in `lib/theme.ts`, and it can't be done. The init must beat the first paint, so it can't be a bundled module; that makes it `is:inline` (which `define:vars` implies anyway), and Astro renders inline scripts verbatim with no import resolution. So `readTheme()` would have exactly one possible caller, and it isn't the one that duplicates anything. What is genuinely shared — the storage key, the attribute name, the per-theme `--bg` values — already lives in `lib/theme.ts` and is passed in through `define:vars`; what is left is four lines of DOM code in two incompatible execution contexts. The alternative that would single-source it, exporting the script body as a template string and injecting it with `set:html`, trades type-checking, linting and formatting for that, on the one script that runs before everything else.
- **Progressive enhancement is gated on a root flag set before first paint** — the Experience read-more is CSS-clamped and JS-expanded, so on its own the clamp would trap the text for anyone with scripts blocked. The clamp and its toggle now hang off `html[data-js]`, which the pre-paint script sets: no JS means the descriptions render whole and the dead toggle never appears. The flag is set there rather than by `Experience`'s own script because a bundled module is deferred — it would paint the unclamped text and then snap it shut. One line in a script that has to exist anyway, against a component-owned flag that flashes.
- **The Résumé row is a non-link, and years are derived** — the design's Résumé row would be a dead `#` link (same rationale as the blog rows), so it's a literal span until a CV is hosted; both years the site shows (the footer's © line and Hero's rail label) come from build time rather than hard-coding the design's 2026.

## Keeping this current

This doc changes in the same PR as any change to component boundaries, styling policy, or client scripts — it describes the system as built, never as planned.
