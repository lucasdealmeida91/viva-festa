"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { startCheckout, type CheckoutState } from "@/app/app/assinatura/actions";

export function CheckoutButtons() {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    startCheckout,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <button
          type="submit"
          name="plan"
          value="monthly"
          disabled={pending}
          className="hover:bg-accent w-56 rounded-md border p-4 text-left disabled:opacity-50"
        >
          <span className="font-semibold">Mensal</span>
          <span className="block text-2xl font-semibold">R$ 197</span>
          <span className="text-muted-foreground text-sm">por mês</span>
        </button>
        <button
          type="submit"
          name="plan"
          value="annual"
          disabled={pending}
          className="hover:bg-accent w-56 rounded-md border p-4 text-left disabled:opacity-50"
        >
          <span className="font-semibold">Anual</span>
          <span className="block text-2xl font-semibold">R$ 1.970</span>
          <span className="text-muted-foreground text-sm">
            por ano (2 meses grátis)
          </span>
        </button>
      </div>
      <Button type="submit" name="plan" value="monthly" disabled={pending} className="self-start">
        {pending ? "Redirecionando…" : "Assinar (mensal)"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}
