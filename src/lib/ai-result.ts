import { isRecord } from "@/lib/type-guards";

export function extractUsage(result: unknown): unknown {
  if (!isRecord(result)) return undefined;
  return "usage" in result ? (result as { usage?: unknown }).usage : undefined;
}

export function extractToolCalls(result: unknown): unknown {
  if (!isRecord(result)) return undefined;
  return "toolCalls" in result ? (result as { toolCalls?: unknown }).toolCalls : undefined;
}

export function extractToolResults(result: unknown): unknown {
  if (!isRecord(result)) return undefined;
  return "toolResults" in result ? (result as { toolResults?: unknown }).toolResults : undefined;
}
