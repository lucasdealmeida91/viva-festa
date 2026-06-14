import Link from "next/link";
import { CheckoutButtons } from "@/components/assinatura/checkout-buttons";
import { computeSubscription, type SubscriptionStatus } from "@/lib/domain/subscription";
import { todayInSaoPaulo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Assinatura" };

const STATUS_PT: Record<string, string> = {
  trialing: "Em teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  read_only: "Modo leitura",
  blocked: "Bloqueada",
  canceled: "Cancelada",
};

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_status, trial_ends_at")
    .limit(1)
    .single();

  const view = tenant
    ? computeSubscription({
        status: tenant.subscription_status as SubscriptionStatus,
        trialEndsAt: tenant.trial_ends_at,
        today: todayInSaoPaulo(),
      })
    : null;

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Assinatura</h1>
      </header>

      <section className="max-w-md rounded-md border p-4">
        <p className="text-muted-foreground text-sm">Situação atual</p>
        <p className="text-lg font-semibold">
          {STATUS_PT[tenant?.subscription_status ?? ""] ?? "—"}
        </p>
        {view?.message && (
          <p className="text-muted-foreground mt-1 text-sm">{view.message}</p>
        )}
      </section>

      {view?.mode !== "active" && <CheckoutButtons />}
      {view?.mode === "active" && (
        <p className="text-sm text-green-700">Assinatura ativa. Obrigado! 🎉</p>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Exportar dados (CSV)</h2>
        <p className="text-muted-foreground text-sm">
          Portabilidade: baixe seus dados a qualquer momento (RN-11.4).
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          {["clientes", "festas", "convidados", "parcelas"].map((entity) => (
            <a
              key={entity}
              href={`/api/export?entity=${entity}`}
              className="rounded-md border px-3 py-1.5 underline"
            >
              {entity}.csv
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
