import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M1-T6 — RN-4.5/RN-4.6: regras congeladas na confirmação. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `frz-mgr-${run}@test.dev`;

let tenantId: string;
let packageId: string;
let shiftId: string;
let partyId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Freeze",
    p_slug: `freeze-${run}`,
  });
  tenantId = tid!;

  const { data: pkg } = await client
    .from("packages")
    .insert({
      tenant_id: tenantId,
      name: "Pacote Canônico",
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
  packageId = pkg!.id;

  const { data: shift } = await client
    .from("shifts")
    .insert({
      tenant_id: tenantId,
      weekday: 6,
      label: "Sábado tarde",
      starts_at: "12:00",
      ends_at: "16:00",
    })
    .select("id")
    .single();
  shiftId = shift!.id;

  const { data: party } = await client
    .from("parties")
    .insert({
      tenant_id: tenantId,
      package_id: packageId,
      shift_id: shiftId,
      party_date: "2027-05-01",
    })
    .select("id")
    .single();
  partyId = party!.id;
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("congelamento de regras (RN-4.5) — critério do M1", () => {
  it("confirmação copia os parâmetros do pacote para a festa", async () => {
    const client = await signInAs(manager);
    await client.from("parties").update({ status: "reserved" }).eq("id", partyId);
    await client
      .from("parties")
      .update({ status: "confirmed" })
      .eq("id", partyId);

    const { data: party } = await client
      .from("parties")
      .select("rule_exempt_age, rule_adult_age, rule_adult_capacity")
      .eq("id", partyId)
      .single();
    expect(party).toEqual({
      rule_exempt_age: 8,
      rule_adult_age: 13,
      rule_adult_capacity: 50,
    });
  });

  it("alterar o pacote depois NÃO altera a festa confirmada (aceite do PRD)", async () => {
    const client = await signInAs(manager);
    const { error } = await client
      .from("packages")
      .update({ exempt_age: 5, adult_age: 18, adult_capacity: 100 })
      .eq("id", packageId);
    expect(error).toBeNull();

    const { data: party } = await client
      .from("parties")
      .select("rule_exempt_age, rule_adult_age, rule_adult_capacity")
      .eq("id", partyId)
      .single();
    expect(party).toEqual({
      rule_exempt_age: 8,
      rule_adult_age: 13,
      rule_adult_capacity: 50,
    });
  });

  it("reabertura não recongela (mantém os valores originais)", async () => {
    const client = await signInAs(manager);
    await client
      .from("parties")
      .update({ status: "completed" })
      .eq("id", partyId);
    await client
      .from("parties")
      .update({ status: "confirmed" })
      .eq("id", partyId);

    const { data: party } = await client
      .from("parties")
      .select("rule_adult_age")
      .eq("id", partyId)
      .single();
    expect(party!.rule_adult_age).toBe(13); // não virou 18
  });

  it("sobrescrita por festa (RN-4.6) altera só a festa", async () => {
    const client = await signInAs(manager);
    const { error } = await client
      .from("parties")
      .update({ rule_adult_capacity: 60 })
      .eq("id", partyId);
    expect(error).toBeNull();

    const { data: pkg } = await client
      .from("packages")
      .select("adult_capacity")
      .eq("id", packageId)
      .single();
    expect(pkg!.adult_capacity).toBe(100); // pacote intocado pela sobrescrita
  });

  it("regras congeladas inválidas são rejeitadas pelo CHECK", async () => {
    const client = await signInAs(manager);
    const { error } = await client
      .from("parties")
      .update({ rule_exempt_age: 15 }) // 15 >= rule_adult_age 13
      .eq("id", partyId);
    expect(error).not.toBeNull();
  });
});
