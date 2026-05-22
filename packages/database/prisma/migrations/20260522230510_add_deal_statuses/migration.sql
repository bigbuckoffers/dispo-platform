-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DealStatus" ADD VALUE 'NEEDS_INFO';
ALTER TYPE "DealStatus" ADD VALUE 'READY_TO_MATCH';
ALTER TYPE "DealStatus" ADD VALUE 'MATCHED';
ALTER TYPE "DealStatus" ADD VALUE 'READY_TO_BLAST';
ALTER TYPE "DealStatus" ADD VALUE 'CAMPAIGN_ACTIVE';
ALTER TYPE "DealStatus" ADD VALUE 'OFFER_RECEIVED';
ALTER TYPE "DealStatus" ADD VALUE 'ASSIGNED';
