# Create with Chat

`/chat` is an authenticated, chat-based job creation flow ("Create with Chat").

It uses the Vercel AI SDK UI message stream protocol (SSE) and supports tool calling to:

- plan a job from a natural-language intent (`plan_from_intent`)
- create/update/delete a job (`create_job`, `update_job`, `delete_job`)
- preview jobs/templates (`preview_job`, `preview_template`)

## Routes

- UI: `GET /chat`
- API (stream): `POST /api/chat`
- API (history): `GET /api/chat/history?chatId=...`

## Request body

The client sends UI messages plus a stable `chatId`.

```json
{
  "messages": [/* UIMessage[] */],
  "chatId": "<uuid>",
  "persist": true
}
```

`persist=true` stores the transcript for recovery. Streaming render is the priority; persistence runs after the stream finishes.

## Tool calling loop

The chat API must allow multiple steps so the model can:

1) call a tool
2) read the tool result
3) ask a follow-up question or proceed

This is configured in `src/app/api/chat/route.ts` via `stopWhen: stepCountIs(N)`.

## Session expiration

If the session expires, `/api/chat` and `/api/chat/history` return `401`.
The client redirects to:

`/signin?callbackUrl=/chat`

## Persistence

When `persist=true` and `chatId` is provided, the API stores chat messages in:

- `chats` (keyed by `id=chatId`, scoped to `user_id`)
- `chat_messages` (unique by `(chat_id, message_id)`, ordered by `seq`)

Migrations:

- `prisma/migrations/20260218160319_chat_persistence/migration.sql`
- `prisma/migrations/20260220021349_chat_message_seq/migration.sql`

Apply locally:

```bash
npx prisma migrate dev
```

## Redaction

Before storing messages, content is redacted to avoid persisting secrets in plaintext.
Implementation: `src/lib/chat-redact.ts`.
