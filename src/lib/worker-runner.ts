import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { runPrompt } from "@/lib/llm";
import { sendChannelMessage, ChannelRequestError } from "@/lib/channel";
import { toRunnableChannel } from "@/lib/jobs";
import { computeNextRunAt } from "@/lib/schedule";

const DEFAULT_LOCK_STALE_MINUTES = 10;
const MAX_FAILS_BEFORE_DISABLE = 10;
const OUTPUT_PREVIEW_MAX = 1000;
const ERROR_MAX = 500;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function retryBackoff(attempt: number) {
  const base = 400;
  const backoff = base * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(backoff, 4000);
}

function shouldRetryStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function errorStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") {
    return null;
  }
  const maybeStatus = (err as { status?: unknown }).status;
  if (typeof maybeStatus === "number") {
    return maybeStatus;
  }
  return null;
}

function truncate(value: string, max: number) {
  if (value.length <= max) {
    return value;
  }
  return value.slice(0, max);
}

async function lockNextDueJob() {
  const staleMinutes = Number(process.env.WORKER_LOCK_STALE_MINUTES ?? DEFAULT_LOCK_STALE_MINUTES);
  const stale = Number.isFinite(staleMinutes) && staleMinutes > 0 ? staleMinutes : DEFAULT_LOCK_STALE_MINUTES;

  const rows = await prisma.$queryRaw<Array<{ id: string; locked_at: Date }>>`
    WITH candidate AS (
      SELECT id
      FROM jobs
      WHERE enabled = true
        AND next_run_at <= now()
        AND (locked_at IS NULL OR locked_at < now() - make_interval(mins => ${stale}))
      ORDER BY next_run_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs
    SET locked_at = date_trunc('milliseconds', now())
    FROM candidate
    WHERE jobs.id = candidate.id
    RETURNING jobs.id, jobs.locked_at;
  `;

  if (!rows.length) {
    return null;
  }

  return { id: rows[0].id, lockedAt: rows[0].locked_at };
}

async function deliverWithRetry(channel: ReturnType<typeof toRunnableChannel>, title: string, output: string) {
  const maxRetries = Number(process.env.WORKER_DELIVERY_MAX_RETRIES ?? 3);
  const retries = Number.isFinite(maxRetries) && maxRetries > 0 ? Math.floor(maxRetries) : 3;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await sendChannelMessage(channel, title, output);
      return;
    } catch (err) {
      lastErr = err;
      const status = err instanceof ChannelRequestError ? err.status : undefined;
      if (!status || !shouldRetryStatus(status) || attempt >= retries) {
        throw err;
      }
      await sleep(retryBackoff(attempt));
    }
  }

  if (lastErr) {
    throw lastErr;
  }
}

async function runPromptWithRetry(prompt: string, allowWebSearch: boolean) {
  const maxRetries = Number(process.env.WORKER_LLM_MAX_RETRIES ?? 2);
  const retries = Number.isFinite(maxRetries) && maxRetries > 0 ? Math.floor(maxRetries) : 2;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await runPrompt(prompt, allowWebSearch);
    } catch (err) {
      lastErr = err;
      const status = errorStatus(err);
      if (!status || !shouldRetryStatus(status) || attempt >= retries) {
        throw err;
      }
      await sleep(retryBackoff(attempt));
    }
  }

  if (lastErr) {
    throw lastErr;
  }
  throw new Error("LLM execution failed");
}

async function finishSuccess(jobId: string, lockedAt: Date, nextRunAt: Date, output: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.job.updateMany({
      where: { id: jobId, lockedAt },
      data: { lockedAt: null, failCount: 0, nextRunAt },
    });
    if (updated.count !== 1) {
      return { updated: false as const };
    }

    await tx.runHistory.create({
      data: {
        jobId,
        status: "success",
        outputPreview: truncate(output, OUTPUT_PREVIEW_MAX),
        errorMessage: null,
        isPreview: false,
      },
    });
    return { updated: true as const };
  });
}

async function finishFailure(jobId: string, lockedAt: Date, nextRunAt: Date, failCount: number, errorMessage: string) {
  const nextFailCount = failCount + 1;
  const disable = nextFailCount >= MAX_FAILS_BEFORE_DISABLE;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.job.updateMany({
      where: { id: jobId, lockedAt },
      data: {
        lockedAt: null,
        failCount: nextFailCount,
        enabled: disable ? false : undefined,
        nextRunAt,
      },
    });
    if (updated.count !== 1) {
      return { updated: false as const };
    }

    await tx.runHistory.create({
      data: {
        jobId,
        status: "fail",
        outputPreview: null,
        errorMessage: truncate(errorMessage, ERROR_MAX),
        isPreview: false,
      },
    });
    return { updated: true as const, disabled: disable };
  });
}

export type RunDueJobsResult = {
  processed: number;
  success: number;
  fail: number;
  disabled: number;
};

export async function runDueJobs(opts: { timeBudgetMs: number; maxJobs: number }): Promise<RunDueJobsResult> {
  const startedAt = Date.now();
  const result: RunDueJobsResult = { processed: 0, success: 0, fail: 0, disabled: 0 };

  while (true) {
    if (result.processed >= opts.maxJobs) {
      return result;
    }
    if (Date.now() - startedAt >= opts.timeBudgetMs) {
      return result;
    }

    const lock = await lockNextDueJob();
    if (!lock) {
      return result;
    }

    const job = await prisma.job.findUnique({ where: { id: lock.id } });
    if (!job) {
      result.processed++;
      result.fail++;
      continue;
    }

    const title = `[${job.name}] ${format(new Date(), "yyyy-MM-dd HH:mm")}`;

    let output = "";
    let error: unknown;
    try {
      const llm = await runPromptWithRetry(job.prompt, job.allowWebSearch);
      output = llm.output;
      await deliverWithRetry(toRunnableChannel(job), title, output);
    } catch (err) {
      error = err;
    }

    let nextRunAt: Date;
    try {
      nextRunAt = computeNextRunAt(
        {
          scheduleType: job.scheduleType,
          scheduleTime: job.scheduleTime,
          scheduleDayOfWeek: job.scheduleDayOfWeek,
          scheduleCron: job.scheduleCron,
        },
        new Date(),
      );
    } catch (scheduleErr) {
      nextRunAt = new Date(Date.now() + 10 * 60 * 1000);
      error = new Error(`Schedule calculation error: ${scheduleErr instanceof Error ? scheduleErr.message : String(scheduleErr)}`);
    }

    if (!error) {
      const finished = await finishSuccess(job.id, lock.lockedAt, nextRunAt, output);
      result.processed++;
      if (finished.updated) {
        result.success++;
      } else {
        result.fail++;
      }
      continue;
    }

    const finished = await finishFailure(job.id, lock.lockedAt, nextRunAt, job.failCount, error instanceof Error ? error.message : String(error));
    result.processed++;
    if (finished.updated) {
      result.fail++;
      if ("disabled" in finished && finished.disabled) {
        result.disabled++;
      }
    } else {
      result.fail++;
    }
  }
}
