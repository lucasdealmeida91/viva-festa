"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateTenantSettings,
  type SettingsState,
} from "@/app/app/configuracoes/actions";

type TenantFormProps = {
  tenant: {
    name: string;
    slug: string;
    address: string | null;
    phone: string | null;
  };
};

export function TenantForm({ tenant }: TenantFormProps) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateTenantSettings,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome do buffet</Label>
        <Input id="name" name="name" defaultValue={tenant.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Endereço da página</Label>
        <Input id="slug" value={tenant.slug} disabled />
        <p className="text-muted-foreground text-xs">
          vivafesta.com.br/{tenant.slug} — não pode ser alterado.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Endereço do salão</Label>
        <Input id="address" name="address" defaultValue={tenant.address ?? ""} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={tenant.phone ?? ""} />
      </div>

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

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar dados"}
      </Button>
    </form>
  );
}
