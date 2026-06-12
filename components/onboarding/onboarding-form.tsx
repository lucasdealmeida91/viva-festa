"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SLUG_PATTERN, slugify } from "@/lib/domain/slug";
import { createTenant } from "@/app/(auth)/onboarding/actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createTenant, null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h1 className="text-lg leading-none font-semibold">
          Crie a página do seu buffet
        </h1>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do buffet</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              onChange={(e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Endereço da página</Label>
            <Input
              id="slug"
              name="slug"
              required
              pattern={SLUG_PATTERN}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
            />
            <p className="text-muted-foreground text-xs">
              vivafesta.com.br/<strong>{slug || "seu-buffet"}</strong>
            </p>
          </div>

          {state?.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "Criando…" : "Criar buffet"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
