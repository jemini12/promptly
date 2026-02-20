"use client";

import { format } from "date-fns";

export function LocalTime({ date, formatStr = "PPp" }: { date: Date | number | string; formatStr?: string }) {
    return (
        <time dateTime={new Date(date).toISOString()} suppressHydrationWarning>
            {format(new Date(date), formatStr)}
        </time>
    );
}
