import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ContractForm } from "@/components/festas/contract-form";
import { formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Confirmar festa" };

export default async function ConfirmarFestaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select(
      "id, party_date, status, customer_id, packages (name, base_price_cents)",
    )
    .eq("id", id)
    .single();

  if (!party) notFound();
  if (party.status !== "reserved") redirect(`/app/festas/${id}`);

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name")
    .order("name");

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link
          href={`/app/festas/${id}`}
          className="text-muted-foreground text-sm underline"
        >
          ← Festa
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Confirmar festa de {formatDateBR(party.party_date)}
        </h1>
        <p className="text-muted-foreground text-sm">
          Confirmar exige contrato: valor, entrada e plano de parcelas
          (RN-3.3, RN-9.1).
        </p>
      </header>

      {(customers ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          Cadastre o{" "}
          <Link href="/app/clientes" className="underline">
            cliente
          </Link>{" "}
          antes de confirmar a festa.
        </p>
      ) : (
        <ContractForm
          partyId={party.id}
          partyDate={party.party_date}
          basePriceCents={party.packages!.base_price_cents}
          defaultCustomerId={party.customer_id ?? undefined}
          customers={customers ?? []}
        />
      )}
    </main>
  );
}
