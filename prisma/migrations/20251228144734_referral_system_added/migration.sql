/*
  Warnings:

  - A unique constraint covering the columns `[referral_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELED');

-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "referrer_bonus_applied" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "referrer_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "referral_bonus_balance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "referral_code" TEXT;

-- CreateTable
CREATE TABLE "public"."referrals" (
    "id" SERIAL NOT NULL,
    "referrerId" INTEGER NOT NULL,
    "referredId" INTEGER,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "firstOrderId" INTEGER,
    "bonusAmount" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "status" "public"."ReferralStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referralCode_key" ON "public"."referrals"("referralCode");

-- CreateIndex
CREATE INDEX "referrals_referralCode_idx" ON "public"."referrals"("referralCode");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "public"."referrals"("referrerId");

-- CreateIndex
CREATE INDEX "referrals_referredId_idx" ON "public"."referrals"("referredId");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "public"."referrals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "public"."users"("referral_code");

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."referrals" ADD CONSTRAINT "referrals_firstOrderId_fkey" FOREIGN KEY ("firstOrderId") REFERENCES "public"."orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
