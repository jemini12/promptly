import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/authz";
import { errorResponse } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

const createSuiteSchema = z.object({
  name: z.string().min(1).max(100),
  cases: z
    .array(
      z.object({
        variables: z.record(z.string(), z.string()).default({}),
        mustInclude: z.array(z.string().min(1).max(200)).default([]),
      }),
    )
    .min(1)
    .max(10),
});

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id: jobId } = await params;

    const job = await prisma.job.findFirst({ where: { id: jobId, userId }, select: { id: true } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const client = prisma as unknown as { evalSuite: { findMany: (args: unknown) => Promise<unknown> } };
    const suites = await client.evalSuite.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: { cases: { orderBy: { createdAt: "asc" } } },
      take: 20,
    });

    return NextResponse.json({ suites });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { id: jobId } = await params;
    const payload = createSuiteSchema.parse(await request.json());

    const job = await prisma.job.findFirst({ where: { id: jobId, userId }, select: { id: true } });
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const client = prisma as unknown as { evalSuite: { create: (args: unknown) => Promise<unknown> } };
    const suite = await client.evalSuite.create({
      data: {
        jobId,
        name: payload.name,
        cases: {
          create: payload.cases.map((c) => ({ variables: c.variables, mustInclude: c.mustInclude })),
        },
      },
      include: { cases: { orderBy: { createdAt: "asc" } } },
    });

    return NextResponse.json({ suite });
  } catch (error) {
    return errorResponse(error);
  }
}
