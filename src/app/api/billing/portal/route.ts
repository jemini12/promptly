import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await requireUserId();
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
    const customerId = user?.stripeCustomerId;
    if (!customerId) {
      throw new Error("Missing Stripe customer");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return errorResponse(error);
  }
}
