"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GuestFormState = { error?: string; success?: string } | null;

async function tenantOfParty(partyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parties")
    .select("tenant_id")
    .eq("id", partyId)
    .single();
  return { supabase, tenantId: data?.tenant_id ?? null };
}

export async function addGuest(
  _prev: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const partyId = String(formData.get("party_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "");

  if (!partyId || !name) return { error: "Informe o nome do convidado." };
  const age = ageRaw === "" ? null : Number(ageRaw);
  if (age !== null && (Number.isNaN(age) || age < 0)) {
    return { error: "Idade inválida." };
  }

  const { supabase, tenantId } = await tenantOfParty(partyId);
  if (!tenantId) return { error: "Festa não encontrada." };

  const { error } = await supabase.from("guests").insert({
    tenant_id: tenantId,
    party_id: partyId,
    name,
    age,
    phone: phone || null,
    group_id: groupId || null,
  });
  if (error) {
    if (error.message.includes("guest_list_frozen")) {
      return { error: "A lista está congelada (festa encerrada)." };
    }
    return { error: "Não foi possível adicionar o convidado." };
  }

  revalidatePath(`/app/festas/${partyId}`);
  return { success: "Convidado adicionado." };
}

export async function removeGuest(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const partyId = String(formData.get("party_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", id);
  revalidatePath(`/app/festas/${partyId}`);
}

export async function addGroup(
  _prev: GuestFormState,
  formData: FormData,
): Promise<GuestFormState> {
  const partyId = String(formData.get("party_id") ?? "");
  const name = String(formData.get("group_name") ?? "").trim();
  if (!partyId || !name) return { error: "Informe o nome do grupo." };

  const { supabase, tenantId } = await tenantOfParty(partyId);
  if (!tenantId) return { error: "Festa não encontrada." };

  const { error } = await supabase
    .from("guest_groups")
    .insert({ tenant_id: tenantId, party_id: partyId, name });
  if (error) return { error: "Não foi possível criar o grupo." };

  revalidatePath(`/app/festas/${partyId}`);
  return { success: "Grupo criado." };
}
