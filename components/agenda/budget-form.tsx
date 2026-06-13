"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBudget, type BudgetFormState } from "@/app/app/agenda/actions";

type BudgetFormProps = {
  defaultDate: string;
  shifts: { id: string; label: string }[];
  defaultShiftId?: string;
  packages: { id: string; name: string }[];
  customers: { id: string; name: string }[];
};

export function BudgetForm({
  defaultDate,
  shifts,
  defaultShiftId,
  packages,
  customers,
}: BudgetFormProps) {
  const [state, formAction, pending] = useActionState<BudgetFormState, FormData>(
    createBudget,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="party_date">Data</Label>
        <Input
          id="party_date"
          name="party_date"
          type="date"
          defaultValue={defaultDate}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="shift_id">Turno</Label>
        <select
          id="shift_id"
          name="shift_id"
          required
          defaultValue={defaultShiftId}
          className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          {shifts.map((shift) => (
            <option key={shift.id} value={shift.id}>
              {shift.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="package_id">Pacote</Label>
        <select
          id="package_id"
          name="package_id"
          required
          className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="budget-customer">Cliente (opcional)</Label>
        <select
          id="budget-customer"
          name="customer_id"
          className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
        >
          <option value="">Sem cliente por enquanto</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Observações</Label>
        <Input id="notes" name="notes" placeholder="Interessado via WhatsApp…" />
      </div>

      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Criando…" : "Criar orçamento"}
      </Button>
    </form>
  );
}
