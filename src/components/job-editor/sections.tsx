"use client";

import cronstrue from "cronstrue";
import { useEffect, useRef, useState } from "react";
import { useJobForm } from "@/components/job-editor/job-form-provider";
import { Button } from "@/components/ui/button";
import { uiText } from "@/content/ui-text";
import {
  convertUtcHHmmToZonedHHmm,
  convertUtcWeeklyToZoned,
  convertZonedHHmmToUtcHHmm,
  convertZonedWeeklyToUtc,
  formatUtcOffset,
  getBrowserTimeZone,
} from "@/lib/timezone";

const sectionClass = "surface-card";
const dayOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function describeCron(expression: string) {
  if (!expression.trim()) {
    return uiText.jobEditor.schedule.emptyCron;
  }

  try {
    return cronstrue.toString(expression, { throwExceptionOnParseError: true });
  } catch {
    return uiText.jobEditor.schedule.invalidCron;
  }
}

export function JobHeaderSection() {
  const { state, setState } = useJobForm();

  return (
    <section className={sectionClass}>
      <label className="field-label" htmlFor="job-name">
        {uiText.jobEditor.header.jobNameLabel}
      </label>
      <p className="field-help">{uiText.jobEditor.header.jobNameDescription}</p>
      <input
        id="job-name"
        value={state.name}
        onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
        className="input-base mt-2"
        placeholder={uiText.jobEditor.header.jobNamePlaceholder}
      />
    </section>
  );
}

