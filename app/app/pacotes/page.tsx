import Link from "next/link";
import {
  PackagesManager,
  type PackageRow,
} from "@/components/pacotes/packages-manager";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pacotes" };

export default async function PacotesPage() {
  const supabase = await createClient();

  const { data: packages } = await supabase
    .from("packages")
    .select(
      "id, name, adult_capacity, child_capacity, base_price_cents, exempt_age, adult_age, extra_adult_price_cents, extra_child_price_cents, archived",
    )
    .order("archived")
    .order("created_at");

  const { count: shiftsCount } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true });

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Pacotes</h1>
        <p className="text-muted-foreground text-sm">
          Capacidades, preço e regras de contagem por idade (RN-4).
        </p>
      </header>

      <PackagesManager
        packages={(packages ?? []) as PackageRow[]}
        shiftsCount={shiftsCount ?? 0}
      />
    </main>
  );
}
