"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: string } | null;

/** Current user's tenant (MVP: one tenant per manager). */
async function currentTenantId() {
  const supabase = await createClient();
  const { data } = await supabase.from("tenants").select("id").limit(1);
  return data?.[0]?.id ?? null;
}

export async function updateTenantSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (name.length < 2) {
    return { error: "Informe o nome do buffet." };
  }

  const supabase = await createClient();
  const tenantId = await currentTenantId();
  if (!tenantId) return { error: "Buffet não encontrado." };

  const { data, error } = await supabase
    .from("tenants")
    .update({ name, address, phone })
    .eq("id", tenantId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/app/configuracoes");
  return { success: "Dados salvos." };
}

export async function createShift(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const label = String(formData.get("label") ?? "").trim();
  const weekday = Number(formData.get("weekday"));
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");

  if (!label || Number.isNaN(weekday) || !startsAt || !endsAt) {
    return { error: "Preencha todos os campos do turno." };
  }
  if (startsAt >= endsAt) {
    return { error: "O horário de início deve ser antes do fim." };
  }

  const supabase = await createClient();
  const tenantId = await currentTenantId();
  if (!tenantId) return { error: "Buffet não encontrado." };

  const { error } = await supabase.from("shifts").insert({
    tenant_id: tenantId,
    label,
    weekday,
    starts_at: startsAt,
    ends_at: endsAt,
  });

  if (error) {
    return { error: "Não foi possível criar o turno." };
  }

  revalidatePath("/app/configuracoes");
  return { success: "Turno criado." };
}

export async function inviteMember(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!fullName || !email || !["manager", "receptionist"].includes(role)) {
    return { error: "Preencha nome, e-mail e papel do convidado." };
  }

  const supabase = await createClient();
  const tenantId = await currentTenantId();
  if (!tenantId) return { error: "Buffet não encontrado." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user!.id)
    .single();
  if (myMembership?.role !== "manager") {
    return { error: "Apenas gestores convidam usuários." };
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/definir-senha`,
    });

  if (inviteError || !invited?.user) {
    return {
      error:
        "Não foi possível convidar. Este e-mail pode já ter uma conta no VivaFesta.",
    };
  }

  // Membership via the manager's own client: RLS re-checks role + assinatura.
  const { error: membershipError } = await supabase.from("memberships").insert({
    tenant_id: tenantId,
    user_id: invited.user.id,
    role: role as "manager" | "receptionist",
  });
  if (membershipError) {
    return { error: "Convite enviado, mas houve erro ao vincular o papel." };
  }

  revalidatePath("/app/configuracoes");
  return { success: "Convite enviado por e-mail." };
}

export async function removeMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("id", id)
    .single();
  // Um gestor não remove a si mesmo (evita tenant órfão de gestores).
  if (!membership || membership.user_id === user!.id) return;

  await supabase.from("memberships").delete().eq("id", id);
  revalidatePath("/app/configuracoes");
}

export async function deleteShift(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("shifts").delete().eq("id", id);
  revalidatePath("/app/configuracoes");
}

export async function toggleShift(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("shifts").update({ active: !active }).eq("id", id);
  revalidatePath("/app/configuracoes");
}
