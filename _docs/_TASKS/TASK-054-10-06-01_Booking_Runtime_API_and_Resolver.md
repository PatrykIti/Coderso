# TASK-054-10-06-01: Booking Runtime API and Resolver
# FileName: TASK-054-10-06-01_Booking_Runtime_API_and_Resolver.md

**Priority:** High  
**Category:** Runtime API + Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-04  
**Status:** Done (2026-02-18)

---

## Goal
Expose public runtime booking endpoints and resolver payload needed by booking widgets.

## Scope
1. Public booking runtime API:
   - `GET /api/booking/slots`
   - `POST /api/booking/reservations`
2. Keep internal admin booking API unchanged (`/admin/api/booking/*`).
3. Public write protection on reservation submit:
   - nonce validation,
   - bot protection (`public_write`) when enabled.
4. Runtime resolver returning active services/resources and submission nonce.

## Files to Change
- `core/server/publicSite.tsx`
- `core/server/validation/bookingSchemas.ts`
- `core/services/booking/bookingService.ts`
- `core/services/booking/bookingRuntimeResolver.ts` (new)
- `core/services/booking/bookingSubmissionNonce.ts` (new)
- `core/server/routes/bookingRoutes.ts`

## Pseudocode
```ts
if (req.method === "GET" && path === "/api/booking/slots") {
  validate(bookingPublicSlotQuerySchema, query);
  return { items: await previewBookingSlots(query) };
}

if (req.method === "POST" && path === "/api/booking/reservations") {
  validate(bookingPublicReservationSchema, body);
  checkRateLimit("public_write", ctx);
  assertBookingSubmissionNonce(body.formNonce);
  await enforceBotProtection({ action: "public_write", token: body.captchaToken, ... });
  return await createBookingReservation(body);
}

resolveBookingRuntimeData({ preview }) => {
  services = active services
  resources = active resources
  serviceResourceMap = mappings
  submissionNonce = createBookingSubmissionNonce()
  return { services, resources, serviceResourceMap, submissionNonce }
}
```

## Acceptance Criteria
1. Public runtime slot preview and reservation submit work without admin auth.
2. Reservation submit enforces nonce + bot protection policy.
3. Known booking domain errors are mapped to stable API codes (no raw 500 for domain cases).
4. Runtime resolver returns deterministic payload for widgets.
