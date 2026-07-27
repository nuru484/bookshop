/*
  Warnings:

  - A unique constraint covering the columns `[paystackRef]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('Published', 'Draft', 'Archived');

-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "status" "BookStatus" NOT NULL DEFAULT 'Published';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paystackRef" VARCHAR(64);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WishlistItem_userId_idx" ON "WishlistItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_bookId_key" ON "WishlistItem"("userId", "bookId");

-- CreateIndex
CREATE INDEX "Book_status_idx" ON "Book"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paystackRef_key" ON "Order"("paystackRef");

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
