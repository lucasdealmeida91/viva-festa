"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { classify, countByCategory, type AgeRules } from "@/lib/domain/classify";
import {
  addGroup,
  addGuest,
  removeGuest,
  type GuestFormState,
} from "@/app/app/festas/guests-actions";

export type GuestRow = {
  id: string;
  name: string;
  age: number | null;
  group_id: string | null;
  rsvp_status: "invited" | "confirmed" | "declined";
  origin: "host" | "companion" | "self_registered" | "walk_in";
};

export type GroupRow = { id: string; name: string };

const RSVP_PT = {
  invited: "Convidado",
  confirmed: "Confirmado",
  declined: "Recusou",
} as const;

const CLASS_PT = { exempt: "Isento", child: "Criança", adult: "Adulto" } as const;

type GuestListProps = {
  partyId: string;
  guests: GuestRow[];
  groups: GroupRow[];
  rules: AgeRules;
  capacity: { adults: number; children: number };
  frozen: boolean;
};

export function GuestList({
  partyId,
  guests,
  groups,
  rules,
  capacity,
  frozen,
}: GuestListProps) {
  const [guestState, addGuestAction, addingGuest] = useActionState<
    GuestFormState,
    FormData
  >(addGuest, null);
  const [groupState, addGroupAction, addingGroup] = useActionState<
    GuestFormState,
    FormData
  >(addGroup, null);

  // RN-5.5 — totalizadores: confirmados por categoria vs. contratado.
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed");
  const expected = countByCategory(
    confirmed.map((g) => g.age),
    rules,
  );

  const totals: Array<{ label: string; got: number; cap?: number }> = [
    { label: "Adultos", got: expected.adults, cap: capacity.adults },
    { label: "Crianças", got: expected.children, cap: capacity.children },
    { label: "Isentos", got: expected.exempt },
  ];

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Convidados ({guests.length})
        </h2>
      </div>

      {/* RN-5.5 totalizadores */}
      <div className="flex flex-wrap gap-3">
        {totals.map((total) => {
          const over = total.cap !== undefined && total.got > total.cap;
          return (
            <div
              key={total.label}
              className={`rounded-md border px-3 py-2 text-sm ${
                over ? "border-destructive text-destructive" : ""
              }`}
            >
              {total.label}: <strong>{total.got}</strong>
              {total.cap !== undefined && `/${total.cap}`}
            </div>
          );
        })}
        <span className="text-muted-foreground self-center text-xs">
          confirmados vs. contratado
        </span>
      </div>

      {guests.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {guests.map((guest) => {
            const { classification, needsReview } = classify(guest.age, rules);
            const group = groups.find((gr) => gr.id === guest.group_id);
            return (
              <li
                key={guest.id}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <span>
                  <span className="font-medium">{guest.name}</span>{" "}
                  <span className="text-muted-foreground">
                    {guest.age !== null ? `${guest.age} anos` : "idade?"} ·{" "}
                    {CLASS_PT[classification]}
                    {needsReview && (
                      <span className="text-amber-600"> · revisar idade</span>
                    )}
                    {" · "}
                    {RSVP_PT[guest.rsvp_status]}
                    {group && ` · ${group.name}`}
                    {guest.origin === "walk_in" && " · walk-in"}
                    {guest.origin === "self_registered" && " · auto-cadastro"}
                  </span>
                </span>
                {!frozen && (
                  <form action={removeGuest}>
                    <input type="hidden" name="id" value={guest.id} />
                    <input type="hidden" name="party_id" value={partyId} />
                    <Button type="submit" variant="ghost" size="sm">
                      Remover
                    </Button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {frozen ? (
        <p className="text-muted-foreground text-sm">
          Lista congelada — festa encerrada (RN-5.4).
        </p>
      ) : (
        <>
          <form
            action={addGuestAction}
            className="flex flex-wrap items-end gap-2 rounded-md border p-3"
          >
            <input type="hidden" name="party_id" value={partyId} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="guest-name">Nome</Label>
              <Input id="guest-name" name="name" required />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="guest-age">Idade</Label>
              <Input
                id="guest-age"
                name="age"
                type="number"
                min="0"
                className="w-20"
                placeholder="opc."
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="guest-phone">Telefone</Label>
              <Input id="guest-phone" name="phone" placeholder="opc." />
            </div>
            {groups.length > 0 && (
              <div className="flex flex-col gap-1">
                <Label htmlFor="guest-group">Grupo</Label>
                <select
                  id="guest-group"
                  name="group_id"
                  className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
                >
                  <option value="">Sem grupo</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" disabled={addingGuest}>
              {addingGuest ? "Adicionando…" : "Adicionar convidado"}
            </Button>
            {guestState?.error && (
              <p role="alert" className="text-destructive w-full text-sm">
                {guestState.error}
              </p>
            )}
          </form>

          <form action={addGroupAction} className="flex items-end gap-2">
            <input type="hidden" name="party_id" value={partyId} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="group-name">Novo grupo/família</Label>
              <Input id="group-name" name="group_name" placeholder="Família Souza" />
            </div>
            <Button type="submit" variant="outline" disabled={addingGroup}>
              {addingGroup ? "Criando…" : "Criar grupo"}
            </Button>
            {groupState?.error && (
              <p role="alert" className="text-destructive text-sm">
                {groupState.error}
              </p>
            )}
          </form>
        </>
      )}
    </section>
  );
}
