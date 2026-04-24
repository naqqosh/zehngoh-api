-- CreateEnum
CREATE TYPE "public"."EmployeeRole" AS ENUM ('MANAGER', 'SUPPORT', 'FINANCE_MANAGER', 'MARKETER', 'CONTENT_MANAGER', 'WAREHOUSE_WORKER');

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" SERIAL NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "full_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3),
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_assignments" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "role" "public"."EmployeeRole" NOT NULL,
    "assigned_by_user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "activated_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "employee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_seller_id_idx" ON "public"."employees"("seller_id");

-- CreateIndex
CREATE INDEX "employees_user_id_idx" ON "public"."employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_seller_id_user_id_key" ON "public"."employees"("seller_id", "user_id");

-- CreateIndex
CREATE INDEX "employee_assignments_shop_id_idx" ON "public"."employee_assignments"("shop_id");

-- CreateIndex
CREATE INDEX "employee_assignments_assigned_by_user_id_idx" ON "public"."employee_assignments"("assigned_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_assignments_employee_id_shop_id_key" ON "public"."employee_assignments"("employee_id", "shop_id");

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_assignments" ADD CONSTRAINT "employee_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_assignments" ADD CONSTRAINT "employee_assignments_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "public"."sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_assignments" ADD CONSTRAINT "employee_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
