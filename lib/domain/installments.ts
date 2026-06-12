/**
 * RN-9.1 — Suggested installment plan, pure.
 * Down payment due at confirmation; the remainder split into equal monthly
 * installments between confirmation and the party date. The manager edits
 * the plan freely in the UI before submitting.
 */
import { daysInMonth } from "./agenda";

export type InstallmentKind = "down_payment" | "regular";

export type SuggestedInstallment = {
  kind: InstallmentKind;
  dueDate: string; // YYYY-MM-DD
  amountCents: number;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function addMonthsClamped(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const total = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(total / 12);
  const nextMonth = (total % 12) + 1;
  const clampedDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return `${nextYear}-${pad(nextMonth)}-${pad(clampedDay)}`;
}

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return ty * 12 + tm - (fy * 12 + fm);
}

export function suggestInstallments(opts: {
  totalCents: number;
  downPaymentCents: number;
  confirmationDate: string;
  partyDate: string;
  /** Sobrescreve o número sugerido de parcelas mensais (edição do gestor). */
  installmentCount?: number;
}): SuggestedInstallment[] {
  const { totalCents, downPaymentCents, confirmationDate, partyDate } = opts;
  const remainder = totalCents - downPaymentCents;

  const plan: SuggestedInstallment[] = [];
  if (downPaymentCents > 0) {
    plan.push({
      kind: "down_payment",
      dueDate: confirmationDate,
      amountCents: downPaymentCents,
    });
  }
  if (remainder <= 0) return plan;

  const count =
    opts.installmentCount ??
    Math.max(1, monthsBetween(confirmationDate, partyDate));
  const base = Math.floor(remainder / count);

  for (let i = 1; i <= count; i++) {
    let dueDate = addMonthsClamped(confirmationDate, i);
    if (dueDate > partyDate) dueDate = partyDate;
    plan.push({
      kind: "regular",
      dueDate,
      // a última parcela absorve o resto da divisão — a soma fecha exata
      amountCents: i === count ? remainder - base * (count - 1) : base,
    });
  }

  return plan;
}
