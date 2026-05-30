CREATE TABLE IF NOT EXISTS "BulkSmsCampaign" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'BULK_BUY_BOX_SEND',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "templateKey" TEXT,
  "customMessage" TEXT,
  "customMessageUsed" BOOLEAN NOT NULL DEFAULT false,
  "includeAlreadySent" BOOLEAN NOT NULL DEFAULT false,
  "selected" INTEGER NOT NULL DEFAULT 0,
  "queued" INTEGER NOT NULL DEFAULT 0,
  "pending" INTEGER NOT NULL DEFAULT 0,
  "sent" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "cancelled" INTEGER NOT NULL DEFAULT 0,
  "skippedDetails" JSONB,
  "dripRate" TEXT NOT NULL DEFAULT '5 texts per minute',
  "delayMs" INTEGER NOT NULL DEFAULT 12000,
  "estimatedMinutes" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BulkSmsCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BulkSmsCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "buyerName" TEXT,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BulkSmsCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BulkSmsCampaign_batchId_key" ON "BulkSmsCampaign"("batchId");
CREATE INDEX IF NOT EXISTS "BulkSmsCampaign_organizationId_idx" ON "BulkSmsCampaign"("organizationId");
CREATE INDEX IF NOT EXISTS "BulkSmsCampaign_status_idx" ON "BulkSmsCampaign"("status");
CREATE INDEX IF NOT EXISTS "BulkSmsCampaign_createdAt_idx" ON "BulkSmsCampaign"("createdAt");

CREATE INDEX IF NOT EXISTS "BulkSmsCampaignRecipient_campaignId_idx" ON "BulkSmsCampaignRecipient"("campaignId");
CREATE INDEX IF NOT EXISTS "BulkSmsCampaignRecipient_buyerId_idx" ON "BulkSmsCampaignRecipient"("buyerId");
CREATE INDEX IF NOT EXISTS "BulkSmsCampaignRecipient_status_idx" ON "BulkSmsCampaignRecipient"("status");

ALTER TABLE "BulkSmsCampaignRecipient"
ADD CONSTRAINT "BulkSmsCampaignRecipient_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "BulkSmsCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
