ALTER TABLE "public"."jobs" ADD COLUMN "post_prompt_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."prompt_versions" ADD COLUMN "post_prompt_enabled" BOOLEAN NOT NULL DEFAULT false;
