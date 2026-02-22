-- CreateEnum
CREATE TYPE "public"."user_plan" AS ENUM ('free', 'pro');

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "override_daily_run_limit" INTEGER,
ADD COLUMN     "override_enabled_jobs_limit" INTEGER,
ADD COLUMN     "override_total_jobs_limit" INTEGER,
ADD COLUMN     "plan" "public"."user_plan" NOT NULL DEFAULT 'free';
