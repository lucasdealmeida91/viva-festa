import Link from "next/link";
import { notFound } from "next/navigation";
import { CaptureOnce } from "@/components/analytics/capture-once";
import { GuestList } from "@/components/festas/guest-list";
import { InstallmentsList } from "@/components/festas/installments-list";
import { InviteManager } from "@/components/festas/invite-manager";
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
       invite_token, invite_published, host_message, list_mode,
       rsvp_deadline, turning_age, birthday_child_id,
       packages (name, base_price_cents, adult_capacity, child_capacity,
         exempt_age, adult_age),
       shifts (label, starts_at, ends_at),
       customers (id, name, birthday_children (id, name)),
       contracts (total_cents, down_payment_cents,
         installments (id, kind, due_date, amount_cents, paid_at, payment_method))`,
    )
    .eq("id", id)
    .single();

  if (!party) notFound();

  // slug do tenant para montar o link do convite (RN-6.1)
  const { data: tenant } = await supabase
    .from("tenants")
    .select("slug")
    .limit(1)
    .single();
  const tenantSlug = tenant?.slug ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const [{ data: guests }, { data: groups }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name, age, group_id, rsvp_status, origin")
      .eq("party_id", id)
      .order("created_at"),
    supabase
      .from("guest_groups")
      .select("id, name")
      .eq("party_id", id)
      .order("name"),
  ]);

  // Regras de classificação: congeladas se confirmada, senão as do pacote.
  const ageRules = {
    exemptAge: party.rule_exempt_age ?? party.packages!.exempt_age,
    adultAge: party.rule_adult_age ?? party.packages!.adult_age,
  };
  const capacity = {
    adults: party.rule_adult_capacity ?? party.packages!.adult_capacity,
    children: party.rule_child_capacity ?? party.packages!.child_capacity,
  };

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
        {party.customers && (
          <>
            <dt className="text-muted-foreground">Cliente</dt>
            <dd>
              <Link
                href={`/app/clientes/${party.customers.id}`}
                className="underline"
              >
                {party.customers.name}
              </Link>
            </dd>
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

      {party.contracts && (
        <section className="max-w-md rounded-md border p-4">
          <h2 className="text-base font-semibold">Contrato (RN-9.1)</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Total {formatCurrencyBRL(party.contracts.total_cents)} · entrada{" "}
            {formatCurrencyBRL(party.contracts.down_payment_cents)}
          </p>
          <InstallmentsList
            installments={party.contracts.installments}
            partyId={party.id}
          />
        </section>
      )}

      {party.status !== "budget" && party.status !== "canceled" && (
        <GuestList
          partyId={party.id}
          guests={guests ?? []}
          groups={groups ?? []}
          rules={ageRules}
          capacity={capacity}
          frozen={party.status === "completed"}
        />
      )}

      {party.status === "confirmed" && (
        <InviteManager
          partyId={party.id}
          slug={tenantSlug}
          appUrl={appUrl}
          invite={{
            token: party.invite_token,
            published: party.invite_published,
            birthdayChildId: party.birthday_child_id,
            turningAge: party.turning_age,
            hostMessage: party.host_message,
            listMode: party.list_mode,
            rsvpDeadline: party.rsvp_deadline,
          }}
          childOptions={party.customers?.birthday_children ?? []}
        />
      )}

      <PartyActions id={party.id} status={party.status} />
      {frozen && <RulesOverride partyId={party.id} rules={frozen} />}
    </main>
  );
}
