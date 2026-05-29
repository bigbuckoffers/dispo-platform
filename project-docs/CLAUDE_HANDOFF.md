# Claude Handoff

## Current Phase

Phase 3 is complete for showing compact Buy Box intake tracking on the buyer profile page.

## What Is In Place

- Phase 1 added the dedicated `BuyerIntakeEvent` Prisma model, intake event/status enums, buyer-level intake status/timestamps, and backend tracking endpoints.
- Phase 2 wired the existing public Next.js intake form at `apps/web/src/app/intake/[token]/page.tsx` to the opened/started endpoints.
- Phase 3 adds a compact `Buy Box Intake Tracking` card on `apps/web/src/app/(dashboard)/dashboard/buyers/[id]/page.tsx`.
- The card sits directly below the top buyer header/action area and above `AI Buyer Intelligence Summary`.
- The card shows lifecycle status, key timestamps, last activity, reminder count, copy link, refresh, and a small event timeline.

## Event Types Supported By Backend

- `INTAKE_LINK_CREATED`
- `INTAKE_LINK_SENT`
- `INTAKE_LINK_OPENED`
- `INTAKE_FORM_STARTED`
- `INTAKE_FORM_SUBMITTED`
- `INTAKE_REMINDER_SENT`
- `INTAKE_LINK_EXPIRED`
- `INTAKE_MANUAL_REVIEW_NEEDED`

## Important Notes

- No intake form redesign was done in Phase 2.
- No buyer profile timeline UI was built in Phase 2.
- No analytics vendors or tracking libraries were added.
- The legacy `/intake/token/:token/track` backend endpoint remains available, but the public intake page now uses the new opened/started endpoints to avoid duplicate opened/started tracking from the page.
- Opened/started calls are guarded by per-token `sessionStorage` keys and component refs so they fire once per page session.

## Suggested Phase 4

Add reminder send workflow/automation only after confirming the Phase 3 tracking card works in production.
