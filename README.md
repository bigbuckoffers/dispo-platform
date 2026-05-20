# DispoAI — AI-Powered Wholesale Real Estate Dispositions Platform

The only platform that combines Buyer Intelligence + AI Matching + Dispo Automation for wholesale real estate operators.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MONOREPO STRUCTURE                   │
├─────────────────────┬───────────────────────────────────┤
│  apps/api           │  NestJS REST API                  │
│  apps/web           │  Next.js 14 Frontend              │
│  packages/database  │  Prisma schema + migrations       │
└─────────────────────┴───────────────────────────────────┘

Stack:
  Database:    PostgreSQL 16 + pgvector (1536-dim embeddings)
  Cache/Queue: Redis 7 + Bull queues
  API:         NestJS 10, Prisma, Passport-JWT
  Frontend:    Next.js 14, Clerk Auth, TanStack Query, Recharts
  AI:          OpenAI text-embedding-3-large + GPT-4o
  Messaging:   Twilio (SMS) + SendGrid (email)
  Payments:    Stripe subscriptions
  Auth:        Clerk (frontend) → JWT verification (backend)
```

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- Docker Desktop
- Clerk account (free)
- OpenAI API key

### 1. Clone and install
```bash
git clone <repo>
cd wholesale-dispo-platform
npm install
```

### 2. Set up environment variables
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Fill in your keys
```

### 3. Start infrastructure
```bash
npm run docker:up
# Starts: postgres (port 5432), redis (port 6379)
```

### 4. Run database migrations
```bash
npm run db:migrate
npm run db:generate
npm run db:seed         # Creates test org + 8 buyers + 5 deals
```

### 5. Start the apps
```bash
# Terminal 1
npm run dev:api         # http://localhost:3001
                        # Swagger: http://localhost:3001/api/docs

# Terminal 2
npm run dev:web         # http://localhost:3000
```

---

## Key Features

### 🧠 AI Buyer Matching
Every deal auto-triggers a matching job on intake. The algorithm scores all buyers using a **6-factor weighted model**:

| Factor | Weight | Source |
|--------|--------|--------|
| Vector similarity | 35% | pgvector cosine similarity on buyer/deal embeddings |
| Geographic match | 20% | State → county → ZIP hierarchy |
| Price range fit | 15% | Buy box min/max vs asking price |
| Reliability score | 15% | Close rate, retrade %, cancel %, ghost rate, speed |
| Activity score | 10% | 30-day opens, views, offers, saves |
| Historical similarity | 5% | Past purchases in similar price range |

### 📊 Buyer Scoring (0–100)

**Reliability** = closeRate×0.45 + (1-retrade%)×0.25 + (1-cancel%)×0.15 + speedFactor×0.10 + (1-ghostRate)×0.05

**Liquidity** = cash(30) + hardMoney(15) + avgPriceScore(30) + purchaseVelocity(25)

**Activity** = views×3 + offers×25 + opens×5 + saves×8 (capped at 100)

**Composite** = reliability×0.40 + liquidity×0.30 + activity×0.30

### 🎯 Three-Tier Buyer System
- **Tier 1 (VIP)**: composite ≥ 75 — gets first look, personalized outreach
- **Tier 2 (Active)**: composite 45–74 — next in line
- **Tier 3 (General)**: composite < 45 — marketplace feed

### 🤖 AI Writer (GPT-4o)
- Property analysis: flipScore, landlordScore, cashBuyerDemand, riskScore
- Personalized SMS drafts (160 chars, buyer-specific)
- Email subject + body (200 words max)
- 5-touch drip sequences per tier
- Real buy box learning from purchase history

### 📤 Auto Dispo
When you release a deal to a tier (`POST /deals/:id/release`):
1. Fetches matched buyers in that tier
2. Generates AI campaign content
3. Queues personalized SMS + email sends (staggered)
4. Tracks delivery → opens → replies → offers

---

## API Reference

Swagger UI: `http://localhost:3001/api/docs`

