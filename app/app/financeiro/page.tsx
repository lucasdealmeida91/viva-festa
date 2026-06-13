import Link from "next/link";
import {
  installmentStatus,
  summarizeMonth,
} from "@/lib/domain/financials";
import {
  formatCurrencyBRL,
  formatDateBR,
  todayInSaoPaulo,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const supabase = await createClient();
  const today = todayInSaoPaulo();
  const monthPrefix = today.slice(0, 7);

  const { data: installments } = await supabase
    .from("installments")
    .select(
      `id, due_date, amount_cents, paid_at, kind,
       contracts ( parties ( id, party_date, customers ( name ) ) )`,
    )
    .order("due_date");

  const all = installments ?? [];
  const summary = summarizeMonth(all, monthPrefix, today);
  const overdue = all
    .map((installment) => ({
      installment,
      ...installmentStatus(installment, today),
    }))
    .filter((row) => row.status === "overdue")
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const cards = [
    { label: "A receber no mês", value: summary.dueInMonthCents },
    { label: "Recebido no mês", value: summary.receivedInMonthCents },
    { label: "Vencidas", value: summary.overdueCents, alert: true },
  ];

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Financeiro</h1>
        <p className="text-muted-foreground text-sm">
          Visão do mês (RN-9.4) — registro de pagamentos é manual (RN-9.3).
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        {cards.map((card) => (
          <div key={card.label} className="min-w-44 rounded-md border p-4">
            <p className="text-muted-foreground text-sm">{card.label}</p>
            <p
              className={`text-xl font-semibold ${
                card.alert && card.value > 0 ? "text-destructive" : ""
              }`}
            >
              {formatCurrencyBRL(card.value)}
            </p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Parcelas vencidas ({summary.overdueCount})
        </h2>
        {overdue.length === 0 ? (
          <p className="text-muted-foreground">Nenhuma parcela vencida. 🎉</p>
        ) : (
          <ul className="flex max-w-xl flex-col gap-2">
            {overdue.map(({ installment, daysOverdue }) => {
              const party = installment.contracts?.parties;
              return (
                <li
                  key={installment.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {party?.customers?.name ?? "Cliente"}
                    </span>{" "}
                    ·{" "}
                    {party ? (
                      <Link
                        href={`/app/festas/${party.id}`}
                        className="underline"
                      >
                        festa de {formatDateBR(party.party_date)}
                      </Link>
                    ) : (
                      "festa"
                    )}
                    <span className="text-destructive">
                      {" "}
                      · {daysOverdue} {daysOverdue === 1 ? "dia" : "dias"} de
                      atraso
                    </span>
                  </span>
                  <span>{formatCurrencyBRL(installment.amount_cents)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
