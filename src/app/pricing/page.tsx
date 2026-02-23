import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site-nav";
import { LinkButton } from "@/components/ui/link-button";
import { CheckoutButton } from "@/components/billing/checkout-button";
import { PortalButton } from "@/components/billing/portal-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free and Pro plans.",
};

function PlanCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);
  const user = signedIn
    ? await prisma.user.findUnique({
        where: { id: session!.user!.id },
        select: { plan: true, stripeCustomerId: true },
      })
    : null;

  const isPro = user?.plan === "pro";

  return (
    <main className="page-shell">
      <SiteNav signedIn={signedIn} />
      <section className="content-shell py-12">
        <header>
          <h1 className="text-3xl font-semibold text-zinc-900">Pricing</h1>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <PlanCard title="Free" description="For trying Promptloop with one active job.">
            <ul className="space-y-1 text-sm text-zinc-700">
              <li>1 enabled job</li>
              <li>10 total jobs</li>
              <li>Daily run limit applies</li>
            </ul>
            <div className="mt-5">
              {signedIn ? (
                <LinkButton href="/dashboard" variant="secondary" size="md" className="w-full justify-center">
                  Go to dashboard
                </LinkButton>
              ) : (
                <LinkButton href="/signin?callbackUrl=/pricing" variant="secondary" size="md" className="w-full justify-center">
                  Sign in
                </LinkButton>
              )}
            </div>
          </PlanCard>

          <PlanCard title="Pro" description="Higher limits and fewer guardrails.">
            <ul className="space-y-1 text-sm text-zinc-700">
              <li>
                Up to 1000 enabled jobs (&quot;unlimited&quot; for normal use)
              </li>
              <li>Up to 10000 total jobs</li>
              <li>Daily run limit applies (higher with overrides)</li>
            </ul>
            <div className="mt-5 space-y-3">
              {!signedIn ? (
                <LinkButton href="/signin?callbackUrl=/pricing" variant="primary" size="md" className="w-full justify-center">
                  Sign in to upgrade
                </LinkButton>
              ) : isPro ? (
                <>
                  <PortalButton />
                  <p className="text-xs text-zinc-500">You are on Pro.</p>
                </>
              ) : (
                <>
                  <CheckoutButton interval="month" />
                  <CheckoutButton interval="year" />
                </>
              )}
            </div>
            {signedIn && user?.stripeCustomerId && !isPro ? (
              <p className="mt-3 text-xs text-zinc-500">If you already subscribed, refresh after webhook updates your plan.</p>
            ) : null}
          </PlanCard>
        </section>
      </section>
    </main>
  );
}
