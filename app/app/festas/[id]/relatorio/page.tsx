import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "@/components/festas/print-button";
import { classify } from "@/lib/domain/classify";
import { formatCurrencyBRL, formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatório pós-festa" };

const CLASS_PT = { exempt: "Isento", child: "Criança", adult: "Adulto" } as const;
const ORIGIN_PT: Record<string, string> = {
  host: "lista",
  companion: "acompanhante",
  self_registered: "auto-cadastro",
  walk_in: "walk-in",
};

type SnapshotGuest = { name: string; age: number | null; origin: string };

export default async function RelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select(
      `party_date, status, closing_snapshot,
       overage_adults, overage_children, overage_total_cents, overage_decision,
       rule_exempt_age, rule_adult_age, rule_adult_capacity, rule_child_capacity,
       birthday_child:birthday_children (name),
       customers (name)`,
    )
    .eq("id", id)
    .single();

  if (!party) notFound();
  if (party.status !== "completed") redirect(`/app/festas/${id}`);

  const snapshot = (party.closing_snapshot ?? {}) as {
    counts?: { adults: number; children: number; exempt: number };
    present?: SnapshotGuest[];
  };
  const rules = {
    exemptAge: party.rule_exempt_age ?? 0,
    adultAge: party.rule_adult_age ?? 13,
  };
  const present = snapshot.present ?? [];
  const counts = snapshot.counts ?? { adults: 0, children: 0, exempt: 0 };

  const rows: Array<{ label: string; got: number; cap: number | null }> = [
    { label: "Adultos", got: counts.adults, cap: party.rule_adult_capacity },
    { label: "Crianças", got: counts.children, cap: party.rule_child_capacity },
    { label: "Isentos", got: counts.exempt, cap: null },
  ];

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between print:hidden">
        <Link href={`/app/festas/${id}`} className="text-muted-foreground text-sm underline">
          ← Festa
        </Link>
        <PrintButton />
      </header>

      <div>
        <h1 className="text-2xl font-semibold">Relatório pós-festa</h1>
        <p className="text-muted-foreground">
          {party.birthday_child?.name && `${party.birthday_child.name} · `}
          {formatDateBR(party.party_date)}
          {party.customers && ` · ${party.customers.name}`}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Contagem final</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1">Categoria</th>
              <th className="py-1">Presentes</th>
              <th className="py-1">Contratado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b">
                <td className="py-1">{r.label}</td>
                <td className="py-1">{r.got}</td>
                <td className="py-1">{r.cap ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-md border p-3">
        <h2 className="text-lg font-semibold">Excedente</h2>
        <p>
          {party.overage_adults ?? 0} adulto(s) + {party.overage_children ?? 0}{" "}
          criança(s) excedente(s)
        </p>
        <p className="text-xl font-semibold">
          {formatCurrencyBRL(party.overage_total_cents ?? 0)}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">
          Presentes ({present.length})
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {present.map((g, i) => {
            const { classification } = classify(g.age, rules);
            return (
              <li key={i} className="flex justify-between border-b py-1">
                <span>
                  {g.name}
                  {g.age !== null && (
                    <span className="text-muted-foreground"> · {g.age}a</span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {CLASS_PT[classification]}
                  {g.origin === "walk_in" && (
                    <strong className="text-foreground"> · walk-in</strong>
                  )}
                  {g.origin !== "walk_in" && ` · ${ORIGIN_PT[g.origin] ?? g.origin}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
