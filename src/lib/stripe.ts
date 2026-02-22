import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe() {
  if (cached) {
    return cached;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  cached = new Stripe(key, {
    apiVersion: "2026-01-28.clover",
  });

  return cached;
}

export function getAppUrl() {
  const url = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!url) {
    throw new Error("Missing APP_URL (or NEXTAUTH_URL)");
  }
  return url.replace(/\/$/, "");
}
