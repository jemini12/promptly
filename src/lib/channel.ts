type SendChannelInput =
  | { type: "discord"; webhookUrl: string }
  | { type: "telegram"; botToken: string; chatId: string }
  | {
      type: "webhook";
      url: string;
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      headers: string;
      payload: string;
    };

export type ChannelCitation = { url: string; title?: string };

type SendChannelOptions = {
  citations?: ChannelCitation[];
  usedWebSearch?: boolean;
  meta?: Record<string, unknown>;
};

export class ChannelRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChannelRequestError";
    this.status = status;
  }
}

const DISCORD_MAX = 1900;
const TELEGRAM_MAX = 4000;

const DISCORD_WEBHOOK_URL_RE = /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/(\d+)\/[A-Za-z0-9_-]+/;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n < 10) return Math.round(n * 1000);
  return Math.round(n);
}

async function retryAfterMsFromResponse(res: Response): Promise<number | null> {
  const header = parseRetryAfterMs(res.headers.get("retry-after"));
  if (header != null) return header;
  try {
    const data = (await res.json()) as unknown;
    const retry = data && typeof data === "object" ? (data as { retry_after?: unknown }).retry_after : undefined;
    if (typeof retry === "number" && Number.isFinite(retry) && retry >= 0) {
      return Math.round(retry * 1000);
    }
  } catch {
    return null;
  }
  return null;
}

function buildDiscordChunks(text: string): string[] {
  const chunks = chunkDiscordContent(text, DISCORD_MAX);
  const maxParts = envInt("CHANNEL_DISCORD_MAX_PARTS", 10, 1, 50);
  if (chunks.length <= maxParts) return chunks;

  const note = `\n\n[Truncated: sent first ${maxParts} of ${chunks.length} parts. Full output is available in Run History.]`;
  const maxTotal = maxParts * DISCORD_MAX;
  const baseBudget = Math.max(0, maxTotal - note.length);
  const base = text.slice(0, baseBudget);
  const openFence = updateCodeFenceState(null, base);
  const closeFence = openFence != null ? "\n```" : "";
  const truncatedText = `${base}${closeFence}${note}`;
  return chunkDiscordContent(truncatedText, DISCORD_MAX).slice(0, maxParts);
}

async function postJsonWithRetry(url: string, headers: Record<string, string>, payload: unknown): Promise<void> {
  const maxRetries = envInt("CHANNEL_DISCORD_429_MAX_RETRIES", 3, 0, 10);
  let attempt = 0;
  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });
    if (res.ok) return;

    if (res.status === 429 && attempt < maxRetries) {
      attempt++;
      const retryMs = (await retryAfterMsFromResponse(res)) ?? 1000;
      await sleep(Math.min(Math.max(retryMs, 250), 10_000));
      continue;
    }

    throw new ChannelRequestError(`Webhook failed: ${res.status}`, res.status);
  }
}

function findSplitIndex(text: string, max: number): number {
  if (text.length <= max) {
    return text.length;
  }

  const within = text.slice(0, max);
  const min = Math.max(1, Math.floor(max * 0.5));
  const newline = within.lastIndexOf("\n");
  if (newline >= min) {
    return newline;
  }

  const space = within.lastIndexOf(" ");
  if (space >= min) {
    return space;
  }

  return max;
}

function chunkPlainText(text: string, max: number) {
  const chunks: string[] = [];
  let value = text;

  while (value.length > max) {
    const split = findSplitIndex(value, max);
    const part = value.slice(0, split).trimEnd();
    if (part.length) {
      chunks.push(part);
    }
    value = value.slice(split);
    if (value.startsWith("\n")) {
      value = value.slice(1);
    }
  }

  const tail = value.trim();
  if (tail.length) {
    chunks.push(tail);
  }
  return chunks;
}

