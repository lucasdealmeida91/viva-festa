import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M5-T1 — customer final sees ONLY their own data (RN-12.3). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `cac-mgr-${run}@test.dev`;
const clientEmail = `cac-cli-${run}@test.dev`;

let tenantId: string;
let pkgId: string;
let shiftId: string;
let myCustomerId: string;
let myPartyId: string;
let otherPartyId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", {
    p_name: "Buffet Cliente", p_slug: `cac-${run}`,
  });
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

  // meu cliente (com conta) + cliente alheio
  const clientUserId = await createTestUser(clientEmail);
  userIds.push(clientUserId);
  const { data: me } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Eu Cliente", email: clientEmail,
  }).select("id").single();
  myCustomerId = me!.id;
  await admin.from("customers").update({ auth_user_id: clientUserId }).eq("id", myCustomerId);

  const { data: other } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Outro Cliente", email: `outro-${run}@test.dev`,
  }).select("id").single();

  // festa minha e festa do outro
  const mk = async (customerId: string, date: string) => {
    const { data: p } = await mgr.from("parties").insert({
      tenant_id: tenantId, package_id: pkgId, shift_id: shiftId,
      party_date: date, customer_id: customerId,
    }).select("id").single();
    return p!.id;
  };
  myPartyId = await mk(myCustomerId, "2027-12-04");
  otherPartyId = await mk(other!.id, "2027-12-11");
  await admin.from("guests").insert([
    { tenant_id: tenantId, party_id: myPartyId, name: "Meu Convidado" },
    { tenant_id: tenantId, party_id: otherPartyId, name: "Convidado Alheio" },
  ]);
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("acesso do cliente final (RN-12.3)", () => {
  it("link_customer_account é idempotente e retorna o customer", async () => {
    const cli = await signInAs(clientEmail);
    const { data, error } = await cli.rpc("link_customer_account");
    expect(error).toBeNull();
    expect(data).toBe(myCustomerId);
  });

  it("vê apenas a própria festa, não a de outro cliente", async () => {
    const cli = await signInAs(clientEmail);
    const { data: parties } = await cli.from("parties").select("id");
    expect(parties!.map((p) => p.id)).toEqual([myPartyId]);
  });

  it("vê apenas os próprios convidados", async () => {
    const cli = await signInAs(clientEmail);
    const { data: guests } = await cli.from("guests").select("name");
    expect(guests!.map((g) => g.name)).toEqual(["Meu Convidado"]);
  });

  it("não enxerga o cadastro de outros clientes do buffet", async () => {
    const cli = await signInAs(clientEmail);
    const { data: customers } = await cli.from("customers").select("name");
    expect(customers!.map((c) => c.name)).toEqual(["Eu Cliente"]);
  });

  it("não acessa agenda/configuração via outras tabelas (sem papel de staff)", async () => {
    const cli = await signInAs(clientEmail);
    const { data: shifts } = await cli.from("shifts").select("id");
    expect(shifts).toEqual([]); // sem policy de cliente em shifts
  });
});
