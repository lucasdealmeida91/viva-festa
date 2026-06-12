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
