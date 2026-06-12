import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M0-T4 — team: role boundaries and profile visibility. */
const run = Date.now().toString(36);
const admin = createAdminClient();

const manager = `team-mgr-${run}@test.dev`;
const receptionist = `team-rec-${run}@test.dev`;
const outsider = `team-out-${run}@test.dev`;

let tenantId: string;
let receptionistMembershipId: string;
const userIds: string[] = [];

beforeAll(async () => {
  userIds.push(await createTestUser(manager, "Gestora Equipe"));
  const managerClient = await signInAs(manager);
  const { data, error } = await managerClient.rpc("create_tenant", {
    p_name: "Buffet Equipe",
    p_slug: `equipe-${run}`,
  });
  if (error) throw error;
  tenantId = data!;

  const recId = await createTestUser(receptionist, "Recep Equipe");
  userIds.push(recId);
  const { data: membership, error: mErr } = await managerClient
    .from("memberships")
    .insert({ tenant_id: tenantId, user_id: recId, role: "receptionist" })
    .select("id")
    .single();
  if (mErr) throw mErr;
  receptionistMembershipId = membership.id;

  userIds.push(await createTestUser(outsider, "De Fora"));
}, 30_000);

afterAll(async () => {
  await admin.from("tenants").delete().eq("id", tenantId);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("equipe (M0-T4)", () => {
  it("gestor vê nomes dos membros do tenant (profiles same-tenant)", async () => {
    const client = await signInAs(manager);
    const { data } = await client
      .from("memberships")
      .select("role, profiles(full_name)")
      .eq("tenant_id", tenantId);
    const names = data!.map((m) => m.profiles?.full_name).sort();
    expect(names).toEqual(["Gestora Equipe", "Recep Equipe"]);
  });

  it("quem não é do tenant não vê os perfis da equipe", async () => {
    const client = await signInAs(outsider);
    const { data } = await client.from("profiles").select("full_name");
    expect(data!.map((p) => p.full_name)).toEqual(["De Fora"]);
  });

  it("recepcionista não convida nem remove membros (RN-1.2)", async () => {
    const client = await signInAs(receptionist);
    const { error: insertError } = await client.from("memberships").insert({
      tenant_id: tenantId,
      user_id: userIds[2],
      role: "manager",
    });
    expect(insertError).not.toBeNull();

    const { data: deleted } = await client
      .from("memberships")
      .delete()
      .eq("id", receptionistMembershipId)
      .select();
    expect(deleted).toEqual([]);
  });

  it("gestor remove membro do próprio tenant", async () => {
    const client = await signInAs(manager);
    const { data: deleted, error } = await client
      .from("memberships")
      .delete()
      .eq("id", receptionistMembershipId)
      .select("id");
    expect(error).toBeNull();
    expect(deleted).toHaveLength(1);
  });
});
