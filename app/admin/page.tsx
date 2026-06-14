import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin da plataforma" };

const STATUS_PT: Record<string, string> = {
  trialing: "Teste",
  active: "Ativa",
  past_due: "Pendente",
  read_only: "Leitura",
  blocked: "Bloqueada",
  canceled: "Cancelada",
};

export default async function AdminPage() {
  // Gate: só admin da plataforma (is_platform_admin).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("user_id", user.id)
    .single();
  if (!profile?.is_platform_admin) notFound();

  // Visão cross-tenant via service role (fora da RLS).
  const admin = createAdminClient();
  const [{ data: tenants }, { data: parties }] = await Promise.all([
    admin
      .from("tenants")
      .select("id, name, slug, subscription_status, trial_ends_at, created_at")
      .order("created_at", { ascending: false }),
    admin.from("parties").select("tenant_id, status"),
  ]);

  const partyCount = new Map<string, number>();
  const completedCount = new Map<string, number>();
  for (const p of parties ?? []) {
    partyCount.set(p.tenant_id, (partyCount.get(p.tenant_id) ?? 0) + 1);
    if (p.status === "completed") {
      completedCount.set(p.tenant_id, (completedCount.get(p.tenant_id) ?? 0) + 1);
    }
  }

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Admin da plataforma</h1>
      <p className="text-muted-foreground text-sm">
        {(tenants ?? []).length} buffets · visão interna do fundador.
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Buffet</th>
            <th className="py-2">Assinatura</th>
            <th className="py-2">Festas</th>
            <th className="py-2">Realizadas</th>
            <th className="py-2">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {(tenants ?? []).map((t) => (
            <tr key={t.id} className="border-b">
              <td className="py-2">
                {t.name}
                <span className="text-muted-foreground"> /{t.slug}</span>
              </td>
              <td className="py-2">
                {STATUS_PT[t.subscription_status] ?? t.subscription_status}
              </td>
              <td className="py-2">{partyCount.get(t.id) ?? 0}</td>
              <td className="py-2">{completedCount.get(t.id) ?? 0}</td>
              <td className="py-2">{formatDateBR(t.created_at.slice(0, 10))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
