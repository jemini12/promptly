type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const weekdayShortToIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseTimeString(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error("Time must be HH:mm format");
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function getPartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Missing date part: ${type}`);
    return Number(part.value);
  };

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function getWeekdayIndexInTimeZone(date: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const idx = weekdayShortToIndex[short];
  if (typeof idx !== "number") {
    throw new Error(`Unknown weekday: ${short}`);
  }
  return idx;
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = getPartsInTimeZone(date, timeZone);
  const asUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtcMs - date.getTime()) / 60000);
}

export function formatUtcOffset(timeZone: string, date = new Date()): string {
  const offsetMinutes = getTimeZoneOffsetMinutes(date, timeZone);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

export function formatHHmmInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value;
  const minute = parts.find((p) => p.type === "minute")?.value;
  if (!hour || !minute) {
    throw new Error("Failed to format time");
  }
  return `${hour}:${minute}`;
}

export function convertUtcHHmmToZonedHHmm(utcHHmm: string, timeZone: string, refDate = new Date()): string {
  const { hour, minute } = parseTimeString(utcHHmm);
  const d = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate(), hour, minute, 0, 0));
  return formatHHmmInTimeZone(d, timeZone);
}

export function convertZonedHHmmToUtcHHmm(zonedHHmm: string, timeZone: string, refDate = new Date()): string {
  const { hour, minute } = parseTimeString(zonedHHmm);
  const base = getPartsInTimeZone(refDate, timeZone);

  let guess = new Date(Date.UTC(base.year, base.month - 1, base.day, hour, minute, 0, 0));

  for (let i = 0; i < 3; i++) {
    const got = formatHHmmInTimeZone(guess, timeZone);
    if (got === zonedHHmm) {
      break;
    }
    const gotParsed = parseTimeString(got);
    const gotMinutes = gotParsed.hour * 60 + gotParsed.minute;
    const wantMinutes = hour * 60 + minute;

    let delta = wantMinutes - gotMinutes;
    if (delta > 720) delta -= 1440;
    if (delta < -720) delta += 1440;

    guess = new Date(guess.getTime() + delta * 60000);
  }

  const hh = String(guess.getUTCHours()).padStart(2, "0");
  const mm = String(guess.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function convertZonedWeeklyToUtc(
  dayOfWeek: number,
  zonedHHmm: string,
  timeZone: string,
  refDate = new Date(),
): { utcDayOfWeek: number; utcHHmm: string } {
  const localDow = dayOfWeek;
  const { hour, minute } = parseTimeString(zonedHHmm);
  const base = getPartsInTimeZone(refDate, timeZone);
  const currentDow = getWeekdayIndexInTimeZone(refDate, timeZone);
  const deltaDays = (localDow - currentDow + 7) % 7;

  let guess = new Date(Date.UTC(base.year, base.month - 1, base.day + deltaDays, hour, minute, 0, 0));
  for (let i = 0; i < 3; i++) {
    const got = formatHHmmInTimeZone(guess, timeZone);
    if (got === zonedHHmm) {
      break;
    }
    const gotParsed = parseTimeString(got);
    const gotMinutes = gotParsed.hour * 60 + gotParsed.minute;
    const wantMinutes = hour * 60 + minute;

    let delta = wantMinutes - gotMinutes;
    if (delta > 720) delta -= 1440;
    if (delta < -720) delta += 1440;

    guess = new Date(guess.getTime() + delta * 60000);
  }

  const hh = String(guess.getUTCHours()).padStart(2, "0");
  const mm = String(guess.getUTCMinutes()).padStart(2, "0");
  return { utcDayOfWeek: guess.getUTCDay(), utcHHmm: `${hh}:${mm}` };
}

export function convertUtcWeeklyToZoned(
  utcDayOfWeek: number,
  utcHHmm: string,
  timeZone: string,
  refDate = new Date(),
): { dayOfWeek: number; timeHHmm: string } {
  const { hour, minute } = parseTimeString(utcHHmm);
  const currentDow = refDate.getUTCDay();
  const deltaDays = (utcDayOfWeek - currentDow + 7) % 7;
  const d = new Date(Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate() + deltaDays, hour, minute, 0, 0));
  return {
    dayOfWeek: getWeekdayIndexInTimeZone(d, timeZone),
    timeHHmm: formatHHmmInTimeZone(d, timeZone),
  };
}
