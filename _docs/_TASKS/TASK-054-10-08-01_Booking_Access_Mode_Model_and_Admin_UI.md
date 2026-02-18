# TASK-054-10-08-01: Booking Access Mode Model and Admin UI
# FileName: TASK-054-10-08-01_Booking_Access_Mode_Model_and_Admin_UI.md

**Priority:** High  
**Category:** Booking Domain + Admin UX  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-05, TASK-054-10-06  
**Status:** Done (2026-02-18)

---

## Goal
Define normalized booking runtime access mode and expose it in Booking Services editor.

## Scope
1. Add booking access contract (`public|internal`).
2. Normalize and persist `submissionAccess` in booking service `settings`.
3. Update admin service types + booking editor state.
4. Add UI select + helper copy.

## Pseudocode
```ts
// bookingAccess.ts
type BookingAccessMode = "public" | "internal";
normalizeBookingAccessMode(value, fallback = "public")
resolveBookingAccessFromServiceSettings(settings)
applyBookingAccessToServiceSettings(settings, mode)

// bookingService.ts
createBookingService(input):
  settings = applyBookingAccessToServiceSettings(input.settings, "public")

updateBookingService(id, input):
  if input.settings provided:
    settings = applyBookingAccessToServiceSettings(input.settings, existingMode)

// BookingPage.tsx + ServicesTab.tsx
serviceForm.submissionAccess
payload.settings.submissionAccess = serviceForm.submissionAccess
render select:
  - Public (nonce + bot protection)
  - Internal (auth session or API key)
```

## Acceptance Criteria
1. Every booking service has deterministic access mode (default `public`).
2. UI allows selecting and editing access mode.
3. Service save/edit roundtrip preserves the chosen mode.
