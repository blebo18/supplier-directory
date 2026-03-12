-- CreateTable
CREATE TABLE "SupplierLink" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierLink_supplierId_idx" ON "SupplierLink"("supplierId");

-- AddForeignKey
ALTER TABLE "SupplierLink" ADD CONSTRAINT "SupplierLink_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
