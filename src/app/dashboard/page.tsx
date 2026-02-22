import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site-nav";
import { LinkButton } from "@/components/ui/link-button";
import { LocalTime } from "@/components/ui/local-time";
import { JobCardActions } from "@/components/ui/job-card-actions";
import { uiText } from "@/content/ui-text";
import { PortalButton } from "@/components/billing/portal-button";


export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: uiText.dashboard.title,
  description: uiText.dashboard.description,
};

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M12 3l1.9 4.1L18 9l-4.1 1.9L12 15l-1.9-4.1L6 9l4.1-1.9L12 3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17l.9 2.1L8 20l-2.1.9L5 23l-.9-2.1L2 20l2.1-.9L5 17z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/dashboard");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } });
  const plan = user?.plan === "pro" ? "pro" : "free";

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    include: {
      runHistories: {
        orderBy: { runAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const hasJobs = jobs.length > 0;

  return (
    <main className="page-shell">
      <SiteNav signedIn />
      <section className="content-shell py-10">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{uiText.dashboard.title}</h1>
            <p className="text-sm text-zinc-500">{uiText.dashboard.description}</p>
            <p className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs text-zinc-600">
              {uiText.dashboard.totalJobs(jobs.length)}
            </p>
            <p className="mt-2 inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-700">
              plan: {plan}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {plan === "pro" ? <PortalButton /> : <LinkButton href="/pricing" variant="secondary" size="sm" className="w-full justify-center sm:w-auto">Upgrade</LinkButton>}
            <LinkButton
              href="/jobs/new"
              variant="primary"
              size="sm"
              className="w-full gap-2 justify-center sm:w-auto"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {uiText.dashboard.createJob}
            </LinkButton>
            <LinkButton href="/chat" variant="secondary" size="sm" className="w-full gap-2 justify-center sm:w-auto">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z"
                />
              </svg>
              {uiText.dashboard.createWithChat}
            </LinkButton>
          </div>
        </div>

        <section className="surface-card p-4">
          {!hasJobs ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-gradient-to-b from-zinc-50 to-white px-5 py-9 text-center">
              <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700">
                <SparkIcon />
              </span>
              <p className="mt-4 text-base font-semibold text-zinc-900">{uiText.dashboard.noJobsTitle}</p>
              <p className="mx-auto mt-1 max-w-lg text-sm text-zinc-500">{uiText.dashboard.noJobsDescription}</p>
              <LinkButton
                href="/jobs/new"
                variant="primary"
                size="md"
                className="mt-4 gap-2 shadow-sm"
              >
                {uiText.dashboard.createJob}
              </LinkButton>
            </div>
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => {
                const latest = job.runHistories[0];
                const latestStatusClass = latest
                  ? latest.status === "success"
                    ? "status-pill status-pill-success"
                    : latest.status === "fail"
                      ? "status-pill status-pill-fail"
                      : "status-pill status-pill-neutral"
                  : "status-pill status-pill-neutral";
                return (
                  <li key={job.id} className="relative rounded-xl border border-zinc-200 bg-white p-4 pr-10 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:pr-4">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{job.name}</h3>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {uiText.dashboard.status.nextRun} <LocalTime date={job.nextRunAt} /> · {job.enabled ? uiText.dashboard.status.enabled : uiText.dashboard.status.disabled}
                      </p>
                      {latest ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className={latestStatusClass}>{latest.status}</span>
                          <p>{uiText.dashboard.status.lastRunAt} <LocalTime date={latest.runAt} /></p>
                        </div>
                      ) : null}
                    </div>
                    <JobCardActions jobId={job.id} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
