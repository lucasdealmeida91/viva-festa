import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDateBR, formatTime, todayInSaoPaulo } from "@/lib/format";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Check-in" };

export default async function CheckinPage() {
  const supabase = await createClient();
  const today = todayInSaoPaulo();

  // RLS já restringe o recepcionista a hoje/amanhã; o gestor vê tudo, então
  // filtramos a janela aqui também.
  const tomorrow = new Date(`${today}T12:00:00-03:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const { data: parties } = await supabase
    .from("parties")
    .select("id, party_date, shifts (label, starts_at, ends_at)")
    .eq("status", "confirmed")
    .gte("party_date", today)
    .lte("party_date", tomorrowStr)
    .order("party_date");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Check-in</h1>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sair
          </Button>
        </form>
      </header>

      {(parties ?? []).length === 0 ? (
        <p className="text-muted-foreground">
          Nenhuma festa confirmada para hoje ou amanhã.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {parties!.map((party) => (
            <li key={party.id}>
              <Link
                href={`/checkin/${party.id}`}
                className="hover:bg-accent flex flex-col rounded-lg border p-4"
              >
                <span className="text-lg font-medium">
                  {formatDateBR(party.party_date)}
                  {party.party_date === today ? " · hoje" : " · amanhã"}
                </span>
                <span className="text-muted-foreground">
                  {party.shifts!.label} ({formatTime(party.shifts!.starts_at)}–
                  {formatTime(party.shifts!.ends_at)})
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
