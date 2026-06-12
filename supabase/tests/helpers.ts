import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Fallbacks are the Supabase CLI shared local defaults — identical on every
// machine, not secrets. Real environments always come from env vars.
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

/** Client with the publishable key: subject to RLS, like the app at runtime. */
export function createAnonClient() {
  return createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY);
}

/** Client with the secret key: bypasses RLS. Test setup/teardown only. */
export function createAdminClient() {
  return createClient<Database>(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
