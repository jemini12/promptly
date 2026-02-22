import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getEntitlements } from "@/lib/entitlements";
import { LimitError } from "@/lib/limit-errors";

export async function enforceDailyRunLimit(userId: string) {
  const entitlements = await getEntitlements(userId);
  const limit = entitlements.limits.dailyRunLimit;
  const dayStart = startOfDay(new Date());

  const [runCount, previewCount] = await Promise.all([
    prisma.runHistory.count({
      where: {
        runAt: { gte: dayStart },
        job: { userId },
      },
    }),
    prisma.previewEvent.count({
      where: {
        userId,
        createdAt: { gte: dayStart },
      },
    }),
  ]);

  if (runCount + previewCount >= limit) {
    throw new LimitError(`Daily run limit exceeded (${limit})`, "LIMIT_DAILY_RUNS", {
      limit,
      used: runCount + previewCount,
    });
  }
}
