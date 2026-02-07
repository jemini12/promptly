import Link from "next/link";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const jobs = userId
    ? await prisma.job.findMany({
        where: { userId },
        include: {
          runHistories: {
            orderBy: { runAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Promptly</h1>
          <p className="text-sm text-zinc-500">Prompt scheduler with preview and channel delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jobs/new" className="rounded-lg bg-black px-3 py-2 text-sm text-white">
            New Job
          </Link>
          <Link href="/api/auth/signout" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700">
            Sign out
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-zinc-500">No jobs yet. Create your first scheduled prompt.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const latest = job.runHistories[0];
              return (
                <li key={job.id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">{job.name}</h3>
                      <p className="text-xs text-zinc-500">
                        next run {format(job.nextRunAt, "yyyy-MM-dd HH:mm")} · {job.enabled ? "enabled" : "disabled"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Link href={`/jobs/${job.id}/edit`} className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700">
                        Edit
                      </Link>
                      <Link href={`/jobs/${job.id}/history`} className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700">
                        History
                      </Link>
                    </div>
                  </div>
                  {latest ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      last {latest.status} at {format(latest.runAt, "yyyy-MM-dd HH:mm")}
                    </p>
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
