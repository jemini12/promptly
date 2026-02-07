import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

const DEFAULT_LIMIT = 50;

export async function enforceDailyRunLimit(userId: string) {
  const limit = Number(process.env.DAILY_RUN_LIMIT ?? DEFAULT_LIMIT);
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
    throw new Error(`Daily run limit exceeded (${limit})`);
  }
}
