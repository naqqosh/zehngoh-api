-- CreateEnum
CREATE TYPE "ProductModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."products"
  ADD COLUMN     "moderation_status" "ProductModerationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN     "moderation_comment" TEXT,
  ADD COLUMN     "moderated_at" TIMESTAMP(3);

-- AlterColumn
ALTER TABLE "public"."products"
  ALTER COLUMN "status" SET DEFAULT 0;

-- Backfill existing rows
UPDATE "public"."products"
SET "moderation_status" = CASE
      WHEN "status" = 1 THEN 'APPROVED'::"ProductModerationStatus"
      ELSE 'PENDING'::"ProductModerationStatus"
    END,
    "moderated_at" = CASE WHEN "status" = 1 THEN NOW() ELSE NULL END;

-- CreateIndex
CREATE INDEX "products_moderation_status_idx" ON "public"."products"("moderation_status");
