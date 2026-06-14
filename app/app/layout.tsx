import { redirect } from "next/navigation";
import { SubscriptionBanner } from "@/components/subscription-banner";
import type { SubscriptionStatus } from "@/lib/domain/subscription";
import { createClient } from "@/lib/supabase/server";

/** /app é o painel do gestor: recepcionista vai para o check-in (RN-1.3). */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Filtrar pelo próprio user_id: a RLS expõe a equipe inteira do tenant.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role, tenant_id")
    .eq("user_id", user.id);
  if (!memberships || memberships.length === 0) redirect("/onboarding");
  if (!memberships.some((m) => m.role === "manager")) redirect("/checkin");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("subscription_status, trial_ends_at")
    .eq("id", memberships[0].tenant_id)
    .single();

  return (
    <>
      {tenant && (
        <SubscriptionBanner
          status={tenant.subscription_status as SubscriptionStatus}
          trialEndsAt={tenant.trial_ends_at}
        />
      )}
      {children}
    </>
  );
}
