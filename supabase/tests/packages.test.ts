import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M1-T2 — packages: RLS + RN-4.2 CHECK at the database level. */
const run = Date.now().toString(36);
const admin = createAdminClient();

const manager = `pkg-mgr-${run}@test.dev`;
const outsider = `pkg-out-${run}@test.dev`;

let tenantId: string;
const userIds: string[] = [];

const validPackage = {
  name: "Festa Teste",
  adult_capacity: 50,
  child_capacity: 30,
  base_price_cents: 550000,
  exempt_age: 8,
  adult_age: 13,
  extra_adult_price_cents: 9000,
  extra_child_price_cents: 5500,
};

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data, error } = await client.rpc("create_tenant", {
    p_name: "Buffet Pacotes",
    p_slug: `pacotes-${run}`,
  });
  if (error) throw error;
  tenantId = data!;

  userIds.push(await createTestUser(outsider));
  const outsiderClient = await signInAs(outsider);
  await outsiderClient.rpc("create_tenant", {
    p_name: "Outro Buffet",
    p_slug: `pacotes-out-${run}`,
  });
}, 30_000);

afterAll(async () => {
  await admin
    .from("tenants")
    .delete()
    .in("slug", [`pacotes-${run}`, `pacotes-out-${run}`]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("packages (M1-T2)", () => {
  it("gestor cria e arquiva pacote (sem delete — grant não existe)", async () => {
    const client = await signInAs(manager);
    const { data: created, error } = await client
      .from("packages")
      .insert({ tenant_id: tenantId, ...validPackage })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { data: archived } = await client
      .from("packages")
      .update({ archived: true })
      .eq("id", created!.id)
      .select("archived")
      .single();
    expect(archived!.archived).toBe(true);

    const { error: deleteError } = await client
      .from("packages")
      .delete()
      .eq("id", created!.id);
    expect(deleteError).not.toBeNull();
  });

  it("CHECK do banco rejeita exempt_age >= adult_age (aceite M1-T2 / RN-4.2)", async () => {
    // direto via service role: prova que a regra vive no banco, não só na UI
    const { error } = await admin.from("packages").insert({
      tenant_id: tenantId,
      ...validPackage,
      exempt_age: 13,
      adult_age: 13,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23514");
  });

  it("pacotes não vazam entre tenants (NF-1)", async () => {
    const client = await signInAs(outsider);
    const { data } = await client.from("packages").select("id");
    expect(data).toEqual([]);
  });
});
