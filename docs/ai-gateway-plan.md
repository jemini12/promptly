# AI Gateway Multi-Model + Web Search Plan

Goal: support multiple models through Vercel AI Gateway, while keeping web search fully user-controlled.

## Principles

- Web search is never forced. User must opt in per job (`useWebSearch=true`).
- When web search is enabled, never route/fallback to a provider/model combination that cannot satisfy the provider-native search tool.
- Preview and scheduled runs share the same model/tool policy.

## Current State (Today)

- LLM execution: Vercel AI SDK (AI Gateway), model ids like `openai/gpt-5-mini`.
- Web search toggle already exists: `jobs.allow_web_search`.
- Artifacts: store `llm_model`, `llm_usage`, tool calls, citations.

## Target State

### Data Model

- Add `jobs.llm_model` (string, gateway model id like `openai/gpt-5-mini`).
- Add `jobs.web_search_mode` (string):
    - `native`

### UI (Job Editor)

- Model select (writes `llmModel` to job)
- Web search toggle (already exists)
- Web search uses provider-native tool based on selected model

### Execution Policy

- If `useWebSearch=false`: do not attach any search tools.
- If `useWebSearch=true`: attach the provider-native tool implied by `llmModel` prefix.

Implementation note:

- Provider-native web search tools are defined via AI SDK provider packages (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`).
- Model execution still uses AI Gateway model ids like `openai/gpt-5-mini`.

### Routing / Fallback Policy (AI Gateway)

- Prefer restricting provider routing for web-search runs (to avoid falling back to a provider that can't satisfy the native tool).

Relevant docs:
- Web Search modes and tools: https://vercel.com/docs/ai-gateway/capabilities/web-search
- Provider routing options (`only`, `order`): https://vercel.com/docs/ai-gateway/models-and-providers/provider-options
- Model fallback behavior: https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks

## Rollout (Phased)

1) Add DB fields + UI controls (model + web search toggle).
2) Implement provider-native web search tool selection by `llmModel` prefix.
3) (Optional) Add routing constraints via `providerOptions.gateway` to avoid provider fallback on web-search runs.
4) Ensure run artifacts store tool calls and citations.

## Environment

- Add `AI_GATEWAY_API_KEY`.
- Provider-specific BYOK keys depend on which providers you enable.
