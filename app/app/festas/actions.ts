"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PartyActionState = { error: string } | null;

type PartyStatus = "reserved" | "confirmed" | "completed";

async function setStatus(
  id: string,
  status: PartyStatus,
): Promise<PartyActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parties")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error?.code === "23505") {
    return { error: "Já existe festa reservada/confirmada neste turno (RN-2.4)." };
  }
  if (error || !data?.length) {
    return { error: "Não foi possível mudar o status da festa." };
  }

  revalidatePath(`/app/festas/${id}`);
  revalidatePath("/app/agenda");
  return null;
}

export async function reserveParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  return setStatus(String(formData.get("id")), "reserved");
}

export async function confirmParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  // M1: confirmação liberada com aviso; M2 exigirá contrato (RN-3.3/RN-9.1)
  return setStatus(String(formData.get("id")), "confirmed");
}

export async function completeParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  // Placeholder até o encerramento real do M4 (RN-8.1)
  return setStatus(String(formData.get("id")), "completed");
}

async function auditAndSetStatus(
  formData: FormData,
  status: "canceled" | "confirmed",
  action: string,
): Promise<PartyActionState> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Informe o motivo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: party } = await supabase
    .from("parties")
    .select("tenant_id")
    .eq("id", id)
    .single();
  if (!party) return { error: "Festa não encontrada." };

  const { data, error } = await supabase
    .from("parties")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível mudar o status da festa." };
  }

  // NF-6: reabertura sempre auditada; cancelamento idem (histórico RN-3.5)
  await supabase.from("audit_logs").insert({
    tenant_id: party.tenant_id,
    user_id: user!.id,
    action,
    entity: "parties",
    entity_id: id,
    reason,
  });

  revalidatePath(`/app/festas/${id}`);
  revalidatePath("/app/agenda");
  return null;
}

export async function cancelParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  return auditAndSetStatus(formData, "canceled", "cancel_party");
}

export async function reopenParty(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  return auditAndSetStatus(formData, "confirmed", "reopen_party");
}
