# Gemini thought_signature notes

Note: This was relevant to a previous implementation that replayed tool-call transcripts across steps. The current implementation uses provider-native web search tools in a single `generateText()` call (no transcript replay), so this issue should not apply unless we reintroduce replay.

Gemini (Google/Vertex) can require a thought signature to be preserved when replaying tool call transcripts.

## What it is

- A provider-specific field attached to content parts (including function/tool call parts) that Gemini uses to validate multi-turn tool calling.
- If it is missing when tool calls are involved, Gemini can reject the request (400) with an error like "Function call is missing a thought_signature".

## Field names in official docs

- Vertex AI docs use `thought_signature` (snake_case).
- Gemini API docs use `thoughtSignature` (camelCase).

References:
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/thought-signatures
- https://ai.google.dev/gemini-api/docs/thought-signatures

## Why it broke here

Previously, our web-search path used a 2-step transcript replay:

1) Step 1: `generateText()` with a search tool enabled produces `toolCalls` and `toolResults`.
2) Step 2: we replay those as `messages` (assistant tool-call parts + tool-result parts) to get the final answer.

Gemini expects provider metadata from Step 1 tool call parts to be forwarded when constructing the Step 2 message parts. Dropping it can trigger the thought_signature error.

## How we fixed it

- AI SDK prompt message parts support `providerOptions` on `ToolCallPart` and `ToolResultPart` (the pass-through channel).
- At runtime, tool calls/results may include `providerMetadata`. We copied that into `providerOptions` when building replay parts.

Code paths:
- Historical: `src/lib/llm.ts` preserved provider metadata in replay parts.
- Historical: `scripts/ai-gateway-smoke.mjs` preserved provider metadata in replay parts.

## Follow-ups

- If we reintroduce transcript replay, ensure provider metadata is preserved across steps.
