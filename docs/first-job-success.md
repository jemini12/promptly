# First Job Success UX

Goal: help new users create their first job comfortably and feel Promptloop is easy, simple, and helpful.

## Primary friction addressed

Previously, saving a job required setting up an external delivery channel (Discord/Telegram/Webhook). This delayed time-to-value.

## Updated first-job flow

1) New user opens Create Job.
2) Default delivery target is `In-app (Run History)`.
3) User saves the job without external setup.
4) After saving, the user is sent to Run History with a welcome card.
5) User clicks "Run once now" to confirm output appears in Run History.
6) User can connect an external channel later by editing the job.

## Success signals

- Reduced "time to first successful run" (user can see a successful `run_histories` entry).
- Fewer early drop-offs caused by Discord/Telegram/webhook setup.
