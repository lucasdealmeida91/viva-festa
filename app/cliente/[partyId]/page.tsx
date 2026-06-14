"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countByCategory, classify } from "@/lib/domain/classify";
import { installmentStatus } from "@/lib/domain/financials";
import {
  formatCurrencyBRL,
  formatDateBR,
  formatTime,
  todayInSaoPaulo,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

type Party = {
  id: string;
  party_date: string;
  status: string;
  invite_token: string | null;
  invite_published: boolean;
  report_shared_with_customer: boolean;
  rule_exempt_age: number | null;
  rule_adult_age: number | null;
  rule_adult_capacity: number | null;
  rule_child_capacity: number | null;
  shifts: { label: string; starts_at: string; ends_at: string } | null;
};
type Guest = { id: string; name: string; age: number | null; rsvp_status: string };
type Installment = {
  id: string;
  kind: string;
  due_date: string;
  amount_cents: number;
  paid_at: string | null;
};
type Gift = {
  id: string;
  name: string;
  external_url: string | null;
  guests: { name: string } | null;
};

const RSVP_PT: Record<string, string> = {
  invited: "Convidado",
  confirmed: "Confirmado",
  declined: "Recusou",
};

export default function ClientePartyPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = use(params);
  const supabase = createClient();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [party, setParty] = useState<Party | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [copied, setCopied] = useState(false);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [giftName, setGiftName] = useState("");
  const [giftUrl, setGiftUrl] = useState("");

  const load = useCallback(async () => {
    const { data: p } = await supabase
      .from("parties")
      .select(
        `id, party_date, status, invite_token, invite_published,
         report_shared_with_customer, rule_exempt_age, rule_adult_age,
         rule_adult_capacity, rule_child_capacity,
         shifts (label, starts_at, ends_at)`,
      )
      .eq("id", partyId)
      .single();
    if (!p) {
      setState("denied");
      return;
    }
    setParty(p as Party);

    const { data: g } = await supabase
      .from("guests")
      .select("id, name, age, rsvp_status")
      .eq("party_id", partyId)
      .order("name");
    setGuests(g ?? []);

    const { data: ins } = await supabase
      .from("installments")
      .select("id, kind, due_date, amount_cents, paid_at, contracts!inner (party_id)")
      .eq("contracts.party_id", partyId)
      .order("due_date");
    setInstallments((ins ?? []) as Installment[]);

    const { data: path } = await supabase.rpc("customer_invite_path", {
      p_party_id: partyId,
    });
    setInviteLink(path ? `${window.location.origin}/${path}` : null);

    const { data: giftRows } = await supabase
      .from("gift_items")
      .select("id, name, external_url, guests:claimed_by_guest_id (name)")
      .eq("party_id", partyId)
      .order("created_at");
    setGifts((giftRows ?? []) as Gift[]);
    setState("ok");
  }, [supabase, partyId]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("denied");
        return;
      }
      await supabase.rpc("link_customer_account");
      await load();
    })();
  }, [supabase, load]);

  async function addGuest(e: React.FormEvent) {
    e.preventDefault();
    if (!party || !name.trim()) return;
    const { data: tenantRow } = await supabase
      .from("parties")
      .select("tenant_id")
      .eq("id", partyId)
      .single();
    if (!tenantRow) return;
    await supabase.from("guests").insert({
      tenant_id: tenantRow.tenant_id,
      party_id: partyId,
      name: name.trim(),
      age: age === "" ? null : Number(age),
    });
    setName("");
    setAge("");
    await load();
  }

  async function removeGuest(id: string) {
    await supabase.from("guests").delete().eq("id", id);
    await load();
  }

  async function addGift(e: React.FormEvent) {
    e.preventDefault();
    if (!party || !giftName.trim()) return;
    const { data: tenantRow } = await supabase
      .from("parties")
      .select("tenant_id")
      .eq("id", partyId)
      .single();
    if (!tenantRow) return;
    await supabase.from("gift_items").insert({
      tenant_id: tenantRow.tenant_id,
      party_id: partyId,
      name: giftName.trim(),
      external_url: giftUrl.trim() || null,
    });
    setGiftName("");
    setGiftUrl("");
    await load();
  }

  async function removeGift(id: string) {
    await supabase.from("gift_items").delete().eq("id", id);
    await load();
  }

  if (state === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando…</p>
      </main>
    );
  }
  if (state === "denied" || !party) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">Festa não encontrada no seu acesso.</p>
      </main>
    );
  }

  const rules = {
    exemptAge: party.rule_exempt_age ?? 0,
    adultAge: party.rule_adult_age ?? 13,
  };
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed");
  const expected = countByCategory(confirmed.map((g) => g.age), rules);
  const editable =
    party.status === "confirmed" && party.party_date >= todayInSaoPaulo();
  const today = todayInSaoPaulo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-4">
      <header>
        <Link href="/cliente" className="text-muted-foreground text-sm underline">
          ← Minhas festas
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          Festa de {formatDateBR(party.party_date)}
        </h1>
        {party.shifts && (
          <p className="text-muted-foreground">
            {party.shifts.label} ({formatTime(party.shifts.starts_at)}–
            {formatTime(party.shifts.ends_at)})
          </p>
        )}
      </header>

      <section className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-md border px-2 py-1">
          Adultos {expected.adults}
          {party.rule_adult_capacity != null && `/${party.rule_adult_capacity}`}
        </span>
        <span className="rounded-md border px-2 py-1">
          Crianças {expected.children}
          {party.rule_child_capacity != null && `/${party.rule_child_capacity}`}
        </span>
        <span className="rounded-md border px-2 py-1">Isentos {expected.exempt}</span>
        <span className="text-muted-foreground self-center text-xs">
          confirmados vs. contratado
        </span>
      </section>

      {inviteLink && (
        <section className="flex flex-col gap-1">
          <Label>Link do convite</Label>
          <div className="flex gap-2">
            <Input readOnly value={inviteLink} aria-label="Link do convite" />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">
          Convidados ({guests.length})
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {guests.map((g) => {
            const { classification } = classify(g.age, rules);
            const CLASS = { exempt: "isento", child: "criança", adult: "adulto" } as const;
            return (
              <li
                key={g.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <span>
                  {g.name}
                  <span className="text-muted-foreground">
                    {" · "}
                    {CLASS[classification]} · {RSVP_PT[g.rsvp_status]}
                  </span>
                </span>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuest(g.id)}
                  >
                    Remover
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {editable ? (
          <form onSubmit={addGuest} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="g-name">Nome</Label>
              <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="g-age">Idade</Label>
              <Input
                id="g-age"
                type="number"
                min="0"
                className="w-20"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!name.trim()}>
              Adicionar
            </Button>
          </form>
        ) : (
          <p className="text-muted-foreground text-sm">
            A lista não pode mais ser editada.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Lista de presentes</h2>
        {gifts.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {gifts.map((gift) => (
              <li
                key={gift.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <span>
                  {gift.external_url ? (
                    <a
                      href={gift.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      {gift.name}
                    </a>
                  ) : (
                    gift.name
                  )}
                  {gift.guests && (
                    <span className="text-green-700">
                      {" "}
                      · escolhido por {gift.guests.name}
                    </span>
                  )}
                </span>
                {editable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGift(gift.id)}
                  >
                    Remover
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {editable && (
          <form onSubmit={addGift} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="gift-name">Presente</Label>
              <Input
                id="gift-name"
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="gift-url">Link (opcional)</Label>
              <Input
                id="gift-url"
                value={giftUrl}
                onChange={(e) => setGiftUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <Button type="submit" disabled={!giftName.trim()}>
              Adicionar
            </Button>
          </form>
        )}
      </section>

      {installments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Pagamentos (somente leitura)</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {installments.map((i) => {
              const { status } = installmentStatus(i, today);
              return (
                <li key={i.id} className="flex justify-between border-b py-1">
                  <span>{formatDateBR(i.due_date)}</span>
                  <span>
                    {formatCurrencyBRL(i.amount_cents)}{" "}
                    {status === "paid" ? "✓" : status === "overdue" ? "⚠ vencida" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {party.status === "completed" && party.report_shared_with_customer && (
        <p className="text-muted-foreground text-sm">
          O relatório pós-festa foi compartilhado pelo buffet.
        </p>
      )}
    </main>
  );
}
