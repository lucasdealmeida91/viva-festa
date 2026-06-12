import { describe, expect, it } from "vitest";
import {
  buildMonthAgenda,
  monthLabelPt,
  shiftMonth,
  type AgendaParty,
  type AgendaShift,
} from "./agenda";

const saturdayShift: AgendaShift = {
  id: "s1",
  weekday: 6,
  label: "Sábado tarde",
  starts_at: "12:00:00",
  ends_at: "16:00:00",
};

// Junho/2026: dia 6 é sábado
const party = (over: Partial<AgendaParty>): AgendaParty => ({
  id: "p1",
  party_date: "2026-06-06",
  shift_id: "s1",
  status: "budget",
  ...over,
});

function cellOf(days: ReturnType<typeof buildMonthAgenda>, date: string) {
  return days.find((d) => d.date === date)!.cells[0];
}

describe("buildMonthAgenda (RN-2.3) — agenda reflete todos os status", () => {
  it("turnos aparecem apenas no dia da semana certo", () => {
    const days = buildMonthAgenda(2026, 6, [saturdayShift], []);
    expect(days).toHaveLength(30);
    expect(cellOf(days, "2026-06-06").status).toBe("free");
    expect(days.find((d) => d.date === "2026-06-08")!.cells).toHaveLength(0);
  });

  it.each([
    ["budget", "budget"],
    ["reserved", "reserved"],
    ["confirmed", "confirmed"],
    ["completed", "completed"],
  ] as const)("festa %s pinta a célula como %s", (status, expected) => {
    const days = buildMonthAgenda(2026, 6, [saturdayShift], [party({ status })]);
    expect(cellOf(days, "2026-06-06").status).toBe(expected);
  });

  it("cancelada não ocupa a célula (RN-3.5)", () => {
    const days = buildMonthAgenda(2026, 6, [saturdayShift], [
      party({ status: "canceled" }),
    ]);
    expect(cellOf(days, "2026-06-06").status).toBe("free");
  });

  it("reservada prevalece sobre orçamentos e conta os concorrentes (RN-2.4)", () => {
    const days = buildMonthAgenda(2026, 6, [saturdayShift], [
      party({ id: "p1", status: "budget" }),
      party({ id: "p2", status: "budget" }),
      party({ id: "p3", status: "reserved" }),
    ]);
    const cell = cellOf(days, "2026-06-06");
    expect(cell.status).toBe("reserved");
    expect(cell.partyId).toBe("p3");
    expect(cell.budgetCount).toBe(2);
  });
});

describe("navegação de mês", () => {
  it("label pt-BR e viradas de ano", () => {
    expect(monthLabelPt(2026, 6)).toBe("Junho de 2026");
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});
