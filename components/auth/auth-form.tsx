"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthFormState } from "@/app/(auth)/actions";

type AuthFormProps = {
  mode: "login" | "cadastro";
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-lg leading-none font-semibold">
          {mode === "login" ? "Entrar" : "Criar conta do buffet"}
        </h1>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {mode === "cadastro" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="full_name">Seu nome</Label>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </Button>

          <p className="text-muted-foreground text-center text-sm">
            {mode === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <Link href="/cadastro" className="underline">
                  Criar conta
                </Link>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <Link href="/login" className="underline">
                  Entrar
                </Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
