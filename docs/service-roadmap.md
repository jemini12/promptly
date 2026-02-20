# Promptloop Service Improvement Plan

This document is a service-planner roadmap for moving Promptloop from a working MVP to a SaaS-grade “scheduled LLM deliverable” product.

## Product Positioning

Promptloop is not a generic automation builder (Zapier/n8n). The differentiator is treating each job run as a reproducible, auditable artifact (prompt version + config snapshot + output + citations + delivery receipt), with strong reliability and cost/safety controls for scheduled execution.

## Goals

- Reliability: scheduled runs are idempotent and observable; delivery is retryable without re-running the LLM.
- Reproducibility: every run is tied to an immutable prompt/config snapshot; users can explain “what was sent and why.”
- Safety: secrets never leak; web-search grounding is constrained; deliveries respect channel policies.
- Cost control: per-user/job budgets and caps; predictable spend; clear limits UX.
- Prompt lifecycle: templates/variables, versioning, publish/rollback, preview parity with scheduled runs.

## Non-Goals (Near Term)

- Full workflow DAG builder (Zapier-class automation UI)
- Team workspaces + billing (can come later; design should not block it)

## Current Baseline (Today)

- LLM execution: Vercel AI SDK + OpenAI provider, model ids like `gpt-5-mini`, optional web search via OpenAI web_search tool.

Planned:

- Web search via OpenAI web_search tool.
- Scheduling: Vercel Cron hits `GET /api/cron/run-jobs` every minute; DB locking via `FOR UPDATE SKIP LOCKED`.
- Delivery: Discord/Telegram/Webhook with basic chunking; retries with exponential backoff.
- History: stores run histories (success/fail) with truncated output/error; previews tracked.
- Guardrails: daily run limit (previews), retries on 408/429/5xx, 60s timeout, auto-disable after 10 failures.

## Principles

- Separate concerns: Authoring → Execution → Delivery.
- Persist before sending: produce a durable run artifact before any external delivery.
- Default safe: web search off; strict redaction of secrets; structured logging.
- Everything measurable: success rate, latency, retries, delivery receipts, token/cost estimates.

## Roadmap

### Phase 0 — “Safe To Run” (Reliability + Ops Baseline)

Deliverables:
- Run idempotency: dedupe scheduled triggers per job per schedule instance; prevent duplicate sends.
- Delivery receipts: persist delivery intent + attempts; retries do not re-run the LLM.
- Observability v1: correlation ID per run; structured event timeline (run → LLM → delivery attempts).
- Quota parity: scheduled runs respect budgets/limits (not only previews).

Success criteria:
- 99%+ of due runs produce exactly one delivery intent.
- “Delivered within N minutes” SLI tracked and visible.

### Phase 1 — Prompt Lifecycle v1 (Authoring + Preview Parity)

Deliverables:
- Prompt templates with variables (typed inputs + defaults) instead of a single opaque string.
- Immutable PromptVersion + publish/rollback; scheduled runs bind to a specific published version.
  - Prompt authoring assist: Prompt Writer (template picker + strict prompt enhancement) in the Job Editor.

Success criteria:
- Users can reproduce a run with the exact prompt/config used.
- Preview output matches scheduled output format (within expected non-determinism).

### Phase 2 — Web Search Hardening + Output Contracts

Deliverables:
- Web search policy: citations required; treat search results as untrusted data; guard against prompt injection.
- Output contracts:
  - Webhook: JSON schema option (structured output).
  - Chat channels: formatting rules + truncation policy + link policy.
- Artifact expansion: store citations, tool usage, and per-run usage/cost estimates.

Implemented (initial slice):
- Persist artifacts on each run: `llm_model`, `llm_usage`, `llm_tool_calls`, `used_web_search`, `citations`.
- Webhook default payload expanded to a stable JSON shape: `{ title, body, content, usedWebSearch, citations, meta }`.
- Channel deliveries append a short Sources section when citations exist.
- Job History UI surfaces web-search usage + Sources.

Success criteria:
- Web-search-enabled jobs show sources; failure modes are explainable.
- Downstream webhook consumers receive stable shapes.

### Phase 3 — Evals + Governance (SaaS Differentiators)

Deliverables:
- Prompt eval suites: test cases/fixtures and regression tracking per PromptVersion.
- Publish gates: require “green” evals for prompts that deliver externally.
- Governance primitives: audit log for publishes/credential changes; retention policy + deletion.

Implemented (initial slice):
- AuditLog: record job create/update/delete and prompt publish events.
- Prompt evals: minimal eval suites/cases and eval runs bound to a specific PromptVersion.

Success criteria:
- Prompt changes are safe to roll out; rollbacks are fast.
- Support/debug is driven by run timeline + artifacts, not guesswork.

## Metrics (Minimum Set)

- Activation: create job → preview → first successful scheduled delivery.
- Execution SLIs: due→started rate, success rate, p50/p95 runtime, retry counts.
- Delivery SLIs: provider success rate, 429 rate, average attempts per delivery.
- Cost: tokens/run, cost/run, top jobs/users, budget blocks.

## Operational Runbook (MVP)

- If duplicate sends: disable cron trigger, confirm idempotency key behavior, replay delivery attempts only.
- If OpenAI 429/outage: backoff, pause jobs, record failure reason, surface user-facing status.
- If channel provider outage: queue and retry deliveries; stop hammering on 429.

## Risks

- Cron overlap and retries causing duplicate deliveries without strict idempotency.
- Preview drift vs scheduled environment (time context, tool policy, delivery formatting).
- Web search prompt injection and untrusted content leakage.
- Cost blowups without budgets/caps and anomaly detection.
