# Architecture

A one-page static site: Astro renders everything to HTML at build time, and the client ships no framework — just a few small vanilla scripts, each owned by the component whose markup it drives. There is no adapter and no server code; the output deploys as static assets (see [deploying.md](deploying.md)). Rendering fidelity is specified by the design file, not by this doc (see [design.md](design.md)).

## Layout

```
src/
  pages/index.astro       The page: assembles the layout, header, and sections
  layouts/Base.astro      <head>, fonts, and the pre-paint theme script
  components/
    Header.astro          Sticky nav; owns --headerH and the active-link highlight
    ThemeToggle.astro     Light/dark switch
    SectionIntro.astro    Shared section header (eyebrow, title, blurb, CTA slot)
    BookCallCta.astro     Shared "Book A Call" link (header + section intros)
    ScrollCue.astro       Shared "Scroll Down" link (each section's cue)
    Hero.astro            Page section
    Experience.astro      Page section
    Blog.astro            Page section
    Contact.astro         Page section (contact CTA)
    Footer.astro          Site footer; owns --footerH
  styles/global.css       Design tokens, Tailwind setup, base styles
  lib/theme.ts            Theme storage-key / attribute constants
  lib/nav.ts              Section order, ids, and labels (the single source)
  lib/site.ts             Contact-address constant (Contact + Footer)
  lib/icons.ts            Shared presentation attrs for inline stroke icons
  assets/                 Images processed by astro:assets
public/                   Files served verbatim (favicons, _headers)
```

## Page composition

`index.astro` is the only page. It composes `Base` → `Header` → one component per page section, in scroll order. Section order itself lives once, in `lib/nav.ts` (`sections`): the header and footer navs render it, the page derives each section's scroll-cue target (`nextHref`) from it, and each section declares its own `id` as a typed `SectionId` against it — so a renamed or reordered section is a type error, not a dead link. The chain ends at Contact, which takes no `nextHref` and carries no scroll cue; the site footer (`Footer`) follows as a sibling _after_ `<main>`, because a `<footer>` nested in `<main>` (or any section) loses its `contentinfo` landmark role.

Ownership boundaries:

- **`Base.astro`** owns the document: metadata, the Fonts API setup, and the inline pre-paint script that applies the stored theme before first paint.
- **`Header.astro`** owns everything header-shaped: the nav (it renders the shared `lib/nav.ts` sections — the highlight script still skips links whose section doesn't exist), the measured `--headerH` custom property that `section-screen` heights and the anchor-scroll offset depend on, and the scroll-driven active-link highlight.
- **Section components** are self-contained: markup, section-scoped styles, behavior, and content live in one file. Section content is a typed const in the component's frontmatter — with a single consumer and a handful of entries, colocated data beats indirection. Content collections are reserved for genuinely repeating content (future blog article pages — the homepage blog section is a typed const like every other section).
- **Shared components** are extracted only when duplication is proven in the design source, not anticipated. `SectionIntro` exists because the Experiences and Blog intros are identical in the design down to their responsive tiers — and Contact consumes it too, as the `closer` variant (roomier padding, centered aside, its own tier steps) with its two mailto buttons passed through the named `cta` slot in place of the default `BookCallCta`; `BookCallCta` because the header and section intros carry the same CTA; `ScrollCue` because every section ends in the same cue. Per-consumer variation enters through props and slots (e.g. `condensed`, `closer`, `class`, the `cta` slot), never by reaching into the component from outside — placement styling (`.hero-scroll`) and consumer tier overrides (`.exp-cue`) live on a wrapper the consumer owns, since the default `scopedStyleStrategy` doesn't carry a parent's scope into a child component anyway.

## Styling policy

One invariant carries the whole styling system:

> Markup classes are width-invariant Tailwind utilities only. Every property that changes across responsive tiers lives in the component's scoped `<style>`, written as plain range media queries — unless the whole rule is system-owned in `global.css` (the shared section rhythm below), in which case its tier steps live there with it.

State follows the same split: single-element state stays in markup as variants (Experience's `hover:border-accent-text`), while relational state — a parent's hover driving descendants, like Blog's rows — lives in the scoped `<style>`, where utilities could only express it by adding `group` plumbing to the markup.

Two facts force this split:

- Astro's scoped-style compiler does not process selectors inside Tailwind `@variant` blocks — rules there lose their scoping attribute and `:global()` is left unstripped — so scoped styles cannot use Tailwind's responsive variants.
- The breakpoint tokens in `global.css` compile to strict `width <` media queries, so the scoped blocks use the same range syntax (`(width < 900px)`, `(700px <= width < 900px)`) to keep both halves of the system agreeing at the boundary.

Design tokens are defined once in `global.css` and exposed as Tailwind utilities via `@theme inline` (values and roles are tabled in [design.md](design.md)). Named breakpoint variants (`max-tablet:`, `max-phone:`, `max-phone-sm:`) exist for markup; media-query literals in scoped styles carry a comment naming the tier they belong to.

Four layout primitives are system-owned in `global.css` rather than re-encoded per component: the responsive `--gutter` custom property (the shared section gutter — conditions can't read variables, but declarations can), the `section-screen` utility (a section's viewport-filling height under the header), the `section-list` utility (a section's evenly-distributed content list, inset by the gutter), and the `section-cue` utility (the flat-bottom scroll-cue rhythm for in-flow sections; an absolutely-positioned cue opts out).

## Theming

- Light is the default; dark is the `data-theme="dark"` attribute on `<html>`. The attribute name and storage key are constants in `lib/theme.ts`; `global.css` co-owns the values (its dark variant and token block hard-code the attribute), and both files say so.
- The theme-flip fade is temporal: `ThemeToggle` puts `.theme-switching` on the root only for the duration of a toggle, so the 500ms color transition runs exactly then — hovers stay instant and the first paint can't flash.
- Reduced motion: smooth anchor scrolling opts out via `prefers-reduced-motion` (a page-length scroll is large motion); the small transitions — theme fade, read-more expand, nav highlight — do not.

## Client JavaScript

Behavior is colocated: each component carries its own `<script>`, which Astro bundles as a deferred module and dedupes across uses — scripts run once, after the document is parsed, with no ready-state wrappers. The one exception is deliberate: the theme init in `Base.astro` is `is:inline` because it must run before first paint.

| Script                | Responsibility                                                                                                                                                                                      |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Base.astro` (inline) | Apply the stored theme to `<html>` before first paint                                                                                                                                               |
| `Header.astro`        | Measure the header into `--headerH` (ResizeObserver); sync the active nav link on scroll, with a short lock on in-page anchor clicks (nav links and scroll cues) so the highlight moves immediately |
| `ThemeToggle.astro`   | Flip `data-theme`, persist the choice, run the temporal fade (duration read from the `--theme-fade` token, so CSS and cleanup timeout can't drift)                                                  |
| `Experience.astro`    | Read-more expand/collapse on the phone tier, animating through an explicit pixel height                                                                                                             |
| `Footer.astro`        | Measure the footer into `--footerH` (ResizeObserver), which Contact's screen-height formula subtracts                                                                                               |

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
- **The Résumé row is a non-link, and the © year is derived** — the design's Résumé row would be a dead `#` link (same rationale as the blog rows), so it's a literal span until a CV is hosted; the legal year comes from build time rather than hard-coding the design's 2026.

## Keeping this current

This doc changes in the same PR as any change to component boundaries, styling policy, or client scripts — it describes the system as built, never as planned.
