"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getOrCreateChatId(storageKey: string): string {
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing && existing.trim()) return existing;
  } catch {
    return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }

  const next = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  try {
    window.localStorage.setItem(storageKey, next);
  } catch {
    return next;
  }
  return next;
}

function renderPart(part: unknown, key: string) {
  const toPrettyText = (value: unknown): string => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "step-start") {
    if (key.endsWith("-0")) return null;
    return <div key={key} className="my-3 border-t border-zinc-200" />;
  }

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "source-url") {
    const url = "url" in part && typeof (part as { url?: unknown }).url === "string" ? (part as { url: string }).url : "";
    if (!url.trim()) return null;
    const title = "title" in part && typeof (part as { title?: unknown }).title === "string" ? (part as { title: string }).title : "";
    return (
      <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <div className="font-medium">Source</div>
        <a className="mt-1 block break-all underline underline-offset-2" href={url} target="_blank" rel="noreferrer">
          {title.trim() ? title : url}
        </a>
      </div>
    );
  }

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "source-document") {
    const title = "title" in part && typeof (part as { title?: unknown }).title === "string" ? (part as { title: string }).title : "";
    const mediaType = "mediaType" in part && typeof (part as { mediaType?: unknown }).mediaType === "string" ? (part as { mediaType: string }).mediaType : "";
    const filename = "filename" in part && typeof (part as { filename?: unknown }).filename === "string" ? (part as { filename: string }).filename : "";
    const label = title.trim() ? title : filename.trim() ? filename : "Document";
    const meta = [filename.trim() ? filename : null, mediaType.trim() ? mediaType : null].filter(Boolean).join(" • ");
    return (
      <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <div className="font-medium">{label}</div>
        {meta ? <div className="mt-1 text-[11px] text-zinc-500">{meta}</div> : null}
      </div>
    );
  }

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "file") {
    const url = "url" in part && typeof (part as { url?: unknown }).url === "string" ? (part as { url: string }).url : "";
    if (!url.trim()) return null;
    const filename = "filename" in part && typeof (part as { filename?: unknown }).filename === "string" ? (part as { filename: string }).filename : "";
    const mediaType = "mediaType" in part && typeof (part as { mediaType?: unknown }).mediaType === "string" ? (part as { mediaType: string }).mediaType : "";
    const label = filename.trim() ? filename : "File";
    return (
      <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <div className="font-medium">{label}</div>
        {mediaType.trim() ? <div className="mt-1 text-[11px] text-zinc-500">{mediaType}</div> : null}
        <a className="mt-1 block break-all underline underline-offset-2" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </div>
    );
  }

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "text") {
    const text = "text" in part && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : "";
    return (
      <div key={key} className="text-sm leading-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
            a: ({ children, href }) => (
              <a className="underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
            code: ({ children }) => <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.95em]">{children}</code>,
            pre: ({ children }) => (
              <pre className="overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5">{children}</pre>
            ),
            ul: ({ children }) => <ul className="mb-3 list-disc pl-5 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-3 list-decimal pl-5 last:mb-0">{children}</ol>,
            li: ({ children }) => <li className="mb-1 last:mb-0">{children}</li>,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  }

  if (part && typeof part === "object" && "type" in part && (part as { type?: unknown }).type === "reasoning") {
    const text = "text" in part && typeof (part as { text?: unknown }).text === "string" ? (part as { text: string }).text : "";
    if (!text.trim()) return null;
    return (
      <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
        <div className="font-medium text-zinc-600">Reasoning</div>
        <div className="mt-1 whitespace-pre-wrap">{text}</div>
      </div>
    );
  }

  if (part && typeof part === "object" && "type" in part && typeof (part as { type?: unknown }).type === "string") {
    const type = (part as { type: string }).type;

    if (type.startsWith("data-")) {
      const data = "data" in part ? (part as { data?: unknown }).data : undefined;
      const text = toPrettyText(data);
      if (!text.trim()) return null;
      return (
        <pre key={key} className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] leading-4 text-zinc-800">
          {text}
        </pre>
      );
    }

    if (type === "dynamic-tool") {
      const toolName = "toolName" in part && typeof (part as { toolName?: unknown }).toolName === "string" ? (part as { toolName: string }).toolName : "";
      const errorText = "errorText" in part && typeof (part as { errorText?: unknown }).errorText === "string" ? (part as { errorText: string }).errorText : undefined;
      const output = "output" in part ? (part as { output?: unknown }).output : undefined;
      const outputText = toPrettyText(output);
      const baseClass =
        errorText && errorText.trim()
          ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
          : "rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700";

      return (
        <div key={key} className={baseClass}>
          <div className="font-medium">{toolName.trim() ? toolName : "dynamic-tool"}</div>
          {errorText ? <div className="mt-1">{errorText}</div> : null}
          {!errorText && outputText.trim() ? (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-[11px] leading-4 text-zinc-800">
              {outputText}
            </pre>
          ) : null}
        </div>
      );
    }

    if (!type.startsWith("tool-")) return null;

    const toolName = type.slice("tool-".length);
    const title = "title" in part && typeof (part as { title?: unknown }).title === "string" ? (part as { title: string }).title : undefined;
    const errorText = "errorText" in part && typeof (part as { errorText?: unknown }).errorText === "string" ? (part as { errorText: string }).errorText : undefined;
    const output = "output" in part ? (part as { output?: unknown }).output : undefined;

    if (toolName === "plan_from_intent") {
      const state = "state" in part && typeof (part as { state?: unknown }).state === "string" ? (part as { state: string }).state : "";
      const status =
        output && typeof output === "object" && output !== null && "status" in output
          ? (output as { status?: unknown }).status
          : null;
      const clarifications =
        output && typeof output === "object" && output !== null && "clarifications" in output
          ? (output as { clarifications?: unknown }).clarifications
          : null;

      if (status === "needs_clarification" && Array.isArray(clarifications) && clarifications.length) {
        const questions = clarifications
          .map((c) => (c && typeof c === "object" && "question" in c && typeof (c as { question?: unknown }).question === "string" ? (c as { question: string }).question : ""))
          .filter((q) => q.trim());

        if (questions.length) {
          return (
            <div key={key} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="font-medium">Needs clarification</div>
              <div className="mt-1 whitespace-pre-wrap">{questions.join("\n")}</div>
            </div>
          );
        }
      }

      if (output != null) {
        const outputText = toPrettyText(output);

        if (outputText.trim()) {
          return (
            <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              <div className="font-medium">plan_from_intent</div>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-[11px] leading-4 text-zinc-800">
                {outputText}
              </pre>
            </div>
          );
        }
      }

      if (state && state !== "output-available") {
        return (
          <div key={key} className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
            <div className="font-medium">plan_from_intent</div>
            <div className="mt-1 text-[11px] text-zinc-500">{state.replace(/-/g, " ")}</div>
          </div>
        );
      }

      return null;
    }

    const jobId =
      output && typeof output === "object" && output !== null && "jobId" in output
        ? (output as { jobId?: unknown }).jobId
        : null;
    const editUrl = typeof jobId === "string" && jobId.trim() ? `/jobs/${jobId}/edit` : null;

    const outputText = toPrettyText(output);

    const baseClass =
      errorText && errorText.trim()
        ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
        : editUrl
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
          : "rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700";

    return (
      <div key={key} className={baseClass}>
        <div className="font-medium">{title?.trim() ? title : toolName}</div>
        {errorText ? <div className="mt-1">{errorText}</div> : null}
        {!editUrl && outputText.trim() ? (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-[11px] leading-4 text-zinc-800">
            {outputText}
          </pre>
        ) : null}
        {editUrl ? (
          <div className="mt-1">
            <Link className="underline underline-offset-2" href={editUrl}>
              Open job editor
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

export function JobBuilderChatClient() {
  const [chatId, setChatId] = useState<string>(() => getOrCreateChatId("promptloop.job-builder.chatId"));
  const lastLoadedChatId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [createPressed, setCreatePressed] = useState(false);

  const transport = useMemo(() => {
    return new DefaultChatTransport<UIMessage>({
      api: "/api/chat",
      body: { chatId, persist: true },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (response.status === 401) {
          window.location.assign(`/signin?callbackUrl=${encodeURIComponent("/chat")}`);
          throw new Error("Unauthorized");
        }
        if (!response.ok) {
          let message = `Request failed (${response.status})`;
          try {
            const contentType = response.headers.get("content-type") ?? "";
            if (contentType.includes("application/json")) {
              const data = (await response.json()) as unknown;
              if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
                message = (data as { error: string }).error;
              }
            } else {
              const text = await response.text();
              if (text.trim()) message = text;
            }
          } catch {
            message = `Request failed (${response.status})`;
          }
          throw new Error(message);
        }
        return response;
      },
    });
  }, [chatId]);

  const {
    messages,
    setMessages,
    status,
    error,
    stop,
    sendMessage,
  } = useChat({
    id: chatId,
    transport,
  });

  const typedMessages = messages as UIMessage[];
  const [input, setInput] = useState("");

  const canSend = status === "ready" && !!input.trim();
  const secondaryActionClass =
    "inline-flex h-8 items-center whitespace-nowrap rounded-md border border-zinc-200 bg-white px-2.5 font-sans text-[11px] font-medium leading-none text-zinc-700 hover:bg-zinc-50";

  const loadHistory = useCallback(
    async (nextChatId: string) => {
      try {
        const response = await fetch(`/api/chat/history?chatId=${encodeURIComponent(nextChatId)}`);
        if (response.status === 401) {
          const next = `/signin?callbackUrl=${encodeURIComponent("/chat")}`;
          window.location.assign(next);
          return;
        }
        const data = (await response.json()) as unknown;
        if (!response.ok) return;
        const list =
          data && typeof data === "object" && data !== null && "messages" in data
            ? (data as { messages?: unknown }).messages
            : null;
        if (!Array.isArray(list)) return;

        const parsed: UIMessage[] = [];
        for (const raw of list) {
          if (!raw || typeof raw !== "object") continue;
          const r = raw as { id?: unknown; role?: unknown; parts?: unknown; content?: unknown; metadata?: unknown };
          if (typeof r.id !== "string" || typeof r.role !== "string") continue;
          if (r.role !== "system" && r.role !== "user" && r.role !== "assistant") continue;

          const parts = Array.isArray(r.parts)
            ? r.parts
            : typeof r.content === "string" && r.content.trim()
              ? [{ type: "text", text: r.content }]
              : [];

          const metadata = r.metadata && typeof r.metadata === "object" ? r.metadata : undefined;
          parsed.push({ id: r.id, role: r.role, parts, ...(metadata ? { metadata } : {}) } as UIMessage);
        }

        setMessages(parsed);
      } catch {
        return;
      }
    },
    [setMessages],
  );

  useEffect(() => {
    if (lastLoadedChatId.current === chatId) return;
    lastLoadedChatId.current = chatId;
    window.setTimeout(() => {
      loadHistory(chatId);
    }, 0);
  }, [chatId, loadHistory]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distance < 24);
  }, []);

  useEffect(() => {
    if (!stickToBottom) return;
    if (typedMessages.length === 0) return;
    const behavior = status === "streaming" ? "auto" : "smooth";
    bottomRef.current?.scrollIntoView({ block: "end", behavior });
  }, [typedMessages.length, status, stickToBottom]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 180);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [autoResize, input]);

  function newChat() {
    const next = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    try {
      window.localStorage.setItem("promptloop.job-builder.chatId", next);
    } catch {
      setChatId(next);
      return;
    }
    setMessages([]);
    setChatId(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    const text = input.trim();
    if (!text) return;
    setStickToBottom(true);
    sendMessage({ text });
    setInput("");
    setCreatePressed(false);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-2 pb-2">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Create with Chat</h1>
        </div>
      </div>

      <section className="surface-card mt-6">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="max-h-[60vh] overflow-y-auto space-y-3 pr-1"
        >
          {typedMessages.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Start with something like: Every weekday 9am, send a brief project status summary to Discord.
            </p>
          ) : null}

          {typedMessages.map((m) => {
            const legacyContent = (m as unknown as { content?: unknown }).content;
            const legacyParts =
              Array.isArray(m.parts) && m.parts.length
                ? m.parts
                : typeof legacyContent === "string" && legacyContent.trim()
                  ? [{ type: "text", text: legacyContent }]
                  : [];

            const planOk =
              m.role === "assistant" &&
              legacyParts.some((p) => {
                if (!p || typeof p !== "object") return false;
                if ((p as { type?: unknown }).type !== "tool-plan_from_intent") return false;
                const output = (p as { output?: unknown }).output;
                return !!(output && typeof output === "object" && output !== null && (output as { status?: unknown }).status === "ok");
              });
            const showCreate = planOk && status === "ready" && !createPressed;

            const rowClass = m.role === "user" ? "flex justify-end" : "flex justify-start";
            const bubbleClass =
              m.role === "user"
                ? "w-fit max-w-[85%] rounded-2xl border border-black bg-black px-4 py-3 text-sm text-white shadow-sm"
                : "w-fit max-w-[85%] rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700";

            return (
              <div key={m.id} className={rowClass}>
                {m.role === "assistant" ? (
                  <div className="w-full max-w-[85%] text-sm text-zinc-900">
                    <div className="space-y-2">{legacyParts.map((part, i) => renderPart(part, `${m.id}-${i}`))}</div>
                    {showCreate ? (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="inline-flex h-9 items-center rounded-md bg-black px-3 text-sm font-medium text-white"
                          onClick={() => {
                            setCreatePressed(true);
                            setStickToBottom(true);
                            sendMessage({ text: "proceed" });
                          }}
                        >
                          Create this job
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={bubbleClass}>
                    <div className="space-y-2">{legacyParts.map((part, i) => renderPart(part, `${m.id}-${i}`))}</div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </section>

      {error ? <p className="mt-3 text-sm text-red-600">{error.message}</p> : null}

      <div className="sticky bottom-0 -mx-4 bg-white/95 px-4 pt-4 pb-6 backdrop-blur">
        <form onSubmit={onSubmit}>
          <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.currentTarget.value);
                autoResize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const form = e.currentTarget.form;
                  if (form) {
                    form.requestSubmit();
                  }
                }
              }}
              className="min-h-12 max-h-44 w-full resize-none overflow-hidden bg-transparent px-4 py-3 pr-14 text-sm leading-6 text-zinc-900 outline-none"
              placeholder={status === "streaming" ? "Responding..." : "Type a message"}
              disabled={status !== "ready"}
              rows={1}
            />
            {status === "submitted" || status === "streaming" ? (
              <button
                type="button"
                aria-label="Stop"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-zinc-900 text-white"
                onClick={() => stop()}
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
                  <rect x="7" y="7" width="10" height="10" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-zinc-900 text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canSend}
              >
                <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Link href="/dashboard" className={secondaryActionClass}>
              Go back to Dashboard
            </Link>
            <button
              type="button"
              onClick={newChat}
              className={secondaryActionClass}
              disabled={status === "streaming" || status === "submitted"}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
