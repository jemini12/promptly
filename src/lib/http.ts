import { NextResponse } from "next/server";

export function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Unknown error";
  const resolvedStatus = status === 400 && message === "Unauthorized" ? 401 : status;
  return NextResponse.json({ error: message }, { status: resolvedStatus });
}
