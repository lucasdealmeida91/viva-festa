"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";

/** Aceite de convite (M0-T4): o link do e-mail traz a sessão no fragmento. */
export default function DefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) setReady(true);
      else setFailed(true);
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      setError("Não foi possível salvar a senha. Tente novamente.");
      setPending(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: memberships } = await supabase
      .from("memberships")
      .select("role")
      .eq("user_id", user!.id);
    const isManager = memberships?.some((m) => m.role === "manager");
    router.replace(isManager ? "/app" : "/checkin");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 className="text-lg leading-none font-semibold">
            Defina sua senha
          </h1>
        </CardHeader>
        <CardContent>
          {failed && (
            <p role="alert" className="text-destructive text-sm">
              Link inválido ou expirado. Peça um novo convite ao gestor.
            </p>
          )}
          {!failed && !ready && (
            <p className="text-muted-foreground text-sm">Carregando…</p>
          )}
          {ready && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar senha e entrar"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
