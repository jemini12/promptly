import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { computeNextRunAt } from "@/lib/schedule";
import { toMaskedApiJob } from "@/lib/jobs";
import { recordAudit } from "@/lib/audit";
import { getEntitlements, getJobUsage } from "@/lib/entitlements";
import { LimitError } from "@/lib/limit-errors";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({ enabled: z.boolean() });

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const payload = await request.json();
    const parsed = bodySchema.parse(payload);

    const existing = await prisma.job.findFirst({
      where: { id, userId },
      select: {
        id: true,
        enabled: true,
        scheduleType: true,
        scheduleTime: true,
        scheduleDayOfWeek: true,
        scheduleCron: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const enabling = !existing.enabled && parsed.enabled;
    if (enabling) {
      const [entitlements, usage] = await Promise.all([getEntitlements(userId), getJobUsage(userId)]);
      if (usage.enabledJobs >= entitlements.limits.enabledJobsLimit) {
        throw new LimitError("Enabled job limit exceeded", "LIMIT_ENABLED_JOBS", {
          limit: entitlements.limits.enabledJobsLimit,
          used: usage.enabledJobs,
        });
      }
    }

    const nextRunAt = enabling
      ? computeNextRunAt({
          scheduleType: existing.scheduleType,
          scheduleTime: existing.scheduleTime,
          scheduleDayOfWeek: existing.scheduleDayOfWeek,
          scheduleCron: existing.scheduleCron,
        })
      : undefined;

    const updated = await prisma.job.update({
      where: { id: existing.id },
      data: {
        enabled: parsed.enabled,
        nextRunAt: nextRunAt ?? undefined,
      },
    });

    await recordAudit({
      userId,
      action: "job.update",
      entityType: "job",
      entityId: updated.id,
      data: { enabled: updated.enabled },
    });

    return NextResponse.json({ job: toMaskedApiJob(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}
