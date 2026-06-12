/**
 * RN-2.3 — Monthly agenda grid, pure and testable.
 * Dates are YYYY-MM-DD strings end to end; weekday math uses UTC to stay
 * timezone-independent (the strings are already America/Sao_Paulo dates).
 */

export type AgendaShift = {
  id: string;
  weekday: number; // 0 = domingo
  label: string;
  starts_at: string;
  ends_at: string;
};

export type AgendaParty = {
  id: string;
  party_date: string;
  shift_id: string;
  status: "budget" | "reserved" | "confirmed" | "completed" | "canceled";
};

export type CellStatus =
  | "free"
  | "budget"
  | "reserved"
  | "confirmed"
  | "completed";

export type AgendaCell = {
  shift: AgendaShift;
  status: CellStatus;
  /** Orçamentos coexistem (RN-2.4): quantos disputam o turno. */
  budgetCount: number;
  partyId: string | null;
};

export type AgendaDay = {
  date: string;
  day: number;
  weekday: number;
  cells: AgendaCell[];
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayOf(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Status que prevalece na célula: bloqueio real > histórico > interesse. */
function cellStatus(parties: AgendaParty[]): {
  status: CellStatus;
  partyId: string | null;
  budgetCount: number;
} {
  const active = parties.filter((p) => p.status !== "canceled");
  const byStatus = (s: AgendaParty["status"]) =>
    active.find((p) => p.status === s);

  const winner =
    byStatus("confirmed") ?? byStatus("reserved") ?? byStatus("completed");
  const budgets = active.filter((p) => p.status === "budget");

  if (winner) {
    return {
      status: winner.status as CellStatus,
      partyId: winner.id,
      budgetCount: budgets.length,
    };
  }
  if (budgets.length > 0) {
    return { status: "budget", partyId: budgets[0].id, budgetCount: budgets.length };
  }
  return { status: "free", partyId: null, budgetCount: 0 };
}

export function buildMonthAgenda(
  year: number,
  month: number, // 1–12
  shifts: AgendaShift[],
  parties: AgendaParty[],
): AgendaDay[] {
  const days: AgendaDay[] = [];

  for (let day = 1; day <= daysInMonth(year, month); day++) {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    const weekday = weekdayOf(year, month, day);
    const dayShifts = shifts
      .filter((s) => s.weekday === weekday)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    days.push({
      date,
      day,
      weekday,
      cells: dayShifts.map((shift) => {
        const slotParties = parties.filter(
          (p) => p.party_date === date && p.shift_id === shift.id,
        );
        return { shift, ...cellStatus(slotParties) };
      }),
    });
  }

  return days;
}

export function monthLabelPt(year: number, month: number): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftMonth(
  year: number,
  month: number,
  delta: 1 | -1,
): { year: number; month: number } {
  const next = month + delta;
  if (next < 1) return { year: year - 1, month: 12 };
  if (next > 12) return { year: year + 1, month: 1 };
  return { year, month: next };
}
