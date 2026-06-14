/**
 * RN-11 — Subscription state for the UI banner, pure.
 * The database (tenant_is_writable / AD-3) is the source of truth for whether
 * writes are allowed; this derives the user-facing message and the
 * read-only/blocked mode, including trial expiry computed from trial_ends_at.
 */
import { daysBetween } from "./financials";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "read_only"
  | "blocked"
  | "canceled";

export type SubscriptionMode =
  | "active"
  | "trial"
  | "trial_ending"
  | "past_due"
  | "read_only"
  | "blocked";

export type SubscriptionView = {
  mode: SubscriptionMode;
  writable: boolean;
  daysLeft: number | null;
  message: string | null;
};

export function computeSubscription(input: {
  status: SubscriptionStatus;
  trialEndsAt: string | null; // YYYY-MM-DD (date) ou ISO
  today: string; // YYYY-MM-DD
}): SubscriptionView {
  const { status, today } = input;
  const trialEnds = input.trialEndsAt ? input.trialEndsAt.slice(0, 10) : null;

  switch (status) {
    case "active":
      return { mode: "active", writable: true, daysLeft: null, message: null };

    case "past_due":
      return {
        mode: "past_due",
        writable: true,
        daysLeft: null,
        message:
          "Pagamento pendente. Regularize para não perder o acesso de escrita.",
      };

    case "read_only":
      return {
        mode: "read_only",
        writable: false,
        daysLeft: null,
        message: "Modo leitura. Assine para voltar a criar e editar.",
      };

    case "blocked":
      return {
        mode: "blocked",
        writable: false,
        daysLeft: null,
        message: "Acesso bloqueado. Assine para reativar sua conta.",
      };

    case "canceled":
      return {
        mode: "blocked",
        writable: false,
        daysLeft: null,
        message: "Assinatura cancelada.",
      };

    case "trialing": {
      const daysLeft = trialEnds ? daysBetween(today, trialEnds) : null;
      if (daysLeft === null || daysLeft < 0) {
        // RN-11.2 — trial expirado entra em modo leitura
        return {
          mode: "read_only",
          writable: false,
          daysLeft: null,
          message: "Seu teste acabou. Assine para voltar a criar e editar.",
        };
      }
      if (daysLeft <= 3) {
        // RN-11.1 — aviso persistente faltando 3 dias
        return {
          mode: "trial_ending",
          writable: true,
          daysLeft,
          message:
            daysLeft === 0
              ? "Seu teste acaba hoje. Assine para continuar."
              : `Seu teste acaba em ${daysLeft} ${daysLeft === 1 ? "dia" : "dias"}. Assine para continuar.`,
        };
      }
      return { mode: "trial", writable: true, daysLeft, message: null };
    }
  }
}
