-- Migration: add_deal_source_model
-- Run with: DATABASE_URL="..." npx prisma migrate dev --name add_deal_source_model

CREATE TABLE IF NOT EXISTS "DealSource" (
  "id"                      TEXT NOT NULL,
  "organizationId"          TEXT NOT NULL,
  "sourceName"              TEXT,
  "sourceType"              TEXT NOT NULL DEFAULT 'JV',
  "phone"                   TEXT,
  "email"                   TEXT,
  "company"                 TEXT,
  "facebookProfileUrl"      TEXT,
  "facebookGroupName"       TEXT,
  "reliabilityScore"        INTEGER NOT NULL DEFAULT 50,
  "reliabilityLabel"        TEXT NOT NULL DEFAULT 'NEW_SOURCE',
  "sourceNotes"             TEXT,
  "totalDealsSubmitted"     INTEGER NOT NULL DEFAULT 0,
  "activeDeals"             INTEGER NOT NULL DEFAULT 0,
  "deadDeals"               INTEGER NOT NULL DEFAULT 0,
  "dealsThatGotInterest"    INTEGER NOT NULL DEFAULT 0,
  "dealsThatGotOffers"      INTEGER NOT NULL DEFAULT 0,
  "dealsAssigned"           INTEGER NOT NULL DEFAULT 0,
  "dealsClosed"             INTEGER NOT NULL DEFAULT 0,
  "badInfoCount"            INTEGER NOT NULL DEFAULT 0,
  "missingInfoFrequency"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "hadContractConfirmed"    BOOLEAN NOT NULL DEFAULT false,
  "permissionToMarket"      BOOLEAN NOT NULL DEFAULT false,
  "averageResponseTimeMin"  INTEGER,
  "sendsPhotosQuickly"      BOOLEAN NOT NULL DEFAULT false,
  "providesAccessQuickly"   BOOLEAN NOT NULL DEFAULT false,
  "answersQuestionsClearly" BOOLEAN NOT NULL DEFAULT false,
  "goesGhostCount"          INTEGER NOT NULL DEFAULT 0,
  "closedRevenueGenerated"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isBlacklisted"           BOOLEAN NOT NULL DEFAULT false,
  "isVerified"              BOOLEAN NOT NULL DEFAULT false,
  "lastDealSubmittedAt"     TIMESTAMP(3),
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DealSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DealSource_organizationId_idx" ON "DealSource"("organizationId");
CREATE INDEX IF NOT EXISTS "DealSource_phone_idx" ON "DealSource"("phone");
CREATE INDEX IF NOT EXISTS "DealSource_facebookProfileUrl_idx" ON "DealSource"("facebookProfileUrl");
CREATE INDEX IF NOT EXISTS "DealSource_email_idx" ON "DealSource"("email");

ALTER TABLE "DealSource" ADD CONSTRAINT "DealSource_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add dealSourceId to Deal table
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "dealSourceId" TEXT;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_dealSourceId_fkey"
  FOREIGN KEY ("dealSourceId") REFERENCES "DealSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Deal_dealSourceId_idx" ON "Deal"("dealSourceId");
