# AI Gateway Multi-Model + Web Search Plan

Goal: support multiple models through Vercel AI Gateway, while keeping web search fully user-controlled.

## Principles

- Web search is never forced. User must opt in per job (`useWebSearch=true`).
- When web search is enabled, never route/fallback to a provider/model combination that cannot satisfy the selected search mode.
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

### Routing / Fallback Policy (AI Gateway)

- Prefer restricting provider routing for web-search runs (to avoid falling back to a provider that can't satisfy the native tool).

Relevant docs:
- Web Search modes and tools: https://vercel.com/docs/ai-gateway/capabilities/web-search
- Provider routing options (`only`, `order`): https://vercel.com/docs/ai-gateway/models-and-providers/provider-options
- Model fallback behavior: https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks

## Rollout (Phased)

1) Add DB fields + UI controls (model + web search mode).
2) Switch LLM calls to AI Gateway and map `webSearchMode` to Gateway tools.
3) Add routing/fallback constraints via `providerOptions.gateway`.
4) Update run artifacts to record which search tool/mode was used.

## Environment

- Add `AI_GATEWAY_API_KEY`.
- Provider-specific BYOK keys depend on which providers you enable.
