import Link from "next/link";
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

      <section className="flex flex-wrap gap-4">
        <div className="w-56 rounded-md border p-4">
          <h2 className="font-semibold">Mensal</h2>
          <p className="text-2xl font-semibold">R$ 197</p>
          <p className="text-muted-foreground text-sm">por mês</p>
        </div>
        <div className="w-56 rounded-md border p-4">
          <h2 className="font-semibold">Anual</h2>
          <p className="text-2xl font-semibold">R$ 1.970</p>
          <p className="text-muted-foreground text-sm">por ano (2 meses grátis)</p>
        </div>
      </section>

      <p className="text-muted-foreground text-sm">
        O pagamento por cartão (Stripe) será habilitado em breve (M5-T4).
      </p>
    </main>
  );
}
