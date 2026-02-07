-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('google', 'github', 'discord', 'telegram');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('daily', 'weekly', 'cron');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('discord', 'telegram');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('success', 'fail');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "allow_web_search" BOOLEAN NOT NULL DEFAULT false,
    "schedule_type" "ScheduleType" NOT NULL,
    "schedule_time" TEXT NOT NULL,
    "schedule_day_of_week" INTEGER,
    "schedule_cron" TEXT,
    "channel_type" "ChannelType" NOT NULL,
    "channel_config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "next_run_at" TIMESTAMPTZ(6) NOT NULL,
    "locked_at" TIMESTAMPTZ(6),
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_histories" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RunStatus" NOT NULL,
    "output_preview" TEXT,
    "error_message" TEXT,
    "is_preview" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "run_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preview_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preview_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_user_id_key" ON "users"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "idx_jobs_next_run_at" ON "jobs"("next_run_at");

-- CreateIndex
CREATE INDEX "idx_jobs_enabled" ON "jobs"("enabled");

-- CreateIndex
CREATE INDEX "idx_run_histories_job_id" ON "run_histories"("job_id");

-- CreateIndex
CREATE INDEX "idx_preview_events_user_id_created_at" ON "preview_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_histories" ADD CONSTRAINT "run_histories_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preview_events" ADD CONSTRAINT "preview_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
