#!/usr/bin/env node
/**
 * Generates the PWA icon set in public/icons/ from the brand mark
 * (the same target glyph as app/icon.svg). Run from apps/web:
 *
 *   node scripts/gen-pwa-icons.mjs
 *
 * Requires playwright + a chromium build (already a devDependency).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const GLYPH = `
  <circle cx="32" cy="32" r="6" fill="#fff"/>
  <circle cx="32" cy="32" r="15" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="3.5"/>
  <path d="M32 8v7M32 49v7M8 32h7M49 32h7" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
`;

const svg = (size, radius) => `<!doctype html><html><body style="margin:0">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <rect width="64" height="64" rx="${radius}" fill="#1E40FF"/>
  ${GLYPH}
</svg></body></html>`;

const ICONS = [
  { file: "icon-192.png", size: 192, radius: 16 },
  { file: "icon-512.png", size: 512, radius: 16 },
  { file: "icon-maskable-512.png", size: 512, radius: 0 },
  { file: "apple-touch-icon.png", size: 180, radius: 0 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const icon of ICONS) {
  await page.setViewportSize({ width: icon.size, height: icon.size });
  await page.setContent(svg(icon.size, icon.radius), { waitUntil: "load" });
  await page.screenshot({ path: join(outDir, icon.file), clip: { x: 0, y: 0, width: icon.size, height: icon.size } });
  console.log("wrote", icon.file);
}

await browser.close();
