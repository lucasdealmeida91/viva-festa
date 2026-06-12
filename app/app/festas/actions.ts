"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/** RN-3.3/RN-9.1 — confirmação atômica: contrato + parcelas + cliente. */
export async function confirmWithContract(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  const id = String(formData.get("id") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  const totalCents = Number(formData.get("total_cents"));
  const downPaymentCents = Number(formData.get("down_payment_cents"));
  let installments: unknown;
  try {
    installments = JSON.parse(String(formData.get("installments") ?? "[]"));
  } catch {
    return { error: "Plano de parcelas inválido." };
  }

  if (!id || !customerId) return { error: "Escolha o cliente da festa." };
  if (Number.isNaN(totalCents) || totalCents <= 0) {
    return { error: "Informe o valor total do contrato." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_party_with_contract", {
    p_party_id: id,
    p_customer_id: customerId,
    p_total_cents: totalCents,
    p_down_payment_cents: downPaymentCents,
    p_installments: installments as never,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe festa reservada/confirmada neste turno (RN-2.4)." };
    }
    if (error.message.includes("installments_sum_mismatch")) {
      return { error: "A soma das parcelas precisa fechar com o total." };
    }
    return { error: "Não foi possível confirmar a festa." };
  }

  // ?confirmada=1: a página dispara o evento party_confirmed (docs/06 §2)
  redirect(`/app/festas/${id}?confirmada=1`);
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

/** RN-4.6 — sobrescreve as regras congeladas de UMA festa, com auditoria. */
export async function overridePartyRules(
  _prev: PartyActionState,
  formData: FormData,
): Promise<PartyActionState> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const values = {
    rule_exempt_age: Number(formData.get("rule_exempt_age")),
    rule_adult_age: Number(formData.get("rule_adult_age")),
    rule_adult_capacity: Number(formData.get("rule_adult_capacity")),
    rule_child_capacity: Number(formData.get("rule_child_capacity")),
    rule_extra_adult_price_cents: Number(formData.get("rule_extra_adult_price_cents")),
    rule_extra_child_price_cents: Number(formData.get("rule_extra_child_price_cents")),
  };

  if (!reason) return { error: "Informe o motivo da sobrescrita." };
  if (Object.values(values).some(Number.isNaN)) {
    return { error: "Preencha todos os campos." };
  }
  if (values.rule_exempt_age >= values.rule_adult_age) {
    return {
      error: "A idade de isenção deve ser menor que a idade de adulto (RN-4.2).",
    };
  }

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
    .update(values)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível sobrescrever as regras." };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: party.tenant_id,
    user_id: user!.id,
    action: "override_party_rules",
    entity: "parties",
    entity_id: id,
    reason,
    data: values,
  });

  revalidatePath(`/app/festas/${id}`);
  return null;
}
