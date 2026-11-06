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
  // end-user portal
  ["tracking", "/tracking"],
  ["vehicles", "/vehicles"],
  ["trips", "/trips"],
  ["settings", "/settings"],
  // master portal (demo mode — AUTH_REQUIRED is off)
  ["admin-overview", "/admin"],
  ["admin-organizations", "/admin/organizations"],
  ["admin-users", "/admin/users"],
  ["admin-billing", "/admin/billing"],
  ["admin-announcements", "/admin/announcements"],
  // reseller portal
  ["reseller-overview", "/reseller"],
  ["reseller-clients", "/reseller/clients"],
  ["reseller-devices", "/reseller/devices"],
  ["reseller-domains", "/reseller/domains"],
];

const TARGETS = [
  { name: "iphone-14-pro", engine: webkit, profile: devices["iPhone 14 Pro"] },
  { name: "iphone-se", engine: webkit, profile: devices["iPhone SE"] },
  { name: "iphone-14-pro-landscape", engine: webkit, profile: devices["iPhone 14 Pro landscape"] },
  { name: "pixel-7", engine: chromium, profile: devices["Pixel 7"] },
  { name: "pixel-7-landscape", engine: chromium, profile: devices["Pixel 7 landscape"] },
  { name: "galaxy-s23", engine: chromium, profile: devices["Galaxy S23"] },
];

for (const t of TARGETS) {
  const browser = await t.engine.launch();
  const ctx = await browser.newContext(t.profile);
  const dir = new URL(`../screenshots/${t.name}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  await mkdir(dir, { recursive: true });

  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
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

/* Contact sheet — open screenshots/index.html to flip through everything. */
import { writeFile } from "node:fs/promises";
const shotsDir = new URL("../screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const cards = TARGETS.flatMap((t) =>
  PAGES.map(([name]) => {
    const rel = `${t.name}/${name}.png`;
    return `<a href="${rel}" target="_blank"><figure><img src="${rel}" loading="lazy"><figcaption>${t.name} / ${name}</figcaption></figure></a>`;
  }),
).join("\n");
await writeFile(
  `${shotsDir}index.html`,
  `<!doctype html><meta charset="utf-8"><title>AeroTrack mobile shots</title>
<style>body{font-family:system-ui;background:#111;color:#eee;margin:2rem}
a{color:inherit;text-decoration:none}figure{margin:0 0 1.5rem;display:inline-block;width:220px;vertical-align:top;margin-right:1rem}
img{width:100%;border:1px solid #333;border-radius:8px}figcaption{font-size:12px;opacity:.7;margin-top:.3rem}</style>
<h1>AeroTrack — mobile screenshots</h1>\n${cards}\n`,
);
console.log("done → apps/web/screenshots/ (open index.html to browse)");
