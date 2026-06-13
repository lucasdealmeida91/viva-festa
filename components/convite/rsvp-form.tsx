"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

type Match = {
  guest_id: string;
  guest_name: string;
  group_name: string | null;
  rsvp_status: "invited" | "confirmed" | "declined";
};

type Companion = { name: string; age: string };

export function RsvpForm({
  slug,
  token,
  listMode,
}: {
  slug: string;
  token: string;
  listMode: "closed" | "open";
}) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [selected, setSelected] = useState<Match | null>(null);
  const [selfRegister, setSelfRegister] = useState(false);
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function search() {
    setError(null);
    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc("find_guest", {
      p_slug: slug,
      p_token: token,
      p_name: name,
    });
    setBusy(false);
    if (rpcError) {
      setError("Não foi possível buscar. Tente de novo.");
      return;
    }
    setMatches(data ?? []);
  }

  async function submit(response: "confirmed" | "declined") {
    setError(null);
    setBusy(true);
    const companionsPayload =
      response === "confirmed"
        ? companions
            .filter((c) => c.name.trim())
            .map((c) => ({ name: c.name, age: c.age }))
        : [];
    const args = selfRegister
      ? { p_slug: slug, p_token: token, p_response: response, p_guest_name: name }
      : {
          p_slug: slug,
          p_token: token,
          p_response: response,
          p_guest_id: selected!.guest_id,
        };
    const { error: rpcError } = await supabase.rpc("submit_rsvp", {
      ...args,
      p_companions: companionsPayload,
    });
    setBusy(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("rsvp_closed")
          ? "O prazo de confirmação encerrou."
          : "Não foi possível registrar. Tente de novo.",
      );
      return;
    }
    setDone(
      response === "confirmed"
        ? "Presença confirmada! Até lá. 🎉"
        : "Tudo bem, obrigado por avisar.",
    );
  }

  if (done) {
    return (
      <p role="status" className="text-lg font-medium text-green-700">
        {done}
      </p>
    );
  }

  // Tela do titular selecionado (ou auto-cadastro) com acompanhantes
  if (selected || selfRegister) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 text-left">
        <p className="text-center">
          {selfRegister ? (
            <>Confirmando como <strong>{name}</strong></>
          ) : (
            <>
              Olá, <strong>{selected!.guest_name}</strong>
              {selected!.group_name && ` (${selected!.group_name})`}!
            </>
          )}
        </p>

        <div className="flex flex-col gap-2">
          <Label>Acompanhantes (nome e idade)</Label>
          {companions.map((companion, index) => (
            <div key={index} className="flex gap-2">
              <Input
                aria-label={`Nome do acompanhante ${index + 1}`}
                value={companion.name}
                onChange={(e) =>
                  setCompanions((prev) =>
                    prev.map((c, i) =>
                      i === index ? { ...c, name: e.target.value } : c,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Idade do acompanhante ${index + 1}`}
                type="number"
                min="0"
                className="w-20"
                value={companion.age}
                onChange={(e) =>
                  setCompanions((prev) =>
                    prev.map((c, i) =>
                      i === index ? { ...c, age: e.target.value } : c,
                    ),
                  )
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setCompanions((prev) => [...prev, { name: "", age: "" }])
            }
          >
            + Acompanhante
          </Button>
        </div>

        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={() => submit("confirmed")} disabled={busy}>
            Confirmar presença
          </Button>
          <Button
            variant="outline"
            onClick={() => submit("declined")}
            disabled={busy}
          >
            Não poderei ir
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Label htmlFor="rsvp-name">Confirme sua presença — busque seu nome</Label>
      <div className="flex gap-2">
        <Input
          id="rsvp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
        />
        <Button type="button" onClick={search} disabled={busy || !name.trim()}>
          Buscar
        </Button>
      </div>

      {matches !== null && matches.length > 0 && (
        <ul className="flex flex-col gap-1">
          {matches.map((match) => (
            <li key={match.guest_id}>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => setSelected(match)}
              >
                {match.guest_name}
                {match.group_name && ` · ${match.group_name}`}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {matches !== null && matches.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {listMode === "open" ? (
            <>
              Não encontramos seu nome.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setSelfRegister(true)}
              >
                Adicionar-me à lista
              </button>
            </>
          ) : (
            "Não encontramos seu nome. Fale com o anfitrião."
          )}
        </p>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
