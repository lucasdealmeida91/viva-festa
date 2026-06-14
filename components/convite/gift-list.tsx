"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

type Gift = { id: string; name: string; external_url: string | null };

export function GiftList({ slug, token }: { slug: string; token: string }) {
  const supabase = createClient();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("list_gifts", {
      p_slug: slug,
      p_token: token,
    });
    setGifts((data ?? []) as Gift[]);
  }, [supabase, slug, token]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function claim(giftId: string) {
    setError(null);
    if (!name.trim()) {
      setError("Digite o seu nome (como você confirmou presença).");
      return;
    }
    setBusy(true);
    const { error: rpcError } = await supabase.rpc("claim_gift", {
      p_slug: slug,
      p_token: token,
      p_gift_id: giftId,
      p_guest_name: name,
    });
    setBusy(false);
    if (rpcError) {
      setError(
        rpcError.message.includes("guest_not_confirmed")
          ? "Confirme sua presença antes de escolher um presente."
          : rpcError.message.includes("already_claimed")
            ? "Alguém escolheu este presente primeiro."
            : "Não foi possível escolher. Tente de novo.",
      );
      await load();
      return;
    }
    setClaiming(null);
    setName("");
    await load();
  }

  if (gifts.length === 0) return null;

  return (
    <section className="w-full max-w-sm">
      <h2 className="mb-2 text-lg font-semibold">Lista de presentes</h2>
      <ul className="flex flex-col gap-2 text-left">
        {gifts.map((gift) => (
          <li key={gift.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <span>
                {gift.external_url ? (
                  <a
                    href={gift.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    {gift.name}
                  </a>
                ) : (
                  gift.name
                )}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setClaiming(claiming === gift.id ? null : gift.id)
                }
              >
                Vou dar este
              </Button>
            </div>
            {claiming === gift.id && (
              <div className="mt-2 flex items-end gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`claim-${gift.id}`}>Seu nome</Label>
                  <Input
                    id={`claim-${gift.id}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => claim(gift.id)}
                >
                  Confirmar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-destructive mt-2 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
