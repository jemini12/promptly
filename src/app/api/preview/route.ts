import { NextRequest, NextResponse } from "next/server";
import { formatRunTitle } from "@/lib/run-title";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { previewSchema } from "@/lib/validation";
import { runPrompt } from "@/lib/llm";
import { sendChannelMessage } from "@/lib/channel";
import { prisma } from "@/lib/prisma";
import { enforceDailyRunLimit } from "@/lib/limits";
import { normalizeLlmModel } from "@/lib/llm-defaults";
import { compilePromptTemplate, coerceStringVars } from "@/lib/prompt-compile";
import { buildPostPromptVariables, normalizePostPromptConfig } from "@/lib/post-prompt";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    await enforceDailyRunLimit(userId);
    const payload = previewSchema.parse(await request.json());

    const now = payload.nowIso ? new Date(payload.nowIso) : new Date();
    const rawVars = JSON.parse(payload.variables || "{}") as unknown;
    const vars = coerceStringVars(rawVars);
    const prompt = compilePromptTemplate(payload.template, vars, { nowIso: payload.nowIso, timezone: payload.timezone });

    const modelId = normalizeLlmModel(payload.llmModel);
    const result = await runPrompt(prompt, {
      model: modelId,
      useWebSearch: payload.useWebSearch,
      webSearchMode: payload.webSearchMode,
    });

    let output = result.output;
    let postPromptApplied = false;
    const postPromptConfig = normalizePostPromptConfig({ enabled: payload.postPromptEnabled, template: payload.postPrompt });
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
        { nowIso: payload.nowIso, timezone: payload.timezone },
      );

      const post = await runPrompt(postPrompt, {
        model: modelId,
        useWebSearch: false,
        webSearchMode: payload.webSearchMode,
      });
      output = post.output;
      postPromptApplied = true;
    }
    const title = formatRunTitle(payload.name, now, payload.timezone);

    if (payload.testSend && payload.channel) {
      if (payload.channel.type === "discord") {
        await sendChannelMessage(
          { type: "discord", webhookUrl: payload.channel.config.webhookUrl },
          title,
          output,
          { citations: result.citations, usedWebSearch: result.usedWebSearch, meta: { kind: "preview" } },
        );
      } else if (payload.channel.type === "telegram") {
        await sendChannelMessage(
          {
            type: "telegram",
            botToken: payload.channel.config.botToken,
            chatId: payload.channel.config.chatId,
          },
          title,
          output,
          { citations: result.citations, usedWebSearch: result.usedWebSearch, meta: { kind: "preview" } },
        );
      } else {
        await sendChannelMessage(
          {
            type: "webhook",
            url: payload.channel.config.url,
            method: payload.channel.config.method,
            headers: payload.channel.config.headers,
            payload: payload.channel.config.payload,
          },
          title,
          output,
          { citations: result.citations, usedWebSearch: result.usedWebSearch, meta: { kind: "preview" } },
        );
      }
    }

    await prisma.previewEvent.create({ data: { userId } });

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
  } catch (error) {
    return errorResponse(error);
  }
}
