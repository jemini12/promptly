import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id } = await params;

    const job = await prisma.job.findFirst({ where: { id, userId }, select: { id: true } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const histories = await prisma.runHistory.findMany({
      where: { jobId: id },
      orderBy: { runAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ histories });
  } catch (error) {
    return errorResponse(error);
  }
}
