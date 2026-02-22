import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toPlanFromStatus(status: string): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

function getFirstPriceId(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return item?.price?.id ?? null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return new Response(message, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
      const customerId = typeof session.customer === "string" ? session.customer : null;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      if (userId && customerId) {
        await prisma.user.updateMany({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId,
            ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
          },
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      if (customerId) {
        const status = subscription.status;
        const plan = toPlanFromStatus(status);
        const currentPeriodEndSeconds = (subscription as unknown as Record<string, unknown>)["current_period_end"];
        const currentPeriodEnd =
          typeof currentPeriodEndSeconds === "number" ? new Date(currentPeriodEndSeconds * 1000) : null;
        const priceId = getFirstPriceId(subscription);

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            stripeStatus: status,
            stripeCurrentPeriodEnd: currentPeriodEnd,
            stripeCancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeStatus: "past_due" },
        });
      }
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
      if (customerId) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { stripeStatus: "active" },
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
