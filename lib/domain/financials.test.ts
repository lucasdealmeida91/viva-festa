import { describe, expect, it } from "vitest";
import {
  consolidateFinance,
  installmentStatus,
  summarizeMonth,
} from "./financials";

const today = "2026-06-12";

describe("installmentStatus (RN-9.2)", () => {
  it("vencida ontem aparece com 1 dia de atraso (aceite M2-T3)", () => {
    const result = installmentStatus(
      { due_date: "2026-06-11", amount_cents: 1000, paid_at: null },
      today,
    );
    expect(result).toEqual({ status: "overdue", daysOverdue: 1 });
  });

  it("paga nunca é vencida, mesmo com vencimento passado", () => {
    const result = installmentStatus(
      { due_date: "2026-01-01", amount_cents: 1000, paid_at: "2026-01-02" },
      today,
    );
    expect(result.status).toBe("paid");
  });

  it("vence hoje: pendente, não vencida", () => {
    const result = installmentStatus(
      { due_date: today, amount_cents: 1000, paid_at: null },
      today,
    );
    expect(result.status).toBe("pending");
  });
});

describe("consolidateFinance (RN-10.2)", () => {
  it("consolida pago, pendente e vencido", () => {
    const result = consolidateFinance(
      [
        { due_date: "2026-05-01", amount_cents: 100000, paid_at: "2026-05-01" },
        { due_date: "2026-06-10", amount_cents: 30000, paid_at: null },
        { due_date: "2026-07-10", amount_cents: 70000, paid_at: null },
      ],
      today,
    );
    expect(result).toEqual({
      totalCents: 200000,
      paidCents: 100000,
      overdueCents: 30000,
      pendingCents: 70000,
    });
  });
});

describe("summarizeMonth (RN-9.4)", () => {
  const installments = [
    // paga este mês
    { due_date: "2026-06-05", amount_cents: 100000, paid_at: "2026-06-05" },
    // paga mês passado (não conta no recebido do mês)
    { due_date: "2026-05-05", amount_cents: 50000, paid_at: "2026-05-06" },
    // pendente vencendo este mês
    { due_date: "2026-06-25", amount_cents: 200000, paid_at: null },
    // vencida deste mês (conta em a-receber-do-mês E em vencidas)
    { due_date: "2026-06-10", amount_cents: 30000, paid_at: null },
    // vencida de mês anterior (só em vencidas)
    { due_date: "2026-04-10", amount_cents: 40000, paid_at: null },
  ];

  it("consolida a receber, recebido e vencidas", () => {
    expect(summarizeMonth(installments, "2026-06", today)).toEqual({
      dueInMonthCents: 230000,
      receivedInMonthCents: 100000,
      overdueCents: 70000,
      overdueCount: 2,
    });
  });
});
