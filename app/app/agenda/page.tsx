import Link from "next/link";
import { CaptureOnce } from "@/components/analytics/capture-once";
import {
  buildMonthAgenda,
  monthLabelPt,
  shiftMonth,
  type AgendaParty,
  type AgendaShift,
  type CellStatus,
} from "@/lib/domain/agenda";
import { WEEKDAYS_PT, formatTime, todayInSaoPaulo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Agenda" };

const STATUS_PT: Record<CellStatus, string> = {
  free: "Livre",
  budget: "Orçamento",
  reserved: "Reservada",
  confirmed: "Confirmada",
  completed: "Realizada",
};

const STATUS_CLASS: Record<CellStatus, string> = {
  free: "border text-muted-foreground",
  budget: "bg-amber-100 text-amber-900",
  reserved: "bg-blue-100 text-blue-900",
  confirmed: "bg-green-100 text-green-900",
  completed: "bg-zinc-200 text-zinc-700",
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; criada?: string }>;
}) {
  const { mes, criada } = await searchParams;
  const today = todayInSaoPaulo();
  const [yearStr, monthStr] = (mes ?? today.slice(0, 7)).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const supabase = await createClient();
  const monthPrefix = `${yearStr}-${monthStr.padStart(2, "0")}`;
  const nextM = shiftMonth(year, month, 1);
  const nextMonthStart = `${nextM.year}-${String(nextM.month).padStart(2, "0")}-01`;
  const [{ data: shifts }, { data: parties }] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, weekday, label, starts_at, ends_at")
      .eq("active", true),
    supabase
      .from("parties")
      .select("id, party_date, shift_id, status")
      .gte("party_date", `${monthPrefix}-01`)
      .lt("party_date", nextMonthStart),
  ]);

  const days = buildMonthAgenda(
    year,
    month,
    (shifts ?? []) as AgendaShift[],
    (parties ?? []) as AgendaParty[],
  );
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const fmt = (m: { year: number; month: number }) =>
    `${m.year}-${String(m.month).padStart(2, "0")}`;

  const hasShifts = (shifts ?? []).length > 0;

  return (
    <main className="flex flex-col gap-6 p-6">
      {criada === "1" && (
        <CaptureOnce event="party_created" props={{ status: "budget" }} />
      )}
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <div className="mt-2 flex items-center gap-4">
          <Link
            href={`/app/agenda?mes=${fmt(prev)}`}
            className="text-lg"
            aria-label="Mês anterior"
          >
            ←
          </Link>
          <h1 className="text-2xl font-semibold">
            {monthLabelPt(year, month)}
          </h1>
          <Link
            href={`/app/agenda?mes=${fmt(next)}`}
            className="text-lg"
            aria-label="Próximo mês"
          >
            →
          </Link>
        </div>
      </header>

      {!hasShifts && (
        <p className="text-muted-foreground">
          Nenhum turno configurado.{" "}
          <Link href="/app/configuracoes" className="underline">
            Configure os turnos do buffet
          </Link>{" "}
          para abrir a agenda.
        </p>
      )}

      <ol className="flex flex-col gap-1">
        {days
          .filter((d) => d.cells.length > 0)
          .map((day) => (
            <li
              key={day.date}
              className={cn(
                "flex flex-wrap items-center gap-2 rounded-md p-2",
                day.date === today && "bg-accent",
              )}
            >
              <span className="w-28 shrink-0 text-sm font-medium">
                {String(day.day).padStart(2, "0")} ·{" "}
                {WEEKDAYS_PT[day.weekday]}
              </span>
              {day.cells.map((cell) => (
                <Link
                  key={cell.shift.id}
                  href={
                    cell.partyId
                      ? `/app/festas/${cell.partyId}`
                      : `/app/agenda/nova?data=${day.date}&turno=${cell.shift.id}`
                  }
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm",
                    STATUS_CLASS[cell.status],
                  )}
                >
                  {cell.shift.label} ({formatTime(cell.shift.starts_at)}–
                  {formatTime(cell.shift.ends_at)}) ·{" "}
                  {STATUS_PT[cell.status]}
                  {cell.budgetCount > 1 && ` (${cell.budgetCount} orçamentos)`}
                </Link>
              ))}
            </li>
          ))}
      </ol>
    </main>
  );
}
