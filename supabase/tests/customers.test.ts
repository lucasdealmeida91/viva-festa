import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M2-T1 — customers/birthday_children: LGPD + RLS. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `cust-mgr-${run}@test.dev`;
const outsider = `cust-out-${run}@test.dev`;

let tenantId: string;
let customerId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Clientes",
    p_slug: `clientes-${run}`,
  });
  tenantId = tid!;

  userIds.push(await createTestUser(outsider));
  const outsiderClient = await signInAs(outsider);
  await outsiderClient.rpc("create_tenant", {
    p_name: "Outro",
    p_slug: `clientes-out-${run}`,
  });
}, 30_000);

afterAll(async () => {
  await admin
    .from("tenants")
    .delete()
    .in("slug", [`clientes-${run}`, `clientes-out-${run}`]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("clientes e aniversariantes (M2-T1)", () => {
  it("gestor cadastra cliente com aniversariante (mês/ano)", async () => {
    const client = await signInAs(manager);
    const { data: customer, error } = await client
      .from("customers")
      .insert({
        tenant_id: tenantId,
        name: "Maria Souza",
        phone: "11 98888-7777",
        email: `maria-${run}@test.dev`,
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    customerId = customer!.id;

    const { error: childError } = await client.from("birthday_children").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      name: "Joãozinho",
      birth_month: 7,
      birth_year: 2020,
    });
    expect(childError).toBeNull();
  });

  it("LGPD: não existe coluna de data completa de nascimento (aceite)", async () => {
    const { error } = await admin.from("birthday_children").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      name: "Tentativa",
      birth_month: 1,
      birth_year: 2020,
      // @ts-expect-error — a coluna não deve existir; o insert deve falhar
      birth_date: "2020-01-15",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/birth_date/);
  });

  it("mês fora de 1–12 é rejeitado pelo CHECK", async () => {
    const client = await signInAs(manager);
    const { error } = await client.from("birthday_children").insert({
      tenant_id: tenantId,
      customer_id: customerId,
      name: "Inválido",
      birth_month: 13,
      birth_year: 2020,
    });
    expect(error).not.toBeNull();
  });

  it("clientes não vazam entre tenants (NF-1)", async () => {
    const client = await signInAs(outsider);
    const { data: customers } = await client.from("customers").select("id");
    expect(customers).toEqual([]);
    const { data: children } = await client
      .from("birthday_children")
      .select("id");
    expect(children).toEqual([]);
  });

  it("e-mail duplicado no mesmo tenant é rejeitado", async () => {
    const client = await signInAs(manager);
    const { error } = await client.from("customers").insert({
      tenant_id: tenantId,
      name: "Maria Clone",
      email: `maria-${run}@test.dev`,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });
});
