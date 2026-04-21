-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('SALE', 'WITHDRAWAL', 'SERVICE_FEE', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FinanceTransactionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."finance_transactions" (
    "id" SERIAL NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'PROCESSING',
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "description" TEXT,
    "order_number" TEXT,
    "sku" TEXT,
    "product_name" TEXT,
    "quantity" INTEGER,
    "unit_price" BIGINT,
    "total_price" BIGINT,
    "net_amount" BIGINT,
    "commission_amount" BIGINT,
    "withdrawn_amount" BIGINT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."finance_transactions"
  ADD CONSTRAINT "finance_transactions_seller_id_fkey" FOREIGN KEY ("seller_id")
  REFERENCES "public"."sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "finance_transactions_seller_id_type_status_idx"
  ON "public"."finance_transactions"("seller_id", "type", "status");

-- CreateIndex
CREATE INDEX "finance_transactions_seller_id_occurred_at_idx"
  ON "public"."finance_transactions"("seller_id", "occurred_at");
