"use server";

import { redirect } from "next/navigation";
import { createCheckoutSession, PRICES } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export type CheckoutState = { error: string } | null;

/** RN-11 / M5-T4 — inicia o checkout da assinatura (mensal ou anual). */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const plan = String(formData.get("plan") ?? "monthly");
  const priceId = plan === "annual" ? PRICES.annual : PRICES.monthly;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão inválida." };
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .limit(1)
    .single();
  if (!tenant) return { error: "Buffet não encontrado." };

  let url: string | null = null;
  try {
    url = await createCheckoutSession({
      priceId,
      tenantId: tenant.id,
      customerEmail: user.email,
      appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    });
  } catch {
    return { error: "Não foi possível iniciar o checkout." };
  }
  if (!url) return { error: "Não foi possível iniciar o checkout." };

  redirect(url);
}
