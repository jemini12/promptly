-- AlterTable
ALTER TABLE "public"."chat_messages" ADD COLUMN     "message_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "seq" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_chat_messages_chat_id_seq" ON "public"."chat_messages"("chat_id", "seq");
