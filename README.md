# Promptly MVP

Prompt scheduler that executes `gpt-5-mini` on daily/weekly/cron and sends output to Discord or Telegram.

## Stack

- Next.js App Router + TypeScript + Tailwind
- PostgreSQL + Prisma
- NextAuth social auth (Google/GitHub/Discord)
- OpenAI Responses API (`gpt-5-mini`, optional `web_search_preview` tool)
- Go worker for scheduled execution

## Environment Variables

Copy `.env.example` to `.env`.

Required values:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`
- OAuth keys:
  - `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
  - `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
  - `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`
- `CHANNEL_SECRET_KEY` (recommended; if omitted, `NEXTAUTH_SECRET` is used)
- Optional: `DAILY_RUN_LIMIT`

## Local Run

```bash
npm install
npm run prisma:generate
npm run dev
```

Apply DB schema:

```bash
npx prisma migrate deploy
```

## Docker Compose Run

1. Copy env file and fill real secrets:

```bash
cp .env.example .env
```

2. Start full stack:

```bash
docker compose up -d --build
```

3. Check logs:

```bash
docker compose logs -f web worker
```

4. Stop stack:

```bash
docker compose down
```

Notes:

- `docker-compose.yml` overrides `DATABASE_URL` inside containers to use `db` host.
- Web container runs `prisma migrate deploy` on start.
- App is available at `http://localhost:3000`.

## Worker

Worker source is in `worker/main.go`.

Run worker:

```bash
go run ./worker
```

Worker behavior:

- polls every 10 seconds
- acquires one due job via `FOR UPDATE SKIP LOCKED`
- executes LLM request with optional web search
- sends to Discord/Telegram with chunking
- writes `run_histories`
- resets fail count on success; disables job after 10 consecutive failures

## Main Routes

- `/` dashboard
- `/jobs/new` job editor
- `/jobs/[id]/edit` job editor (update/delete)
- `/jobs/[id]/history` run history
- `/signin` social sign-in page

## API

- `GET /api/jobs`
- `POST /api/jobs`
- `PUT /api/jobs/:id`
- `DELETE /api/jobs/:id`
- `POST /api/jobs/:id/preview`
- `POST /api/preview`
- `GET /api/jobs/:id/histories`
