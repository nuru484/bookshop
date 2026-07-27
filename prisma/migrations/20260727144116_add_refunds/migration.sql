-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "refundAmount" DOUBLE PRECISION,
ADD COLUMN     "refundRef" VARCHAR(80),
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "statusBeforeCancel" "OrderStatus";
