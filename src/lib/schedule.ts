import { addDays, addWeeks, set } from "date-fns";
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
    const today = set(base, { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
    return today > base ? today : addDays(today, 1);
  }

  if (input.scheduleDayOfWeek == null || input.scheduleDayOfWeek < 0 || input.scheduleDayOfWeek > 6) {
    throw new Error("Day of week must be 0-6 for weekly schedule");
  }

  const currentDow = base.getDay();
  const deltaDays = (input.scheduleDayOfWeek - currentDow + 7) % 7;
  const candidate = set(addDays(base, deltaDays), {
    hours: hour,
    minutes: minute,
    seconds: 0,
    milliseconds: 0,
  });
  return candidate > base ? candidate : addWeeks(candidate, 1);
}
