import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { runDueJobs } from "@/lib/worker-runner";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const maxJobs = Number(process.env.WORKER_MAX_JOBS_PER_RUN ?? 25);
  const budgetMs = Number(process.env.WORKER_TIME_BUDGET_MS ?? 250_000);
  const runnerId = randomUUID();

  const result = await runDueJobs({
    maxJobs: Number.isFinite(maxJobs) && maxJobs > 0 ? Math.floor(maxJobs) : 25,
    timeBudgetMs: Number.isFinite(budgetMs) && budgetMs > 1000 ? Math.floor(budgetMs) : 250_000,
    runnerId,
  });

  return Response.json({ ok: true, runnerId, ...result, executedAt: new Date().toISOString() });
}
