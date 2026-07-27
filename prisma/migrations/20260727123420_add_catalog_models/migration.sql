-- CreateEnum
CREATE TYPE "Genre" AS ENUM ('Romance', 'Gothic', 'Literary', 'Adventure', 'Epic');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" VARCHAR(255),
ADD COLUMN     "city" VARCHAR(100);

-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "author" VARCHAR(150) NOT NULL,
    "year" INTEGER NOT NULL,
    "genre" "Genre" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pages" INTEGER NOT NULL DEFAULT 0,
    "isbn" VARCHAR(20) NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "staffPick" BOOLEAN NOT NULL DEFAULT false,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "blurb" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'Pending',
    "total" DOUBLE PRECISION NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_slug_key" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_slug_idx" ON "Book"("slug");

-- CreateIndex
CREATE INDEX "Book_genre_idx" ON "Book"("genre");

-- CreateIndex
CREATE INDEX "Book_author_idx" ON "Book"("author");

-- CreateIndex
CREATE INDEX "Book_title_idx" ON "Book"("title");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_bookId_idx" ON "OrderItem"("bookId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
