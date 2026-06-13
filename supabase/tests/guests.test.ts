import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M3-T1 — guests: RLS, frozen list, classification never stored. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `gst-mgr-${run}@test.dev`;
const outsider = `gst-out-${run}@test.dev`;

let tenantId: string;
let partyId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Convidados",
    p_slug: `convidados-${run}`,
  });
  tenantId = tid!;

  const { data: pkg } = await client
    .from("packages")
    .insert({
      tenant_id: tenantId,
      name: "Pacote",
      adult_capacity: 50,
      child_capacity: 30,
      base_price_cents: 550000,
      exempt_age: 8,
      adult_age: 13,
      extra_adult_price_cents: 9000,
      extra_child_price_cents: 5500,
    })
    .select("id")
    .single();
  const { data: shift } = await client
    .from("shifts")
    .insert({
      tenant_id: tenantId,
      weekday: 6,
      label: "Sáb",
      starts_at: "12:00",
      ends_at: "16:00",
    })
    .select("id")
    .single();
  const { data: party } = await client
    .from("parties")
    .insert({
      tenant_id: tenantId,
      package_id: pkg!.id,
      shift_id: shift!.id,
      party_date: "2027-08-07",
    })
    .select("id")
    .single();
  partyId = party!.id;

  userIds.push(await createTestUser(outsider));
  const outsiderClient = await signInAs(outsider);
  await outsiderClient.rpc("create_tenant", {
    p_name: "Outro",
    p_slug: `convidados-out-${run}`,
  });
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin
    .from("tenants")
    .delete()
    .in("slug", [`convidados-${run}`, `convidados-out-${run}`]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("convidados (M3-T1)", () => {
  it("gestor adiciona convidado com idade; classificação não é coluna", async () => {
    const client = await signInAs(manager);
    const { data, error } = await client
      .from("guests")
      .insert({
        tenant_id: tenantId,
        party_id: partyId,
        name: "Joãozinho",
        age: 5,
      })
      .select("id, age")
      .single();
    expect(error).toBeNull();
    expect(data!.age).toBe(5);
    expect(data).not.toHaveProperty("classification");
  });

  it("idade pode ser nula (sem idade informada — RN-5.2)", async () => {
    const client = await signInAs(manager);
    const { error } = await client.from("guests").insert({
      tenant_id: tenantId,
      party_id: partyId,
      name: "Sem Idade",
      age: null,
    });
    expect(error).toBeNull();
  });

  it("convidados não vazam entre tenants (NF-1)", async () => {
    const client = await signInAs(outsider);
    const { data } = await client.from("guests").select("id");
    expect(data).toEqual([]);
  });

  it("lista congela quando a festa é encerrada (RN-5.4)", async () => {
    // leva a festa a completed via cadeia + contrato
    await admin
      .from("contracts")
      .insert({ tenant_id: tenantId, party_id: partyId, total_cents: 0 });
    await admin
      .from("parties")
      .update({ status: "reserved" })
      .eq("id", partyId);
    await admin
      .from("parties")
      .update({ status: "confirmed" })
      .eq("id", partyId);
    await admin
      .from("parties")
      .update({ status: "completed" })
      .eq("id", partyId);

    const client = await signInAs(manager);
    const { error } = await client.from("guests").insert({
      tenant_id: tenantId,
      party_id: partyId,
      name: "Tarde demais",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("guest_list_frozen");
  });
});
