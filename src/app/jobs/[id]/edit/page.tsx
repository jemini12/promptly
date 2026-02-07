import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { JobEditorPage } from "@/components/job-editor/job-editor-page";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    notFound();
  }

  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, userId: session.user.id } });
  if (!job) {
    notFound();
  }

  const channel =
    job.channelType === "discord"
      ? {
          type: "discord" as const,
          config: {
            webhookUrl: decryptString((job.channelConfig as { webhookUrlEnc: string }).webhookUrlEnc),
          },
        }
      : {
          type: "telegram" as const,
          config: {
            botToken: decryptString((job.channelConfig as { botTokenEnc: string }).botTokenEnc),
            chatId: decryptString((job.channelConfig as { chatIdEnc: string }).chatIdEnc),
          },
        };

  return (
    <JobEditorPage
      jobId={job.id}
      initialState={{
        name: job.name,
        prompt: job.prompt,
        allowWebSearch: job.allowWebSearch,
        scheduleType: job.scheduleType,
        time: job.scheduleTime,
        dayOfWeek: job.scheduleDayOfWeek ?? undefined,
        cron: job.scheduleCron ?? "",
        channel,
        enabled: job.enabled,
      }}
    />
  );
}
