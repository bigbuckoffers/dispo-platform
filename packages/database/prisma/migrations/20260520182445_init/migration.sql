-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'ADMIN', 'DISPO_REP', 'ACQUISITIONS_REP', 'VIEWER', 'BUYER');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('CASH_BUYER', 'FIX_AND_FLIP', 'LANDLORD', 'HEDGE_FUND', 'WHOLESALER', 'DEVELOPER', 'JV_PARTNER');

-- CreateEnum
CREATE TYPE "BuyerTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('SINGLE_FAMILY', 'MULTI_FAMILY', 'DUPLEX', 'TRIPLEX', 'FOURPLEX', 'CONDO', 'TOWNHOUSE', 'MOBILE_HOME', 'LAND', 'COMMERCIAL', 'MIXED_USE');

-- CreateEnum
CREATE TYPE "OccupancyPref" AS ENUM ('VACANT', 'OCCUPIED_TENANT', 'OCCUPIED_OWNER', 'ANY');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED_TENANT', 'OCCUPIED_OWNER');

-- CreateEnum
CREATE TYPE "InvestmentStrategy" AS ENUM ('FLIP', 'BUY_AND_HOLD', 'BRRRR', 'WHOLESALE', 'NEW_CONSTRUCTION', 'AIRBNB');

-- CreateEnum
CREATE TYPE "ExitStrategy" AS ENUM ('RETAIL_SALE', 'WHOLESALE', 'RENT', 'AIRBNB', 'LEASE_OPTION');

