"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PaymentFormState = { error: string } | null;

/** RN-9.3 — registro manual de pagamento (data, forma, observação). */
export async function registerPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const id = String(formData.get("id") ?? "");
  const paidDate = String(formData.get("paid_date") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const partyId = String(formData.get("party_id") ?? "");

  if (!id || !paidDate || !method) {
    return { error: "Informe a data e a forma de pagamento." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("installments")
    .update({
      paid_at: `${paidDate}T12:00:00-03:00`,
      payment_method: method,
      payment_note: note || null,
    })
    .eq("id", id)
    .is("paid_at", null)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível registrar o pagamento." };
  }

  if (partyId) revalidatePath(`/app/festas/${partyId}`);
  revalidatePath("/app/financeiro");
  return null;
}

/** Desfazer pagamento exige motivo e registra auditoria (NF-6). */
export async function undoPayment(
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const partyId = String(formData.get("party_id") ?? "");
  if (!id || !reason) return { error: "Informe o motivo." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: installment } = await supabase
    .from("installments")
    .select("tenant_id")
    .eq("id", id)
    .single();
  if (!installment) return { error: "Parcela não encontrada." };

  const { data, error } = await supabase
    .from("installments")
    .update({ paid_at: null, payment_method: null, payment_note: null })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível desfazer o pagamento." };
  }

  await supabase.from("audit_logs").insert({
    tenant_id: installment.tenant_id,
    user_id: user!.id,
    action: "undo_payment",
    entity: "installments",
    entity_id: id,
    reason,
  });

  if (partyId) revalidatePath(`/app/festas/${partyId}`);
  revalidatePath("/app/financeiro");
  return null;
}
