import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M4-T1 — check-in RPCs: role + today/tomorrow window (RN-7, RN-1.3). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `chk-mgr-${run}@test.dev`;
const receptionist = `chk-rec-${run}@test.dev`;

let tenantId: string;
let pkgId: string;
let shiftId: string;
const userIds: string[] = [];

function spDate(offset: number) {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  now.setDate(now.getDate() + offset);
  return now.toISOString().slice(0, 10);
}

async function makeConfirmedParty(date: string) {
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
    p_name: "Buffet Checkin", p_slug: `checkin-${run}`,
  });
  tenantId = tid!;
  const { data: pkg } = await client.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
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

describe("check-in (M4-T1)", () => {
  it("recepcionista marca presente e desfaz em festa de hoje", async () => {
    const partyId = await makeConfirmedParty(spDate(0));
    const { data: guest } = await admin.from("guests")
      .insert({ tenant_id: tenantId, party_id: partyId, name: "Ana", age: 30 })
      .select("id").single();

    const rec = await signInAs(receptionist);
    const present = await rec.rpc("checkin_set_present", {
      p_guest_id: guest!.id, p_present: true,
    });
    expect(present.error).toBeNull();
    let { data: g } = await admin.from("guests")
      .select("attendance, checked_in_at").eq("id", guest!.id).single();
    expect(g!.attendance).toBe("present");
    expect(g!.checked_in_at).not.toBeNull();

    await rec.rpc("checkin_set_present", { p_guest_id: guest!.id, p_present: false });
    ({ data: g } = await admin.from("guests")
      .select("attendance, checked_in_at").eq("id", guest!.id).single());
    expect(g!.attendance).toBeNull();
    expect(g!.checked_in_at).toBeNull();
  });

  it("recepcionista NÃO marca festa fora da janela hoje/amanhã (RN-1.3)", async () => {
    const partyId = await makeConfirmedParty(spDate(10));
    const { data: guest } = await admin.from("guests")
      .insert({ tenant_id: tenantId, party_id: partyId, name: "Futuro" })
      .select("id").single();
    const rec = await signInAs(receptionist);
    const { error } = await rec.rpc("checkin_set_present", {
      p_guest_id: guest!.id, p_present: true,
    });
    expect(error).not.toBeNull();
  });

  it("marcar grupo inteiro (RN-7.2)", async () => {
    const partyId = await makeConfirmedParty(spDate(1));
    const { data: group } = await admin.from("guest_groups")
      .insert({ tenant_id: tenantId, party_id: partyId, name: "Família" })
      .select("id").single();
    await admin.from("guests").insert([
      { tenant_id: tenantId, party_id: partyId, name: "Pai", group_id: group!.id },
      { tenant_id: tenantId, party_id: partyId, name: "Mãe", group_id: group!.id },
    ]);
    const rec = await signInAs(receptionist);
    const { error } = await rec.rpc("checkin_group", {
      p_group_id: group!.id, p_present: true,
    });
    expect(error).toBeNull();
    const { data: present } = await admin.from("guests")
      .select("id").eq("group_id", group!.id).eq("attendance", "present");
    expect(present).toHaveLength(2);
  });

  it("walk-in entra presente com origin walk_in (RN-7.3)", async () => {
    const partyId = await makeConfirmedParty(spDate(0));
    const rec = await signInAs(receptionist);
    const { data: guestId, error } = await rec.rpc("checkin_add_walkin", {
      p_party_id: partyId, p_name: "Sem Convite", p_age: 40,
    });
    expect(error).toBeNull();
    const { data: g } = await admin.from("guests")
      .select("origin, attendance").eq("id", guestId!).single();
    expect(g!.origin).toBe("walk_in");
    expect(g!.attendance).toBe("present");
  });
});
