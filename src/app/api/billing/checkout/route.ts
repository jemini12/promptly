import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { checkoutSchema } from "@/lib/billing-validation";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPriceId(interval: "month" | "year") {
  const key = interval === "year" ? process.env.STRIPE_PRICE_PRO_YEARLY_ID : process.env.STRIPE_PRICE_PRO_MONTHLY_ID;
  if (!key) {
    throw new Error("Missing Stripe price id env var");
  }
  return key;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const payload = checkoutSchema.parse(await request.json().catch(() => ({})));

    const stripe = getStripe();
    const appUrl = getAppUrl();
    const priceId = getPriceId(payload.interval);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, stripeCustomerId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        ...(user.email ? { email: user.email } : {}),
        ...(user.name ? { name: user.name } : {}),
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=cancel`,
      subscription_data: {
        metadata: { userId: user.id },
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session missing url");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