function updateCodeFenceState(openFenceLang: string | null, text: string): string | null {
  let state: string | null = openFenceLang;
  const lines = text.split("\n");
  for (const line of lines) {
    const m = /^\s*```(\S*)\s*$/.exec(line);
    if (!m) {
      continue;
    }
    if (state == null) {
      state = m[1] ?? "";
    } else {
      state = null;
    }
  }
  return state;
}

function chunkDiscordContent(text: string, max: number) {
  const chunks: string[] = [];
  let remaining = text;
  let openFenceLang: string | null = null;

  while (remaining.length) {
    if (chunks.length && remaining.startsWith("\n")) {
      remaining = remaining.slice(1);
    }

    const prefix = openFenceLang != null ? `\`\`\`${openFenceLang}\n` : "";
    const available = max - prefix.length;
    if (available <= 0) {
      break;
    }

    const initialSplit = findSplitIndex(remaining, available);
    let body = remaining.slice(0, initialSplit);
    let nextRemaining = remaining.slice(initialSplit);
    if (nextRemaining.startsWith("\n")) {
      nextRemaining = nextRemaining.slice(1);
    }

    for (let i = 0; i < 3; i++) {
      const nextFenceState = updateCodeFenceState(openFenceLang, body);
      const needsClose = nextFenceState != null;
      const suffix = needsClose ? (body.endsWith("\n") ? "```" : "\n```") : "";
      const totalLen = prefix.length + body.length + suffix.length;
      if (totalLen <= max) {
        const chunk = `${prefix}${body.trimEnd()}${suffix}`.trimEnd();
        if (chunk.length) {
          chunks.push(chunk);
        }
        remaining = nextRemaining;
        openFenceLang = nextFenceState;
        break;
      }

      const maxBody = Math.max(1, max - prefix.length - (needsClose ? 4 : 0));
      const within = body.slice(0, maxBody);
      const nl = within.lastIndexOf("\n");
      body = nl > 0 ? within.slice(0, nl) : within;
    }
  }

  return chunks.length ? chunks : [text.slice(0, max)];
}

export const __private__ = {
  chunkPlainText,
  chunkDiscordContent,
  updateCodeFenceState,
};

export async function sendChannelMessage(channel: SendChannelInput, title: string, body: string, opts?: SendChannelOptions) {
  const citations = (opts?.citations ?? []).filter((c) => c && typeof c.url === "string" && c.url.length > 0);
  const meta = opts?.meta && typeof opts.meta === "object" && opts.meta !== null && !Array.isArray(opts.meta) ? opts.meta : undefined;
  const sources = citations.length
    ? `\n\nSources:\n${citations
        .slice(0, 5)
        .map((c) => (c.title ? `- ${c.title}: ${c.url}` : `- ${c.url}`))
        .join("\n")}`
    : "";

  const text = `${title}\n\n${body}${sources}`;

  if (channel.type === "discord") {
    for (const chunk of buildDiscordChunks(text)) {
      try {
        await postJsonWithRetry(channel.webhookUrl, {}, { content: chunk });
      } catch (err) {
        if (err instanceof ChannelRequestError) {
          throw new ChannelRequestError(`Discord webhook failed: ${err.status}`, err.status);
        }
        throw err;
      }
    }
    return;
  }

  if (channel.type === "webhook") {
    const headers = channel.headers.trim() ? JSON.parse(channel.headers) : {};
    const payload = channel.payload.trim()
      ? JSON.parse(channel.payload)
      : { title, body, content: text, usedWebSearch: opts?.usedWebSearch ?? false, citations, meta };

    if (channel.method === "POST" && DISCORD_WEBHOOK_URL_RE.test(channel.url)) {
      const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      const content = obj && typeof obj.content === "string" ? obj.content : null;
      if (content) {
        const extraHeaders = headers as Record<string, string>;
        for (const chunk of buildDiscordChunks(content)) {
          await postJsonWithRetry(channel.url, extraHeaders, { ...obj, content: chunk });
        }
        return;
      }
    }

    const res = await fetch(channel.url, {
      method: channel.method,
      headers: {
        "Content-Type": "application/json",
        ...(headers as Record<string, string>),
      },
      body: channel.method === "GET" ? undefined : JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new ChannelRequestError(`Webhook failed: ${res.status}`, res.status);
    }
    return;
  }

  const url = `https://api.telegram.org/bot${channel.botToken}/sendMessage`;
  for (const chunk of chunkPlainText(text, TELEGRAM_MAX)) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: channel.chatId, text: chunk }),
    });
    if (!res.ok) {
      throw new ChannelRequestError(`Telegram sendMessage failed: ${res.status}`, res.status);
    }
  }
}
