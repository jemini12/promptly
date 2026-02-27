# In-app Delivery

Promptloop supports an in-app delivery mode where scheduled runs are stored in Promptloop and visible in the job's Run History page.

## Why

This is primarily for "first job success": users can create and validate their first job without configuring an external channel (Discord/Telegram/Webhook).

## How it works

- Jobs can select the `in_app` channel type.
- Scheduled executions still run normally and create `run_histories` records.
- Delivery is treated as a no-op (no external network request). The run is marked delivered (`delivered_at` set) with `delivery_attempts = 0`.

## UX expectations

- In the Job Editor, selecting `In-app (Run History)` requires no additional fields.
- The job Run History page should provide a clear "Run once now" action so users can confirm output immediately.

## Notes

- Preview remains a separate concept: it runs immediately from the editor and can optionally test-send to external channels.
- In-app delivery runs are intended to be read inside Promptloop.
