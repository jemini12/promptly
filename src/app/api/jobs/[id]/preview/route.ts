import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";
import { runPrompt } from "@/lib/llm";
import { sendChannelMessage } from "@/lib/channel";
import { toRunnableChannel } from "@/lib/jobs";
import { enforceDailyRunLimit } from "@/lib/limits";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    await enforceDailyRunLimit(userId);
    const { id } = await params;
    const body = (await request.json()) as { testSend?: boolean };

    const job = await prisma.job.findFirst({ where: { id, userId } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await runPrompt(job.prompt, job.allowWebSearch);
    const title = `[${job.name}] ${format(new Date(), "yyyy-MM-dd HH:mm")}`;

    if (body.testSend) {
      await sendChannelMessage(toRunnableChannel(job), title, result.output);
    }

    await prisma.runHistory.create({
      data: {
        jobId: job.id,
        status: "success",
        outputPreview: result.output.slice(0, 1000),
        isPreview: true,
      },
    });
    await prisma.previewEvent.create({ data: { userId } });

    return NextResponse.json({
      status: "success",
      output: result.output,
      executedAt: new Date().toISOString(),
      usedWebSearch: job.allowWebSearch,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
