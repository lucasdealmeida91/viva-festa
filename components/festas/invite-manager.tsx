"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  publishInvite,
  unpublishInvite,
  type InviteFormState,
} from "@/app/app/festas/invite-actions";

type InviteManagerProps = {
  partyId: string;
  slug: string;
  appUrl: string;
  invite: {
    token: string | null;
    published: boolean;
    birthdayChildId: string | null;
    turningAge: number | null;
    hostMessage: string | null;
    listMode: "closed" | "open";
    rsvpDeadline: string | null;
  };
  childOptions: { id: string; name: string }[];
};

export function InviteManager({
  partyId,
  slug,
  appUrl,
  invite,
  childOptions,
}: InviteManagerProps) {
  const [state, formAction, pending] = useActionState<InviteFormState, FormData>(
    publishInvite,
    null,
  );
  const [copied, setCopied] = useState(false);

  const link =
    invite.published && invite.token
      ? `${appUrl}/${slug}/${invite.token}`
      : null;

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Convite digital (RN-6)</h2>

      {link && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
          <a href={link} className="underline" target="_blank" rel="noreferrer">
            {link}
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? "Copiado!" : "Copiar link"}
          </Button>
          <form action={unpublishInvite}>
            <input type="hidden" name="party_id" value={partyId} />
            <Button type="submit" variant="ghost" size="sm">
              Despublicar
            </Button>
          </form>
        </div>
      )}

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <input type="hidden" name="party_id" value={partyId} />
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-child">Aniversariante</Label>
          <select
            id="invite-child"
            name="birthday_child_id"
            defaultValue={invite.birthdayChildId ?? ""}
            className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="">—</option>
            {childOptions.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-age">Faz quantos anos</Label>
          <Input
            id="invite-age"
            name="turning_age"
            type="number"
            min="0"
            className="w-24"
            defaultValue={invite.turningAge ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-mode">Modo da lista</Label>
          <select
            id="invite-mode"
            name="list_mode"
            defaultValue={invite.listMode}
            className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="closed">Fechada (só quem está na lista)</option>
            <option value="open">Aberta (qualquer um se adiciona)</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="invite-deadline">Prazo de RSVP</Label>
          <Input
            id="invite-deadline"
            name="rsvp_deadline"
            type="date"
            defaultValue={invite.rsvpDeadline ?? ""}
          />
        </div>
        <div className="flex w-full flex-col gap-1">
          <Label htmlFor="invite-message">Mensagem do anfitrião</Label>
          <Input
            id="invite-message"
            name="host_message"
            defaultValue={invite.hostMessage ?? ""}
            placeholder="Venha comemorar com a gente!"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending
            ? "Publicando…"
            : invite.published
              ? "Atualizar convite"
              : "Publicar convite"}
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
