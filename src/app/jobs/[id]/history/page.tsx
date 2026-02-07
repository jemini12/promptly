import { format } from "date-fns";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function JobHistoryPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;
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

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-zinc-900">{job.name} · Run History</h1>
      <ul className="mt-4 space-y-2">
        {job.runHistories.map((history) => (
          <li key={history.id} className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-sm text-zinc-800">
              {history.status} · {format(history.runAt, "yyyy-MM-dd HH:mm")}
            </p>
            {history.errorMessage ? <p className="mt-1 text-xs text-zinc-500">{history.errorMessage}</p> : null}
            {history.outputPreview ? <p className="mt-1 text-xs text-zinc-500">{history.outputPreview}</p> : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
