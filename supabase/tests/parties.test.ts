import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M1-T4 — party state machine, double-booking and role visibility. */
const run = Date.now().toString(36);
const admin = createAdminClient();

const manager = `party-mgr-${run}@test.dev`;
const receptionist = `party-rec-${run}@test.dev`;

let tenantId: string;
let packageId: string;
let shiftId: string;
const userIds: string[] = [];

/** Hoje no fuso de São Paulo, formato date. */
function todaySP(offsetDays = 0): string {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  now.setDate(now.getDate() + offsetDays);
  return now.toISOString().slice(0, 10);
}

async function createParty(date: string) {
  const client = await signInAs(manager);
  const { data, error } = await client
    .from("parties")
    .insert({
      tenant_id: tenantId,
      package_id: packageId,
      shift_id: shiftId,
      party_date: date,
    })
    .select("id, status")
    .single();
  if (error) throw error;
  return data;
}

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid, error } = await client.rpc("create_tenant", {
    p_name: "Buffet Festas",
    p_slug: `festas-${run}`,
  });
  if (error) throw error;
  tenantId = tid!;

  const { data: pkg } = await client
    .from("packages")
    .insert({
      tenant_id: tenantId,
      name: "Pacote Teste",
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

  const recId = await createTestUser(receptionist);
  userIds.push(recId);
  await client
    .from("memberships")
    .insert({ tenant_id: tenantId, user_id: recId, role: "receptionist" });
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("ciclo de vida da festa (RN-3)", () => {
  it("nasce como orçamento e segue a cadeia até realizada", async () => {
    const client = await signInAs(manager);
    const party = await createParty("2027-03-06");
    expect(party.status).toBe("budget");

    // M2-T2: confirmar exige contrato (RN-3.3)
    await client.from("contracts").insert({
      tenant_id: tenantId,
      party_id: party.id,
      total_cents: 0,
      down_payment_cents: 0,
    });

    for (const status of ["reserved", "confirmed", "completed"] as const) {
      const { data, error } = await client
        .from("parties")
        .update({ status })
        .eq("id", party.id)
        .select("status")
        .single();
      expect(error).toBeNull();
      expect(data!.status).toBe(status);
    }
  });

  it("reabertura: realizada volta para confirmada (RN-3.4)", async () => {
    const client = await signInAs(manager);
    const { error } = await client
      .from("parties")
      .update({ status: "confirmed" })
      .eq("tenant_id", tenantId)
      .eq("status", "completed");
    expect(error).toBeNull();
    // limpa para os próximos testes liberarem o turno
    await admin
      .from("parties")
      .update({ status: "canceled" })
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed");
  });

  it("transição inválida é rejeitada pelo trigger", async () => {
    const party = await createParty("2027-03-13");
    const client = await signInAs(manager);
    const { error } = await client
      .from("parties")
      .update({ status: "completed" }) // budget → completed: proibido
      .eq("id", party.id);
    expect(error).not.toBeNull();
    expect(error!.message).toContain("invalid_party_transition");
  });
});

describe("double-booking (RN-2.4) — critério do M1", () => {
  const date = "2027-04-10";

  it("orçamentos coexistem no mesmo turno/data", async () => {
    await createParty(date);
    await createParty(date);
    const client = await signInAs(manager);
    const { data } = await client
      .from("parties")
      .select("id")
      .eq("party_date", date);
    expect(data!.length).toBe(2);
  });

  it("impossível confirmar duas festas no mesmo turno/data", async () => {
    const client = await signInAs(manager);
    const { data: budgets } = await client
      .from("parties")
      .select("id")
      .eq("party_date", date)
      .eq("status", "budget");

    const { error: first } = await client
      .from("parties")
      .update({ status: "reserved" })
      .eq("id", budgets![0].id);
    expect(first).toBeNull();

    const { error: second } = await client
      .from("parties")
      .update({ status: "reserved" })
      .eq("id", budgets![1].id);
    expect(second).not.toBeNull();
    expect(second!.code).toBe("23505");
  });

  it("cancelamento libera o turno (RN-3.5)", async () => {
    const client = await signInAs(manager);
    await client
      .from("parties")
      .update({ status: "canceled" })
      .eq("party_date", date)
      .eq("status", "reserved");

    const { data: remaining } = await client
      .from("parties")
      .select("id")
      .eq("party_date", date)
      .eq("status", "budget");
    const { error } = await client
      .from("parties")
      .update({ status: "reserved" })
      .eq("id", remaining![0].id);
    expect(error).toBeNull();
  });
});

describe("visibilidade por papel (RN-1.3)", () => {
  it("recepcionista vê hoje/amanhã, não a semana que vem", async () => {
    await createParty(todaySP());
    await createParty(todaySP(7));

    const client = await signInAs(receptionist);
    const { data } = await client.from("parties").select("party_date");
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((p) => p.party_date <= todaySP(1))).toBe(true);
  });
});

describe("audit_logs (NF-6)", () => {
  it("gestor registra auditoria; update/delete não têm grant", async () => {
    const client = await signInAs(manager);
    const {
      data: { user },
    } = await client.auth.getUser();

    const { data: log, error } = await client
      .from("audit_logs")
      .insert({
        tenant_id: tenantId,
        user_id: user!.id,
        action: "reopen_party",
        entity: "parties",
        entity_id: crypto.randomUUID(),
        reason: "teste de auditoria",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    const { error: updateError } = await client
      .from("audit_logs")
      .update({ reason: "alterado" })
      .eq("id", log!.id);
    expect(updateError).not.toBeNull();
  });
});
