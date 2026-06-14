import "server-only";
import Stripe from "stripe";

/**
 * AD-6 — toda integração Stripe vive aqui, atrás de uma interface mínima.
 * Trocar/adicionar gateway depois não toca o resto do app.
 */
let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

export const PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
} as const;

export { mapStripeStatus } from "./status";

export async function createCheckoutSession(opts: {
  priceId: string;
  tenantId: string;
  customerEmail: string;
  appUrl: string;
}): Promise<string | null> {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    customer_email: opts.customerEmail,
    client_reference_id: opts.tenantId,
    metadata: { tenant_id: opts.tenantId },
    subscription_data: { metadata: { tenant_id: opts.tenantId } },
    success_url: `${opts.appUrl}/app/assinatura?assinou=1`,
    cancel_url: `${opts.appUrl}/app/assinatura`,
  });
  return session.url;
}
