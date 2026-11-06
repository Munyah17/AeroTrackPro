/**
 * Provisions the two demo accounts used by mobile-shots.mjs for authenticated
 * screenshot captures:
 *   demo.user@aerotrack.dev   → tenant admin on its own auto-created tenant
 *   demo.admin@aerotrack.dev  → super_admin (sees /admin + /reseller surfaces)
 *
 * Passwords are generated once and stored in .env.local as DEMO_SHOTS_USER_PW /
 * DEMO_SHOTS_ADMIN_PW — never committed, rotate by deleting the vars.
 *
 * Idempotent: rerunning resets passwords to the stored values and re-asserts
 * the super_admin role. Run:  node scripts/demo-users.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const envPath = new URL("../.env.local", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const readEnv = () =>
  Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );

const env = readEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ACCOUNTS = [
  { key: "DEMO_SHOTS_USER", email: "demo.user@aerotrack.dev", promote: null },
  { key: "DEMO_SHOTS_ADMIN", email: "demo.admin@aerotrack.dev", promote: "super_admin" },
];

for (const a of ACCOUNTS) {
  let pw = env[`${a.key}_PW`];
  if (!pw) {
    pw = `Demo!${randomBytes(9).toString("base64url")}`;
    appendFileSync(envPath, `\n${a.key}_PW=${pw}`);
  }

  /* Find-or-create the auth user. */
  const { data: page } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = page?.users?.find((u) => u.email === a.email);
  let uid = found?.id;
  if (uid) {
    const { error } = await db.auth.admin.updateUserById(uid, { password: pw });
    if (error) console.log(`${a.email}: password reset failed — ${error.message}`);
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: a.email,
      password: pw,
      email_confirm: true,
      user_metadata: { full_name: a.email.split("@")[0] },
    });
    if (error) { console.log(`${a.email}: create failed — ${error.message}`); continue; }
    uid = data.user.id;
    // give the 0001 signup trigger a beat to create tenant + users row
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (a.promote && uid) {
    const { error } = await db.from("users").update({ role: a.promote }).eq("auth_id", uid);
    console.log(error ? `${a.email}: promote failed — ${error.message}` : `${a.email}: role=${a.promote}`);
  } else {
    console.log(`${a.email}: ready`);
  }
}
console.log("done — creds in .env.local (DEMO_SHOTS_*)");
