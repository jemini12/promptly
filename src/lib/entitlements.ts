import { prisma } from "@/lib/prisma";

export type UserPlan = "free" | "pro";

export type Entitlements = {
  plan: UserPlan;
  limits: {
    enabledJobsLimit: number;
    totalJobsLimit: number;
    dailyRunLimit: number;
  };
};

const DEFAULT_DAILY_RUN_LIMIT = 50;

const PLAN_DEFAULTS: Record<UserPlan, { enabledJobsLimit: number; totalJobsLimit: number; dailyRunLimit: number }> = {
  free: {
    enabledJobsLimit: 1,
    totalJobsLimit: 10,
    dailyRunLimit: DEFAULT_DAILY_RUN_LIMIT,
  },
  pro: {
    enabledJobsLimit: 1000,
    totalJobsLimit: 10000,
    dailyRunLimit: DEFAULT_DAILY_RUN_LIMIT,
  },
};

function resolveDailyRunLimit(overrideDailyRunLimit: number | null | undefined, plan: UserPlan) {
  if (overrideDailyRunLimit != null) {
    return overrideDailyRunLimit;
  }
  const envLimit = Number(process.env.DAILY_RUN_LIMIT);
  if (Number.isFinite(envLimit) && envLimit >= 0) {
    return envLimit;
  }
  return PLAN_DEFAULTS[plan].dailyRunLimit;
}

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      overrideEnabledJobsLimit: true,
      overrideTotalJobsLimit: true,
      overrideDailyRunLimit: true,
    },
  });

  const plan: UserPlan = user?.plan === "pro" ? "pro" : "free";
  const defaults = PLAN_DEFAULTS[plan];

  const enabledJobsLimit = user?.overrideEnabledJobsLimit ?? defaults.enabledJobsLimit;
  const totalJobsLimit = user?.overrideTotalJobsLimit ?? defaults.totalJobsLimit;
  const dailyRunLimit = resolveDailyRunLimit(user?.overrideDailyRunLimit, plan);

  return {
    plan,
    limits: {
      enabledJobsLimit,
      totalJobsLimit,
      dailyRunLimit,
    },
  };
}

export async function getJobUsage(userId: string) {
  const [totalJobs, enabledJobs] = await Promise.all([
    prisma.job.count({ where: { userId } }),
    prisma.job.count({ where: { userId, enabled: true } }),
  ]);

  return { totalJobs, enabledJobs };
}
