"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL } from "@/lib/format";
import {
  closeParty,
  decideOverage,
  type ClosingState,
} from "@/app/app/festas/closing-actions";

const DECISION_PT = {
  pending: "Pendente",
  confirmed: "Confirmado",
  adjusted: "Ajustado",
  waived: "Dispensado",
} as const;

type ClosingPanelProps = {
  partyId: string;
  status: string;
  overage: {
    adults: number | null;
    children: number | null;
    totalCents: number | null;
    decision: "pending" | "confirmed" | "adjusted" | "waived";
  };
};

export function ClosingPanel({ partyId, status, overage }: ClosingPanelProps) {
  const [closeState, closeAction, closing] = useActionState<ClosingState, FormData>(
    closeParty,
    null,
  );
  const [decideState, decideAction, deciding] = useActionState<
    ClosingState,
    FormData
  >(decideOverage, null);

  if (status === "confirmed") {
    return (
      <form action={closeAction} className="flex max-w-md flex-col gap-2">
        <input type="hidden" name="party_id" value={partyId} />
        <h2 className="text-lg font-semibold">Encerrar festa (RN-8.1)</h2>
        <p className="text-muted-foreground text-sm">
          Marca como ausente quem não recebeu check-in, congela as contagens e
          calcula o excedente. Ação irreversível (só reabertura do gestor).
        </p>
        {closeState?.error && (
          <p role="alert" className="text-destructive text-sm">
            {closeState.error}
          </p>
        )}
        <Button type="submit" disabled={closing} className="self-start">
          {closing ? "Encerrando…" : "Encerrar e calcular excedente"}
        </Button>
      </form>
    );
  }

  if (status !== "completed") return null;

  const total = overage.totalCents ?? 0;

  return (
    <section className="flex max-w-md flex-col gap-3">
      <h2 className="text-lg font-semibold">Excedente (RN-8.4)</h2>
      <div className="rounded-md border p-3 text-sm">
        <p>
          Adultos excedentes: <strong>{overage.adults ?? 0}</strong> · Crianças
          excedentes: <strong>{overage.children ?? 0}</strong>
        </p>
        <p className="mt-1 text-lg font-semibold">
          {formatCurrencyBRL(total)}
        </p>
        <p className="text-muted-foreground">
          Decisão: {DECISION_PT[overage.decision]}
        </p>
      </div>

      {overage.decision === "pending" && (
        <form action={decideAction} className="flex flex-col gap-2 rounded-md border p-3">
          <input type="hidden" name="party_id" value={partyId} />
          <div className="flex flex-col gap-1">
            <Label htmlFor="overage-decision">Ação</Label>
            <select
              id="overage-decision"
              name="decision"
              className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
            >
              <option value="confirmed">Confirmar cobrança</option>
              <option value="adjusted">Ajustar valor</option>
              <option value="waived">Dispensar</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="overage-amount">Valor ajustado (R$)</Label>
            <Input id="overage-amount" name="amount" type="number" step="0.01" min="0" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="overage-reason">Motivo (obrigatório se ajustar)</Label>
            <Input id="overage-reason" name="reason" />
          </div>
          {decideState?.error && (
            <p role="alert" className="text-destructive text-sm">
              {decideState.error}
            </p>
          )}
          <Button type="submit" disabled={deciding} className="self-start">
            {deciding ? "Registrando…" : "Registrar decisão"}
          </Button>
        </form>
      )}
    </section>
  );
}
