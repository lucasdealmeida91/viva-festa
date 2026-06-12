"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCustomer,
  updateCustomer,
  type CustomerFormState,
} from "@/app/app/clientes/actions";

type CustomerFormProps = {
  customer?: { id: string; name: string; phone: string | null; email: string | null };
};

export function CustomerForm({ customer }: CustomerFormProps) {
  const action = customer ? updateCustomer : createCustomer;
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    action,
    null,
  );

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-name">Nome</Label>
        <Input
          id="customer-name"
          name="name"
          defaultValue={customer?.name}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-phone">Telefone</Label>
        <Input
          id="customer-phone"
          name="phone"
          defaultValue={customer?.phone ?? ""}
          placeholder="11 99999-9999"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="customer-email">E-mail</Label>
        <Input
          id="customer-email"
          name="email"
          type="email"
          defaultValue={customer?.email ?? ""}
        />
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
        {pending ? "Salvando…" : customer ? "Salvar cliente" : "Cadastrar cliente"}
      </Button>
    </form>
  );
}
