/* Regenerates public/favicon.ico and public/apple-touch-icon.png from
   public/favicon.svg, so the three icons can never disagree. Not part of the
   build — run it by hand after editing the SVG:

     pnpm exec node scripts/rasterize-favicon.mjs

   librsvg (via sharp) ignores prefers-color-scheme, so both rasters come out
   as the SVG's light variant — which is what its header comment documents
   them to be, and what Safari shows for the SVG itself. */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const publicDir = new URL("../public/", import.meta.url);
const source = await readFile(new URL("favicon.svg", publicDir));

/* density scales librsvg's rasterization of the 64-unit viewBox; rendering
   well above the target size and letting sharp downsample keeps the curves
   clean at 32px. */
const render = (size) =>
  sharp(source, { density: 600 }).resize(size, size).png().toBuffer();

const [appleTouch, icon32] = await Promise.all([render(180), render(32)]);

/* A .ico is a 6-byte ICONDIR plus one 16-byte ICONDIRENTRY per image; PNG
   payloads are legal since Vista, and a single 32x32 entry is what this icon
   has always shipped. Width/height are stored as one byte (0 means 256). */
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette size (0 = no palette)
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // color planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(icon32.length, 14);
header.writeUInt32LE(header.length, 18); // payload offset

await Promise.all([
  writeFile(new URL("apple-touch-icon.png", publicDir), appleTouch),
  writeFile(new URL("favicon.ico", publicDir), Buffer.concat([header, icon32])),
]);

console.log(
  `Wrote ${fileURLToPath(new URL("favicon.ico", publicDir))} and apple-touch-icon.png`,
);
