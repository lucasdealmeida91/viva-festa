import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M5-T6 — modo leitura imposto no banco (AD-3 / RN-11.2). */
const run = Date.now().toString(36);
const admin = createAdminClient();
const manager = `ro-mgr-${run}@test.dev`;

let tenantId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager));
  const mgr = await signInAs(manager);
  const { data: tid } = await mgr.rpc("create_tenant", {
    p_name: "Buffet Leitura", p_slug: `ro-${run}`,
  });
  tenantId = tid!;
}, 30_000);

afterAll(async () => {
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

async function tryCreatePackage() {
  const mgr = await signInAs(manager);
  return mgr.from("packages").insert({
    tenant_id: tenantId, name: "P", adult_capacity: 50, child_capacity: 30,
    base_price_cents: 0, exempt_age: 8, adult_age: 13,
    extra_adult_price_cents: 9000, extra_child_price_cents: 5500,
  }).select("id");
}

describe("modo leitura (AD-3 / RN-11.2)", () => {
  it("trial ativo escreve normalmente", async () => {
    const { error } = await tryCreatePackage();
    expect(error).toBeNull();
  });

  it("trial EXPIRADO bloqueia escrita no banco", async () => {
    await admin.from("tenants")
      .update({ trial_ends_at: "2020-01-01" }).eq("id", tenantId);
    const { data, error } = await tryCreatePackage();
    // RLS nega o insert: sem erro de permissão explícito, mas zero linhas
    expect(error?.code === "42501" || (data?.length ?? 0) === 0).toBe(true);
  });

  it("status read_only bloqueia; leitura continua liberada", async () => {
    await admin.from("tenants")
      .update({ subscription_status: "read_only" }).eq("id", tenantId);
    const { data: wrote } = await tryCreatePackage();
    expect(wrote?.length ?? 0).toBe(0);
    // leitura ainda funciona
    const mgr = await signInAs(manager);
    const { error: readErr } = await mgr.from("packages").select("id");
    expect(readErr).toBeNull();
  });

  it("voltar para active reabilita a escrita (sem perda)", async () => {
    await admin.from("tenants").update({
      subscription_status: "active", trial_ends_at: "2099-01-01",
    }).eq("id", tenantId);
    const { error } = await tryCreatePackage();
    expect(error).toBeNull();
  });
});
