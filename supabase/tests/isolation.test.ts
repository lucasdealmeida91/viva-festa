import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createAdminClient,
  createAnonClient,
  createTestUser,
  signInAs,
} from "./helpers";

/**
 * NF-1 isolation harness (docs/05-testes.md §3).
 *
 * Two tenants (A and B), each with users; every milestone extends this file
 * with its new tables. The acceptance rule: cross-tenant SELECT returns
 * EMPTY (not an error), cross-tenant writes touch zero rows.
 */
const run = Date.now().toString(36);
const admin = createAdminClient();

const emails = {
  managerA: `manager-a-${run}@test.dev`,
  receptionistA: `receptionist-a-${run}@test.dev`,
  managerB: `manager-b-${run}@test.dev`,
};

let tenantA: string;
let tenantB: string;
const userIds: string[] = [];

beforeAll(async () => {
  const { data: tA, error: eA } = await admin
    .from("tenants")
    .insert({ name: "Buffet A", slug: `buffet-a-${run}` })
    .select("id")
    .single();
  if (eA) throw eA;
  tenantA = tA.id;

  const { data: tB, error: eB } = await admin
    .from("tenants")
    .insert({ name: "Buffet B", slug: `buffet-b-${run}` })
    .select("id")
    .single();
  if (eB) throw eB;
  tenantB = tB.id;

  for (const [key, email] of Object.entries(emails)) {
    // profile criado pelo trigger handle_new_user (M0-T1)
    const userId = await createTestUser(email, `Test ${key}`);
    userIds.push(userId);

    const tenantId = key.endsWith("B") ? tenantB : tenantA;
    const role = key.startsWith("manager") ? "manager" : "receptionist";
    const { error: membershipError } = await admin
      .from("memberships")
      .insert({ tenant_id: tenantId, user_id: userId, role });
    if (membershipError) throw membershipError;
  }
}, 30_000);

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id);
  }
}, 30_000);

describe("tenants — isolamento entre tenants (RN-1.1)", () => {
  it("gestor vê apenas o próprio tenant", async () => {
    const client = await signInAs(emails.managerA);
    const { data, error } = await client.from("tenants").select("id, slug");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].id).toBe(tenantA);
  });

  it("SELECT cross-tenant por id retorna vazio, não erro (aceite F0-T7)", async () => {
    const client = await signInAs(emails.managerA);
    const { data, error } = await client
      .from("tenants")
      .select("*")
      .eq("id", tenantB);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("UPDATE cross-tenant não afeta nenhuma linha", async () => {
    const client = await signInAs(emails.managerA);
    const { data } = await client
      .from("tenants")
      .update({ name: "hacked" })
      .eq("id", tenantB)
      .select();
    expect(data).toEqual([]);

    const { data: check } = await admin
      .from("tenants")
      .select("name")
      .eq("id", tenantB)
      .single();
    expect(check!.name).toBe("Buffet B");
  });

  it("gestor atualiza o próprio tenant em trial ativo", async () => {
    const client = await signInAs(emails.managerA);
    const { data, error } = await client
      .from("tenants")
      .update({ phone: "11 4002-8922" })
      .eq("id", tenantA)
      .select("phone");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("recepcionista não atualiza o tenant (RN-1.3)", async () => {
    const client = await signInAs(emails.receptionistA);
    const { data } = await client
      .from("tenants")
      .update({ name: "mudei" })
      .eq("id", tenantA)
      .select();
    expect(data).toEqual([]);
  });

  it("modo leitura bloqueia escrita no banco (AD-3 / RN-11.2)", async () => {
    await admin
      .from("tenants")
      .update({ subscription_status: "read_only" })
      .eq("id", tenantA);

    const client = await signInAs(emails.managerA);
    const { data } = await client
      .from("tenants")
      .update({ name: "não deveria" })
      .eq("id", tenantA)
      .select();
    expect(data).toEqual([]);

    await admin
      .from("tenants")
      .update({ subscription_status: "trialing" })
      .eq("id", tenantA);
  });

  it("gestor não consegue alterar o próprio subscription_status", async () => {
    const client = await signInAs(emails.managerA);
    const { error } = await client
      .from("tenants")
      .update({ subscription_status: "active" })
      .eq("id", tenantA);
    expect(error).not.toBeNull();
  });

  it("anon não vê nenhum tenant", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon.from("tenants").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("slug reservado é rejeitado pelo banco mesmo via service role", async () => {
    const { error } = await admin
      .from("tenants")
      .insert({ name: "X", slug: "admin" });
    expect(error).not.toBeNull();
  });
});

describe("memberships — visibilidade por tenant (RN-1.2)", () => {
  it("gestor vê apenas membros do próprio tenant", async () => {
    const client = await signInAs(emails.managerA);
    const { data, error } = await client
      .from("memberships")
      .select("tenant_id");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((m) => m.tenant_id === tenantA)).toBe(true);
  });

  it("gestor de outro tenant não insere membro no tenant A", async () => {
    const client = await signInAs(emails.managerB);
    const { error } = await client.from("memberships").insert({
      tenant_id: tenantA,
      user_id: userIds[2],
      role: "receptionist",
    });
    expect(error).not.toBeNull();
  });
});

describe("profiles — privacidade e privilégio (NF-4)", () => {
  it("usuário vê apenas o próprio perfil", async () => {
    const client = await signInAs(emails.managerA);
    const { data, error } = await client.from("profiles").select("user_id");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("usuário não consegue se tornar admin da plataforma", async () => {
    const client = await signInAs(emails.managerA);
    const { error } = await client
      .from("profiles")
      .update({ is_platform_admin: true })
      .eq("user_id", userIds[0]);
    expect(error).not.toBeNull();
  });
});
