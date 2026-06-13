import Link from "next/link";
import { notFound } from "next/navigation";
import { ChildrenManager } from "@/components/clientes/children-manager";
import { CustomerForm } from "@/components/clientes/customer-form";
import { consolidateFinance } from "@/lib/domain/financials";
import {
  PARTY_STATUS_PT,
  formatCurrencyBRL,
  formatDateBR,
  todayInSaoPaulo,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cliente" };

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday_children (id, name, birth_month, birth_year)",
    )
    .eq("id", id)
    .single();

  if (!customer) notFound();

  // RN-10.2 — todas as festas (passadas e futuras) + financeiro consolidado
  const { data: parties } = await supabase
    .from("parties")
    .select(
      `id, party_date, status,
       contracts ( installments ( due_date, amount_cents, paid_at ) )`,
    )
    .eq("customer_id", id)
    .order("party_date", { ascending: false });

  const installments = (parties ?? []).flatMap(
    (party) => party.contracts?.installments ?? [],
  );
  const finance = consolidateFinance(installments, todayInSaoPaulo());

  return (
    <main className="flex flex-col gap-8 p-6">
      <header>
        <Link
          href="/app/clientes"
          className="text-muted-foreground text-sm underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{customer.name}</h1>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Festas ({(parties ?? []).length})
        </h2>
        {(parties ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma festa vinculada ainda.
          </p>
        ) : (
          <ul className="flex max-w-md flex-col gap-2">
            {parties!.map((party) => (
              <li key={party.id}>
                <Link
                  href={`/app/festas/${party.id}`}
                  className="hover:bg-accent flex justify-between rounded-md border p-3 text-sm"
                >
                  <span>Festa de {formatDateBR(party.party_date)}</span>
                  <span className="text-muted-foreground">
                    {PARTY_STATUS_PT[party.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {finance.totalCents > 0 && (
          <dl className="mt-2 grid max-w-md grid-cols-2 gap-1 rounded-md border p-3 text-sm">
            <dt className="text-muted-foreground">Total contratado</dt>
            <dd>{formatCurrencyBRL(finance.totalCents)}</dd>
            <dt className="text-muted-foreground">Pago</dt>
            <dd className="text-green-700">
              {formatCurrencyBRL(finance.paidCents)}
            </dd>
            <dt className="text-muted-foreground">Pendente</dt>
            <dd>{formatCurrencyBRL(finance.pendingCents)}</dd>
            <dt className="text-muted-foreground">Vencido</dt>
            <dd className={finance.overdueCents > 0 ? "text-destructive" : ""}>
              {formatCurrencyBRL(finance.overdueCents)}
            </dd>
          </dl>
        )}
      </section>

      <CustomerForm customer={customer} />
      <ChildrenManager
        customerId={customer.id}
        childrenList={customer.birthday_children ?? []}
      />
    </main>
  );
}
