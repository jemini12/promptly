import { NextResponse } from "next/server";
import { isLimitError } from "@/lib/limit-errors";

export function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const resolvedStatus = status === 400 && message === "Unauthorized" ? 401 : status;

  if (isLimitError(error)) {
    return NextResponse.json({ error: message, code: error.code, meta: error.meta }, { status: resolvedStatus });
  }

  return NextResponse.json({ error: message }, { status: resolvedStatus });
}
