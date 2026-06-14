import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M5-T2 — cliente edita a própria lista até o início (RN-5.4/12.2). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `ced-mgr-${run}@test.dev`;
const clientEmail = `ced-cli-${run}@test.dev`;

let tenantId: string;
let pkgId: string;
let shiftId: string;
let myCustomerId: string;
let futureParty: string;
let pastParty: string;
let otherParty: string;
const userIds: string[] = [];

function spDate(offset: number) {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function confirmedParty(customerId: string, date: string) {
  const { data: p } = await admin.from("parties").insert({
    tenant_id: tenantId, package_id: pkgId, shift_id: shiftId,
    party_date: date, customer_id: customerId,
  }).select("id").single();
  await admin.from("contracts").insert({ tenant_id: tenantId, party_id: p!.id, total_cents: 0 });
  await admin.from("parties").update({ status: "reserved" }).eq("id", p!.id);
  await admin.from("parties").update({ status: "confirmed" }).eq("id", p!.id);
  return p!.id;
}

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", { p_name: "Buffet Edit", p_slug: `ced-${run}` });
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

  const clientUserId = await createTestUser(clientEmail);
  userIds.push(clientUserId);
  const { data: me } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Cliente", email: clientEmail,
  }).select("id").single();
  myCustomerId = me!.id;
  await admin.from("customers").update({ auth_user_id: clientUserId }).eq("id", myCustomerId);
  const { data: other } = await mgr.from("customers").insert({
    tenant_id: tenantId, name: "Outro", email: `o-${run}@t.dev`,
  }).select("id").single();

  futureParty = await confirmedParty(myCustomerId, spDate(30));
  pastParty = await confirmedParty(myCustomerId, spDate(-2));
  otherParty = await confirmedParty(other!.id, spDate(30));
}, 30_000);

afterAll(async () => {
  await admin.from("parties").delete().eq("tenant_id", tenantId);
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("edição da lista pelo cliente (M5-T2)", () => {
  it("adiciona convidado à própria festa futura", async () => {
    const cli = await signInAs(clientEmail);
    const { error } = await cli.from("guests").insert({
      tenant_id: tenantId, party_id: futureParty, name: "Tio João",
    });
    expect(error).toBeNull();
  });

  it("NÃO edita festa já passada (RN-5.4)", async () => {
    const cli = await signInAs(clientEmail);
    const { error } = await cli.from("guests").insert({
      tenant_id: tenantId, party_id: pastParty, name: "Tarde",
    });
    expect(error).not.toBeNull();
  });

  it("NÃO edita a festa de outro cliente", async () => {
    const cli = await signInAs(clientEmail);
    const { error } = await cli.from("guests").insert({
      tenant_id: tenantId, party_id: otherParty, name: "Intruso",
    });
    expect(error).not.toBeNull();
  });

  it("customer_invite_path retorna a URL só da própria festa publicada", async () => {
    await admin.from("parties").update({
      invite_token: `tok${run}`, invite_published: true,
    }).eq("id", futureParty);
    const cli = await signInAs(clientEmail);
    const { data: mine } = await cli.rpc("customer_invite_path", { p_party_id: futureParty });
    expect(mine).toBe(`ced-${run}/tok${run}`);
    const { data: notMine } = await cli.rpc("customer_invite_path", { p_party_id: otherParty });
    expect(notMine).toBeNull();
  });
});
