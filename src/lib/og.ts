import { readFile } from "node:fs/promises";

import satori from "satori";
import sharp from "sharp";

import { formatMonthYear } from "./dates";
import { name, ogImage } from "./site";
import { THEME_COLORS } from "./theme";

/* A post's social card, rendered at build by pages/blog/[slug]/og.png.ts.
   satori lays the tree out with flexbox and emits an SVG with the text as
   paths, so sharp (already here for Astro's image service) rasterises it
   without a system font or a browser. The home card is not built this way —
   it carries the portrait and is hand-rendered from scripts/og-card.html;
   docs/architecture.md records why.

   Colours are the dark block of global.css: --bg through THEME_COLORS, which
   already mirrors it, and the rest restated, because this file runs in Node
   where the stylesheet does not exist. --accent-text rather than --accent for
   the eyebrow, because it is text on --bg and that token is the one tuned
   for it. */
const dark = {
  bg: THEME_COLORS.dark,
  ink: "#ededed",
  muted: "#a2a2a2",
  accent: "#e01000",
  accentText: "#ff5a4d",
};

/* Archivo 400, the site's one face — as WOFF, because satori reads TTF, OTF
   and WOFF but not the WOFF2 Astro's font pipeline emits. Resolved through the
   package's export map and read once for every card in the build. */
const archivo = readFile(
  new URL(
    import.meta
      .resolve("@fontsource/archivo/files/archivo-latin-400-normal.woff"),
  ),
);

/* satori's element type is React's ReactNode, from a package this project
   doesn't install; the object form it documents is all that's needed. */
type Style = Record<string, string | number>;
type Node = {
  type: "div" | "span";
  props: { style: Style; children?: Node | Node[] | string | undefined };
};

const el = (
  type: Node["type"],
  style: Style,
  children?: Node["props"]["children"],
): Node => ({ type, props: { style, children } });

const text = (content: string, style: Style = {}): Node =>
  el("span", style, content);

type PostCard = {
  title: string;
  pubDate: Date;
  /** The site origin, for the domain line — `site` in astro.config.mjs via
      Astro.site, not restated here. */
  site: URL;
};

/** The card as a PNG. Type and spacing mirror the article header: the Blog
    eyebrow with its dot, the title at the display scale, then the meta. */
export const renderPostCard = async ({
  title,
  pubDate,
  site,
}: PostCard): Promise<Uint8Array<ArrayBuffer>> => {
  const tree = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "100%",
      height: "100%",
      padding: "72px 84px",
      backgroundColor: dark.bg,
      color: dark.ink,
      fontFamily: "Archivo",
    },
    [
      el("div", { display: "flex", flexDirection: "column", gap: "36px" }, [
        el("div", { display: "flex", alignItems: "center", gap: "12px" }, [
          el("div", {
            width: "10px",
            height: "10px",
            borderRadius: "999px",
            backgroundColor: dark.accent,
          }),
          text("BLOG", {
            fontSize: "22px",
            letterSpacing: "0.12em",
            color: dark.accentText,
          }),
        ]),
        text(title, {
          fontSize: "60px",
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          /* The canvas is fixed and the meta row sits at its foot, so the
             title is bounded: five 63px lines is the most that fit above the
             row (370px); satori would otherwise push it off the card.
             lineClamp needs display: block on the text node and ends the last
             line in an ellipsis; break-word is the horizontal half, for one
             token wider than the canvas. Neither touches a title that fits. */
          display: "block",
          lineClamp: 5,
          wordBreak: "break-word",
        }),
      ]),
      el("div", { display: "flex", flexDirection: "column", gap: "28px" }, [
        el("div", {
          width: "64px",
          height: "4px",
          backgroundColor: dark.accent,
        }),
        el(
          "div",
          { display: "flex", gap: "18px", fontSize: "22px", color: dark.muted },
          [
            text(name, { color: dark.ink }),
            text("·"),
            text(site.host),
            text("·"),
            text(formatMonthYear(pubDate)),
          ],
        ),
      ]),
    ],
  );

  const svg = await satori(tree, {
    width: ogImage.width,
    height: ogImage.height,
    fonts: [
      { name: "Archivo", data: await archivo, weight: 400, style: "normal" },
    ],
  });
  /* Copied into a plain Uint8Array: a Buffer is typed over ArrayBufferLike,
     which Response's BodyInit no longer accepts. 50KB, once per post. */
  return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
};
