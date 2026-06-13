import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";
import { countByCategory } from "../../lib/domain/classify";
import { computeOverage } from "../../lib/domain/overage";

/** M4-T4 — encerramento + excedente, incluindo o caso canônico (R$360). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `cls-mgr-${run}@test.dev`;
const receptionist = `cls-rec-${run}@test.dev`;

let tenantId: string;
let pkgId: string;
let shiftId: string;
const userIds: string[] = [];

async function confirmedParty(date = "2027-11-06") {
  const { data: party } = await admin
    .from("parties")
    .insert({ tenant_id: tenantId, package_id: pkgId, shift_id: shiftId, party_date: date })
    .select("id").single();
  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: party!.id, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", party!.id);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", party!.id);
  return party!.id;
}

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Encerramento", p_slug: `closing-${run}`,
  });
  tenantId = tid!;
  // pacote do exemplo canônico (RN-4): 50/30, isenção<8, adulto>=13, R$90/55
  const { data: pkg } = await client.from("packages").insert({
    tenant_id: tenantId, name: "Festa Top", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 550000, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id").single();
  pkgId = pkg!.id;
  const { data: shift } = await client.from("shifts").insert({
    tenant_id: tenantId, weekday: 6, label: "S", starts_at: "12:00", ends_at: "16:00",
  }).select("id").single();
  shiftId = shift!.id;

  const recId = await createTestUser(receptionist);
  userIds.push(recId);
  await admin.from("memberships").insert({
    tenant_id: tenantId, user_id: recId, role: "receptionist",
  });
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("encerramento (RN-8) — caso canônico R$360", () => {
  it("54 adultos + 28 crianças + 9 isentos presentes → R$360 de excedente", async () => {
    const partyId = await confirmedParty();
    // presentes: idades determinísticas por categoria
    const present = [
      ...Array.from({ length: 54 }, (_, i) => ({ name: `A${i}`, age: 30, attendance: "present" as const })),
      ...Array.from({ length: 28 }, (_, i) => ({ name: `C${i}`, age: 10, attendance: "present" as const })),
      ...Array.from({ length: 9 }, (_, i) => ({ name: `I${i}`, age: 5, attendance: "present" as const })),
    ];
    // mais 3 convidados SEM check-in → viram ausentes no encerramento
    await admin.from("guests").insert([
      ...present.map((g) => ({ tenant_id: tenantId, party_id: partyId, ...g })),
      { tenant_id: tenantId, party_id: partyId, name: "Faltou1" },
      { tenant_id: tenantId, party_id: partyId, name: "Faltou2" },
      { tenant_id: tenantId, party_id: partyId, name: "Faltou3" },
    ]);

    // computa como a server action (lib/domain — AD-2)
    const rules = { exemptAge: 8, adultAge: 13 };
    const counts = countByCategory(present.map((g) => g.age), rules);
    const overage = computeOverage(counts, {
      adultCapacity: 50, childCapacity: 30,
      extraAdultPriceCents: 9000, extraChildPriceCents: 5500,
    });
    expect(overage.totalCents).toBe(36000); // R$360 (sanidade)

    const mgr = await signInAs(manager);
    const { error } = await mgr.rpc("close_party", {
      p_party_id: partyId,
      p_snapshot: { counts, present },
      p_overage_adults: overage.overageAdults,
      p_overage_children: overage.overageChildren,
      p_overage_total_cents: overage.totalCents,
    });
    expect(error).toBeNull();

    const { data: party } = await admin
      .from("parties")
      .select("status, overage_total_cents, overage_adults, completed_at, closing_snapshot")
      .eq("id", partyId).single();
    expect(party!.status).toBe("completed");
    expect(party!.overage_total_cents).toBe(36000);
    expect(party!.overage_adults).toBe(4);
    expect(party!.completed_at).not.toBeNull();
    expect(party!.closing_snapshot).not.toBeNull();

    // os 3 sem check-in viraram ausentes (RN-8.1a)
    const { data: absent } = await admin.from("guests")
      .select("id").eq("party_id", partyId).eq("attendance", "absent");
    expect(absent).toHaveLength(3);
  });

  it("recepcionista não encerra (só gestor — RN-8.1)", async () => {
    const partyId = await confirmedParty("2027-11-13");
    const rec = await signInAs(receptionist);
    const { error } = await rec.rpc("close_party", {
      p_party_id: partyId, p_snapshot: {},
      p_overage_adults: 0, p_overage_children: 0, p_overage_total_cents: 0,
    });
    expect(error).not.toBeNull();
  });

  it("festa encerrada congela a lista (RN-5.4)", async () => {
    const partyId = await confirmedParty("2027-11-20");
    const mgr = await signInAs(manager);
    await mgr.rpc("close_party", {
      p_party_id: partyId, p_snapshot: {},
      p_overage_adults: 0, p_overage_children: 0, p_overage_total_cents: 0,
    });
    const { error } = await mgr.from("guests").insert({
      tenant_id: tenantId, party_id: partyId, name: "Tarde",
    });
    expect(error).not.toBeNull();
  });

  it("decisão de ajuste do excedente é auditada (RN-8.4/NF-6)", async () => {
    const partyId = await confirmedParty("2027-11-27");
    const mgr = await signInAs(manager);
    await mgr.rpc("close_party", {
      p_party_id: partyId, p_snapshot: {},
      p_overage_adults: 4, p_overage_children: 0, p_overage_total_cents: 36000,
    });
    const { error } = await mgr.rpc("decide_overage", {
      p_party_id: partyId, p_decision: "adjusted",
      p_amount_cents: 20000, p_reason: "desconto negociado",
    });
    expect(error).toBeNull();

    const { data: party } = await admin.from("parties")
      .select("overage_decision, overage_total_cents").eq("id", partyId).single();
    expect(party!.overage_decision).toBe("adjusted");
    expect(party!.overage_total_cents).toBe(20000);

    const { data: audit } = await admin.from("audit_logs")
      .select("action").eq("entity_id", partyId).eq("action", "decide_overage");
    expect(audit!.length).toBeGreaterThan(0);
  });
});
