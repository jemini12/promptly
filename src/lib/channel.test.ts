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
});
