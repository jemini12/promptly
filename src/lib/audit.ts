import { prisma } from "@/lib/prisma";

export async function recordAudit(input: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  data?: unknown;
}) {
  try {
    const data = input.data == null ? undefined : (input.data as object);
    const client = prisma as unknown as { auditLog: { create: (args: unknown) => Promise<unknown> } };
    await client.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        data,
      },
    });
  } catch (err) {
    console.error("audit_log_failed", err);
  }
}
