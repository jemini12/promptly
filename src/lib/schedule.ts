import { CronExpressionParser } from "cron-parser";

export type ScheduleInput = {
  scheduleType: "daily" | "weekly" | "cron";
  scheduleTime: string;
  scheduleDayOfWeek?: number | null;
  scheduleCron?: string | null;
};

export function assertTimeFormat(time: string) {
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    throw new Error("Time must be HH:mm format");
  }
}

export function computeNextRunAt(input: ScheduleInput, base = new Date()) {
  if (input.scheduleType === "cron") {
    if (!input.scheduleCron) {
      throw new Error("Cron expression is required");
    }
    const it = CronExpressionParser.parse(input.scheduleCron, { currentDate: base });
    return it.next().toDate();
  }

  assertTimeFormat(input.scheduleTime);
  const [hour, minute] = input.scheduleTime.split(":").map(Number);

  if (input.scheduleType === "daily") {
    const candidateMs = Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate(),
      hour,
      minute,
      0,
      0,
    );
    const baseMs = base.getTime();
    return new Date(candidateMs > baseMs ? candidateMs : candidateMs + 24 * 60 * 60 * 1000);
  }

  if (input.scheduleDayOfWeek == null || input.scheduleDayOfWeek < 0 || input.scheduleDayOfWeek > 6) {
    throw new Error("Day of week must be 0-6 for weekly schedule");
  }

  const currentDow = base.getUTCDay();
  const deltaDays = (input.scheduleDayOfWeek - currentDow + 7) % 7;

  const candidateMs = Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate() + deltaDays,
    hour,
    minute,
    0,
    0,
  );
  const baseMs = base.getTime();
  return new Date(candidateMs > baseMs ? candidateMs : candidateMs + 7 * 24 * 60 * 60 * 1000);
}
