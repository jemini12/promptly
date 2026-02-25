import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { decryptString } from "@/lib/crypto";
import { JobEditorPage } from "@/components/job-editor/job-editor-page";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "New Job",
  description: "Create a scheduled AI prompt with delivery settings and preview.",
};

export default async function NewJobPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/jobs/new");
  }

  const lastJob = await prisma.job.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { channelType: true, channelConfig: true },
  });

  const initialChannel =
    lastJob?.channelType === "discord"
      ? {
          type: "discord" as const,
          config: { webhookUrl: decryptString((lastJob.channelConfig as { webhookUrlEnc: string }).webhookUrlEnc) },
        }
      : lastJob?.channelType === "webhook"
        ? {
            type: "webhook" as const,
            config: JSON.parse(decryptString((lastJob.channelConfig as { configEnc: string }).configEnc)) as {
              url: string;
              method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
              headers: string;
              payload: string;
            },
          }
        : lastJob?.channelType === "telegram"
          ? {
              type: "telegram" as const,
              config: {
                botToken: decryptString((lastJob.channelConfig as { botTokenEnc: string }).botTokenEnc),
                chatId: decryptString((lastJob.channelConfig as { chatIdEnc: string }).chatIdEnc),
              },
            }
          : null;

  return (
    <main className="page-shell">
      <SiteNav signedIn />
      <section className="content-shell max-w-3xl pt-6">
        <JobEditorPage
          initialState={
            initialChannel
              ? {
                  channel: initialChannel,
                  channelPrefillSource: "last_job",
                }
              : undefined
          }
        />
      </section>
    </main>
  );
}
