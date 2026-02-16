-- AlterEnum
ALTER TYPE "public"."run_status" ADD VALUE 'running';

-- AlterTable
ALTER TABLE "public"."run_histories" ADD COLUMN     "delivered_at" TIMESTAMPTZ(6),
ADD COLUMN     "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_last_error" TEXT,
ADD COLUMN     "output_text" TEXT,
ADD COLUMN     "runner_id" TEXT,
ADD COLUMN     "scheduled_for" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "public"."delivery_attempts" (
    "id" UUID NOT NULL,
    "run_history_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "status_code" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_delivery_attempts_run_history_id" ON "public"."delivery_attempts"("run_history_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_delivery_attempts_run_history_attempt" ON "public"."delivery_attempts"("run_history_id", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_run_histories_job_scheduled_for_preview" ON "public"."run_histories"("job_id", "scheduled_for", "is_preview");

-- AddForeignKey
ALTER TABLE "public"."delivery_attempts" ADD CONSTRAINT "delivery_attempts_run_history_id_fkey" FOREIGN KEY ("run_history_id") REFERENCES "public"."run_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