-- CreateEnum
CREATE TYPE "RehabTolerance" AS ENUM ('COSMETIC_ONLY', 'LIGHT', 'MEDIUM', 'HEAVY', 'FULL_GUT');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('CLEAR', 'CLOUDY', 'PROBATE', 'TAX_LIEN', 'FORECLOSURE');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_CONTRACT', 'CLOSED', 'DEAD', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COUNTERED', 'WITHDRAWN', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH', 'BOTH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "MessageEventType" AS ENUM ('SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "BuyerEventType" AS ENUM ('PROFILE_CREATED', 'DEAL_VIEWED', 'DEAL_SAVED', 'DEAL_SHARED', 'OFFER_SUBMITTED', 'OFFER_WITHDRAWN', 'OFFER_ACCEPTED', 'WALKTHROUGH_ATTENDED', 'SMS_OPENED', 'SMS_REPLIED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'DEAL_PURCHASED', 'OFFER_RETRADED', 'CAMPAIGN_UNSUBSCRIBED', 'LOGIN');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PHOTO', 'VIDEO', 'DRONE', 'INSPECTION', 'TITLE', 'PURCHASE_CONTRACT', 'POF', 'COMPS', 'OTHER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "ListingVisibility" AS ENUM ('PRIVATE', 'JV_ONLY', 'PUBLIC');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEAL_MATCHED', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'DEAL_RELEASED', 'CAMPAIGN_SENT', 'BUYER_SCORE_CHANGED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'STARTER',
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'VIEWER',
    "invitedBy" UUID,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "externalId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "llcNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialProfiles" JSONB NOT NULL DEFAULT '{}',
    "proofOfFundsUrl" TEXT,
    "proofOfFundsExpiry" TIMESTAMP(3),
    "preferredTitleCo" TEXT,
    "preferredLender" TEXT,
    "assignedRepId" UUID,
    "investorType" "InvestorType" NOT NULL DEFAULT 'CASH_BUYER',
    "hasCash" BOOLEAN NOT NULL DEFAULT false,
    "hasHardMoney" BOOLEAN NOT NULL DEFAULT false,
    "reliabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "liquidityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "compositeScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "tier" "BuyerTier" NOT NULL DEFAULT 'TIER_3',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "suspendedReason" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buy_boxes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "states" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "counties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "zipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "radiusMiles" DOUBLE PRECISION,
    "geoPolygon" JSONB,
    "propertyTypes" "PropertyType"[],
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "minArv" DOUBLE PRECISION,
    "maxArv" DOUBLE PRECISION,
    "minRehab" DOUBLE PRECISION,
    "maxRehab" DOUBLE PRECISION,
    "minBeds" INTEGER,
    "maxBeds" INTEGER,
    "minBaths" DOUBLE PRECISION,
    "maxBaths" DOUBLE PRECISION,
    "minSqft" INTEGER,
    "maxSqft" INTEGER,
    "minYearBuilt" INTEGER,
    "maxYearBuilt" INTEGER,
    "occupancyPref" "OccupancyPref"[] DEFAULT ARRAY[]::"OccupancyPref"[],
    "investmentStrategy" "InvestmentStrategy"[],
    "preferredExits" "ExitStrategy"[],
    "rehabTolerance" "RehabTolerance" NOT NULL DEFAULT 'MEDIUM',
    "maxAssignmentFee" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buy_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_buy_boxes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "learnedZipCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learnedPriceMin" DOUBLE PRECISION,
    "learnedPriceMax" DOUBLE PRECISION,
    "learnedPropertyTypes" "PropertyType"[],
    "learnedRehabDepth" "RehabTolerance",
    "learnedFeatures" JSONB NOT NULL DEFAULT '{}',
    "learnedNeighborhood" JSONB NOT NULL DEFAULT '{}',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataPointCount" INTEGER NOT NULL DEFAULT 0,
    "divergenceFromStated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_buy_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_embeddings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "vector" vector(1536),
    "modelVersion" TEXT NOT NULL DEFAULT 'text-embedding-3-large',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "eventType" "BuyerEventType" NOT NULL,
    "dealId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buyer_score_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "liquidityScore" DOUBLE PRECISION NOT NULL,
    "activityScore" DOUBLE PRECISION NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buyer_score_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "county" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "askingPrice" DOUBLE PRECISION NOT NULL,
    "arv" DOUBLE PRECISION,
    "assignmentFee" DOUBLE PRECISION,
    "repairEstimate" DOUBLE PRECISION,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'SINGLE_FAMILY',
    "beds" INTEGER,
    "baths" DOUBLE PRECISION,
    "sqft" INTEGER,
    "yearBuilt" INTEGER,
    "lotSize" DOUBLE PRECISION,
    "occupancy" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
    "titleStatus" "TitleStatus" NOT NULL DEFAULT 'CLEAR',
    "status" "DealStatus" NOT NULL DEFAULT 'DRAFT',
    "closingDeadline" TIMESTAMP(3),
    "accessInstructions" TEXT,
    "hasLiens" BOOLEAN NOT NULL DEFAULT false,
    "lienAmount" DOUBLE PRECISION,
    "taxesOwed" DOUBLE PRECISION,
    "sellerNotes" TEXT,
    "acquisitionRepId" UUID,
    "flipScore" DOUBLE PRECISION,
    "landlordScore" DOUBLE PRECISION,
    "cashBuyerDemand" DOUBLE PRECISION,
    "liquidityScore" DOUBLE PRECISION,
    "riskScore" DOUBLE PRECISION,
    "aiAnalysis" JSONB,
    "tier1ReleasedAt" TIMESTAMP(3),
    "tier2ReleasedAt" TIMESTAMP(3),
    "tier3ReleasedAt" TIMESTAMP(3),
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_embeddings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "vector" vector(1536),
    "modelVersion" TEXT NOT NULL DEFAULT 'text-embedding-3-large',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_views" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comps" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "salePrice" DOUBLE PRECISION NOT NULL,
    "sqft" INTEGER,
    "soldDate" TIMESTAMP(3) NOT NULL,
    "distanceMi" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "comps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "vectorScore" DOUBLE PRECISION NOT NULL,
    "geoScore" DOUBLE PRECISION NOT NULL,
    "priceScore" DOUBLE PRECISION NOT NULL,
    "reliabilityScore" DOUBLE PRECISION NOT NULL,
    "activityScore" DOUBLE PRECISION NOT NULL,
    "historicalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "confidencePct" DOUBLE PRECISION NOT NULL,
    "estimatedOfferMin" DOUBLE PRECISION,
    "estimatedOfferMax" DOUBLE PRECISION,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_jobs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "totalBuyers" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "emdAmount" DOUBLE PRECISION,
    "closingDate" TIMESTAMP(3),
    "contingencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "declinedReason" TEXT,
    "counterAmount" DOUBLE PRECISION,
    "isRetrade" BOOLEAN NOT NULL DEFAULT false,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelledReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "dealId" UUID,
    "address" TEXT NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "assignmentFeePaid" DOUBLE PRECISION,
    "closedAt" TIMESTAMP(3) NOT NULL,
    "rehabCost" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "roi" DOUBLE PRECISION,

    CONSTRAINT "purchase_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "targetTier" "BuyerTier" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "replied" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_recipients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaignId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "personalizedBody" TEXT,

    CONSTRAINT "campaign_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campaignId" UUID NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "toAddress" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "externalId" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMsg" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "messageId" UUID NOT NULL,
    "eventType" "MessageEventType" NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drip_sequences" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drip_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "dealId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "visibility" "ListingVisibility" NOT NULL DEFAULT 'PUBLIC',
    "featuredUntil" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_deals" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "buyerId" UUID NOT NULL,
    "dealId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeCustomerId_key" ON "organizations"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripeSubId_key" ON "organizations"("stripeSubId");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "team_members_organizationId_idx" ON "team_members"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_organizationId_userId_key" ON "team_members"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "buyers_organizationId_idx" ON "buyers"("organizationId");

