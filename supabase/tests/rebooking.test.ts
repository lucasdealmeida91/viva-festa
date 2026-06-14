import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M5-T3 — alertas de recompra gerados ao encerrar (RN-10.3/10.5). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `reb-mgr-${run}@test.dev`;

let tenantId: string;
let pkgId: string;
let shiftId: string;
let childId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", { p_name: "Buffet Recompra", p_slug: `reb-${run}` });
  tenantId = tid!;
  const { data: pkg } = await mgr.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id").single();
  pkgId = pkg!.id;
  const { data: shift } = await mgr.from("shifts").insert({
    tenant_id: tenantId, weekday: 6, label: "S", starts_at: "12:00", ends_at: "16:00",
  }).select("id").single();
  shiftId = shift!.id;
  const { data: cust } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Mãe", phone: "11 98888-0000",
  }).select("id").single();
  const { data: child } = await mgr.from("birthday_children").insert({
    tenant_id: tenantId, customer_id: cust!.id, name: "Pedrinho",
    birth_month: 7, birth_year: 2020,
  }).select("id").single();
  childId = child!.id;
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

async function completedParty(date: string) {
  const { data: p } = await admin.from("parties").insert({
    tenant_id: tenantId, package_id: pkgId, shift_id: shiftId,
    party_date: date, birthday_child_id: childId,
  }).select("id").single();
  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: p!.id, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", p!.id);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", p!.id);
  await admin.from("parties").update({ status: "completed" }).eq("id", p!.id);
  return p!.id;
}

describe("recompra (M5-T3)", () => {
  it("encerrar a festa gera 1 alerta 90 dias antes do próximo aniversário", async () => {
    const partyId = await completedParty("2026-07-15");
    const { data: alerts } = await admin.from("rebooking_alerts")
      .select("alert_date, status").eq("source_party_id", partyId);
    expect(alerts).toHaveLength(1);
    expect(alerts![0].status).toBe("pending");
    // próximo aniv: 2027-07-01; alerta 90 dias antes ≈ 2027-04-02
    expect(alerts![0].alert_date).toBe("2027-04-02");
  });

  it("gestor dispensa e converte alertas (RN-10.5)", async () => {
    const partyId = await completedParty("2026-08-20");
    const mgr = await signInAs(manager);
    const { data: alert } = await mgr.from("rebooking_alerts")
      .select("id").eq("source_party_id", partyId).single();

    const { error: dErr } = await mgr.from("rebooking_alerts")
      .update({ status: "dismissed" }).eq("id", alert!.id);
    expect(dErr).toBeNull();
    const { data: after } = await admin.from("rebooking_alerts")
      .select("status").eq("id", alert!.id).single();
    expect(after!.status).toBe("dismissed");
  });

  it("festa sem aniversariante não gera alerta", async () => {
    const { data: p } = await admin.from("parties").insert({
      tenant_id: tenantId, package_id: pkgId, shift_id: shiftId,
      party_date: "2026-09-05",
    }).select("id").single();
    await admin.from("contracts").insert({ tenant_id: tenantId, party_id: p!.id, total_cents: 0 });
    await admin.from("parties").update({ status: "reserved" }).eq("id", p!.id);
    await admin.from("parties").update({ status: "confirmed" }).eq("id", p!.id);
    await admin.from("parties").update({ status: "completed" }).eq("id", p!.id);
    const { data: alerts } = await admin.from("rebooking_alerts")
      .select("id").eq("source_party_id", p!.id);
    expect(alerts).toEqual([]);
  });
});
