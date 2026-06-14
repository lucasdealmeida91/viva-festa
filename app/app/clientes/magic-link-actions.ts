"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState = { error?: string; success?: string } | null;

/** RN-12.1 — envia magic link ao e-mail do cliente final. */
export async function sendCustomerMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const customerId = String(formData.get("customer_id") ?? "");
  if (!customerId) return { error: "Cliente inválido." };

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("email")
    .eq("id", customerId)
    .single();
  if (!customer?.email) {
    return { error: "Cadastre um e-mail para o cliente antes de enviar o acesso." };
  }

  // Cliente anônimo separado (implicit flow → token no hash, consumido em /cliente)
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { error } = await anon.auth.signInWithOtp({
    email: customer.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/cliente`,
    },
  });
  if (error) return { error: "Não foi possível enviar o acesso." };

  return { success: "Link de acesso enviado ao e-mail do cliente." };
}
