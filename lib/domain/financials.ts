/**
 * RN-9.2/RN-9.4 — Installment status and financial summaries, pure.
 * "Vencida" is ALWAYS derived (due in the past and unpaid) — never stored.
 */

export type InstallmentLike = {
  due_date: string; // YYYY-MM-DD
  amount_cents: number;
  paid_at: string | null;
};

export type InstallmentStatus = "paid" | "overdue" | "pending";

export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

export function installmentStatus(
  installment: InstallmentLike,
  today: string,
): { status: InstallmentStatus; daysOverdue: number } {
  if (installment.paid_at) return { status: "paid", daysOverdue: 0 };
  const overdueDays = daysBetween(installment.due_date, today);
  if (overdueDays > 0) return { status: "overdue", daysOverdue: overdueDays };
  return { status: "pending", daysOverdue: 0 };
}

export type FinanceConsolidation = {
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  overdueCents: number;
};

/** RN-10.2 — situação financeira consolidada (ficha do cliente). */
export function consolidateFinance(
  installments: InstallmentLike[],
  today: string,
): FinanceConsolidation {
  const result: FinanceConsolidation = {
    totalCents: 0,
    paidCents: 0,
    pendingCents: 0,
    overdueCents: 0,
  };
  for (const installment of installments) {
    result.totalCents += installment.amount_cents;
    const { status } = installmentStatus(installment, today);
    if (status === "paid") result.paidCents += installment.amount_cents;
    else if (status === "overdue") result.overdueCents += installment.amount_cents;
    else result.pendingCents += installment.amount_cents;
  }
  return result;
}

export type MonthSummary = {
  /** Pendentes com vencimento dentro do mês (inclui as vencidas do mês). */
  dueInMonthCents: number;
  /** Pagas com paid_at dentro do mês. */
  receivedInMonthCents: number;
  /** Todas as vencidas, de qualquer mês. */
  overdueCents: number;
  overdueCount: number;
};

/** RN-9.4 — painel do mês. monthPrefix: "YYYY-MM". today: YYYY-MM-DD. */
export function summarizeMonth(
  installments: InstallmentLike[],
  monthPrefix: string,
  today: string,
): MonthSummary {
  const summary: MonthSummary = {
    dueInMonthCents: 0,
    receivedInMonthCents: 0,
    overdueCents: 0,
    overdueCount: 0,
  };

  for (const installment of installments) {
    const { status } = installmentStatus(installment, today);
    if (status === "paid") {
      if (installment.paid_at!.slice(0, 7) === monthPrefix) {
        summary.receivedInMonthCents += installment.amount_cents;
      }
      continue;
    }
    if (installment.due_date.slice(0, 7) === monthPrefix) {
      summary.dueInMonthCents += installment.amount_cents;
    }
    if (status === "overdue") {
      summary.overdueCents += installment.amount_cents;
      summary.overdueCount += 1;
    }
  }

  return summary;
}