-- CreateIndex
CREATE INDEX "buyers_compositeScore_idx" ON "buyers"("compositeScore" DESC);

-- CreateIndex
CREATE INDEX "buyers_tier_idx" ON "buyers"("tier");

-- CreateIndex
CREATE INDEX "buyers_isActive_isSuspended_idx" ON "buyers"("isActive", "isSuspended");

-- CreateIndex
CREATE UNIQUE INDEX "buyers_organizationId_email_key" ON "buyers"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "buy_boxes_buyerId_key" ON "buy_boxes"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "real_buy_boxes_buyerId_key" ON "real_buy_boxes"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "buyer_embeddings_buyerId_key" ON "buyer_embeddings"("buyerId");

-- CreateIndex
CREATE INDEX "buyer_events_buyerId_createdAt_idx" ON "buyer_events"("buyerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "buyer_events_buyerId_eventType_idx" ON "buyer_events"("buyerId", "eventType");

-- CreateIndex
CREATE INDEX "buyer_score_history_buyerId_computedAt_idx" ON "buyer_score_history"("buyerId", "computedAt" DESC);

-- CreateIndex
CREATE INDEX "deals_organizationId_status_idx" ON "deals"("organizationId", "status");

-- CreateIndex
CREATE INDEX "deals_organizationId_createdAt_idx" ON "deals"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "deals_zipCode_idx" ON "deals"("zipCode");

-- CreateIndex
CREATE INDEX "deals_state_city_idx" ON "deals"("state", "city");

-- CreateIndex
CREATE UNIQUE INDEX "deal_embeddings_dealId_key" ON "deal_embeddings"("dealId");

-- CreateIndex
CREATE INDEX "deal_views_dealId_idx" ON "deal_views"("dealId");

-- CreateIndex
CREATE INDEX "deal_views_buyerId_createdAt_idx" ON "deal_views"("buyerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "comps_dealId_idx" ON "comps"("dealId");

-- CreateIndex
CREATE INDEX "documents_dealId_idx" ON "documents"("dealId");

-- CreateIndex
CREATE INDEX "match_results_dealId_rank_idx" ON "match_results"("dealId", "rank");

-- CreateIndex
CREATE INDEX "match_results_buyerId_finalScore_idx" ON "match_results"("buyerId", "finalScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "match_results_dealId_buyerId_key" ON "match_results"("dealId", "buyerId");

-- CreateIndex
CREATE INDEX "match_jobs_dealId_idx" ON "match_jobs"("dealId");

-- CreateIndex
CREATE INDEX "match_jobs_status_idx" ON "match_jobs"("status");

-- CreateIndex
CREATE INDEX "offers_dealId_status_idx" ON "offers"("dealId", "status");

-- CreateIndex
CREATE INDEX "offers_buyerId_submittedAt_idx" ON "offers"("buyerId", "submittedAt" DESC);

-- CreateIndex
CREATE INDEX "purchase_history_buyerId_idx" ON "purchase_history"("buyerId");

-- CreateIndex
CREATE INDEX "campaigns_organizationId_createdAt_idx" ON "campaigns"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "campaigns_dealId_idx" ON "campaigns"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_recipients_campaignId_buyerId_key" ON "campaign_recipients"("campaignId", "buyerId");

-- CreateIndex
CREATE INDEX "messages_campaignId_idx" ON "messages"("campaignId");

-- CreateIndex
CREATE INDEX "messages_externalId_idx" ON "messages"("externalId");

-- CreateIndex
CREATE INDEX "message_events_messageId_idx" ON "message_events"("messageId");

-- CreateIndex
CREATE INDEX "drip_sequences_organizationId_idx" ON "drip_sequences"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_dealId_key" ON "marketplace_listings"("dealId");

-- CreateIndex
CREATE INDEX "marketplace_listings_visibility_publishedAt_idx" ON "marketplace_listings"("visibility", "publishedAt");

-- CreateIndex
CREATE INDEX "marketplace_listings_organizationId_idx" ON "marketplace_listings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_deals_buyerId_dealId_key" ON "saved_deals"("buyerId", "dealId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_idx" ON "audit_logs"("resource", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buy_boxes" ADD CONSTRAINT "buy_boxes_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_buy_boxes" ADD CONSTRAINT "real_buy_boxes_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_embeddings" ADD CONSTRAINT "buyer_embeddings_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_events" ADD CONSTRAINT "buyer_events_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buyer_score_history" ADD CONSTRAINT "buyer_score_history_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_embeddings" ADD CONSTRAINT "deal_embeddings_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_views" ADD CONSTRAINT "deal_views_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_views" ADD CONSTRAINT "deal_views_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comps" ADD CONSTRAINT "comps_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
