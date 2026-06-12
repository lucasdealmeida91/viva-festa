"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseDecimalToCents } from "@/lib/format";

export type PackageFormState = { error?: string; success?: string } | null;

function parsePackageForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const adultCapacity = Number(formData.get("adult_capacity"));
  const childCapacity = Number(formData.get("child_capacity"));
  const basePriceCents = parseDecimalToCents(
    String(formData.get("base_price") ?? ""),
  );
  const exemptAge = Number(formData.get("exempt_age"));
  const adultAge = Number(formData.get("adult_age"));
  const extraAdultCents = parseDecimalToCents(
    String(formData.get("extra_adult_price") ?? ""),
  );
  const extraChildCents = parseDecimalToCents(
    String(formData.get("extra_child_price") ?? ""),
  );

  if (
    !name ||
    [adultCapacity, childCapacity, exemptAge, adultAge].some(Number.isNaN) ||
    [basePriceCents, extraAdultCents, extraChildCents].some(Number.isNaN)
  ) {
    return { error: "Preencha todos os campos do pacote." as const };
  }
  // RN-4.2 — validação na UI/action; o banco tem o CHECK equivalente.
  if (exemptAge < 0 || exemptAge >= adultAge) {
    return {
      error:
        "A idade de isenção deve ser menor que a idade de adulto (RN-4.2)." as const,
    };
  }

  return {
    values: {
      name,
      adult_capacity: adultCapacity,
      child_capacity: childCapacity,
      base_price_cents: basePriceCents,
      exempt_age: exemptAge,
      adult_age: adultAge,
      extra_adult_price_cents: extraAdultCents,
      extra_child_price_cents: extraChildCents,
    },
  };
}

export async function createPackage(
  _prev: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const parsed = parsePackageForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data: tenants } = await supabase.from("tenants").select("id").limit(1);
  if (!tenants?.length) return { error: "Buffet não encontrado." };

  const { error } = await supabase
    .from("packages")
    .insert({ tenant_id: tenants[0].id, ...parsed.values });
  if (error) return { error: "Não foi possível criar o pacote." };

  revalidatePath("/app/pacotes");
  return { success: "Pacote criado." };
}

export async function updatePackage(
  _prev: PackageFormState,
  formData: FormData,
): Promise<PackageFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Pacote inválido." };

  const parsed = parsePackageForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .update(parsed.values)
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    return { error: "Não foi possível salvar o pacote." };
  }

  revalidatePath("/app/pacotes");
  return { success: "Pacote atualizado." };
}

export async function toggleArchivePackage(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("packages").update({ archived: !archived }).eq("id", id);
  revalidatePath("/app/pacotes");
}
