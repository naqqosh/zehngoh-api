-- DropForeignKey (if table already exists)
ALTER TABLE IF EXISTS "public"."finance_transactions"
  DROP CONSTRAINT IF EXISTS "finance_transactions_seller_id_fkey";

-- AlterTable (existing databases only)
ALTER TABLE IF EXISTS "public"."finance_transactions"
  ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey (reapply when table present)
ALTER TABLE IF EXISTS "public"."finance_transactions"
  ADD CONSTRAINT "finance_transactions_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
