-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "cpf" TEXT;

-- CreateIndex
CREATE INDEX "Customer_organizationId_cpf_idx" ON "Customer"("organizationId", "cpf");
