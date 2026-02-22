import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/admin-authz";
import { errorResponse } from "@/lib/http";
import { adminUserUpdateSchema } from "@/lib/admin-validation";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const adminUserId = await requireAdminUserId();
    const { id } = await params;
    const payload = await request.json();
    const parsed = adminUserUpdateSchema.parse(payload);

    const before = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        overrideEnabledJobsLimit: true,
        overrideTotalJobsLimit: true,
        overrideDailyRunLimit: true,
      },
    });
    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.role ? { role: parsed.role } : {}),
        ...(parsed.plan ? { plan: parsed.plan } : {}),
        ...(parsed.overrideEnabledJobsLimit !== undefined ? { overrideEnabledJobsLimit: parsed.overrideEnabledJobsLimit } : {}),
        ...(parsed.overrideTotalJobsLimit !== undefined ? { overrideTotalJobsLimit: parsed.overrideTotalJobsLimit } : {}),
        ...(parsed.overrideDailyRunLimit !== undefined ? { overrideDailyRunLimit: parsed.overrideDailyRunLimit } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        plan: true,
        overrideEnabledJobsLimit: true,
        overrideTotalJobsLimit: true,
        overrideDailyRunLimit: true,
      },
    });

    await recordAudit({
      userId: adminUserId,
      action: "admin.user.update",
      entityType: "user",
      entityId: updated.id,
      data: { before, after: updated },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
