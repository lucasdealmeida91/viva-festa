import {
  computeSubscription,
  type SubscriptionStatus,
} from "@/lib/domain/subscription";
import { todayInSaoPaulo } from "@/lib/format";

/** RN-11 — banner persistente do estado da assinatura. */
export function SubscriptionBanner({
  status,
  trialEndsAt,
}: {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
}) {
  const view = computeSubscription({
    status,
    trialEndsAt,
    today: todayInSaoPaulo(),
  });
  if (!view.message) return null;

  const tone = view.writable
    ? "bg-amber-100 text-amber-900"
    : "bg-destructive/15 text-destructive";

  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${tone}`}
    >
      <span>{view.message}</span>
      <a href="/app/assinatura" className="font-medium underline">
        Assinar
      </a>
    </div>
  );
}
