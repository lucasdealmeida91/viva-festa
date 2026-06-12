"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  inviteMember,
  removeMember,
  type SettingsState,
} from "@/app/app/configuracoes/actions";

const ROLE_PT = { manager: "Gestor", receptionist: "Recepcionista" } as const;

type Member = {
  id: string;
  role: "manager" | "receptionist";
  isSelf: boolean;
  fullName: string;
};

export function TeamManager({ members }: { members: Member[] }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    inviteMember,
    null,
  );

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Equipe</h2>
      <p className="text-muted-foreground text-sm">
        Recepcionistas acessam apenas o check-in das festas de hoje e amanhã
        (RN-1.3).
      </p>

      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-md border p-3"
          >
            <div>
              <span className="font-medium">{member.fullName}</span>{" "}
              <span className="text-muted-foreground text-sm">
                {ROLE_PT[member.role]}
                {member.isSelf && " · você"}
              </span>
            </div>
            {!member.isSelf && (
              <form action={removeMember}>
                <input type="hidden" name="id" value={member.id} />
                <Button type="submit" variant="outline" size="sm">
                  Remover
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-name">Nome</Label>
          <Input id="member-name" name="full_name" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-email">E-mail</Label>
          <Input id="member-email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="member-role">Papel</Label>
          <select
            id="member-role"
            name="role"
            required
            className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            <option value="receptionist">Recepcionista</option>
            <option value="manager">Gestor</option>
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Convidar"}
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
