-- Buy Box Intake Tracking foundation.
-- Adds buyer-level intake status/timestamps and a dedicated append-only intake event log.

DO $$
BEGIN
  CREATE TYPE "BuyerIntakeEventType" AS ENUM (
    'INTAKE_LINK_CREATED',
    'INTAKE_LINK_SENT',
    'INTAKE_LINK_OPENED',
    'INTAKE_FORM_STARTED',
    'INTAKE_FORM_SUBMITTED',
    'INTAKE_REMINDER_SENT',
    'INTAKE_LINK_EXPIRED',
    'INTAKE_MANUAL_REVIEW_NEEDED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "BuyerIntakeStatus" AS ENUM (
    'NOT_SENT',
    'LINK_CREATED',
    'LINK_SENT',
    'OPENED',
    'STARTED',
    'SUBMITTED',
    'COMPLETED',
    'EXPIRED',
    'MANUAL_REVIEW_NEEDED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Keep the legacy buyer_events intake tracking endpoint deployable on databases
-- created from older migrations where these enum values were not present yet.
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_OPENED';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_STEP_2';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_STEP_3';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_STEP_4';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_STEP_5';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_STEP_6';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_COMPLETED';
ALTER TYPE "BuyerEventType" ADD VALUE IF NOT EXISTS 'INTAKE_ABANDONED';

ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeStatus" "BuyerIntakeStatus" NOT NULL DEFAULT 'NOT_SENT';
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeToken" TEXT;
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeLink" TEXT;
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeSentAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeOpenedAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeStartedAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeSubmittedAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeLastReminderAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeCompletedAt" TIMESTAMP(3);
ALTER TABLE "buyers" ADD COLUMN IF NOT EXISTS "intakeExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "buyers_intakeToken_key" ON "buyers"("intakeToken");
CREATE INDEX IF NOT EXISTS "buyers_intakeStatus_idx" ON "buyers"("intakeStatus");

CREATE TABLE IF NOT EXISTS "buyer_intake_events" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "buyerId" UUID NOT NULL,
  "intakeToken" TEXT,
  "eventType" "BuyerIntakeEventType" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID,
  "source" TEXT,
  CONSTRAINT "buyer_intake_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "buyer_intake_events_buyerId_createdAt_idx" ON "buyer_intake_events"("buyerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "buyer_intake_events_buyerId_eventType_idx" ON "buyer_intake_events"("buyerId", "eventType");
CREATE INDEX IF NOT EXISTS "buyer_intake_events_intakeToken_idx" ON "buyer_intake_events"("intakeToken");

DO $$
BEGIN
  ALTER TABLE "buyer_intake_events"
    ADD CONSTRAINT "buyer_intake_events_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
