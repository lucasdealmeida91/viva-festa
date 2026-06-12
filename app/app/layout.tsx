import { redirect } from "next/navigation";
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
    .select("role")
    .eq("user_id", user.id);
  if (!memberships || memberships.length === 0) redirect("/onboarding");
  if (!memberships.some((m) => m.role === "manager")) redirect("/checkin");

  return children;
}
