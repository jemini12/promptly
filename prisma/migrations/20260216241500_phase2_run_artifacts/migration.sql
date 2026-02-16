ALTER TABLE "public"."run_histories" ADD COLUMN     "llm_model" TEXT;

ALTER TABLE "public"."run_histories" ADD COLUMN     "llm_usage" JSONB;

ALTER TABLE "public"."run_histories" ADD COLUMN     "llm_tool_calls" JSONB;

ALTER TABLE "public"."run_histories" ADD COLUMN     "used_web_search" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."run_histories" ADD COLUMN     "citations" JSONB;
