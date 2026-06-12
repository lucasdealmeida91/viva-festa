"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestInstallments } from "@/lib/domain/installments";
import { formatCurrencyBRL, formatDateBR, todayInSaoPaulo } from "@/lib/format";
import {
  confirmWithContract,
  type PartyActionState,
} from "@/app/app/festas/actions";

type ContractFormProps = {
  partyId: string;
  partyDate: string;
  basePriceCents: number;
  defaultCustomerId?: string;
  customers: { id: string; name: string }[];
};

export function ContractForm({
  partyId,
  partyDate,
  basePriceCents,
  defaultCustomerId,
  customers,
}: ContractFormProps) {
  const [state, formAction, pending] = useActionState<PartyActionState, FormData>(
    confirmWithContract,
    null,
  );
  const today = todayInSaoPaulo();

  const [totalReais, setTotalReais] = useState((basePriceCents / 100).toFixed(2));
  const [downReais, setDownReais] = useState("0");
  const [count, setCount] = useState<number | "">("");

  const totalCents = Math.round(Number(totalReais || "0") * 100);
  const downCents = Math.round(Number(downReais || "0") * 100);

  const plan = useMemo(() => {
    if (totalCents <= 0 || downCents < 0 || downCents > totalCents) return [];
    return suggestInstallments({
      totalCents,
      downPaymentCents: downCents,
      confirmationDate: today,
      partyDate,
      installmentCount: count === "" ? undefined : count,
    });
  }, [totalCents, downCents, today, partyDate, count]);

  const installmentsJson = JSON.stringify(
    plan.map((i) => ({
      kind: i.kind,
      due_date: i.dueDate,
      amount_cents: i.amountCents,
    })),
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="id" value={partyId} />
      <input type="hidden" name="total_cents" value={totalCents} />
      <input type="hidden" name="down_payment_cents" value={downCents} />
      <input type="hidden" name="installments" value={installmentsJson} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="customer">Cliente</Label>
        <select
          id="customer"
          name="customer_id"
          required
          defaultValue={defaultCustomerId}
          className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          <option value="">Escolha o cliente…</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="total">Valor total (R$)</Label>
          <Input
            id="total"
            type="number"
            step="0.01"
            min="0"
            value={totalReais}
            onChange={(e) => setTotalReais(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="down">Entrada (R$)</Label>
          <Input
            id="down"
            type="number"
            step="0.01"
            min="0"
            value={downReais}
            onChange={(e) => setDownReais(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="count">Parcelas</Label>
          <Input
            id="count"
            type="number"
            min="1"
            placeholder="auto"
            value={count}
            onChange={(e) =>
              setCount(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-24"
          />
        </div>
      </div>

      {plan.length > 0 && (
        <div className="rounded-md border p-3">
          <h3 className="mb-2 text-sm font-medium">Plano sugerido (RN-9.1)</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {plan.map((installment, index) => (
              <li key={index} className="flex justify-between">
                <span>
                  {installment.kind === "down_payment"
                    ? "Entrada"
                    : `Parcela ${index + (downCents > 0 ? 0 : 1)}`}{" "}
                  · {formatDateBR(installment.dueDate)}
                </span>
                <span>{formatCurrencyBRL(installment.amountCents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending || plan.length === 0}>
        {pending ? "Confirmando…" : "Confirmar festa com contrato"}
      </Button>
    </form>
  );
}
