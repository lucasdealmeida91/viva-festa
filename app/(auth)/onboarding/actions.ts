"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthFormState } from "../actions";

export async function createTenant(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  if (name.length < 2 || !slug) {
    return { error: "Preencha o nome do buffet e o endereço da página." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_tenant", {
    p_name: name,
    p_slug: slug,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Este endereço já está em uso. Escolha outro." };
    }
    return {
      error:
        "Endereço inválido ou reservado. Use letras minúsculas, números e hífens.",
    };
  }

  // ?novo=1: o painel dispara o evento tenant_created (docs/06 §2)
  redirect("/app?novo=1");
}
