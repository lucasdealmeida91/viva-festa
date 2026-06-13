/**
 * RN-7.6 / AD-4 — in-memory retry with backoff for check-in mutations.
 * Salão de festas tem internet ruim: marcações não podem se perder por
 * oscilação. Retry simples em memória (sem persistência — refresh durante
 * queda perde a fila, limitação aceita em AD-4).
 */

export type RetryResult = { ok: true } | { ok: false };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Tenta `fn` até obter sucesso (resolve sem erro) ou esgotar as tentativas.
 * Backoff exponencial limitado. `fn` deve resolver com `{ error }` no padrão
 * do supabase-js: erro truthy = falhou, retry; null/undefined = sucesso.
 */
export async function retryWithBackoff(
  fn: () => Promise<{ error: unknown }>,
  opts: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
  } = {},
): Promise<RetryResult> {
  const {
    maxAttempts = 12,
    baseDelayMs = 400,
    maxDelayMs = 5000,
    sleepFn = sleep,
  } = opts;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await fn();
    if (!error) return { ok: true };
    if (attempt < maxAttempts - 1) {
      await sleepFn(Math.min(baseDelayMs * 2 ** attempt, maxDelayMs));
    }
  }
  return { ok: false };
}
