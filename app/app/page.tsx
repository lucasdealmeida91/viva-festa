import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsBoot } from "@/components/analytics/analytics-boot";
import { Button } from "@/components/ui/button";
import { todayInSaoPaulo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";
import { convertAlert, dismissAlert } from "./rebooking-actions";

/** RN-10.4 — mensagem de recompra com placeholders preenchidos. */
function rebookingMessage(
  template: string | null,
  vars: { nome: string; aniversariante: string; buffet: string },
): string {
  const base =
    template ||
    "Olá {nome}! O aniversário de {aniversariante} está chegando — que tal garantir a data aqui no {buffet}?";
  return base
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{aniversariante}", vars.aniversariante)
    .replaceAll("{buffet}", vars.buffet);
}

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1);
  if (!memberships || memberships.length === 0) redirect("/onboarding");

  const { novo } = await searchParams;
  const tenantId = memberships[0].tenant_id;

  // RN-10.3 — alertas de recompra vencidos (alert_date <= hoje), pendentes.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, rebooking_message")
    .eq("id", tenantId)
    .single();
  const { data: alerts } = await supabase
    .from("rebooking_alerts")
    .select(
      "id, alert_date, birthday_children (name, customers (name, phone))",
    )
    .eq("status", "pending")
    .lte("alert_date", todayInSaoPaulo())
    .order("alert_date");

  return (
    <main className="p-6">
      <AnalyticsBoot
        userId={user.id}
        role="manager"
        tenantId={memberships[0].tenant_id}
        fire={novo === "1" ? "tenant_created" : undefined}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Painel do buffet</h1>
        <form action={signOut}>
          <span className="text-muted-foreground mr-3 text-sm">
            {user.email}
          </span>
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </header>
      {(alerts ?? []).length > 0 && (
        <section className="mt-6 flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            Recompra ({alerts!.length}) 🎂
          </h2>
          <ul className="flex max-w-2xl flex-col gap-2">
            {alerts!.map((alert) => {
              const child = alert.birthday_children;
              const customer = child?.customers;
              const msg = rebookingMessage(tenant?.rebooking_message ?? null, {
                nome: customer?.name?.split(" ")[0] ?? "",
                aniversariante: child?.name ?? "",
                buffet: tenant?.name ?? "",
              });
              const phone = (customer?.phone ?? "").replace(/\D/g, "");
              const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
              return (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <span className="text-sm">
                    <strong>{child?.name}</strong> · {customer?.name}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      render={
                        <a href={waLink} target="_blank" rel="noreferrer" />
                      }
                      size="sm"
                    >
                      WhatsApp
                    </Button>
                    <form action={convertAlert}>
                      <input type="hidden" name="id" value={alert.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Criar orçamento
                      </Button>
                    </form>
                    <form action={dismissAlert}>
                      <input type="hidden" name="id" value={alert.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Dispensar
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-muted-foreground mt-4">
        Agenda, festas, pacotes, clientes e financeiro — em construção (M1+).
      </p>
      <nav className="mt-6 flex gap-4">
        <Link href="/app/agenda" className="underline">
          Agenda
        </Link>
        <Link href="/app/pacotes" className="underline">
          Pacotes
        </Link>
        <Link href="/app/clientes" className="underline">
          Clientes
        </Link>
        <Link href="/app/financeiro" className="underline">
          Financeiro
        </Link>
        <Link href="/app/configuracoes" className="underline">
          Configurações do buffet
        </Link>
      </nav>
    </main>
  );
}
