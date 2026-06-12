"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MONTHS_PT } from "@/lib/format";
import {
  addChild,
  removeChild,
  type CustomerFormState,
} from "@/app/app/clientes/actions";

type Child = {
  id: string;
  name: string;
  birth_month: number;
  birth_year: number;
};

export function ChildrenManager({
  customerId,
  childrenList,
}: {
  customerId: string;
  childrenList: Child[];
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    addChild,
    null,
  );
  const currentYear = new Date().getFullYear();

  return (
    <section className="flex max-w-md flex-col gap-4">
      <h2 className="text-lg font-semibold">Aniversariantes</h2>
      <p className="text-muted-foreground text-sm">
        Apenas mês e ano de nascimento — princípio de minimização da LGPD
        (RN-10.1).
      </p>

      {childrenList.length > 0 && (
        <ul className="flex flex-col gap-2">
          {childrenList.map((child) => (
            <li
              key={child.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span>
                <span className="font-medium">{child.name}</span>{" "}
                <span className="text-muted-foreground text-sm">
                  {MONTHS_PT[child.birth_month - 1]}/{child.birth_year}
                </span>
              </span>
              <form action={removeChild}>
                <input type="hidden" name="id" value={child.id} />
                <input type="hidden" name="customer_id" value={customerId} />
                <Button type="submit" variant="outline" size="sm">
                  Remover
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <input type="hidden" name="customer_id" value={customerId} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="child-name">Nome da criança</Label>
          <Input id="child-name" name="name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="child-month">Mês de nascimento</Label>
          <select
            id="child-month"
            name="birth_month"
            required
            className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            {MONTHS_PT.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="child-year">Ano</Label>
          <Input
            id="child-year"
            name="birth_year"
            type="number"
            min="1990"
            max={currentYear}
            required
            className="w-24"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adicionando…" : "Adicionar"}
        </Button>

        {state?.error && (
          <p role="alert" className="text-destructive w-full text-sm">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p role="status" className="w-full text-sm text-green-700">
            {state.success}
          </p>
        )}
      </form>
    </section>
  );
}
