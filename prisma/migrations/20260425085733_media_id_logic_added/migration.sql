-- AlterTable
ALTER TABLE "public"."files" ADD COLUMN     "file_media_id" TEXT;

-- AlterTable
ALTER TABLE "public"."order_item_review_images" ADD COLUMN     "image_media_id" TEXT;

-- AlterTable
ALTER TABLE "public"."product_images" ADD COLUMN     "blur_media_id" TEXT,
ADD COLUMN     "image_media_id" TEXT;

-- AlterTable
ALTER TABLE "public"."sellers" ADD COLUMN     "avatar_blur_media_id" TEXT,
ADD COLUMN     "avatar_media_id" TEXT,
ADD COLUMN     "cover_blur_media_id" TEXT,
ADD COLUMN     "cover_media_id" TEXT;
