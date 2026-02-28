import { NextRequest, NextResponse } from "next/server";
import { formatRunTitle } from "@/lib/run-title";
import { ChannelType, Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { runPrompt } from "@/lib/llm";
import { sendChannelMessage } from "@/lib/channel";
import { toRunnableChannel } from "@/lib/jobs";
import { enforceDailyRunLimit } from "@/lib/limits";
import { getOrCreatePublishedPromptVersion } from "@/lib/prompt-version";
import { normalizeLlmModel, normalizeWebSearchMode } from "@/lib/llm-defaults";
import { compilePromptTemplate, coerceStringVars } from "@/lib/prompt-compile";
import { buildPostPromptVariables, normalizePostPromptConfig } from "@/lib/post-prompt";

export const maxDuration = 300;

const OUTPUT_PREVIEW_MAX = 1000;
const ERROR_MAX = 500;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  testSend: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    await enforceDailyRunLimit(userId);
    const { id } = await params;
    const body = bodySchema.parse(await request.json());

    const job = await prisma.job.findFirst({ where: { id, userId }, include: { publishedPromptVersion: true } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.testSend && job.channelType === ChannelType.in_app) {
      return NextResponse.json({ error: "In-app delivery jobs cannot test-send." }, { status: 400 });
    }

    const pv = job.publishedPromptVersion ?? (await getOrCreatePublishedPromptVersion(job.id));
    const vars = coerceStringVars(pv.variables);
    const prompt = compilePromptTemplate(pv.template, vars);
    const modelId = normalizeLlmModel(job.llmModel);
    const now = new Date();

    let runHistoryId: string | null = null;
    try {
      const created = await prisma.runHistory.create({
        data: {
          job: { connect: { id: job.id } },
          promptVersion: { connect: { id: pv.id } },
          status: "running",
          outputText: null,
          outputPreview: null,
          errorMessage: null,
          isPreview: true,
          deliveredAt: null,
          deliveryAttempts: 0,
          deliveryLastError: null,
        },
        select: { id: true },
      });
      runHistoryId = created.id;
    } catch {
      runHistoryId = null;
    }

    try {
      const result = await runPrompt(prompt, {
        model: modelId,
        useWebSearch: job.allowWebSearch,
        webSearchMode: normalizeWebSearchMode(job.webSearchMode),
      });

      let output = result.output;
      let postPromptApplied = false;
      let postUsage: unknown = null;
      let postToolCalls: unknown = null;
      const postPromptConfig = normalizePostPromptConfig({
        enabled: pv.postPromptEnabled ?? job.postPromptEnabled,
        template: pv.postPrompt ?? job.postPrompt,
      });
      if (postPromptConfig.enabled) {
        const postPrompt = compilePromptTemplate(
          postPromptConfig.template,
          buildPostPromptVariables({
            baseVariables: vars,
            output: result.output,
            citations: result.citations,
            usedWebSearch: result.usedWebSearch,
            llmModel: result.llmModel ?? modelId,
          }),
        );
        const post = await runPrompt(postPrompt, {
          model: modelId,
          useWebSearch: false,
          webSearchMode: normalizeWebSearchMode(job.webSearchMode),
        });
        output = post.output;
        postUsage = post.llmUsage ?? null;
        postToolCalls = post.llmToolCalls ?? null;
        postPromptApplied = true;
      }

      const llmUsageValue =
        postPromptApplied
          ? ({ primary: result.llmUsage ?? null, post: postUsage } as Prisma.InputJsonValue)
          : result.llmUsage == null
            ? Prisma.DbNull
            : (result.llmUsage as Prisma.InputJsonValue);
      const llmToolCallsValue =
        postPromptApplied
          ? ({ primary: result.llmToolCalls ?? null, post: postToolCalls } as Prisma.InputJsonValue)
          : result.llmToolCalls == null
            ? Prisma.DbNull
            : (result.llmToolCalls as Prisma.InputJsonValue);
      const citationsValue = (result.citations as unknown as Prisma.InputJsonValue) ?? Prisma.DbNull;

      if (runHistoryId) {
        await prisma.runHistory.update({
          where: { id: runHistoryId },
          data: {
            status: "success",
            outputText: output,
            outputPreview: output.slice(0, OUTPUT_PREVIEW_MAX),
            errorMessage: null,
            llmModel: result.llmModel ?? null,
            llmUsage: llmUsageValue,
            llmToolCalls: llmToolCallsValue,
            usedWebSearch: result.usedWebSearch,
            citations: citationsValue,
          },
        });
      }

      const title = formatRunTitle(job.name, now);

      if (body.testSend) {
        await sendChannelMessage(toRunnableChannel(job), title, output, {
          citations: result.citations,
          usedWebSearch: result.usedWebSearch,
          meta: { kind: "job-preview", jobId: job.id, promptVersionId: pv.id },
        });

        if (runHistoryId) {
          await prisma.runHistory.update({
            where: { id: runHistoryId },
            data: { deliveredAt: new Date(), deliveryAttempts: 1, deliveryLastError: null },
          });
        }
      } else if (job.channelType === ChannelType.in_app) {
        if (runHistoryId) {
          await prisma.runHistory.update({
            where: { id: runHistoryId },
            data: { deliveredAt: new Date(), deliveryAttempts: 0, deliveryLastError: null },
          });
        }
      }

      return NextResponse.json({
        status: "success",
        output,
        executedAt: new Date().toISOString(),
        usedWebSearch: result.usedWebSearch,
        citations: result.citations,
        llmModel: result.llmModel ?? null,
        postPromptApplied,
        postPromptWarning: postPromptConfig.warning,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (runHistoryId) {
        await prisma.runHistory.update({
          where: { id: runHistoryId },
          data: {
            status: "fail",
            errorMessage: message.slice(0, ERROR_MAX),
          },
        });
      }
      throw err;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
