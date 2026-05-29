# Decisions

## 2026-05-29 — Buy Box Intake Tracking Phase 1

### Decision

Use a dedicated `BuyerIntakeEvent` table instead of overloading the existing generic `BuyerEvent` table.

### Rationale

- Intake tracking has token-specific lifecycle events that are distinct from general buyer activity.
- A dedicated table keeps the intake audit trail clean and easier to query.
- The existing `BuyerEvent` table remains untouched for general activity and backward compatibility.

### Decision

Add nullable buyer-level intake fields for status and key timestamps.

### Rationale

- The event log is the source of historical truth.
- Buyer-level fields make common UI/API reads simple and efficient.
- Nullable fields keep the migration safe for existing buyers.

### Decision

Deduplicate `INTAKE_LINK_OPENED` and `INTAKE_FORM_STARTED` events over a short backend window.

### Rationale

- These events are most likely to be spammed by page refreshes, browser retries, or repeated clicks.
- Submission and lifecycle events should remain append-only unless explicitly constrained later.

### Decision

Do not build reminder automation in Phase 1.

### Rationale

- Phase 1 is intentionally limited to backend/database foundations.
- Reminder scheduling and messaging rules should be designed separately in a later phase.

### Decision

Add a minimal link-sent endpoint in Phase 1.

### Rationale

- Phase 1 needs backend coverage for the moment an existing token is actually sent to a buyer.
- This remains backend-only and does not introduce reminder automation or frontend UI.

## 2026-05-29 — Buy Box Intake Tracking Phase 2

### Decision

Use lightweight in-page tracking helpers with `sessionStorage` guards instead of adding a tracking library.

### Rationale

- Phase 2 only needs opened/started calls for the public intake form.
- `sessionStorage` keeps opened/started calls to once per token per tab session.
- Avoids introducing analytics vendors, dependencies, or UI changes.


## 2026-05-29 — Phase 4 Messaging Intake Tracking

Added backend hooks so successful DispoAI/Twilio messages containing a buyer intake link log `INTAKE_LINK_SENT`, and reminder sends using `intakeTrackingType: "reminder"` log `INTAKE_REMINDER_SENT`. Scheduled reminder automation remains deferred.
