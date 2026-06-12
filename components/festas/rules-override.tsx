"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  overridePartyRules,
  type PartyActionState,
} from "@/app/app/festas/actions";

export type FrozenRules = {
  rule_exempt_age: number;
  rule_adult_age: number;
  rule_adult_capacity: number;
  rule_child_capacity: number;
  rule_extra_adult_price_cents: number;
  rule_extra_child_price_cents: number;
};

const FIELDS: Array<{ name: keyof FrozenRules; label: string }> = [
  { name: "rule_adult_capacity", label: "Adultos contratados" },
  { name: "rule_child_capacity", label: "Crianças contratadas" },
  { name: "rule_exempt_age", label: "Idade de isenção" },
  { name: "rule_adult_age", label: "Idade de adulto" },
  { name: "rule_extra_adult_price_cents", label: "Adulto excedente (centavos)" },
  { name: "rule_extra_child_price_cents", label: "Criança excedente (centavos)" },
];

/** RN-4.6 — sobrescrita das regras congeladas, caso a caso, com auditoria. */
export function RulesOverride({
  partyId,
  rules,
}: {
  partyId: string;
  rules: FrozenRules;
}) {
  const [state, formAction, pending] = useActionState<PartyActionState, FormData>(
    overridePartyRules,
    null,
  );

  return (
    <details className="max-w-md rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Sobrescrever regras desta festa (RN-4.6)
      </summary>
      <form action={formAction} className="mt-3 grid grid-cols-2 gap-3">
        <input type="hidden" name="id" value={partyId} />
        {FIELDS.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="number"
              min="0"
              defaultValue={rules[field.name]}
              required
            />
          </div>
        ))}
        <div className="col-span-full flex flex-col gap-1">
          <Label htmlFor="override-reason">Motivo (auditado — NF-6)</Label>
          <Input id="override-reason" name="reason" required />
        </div>
        {state?.error && (
          <p role="alert" className="text-destructive col-span-full text-sm">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="col-span-full self-start">
          {pending ? "Salvando…" : "Salvar regras da festa"}
        </Button>
      </form>
    </details>
  );
}
