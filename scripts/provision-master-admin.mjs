// Provision / repair the master super-admin account.
// Usage: node scripts/provision-master-admin.mjs <email> <password>
// Needs SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL in apps/web/.env.local
// (dotenv-free: we read the file ourselves).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const [EMAIL, PASSWORD] = process.argv.slice(2);
if (!EMAIL || !PASSWORD) {
  console.error("usage: node provision-master-admin.mjs <email> <password>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = readFileSync(join(root, "apps/web/.env.local"), "utf8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const MGMT_TOKEN = "sbp_fcb79eab0f525f8af196a22911af900cb998ef56";
const PROJECT = URL.match(/https:\/\/([^.]+)\./)[1];
const TENANT = "00000000-0000-4000-8000-000000000001";

const mgmtQuery = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { authorization: `Bearer ${MGMT_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`mgmt ${r.status}: ${JSON.stringify(j)}`);
  return j;
};

const authHeaders = { apikey: SRK, authorization: `Bearer ${SRK}`, "content-type": "application/json" };

// 1. platform tenant
await mgmtQuery(`update tenants set account_kind='platform' where id='${TENANT}'`);
console.log("1. tenant -> platform");

// 2. auth user (create, or update password if it exists)
let authId;
const create = await fetch(`${URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
});
if (create.ok) {
  authId = (await create.json()).id;
  console.log("2. auth user created:", authId);
} else {
  const list = await (await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: authHeaders })).json();
  const existing = (list.users ?? []).find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (!existing) throw new Error(`auth create failed ${create.status} and user not found`);
  const upd = await fetch(`${URL}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers: authHeaders,
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });
  if (!upd.ok) throw new Error(`auth update failed ${upd.status}`);
  authId = existing.id;
  console.log("2. auth user updated:", authId);
}

// 3. users row
const existing = await mgmtQuery(`select id from users where lower(email)='${EMAIL.toLowerCase()}'`);
if (existing.length) {
  await mgmtQuery(
    `update users set role='super_admin', auth_id='${authId}', tenant_id='${TENANT}', status='active'
     where lower(email)='${EMAIL.toLowerCase()}'`,
  );
} else {
  await mgmtQuery(
    `insert into users (tenant_id, auth_id, email, full_name, role, status, permissions)
     values ('${TENANT}','${authId}','${EMAIL}','Munya Muzvidziwa','super_admin','active','[]'::jsonb)`,
  );
}
console.log("3. users row: super_admin");

// 4. delete/demote protection
await mgmtQuery(`
create or replace function protect_master_admin() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and lower(old.email) = '${EMAIL.toLowerCase()}' then
    raise exception 'master admin account cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and lower(old.email) = '${EMAIL.toLowerCase()}' and (new.role <> 'super_admin' or new.status <> 'active') then
    raise exception 'master admin role/status cannot be changed';
  end if;
  return coalesce(new, old);
end; $$;
drop trigger if exists trg_protect_master_admin on public.users;
create trigger trg_protect_master_admin before delete or update on public.users
  for each row execute function protect_master_admin();
`);
console.log("4. protection trigger installed");

// 5. verify
const v = await mgmtQuery(
  `select u.email, u.role, u.status, t.account_kind
   from users u join tenants t on t.id=u.tenant_id where lower(u.email)='${EMAIL.toLowerCase()}'`,
);
console.log("5. verified:", JSON.stringify(v));
