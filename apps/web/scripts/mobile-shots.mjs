// Mobile UI/UX screenshots at real device profiles.
// Usage: pnpm dev (on :3001) → node scripts/mobile-shots.mjs [baseUrl]
// Output: screenshots/<device>/<page>.png (gitignored)

import { chromium, webkit, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.argv[2] ?? "http://localhost:3001";

const PAGES = [
  ["landing", "/"],
  ["login", "/login"],
  ["register", "/register"],
  ["tracking", "/tracking"],
  ["vehicles", "/vehicles"],
  ["trips", "/trips"],
  ["settings", "/settings"],
];

const TARGETS = [
  { name: "iphone-14-pro", engine: webkit, profile: devices["iPhone 14 Pro"] },
  { name: "pixel-7", engine: chromium, profile: devices["Pixel 7"] },
];

for (const t of TARGETS) {
  const browser = await t.engine.launch();
  const ctx = await browser.newContext(t.profile);
  const dir = new URL(`../screenshots/${t.name}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  await mkdir(dir, { recursive: true });

  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3500); // dev compile + client hydration + map tiles
      await page.screenshot({ path: `${dir}${name}.png`, fullPage: true });
      console.log(`${t.name}/${name}.png`);
    } catch (e) {
      console.log(`${t.name}/${name} FAILED: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await browser.close();
}
console.log("done → apps/web/screenshots/");
