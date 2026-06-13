import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createAnonClient, createTestUser, signInAs } from "./helpers";

/** M3-T4/T5 — find_guest + submit_rsvp: companions, modes, deadline. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `rsvp-mgr-${run}@test.dev`;
const slug = `rsvp-${run}`;
const token = `tok${run}`;

let tenantId: string;
let partyId: string;
let titularId: string;
const userIds: string[] = [];

async function makeParty(listMode: "closed" | "open", deadline: string | null) {
  await admin.from("parties").update({
    list_mode: listMode, rsvp_deadline: deadline,
  }).eq("id", partyId);
}

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid, error: tErr } = await client.rpc("create_tenant", {
    p_name: "Buffet RSVP",
    p_slug: slug,
  });
  if (tErr) throw tErr;
  tenantId = tid!;
  const { data: pkg } = await client.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id").single();
  const { data: shift } = await client.from("shifts").insert({
    tenant_id: tenantId, weekday: 6, label: "Sáb", starts_at: "12:00", ends_at: "16:00",
  }).select("id").single();
  const { data: party } = await client.from("parties").insert({
    tenant_id: tenantId, package_id: pkg!.id, shift_id: shift!.id, party_date: "2027-10-02",
  }).select("id").single();
  partyId = party!.id;

  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: partyId, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", partyId);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", partyId);
  await admin.from("parties").update({
    invite_token: token, invite_published: true,
  }).eq("id", partyId);

  const { data: titular } = await admin.from("guests").insert({
    tenant_id: tenantId, party_id: partyId, name: "Ana Souza",
  }).select("id").single();
  titularId = titular!.id;
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("find_guest (RN-6.3)", () => {
  it("encontra pelo próprio nome", async () => {
    const anon = createAnonClient();
    const { data } = await anon.rpc("find_guest", {
      p_slug: slug, p_token: token, p_name: "ana",
    });
    expect(data).toHaveLength(1);
    expect(data![0].guest_name).toBe("Ana Souza");
  });
});

describe("submit_rsvp (RN-6.3/6.7) — aceite do M3-T4", () => {
  it("confirma + 2 acompanhantes; totalizadores do gestor refletem", async () => {
    const anon = createAnonClient();
    await makeParty("closed", null);
    const { error } = await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "confirmed", p_guest_id: titularId,
      p_companions: [{ name: "Bia", age: "9" }, { name: "Léo", age: "35" }],
    });
    expect(error).toBeNull();

    const client = await signInAs(manager);
    const { data: guests } = await client
      .from("guests").select("name, age, origin, companion_of")
      .eq("party_id", partyId);
    expect(guests!.length).toBe(3); // titular + 2 acompanhantes
    const companions = guests!.filter((g) => g.companion_of === titularId);
    expect(companions.map((c) => c.name).sort()).toEqual(["Bia", "Léo"]);
  });

  it("alterar resposta reescreve os acompanhantes (RN-6.7)", async () => {
    const anon = createAnonClient();
    await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "confirmed", p_guest_id: titularId, p_companions: [{ name: "Só um", age: "" }],
    });
    const client = await signInAs(manager);
    const { data } = await client.from("guests")
      .select("id").eq("companion_of", titularId);
    expect(data).toHaveLength(1);
  });

  it("recusar remove os acompanhantes", async () => {
    const anon = createAnonClient();
    await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "declined", p_guest_id: titularId, p_companions: [],
    });
    const client = await signInAs(manager);
    const { data } = await client.from("guests")
      .select("id").eq("companion_of", titularId);
    expect(data).toEqual([]);
  });
});

describe("modos de lista e prazo (RN-6.5/6.6) — aceite do M3-T5", () => {
  it("lista fechada: auto-cadastro é rejeitado", async () => {
    const anon = createAnonClient();
    await makeParty("closed", null);
    const { error } = await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "confirmed", p_guest_name: "Intruso", p_companions: [],
    });
    expect(error).not.toBeNull();
  });

  it("lista aberta: auto-cadastro entra como self_registered", async () => {
    const anon = createAnonClient();
    await makeParty("open", null);
    const { error } = await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "confirmed", p_guest_name: "Novo Convidado", p_companions: [],
    });
    expect(error).toBeNull();
    const client = await signInAs(manager);
    const { data } = await client.from("guests")
      .select("origin").eq("name", "Novo Convidado").single();
    expect(data!.origin).toBe("self_registered");
  });

  it("após o prazo, nenhuma confirmação é aceita (verificado via RPC)", async () => {
    const anon = createAnonClient();
    await makeParty("closed", "2020-01-01"); // prazo no passado
    const { error } = await anon.rpc("submit_rsvp", {
      p_slug: slug, p_token: token, p_response: "confirmed", p_guest_id: titularId, p_companions: [],
    });
    expect(error).not.toBeNull();
    expect(error!.message).toContain("rsvp_closed");
  });
});
