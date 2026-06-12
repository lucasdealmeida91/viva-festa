import Link from "next/link";
import { redirect } from "next/navigation";
import { TenantForm } from "@/components/configuracoes/tenant-form";
import { ShiftsManager } from "@/components/configuracoes/shifts-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, address, phone")
    .limit(1);
  const tenant = tenants?.[0];
  if (!tenant) redirect("/onboarding");

  const { data: shifts } = await supabase
    .from("shifts")
    .select("id, weekday, label, starts_at, ends_at, active")
    .order("weekday")
    .order("starts_at");

  return (
    <main className="flex flex-col gap-8 p-6">
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Configurações</h1>
      </header>

      <TenantForm tenant={tenant} />
      <ShiftsManager shifts={shifts ?? []} />
    </main>
  );
}
