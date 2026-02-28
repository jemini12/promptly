import { afterEach, describe, expect, it, vi } from "vitest";

import { __private__, sendChannelMessage } from "./channel";

function mockOkFetch() {
  return vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    void _input;
    void _init;
    return ({ ok: true, status: 204 }) as unknown as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("channel chunking", () => {
  it("chunkPlainText prefers splitting on newlines", () => {
    const max = 8;
    const chunks = __private__.chunkPlainText("12345\n67890\nabc", max);
    expect(chunks).toEqual(["12345", "67890", "abc"]);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(max);
    }
  });

  it("chunkDiscordContent produces fence-balanced chunks", () => {
    const max = 60;
    const text = `Intro\n\n\`\`\`ts\n${"x".repeat(200)}\n\`\`\`\nTail`;
    const chunks = __private__.chunkDiscordContent(text, max);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(max);
      expect(__private__.updateCodeFenceState(null, c)).toBeNull();
    }
  });
});

describe("sendChannelMessage", () => {
  it("splits long Discord messages across multiple webhook POSTs", async () => {
    const fetchMock = mockOkFetch();
    vi.stubGlobal("fetch", fetchMock);

    const title = "[t]";
    const body = "a".repeat(4000);
    const expectedChunks = __private__.chunkDiscordContent(`${title}\n\n${body}`, 1900);

    await sendChannelMessage({ type: "discord", webhookUrl: "https://discord.com/api/webhooks/1/x" }, title, body);

    expect(fetchMock).toHaveBeenCalledTimes(expectedChunks.length);
    for (const call of fetchMock.mock.calls) {
      const req = call[1] as RequestInit | undefined;
      const payload = typeof req?.body === "string" ? (JSON.parse(req.body) as { content?: unknown }) : null;
      expect(typeof payload?.content).toBe("string");
      expect((payload?.content as string).length).toBeLessThanOrEqual(1900);
    }
  });

  it("splits Discord webhook payloads even via generic webhook channel", async () => {
    const fetchMock = mockOkFetch();
    vi.stubGlobal("fetch", fetchMock);

    const long = "b".repeat(4000);
    const expectedChunks = __private__.chunkDiscordContent(long, 1900);

    await sendChannelMessage(
      {
        type: "webhook",
        url: "https://discord.com/api/webhooks/1/x",
        method: "POST",
        headers: "{}",
        payload: JSON.stringify({ content: long }),
      },
      "t",
      "ignored",
    );

    expect(fetchMock).toHaveBeenCalledTimes(expectedChunks.length);
    for (const call of fetchMock.mock.calls) {
      const req = call[1] as RequestInit | undefined;
      const payload = typeof req?.body === "string" ? (JSON.parse(req.body) as { content?: unknown }) : null;
      expect(typeof payload?.content).toBe("string");
      expect((payload?.content as string).length).toBeLessThanOrEqual(1900);
    }
  });

  it("caps Discord parts to avoid runaway sends", async () => {
    const prev = process.env.CHANNEL_DISCORD_MAX_PARTS;
    process.env.CHANNEL_DISCORD_MAX_PARTS = "3";
    try {
      const fetchMock = mockOkFetch();
      vi.stubGlobal("fetch", fetchMock);

      const title = "[t]";
      const body = "c".repeat(1900 * 6);
      await sendChannelMessage({ type: "discord", webhookUrl: "https://discord.com/api/webhooks/1/x" }, title, body);

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const contents = fetchMock.mock.calls
        .map((call) => {
          const req = call[1] as RequestInit | undefined;
          const payload = typeof req?.body === "string" ? (JSON.parse(req.body) as { content?: unknown }) : null;
          return typeof payload?.content === "string" ? (payload.content as string) : null;
        })
        .filter((v): v is string => v != null);
      expect(contents.length).toBe(3);
      expect(contents.some((c) => c.includes("[Truncated:"))).toBe(true);
    } finally {
      if (prev == null) delete process.env.CHANNEL_DISCORD_MAX_PARTS;
      else process.env.CHANNEL_DISCORD_MAX_PARTS = prev;
    }
  });

  it("retries 429 responses with Retry-After", async () => {
    const prev = process.env.CHANNEL_DISCORD_429_MAX_RETRIES;
    process.env.CHANNEL_DISCORD_429_MAX_RETRIES = "1";
    vi.useFakeTimers();

    try {
      let calls = 0;
      const fetchMock = vi.fn(async () => {
        const n = calls;
        calls++;
        if (n === 0) {
          return {
            ok: false,
            status: 429,
            headers: { get: (k: string) => (k.toLowerCase() === "retry-after" ? "0" : null) },
            json: async () => ({ retry_after: 0 }),
          } as unknown as Response;
        }
        return ({ ok: true, status: 204, headers: { get: () => null } }) as unknown as Response;
      });
      vi.stubGlobal("fetch", fetchMock);

      const p = sendChannelMessage({ type: "discord", webhookUrl: "https://discord.com/api/webhooks/1/x" }, "t", "hello");
      await vi.runAllTimersAsync();
      await p;

      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      if (prev == null) delete process.env.CHANNEL_DISCORD_429_MAX_RETRIES;
      else process.env.CHANNEL_DISCORD_429_MAX_RETRIES = prev;
    }
  });
});
