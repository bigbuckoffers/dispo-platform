# DispoAI Roadmap

## V1 — Close Deals (Current Focus)
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Buyer CRM with buy boxes | ✅ Done | 354 buyers imported |
| 2 | Two-way SMS messaging | ✅ Done | Twilio +1 321-878-8402 |
| 3 | Intake form + submissions review | ✅ Done | Public form at /intake/[token] |
| 4 | Fix buy box approval saving | 🔧 In Progress | Schema fields added, testing |
| 5 | Bulk SMS intake link send | ⬜ Todo | 354 buyers, 5/min drip |
| 6 | Deal import (paste FB post → AI) | ⬜ Todo | GPT-4o parses deal details |
| 7 | Deal-to-buyer matching | ⬜ Todo | Match by market/price/strategy |
| 8 | Link tracking (intake + deal links) | ⬜ Todo | BuyerEvent model ready |
| 9 | Send deal to matched buyers via SMS | ⬜ Todo | Bulk send with tracking |

## V2 — Scale
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Notifications page | ⬜ Todo | Bell icon wired, page missing |
| 2 | Messages UI upgrade | ⬜ Todo | Buyer readiness card, inbox cards |
| 3 | Dashboard real data | ⬜ Todo | Replace placeholder zeros |
| 4 | ARV engine improvements | ⬜ Todo | 2-step Claude analysis |
| 5 | Stripe billing | ⬜ Todo | Not started |
| 6 | Clerk JWT auth | ⬜ Todo | Currently disabled |
| 7 | Team members / multi-user | ⬜ Todo | Schema ready |

## V3 — Platform
| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Public marketplace | ⬜ Todo | |
| 2 | Public deal pages | ⬜ Todo | Tracked links per buyer |
| 3 | Buyer self-service portal | ⬜ Todo | |
| 4 | Full analytics dashboard | ⬜ Todo | |
| 5 | Mobile app | ⬜ Todo | |

## Key Credentials
- Railway DB: postgresql://postgres:fnQlbZXsbAxbsZpIxGlKfPUvnbRPLpxX@kodama.proxy.rlwy.net:45003/railway
- Vercel deploy hook: https://api.vercel.com/v1/integrations/deploy/prj_d9y4N5c7qKpMaSvQihQZoNzzH7WF/AQseOhzb3t
- Twilio: +1 321-878-8402
- Frontend: https://dispo-platform-web.vercel.app
- API: https://dispo-platform-production.up.railway.app/api/v1
