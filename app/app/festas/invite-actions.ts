"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InviteFormState = { error?: string; success?: string } | null;

/** Token curto, não adivinhável, url-safe (RN-6.1). */
function generateToken(): string {
  return randomBytes(8).toString("base64url"); // ~11 chars
}

export async function publishInvite(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const partyId = String(formData.get("party_id") ?? "");
  const birthdayChildId = String(formData.get("birthday_child_id") ?? "");
  const turningAgeRaw = String(formData.get("turning_age") ?? "").trim();
  const hostMessage = String(formData.get("host_message") ?? "").trim();
  const listMode = String(formData.get("list_mode") ?? "closed");
  const deadline = String(formData.get("rsvp_deadline") ?? "").trim();

  if (!partyId) return { error: "Festa inválida." };
  const turningAge = turningAgeRaw === "" ? null : Number(turningAgeRaw);
  if (turningAge !== null && (Number.isNaN(turningAge) || turningAge < 0)) {
    return { error: "Idade do aniversariante inválida." };
  }

  const supabase = await createClient();
  const { data: party } = await supabase
    .from("parties")
    .select("invite_token")
    .eq("id", partyId)
    .single();
  if (!party) return { error: "Festa não encontrada." };

  const { data, error } = await supabase
    .from("parties")
    .update({
      invite_token: party.invite_token ?? generateToken(),
      invite_published: true,
      birthday_child_id: birthdayChildId || null,
      turning_age: turningAge,
      host_message: hostMessage || null,
      list_mode: listMode === "open" ? "open" : "closed",
      rsvp_deadline: deadline || null,
    })
    .eq("id", partyId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível publicar o convite." };
  }

  revalidatePath(`/app/festas/${partyId}`);
  return { success: "Convite publicado." };
}

export async function unpublishInvite(formData: FormData) {
  const partyId = String(formData.get("party_id") ?? "");
  if (!partyId) return;
  const supabase = await createClient();
  await supabase
    .from("parties")
    .update({ invite_published: false })
    .eq("id", partyId);
  revalidatePath(`/app/festas/${partyId}`);
}
