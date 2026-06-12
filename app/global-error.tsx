"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <main className="flex min-h-dvh items-center justify-center p-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Algo deu errado</h1>
            <p className="mt-2">
              Já fomos avisados do problema. Recarregue a página para tentar de
              novo.
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
