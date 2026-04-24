-- CreateTable
CREATE TABLE "public"."order_item_reviews" (
    "id" SERIAL NOT NULL,
    "order_item_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "overall_rating" INTEGER,
    "quality_rating" INTEGER NOT NULL,
    "service_rating" INTEGER NOT NULL,
    "delivery_rating" INTEGER NOT NULL,
    "advantages" TEXT,
    "disadvantages" TEXT,
    "comment" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_item_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_item_review_images" (
    "id" SERIAL NOT NULL,
    "review_id" INTEGER NOT NULL,
    "file_id" INTEGER,
    "image_url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_review_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_item_reviews_order_item_id_key" ON "public"."order_item_reviews"("order_item_id");

-- CreateIndex
CREATE INDEX "order_item_reviews_product_id_idx" ON "public"."order_item_reviews"("product_id");

-- CreateIndex
CREATE INDEX "order_item_reviews_user_id_idx" ON "public"."order_item_reviews"("user_id");

-- CreateIndex
CREATE INDEX "order_item_reviews_order_id_idx" ON "public"."order_item_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_item_reviews_created_at_idx" ON "public"."order_item_reviews"("created_at");

-- CreateIndex
CREATE INDEX "order_item_review_images_review_id_idx" ON "public"."order_item_review_images"("review_id");

-- CreateIndex
CREATE INDEX "order_item_review_images_file_id_idx" ON "public"."order_item_review_images"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_review_images_review_id_position_key" ON "public"."order_item_review_images"("review_id", "position");

-- AddForeignKey
ALTER TABLE "public"."order_item_reviews" ADD CONSTRAINT "order_item_reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item_reviews" ADD CONSTRAINT "order_item_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item_reviews" ADD CONSTRAINT "order_item_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item_reviews" ADD CONSTRAINT "order_item_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item_review_images" ADD CONSTRAINT "order_item_review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."order_item_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."order_item_review_images" ADD CONSTRAINT "order_item_review_images_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
