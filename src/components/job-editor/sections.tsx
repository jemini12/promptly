"use client";

import cronstrue from "cronstrue";
import { useState } from "react";
import { useJobForm } from "@/components/job-editor/job-form-provider";

const sectionClass = "rounded-xl border border-zinc-200 bg-white p-5";
const dayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeCron(expression: string) {
  if (!expression.trim()) {
    return "Enter a cron expression to see a readable schedule.";
  }

  try {
    return cronstrue.toString(expression, { throwExceptionOnParseError: true });
  } catch {
    return "Invalid cron expression";
  }
}

export function JobHeaderSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <label className="text-sm font-medium text-zinc-900">Job Name</label>
      <input
        value={state.name}
        onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
        className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        placeholder="Morning market brief"
      />
    </section>
  );
}

export function JobPromptSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-900">Prompt</label>
        <button
          type="button"
          onClick={() =>
            setState((prev) => ({
              ...prev,
              prompt: "Summarize top AI news in 5 bullets with one contrarian insight.",
            }))
          }
          className="text-xs text-zinc-600 underline"
        >
          Use example
        </button>
      </div>
      <textarea
        value={state.prompt}
        onChange={(event) => setState((prev) => ({ ...prev, prompt: event.target.value }))}
        className="mt-2 h-44 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
        placeholder="Write your prompt"
      />
    </section>
  );
}

export function JobOptionsSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <label className="inline-flex items-center gap-2 text-sm text-zinc-900">
        <input
          type="checkbox"
          checked={state.allowWebSearch}
          onChange={(event) => setState((prev) => ({ ...prev, allowWebSearch: event.target.checked }))}
        />
        Allow web search (OpenAI web search tool)
      </label>
    </section>
  );
}

export function JobScheduleSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <h3 className="text-sm font-medium text-zinc-900">Schedule</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <select
          value={state.scheduleType}
          onChange={(event) =>
            setState((prev) => ({ ...prev, scheduleType: event.target.value as "daily" | "weekly" | "cron" }))
          }
          className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="cron">Cron</option>
        </select>
        {state.scheduleType !== "cron" ? (
          <input
            value={state.time}
            onChange={(event) => setState((prev) => ({ ...prev, time: event.target.value }))}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="09:00"
          />
        ) : null}
        {state.scheduleType === "weekly" ? (
          <select
            value={state.dayOfWeek ?? 1}
            onChange={(event) => setState((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
            className="h-10 rounded-lg border border-zinc-200 px-3 text-sm"
          >
            {dayOptions.map((label, index) => (
              <option key={label} value={index} className="h-10">
                {label}
              </option>
            ))}
          </select>
        ) : state.scheduleType === "cron" ? (
          <div className="sm:col-span-2">
            <input
              value={state.cron ?? ""}
              onChange={(event) => setState((prev) => ({ ...prev, cron: event.target.value }))}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="0 9 * * *"
            />
            <p className="mt-2 text-xs text-zinc-500">{describeCron(state.cron ?? "")}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function JobChannelSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <h3 className="text-sm font-medium text-zinc-900">Channel</h3>
      <select
        value={state.channel.type}
        onChange={(event) => {
          if (event.target.value === "discord") {
            setState((prev) => ({ ...prev, channel: { type: "discord", config: { webhookUrl: "" } } }));
            return;
          }
          setState((prev) => ({ ...prev, channel: { type: "telegram", config: { botToken: "", chatId: "" } } }));
        }}
        className="mt-2 h-10 rounded-lg border border-zinc-200 px-3 text-sm"
      >
        <option value="discord">Discord</option>
        <option value="telegram">Telegram</option>
      </select>

      {state.channel.type === "discord" ? (
        <input
          value={state.channel.config.webhookUrl}
          onChange={(event) =>
            setState((prev) => ({
              ...prev,
              channel: { type: "discord", config: { webhookUrl: event.target.value } },
            }))
          }
          className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          placeholder="Discord Webhook URL"
        />
      ) : (
        <div className="mt-3 grid gap-2">
          <input
            value={state.channel.config.botToken}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                channel: {
                  type: "telegram",
                  config: {
                    botToken: event.target.value,
                    chatId: prev.channel.type === "telegram" ? prev.channel.config.chatId : "",
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Telegram Bot Token"
          />
          <input
            value={state.channel.config.chatId}
            onChange={(event) =>
              setState((prev) => ({
                ...prev,
                channel: {
                  type: "telegram",
                  config: {
                    botToken: prev.channel.type === "telegram" ? prev.channel.config.botToken : "",
                    chatId: event.target.value,
                  },
                },
              }))
            }
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Telegram Chat ID"
          />
        </div>
      )}
    </section>
  );
}

export function JobPreviewSection() {
  const { state, setState } = useJobForm();
  const [testSend, setTestSend] = useState(false);

  async function preview() {
    setState((prev) => ({ ...prev, preview: { ...prev.preview, loading: true, status: "idle" } }));
    try {
      const payload: {
        name: string;
        prompt: string;
        allowWebSearch: boolean;
        testSend: boolean;
        channel?: typeof state.channel;
      } = {
        name: state.name || "Preview",
        prompt: state.prompt,
        allowWebSearch: state.allowWebSearch,
        testSend,
      };

      if (testSend) {
        payload.channel = state.channel;
      }

      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { output?: string; error?: string; executedAt?: string; usedWebSearch?: boolean };
      if (!response.ok) {
        throw new Error(data.error ?? "Preview failed");
      }

      setState((prev) => ({
        ...prev,
        preview: {
          loading: false,
          status: "success",
          output: data.output,
          executedAt: data.executedAt,
          usedWebSearch: data.usedWebSearch,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        preview: {
          loading: false,
          status: "fail",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    }
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900">Preview</h3>
        <button
          type="button"
          onClick={preview}
          disabled={state.preview.loading}
          className="rounded-lg bg-black px-3 py-2 text-xs text-white disabled:opacity-60"
        >
          {state.preview.loading ? "Running..." : "Run preview"}
        </button>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-xs text-zinc-700">
        <input type="checkbox" checked={testSend} onChange={(event) => setTestSend(event.target.checked)} />
        Send test message to selected channel
      </label>
      <pre className="mt-3 min-h-24 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
        {state.preview.status === "success" ? state.preview.output : state.preview.errorMessage || "No preview yet"}
      </pre>
    </section>
  );
}
