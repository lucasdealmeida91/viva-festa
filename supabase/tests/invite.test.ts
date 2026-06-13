import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createAnonClient, createTestUser, signInAs } from "./helpers";

/** M3-T3 — invite RPC privacy (RN-6.4), verified via API, not UI. */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `inv-mgr-${run}@test.dev`;
const slug = `convite-${run}`;
const token = `tok${run}`;

let tenantId: string;
let partyId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const client = await signInAs(manager);
  const { data: tid } = await client.rpc("create_tenant", {
    p_name: "Buffet Convite",
    p_slug: slug,
  });
  tenantId = tid!;

  const { data: pkg } = await client
    .from("packages")
    .insert({
      tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
      base_price_cents: 0, exempt_age: 8, adult_age: 13,
      extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
    })
    .select("id").single();
  const { data: shift } = await client
    .from("shifts")
    .insert({ tenant_id: tenantId, weekday: 6, label: "Sáb", starts_at: "12:00", ends_at: "16:00" })
    .select("id").single();
  const { data: party } = await client
    .from("parties")
    .insert({ tenant_id: tenantId, package_id: pkg!.id, shift_id: shift!.id, party_date: "2027-09-04" })
    .select("id").single();
  partyId = party!.id;

  // confirma (precisa de contrato) e publica o convite
  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: partyId, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", partyId);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", partyId);
  await admin.from("parties").update({
    invite_token: token, invite_published: true, turning_age: 6,
    host_message: "Venha!", rsvp_deadline: "2099-01-01",
  }).eq("id", partyId);

  // convidados com telefone — NÃO podem aparecer no convite público
  await admin.from("guests").insert([
    { tenant_id: tenantId, party_id: partyId, name: "Convidado Secreto", phone: "11 99999-0000" },
  ]);
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("get_invite — privacidade (RN-6.4) verificada por API", () => {
  it("anon não lê parties/guests diretamente", async () => {
    const anon = createAnonClient();
    const parties = await anon.from("parties").select("*");
    expect(parties.data).toEqual([]);
    const guests = await anon.from("guests").select("*");
    expect(guests.data).toEqual([]);
  });

  it("anon obtém os dados públicos do convite via RPC", async () => {
    const anon = createAnonClient();
    const { data, error } = await anon
      .rpc("get_invite", { p_slug: slug, p_token: token })
      .maybeSingle();
    expect(error).toBeNull();
    expect(data!.turning_age).toBe(6);
    expect(data!.host_message).toBe("Venha!");
    expect(data!.rsvp_open).toBe(true);
  });

  it("a resposta da RPC NÃO contém lista de convidados nem telefones", async () => {
    const anon = createAnonClient();
    const { data } = await anon
      .rpc("get_invite", { p_slug: slug, p_token: token })
      .maybeSingle();
    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain("Convidado Secreto");
    expect(serialized).not.toContain("99999-0000");
    expect(data).not.toHaveProperty("guests");
  });

  it("token errado ou festa não confirmada não retorna nada", async () => {
    const anon = createAnonClient();
    const wrong = await anon
      .rpc("get_invite", { p_slug: slug, p_token: "errado" })
      .maybeSingle();
    expect(wrong.data).toBeNull();
  });

  it("convite despublicado some", async () => {
    await admin.from("parties").update({ invite_published: false }).eq("id", partyId);
    const anon = createAnonClient();
    const { data } = await anon
      .rpc("get_invite", { p_slug: slug, p_token: token })
      .maybeSingle();
    expect(data).toBeNull();
    await admin.from("parties").update({ invite_published: true }).eq("id", partyId);
  });
});
