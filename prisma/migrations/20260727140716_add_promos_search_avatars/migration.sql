-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicture" VARCHAR(500),
ADD COLUMN     "profilePictureId" VARCHAR(255);

-- CreateTable
CREATE TABLE "Promo" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "genre" "Genre",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchQuery" (
    "id" SERIAL NOT NULL,
    "term" VARCHAR(120) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSearchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Promo_code_key" ON "Promo"("code");

-- CreateIndex
CREATE INDEX "Promo_active_idx" ON "Promo"("active");

-- CreateIndex
CREATE UNIQUE INDEX "SearchQuery_term_key" ON "SearchQuery"("term");

-- CreateIndex
CREATE INDEX "SearchQuery_count_idx" ON "SearchQuery"("count");
