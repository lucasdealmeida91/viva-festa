"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string } | null;

/** Pós-login: gestor → painel; recepcionista → check-in; sem tenant → onboarding. */
async function redirectByMembership(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Filtrar pelo próprio user_id: a RLS permite ver memberships do tenant
  // inteiro, e o papel dos OUTROS não pode decidir o destino.
  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user!.id);
  if (!data || data.length === 0) redirect("/onboarding");
  redirect(data.some((m) => m.role === "manager") ? "/app" : "/checkin");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || password.length < 8) {
    return { error: "Preencha nome, e-mail e uma senha com 8+ caracteres." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: "Não foi possível criar a conta. Verifique o e-mail." };
  }

  return redirectByMembership();
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "E-mail ou senha incorretos." };
  }

  return redirectByMembership();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
