// Generates PWA icons: an indigo rounded square with a white "box" glyph.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePng, hex } from "./png.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const BRAND = hex("#4f46e5");
const WHITE = [255, 255, 255];

function icon(size) {
  const r = size * 0.22; // corner radius
  const inCorner = (x, y) => {
    const cx = x < r ? r : x > size - r ? size - r : x;
    const cy = y < r ? r : y > size - r ? size - r : y;
    return (x - cx) ** 2 + (y - cy) ** 2 > r * r && (x < r || x > size - r) && (y < r || y > size - r);
  };

  // Box glyph in relative coords.
  const bx1 = 0.27, bx2 = 0.73, by1 = 0.42, by2 = 0.76; // box body
  const lidY1 = 0.30, lidY2 = 0.42, lx1 = 0.22, lx2 = 0.78; // lid
  const t = 0.045; // stroke thickness

  return makePng(size, size, (px, py) => {
    if (inCorner(px, py)) return [0, 0, 0, 0];
    const x = px / size;
    const y = py / size;

    const inBody = x >= bx1 && x <= bx2 && y >= by1 && y <= by2;
    const onBodyEdge =
      inBody &&
      (x <= bx1 + t || x >= bx2 - t || y <= by1 + t || y >= by2 - t);
    const inLid = x >= lx1 && x <= lx2 && y >= lidY1 && y <= lidY2;
    const lidSlit = inLid && Math.abs(x - 0.5) < t / 2;
    const bodySlit = inBody && !onBodyEdge && Math.abs(x - 0.5) < t / 2 && y <= by1 + 0.14;

    if ((inLid && !lidSlit) || onBodyEdge || bodySlit) return WHITE;
    return BRAND;
  });
}

for (const size of [192, 512, 180]) {
  const name = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  fs.writeFileSync(path.join(outDir, name), icon(size));
  console.log("wrote", name);
}

// Simple favicon (32px).
fs.writeFileSync(path.join(outDir, "favicon-32.png"), icon(32));
console.log("wrote favicon-32.png");
