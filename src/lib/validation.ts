import { z } from "zod";

const discordConfigSchema = z.object({
  webhookUrl: z.string().url(),
});

const telegramConfigSchema = z.object({
  botToken: z.string().min(10),
  chatId: z.string().min(1),
});

export const previewSchema = z.object({
  prompt: z.string().min(1).max(8000),
  allowWebSearch: z.boolean().default(false),
  testSend: z.boolean().optional().default(false),
  name: z.string().max(100).optional().default("Preview"),
  channel: z
    .discriminatedUnion("type", [
      z.object({ type: z.literal("discord"), config: discordConfigSchema }),
      z.object({ type: z.literal("telegram"), config: telegramConfigSchema }),
    ])
    .optional(),
});

export const jobUpsertSchema = z
  .object({
    name: z.string().min(1).max(100),
    prompt: z.string().min(1).max(8000),
    allowWebSearch: z.boolean().default(false),
    scheduleType: z.enum(["daily", "weekly", "cron"]),
    scheduleTime: z.string().optional().nullable(),
    scheduleDayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    scheduleCron: z.string().optional().nullable(),
    channel: z.discriminatedUnion("type", [
      z.object({ type: z.literal("discord"), config: discordConfigSchema }),
      z.object({ type: z.literal("telegram"), config: telegramConfigSchema }),
    ]),
    enabled: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.scheduleType !== "cron" && !value.scheduleTime) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduleTime"], message: "Required for daily/weekly" });
    }
    if (value.scheduleType !== "cron" && value.scheduleTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(value.scheduleTime)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduleTime"], message: "Time must be HH:mm" });
    }
    if (value.scheduleType === "weekly" && value.scheduleDayOfWeek == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduleDayOfWeek"], message: "Required for weekly" });
    }
    if (value.scheduleType === "cron" && !value.scheduleCron) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduleCron"], message: "Required for cron" });
    }
  })
  .transform((value) => ({
    ...value,
    scheduleTime: value.scheduleType === "cron" ? "00:00" : (value.scheduleTime ?? "00:00"),
  }));
