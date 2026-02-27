import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { SiteNav } from "@/components/site-nav";
import { LocalTime } from "@/components/ui/local-time";
import { LinkButton } from "@/components/ui/link-button";
import { RunOnceButton } from "@/components/job-history/run-once-button";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Run History",
  description: "View recent execution history and errors for a scheduled job.",
};

export default async function JobHistoryPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const showWelcome = sp.welcome === "1";
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/jobs/${id}/history`)}`);
  }
  const job = await prisma.job.findFirst({
    where: { id, userId: session.user.id },
    include: {
      runHistories: {
        orderBy: { runAt: "desc" },
        take: 100,
      },
    },
  });
  if (!job) {
    notFound();
  }

  const deliveryLabel =
    job.channelType === "in_app"
      ? "In-app (Run History)"
      : job.channelType === "discord"
        ? "Discord"
        : job.channelType === "telegram"
          ? "Telegram"
          : "Custom Webhook";

  const canRunOnce = job.channelType === "in_app";

  return (
    <main className="page-shell">
      <SiteNav signedIn />
      <section className="content-shell max-w-3xl py-8">
        <Link href="/dashboard" className="back-link">
          {"<- Back to Dashboard"}
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-zinc-900">{job.name} · Run History</h1>

        <div className="mt-3 surface-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-700">
              <p>
                <span className="font-medium text-zinc-900">Next run</span>: <LocalTime date={job.nextRunAt} />
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Delivery: <span className="font-medium text-zinc-700">{deliveryLabel}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canRunOnce ? <RunOnceButton jobId={job.id} /> : null}
              <LinkButton href={`/jobs/${job.id}/edit`} variant="secondary" size="sm" className="shadow-sm">
                Edit job
              </LinkButton>
            </div>
          </div>

          {showWelcome ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-900">Job created.</p>
              <p className="mt-1 text-xs text-emerald-900/80">
                Your job is set to deliver in-app. Run it once now to confirm everything works.
              </p>
            </div>
          ) : null}
        </div>

        {job.runHistories.length === 0 ? (
          <div className="surface-card mt-4 border-dashed bg-zinc-50/60 p-5">
            <p className="text-sm font-medium text-zinc-900">No run history yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              {canRunOnce
                ? "Run it once now to confirm output and save the result here."
                : "This job has not executed yet. Check back after its next scheduled run."}
            </p>
            {canRunOnce ? (
              <div className="mt-3">
                <RunOnceButton jobId={job.id} />
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {job.runHistories.map((history) => {
              const usedWebSearch = Boolean((history as unknown as { usedWebSearch?: boolean }).usedWebSearch);
              const isManual = Boolean((history as unknown as { isPreview?: boolean }).isPreview);
              const citationsUnknown = (history as unknown as { citations?: unknown }).citations;
              const citations = Array.isArray(citationsUnknown)
                ? (citationsUnknown as Array<{ url?: unknown; title?: unknown }>).filter((c) => typeof c?.url === "string")
                : [];

              return (
                <li key={history.id} className="surface-card p-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-800">
                    <span
                      className={
                        history.status === "success"
                          ? "status-pill status-pill-success"
                          : history.status === "fail"
                            ? "status-pill status-pill-fail"
                            : "status-pill status-pill-neutral"
                      }
                    >
                      {history.status}
                    </span>
                    {isManual ? <span className="status-pill status-pill-neutral">manual</span> : null}
                    {usedWebSearch ? <span className="status-pill status-pill-neutral">web</span> : null}
                    <p><LocalTime date={history.runAt} /></p>
                  </div>
                  {history.errorMessage ? <p className="mt-1 text-xs text-zinc-500">{history.errorMessage}</p> : null}
                  {history.outputPreview ? (
                    <p className="line-clamp-2 mt-1 text-xs text-zinc-500" title={history.outputPreview}>
                      {history.outputPreview}
                    </p>
                  ) : null}

                  {history.outputText ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-zinc-700">Show full output</summary>
                      <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                        {history.outputText}
                      </pre>
                    </details>
                  ) : null}
                  {citations.length ? (
                    <div className="mt-2 text-xs text-zinc-600">
                      <p className="font-medium text-zinc-800">Sources</p>
                      <ul className="mt-1 space-y-0.5">
                        {citations.slice(0, 3).map((c, idx) => (
                          <li key={`${history.id}-c${idx}`}>
                            <a
                              className="underline decoration-zinc-300 underline-offset-2"
                              href={c.url as string}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {typeof c.title === "string" && c.title.trim() ? c.title : (c.url as string)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
