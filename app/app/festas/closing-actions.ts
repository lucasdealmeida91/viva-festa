"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { countByCategory } from "@/lib/domain/classify";
import { computeOverage } from "@/lib/domain/overage";

export type ClosingState = { error: string } | null;

/** RN-8.1/8.2 — encerra a festa. Cálculo do excedente em lib/domain (AD-2). */
export async function closeParty(
  _prev: ClosingState,
  formData: FormData,
): Promise<ClosingState> {
  const partyId = String(formData.get("party_id") ?? "");
  if (!partyId) return { error: "Festa inválida." };

  const supabase = await createClient();
  const { data: party } = await supabase
    .from("parties")
    .select(
      `status, rule_exempt_age, rule_adult_age, rule_adult_capacity,
       rule_child_capacity, rule_extra_adult_price_cents,
       rule_extra_child_price_cents,
       packages (exempt_age, adult_age, adult_capacity, child_capacity,
         extra_adult_price_cents, extra_child_price_cents)`,
    )
    .eq("id", partyId)
    .single();
  if (!party) return { error: "Festa não encontrada." };
  if (party.status !== "confirmed") {
    return { error: "Só é possível encerrar uma festa confirmada." };
  }

  const rules = {
    exemptAge: party.rule_exempt_age ?? party.packages!.exempt_age,
    adultAge: party.rule_adult_age ?? party.packages!.adult_age,
  };
  const capacity = {
    adultCapacity: party.rule_adult_capacity ?? party.packages!.adult_capacity,
    childCapacity: party.rule_child_capacity ?? party.packages!.child_capacity,
    extraAdultPriceCents:
      party.rule_extra_adult_price_cents ??
      party.packages!.extra_adult_price_cents,
    extraChildPriceCents:
      party.rule_extra_child_price_cents ??
      party.packages!.extra_child_price_cents,
  };

  // Presentes (inclui walk-ins): a fonte da contagem oficial (RN-8).
  const { data: present } = await supabase
    .from("guests")
    .select("name, age, origin")
    .eq("party_id", partyId)
    .eq("attendance", "present");

  const counts = countByCategory((present ?? []).map((g) => g.age), rules);
  const overage = computeOverage(counts, capacity);

  const snapshot = {
    counts,
    capacity: {
      adults: capacity.adultCapacity,
      children: capacity.childCapacity,
    },
    present: (present ?? []).map((g) => ({
      name: g.name,
      age: g.age,
      origin: g.origin,
    })),
  };

  const { error } = await supabase.rpc("close_party", {
    p_party_id: partyId,
    p_snapshot: snapshot,
    p_overage_adults: overage.overageAdults,
    p_overage_children: overage.overageChildren,
    p_overage_total_cents: overage.totalCents,
  });
  if (error) return { error: "Não foi possível encerrar a festa." };

  revalidatePath(`/app/festas/${partyId}`);
  return null;
}

export async function decideOverage(
  _prev: ClosingState,
  formData: FormData,
): Promise<ClosingState> {
  const partyId = String(formData.get("party_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const amountReais = String(formData.get("amount") ?? "").trim();

  if (!["confirmed", "adjusted", "waived"].includes(decision)) {
    return { error: "Decisão inválida." };
  }
  if (decision === "adjusted" && !reason) {
    return { error: "Informe o motivo do ajuste." };
  }
  const amountCents =
    amountReais === "" ? 0 : Math.round(Number(amountReais) * 100);

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_overage", {
    p_party_id: partyId,
    p_decision: decision as "confirmed" | "adjusted" | "waived",
    p_amount_cents: amountCents,
    p_reason: reason,
  });
  if (error) return { error: "Não foi possível registrar a decisão." };

  revalidatePath(`/app/festas/${partyId}`);
  return null;
}
