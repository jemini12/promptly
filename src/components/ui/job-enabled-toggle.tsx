"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LinkButton } from "@/components/ui/link-button";
import { uiText } from "@/content/ui-text";

type ToggleResult = { error?: string; code?: string };

export function JobEnabledToggle({ jobId, enabled }: { jobId: string; enabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const label = useMemo(
    () => (value ? uiText.dashboard.status.enabled : uiText.dashboard.status.disabled),
    [value],
  );

  async function toggle() {
    if (saving) return;
    const next = !value;

    setSaving(true);
    setError(null);
    setShowUpgrade(false);
    setValue(next);

    try {
      const response = await fetch(`/api/jobs/${jobId}/enabled`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ToggleResult;
        setValue(!next);
        setError(data.error ?? "Failed to update job.");
        if (data.code && String(data.code).startsWith("LIMIT_")) {
          setShowUpgrade(true);
        }
        return;
      }

      router.refresh();
    } catch {
      setValue(!next);
      setError("Network error while updating job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={`${label}: toggle job enabled state`}
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-3.5 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          value ? "bg-zinc-900" : "bg-zinc-300"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? "translate-x-3.5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-[11px] font-medium text-zinc-600" aria-hidden="true">
        {label}
      </span>
      {error ? (
        <span className="text-[11px] text-red-600" role="alert">
          {error}
        </span>
      ) : null}
      {showUpgrade ? (
        <LinkButton href="/pricing" variant="secondary" size="sm" className="h-7 px-2 text-[11px]">
          Upgrade
        </LinkButton>
      ) : null}
    </span>
  );
}
