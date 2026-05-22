# DispoAI — Deals Upgrade Installation Guide

## What's in this package

```
migration/
  add_deal_fields.sql          — Raw SQL to add all new columns to Deal table
  schema_additions.prisma      — Fields to paste into your Prisma Deal model

api/
  deals-scoring.service.ts     — Deal priority scoring, completeness, buyer coverage
  deals-ai-parser.service.ts   — AI parser using GPT-4o for raw deal text
  deals-controller-additions.ts — New route handlers to add to deals.controller.ts

frontend/
  deals/page.tsx               — New Deals list page (replace existing)
  deals/[id]/page.tsx          — New Deal detail page (replace existing)
  components/AddDealModal.tsx  — Add Deal modal with 3 intake modes
```

---

## Step 1 — Update Prisma Schema

Open `/workspaces/dispo-platform/packages/database/prisma/schema.prisma`

Find the `model Deal {` block and paste ALL fields from `migration/schema_additions.prisma` 
INSIDE the model, before the closing `}`.

---

## Step 2 — Run Database Migration

```bash
cd /workspaces/dispo-platform

# Local dev (Codespace)
DATABASE_URL="postgresql://dispo_user:dispo_pass@localhost:5432/dispo_platform" \
  npx prisma migrate dev --name "expand_deal_fields" \
  --schema=packages/database/prisma/schema.prisma

# Railway production
DATABASE_URL="postgresql://postgres:fnQlbZXsbAxbsZpIxGlKfPUvnbRPLpxX@kodama.proxy.rlwy.net:45003/railway" \
  npx prisma migrate deploy \
  --schema=packages/database/prisma/schema.prisma
```

---

## Step 3 — Copy API files

```bash
# Copy new services
cp deals-scoring.service.ts \
  /workspaces/dispo-platform/apps/api/src/modules/deals/

cp deals-ai-parser.service.ts \
  /workspaces/dispo-platform/apps/api/src/modules/deals/
```

---

## Step 4 — Update deals.module.ts

Open `/workspaces/dispo-platform/apps/api/src/modules/deals/deals.module.ts`

Add the two new services to providers:
```typescript
import { DealsScoringService } from './deals-scoring.service';
import { DealsAiParserService } from './deals-ai-parser.service';

@Module({
  providers: [DealsService, DealsScoringService, DealsAiParserService],
  // ...
})
```

---

## Step 5 — Update deals.controller.ts

Open `/workspaces/dispo-platform/apps/api/src/modules/deals/deals.controller.ts`

1. Add imports at top:
```typescript
import { DealsScoringService } from './deals-scoring.service';
import { DealsAiParserService } from './deals-ai-parser.service';
```

2. Add to constructor:
```typescript
constructor(
  private readonly dealsService: DealsService,
  private readonly prisma: PrismaService,
  private readonly scoringService: DealsScoringService,
  private readonly aiParser: DealsAiParserService,
) {}
```

3. Paste ALL route handlers from `deals-controller-additions.ts` into the controller class.

---

## Step 6 — Copy Frontend Files

```bash
# Replace deals list page
cp frontend/deals/page.tsx \
  /workspaces/dispo-platform/apps/web/src/app/\(dashboard\)/dashboard/deals/page.tsx

# Replace deal detail page
cp "frontend/deals/[id]/page.tsx" \
  "/workspaces/dispo-platform/apps/web/src/app/(dashboard)/dashboard/deals/[id]/page.tsx"

# Add AddDealModal component
mkdir -p /workspaces/dispo-platform/apps/web/src/components/deal
cp frontend/components/AddDealModal.tsx \
  /workspaces/dispo-platform/apps/web/src/components/deal/AddDealModal.tsx
```

---

## Step 7 — Check for formatCurrency utility

Make sure `/workspaces/dispo-platform/apps/web/src/lib/format.ts` exports `formatCurrency`:

```typescript
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(val);
}
```

If this file doesn't exist, create it.

---

## Step 8 — Build and deploy

```bash
# Check for TypeScript errors
cd /workspaces/dispo-platform/apps/web && npx tsc --noEmit 2>&1 | grep "error TS"
cd /workspaces/dispo-platform/apps/api && npx tsc --noEmit 2>&1 | grep "error TS"

# Commit and push (triggers Railway + Vercel auto-deploy)
cd /workspaces/dispo-platform && \
  git add -A && \
  git commit -m "Add full deals upgrade: scoring, AI parser, market intelligence, 4-tab detail page" && \
  git push origin main
```

---

## What you'll have after this is installed

### Deals List Page
- Deal Priority Score badge on every deal (Hot / Strong / Workable / Needs Info / Weak)
- Summary cards: Active, Ready to Match, Ready to Blast, Highest Spread, Most Buyers, Needs Info
- Markets We Need Buyers In widget with buyer gap detection
- Sort by: Priority Score, Spread, Buyer Count, Closing Date, Newest
- Filter by: Status, Source, and more

### Add Deal Modal (3 modes)
- Paste / Facebook Post → AI parses with GPT-4o, extracts all fields
- Manual 7-step wizard: Source → Property → Deal Math → Condition → Timeline → Links → Review
- SMS Preview (Twilio ready placeholder)

### Deal Detail Page (4 tabs)
- Property Intelligence: full property details, condition, public estimates, links
- Deal Math: spread, 70% rule, rental analysis, AI summary
- Buyer Match: coverage status, match counts, run match button
- Dispo Execution: missing info checklist, source/JV card, timeline, campaign actions, activity log

### New API Endpoints
- GET /deals/market-intelligence
- POST /deals/import/raw  
- POST /deals/:id/parse
- POST /deals/:id/calculate-metrics
- POST /deals/:id/generate-follow-up
- POST /deals/:id/match-buyers
