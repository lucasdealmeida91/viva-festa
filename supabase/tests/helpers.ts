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

export const TEST_PASSWORD = "test-password-123";

/**
 * Creates a confirmed auth user via the admin API. Returns the user id.
 * The handle_new_user trigger creates the matching profile automatically.
 */
export async function createTestUser(email: string, fullName = "Test User") {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

/** RLS-scoped client authenticated as the given test user. */
export async function signInAs(email: string) {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  return client;
}
