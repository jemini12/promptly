import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/admin-authz";
import { errorResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUserId();

    const [users, totalByUser, enabledByUser] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, provider: true, createdAt: true, role: true },
      }),
      prisma.job.groupBy({
        by: ["userId"],
        _count: { _all: true },
      }),
      prisma.job.groupBy({
        by: ["userId"],
        where: { enabled: true },
        _count: { _all: true },
      }),
    ]);

    const totalMap = new Map(totalByUser.map((row) => [row.userId, row._count._all] as const));
    const enabledMap = new Map(enabledByUser.map((row) => [row.userId, row._count._all] as const));

    const result = users.map((u) => ({
      ...u,
      provider: String(u.provider),
      role: String(u.role),
      totalJobs: totalMap.get(u.id) ?? 0,
      enabledJobs: enabledMap.get(u.id) ?? 0,
    }));

    return NextResponse.json({ users: result });
  } catch (error) {
    return errorResponse(error, 401);
  }
}
