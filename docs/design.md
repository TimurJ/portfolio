# Design & style system

The site design lives in Claude Design as `Portfolio.dc.html` ("Timur Jalilov, Senior Frontend Engineer"). That project is private to the author, so this document — not the source file — is the reference for anyone reading the repo. The style system in `src/styles/global.css` is derived verbatim from it.

## Tokens

| Token             | Light                         | Dark                    | Role                                                                                                                         |
| :---------------- | :---------------------------- | :---------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `--bg`            | `#ffffff`                     | `#0e0e0e`               | Page ground                                                                                                                  |
| `--ink`           | `#1c1c1c`                     | `#ededed`               | Text / primary ink                                                                                                           |
| `--muted`         | `#6a6a6a`                     | `#a2a2a2`               | Secondary text                                                                                                               |
| `--line`          | `rgba(28,28,28,.35)`          | `rgba(237,237,237,.32)` | Strong rules, borders                                                                                                        |
| `--hair`          | `rgba(28,28,28,.12)`          | `rgba(237,237,237,.13)` | Hairline rules                                                                                                               |
| `--accent`        | `#d80000`                     | `#e01000`               | Red fills (dots, buttons)                                                                                                    |
| `--accent-text`   | `#b40000`                     | `#ff5a4d`               | Red used as text / hover ink                                                                                                 |
| `--dot`           | `#d80000`                     | `#e01000`               | Marker dots                                                                                                                  |
| `--accent-hover`  | `#b40000`                     | same                    | Red fill under white text on hover — **added**                                                                               |
| `--accent-on-ink` | `#ff5a4d`                     | `#b40000`               | Red used as text on the inverted footer panel — **added**                                                                    |
| `--on-ink-dim`    | `0.5`                         | `0.68`                  | Dim text opacity on the inverted footer panel — **added**                                                                    |
| `--on-ink-mid`    | `0.75`                        | `0.88`                  | Mid text opacity on the inverted footer panel — **added**                                                                    |
| `--img`           | `grayscale(1) contrast(1.05)` | same                    | Photography filter — not ported: the portrait ships pre-desaturated (`assets/portrait-bw.webp`), so nothing would consume it |

The four tokens marked **added** are deliberate deviations: the design has one accent per theme and one flat opacity, and both fall below 4.5:1 in places it does not distinguish — accent-as-hover-background under white text, accent-as-text on the inverted panel, and dimmed ink on that panel once it turns light in dark mode. Each is a contrast-tuned value for a context the design's single token cannot serve, not a new colour in the palette. The ratios and the reasoning are in the decision record in [architecture.md](architecture.md).

Tokens are exposed as Tailwind utilities via `@theme inline` (`bg-bg`, `text-ink`, `text-muted`, `border-line`, `border-hair`, `bg-accent`, `text-accent-text`, …).

## Theming

- Light is the design's default; dark applies via `data-theme="dark"` on the root element. The implementation follows it: the OS `prefers-color-scheme` is not consulted, so dark comes only from a stored choice — see the decision record in [architecture.md](architecture.md).
- Tailwind's `dark:` variant is bound to that attribute (not `prefers-color-scheme`).
- The design persists the user's choice in localStorage under `tj-portfolio-theme` and animates the flip with a ~260ms color transition. The implementation deliberately slows this to 500ms (`--theme-fade`) — see the decision record in [architecture.md](architecture.md).

## Type

- Archivo (400), self-hosted via Astro's Fonts API (`--font-archivo`, preloaded); stack falls back to `system-ui, sans-serif`.
- Display headings use **weight 400** with tight tracking (−0.02em to −0.04em) and line-height ≈ 0.88–1.15; the design's sizes are fluid `clamp()` values per section.
- The Experience rows carry a role title the design's rows do not have — **added**. The design leads each row with the company at `clamp(20px, 2vw, 30px)`; here that scale goes to the title, and the company drops to a new `clamp(15px, 1.2vw, 18px)` step (15px / 14px on the laptop / phone tiers) between it and the 13px meta. The reasoning is in the decision record in [architecture.md](architecture.md).
