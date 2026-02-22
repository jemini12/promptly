"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
  initialRole: "user" | "admin";
};

export function RoleEditor({ userId, initialRole }: Props) {
  const [role, setRole] = useState<Props["initialRole"]>(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
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
    <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Admin role</h2>
      <p className="mt-1 text-xs text-zinc-500">Controls access to /admin. Bootstrap via ADMIN_EMAILS still applies.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm text-zinc-700">
          Role
          <select
            className="ml-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
            value={role}
            onChange={(e) => setRole(e.target.value as Props["initialRole"])}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <Button type="button" variant="secondary" size="sm" loading={saving} onClick={save} className="sm:ml-auto">
          Save
        </Button>
      </div>
      {saved ? <p className="mt-2 text-xs text-green-700">Saved.</p> : null}
      {error ? <p className="mt-2 text-xs text-red-600" role="alert">{error}</p> : null}
    </section>
  );
}
