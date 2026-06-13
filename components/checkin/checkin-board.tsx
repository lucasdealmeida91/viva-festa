"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AgeRules } from "@/lib/domain/classify";
import { createClient } from "@/lib/supabase/browser";

export type CheckinGuest = {
  id: string;
  name: string;
  age: number | null;
  group_id: string | null;
  attendance: "present" | "absent" | null;
};

type CheckinBoardProps = {
  partyId: string;
  initialGuests: CheckinGuest[];
  groups: { id: string; name: string }[];
  rules: AgeRules;
  capacity: { adults: number; children: number };
  closed: boolean;
};

export function CheckinBoard({
  initialGuests,
  groups,
  closed,
}: CheckinBoardProps) {
  const supabase = createClient();
  const [guests, setGuests] = useState<CheckinGuest[]>(initialGuests);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, query]);

  const presentCount = guests.filter((g) => g.attendance === "present").length;

  function patch(ids: string[], present: boolean) {
    setGuests((prev) =>
      prev.map((g) =>
        ids.includes(g.id)
          ? { ...g, attendance: present ? "present" : null }
          : g,
      ),
    );
  }

  async function toggleGuest(guest: CheckinGuest) {
    if (closed) return;
    const present = guest.attendance !== "present";
    patch([guest.id], present); // otimista (RN-7.6 — fila de retry vem no T3)
    const { error: rpcError } = await supabase.rpc("checkin_set_present", {
      p_guest_id: guest.id,
      p_present: present,
    });
    if (rpcError) {
      patch([guest.id], !present); // reverte
      setError("Falha ao marcar. Tente de novo.");
    } else {
      setError(null);
    }
  }

  async function toggleGroup(groupId: string, present: boolean) {
    if (closed) return;
    const ids = guests.filter((g) => g.group_id === groupId).map((g) => g.id);
    patch(ids, present);
    const { error: rpcError } = await supabase.rpc("checkin_group", {
      p_group_id: groupId,
      p_present: present,
    });
    if (rpcError) {
      patch(ids, !present);
      setError("Falha ao marcar o grupo. Tente de novo.");
    } else {
      setError(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-accent sticky top-0 rounded-md p-2 text-center text-sm font-medium">
        Presentes: {presentCount} / {guests.length} convidados
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar convidado pelo nome"
        aria-label="Buscar convidado"
        autoFocus
      />

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <Button
              key={group.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={closed}
              onClick={() => toggleGroup(group.id, true)}
            >
              ✓ {group.name}
            </Button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {filtered.map((guest) => {
          const present = guest.attendance === "present";
          return (
            <li key={guest.id}>
              <button
                type="button"
                disabled={closed}
                onClick={() => toggleGuest(guest)}
                aria-pressed={present}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left ${
                  present ? "border-green-500 bg-green-50" : ""
                }`}
              >
                <span className="text-lg">
                  {guest.name}
                  {guest.age !== null && (
                    <span className="text-muted-foreground text-sm">
                      {" "}
                      · {guest.age}a
                    </span>
                  )}
                </span>
                <span className="text-2xl">{present ? "✅" : "⬜️"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Nenhum convidado encontrado.
        </p>
      )}
    </div>
  );
}
