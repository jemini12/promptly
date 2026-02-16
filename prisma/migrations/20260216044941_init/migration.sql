/*
  Warnings:

  - Changed the type of `schedule_type` on the `jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `channel_type` on the `jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `run_histories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `provider` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."auth_provider" AS ENUM ('google', 'github', 'discord', 'telegram');

-- CreateEnum
CREATE TYPE "public"."schedule_type" AS ENUM ('daily', 'weekly', 'cron');

-- CreateEnum
CREATE TYPE "public"."channel_type" AS ENUM ('discord', 'telegram', 'webhook');

-- CreateEnum
CREATE TYPE "public"."run_status" AS ENUM ('success', 'fail');

-- AlterTable
ALTER TABLE "public"."jobs" DROP COLUMN "schedule_type",
ADD COLUMN     "schedule_type" "public"."schedule_type" NOT NULL,
DROP COLUMN "channel_type",
ADD COLUMN     "channel_type" "public"."channel_type" NOT NULL;

-- AlterTable
ALTER TABLE "public"."run_histories" DROP COLUMN "status",
ADD COLUMN     "status" "public"."run_status" NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "provider",
ADD COLUMN     "provider" "public"."auth_provider" NOT NULL;

-- DropEnum
DROP TYPE "public"."AuthProvider";

-- DropEnum
DROP TYPE "public"."ChannelType";

-- DropEnum
DROP TYPE "public"."RunStatus";

-- DropEnum
DROP TYPE "public"."ScheduleType";

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_provider_user_id_key" ON "public"."users"("provider", "provider_user_id");
