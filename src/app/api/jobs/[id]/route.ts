import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { jobUpsertSchema } from "@/lib/validation";
import { computeNextRunAt } from "@/lib/schedule";
import { toDbChannelConfig, toMaskedApiJob } from "@/lib/jobs";
import { recordAudit } from "@/lib/audit";
import { getEntitlements, getJobUsage } from "@/lib/entitlements";
import { LimitError } from "@/lib/limit-errors";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const payload = await request.json();
    const parsed = jobUpsertSchema.parse(payload);

    const variables = parsed.variables ? (JSON.parse(parsed.variables || "{}") as Record<string, string>) : {};

    const exists = await prisma.job.findFirst({ where: { id, userId }, select: { id: true, enabled: true } });
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const enabling = !exists.enabled && parsed.enabled;
    if (enabling) {
      const [entitlements, usage] = await Promise.all([getEntitlements(userId), getJobUsage(userId)]);
      if (usage.enabledJobs >= entitlements.limits.enabledJobsLimit) {
        throw new LimitError("Enabled job limit exceeded", "LIMIT_ENABLED_JOBS", {
          limit: entitlements.limits.enabledJobsLimit,
          used: usage.enabledJobs,
        });
      }
    }

    const { channelType, channelConfig } = toDbChannelConfig(parsed.channel);
    const nextRunAt = computeNextRunAt({
      scheduleType: parsed.scheduleType,
      scheduleTime: parsed.scheduleTime,
      scheduleDayOfWeek: parsed.scheduleDayOfWeek,
      scheduleCron: parsed.scheduleCron,
    });

    const job = await prisma.job.update({
      where: { id },
      data: {
        name: parsed.name,
        prompt: parsed.template,
        postPrompt: parsed.postPrompt.trim() ? parsed.postPrompt : null,
        postPromptEnabled: parsed.postPromptEnabled && !!parsed.postPrompt.trim(),
        allowWebSearch: parsed.useWebSearch,
        llmModel: parsed.llmModel || null,
        webSearchMode: parsed.webSearchMode || null,
        scheduleType: parsed.scheduleType,
        scheduleTime: parsed.scheduleTime,
        scheduleDayOfWeek: parsed.scheduleDayOfWeek,
        scheduleCron: parsed.scheduleCron,
        channelType,
        channelConfig,
        enabled: parsed.enabled,
        nextRunAt,
        promptVersions: {
          create: {
            template: parsed.template,
            postPrompt: parsed.postPrompt.trim() ? parsed.postPrompt : null,
            postPromptEnabled: parsed.postPromptEnabled && !!parsed.postPrompt.trim(),
            variables,
          },
        },
      },
      include: { promptVersions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const latest = job.promptVersions[0];
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { publishedPromptVersionId: latest?.id ?? null },
    });

    await recordAudit({
      userId,
      action: "job.update",
      entityType: "job",
      entityId: updated.id,
      data: {
        useWebSearch: updated.allowWebSearch,
        llmModel: updated.llmModel,
        webSearchMode: updated.webSearchMode,
        scheduleType: updated.scheduleType,
        scheduleTime: updated.scheduleTime,
        scheduleDayOfWeek: updated.scheduleDayOfWeek,
        scheduleCron: updated.scheduleCron,
        channelType: updated.channelType,
        enabled: updated.enabled,
      },
    });

    if (latest?.id) {
      await recordAudit({
        userId,
        action: "prompt.publish",
        entityType: "prompt_version",
        entityId: latest.id,
        data: { jobId: updated.id },
      });
    }

    return NextResponse.json({ job: toMaskedApiJob(updated) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    await prisma.job.deleteMany({ where: { id, userId } });

    await recordAudit({
      userId,
      action: "job.delete",
      entityType: "job",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
