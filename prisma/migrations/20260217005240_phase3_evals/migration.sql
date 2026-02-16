CREATE TABLE "public"."eval_suites" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_suites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."eval_cases" (
    "id" UUID NOT NULL,
    "suite_id" UUID NOT NULL,
    "variables" JSONB NOT NULL,
    "must_include" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."eval_runs" (
    "id" UUID NOT NULL,
    "suite_id" UUID NOT NULL,
    "prompt_version_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_eval_suites_job_id" ON "public"."eval_suites"("job_id");
CREATE INDEX "idx_eval_cases_suite_id" ON "public"."eval_cases"("suite_id");
CREATE INDEX "idx_eval_runs_suite_id" ON "public"."eval_runs"("suite_id");
CREATE INDEX "idx_eval_runs_prompt_version_id" ON "public"."eval_runs"("prompt_version_id");

ALTER TABLE "public"."eval_suites" ADD CONSTRAINT "eval_suites_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."eval_cases" ADD CONSTRAINT "eval_cases_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "public"."eval_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."eval_runs" ADD CONSTRAINT "eval_runs_suite_id_fkey" FOREIGN KEY ("suite_id") REFERENCES "public"."eval_suites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."eval_runs" ADD CONSTRAINT "eval_runs_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "public"."prompt_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
