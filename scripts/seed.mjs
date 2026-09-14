// Seeds the first Super Admin account. Run once after the schema is applied: `npm run seed`.
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from .env.local.
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";

function loadEnvLocal() {
  try {
    const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {}
}
loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const username = process.argv[2] || "QuanLH";
const password = process.argv[3] || "123456";

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: existing } = await sb.from("users").select("id").eq("username", username).maybeSingle();
if (existing) {
  console.log(`User "${username}" already exists (id ${existing.id}) — nothing to do.`);
  process.exit(0);
}

const pw_hash = await bcrypt.hash(password, 10);
const { data, error } = await sb
  .from("users")
  .insert({ username, role: "super", pw_hash, created_by: "system" })
  .select()
  .single();

if (error) {
  console.error("Failed to seed user:", error.message);
  process.exit(1);
}
console.log(`Seeded Super Admin "${username}" (id ${data.id}). Password: ${password}`);
