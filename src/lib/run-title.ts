import { format } from "date-fns";

function defaultTimeZoneLabel(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.trim() ? tz.trim() : null;
  } catch {
    return null;
  }
}

export function formatRunTitle(name: string, at: Date, tzLabel?: string): string {
  const ts = format(at, "yyyy-MM-dd HH:mm");
  const offset = format(at, "xxx");
  const label = typeof tzLabel === "string" && tzLabel.trim() ? tzLabel.trim() : (defaultTimeZoneLabel() ?? "UTC");
  return `[${name}] ${ts} ${offset} ${label}`;
}
