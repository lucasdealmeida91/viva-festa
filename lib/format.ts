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

export const PARTY_STATUS_PT = {
  budget: "Orçamento",
  reserved: "Reservada",
  confirmed: "Confirmada",
  completed: "Realizada",
  canceled: "Cancelada",
} as const;

/** "2026-06-06" → "06/06/2026" (NF-5). */
export function formatDateBR(date: string): string {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

/** Data de hoje (YYYY-MM-DD) no fuso de São Paulo (NF-5). */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

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

/** "5500.00" ou "5500,00" → 550000 (centavos). NaN para entrada inválida. */
export function parseDecimalToCents(value: string): number {
  const normalized = value.trim().replace(/\./g, (m, offset, str) =>
    // "5.500,00": pontos de milhar somem; "5500.00": ponto decimal fica
    str.includes(",") ? "" : m,
  );
  const parsed = Number.parseFloat(normalized.replace(",", "."));
  return Number.isNaN(parsed) ? NaN : Math.round(parsed * 100);
}
