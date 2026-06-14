"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function dismissAlert(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("rebooking_alerts")
    .update({ status: "dismissed" })
    .eq("id", id);
  revalidatePath("/app");
}

/** RN-10.5 — converter alerta em orçamento alimenta a métrica de recompra. */
export async function convertAlert(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("rebooking_alerts")
    .update({ status: "converted" })
    .eq("id", id);
  revalidatePath("/app");
  redirect("/app/agenda/nova");
}
