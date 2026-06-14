"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/browser";

const STATUS_PT: Record<string, string> = {
  budget: "Orçamento",
  reserved: "Reservada",
  confirmed: "Confirmada",
  completed: "Realizada",
  canceled: "Cancelada",
};

type Party = { id: string; party_date: string; status: string };

export default function ClienteHome() {
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [name, setName] = useState("");
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // magic link (implicit flow): sessão no fragmento da URL
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", "/cliente");
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState("denied");
        return;
      }

      // RN-12.1 — vincula a conta ao cadastro do cliente (idempotente)
      const { data: customerId } = await supabase.rpc("link_customer_account");
      if (!customerId) {
        setState("denied");
        return;
      }

      const { data: customer } = await supabase
        .from("customers")
        .select("name")
        .eq("id", customerId)
        .single();
      setName(customer?.name ?? "");

      const { data: myParties } = await supabase
        .from("parties")
        .select("id, party_date, status")
        .order("party_date", { ascending: false });
      setParties(myParties ?? []);
      setState("ok");
    })();
  }, []);

  if (state === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">
          Acesso não encontrado. Peça ao buffet um novo link de acesso.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">
        Olá{name ? `, ${name.split(" ")[0]}` : ""}! 🎉
      </h1>
      <h2 className="text-lg font-medium">Minhas festas</h2>
      {parties.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma festa por aqui ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {parties.map((party) => (
            <li key={party.id}>
              <Link
                href={`/cliente/${party.id}`}
                className="hover:bg-accent flex justify-between rounded-md border p-4"
              >
                <span>Festa de {formatDateBR(party.party_date)}</span>
                <span className="text-muted-foreground">
                  {STATUS_PT[party.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
