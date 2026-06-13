"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { countByCategory, type AgeRules } from "@/lib/domain/classify";
import { retryWithBackoff } from "@/lib/checkin/retry";
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
  partyId,
  initialGuests,
  groups,
  rules,
  capacity,
  closed,
}: CheckinBoardProps) {
  const supabase = createClient();
  const [guests, setGuests] = useState<CheckinGuest[]>(initialGuests);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [walkinName, setWalkinName] = useState("");
  const [walkinAge, setWalkinAge] = useState("");

  // RN-7.6 — fila de retry em memória: a marcação otimista permanece e a
  // sincronização tenta de novo em background; "N não sincronizadas" some
  // quando tudo confirma. Não reverte em falha transitória (não perde marca).
  async function sync(fn: () => Promise<{ error: unknown }>) {
    setPending((n) => n + 1);
    const result = await retryWithBackoff(fn);
    setPending((n) => Math.max(0, n - 1));
    if (!result.ok) {
      setError("Algumas marcações não sincronizaram. Verifique a conexão.");
    } else {
      setError(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) => g.name.toLowerCase().includes(q));
  }, [guests, query]);

  const presentCount = guests.filter((g) => g.attendance === "present").length;

  // RN-7.5 — painel: presentes por categoria vs. contratado.
  const present = useMemo(
    () =>
      countByCategory(
        guests.filter((g) => g.attendance === "present").map((g) => g.age),
        rules,
      ),
    [guests, rules],
  );
  const panel: Array<{ label: string; got: number; cap?: number }> = [
    { label: "Adultos", got: present.adults, cap: capacity.adults },
    { label: "Crianças", got: present.children, cap: capacity.children },
    { label: "Isentos", got: present.exempt },
  ];

  function patch(ids: string[], present: boolean) {
    setGuests((prev) =>
      prev.map((g) =>
        ids.includes(g.id)
          ? { ...g, attendance: present ? "present" : null }
          : g,
      ),
    );
  }

  function toggleGuest(guest: CheckinGuest) {
    if (closed) return;
    const present = guest.attendance !== "present";
    patch([guest.id], present); // otimista
    void sync(async () => {
      const { error: e } = await supabase.rpc("checkin_set_present", {
        p_guest_id: guest.id,
        p_present: present,
      });
      return { error: e };
    });
  }

  function toggleGroup(groupId: string, isPresent: boolean) {
    if (closed) return;
    const ids = guests.filter((g) => g.group_id === groupId).map((g) => g.id);
    patch(ids, isPresent);
    void sync(async () => {
      const { error: e } = await supabase.rpc("checkin_group", {
        p_group_id: groupId,
        p_present: isPresent,
      });
      return { error: e };
    });
  }

  // RN-7.3 — walk-in: entra já presente. Também passa pela fila de retry.
  async function addWalkin() {
    if (closed || !walkinName.trim()) return;
    const name = walkinName.trim();
    const ageNum = walkinAge === "" ? null : Number(walkinAge);
    setWalkinName("");
    setWalkinAge("");

    let createdId: string | null = null;
    await sync(async () => {
      const { data, error: rpcError } = await supabase.rpc("checkin_add_walkin", {
        p_party_id: partyId,
        p_name: name,
        p_age: ageNum ?? undefined,
      });
      if (!rpcError && data) createdId = data;
      return { error: rpcError };
    });

    if (createdId) {
      setGuests((prev) => [
        ...prev,
        { id: createdId!, name, age: ageNum, group_id: null, attendance: "present" },
      ]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-accent sticky top-0 z-10 flex flex-col gap-2 rounded-md p-2">
        <p className="text-center text-sm font-medium">
          Presentes: {presentCount} / {guests.length} convidados
        </p>
        <p
          className={`text-center text-xs ${
            pending > 0 ? "text-amber-600" : "text-green-700"
          }`}
          aria-live="polite"
        >
          {pending > 0
            ? `⟳ ${pending} ${pending === 1 ? "marcação não sincronizada" : "marcações não sincronizadas"}`
            : "✓ tudo sincronizado"}
        </p>
        <div className="flex justify-center gap-2">
          {panel.map((cat) => {
            const over = cat.cap !== undefined && cat.got >= cat.cap;
            return (
              <span
                key={cat.label}
                className={`rounded-md px-2 py-1 text-sm ${
                  over ? "bg-destructive/15 text-destructive font-semibold" : "bg-background"
                }`}
              >
                {cat.label} {cat.got}
                {cat.cap !== undefined && `/${cat.cap}`}
              </span>
            );
          })}
        </div>
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

      {!closed && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-md border border-dashed p-3">
          <p className="w-full text-sm font-medium">Walk-in (sem convite)</p>
          <div className="flex flex-col gap-1">
            <Label htmlFor="walkin-name">Nome</Label>
            <Input
              id="walkin-name"
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="walkin-age">Idade</Label>
            <Input
              id="walkin-age"
              type="number"
              min="0"
              className="w-20"
              value={walkinAge}
              onChange={(e) => setWalkinAge(e.target.value)}
            />
          </div>
          <Button type="button" onClick={addWalkin} disabled={!walkinName.trim()}>
            Adicionar presente
          </Button>
        </div>
      )}
    </div>
  );
}
