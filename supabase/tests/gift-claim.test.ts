import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createAnonClient, createTestUser, signInAs } from "./helpers";

/** M6-T2 — escolha de presente pelo convidado (RN-13.2). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `gc-mgr-${run}@test.dev`;
const slug = `gc-${run}`;
const token = `tok${run}`;

let tenantId: string;
let partyId: string;
let giftId: string;
let confirmedGuest: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", { p_name: "Buffet GC", p_slug: slug });
  tenantId = tid!;
  const { data: pkg } = await mgr.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id").single();
  const { data: shift } = await mgr.from("shifts").insert({
    tenant_id: tenantId, weekday: 6, label: "S", starts_at: "12:00", ends_at: "16:00",
  }).select("id").single();
  const { data: party } = await mgr.from("parties").insert({
    tenant_id: tenantId, package_id: pkg!.id, shift_id: shift!.id, party_date: "2027-12-04",
  }).select("id").single();
  partyId = party!.id;
  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: partyId, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", partyId);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", partyId);
  await admin.from("parties").update({ invite_token: token, invite_published: true }).eq("id", partyId);

  const { data: gift } = await admin.from("gift_items").insert({
    tenant_id: tenantId, party_id: partyId, name: "Bicicleta",
  }).select("id").single();
  giftId = gift!.id;

  // um confirmado e um só convidado (não confirmado)
  const { data: c } = await admin.from("guests").insert({
    tenant_id: tenantId, party_id: partyId, name: "Ana Confirmada", rsvp_status: "confirmed",
  }).select("id").single();
  confirmedGuest = c!.id;
  await admin.from("guests").insert({
    tenant_id: tenantId, party_id: partyId, name: "Bia Convidada", rsvp_status: "invited",
  });
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("escolha de presente (RN-13.2)", () => {
  it("anon lista presentes não escolhidos", async () => {
    const anon = createAnonClient();
    const { data } = await anon.rpc("list_gifts", { p_slug: slug, p_token: token });
    expect(data!.map((g: { name: string }) => g.name)).toEqual(["Bicicleta"]);
  });

  it("convidado não confirmado não pode escolher", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("claim_gift", {
      p_slug: slug, p_token: token, p_gift_id: giftId, p_guest_name: "Bia Convidada",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("guest_not_confirmed");
  });

  it("convidado confirmado escolhe; item some da lista pública", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("claim_gift", {
      p_slug: slug, p_token: token, p_gift_id: giftId, p_guest_name: "Ana Confirmada",
    });
    expect(error).toBeNull();

    const { data: stillPublic } = await anon.rpc("list_gifts", { p_slug: slug, p_token: token });
    expect(stillPublic).toEqual([]);

    // anfitrião (admin/gestor) vê quem escolheu
    const { data: gift } = await admin.from("gift_items")
      .select("claimed_by_guest_id").eq("id", giftId).single();
    expect(gift!.claimed_by_guest_id).toBe(confirmedGuest);
  });

  it("presente já escolhido não pode ser reivindicado de novo", async () => {
    const anon = createAnonClient();
    const { error } = await anon.rpc("claim_gift", {
      p_slug: slug, p_token: token, p_gift_id: giftId, p_guest_name: "Ana Confirmada",
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("already_claimed");
  });
});
