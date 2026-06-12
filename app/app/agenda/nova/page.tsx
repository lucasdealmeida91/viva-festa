import Link from "next/link";
import { BudgetForm } from "@/components/agenda/budget-form";
import { todayInSaoPaulo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Novo orçamento" };

export default async function NovaFestaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; turno?: string }>;
}) {
  const { data: dateParam, turno } = await searchParams;
  const supabase = await createClient();

  const [{ data: shifts }, { data: packages }] = await Promise.all([
    supabase.from("shifts").select("id, label").eq("active", true),
    supabase
      .from("packages")
      .select("id, name")
      .eq("archived", false)
      .order("name"),
  ]);

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link
          href="/app/agenda"
          className="text-muted-foreground text-sm underline"
        >
          ← Agenda
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo orçamento</h1>
        <p className="text-muted-foreground text-sm">
          Registro de interesse — não bloqueia a agenda (RN-3.1).
        </p>
      </header>

      {(packages ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          Cadastre um{" "}
          <Link href="/app/pacotes" className="underline">
            pacote
          </Link>{" "}
          antes de criar orçamentos.
        </p>
      ) : (
        <BudgetForm
          defaultDate={dateParam ?? todayInSaoPaulo()}
          shifts={shifts ?? []}
          defaultShiftId={turno}
          packages={packages ?? []}
        />
      )}
    </main>
  );
}
