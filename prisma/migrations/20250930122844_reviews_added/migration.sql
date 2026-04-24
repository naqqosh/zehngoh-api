-- AlterTable
ALTER TABLE "public"."order_item_reviews" ADD COLUMN     "seller_read_at" TIMESTAMP(3),
ADD COLUMN     "seller_reply" TEXT,
ADD COLUMN     "seller_reply_author_id" INTEGER,
ADD COLUMN     "seller_reply_created_at" TIMESTAMP(3),
ADD COLUMN     "seller_reply_updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "order_item_reviews_seller_reply_author_id_idx" ON "public"."order_item_reviews"("seller_reply_author_id");

-- AddForeignKey
ALTER TABLE "public"."order_item_reviews" ADD CONSTRAINT "order_item_reviews_seller_reply_author_id_fkey" FOREIGN KEY ("seller_reply_author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
