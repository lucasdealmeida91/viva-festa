import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptureOnce } from "@/components/analytics/capture-once";
import { PartyActions } from "@/components/festas/party-actions";
import {
  RulesOverride,
  type FrozenRules,
} from "@/components/festas/rules-override";
import {
  PARTY_STATUS_PT,
  formatCurrencyBRL,
  formatDateBR,
  formatTime,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Festa" };

export default async function FestaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmada?: string }>;
}) {
  const { id } = await params;
  const { confirmada } = await searchParams;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select(
      `id, party_date, status, notes, created_at,
       rule_exempt_age, rule_adult_age, rule_adult_capacity,
       rule_child_capacity, rule_extra_adult_price_cents,
       rule_extra_child_price_cents,
       packages (name, base_price_cents, adult_capacity, child_capacity),
       shifts (label, starts_at, ends_at)`,
    )
    .eq("id", id)
    .single();

  if (!party) notFound();

  const frozen: FrozenRules | null =
    party.rule_adult_age !== null
      ? {
          rule_exempt_age: party.rule_exempt_age!,
          rule_adult_age: party.rule_adult_age!,
          rule_adult_capacity: party.rule_adult_capacity!,
          rule_child_capacity: party.rule_child_capacity!,
          rule_extra_adult_price_cents: party.rule_extra_adult_price_cents!,
          rule_extra_child_price_cents: party.rule_extra_child_price_cents!,
        }
      : null;

  return (
    <main className="flex flex-col gap-6 p-6">
      {confirmada === "1" && <CaptureOnce event="party_confirmed" />}
      <header>
        <Link
          href={`/app/agenda?mes=${party.party_date.slice(0, 7)}`}
          className="text-muted-foreground text-sm underline"
        >
          ← Agenda
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          Festa de {formatDateBR(party.party_date)}
        </h1>
        <p className="text-muted-foreground">
          Status: <strong>{PARTY_STATUS_PT[party.status]}</strong>
        </p>
      </header>

      <dl className="grid max-w-md grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Turno</dt>
        <dd>
          {party.shifts!.label} ({formatTime(party.shifts!.starts_at)}–
          {formatTime(party.shifts!.ends_at)})
        </dd>
        <dt className="text-muted-foreground">Pacote</dt>
        <dd>
          {party.packages!.name} · {party.packages!.adult_capacity} adultos +{" "}
          {party.packages!.child_capacity} crianças ·{" "}
          {formatCurrencyBRL(party.packages!.base_price_cents)}
        </dd>
        {party.notes && (
          <>
            <dt className="text-muted-foreground">Observações</dt>
            <dd>{party.notes}</dd>
          </>
        )}
        {frozen && (
          <>
            <dt className="text-muted-foreground">Regras congeladas (RN-4.5)</dt>
            <dd>
              {frozen.rule_adult_capacity} adultos +{" "}
              {frozen.rule_child_capacity} crianças · isenção &lt;{" "}
              {frozen.rule_exempt_age} · adulto ≥ {frozen.rule_adult_age} ·
              excedente {formatCurrencyBRL(frozen.rule_extra_adult_price_cents)}
              /{formatCurrencyBRL(frozen.rule_extra_child_price_cents)}
            </dd>
          </>
        )}
      </dl>

      <PartyActions id={party.id} status={party.status} />
      {frozen && <RulesOverride partyId={party.id} rules={frozen} />}
    </main>
  );
}
