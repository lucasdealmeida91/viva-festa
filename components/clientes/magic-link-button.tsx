"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  sendCustomerMagicLink,
  type MagicLinkState,
} from "@/app/app/clientes/magic-link-actions";

export function MagicLinkButton({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(
    sendCustomerMagicLink,
    null,
  );
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="customer_id" value={customerId} />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        {pending ? "Enviando…" : "Enviar acesso ao cliente (magic link)"}
      </Button>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-green-700">
          {state.success}
        </p>
      )}
    </form>
  );
}
