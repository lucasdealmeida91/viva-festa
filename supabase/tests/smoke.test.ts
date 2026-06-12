import { describe, expect, it } from "vitest";
import { createAdminClient, createAnonClient, SUPABASE_URL } from "./helpers";

describe("local Supabase stack", () => {
  it("auth service is healthy", async () => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`);
    expect(res.status).toBe(200);
  });

  it("admin client (secret key) can call the admin API", async () => {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.listUsers();
    expect(error).toBeNull();
  });

  it("anon client (publishable key) cannot call the admin API", async () => {
    const anon = createAnonClient();
    const { error } = await anon.auth.admin.listUsers();
    expect(error).not.toBeNull();
  });
});
