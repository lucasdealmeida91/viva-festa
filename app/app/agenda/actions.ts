"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type BudgetFormState = { error: string } | null;

/** RN-3.1 — cria a festa em status orçamento (não bloqueia a agenda). */
export async function createBudget(
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  const partyDate = String(formData.get("party_date") ?? "");
  const shiftId = String(formData.get("shift_id") ?? "");
  const packageId = String(formData.get("package_id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!partyDate || !shiftId || !packageId) {
    return { error: "Escolha data, turno e pacote." };
  }

  const supabase = await createClient();
  const { data: tenants } = await supabase.from("tenants").select("id").limit(1);
  if (!tenants?.length) return { error: "Buffet não encontrado." };

  const { error } = await supabase.from("parties").insert({
    tenant_id: tenants[0].id,
    party_date: partyDate,
    shift_id: shiftId,
    package_id: packageId,
    notes: notes || null,
  });
  if (error) return { error: "Não foi possível criar o orçamento." };

  redirect(`/app/agenda?mes=${partyDate.slice(0, 7)}`);
}