Key endpoints:

```
# Buyers
GET    /api/v1/buyers                 List with filtering + pagination
POST   /api/v1/buyers                 Create buyer
GET    /api/v1/buyers/:id             Full profile
GET    /api/v1/buyers/:id/scores      Reliability/liquidity/activity scores
POST   /api/v1/buyers/:id/recalculate-scores
GET    /api/v1/buyers/:id/real-buy-box
GET    /api/v1/buyers/:id/analytics

# Deals
GET    /api/v1/deals                  List deals
POST   /api/v1/deals                  Create deal (triggers AI + matching)
GET    /api/v1/deals/:id/matches      AI-ranked buyer list
POST   /api/v1/deals/:id/release      Release to tier → auto-campaign
POST   /api/v1/deals/:id/generate-campaign

# Analytics
GET    /api/v1/analytics/overview     30-day org overview
GET    /api/v1/analytics/deal-velocity
GET    /api/v1/analytics/assignment-fees

# Marketplace
GET    /api/v1/marketplace            Public deal feed
POST   /api/v1/marketplace/deals/:id/publish
POST   /api/v1/marketplace/deals/:id/save

# Billing
POST   /api/v1/billing/checkout       Create Stripe checkout
POST   /api/v1/billing/portal         Customer portal
POST   /api/v1/billing/webhooks/stripe
```

---

## Database Schema

Core tables: `organizations`, `users`, `team_members`, `buyers`, `buy_boxes`, `real_buy_boxes`, `buyer_embeddings`, `buyer_events`, `deals`, `deal_embeddings`, `match_results`, `match_jobs`, `offers`, `purchase_history`, `campaigns`, `messages`, `notifications`, `marketplace_listings`, `subscriptions`, `audit_logs`

pgvector indexes: `ivfflat` on `buyer_embeddings(vector)` and `deal_embeddings(vector)`

---

## Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Score recalculation | Daily 2am UTC | Recompute all buyer scores + auto-tier |
| Real buy box learning | Sunday 3am UTC | AI learns true buy patterns from history |
| Embedding refresh | Daily 4am UTC | Regenerate embeddings for updated buyers |
| Listing expiry | Daily 1am UTC | Expire 30-day marketplace listings |

---

## Plan Limits

| Plan | Buyers | Deals | Seats | Price |
|------|--------|-------|-------|-------|
| Starter | 500 | 50 | 1 | $97/mo |
| Growth | 5,000 | Unlimited | 5 | $297/mo |
| Enterprise | Unlimited | Unlimited | Unlimited | Custom |

---

## Deployment

### Production checklist
1. Set `NODE_ENV=production`
2. Use `CLERK_JWT_VERIFICATION_KEY` (RS256) not `JWT_SECRET`
3. Enable `rawBody: true` in NestJS for Stripe webhooks
4. Configure Stripe webhook → `/api/v1/billing/webhooks/stripe`
5. Configure Twilio webhook → `/api/v1/dispo/webhooks/twilio`
6. Configure Clerk webhook → `/api/v1/auth/webhooks/clerk`
7. Set `ALLOWED_ORIGINS` to your production domain
8. Run `npx prisma migrate deploy` (not `dev`) in production

### Recommended infrastructure
- **API**: Railway, Render, or AWS ECS (min 512MB RAM)
- **DB**: Supabase (has pgvector built in) or Railway PostgreSQL
- **Redis**: Upstash (serverless) or Redis Cloud
- **Web**: Vercel
- **Files**: AWS S3 or Cloudflare R2

---

## What's Next (Roadmap)

- [ ] Mobile app (React Native) for buyers
- [ ] Offer management workflow (counter, accept, e-sign)
- [ ] Title company integrations
- [ ] MLS/PropStream data feed for comps
- [ ] SMS reply inbox + AI response suggestions
- [ ] JV partner network
- [ ] Buyer reputation scores (cross-platform)
- [ ] Chrome extension for quick deal intake from any website
