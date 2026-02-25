import { describe, expect, it } from "vitest";

import { computeNextRunAt } from "./schedule";

describe("schedule", () => {
  it("daily schedules use UTC time-of-day", () => {
    const base = new Date("2026-01-01T10:00:00.000Z");
    const next = computeNextRunAt({ scheduleType: "daily", scheduleTime: "09:00" }, base);
    expect(next.toISOString()).toBe("2026-01-02T09:00:00.000Z");
  });

  it("weekly schedules use UTC day-of-week", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const next = computeNextRunAt(
      {
        scheduleType: "weekly",
        scheduleTime: "00:00",
        scheduleDayOfWeek: 4,
      },
      base,
    );
    expect(next.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });
});
