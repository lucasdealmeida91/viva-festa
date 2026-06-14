import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, mapStripeStatus } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * M5-T5 — webhook do Stripe. Verifica a assinatura e atualiza
 * tenants.subscription_status (AD-6). Usa service role (sem sessão de usuário).
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id ?? session.client_reference_id;
      if (tenantId) {
        await admin
          .from("tenants")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
          })
          .eq("id", tenantId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const tenantId = sub.metadata?.tenant_id;
      const status =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : mapStripeStatus(sub.status);
      const query = admin
        .from("tenants")
        .update({
          subscription_status: status,
          stripe_subscription_id: sub.id,
        });
      // Prefere o tenant_id da metadata; senão, casa pelo subscription id.
      await (tenantId
        ? query.eq("id", tenantId)
        : query.eq("stripe_subscription_id", sub.id));
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
