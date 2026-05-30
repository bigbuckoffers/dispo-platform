ALTER TABLE "sms_messages"
  ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryErrorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "sms_messages_twilioSid_idx" ON "sms_messages"("twilioSid");

ALTER TABLE "BulkSmsCampaignRecipient"
  ADD COLUMN IF NOT EXISTS "twilioSid" TEXT,
  ADD COLUMN IF NOT EXISTS "smsMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "deliveryErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryErrorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BulkSmsCampaignRecipient_twilioSid_idx" ON "BulkSmsCampaignRecipient"("twilioSid");
