# TASK-131: Booking Admin UI Assistant Documentation Refresh
# FileName: TASK-131_Booking_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/booking/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Booking surface based on a
real authenticated walkthrough of the local admin UI. The goal is to replace
the old generic article with a more guided document that matches the shipped
tabbed booking workspace for resources, services, availability, reservations,
and slot preview.

## Scope

1. Review the current Booking assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/coderso/booking`
   with an authenticated session and record actual behavior.
3. Rewrite `docs/coderso/booking.md` using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Keep this task in `In Progress` until the user reviews the draft.

## Sub-Tasks

1. Capture the current booking module shell:
   - page header,
   - refresh action,
   - top tabs.
2. Capture the currently visible onboarding state:
   - resources table empty state,
   - resource creation form.
3. Verify remaining tab contracts against code:
   - services,
   - availability,
   - reservations,
   - slot preview.
4. Rewrite the doc without pretending the current local dataset is richer than
   it is.

## Acceptance Criteria

1. The Booking assistant doc describes the current shipped UI rather than the
   old generic workflow summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about tabbed operational flow, not just abstract
   scheduling concepts.
4. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Booking UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/booking/*`

## Documentation Updates Required

- `docs/coderso/booking.md`
- `_docs/_TASKS/TASK-131_Booking_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - booking module shell,
  - resources tab onboarding state.
- Additional tab contracts verified against:
  - `core/admin/ui/booking/BookingPage.tsx`
  - `core/admin/ui/booking/components/*`
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Rewrote `docs/coderso/booking.md` against the shipped tabbed workflow for:
  resources, services, availability, reservations, and slot preview.
- Kept Booking as one canonical doc because the local product uses a single
  tabbed route rather than multiple separate route families.
- User review completed before closure.
