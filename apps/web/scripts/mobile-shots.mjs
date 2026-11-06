// Mobile UI/UX screenshots at real device profiles.
// Usage: pnpm dev (on :3001) → node scripts/mobile-shots.mjs [baseUrl]
// Output: screenshots/<device>/<page>.png (gitignored)
//
// App routes are gated by AccessGuard (client-side → /login), so authenticated
// captures sign in through the real login form with the demo accounts
// provisioned by scripts/demo-users.mjs:
//   demo.user@aerotrack.dev  → tenant admin — portal pages
//   demo.admin@aerotrack.dev → super_admin  — /admin + /reseller pages
// Creds come from .env.local (DEMO_SHOTS_USER_PW / DEMO_SHOTS_ADMIN_PW).
// Without them only the public pages are captured.

import { chromium, webkit, devices } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3001";

/* [name, path, scope] — scope: public | user | admin */
const PAGES = [
  ["landing", "/", "public"],
  ["login", "/login", "public"],
  ["register", "/register", "public"],
  // end-user portal — any authenticated role
  ["tracking", "/tracking", "user"],
  ["vehicles", "/vehicles", "user"],
  ["trips", "/trips", "user"],
  ["settings", "/settings", "user"],
  // master portal — super_admin only
  ["admin-overview", "/admin", "admin"],
  ["admin-organizations", "/admin/organizations", "admin"],
  ["admin-users", "/admin/users", "admin"],
  ["admin-billing", "/admin/billing", "admin"],
  ["admin-announcements", "/admin/announcements", "admin"],
  // reseller portal — super_admin covers it for captures
  ["reseller-overview", "/reseller", "admin"],
  ["reseller-clients", "/reseller/clients", "admin"],
  ["reseller-devices", "/reseller/devices", "admin"],
  ["reseller-domains", "/reseller/domains", "admin"],
];

const TARGETS = [
  { name: "iphone-14-pro", engine: webkit, profile: devices["iPhone 14 Pro"] },
  { name: "iphone-se", engine: webkit, profile: devices["iPhone SE"] },
  { name: "iphone-14-pro-landscape", engine: webkit, profile: devices["iPhone 14 Pro landscape"] },
  { name: "pixel-7", engine: chromium, profile: devices["Pixel 7"] },
  { name: "pixel-7-landscape", engine: chromium, profile: devices["Pixel 7 landscape"] },
  { name: "galaxy-s23", engine: chromium, profile: devices["Galaxy S23"] },
];

/* Demo creds — optional; missing = anonymous-only captures (login walls). */
let envVars = {};
try {
  const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  envVars = Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
} catch { /* no .env.local — anonymous only */ }

const CREDS = {
  user: envVars.DEMO_SHOTS_USER_PW
    ? { email: "demo.user@aerotrack.dev", password: envVars.DEMO_SHOTS_USER_PW }
    : null,
  admin: envVars.DEMO_SHOTS_ADMIN_PW
    ? { email: "demo.admin@aerotrack.dev", password: envVars.DEMO_SHOTS_ADMIN_PW }
    : null,
};
if (!CREDS.user && !CREDS.admin) {
  console.log("no DEMO_SHOTS_* creds — run `node scripts/demo-users.mjs` for authenticated captures");
}

/** Sign in through the real login form — exercises the actual auth flow. */
async function login(ctx, { email, password }) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60000 });
    /* Clicking before React hydration submits the form natively (GET with
       creds in the URL → stays on /login). Buffer for the onSubmit handler. */
    await page.waitForTimeout(1500);
    for (let attempt = 0; attempt < 2; attempt++) {
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      try {
        await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45000 });
        return true;
      } catch (e) {
        if (attempt === 0 && page.url().includes("email=")) {
          console.log(`${email}: native GET submit (pre-hydration click) — retrying`);
          continue;
        }
        throw e;
      }
    }
    return false;
  } catch (e) {
    const url = page.url();
    const errText = await page
      .locator('[role="alert"], .text-destructive, form *')
      .last()
      .textContent()
      .catch(() => null);
    console.log(`login as ${email} FAILED at ${url}: ${errText ?? e.message.split("\n")[0]}`);
    return false;
  } finally {
    await page.close();
  }
}

async function capture(ctx, t, dir, name, path) {
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3500); // dev compile + client hydration + map tiles
    await page.screenshot({ path: `${dir}${name}.png`, fullPage: true });
    console.log(`${t.name}/${name}.png`);
  } catch (e) {
    console.log(`${t.name}/${name} FAILED: ${e.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}

const onlyDevices = process.env.SHOTS_DEVICES?.split(",");

for (const t of TARGETS) {
  if (onlyDevices && !onlyDevices.includes(t.name)) continue;
  const browser = await t.engine.launch();
  const dir = new URL(`../screenshots/${t.name}/`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  mkdirSync(dir, { recursive: true });

  /* Three contexts per device: anonymous → public pages (must run first —
     authed visitors are redirected away from /login), then per-scope logins.
     SHOTS_SCOPE=user|admin|public limits to one scope for partial re-runs. */
  for (const scope of ["public", "user", "admin"]) {
    if (process.env.SHOTS_SCOPE && scope !== process.env.SHOTS_SCOPE) continue;
    const pages = PAGES.filter(([, , s]) => s === scope);
    if (!pages.length) continue;
    const ctx = await browser.newContext(t.profile);
    const cred = CREDS[scope];
    const authed = cred ? await login(ctx, cred) : false;
    if (cred && !authed) {
      console.log(`${t.name}: ${scope} login failed — skipping ${pages.length} ${scope} pages`);
      await ctx.close();
      continue;
    }
    for (const [name, path] of pages) await capture(ctx, t, dir, name, path);
    await ctx.close();
  }

  await browser.close();
}

/* Contact sheet — open screenshots/index.html to flip through everything. */
const shotsDir = new URL("../screenshots/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const cards = TARGETS.flatMap((t) =>
  PAGES.map(([name]) => {
    const rel = `${t.name}/${name}.png`;
    return `<a href="${rel}" target="_blank"><figure><img src="${rel}" loading="lazy"><figcaption>${t.name} / ${name}</figcaption></figure></a>`;
  }),
).join("\n");
writeFileSync(
  `${shotsDir}index.html`,
  `<!doctype html><meta charset="utf-8"><title>AeroTrack mobile shots</title>
<style>body{font-family:system-ui;background:#111;color:#eee;margin:2rem}
a{color:inherit;text-decoration:none}figure{margin:0 0 1.5rem;display:inline-block;width:220px;vertical-align:top;margin-right:1rem}
img{width:100%;border:1px solid #333;border-radius:8px}figcaption{font-size:12px;opacity:.7;margin-top:.3rem}</style>
<h1>AeroTrack — mobile screenshots</h1>\n${cards}\n`,
);
console.log("done → apps/web/screenshots/ (open index.html to browse)");
