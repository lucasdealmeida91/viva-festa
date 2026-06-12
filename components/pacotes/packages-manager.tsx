"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL } from "@/lib/format";
import { capture } from "@/lib/analytics";
import {
  createPackage,
  toggleArchivePackage,
  updatePackage,
  type PackageFormState,
} from "@/app/app/pacotes/actions";

export type PackageRow = {
  id: string;
  name: string;
  adult_capacity: number;
  child_capacity: number;
  base_price_cents: number;
  exempt_age: number;
  adult_age: number;
  extra_adult_price_cents: number;
  extra_child_price_cents: number;
  archived: boolean;
};

type PackagesManagerProps = {
  packages: PackageRow[];
  shiftsCount: number;
};

export function PackagesManager({
  packages,
  shiftsCount,
}: PackagesManagerProps) {
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const action = editing ? updatePackage : createPackage;
  const [state, formAction, pending] = useActionState<
    PackageFormState,
    FormData
  >(action, null);

  // onboarding_completed (docs/06): primeiro pacote criado com turnos prontos
  const wasEmpty = useRef(packages.length === 0);
  useEffect(() => {
    if (wasEmpty.current && packages.length === 1) {
      wasEmpty.current = false;
      capture("onboarding_completed", {
        shifts_count: shiftsCount,
        packages_count: packages.length,
      });
    }
  }, [packages.length, shiftsCount]);

  const centsToInput = (cents: number) => (cents / 100).toFixed(2);

  return (
    <section className="flex max-w-3xl flex-col gap-4">
      {packages.length > 0 && (
        <ul className="flex flex-col gap-2">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div>
                <span className="font-medium">{pkg.name}</span>{" "}
                {pkg.archived && (
                  <span className="text-muted-foreground text-xs">
                    (arquivado)
                  </span>
                )}
                <p className="text-muted-foreground text-sm">
                  {pkg.adult_capacity} adultos + {pkg.child_capacity} crianças
                  · {formatCurrencyBRL(pkg.base_price_cents)} · isenção &lt;{" "}
                  {pkg.exempt_age} · adulto ≥ {pkg.adult_age} · excedente{" "}
                  {formatCurrencyBRL(pkg.extra_adult_price_cents)}/
                  {formatCurrencyBRL(pkg.extra_child_price_cents)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(pkg)}
                >
                  Editar
                </Button>
                <form action={toggleArchivePackage}>
                  <input type="hidden" name="id" value={pkg.id} />
                  <input
                    type="hidden"
                    name="archived"
                    value={String(pkg.archived)}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {pkg.archived ? "Restaurar" : "Arquivar"}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        key={editing?.id ?? "new"}
        action={formAction}
        className="grid grid-cols-2 gap-3 rounded-md border p-4 sm:grid-cols-4"
      >
        <h2 className="col-span-full text-base font-semibold">
          {editing ? `Editando: ${editing.name}` : "Novo pacote"}
        </h2>
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div className="col-span-2 flex flex-col gap-1">
          <Label htmlFor="pkg-name">Nome</Label>
          <Input
            id="pkg-name"
            name="name"
            defaultValue={editing?.name}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-adults">Adultos</Label>
          <Input
            id="pkg-adults"
            name="adult_capacity"
            type="number"
            min="0"
            defaultValue={editing?.adult_capacity}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-children">Crianças</Label>
          <Input
            id="pkg-children"
            name="child_capacity"
            type="number"
            min="0"
            defaultValue={editing?.child_capacity}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-price">Preço base (R$)</Label>
          <Input
            id="pkg-price"
            name="base_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={editing ? centsToInput(editing.base_price_cents) : ""}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-exempt">Idade de isenção</Label>
          <Input
            id="pkg-exempt"
            name="exempt_age"
            type="number"
            min="0"
            defaultValue={editing?.exempt_age}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-adult-age">Idade de adulto</Label>
          <Input
            id="pkg-adult-age"
            name="adult_age"
            type="number"
            min="1"
            defaultValue={editing?.adult_age}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-extra-adult">Adulto excedente (R$)</Label>
          <Input
            id="pkg-extra-adult"
            name="extra_adult_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              editing ? centsToInput(editing.extra_adult_price_cents) : ""
            }
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="pkg-extra-child">Criança excedente (R$)</Label>
          <Input
            id="pkg-extra-child"
            name="extra_child_price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={
              editing ? centsToInput(editing.extra_child_price_cents) : ""
            }
            required
          />
        </div>

        {state?.error && (
          <p role="alert" className="text-destructive col-span-full text-sm">
            {state.error}
          </p>
        )}
        {state?.success && (
          <p role="status" className="col-span-full text-sm text-green-700">
            {state.success}
          </p>
        )}

        <div className="col-span-full flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending
              ? "Salvando…"
              : editing
                ? "Salvar pacote"
                : "Criar pacote"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              Cancelar edição
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
