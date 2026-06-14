import type Stripe from "stripe";
import type { SubscriptionStatus } from "@/lib/domain/subscription";

/** Mapeia o status da assinatura do Stripe para o enum do produto (RN-11). Puro. */
export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "read_only";
    default:
      return "read_only";
  }
}
