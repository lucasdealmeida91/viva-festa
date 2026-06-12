import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyticsBoot } from "@/components/analytics/analytics-boot";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

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
      <p className="text-muted-foreground mt-4">
        Agenda, festas, pacotes, clientes e financeiro — em construção (M1+).
      </p>
      <nav className="mt-6 flex gap-4">
        <Link href="/app/pacotes" className="underline">
          Pacotes
        </Link>
        <Link href="/app/configuracoes" className="underline">
          Configurações do buffet
        </Link>
      </nav>
    </main>
  );
}
