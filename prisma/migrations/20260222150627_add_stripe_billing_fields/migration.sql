-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "stripe_cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_current_period_end" TIMESTAMPTZ(6),
ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_price_id" TEXT,
ADD COLUMN     "stripe_status" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT;
