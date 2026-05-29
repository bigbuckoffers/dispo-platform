# Changelog

## 2026-05-29 — Phase 3 Visibility Fix

### Changed

- Confirmed the intake tracking card is in the active root buyer profile page.
- Added an explicit `Could not load intake timeline.` state so event-query failures do not hide the card.

## 2026-05-29 — Phase 3 Buyer Profile Intake Tracking Card

### Added

- Added a compact `Buy Box Intake Tracking` card directly below the buyer header/action area.
- Added current intake status, lifecycle timestamps, last activity summary, reminder count, copy intake link, refresh, and a small event timeline.

### Not Included

- No reminder automation.
- No buyer profile redesign.
- No unrelated UI changes.

## 2026-05-29 — Phase 2 Public Intake Tracking Wire-up

### Added

- Wired the public intake form to `POST /api/v1/intake/token/:token/opened` after a valid token loads.
- Wired the public intake form to `POST /api/v1/intake/token/:token/started` on first meaningful buyer interaction.
- Added safe metadata for public intake tracking: source, user agent, timestamp, and interaction context.

### Changed

- Replaced public intake page legacy opened/step tracking calls with the new opened/started endpoints to avoid duplicate tracking from the page.
- Kept existing submit behavior unchanged through `POST /api/v1/intake/token/:token/submit`.

### Not Included

- No frontend redesign.
- No buyer profile timeline UI.
- No analytics vendor/library.

## 2026-05-29 — Phase 1 Buy Box Intake Tracking

### Added

- Added Prisma data model foundation for buy box intake event tracking.
- Added `BuyerIntakeEventType` and `BuyerIntakeStatus` enums.
- Added buyer-level intake status and timestamp fields.
- Added `buyer_intake_events` event log table via Prisma schema and migration.
- Added backend intake event logging helper with dedupe protection for opened/started events.
- Added minimal backend endpoints for intake link sent, intake opened, intake started, and buyer intake event timeline.

### Changed

- Intake token generation now records `INTAKE_LINK_CREATED` for newly generated tokens.
- Intake link sent tracking records `INTAKE_LINK_SENT` and updates `intakeSentAt`.
- Intake form submission now records `INTAKE_FORM_STARTED` for partial submissions and `INTAKE_FORM_SUBMITTED` for completed submissions.
- Legacy intake tracking remains supported and mirrors relevant events into the new event log.

### Not Included

- No frontend UI changes.
- No reminder automation.
- No redesign of buyer profile or intake pages.


## 2026-05-29 — Phase 4 Messaging Intake Tracking

Added backend hooks so successful DispoAI/Twilio messages containing a buyer intake link log `INTAKE_LINK_SENT`, and reminder sends using `intakeTrackingType: "reminder"` log `INTAKE_REMINDER_SENT`. Scheduled reminder automation remains deferred.
