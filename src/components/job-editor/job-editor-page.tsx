"use client";

import { useRouter } from "next/navigation";
import { JobFormProvider, useJobForm } from "@/components/job-editor/job-form-provider";
import {
  JobChannelSection,
  JobHeaderSection,
  JobOptionsSection,
  JobPreviewSection,
  JobPromptSection,
  JobScheduleSection,
} from "@/components/job-editor/sections";
import type { JobFormState } from "@/types/job-form";

function JobActionsSection({ jobId }: { jobId?: string }) {
  const { state } = useJobForm();
  const router = useRouter();

  async function save() {
    const body = {
      name: state.name,
      prompt: state.prompt,
      allowWebSearch: state.allowWebSearch,
      scheduleType: state.scheduleType,
      scheduleTime: state.scheduleType === "cron" ? "00:00" : state.time,
      scheduleDayOfWeek: state.dayOfWeek,
      scheduleCron: state.cron,
      channel: state.channel,
      enabled: state.enabled,
    };

    const endpoint = jobId ? `/api/jobs/${jobId}` : "/api/jobs";
    const method = jobId ? "PUT" : "POST";
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      alert(data.error ?? "Save failed");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function remove() {
    if (!jobId) {
      return;
    }
    const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (!response.ok) {
      alert("Delete failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} className="rounded-lg bg-black px-4 py-2 text-sm text-white">
          Save
        </button>
        {jobId ? (
          <button type="button" onClick={remove} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700">
            Delete
          </button>
        ) : null}
      </div>
    </section>
  );
}

function JobEditorBody({ jobId }: { jobId?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-10">
      <JobHeaderSection />
      <JobPromptSection />
      <JobOptionsSection />
      <JobPreviewSection />
      <JobScheduleSection />
      <JobChannelSection />
      <JobActionsSection jobId={jobId} />
    </div>
  );
}

export function JobEditorPage({ initialState, jobId }: { initialState?: Partial<JobFormState>; jobId?: string }) {
  return (
    <JobFormProvider initialState={initialState}>
      <JobEditorBody jobId={jobId} />
    </JobFormProvider>
  );
}
