/** Centralized pt-BR formatting helpers (NF-5, docs/04 §2). */

export const WEEKDAYS_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

/** "12:00:00" (Postgres time) → "12:00" */
export function formatTime(time: string): string {
  return time.slice(0, 5);
}

export function formatCurrencyBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
