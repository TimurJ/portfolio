# Design & style system

The site design lives in Claude Design as `Portfolio.dc.html` ("Timur Jalilov, Senior Frontend Engineer"). That project is private to the author, so this document — not the source file — is the reference for anyone reading the repo. The style system in `src/styles/global.css` is derived verbatim from it.

## Tokens

| Token           | Light                         | Dark                    | Role                                                                                                                         |
| :-------------- | :---------------------------- | :---------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| `--bg`          | `#ffffff`                     | `#0e0e0e`               | Page ground                                                                                                                  |
| `--ink`         | `#1c1c1c`                     | `#ededed`               | Text / primary ink                                                                                                           |
| `--muted`       | `#6a6a6a`                     | `#a2a2a2`               | Secondary text                                                                                                               |
| `--line`        | `rgba(28,28,28,.35)`          | `rgba(237,237,237,.32)` | Strong rules, borders                                                                                                        |
| `--hair`        | `rgba(28,28,28,.12)`          | `rgba(237,237,237,.13)` | Hairline rules                                                                                                               |
| `--accent`      | `#d80000`                     | `#e01000`               | Red fills (dots, buttons)                                                                                                    |
| `--accent-text` | `#b40000`                     | `#ff5a4d`               | Red used as text / hover ink                                                                                                 |
| `--dot`         | `#d80000`                     | `#e01000`               | Marker dots                                                                                                                  |
| `--img`         | `grayscale(1) contrast(1.05)` | same                    | Photography filter — not ported: the portrait ships pre-desaturated (`assets/portrait-bw.webp`), so nothing would consume it |

Tokens are exposed as Tailwind utilities via `@theme inline` (`bg-bg`, `text-ink`, `text-muted`, `border-line`, `border-hair`, `bg-accent`, `text-accent-text`, …).

## Theming

- Light is the design's default; dark applies via `data-theme="dark"` on the root element. The implementation deliberately defaults to the OS preference instead, treating a stored `"light"` as the only opt-out — see the decision record in [architecture.md](architecture.md).
- Tailwind's `dark:` variant is bound to that attribute (not `prefers-color-scheme`).
- The design persists the user's choice in localStorage under `tj-portfolio-theme` and animates the flip with a ~260ms color transition. The implementation deliberately slows this to 500ms (`--theme-fade`) — see the decision record in [architecture.md](architecture.md).

## Type

- Archivo (400), self-hosted via Astro's Fonts API (`--font-archivo`, preloaded); stack falls back to `system-ui, sans-serif`.
- Display headings use **weight 400** with tight tracking (−0.02em to −0.04em) and line-height ≈ 0.88–1.15; the design's sizes are fluid `clamp()` values per section.
