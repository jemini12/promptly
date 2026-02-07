import OpenAI from "openai";
import { SERVICE_SYSTEM_PROMPT } from "@/lib/system-prompt";

export async function runPrompt(prompt: string, allowWebSearch: boolean) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  const openai = new OpenAI({ apiKey });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await openai.responses.create(
      {
        model: "gpt-5-mini",
        instructions: SERVICE_SYSTEM_PROMPT,
        input: prompt,
        tools: allowWebSearch ? [{ type: "web_search_preview" }] : undefined,
      },
      { signal: controller.signal },
    );

    const text = (response.output_text ?? "").trim();
    if (!text) {
      throw new Error("LLM returned empty output");
    }

    return { output: text, usedWebSearch: allowWebSearch };
  } finally {
    clearTimeout(timeout);
  }
}
