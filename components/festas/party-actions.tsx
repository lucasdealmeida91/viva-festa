"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelParty,
  completeParty,
  confirmParty,
  reopenParty,
  reserveParty,
  type PartyActionState,
} from "@/app/app/festas/actions";

type Status = "budget" | "reserved" | "confirmed" | "completed" | "canceled";

function SimpleTransition({
  id,
  action,
  label,
  note,
}: {
  id: string;
  action: typeof reserveParty;
  label: string;
  note?: string;
}) {
  const [state, formAction, pending] = useActionState<PartyActionState, FormData>(
    action,
    null,
  );
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Aguarde…" : label}
      </Button>
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
    </form>
  );
}

function ReasonTransition({
  id,
  action,
  label,
  reasonLabel,
}: {
  id: string;
  action: typeof cancelParty;
  label: string;
  reasonLabel: string;
}) {
  const [state, formAction, pending] = useActionState<PartyActionState, FormData>(
    action,
    null,
  );
  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-md border p-3"
    >
      <input type="hidden" name="id" value={id} />
      <Label htmlFor={`reason-${label}`}>{reasonLabel}</Label>
      <Input id={`reason-${label}`} name="reason" required />
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        disabled={pending}
        className="self-start"
      >
        {pending ? "Aguarde…" : label}
      </Button>
    </form>
  );
}

export function PartyActions({ id, status }: { id: string; status: Status }) {
  return (
    <section className="flex max-w-md flex-col gap-4">
      {status === "budget" && (
        <SimpleTransition id={id} action={reserveParty} label="Reservar data" />
      )}
      {status === "reserved" && (
        <SimpleTransition
          id={id}
          action={confirmParty}
          label="Confirmar festa"
          note="A partir do M2, confirmar exigirá contrato (RN-3.3)."
        />
      )}
      {status === "confirmed" && (
        <SimpleTransition
          id={id}
          action={completeParty}
          label="Marcar como realizada"
          note="O encerramento completo (check-in e excedente) chega no M4."
        />
      )}
      {(status === "budget" || status === "reserved" || status === "confirmed") && (
        <ReasonTransition
          id={id}
          action={cancelParty}
          label="Cancelar festa"
          reasonLabel="Motivo do cancelamento"
        />
      )}
      {status === "completed" && (
        <ReasonTransition
          id={id}
          action={reopenParty}
          label="Reabrir festa"
          reasonLabel="Motivo da reabertura (auditado — RN-3.4)"
        />
      )}
    </section>
  );
}