export function JobPromptSection() {
  const { state, setState } = useJobForm();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [allowStrongerRewrite, setAllowStrongerRewrite] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  async function enhance() {
    if (!state.prompt.trim()) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const response = await fetch("/api/prompt-writer/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: state.prompt, allowStrongerRewrite }),
      });

      const data = (await response.json()) as {
        improvedTemplate?: string;
        suggestedVariables?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? uiText.jobEditor.prompt.writer.enhanceFailed);
      }

      const improved = typeof data.improvedTemplate === "string" ? data.improvedTemplate : "";
      if (!improved.trim()) {
        throw new Error(uiText.jobEditor.prompt.writer.enhanceFailed);
      }

      setState((prev) => ({
        ...prev,
        prompt: improved,
        variables: prev.variables,
      }));
    } catch (error) {
      setEnhanceError(error instanceof Error ? error.message : uiText.jobEditor.prompt.writer.enhanceFailed);
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <label className="field-label" htmlFor="job-prompt">
          {uiText.jobEditor.prompt.label}
        </label>
      </div>
      <p className="field-help">{uiText.jobEditor.prompt.description}</p>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={allowStrongerRewrite}
              onChange={(event) => setAllowStrongerRewrite(event.target.checked)}
              disabled={enhancing}
            />
            <span>{uiText.jobEditor.prompt.writer.strongerRewrite}</span>
          </label>
          <Button
            type="button"
            onClick={enhance}
            variant="secondary"
            size="sm"
            className="shadow-sm"
            loading={enhancing}
            disabled={enhancing || !state.prompt.trim()}
          >
            {enhancing ? uiText.jobEditor.prompt.writer.enhancing : uiText.jobEditor.prompt.writer.enhance}
          </Button>
        </div>
        {enhanceError ? <p className="mt-2 text-xs text-red-600">{enhanceError}</p> : null}

        <details
          className="mt-4 rounded-lg border border-zinc-200 bg-white p-3"
          open={advancedOpen}
          onToggle={(event) => {
            setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open);
          }}
        >
          <summary className="cursor-pointer text-sm font-medium text-zinc-900">
            {uiText.jobEditor.prompt.writer.advancedSummary}
          </summary>
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-700">{uiText.jobEditor.prompt.writer.advancedLabel}</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, prompt: "" }))}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-red-600"
                >
                  {uiText.jobEditor.prompt.clear}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      prompt: uiText.jobEditor.prompt.examplePrompt,
                    }))
                  }
                  variant="secondary"
                  size="sm"
                  className="shadow-sm"
                >
                  {uiText.jobEditor.prompt.useExample}
                </Button>
              </div>
            </div>
            <textarea
              id="job-prompt"
              value={state.prompt}
              onChange={(event) => setState((prev) => ({ ...prev, prompt: event.target.value }))}
              className="input-base mt-2 h-44 resize-y"
              placeholder={uiText.jobEditor.prompt.placeholder}
            />

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-700">{uiText.jobEditor.postPrompt.label}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{uiText.jobEditor.postPrompt.help}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={state.postPromptEnabled}
                    onChange={(event) => setState((prev) => ({ ...prev, postPromptEnabled: event.target.checked }))}
                  />
                  <span>{uiText.jobEditor.postPrompt.enableLabel}</span>
                </label>
              </div>
              <textarea
                id="job-post-prompt"
                value={state.postPrompt}
                onChange={(event) => setState((prev) => ({ ...prev, postPrompt: event.target.value }))}
                className="input-base mt-2 h-32 resize-y"
                placeholder={uiText.jobEditor.postPrompt.placeholder}
                disabled={!state.postPromptEnabled}
              />
              {state.postPromptEnabled && !state.postPrompt.trim() ? (
                <p className="mt-2 text-[11px] text-amber-700">{uiText.jobEditor.postPrompt.blankWarning}</p>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

export function JobOptionsSection() {
  const { state, setState } = useJobForm();

  const [models, setModels] = useState<Array<{ id: string; name: string }> | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      setModelsLoading(true);
      try {
        const response = await fetch("/api/models", { method: "GET" });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as unknown;
        const listRaw =
          data && typeof data === "object" && data !== null && "models" in data
            ? (data as { models?: unknown }).models
            : [];
        const list = Array.isArray(listRaw)
          ? listRaw
            .map((m) => {
              if (!m || typeof m !== "object") return null;
              const id = (m as { id?: unknown }).id;
              const name = (m as { name?: unknown }).name;
              if (typeof id !== "string" || !id.trim()) return null;
              return { id, name: typeof name === "string" && name.trim() ? name : id };
            })
            .filter((m): m is { id: string; name: string } => Boolean(m))
          : [];
        if (!cancelled) {
          setModels(list);
        }
      } finally {
        if (!cancelled) {
          setModelsLoading(false);
        }
      }
    }

    void loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const modelOptions = (() => {
    if (!models || models.length === 0) return null;
    const hasCurrent = models.some((m) => m.id === state.llmModel);
    return hasCurrent ? models : [{ id: state.llmModel, name: state.llmModel }, ...models];
  })();

  return (
    <section className={sectionClass}>
      <h3 className="field-label">{uiText.jobEditor.options.title}</h3>
      <div className="mt-3 grid gap-2">
        <label className="text-xs text-zinc-600" htmlFor="job-llm-model">
          {uiText.jobEditor.options.modelLabel}
        </label>
        {modelOptions ? (
          <select
            id="job-llm-model"
            value={state.llmModel}
            onChange={(event) => setState((prev) => ({ ...prev, llmModel: event.target.value }))}
            className="input-base h-10"
            disabled={modelsLoading}
          >
            {modelOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="job-llm-model"
            value={state.llmModel}
            onChange={(event) => setState((prev) => ({ ...prev, llmModel: event.target.value }))}
            className="input-base h-10"
            placeholder="gpt-5-mini"
          />
        )}
        <p className="text-xs text-zinc-500">{uiText.jobEditor.options.modelHelp}</p>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-900">
          <input
            type="checkbox"
            checked={state.useWebSearch}
            onChange={(event) => setState((prev) => ({ ...prev, useWebSearch: event.target.checked }))}
          />
          {uiText.jobEditor.options.useWebSearch}
        </label>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <label className="text-sm font-medium text-zinc-900" htmlFor="job-enabled-toggle">
            {uiText.jobEditor.options.keepEnabled}
          </label>
          <button
            type="button"
            id="job-enabled-toggle"
            role="switch"
            aria-checked={state.enabled}
            onClick={() => setState((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:ring-offset-2 ${state.enabled ? "bg-zinc-900" : "bg-zinc-300"
              }`}
          >
            <span className="sr-only">Toggle enabled state</span>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${state.enabled ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
}

export function JobScheduleSection() {
  const { state, setState } = useJobForm();

  const timeZone = state.scheduleTimeZone.trim() ? state.scheduleTimeZone : getBrowserTimeZone();
  const timeZoneOffset = formatUtcOffset(timeZone);
  const storedUtcTime = (() => {
    if (state.scheduleType === "cron") return null;
    if (!state.time.trim()) return null;
    if (state.scheduleType === "weekly") {
      const { utcDayOfWeek, utcHHmm } = convertZonedWeeklyToUtc(state.dayOfWeek ?? 1, state.time, timeZone);
      return `${dayOptions[utcDayOfWeek]} ${utcHHmm}`;
    }
    return convertZonedHHmmToUtcHHmm(state.time, timeZone);
  })();

  useEffect(() => {
    if (state.scheduleTimeZone.trim()) return;
    setState((prev) => ({ ...prev, scheduleTimeZone: getBrowserTimeZone() }));
  }, [setState, state.scheduleTimeZone]);

  useEffect(() => {
    if (state.scheduleType === "cron") return;
    if (!state.timeIsUtc) return;

    try {
      if (state.scheduleType === "weekly") {
        const local = convertUtcWeeklyToZoned(state.dayOfWeek ?? 1, state.time, timeZone);
        setState((prev) => ({ ...prev, time: local.timeHHmm, dayOfWeek: local.dayOfWeek, timeIsUtc: false }));
      } else {
        const local = convertUtcHHmmToZonedHHmm(state.time, timeZone);
        setState((prev) => ({ ...prev, time: local, timeIsUtc: false }));
      }
    } catch {
      setState((prev) => ({ ...prev, timeIsUtc: false }));
    }
  }, [setState, state.dayOfWeek, state.scheduleType, state.time, state.timeIsUtc, timeZone]);

  return (
    <section className={sectionClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-900">{uiText.jobEditor.schedule.title}</h3>
          <p className="field-help">{uiText.jobEditor.schedule.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-600">
          {timeZone} · {timeZoneOffset}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        {state.scheduleType === "cron"
          ? uiText.jobEditor.schedule.timezone.cronNote
          : storedUtcTime
            ? uiText.jobEditor.schedule.timezone.storedNote(storedUtcTime)
            : uiText.jobEditor.schedule.timezone.defaultNote}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <select
          aria-label="Schedule type"
          value={state.scheduleType}
          onChange={(event) =>
            setState((prev) => ({ ...prev, scheduleType: event.target.value as "daily" | "weekly" | "cron" }))
          }
          className="input-base h-10"
        >
          <option value="daily">{uiText.jobEditor.schedule.types.daily}</option>
          <option value="weekly">{uiText.jobEditor.schedule.types.weekly}</option>
          <option value="cron">{uiText.jobEditor.schedule.types.cron}</option>
        </select>
        {state.scheduleType !== "cron" ? (
          <input
            type="time"
            aria-label="Schedule time"
            value={state.time}
            onChange={(event) => setState((prev) => ({ ...prev, time: event.target.value }))}
            className="input-base"
            placeholder={uiText.jobEditor.schedule.timePlaceholder}
          />
        ) : null}
        {state.scheduleType === "weekly" ? (
          <select
            aria-label="Weekly day"
            value={state.dayOfWeek ?? 1}
            onChange={(event) => setState((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))}
            className="input-base h-10"
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
              aria-label="Cron expression"
              value={state.cron ?? ""}
              onChange={(event) => setState((prev) => ({ ...prev, cron: event.target.value }))}
              className="input-base"
              placeholder={uiText.jobEditor.schedule.cronPlaceholder}
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

  function setChannel(next: typeof state.channel) {
    setState((prev) => ({ ...prev, channel: next, channelPrefillSource: null }));
  }

  return (
    <section className={sectionClass}>
      <h3 className="text-sm font-medium text-zinc-900">{uiText.jobEditor.channel.title}</h3>
      <p className="field-help">{uiText.jobEditor.channel.description}</p>
      {state.channelPrefillSource === "last_job" ? (
        <p className="mt-2 text-xs text-zinc-500">{uiText.jobEditor.channel.prefilledFromLastJob}</p>
      ) : null}
      <select
        aria-label="Delivery channel"
        value={state.channel.type}
        onChange={(event) => {
          if (event.target.value === "in_app") {
            setChannel({ type: "in_app" });
            return;
          }
          if (event.target.value === "discord") {
            setChannel({ type: "discord", config: { webhookUrl: "" } });
            return;
          }
          if (event.target.value === "webhook") {
            setChannel({ type: "webhook", config: { url: "", method: "POST", headers: "", payload: "" } });
            return;
          }
          setChannel({ type: "telegram", config: { botToken: "", chatId: "" } });
        }}
        className="input-base mt-2 h-10"
      >
        <option value="in_app">{uiText.jobEditor.channel.types.in_app}</option>
        <option value="discord">{uiText.jobEditor.channel.types.discord}</option>
        <option value="telegram">{uiText.jobEditor.channel.types.telegram}</option>
        <option value="webhook">{uiText.jobEditor.channel.types.webhook}</option>
      </select>
      
      {state.channel.type === "in_app" ? (
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
          <p className="font-medium text-zinc-900">In-app delivery</p>
          <p className="mt-1 text-zinc-600">Runs are stored in Run History. You can connect Discord / Telegram / webhook later.</p>
        </div>
      ) : null}

      {state.channel.type === "discord" ? (
        <input
          aria-label="Discord webhook URL"
          value={state.channel.config.webhookUrl}
          onChange={(event) =>
            setChannel({ type: "discord", config: { webhookUrl: event.target.value } })
          }
          className="input-base mt-3"
          placeholder={uiText.jobEditor.channel.discordPlaceholder}
        />
      ) : state.channel.type === "telegram" ? (
        <div className="mt-3 grid gap-2">
          <input
            aria-label="Telegram bot token"
            value={state.channel.config.botToken}
            onChange={(event) =>
              setChannel({
                type: "telegram",
                config: { botToken: event.target.value, chatId: state.channel.type === "telegram" ? state.channel.config.chatId : "" },
              })
            }
            className="input-base"
            placeholder={uiText.jobEditor.channel.telegramBotPlaceholder}
          />
          <input
            aria-label="Telegram chat ID"
            value={state.channel.config.chatId}
            onChange={(event) =>
              setChannel({
                type: "telegram",
                config: { botToken: state.channel.type === "telegram" ? state.channel.config.botToken : "", chatId: event.target.value },
              })
            }
            className="input-base"
            placeholder={uiText.jobEditor.channel.telegramChatPlaceholder}
          />
        </div>
      ) : state.channel.type === "webhook" ? (
        <div className="mt-3 grid gap-2">
          <input
            aria-label="Webhook URL"
            value={state.channel.config.url}
            onChange={(event) =>
              setChannel({
                type: "webhook",
                config: {
                  ...(state.channel.type === "webhook" ? state.channel.config : { method: "POST", headers: "", payload: "" }),
                  url: event.target.value,
                },
              })
            }
            className="input-base"
            placeholder={uiText.jobEditor.channel.webhookUrlPlaceholder}
          />
          <select
            aria-label="Webhook method"
            value={state.channel.config.method}
            onChange={(event) =>
              setChannel({
                type: "webhook",
                config: {
                  ...(state.channel.type === "webhook" ? state.channel.config : { url: "", headers: "", payload: "" }),
                  method: event.target.value as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
                },
              })
            }
            className="input-base h-10"
          >
            <option value="POST">{uiText.jobEditor.channel.methods.post}</option>
            <option value="GET">{uiText.jobEditor.channel.methods.get}</option>
            <option value="PUT">{uiText.jobEditor.channel.methods.put}</option>
            <option value="PATCH">{uiText.jobEditor.channel.methods.patch}</option>
            <option value="DELETE">{uiText.jobEditor.channel.methods.delete}</option>
          </select>
          <textarea
            aria-label="Webhook headers JSON"
            value={state.channel.config.headers}
            onChange={(event) =>
              setChannel({
                type: "webhook",
                config: {
                  ...(state.channel.type === "webhook" ? state.channel.config : { url: "", method: "POST", payload: "" }),
                  headers: event.target.value,
                },
              })
            }
            className="input-base h-24"
            placeholder={uiText.jobEditor.channel.headersPlaceholder}
          />
          <textarea
            aria-label="Webhook payload JSON"
            value={state.channel.config.payload}
            onChange={(event) =>
              setChannel({
                type: "webhook",
                config: {
                  ...(state.channel.type === "webhook" ? state.channel.config : { url: "", method: "POST", headers: "" }),
                  payload: event.target.value,
                },
              })
            }
            className="input-base h-28"
            placeholder={uiText.jobEditor.channel.payloadPlaceholder}
          />
        </div>
      ) : null}
    </section>
  );
}

export function JobPreviewSection() {
  const { state, setState } = useJobForm();
  const [testSend, setTestSend] = useState(false);

  const previewAbortRef = useRef<AbortController | null>(null);
  const previewSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      previewAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (state.channel.type !== "in_app") {
      return;
    }
    if (!testSend) {
      return;
    }
    setTestSend(false);
  }, [state.channel.type, testSend]);

  const previewDisabled = state.preview.loading || !state.prompt.trim();

  async function preview() {
    const seq = ++previewSeqRef.current;
    previewAbortRef.current?.abort();
    const controller = new AbortController();
    previewAbortRef.current = controller;

    setState((prev) => ({ ...prev, preview: { ...prev.preview, loading: true, status: "idle" } }));
    try {
      const payload: {
        name: string;
        template: string;
        postPrompt: string;
        postPromptEnabled: boolean;
        variables: string;
        useWebSearch: boolean;
        llmModel: string;
        webSearchMode: typeof state.webSearchMode;
        testSend: boolean;
        channel?: typeof state.channel;
      } = {
        name: state.name || uiText.jobEditor.preview.defaultName,
        template: state.prompt,
        postPrompt: state.postPrompt,
        postPromptEnabled: state.postPromptEnabled && !!state.postPrompt.trim(),
        variables: state.variables,
        useWebSearch: state.useWebSearch,
        llmModel: state.llmModel,
        webSearchMode: state.webSearchMode,
        testSend,
      };

      if (testSend) {
        payload.channel = state.channel;
      }

      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (seq !== previewSeqRef.current) {
        return;
      }

      const data = (await response.json()) as {
        output?: string;
        error?: string;
        executedAt?: string;
        usedWebSearch?: boolean;
        llmModel?: string | null;
        citations?: Array<{ url?: unknown; title?: unknown }>;
      };
      if (!response.ok) {
        throw new Error(data.error ?? uiText.jobEditor.preview.failed);
      }

      const citations = Array.isArray(data.citations)
        ? data.citations.reduce(
          (acc, c) => {
            const url = typeof c?.url === "string" ? c.url : "";
            if (!url) return acc;
            const title = typeof c?.title === "string" && c.title.trim() ? c.title : undefined;
            acc.push(title ? { url, title } : { url });
            return acc;
          },
          [] as Array<{ url: string; title?: string }>,
        )
        : [];

      setState((prev) => ({
        ...prev,
        preview: {
          loading: false,
          status: "success",
          output: data.output,
          executedAt: data.executedAt,
          usedWebSearch: data.usedWebSearch,
          llmModel: data.llmModel ?? null,
          citations,
        },
      }));
    } catch (error) {
      if (seq !== previewSeqRef.current) {
        return;
      }
      if (error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "AbortError") {
        return;
      }
      setState((prev) => ({
        ...prev,
        preview: {
          loading: false,
          status: "fail",
          errorMessage: error instanceof Error ? error.message : uiText.jobEditor.preview.unknownError,
        },
      }));
    } finally {
      if (seq === previewSeqRef.current && previewAbortRef.current === controller) {
        previewAbortRef.current = null;
      }
    }
  }

  return (
    <section className={sectionClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-900">{uiText.jobEditor.preview.title}</h3>
        <Button
          type="button"
          onClick={preview}
          variant="primary"
          size="sm"
          loading={state.preview.loading}
          className="shadow-sm"
          disabled={previewDisabled}
        >
          {state.preview.loading ? uiText.jobEditor.preview.running : uiText.jobEditor.preview.run}
        </Button>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-zinc-700">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={testSend}
            disabled={state.channel.type === "in_app"}
            onChange={(event) => setTestSend(event.target.checked)}
          />
          <span>{uiText.jobEditor.preview.testSend}</span>
        </label>
        {state.channel.type === "in_app" ? <p className="text-[11px] text-zinc-500">Test-send is only available for external channels.</p> : null}
      </div>
      <pre
        className="mt-3 min-h-16 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700 sm:min-h-24 sm:max-h-80"
        aria-live="polite"
      >
        {state.preview.status === "success"
          ? state.preview.output
          : state.preview.status === "fail"
            ? state.preview.errorMessage
            : uiText.jobEditor.preview.empty}
      </pre>
      {state.preview.status === "success" ? (
        <div className="mt-2 text-xs text-zinc-600">
          <p>
            {state.preview.executedAt ? `Executed: ${state.preview.executedAt}` : null}
            {state.preview.llmModel ? ` · Model: ${state.preview.llmModel}` : null}
            {typeof state.preview.usedWebSearch === "boolean"
              ? state.preview.usedWebSearch
                ? " · Web search: on"
                : state.useWebSearch
                  ? " · Web search: skipped"
                  : " · Web search: off"
              : null}
          </p>
          {state.preview.citations && state.preview.citations.length ? (
            <div className="mt-2">
              <p className="font-medium text-zinc-800">Sources</p>
              <ul className="mt-1 space-y-0.5">
                {state.preview.citations.slice(0, 5).map((c) => (
                  <li key={c.url}>
                    <a
                      className="underline decoration-zinc-300 underline-offset-2"
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.title && c.title.trim() ? c.title : c.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
