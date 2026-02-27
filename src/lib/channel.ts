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

function findSplitIndex(text: string, max: number): number {
  if (text.length <= max) {
    return text.length;
  }

  const within = text.slice(0, max);
  const newline = within.lastIndexOf("\n");
  if (newline > 0) {
    return newline;
  }

  const space = within.lastIndexOf(" ");
  if (space > 0) {
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
    for (const chunk of chunkDiscordContent(text, DISCORD_MAX)) {
      const res = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: chunk }),
      });
      if (!res.ok) {
        throw new ChannelRequestError(`Discord webhook failed: ${res.status}`, res.status);
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
        for (const chunk of chunkDiscordContent(content, DISCORD_MAX)) {
          const res = await fetch(channel.url, {
            method: channel.method,
            headers: {
              "Content-Type": "application/json",
              ...(headers as Record<string, string>),
            },
            body: JSON.stringify({ ...obj, content: chunk }),
          });
          if (!res.ok) {
            throw new ChannelRequestError(`Webhook failed: ${res.status}`, res.status);
          }
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
