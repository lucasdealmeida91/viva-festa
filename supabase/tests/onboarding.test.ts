import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createTestUser,
  signInAs,
} from "./helpers";

/**
 * M0-T2 — onboarding RPC. Acceptance: two independent signups create two
 * fully isolated tenants (extends the F0-T7 harness).
 */
const run = Date.now().toString(36);
const admin = createAdminClient();

const owner1 = `owner-1-${run}@test.dev`;
const owner2 = `owner-2-${run}@test.dev`;
const userIds: string[] = [];
const slug1 = `buffet-um-${run}`;
const slug2 = `buffet-dois-${run}`;

beforeAll(async () => {
  userIds.push(await createTestUser(owner1, "Dona Um"));
  userIds.push(await createTestUser(owner2, "Dono Dois"));
}, 30_000);

afterAll(async () => {
  await admin.from("tenants").delete().in("slug", [slug1, slug2]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("create_tenant RPC (M0-T2)", () => {
  it("cria tenant com membership manager e trial de 14 dias (RN-11.1)", async () => {
    const client = await signInAs(owner1);
    const { data: tenantId, error } = await client.rpc("create_tenant", {
      p_name: "Buffet Um",
      p_slug: slug1,
    });
    expect(error).toBeNull();
    expect(tenantId).toBeTruthy();

    const { data: tenant } = await client
      .from("tenants")
      .select("slug, subscription_status, trial_ends_at")
      .eq("id", tenantId!)
      .single();
    expect(tenant!.slug).toBe(slug1);
    expect(tenant!.subscription_status).toBe("trialing");

    const trialDays =
      (new Date(tenant!.trial_ends_at).getTime() - Date.now()) / 86_400_000;
    expect(trialDays).toBeGreaterThan(13.9);
    expect(trialDays).toBeLessThan(14.1);

    const { data: membership } = await client
      .from("memberships")
      .select("role, tenant_id")
      .single();
    expect(membership!.role).toBe("manager");
    expect(membership!.tenant_id).toBe(tenantId);
  });

  it("dois cadastros independentes criam tenants isolados (aceite M0-T2)", async () => {
    const client2 = await signInAs(owner2);
    const { error } = await client2.rpc("create_tenant", {
      p_name: "Buffet Dois",
      p_slug: slug2,
    });
    expect(error).toBeNull();

    const { data: visible2 } = await client2.from("tenants").select("slug");
    expect(visible2!.map((t) => t.slug)).toEqual([slug2]);

    const client1 = await signInAs(owner1);
    const { data: visible1 } = await client1.from("tenants").select("slug");
    expect(visible1!.map((t) => t.slug)).toEqual([slug1]);
  });

  it("anon não chama a RPC", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("create_tenant", {
      p_name: "Hacker",
      p_slug: `hacker-${run}`,
    });
    expect(error).not.toBeNull();
  });

  it("slug duplicado é rejeitado", async () => {
    const client = await signInAs(owner2);
    const { error } = await client.rpc("create_tenant", {
      p_name: "Clone",
      p_slug: slug1,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });

  it("slug reservado é rejeitado (RN-1.4)", async () => {
    const client = await signInAs(owner2);
    const { error } = await client.rpc("create_tenant", {
      p_name: "Invasor",
      p_slug: "checkin",
    });
    expect(error).not.toBeNull();
  });
});
