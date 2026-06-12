import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAdminClient, createTestUser, signInAs } from "./helpers";

/** M0-T3 — shifts: members read, managers write, tenants isolated (RN-2.1). */
const run = Date.now().toString(36);
const admin = createAdminClient();

const managerA = `shift-mgr-a-${run}@test.dev`;
const receptionistA = `shift-rec-a-${run}@test.dev`;
const managerB = `shift-mgr-b-${run}@test.dev`;

let tenantA: string;
let tenantB: string;
const userIds: string[] = [];

beforeAll(async () => {
  for (const [email, slugPrefix] of [
    [managerA, "shifts-a"],
    [managerB, "shifts-b"],
  ] as const) {
    const userId = await createTestUser(email);
    userIds.push(userId);
    const client = await signInAs(email);
    const { data, error } = await client.rpc("create_tenant", {
      p_name: "Buffet Shifts",
      p_slug: `${slugPrefix}-${run}`,
    });
    if (error) throw error;
    if (email === managerA) tenantA = data!;
    else tenantB = data!;
  }

  const recId = await createTestUser(receptionistA);
  userIds.push(recId);
  await admin
    .from("memberships")
    .insert({ tenant_id: tenantA, user_id: recId, role: "receptionist" });
}, 30_000);

afterAll(async () => {
  await admin.from("tenants").delete().in("id", [tenantA, tenantB]);
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
}, 30_000);

describe("shifts (M0-T3)", () => {
  it("gestor cria turno; recepcionista lê mas não escreve (RN-1.3)", async () => {
    const manager = await signInAs(managerA);
    const { error } = await manager.from("shifts").insert({
      tenant_id: tenantA,
      weekday: 6,
      label: "Sábado tarde",
      starts_at: "12:00",
      ends_at: "16:00",
    });
    expect(error).toBeNull();

    const receptionist = await signInAs(receptionistA);
    const { data: visible } = await receptionist.from("shifts").select("id");
    expect(visible).toHaveLength(1);

    const { error: insertError } = await receptionist.from("shifts").insert({
      tenant_id: tenantA,
      weekday: 0,
      label: "Invasão",
      starts_at: "10:00",
      ends_at: "14:00",
    });
    expect(insertError).not.toBeNull();
  });

  it("turnos não vazam entre tenants (NF-1)", async () => {
    const managerOther = await signInAs(managerB);
    const { data, error } = await managerOther.from("shifts").select("id");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("horário invertido é rejeitado pelo banco", async () => {
    const manager = await signInAs(managerA);
    const { error } = await manager.from("shifts").insert({
      tenant_id: tenantA,
      weekday: 0,
      label: "Inválido",
      starts_at: "16:00",
      ends_at: "12:00",
    });
    expect(error).not.toBeNull();
  });
});
