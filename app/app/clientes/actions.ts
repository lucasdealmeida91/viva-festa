"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CustomerFormState = { error?: string; success?: string } | null;

export async function createCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (name.length < 2) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { data: tenants } = await supabase.from("tenants").select("id").limit(1);
  if (!tenants?.length) return { error: "Buffet não encontrado." };

  const { data, error } = await supabase
    .from("customers")
    .insert({
      tenant_id: tenants[0].id,
      name,
      phone: phone || null,
      email: email || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe cliente com este e-mail." };
    }
    return { error: "Não foi possível cadastrar o cliente." };
  }

  redirect(`/app/clientes/${data.id}`);
}

export async function updateCustomer(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!id || name.length < 2) return { error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ name, phone: phone || null, email: email || null })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível salvar o cliente." };
  }

  revalidatePath(`/app/clientes/${id}`);
  return { success: "Cliente salvo." };
}

export async function addChild(
  _prev: CustomerFormState,
  formData: FormData,
): Promise<CustomerFormState> {
  const customerId = String(formData.get("customer_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const birthMonth = Number(formData.get("birth_month"));
  const birthYear = Number(formData.get("birth_year"));

  if (!customerId || !name || Number.isNaN(birthMonth) || Number.isNaN(birthYear)) {
    return { error: "Preencha nome, mês e ano de nascimento." };
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("tenant_id")
    .eq("id", customerId)
    .single();
  if (!customer) return { error: "Cliente não encontrado." };

  const { error } = await supabase.from("birthday_children").insert({
    tenant_id: customer.tenant_id,
    customer_id: customerId,
    name,
    birth_month: birthMonth,
    birth_year: birthYear,
  });
  if (error) return { error: "Não foi possível adicionar o aniversariante." };

  revalidatePath(`/app/clientes/${customerId}`);
  return { success: "Aniversariante adicionado." };
}

export async function removeChild(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const customerId = String(formData.get("customer_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("birthday_children").delete().eq("id", id);
  revalidatePath(`/app/clientes/${customerId}`);
}
