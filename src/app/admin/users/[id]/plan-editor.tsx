"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  initialPlan: "free" | "pro";
  initialOverrides: {
    enabledJobsLimit: number | null;
    totalJobsLimit: number | null;
    dailyRunLimit: number | null;
  };
};

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return NaN;
  }
  return n;
}

export function PlanEditor({ userId, initialPlan, initialOverrides }: Props) {
  const [plan, setPlan] = useState<Props["initialPlan"]>(initialPlan);
  const [enabledJobsLimit, setEnabledJobsLimit] = useState(
    initialOverrides.enabledJobsLimit == null ? "" : String(initialOverrides.enabledJobsLimit),
  );
  const [totalJobsLimit, setTotalJobsLimit] = useState(
    initialOverrides.totalJobsLimit == null ? "" : String(initialOverrides.totalJobsLimit),
  );
  const [dailyRunLimit, setDailyRunLimit] = useState(
    initialOverrides.dailyRunLimit == null ? "" : String(initialOverrides.dailyRunLimit),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const enabledParsed = parseOptionalInt(enabledJobsLimit);
    const totalParsed = parseOptionalInt(totalJobsLimit);
    const dailyParsed = parseOptionalInt(dailyRunLimit);
    if (Number.isNaN(enabledParsed) || Number.isNaN(totalParsed) || Number.isNaN(dailyParsed)) {
      setError("Overrides must be empty or a non-negative integer.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          overrideEnabledJobsLimit: enabledParsed,
          overrideTotalJobsLimit: totalParsed,
          overrideDailyRunLimit: dailyParsed,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to update user.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Plan and overrides</h2>
      <p className="mt-1 text-xs text-zinc-500">Overrides take precedence over plan defaults. Leave blank for no override.</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-zinc-700">
          Plan
          <select
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
            value={plan}
            onChange={(e) => setPlan(e.target.value as Props["initialPlan"])}
          >
            <option value="free">free</option>
            <option value="pro">pro</option>
          </select>
        </label>

        <div className="hidden sm:block" />

        <label className="text-sm text-zinc-700">
          Override enabled jobs limit
          <input
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
            inputMode="numeric"
            value={enabledJobsLimit}
            onChange={(e) => setEnabledJobsLimit(e.target.value)}
            placeholder="(none)"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Override total jobs limit
          <input
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
            inputMode="numeric"
            value={totalJobsLimit}
            onChange={(e) => setTotalJobsLimit(e.target.value)}
            placeholder="(none)"
          />
        </label>

        <label className="text-sm text-zinc-700">
          Override daily run limit
          <input
            className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
            inputMode="numeric"
            value={dailyRunLimit}
            onChange={(e) => setDailyRunLimit(e.target.value)}
            placeholder="(none)"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="secondary" size="sm" loading={saving} onClick={save}>
          Save
        </Button>
        {saved ? <p className="text-xs text-green-700">Saved.</p> : null}
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
