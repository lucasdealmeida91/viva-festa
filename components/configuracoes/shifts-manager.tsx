"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAYS_PT, formatTime } from "@/lib/format";
import {
  createShift,
  deleteShift,
  toggleShift,
  type SettingsState,
} from "@/app/app/configuracoes/actions";

type Shift = {
  id: string;
  weekday: number;
  label: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
};

export function ShiftsManager({ shifts }: { shifts: Shift[] }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    createShift,
    null,
  );

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-lg font-semibold">Turnos (RN-2.1)</h2>
      <p className="text-muted-foreground text-sm">
        Turnos são a unidade de reserva da agenda — ex.: Sábado tarde,
        12h–16h.
      </p>

      {shifts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {shifts.map((shift) => (
            <li
              key={shift.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div>
                <span className="font-medium">{shift.label}</span>{" "}
                <span className="text-muted-foreground text-sm">
                  {WEEKDAYS_PT[shift.weekday]} ·{" "}
                  {formatTime(shift.starts_at)}–{formatTime(shift.ends_at)}
                  {!shift.active && " · inativo"}
                </span>
              </div>
              <div className="flex gap-2">
                <form action={toggleShift}>
                  <input type="hidden" name="id" value={shift.id} />
                  <input
                    type="hidden"
                    name="active"
                    value={String(shift.active)}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {shift.active ? "Desativar" : "Ativar"}
                  </Button>
                </form>
                <form action={deleteShift}>
                  <input type="hidden" name="id" value={shift.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Excluir
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        action={formAction}
        className="flex flex-wrap items-end gap-3 rounded-md border p-4"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-label">Nome do turno</Label>
          <Input
            id="shift-label"
            name="label"
            placeholder="Sábado tarde"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-weekday">Dia da semana</Label>
          <select
            id="shift-weekday"
            name="weekday"
            required
            className="border-input bg-transparent h-9 rounded-md border px-3 text-sm shadow-xs"
          >
            {WEEKDAYS_PT.map((day, index) => (
              <option key={day} value={index}>
                {day}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-start">Início</Label>
          <Input id="shift-start" name="starts_at" type="time" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shift-end">Fim</Label>
          <Input id="shift-end" name="ends_at" type="time" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Adicionar turno"}
        </Button>

        {state?.error && (
          <p role="alert" className="text-destructive w-full text-sm">
            {state.error}
          </p>
        )}
      </form>
    </section>
  );
}
