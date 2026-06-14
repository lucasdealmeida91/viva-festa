import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M6-T1 — lista de presentes do cliente final (RN-13.1). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `gift-mgr-${run}@test.dev`;
const clientEmail = `gift-cli-${run}@test.dev`;

let tenantId: string;
let myPartyId: string;
let otherPartyId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", { p_name: "Buffet Gift", p_slug: `gift-${run}` });
  tenantId = tid!;
  const { data: pkg } = await mgr.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id").single();
  const { data: shift } = await mgr.from("shifts").insert({
    tenant_id: tenantId, weekday: 6, label: "S", starts_at: "12:00", ends_at: "16:00",
  }).select("id").single();

  const clientUserId = await createTestUser(clientEmail);
  userIds.push(clientUserId);
  const { data: me } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Cliente", email: clientEmail,
  }).select("id").single();
  await admin.from("customers").update({ auth_user_id: clientUserId }).eq("id", me!.id);
  const { data: other } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Outro", email: `o-${run}@t.dev`,
  }).select("id").single();

  const mk = async (customerId: string, date: string) => {
    const { data: p } = await mgr.from("parties").insert({
      tenant_id: tenantId, package_id: pkg!.id, shift_id: shift!.id,
      party_date: date, customer_id: customerId,
    }).select("id").single();
    await admin.from("contracts").insert({ tenant_id: tenantId, party_id: p!.id, total_cents: 0 });
    await admin.from("parties").update({ status: "reserved" }).eq("id", p!.id);
    await admin.from("parties").update({ status: "confirmed" }).eq("id", p!.id);
    return p!.id;
  };
  myPartyId = await mk(me!.id, "2027-12-04");
  otherPartyId = await mk(other!.id, "2027-12-11");
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("lista de presentes (M6-T1)", () => {
  it("cliente cadastra item na própria festa", async () => {
    const cli = await signInAs(clientEmail);
    const { error } = await cli.from("gift_items").insert({
      tenant_id: tenantId, party_id: myPartyId,
      name: "Bicicleta", external_url: "https://loja.exemplo/bike",
    });
    expect(error).toBeNull();
    const { data } = await cli.from("gift_items").select("name").eq("party_id", myPartyId);
    expect(data!.map((g) => g.name)).toEqual(["Bicicleta"]);
  });

  it("cliente NÃO cadastra item na festa de outro", async () => {
    const cli = await signInAs(clientEmail);
    const { error } = await cli.from("gift_items").insert({
      tenant_id: tenantId, party_id: otherPartyId, name: "Intruso",
    });
    expect(error).not.toBeNull();
  });

  it("presentes não vazam entre festas/clientes (NF-1)", async () => {
    await admin.from("gift_items").insert({
      tenant_id: tenantId, party_id: otherPartyId, name: "Do Outro",
    });
    const cli = await signInAs(clientEmail);
    const { data } = await cli.from("gift_items").select("name");
    expect(data!.map((g) => g.name)).toEqual(["Bicicleta"]);
  });
});
