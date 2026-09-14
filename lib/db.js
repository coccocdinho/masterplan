import "server-only";
import { createClient } from "@supabase/supabase-js";

let client = null;

export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env.local and fill them in."
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
