export type LimitErrorCode = "LIMIT_TOTAL_JOBS" | "LIMIT_ENABLED_JOBS" | "LIMIT_DAILY_RUNS";

export class LimitError extends Error {
  readonly code: LimitErrorCode;
  readonly meta: Record<string, unknown>;

  constructor(message: string, code: LimitErrorCode, meta: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

export function isLimitError(error: unknown): error is LimitError {
  return typeof error === "object" && error !== null && "code" in error && "meta" in error;
}
