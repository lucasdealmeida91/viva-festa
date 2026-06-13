"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL, formatDateBR, todayInSaoPaulo } from "@/lib/format";
import { installmentStatus } from "@/lib/domain/financials";
import {
  registerPayment,
  undoPayment,
  type PaymentFormState,
} from "@/app/app/financeiro/actions";

export type InstallmentRow = {
  id: string;
  kind: "down_payment" | "regular" | "overage";
  due_date: string;
  amount_cents: number;
  paid_at: string | null;
  payment_method: string | null;
};

const KIND_PT = {
  down_payment: "Entrada",
  regular: "Parcela",
  overage: "Excedente",
} as const;

const METHODS = ["PIX", "Dinheiro", "Cartão", "Transferência", "Outro"];

function PaymentForm({
  installment,
  partyId,
}: {
  installment: InstallmentRow;
  partyId: string;
}) {
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(
    registerPayment,
    null,
  );
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={installment.id} />
      <input type="hidden" name="party_id" value={partyId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor={`paid-${installment.id}`}>Pago em</Label>
        <Input
          id={`paid-${installment.id}`}
          name="paid_date"
          type="date"
          defaultValue={todayInSaoPaulo()}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`method-${installment.id}`}>Forma</Label>
        <select
          id={`method-${installment.id}`}
          name="method"
          required
          className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          {METHODS.map((method) => (
            <option key={method}>{method}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`note-${installment.id}`}>Observação</Label>
        <Input id={`note-${installment.id}`} name="note" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Confirmar pagamento"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

function UndoForm({
  installment,
  partyId,
}: {
  installment: InstallmentRow;
  partyId: string;
}) {
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(
    undoPayment,
    null,
  );
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={installment.id} />
      <input type="hidden" name="party_id" value={partyId} />
      <div className="flex flex-col gap-1">
        <Label htmlFor={`undo-${installment.id}`}>Motivo do estorno</Label>
        <Input id={`undo-${installment.id}`} name="reason" required />
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Desfazendo…" : "Desfazer pagamento"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-destructive w-full text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function InstallmentsList({
  installments,
  partyId,
}: {
  installments: InstallmentRow[];
  partyId: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayInSaoPaulo();

  return (
    <ul className="mt-2 flex flex-col gap-2 text-sm">
      {installments
        .slice()
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .map((installment) => {
          const { status, daysOverdue } = installmentStatus(installment, today);
          return (
            <li key={installment.id} className="rounded-md border p-2">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {KIND_PT[installment.kind]} · {formatDateBR(installment.due_date)}
                  {status === "paid" && (
                    <span className="text-green-700">
                      {" "}
                      · Paga ({installment.payment_method})
                    </span>
                  )}
                  {status === "overdue" && (
                    <span className="text-destructive">
                      {" "}
                      · Vencida há {daysOverdue}{" "}
                      {daysOverdue === 1 ? "dia" : "dias"}
                    </span>
                  )}
                  {status === "pending" && (
                    <span className="text-muted-foreground"> · Pendente</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {formatCurrencyBRL(installment.amount_cents)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setOpenId(openId === installment.id ? null : installment.id)
                    }
                  >
                    {status === "paid" ? "Estornar" : "Registrar pagamento"}
                  </Button>
                </span>
              </div>
              {openId === installment.id &&
                (status === "paid" ? (
                  <UndoForm installment={installment} partyId={partyId} />
                ) : (
                  <PaymentForm installment={installment} partyId={partyId} />
                ))}
            </li>
          );
        })}
    </ul>
  );
}
