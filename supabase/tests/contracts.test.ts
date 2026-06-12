import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M2-T2 — contracts: confirmed requires contract; atomic RPC. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `ctr-mgr-${run}@test.dev`;

let tenantId: string;
let packageId: string;
let shiftId: string;
let customerId: string;
const userIds: string[] = [];

async function newReservedParty(date: string) {
  const client = await signInAs(manager);
  const { data: party } = await client
    .from("parties")
    .insert({
      tenant_id: tenantId,
      package_id: packageId,
      shift_id: shiftId,
      party_date: date,
    })
    .select("id")
    .single();
  await client
    .from("parties")
    .update({ status: "reserved" })
    .eq("id", party!.id);
  return party!.id;
}

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Contratos",
    p_slug: `contratos-${run}`,
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
  packageId = pkg!.id;

  const { data: shift } = await client
    .from("shifts")
    .insert({
      tenant_id: tenantId,
      weekday: 6,
      label: "Sábado",
      starts_at: "12:00",
      ends_at: "16:00",
    })
    .select("id")
    .single();
  shiftId = shift!.id;

  const { data: customer } = await client
    .from("customers")
    .insert({ tenant_id: tenantId, name: "Cliente Contrato" })
    .select("id")
    .single();
  customerId = customer!.id;
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("contrato obrigatório (RN-3.3) — aceite do M2", () => {
  it("não existe festa confirmada sem contrato", async () => {
    const partyId = await newReservedParty("2027-06-05");
    const client = await signInAs(manager);
    const { error } = await client
      .from("parties")
      .update({ status: "confirmed" })
      .eq("id", partyId);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("contract_required");
  });

  it("RPC confirma atomicamente: contrato + parcelas + cliente + congelamento", async () => {
    const partyId = await newReservedParty("2027-06-12");
    const client = await signInAs(manager);

    const { data: contractId, error } = await client.rpc(
      "confirm_party_with_contract",
      {
        p_party_id: partyId,
        p_customer_id: customerId,
        p_total_cents: 550000,
        p_down_payment_cents: 100000,
        p_installments: [
          { kind: "down_payment", due_date: "2026-06-12", amount_cents: 100000 },
          { kind: "regular", due_date: "2026-07-12", amount_cents: 225000 },
          { kind: "regular", due_date: "2026-08-12", amount_cents: 225000 },
        ] as never,
      },
    );
    expect(error).toBeNull();
    expect(contractId).toBeTruthy();

    const { data: party } = await client
      .from("parties")
      .select("status, customer_id, rule_adult_age")
      .eq("id", partyId)
      .single();
    expect(party!.status).toBe("confirmed");
    expect(party!.customer_id).toBe(customerId);
    expect(party!.rule_adult_age).toBe(13); // congelamento disparou (RN-4.5)

    const { data: installments } = await client
      .from("installments")
      .select("amount_cents")
      .eq("contract_id", contractId!);
    expect(installments).toHaveLength(3);
  });

  it("RPC rejeita soma de parcelas que não fecha com o total", async () => {
    const partyId = await newReservedParty("2027-06-19");
    const client = await signInAs(manager);
    const { error } = await client.rpc("confirm_party_with_contract", {
      p_party_id: partyId,
      p_customer_id: customerId,
      p_total_cents: 100000,
      p_down_payment_cents: 0,
      p_installments: [
        { kind: "regular", due_date: "2026-07-12", amount_cents: 50000 },
      ] as never,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("installments_sum_mismatch");
  });

  it("um contrato por festa (unique)", async () => {
    const client = await signInAs(manager);
    const { data: party } = await client
      .from("parties")
      .select("id")
      .eq("status", "confirmed")
      .limit(1)
      .single();

    const { error } = await client.from("contracts").insert({
      tenant_id: tenantId,
      party_id: party!.id,
      total_cents: 1,
      down_payment_cents: 0,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe("23505");
  });
});
