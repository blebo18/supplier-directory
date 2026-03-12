-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('GRID', 'SIDEBAR', 'LEADERBOARD');

-- CreateTable
CREATE TABLE "Ad" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImpression" (
    "id" SERIAL NOT NULL,
    "adId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdClick" (
    "id" SERIAL NOT NULL,
    "adId" INTEGER NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ad_placement_active_startDate_endDate_idx" ON "Ad"("placement", "active", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AdImpression_adId_idx" ON "AdImpression"("adId");

-- CreateIndex
CREATE INDEX "AdImpression_viewedAt_idx" ON "AdImpression"("viewedAt");

-- CreateIndex
CREATE INDEX "AdClick_adId_idx" ON "AdClick"("adId");

-- CreateIndex
CREATE INDEX "AdClick_clickedAt_idx" ON "AdClick"("clickedAt");

-- AddForeignKey
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
