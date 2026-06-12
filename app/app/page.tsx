import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function PainelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id")
    .limit(1);
  if (!memberships || memberships.length === 0) redirect("/onboarding");

  return (
    <main className="p-6">
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
    </main>
  );
}
