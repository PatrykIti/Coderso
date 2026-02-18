# TASK-054-10-08-02: Booking Public API Access Enforcement
# FileName: TASK-054-10-08-02_Booking_Public_API_Access_Enforcement.md

**Priority:** High  
**Category:** Runtime API / Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10-08-01, TASK-020-11-03  
**Status:** Done (2026-02-18)

---

## Goal
Enforce per-service booking access mode in runtime endpoints.

## Scope
1. Evaluate request access by service mode:
   - `public`: keep token/nonce/captcha checks,
   - `internal`: require session or API key scope.
2. Add booking API key scope contract.
3. Keep public endpoint paths unchanged.

## Pseudocode
```ts
resolveRequestPrincipal(req):
  user = attachUserFromSession(cookie)
  apiKey = authenticateApiKey(authorization)

for GET /api/booking/slots:
  service = getBookingService(serviceId)
  mode = resolveBookingAccessFromServiceSettings(service.settings)
  if mode === "public": require runtimeToken
  if mode === "internal":
    allow only user || apiKey(has "booking.submit")
    if user -> requirePermission("booking:read")

for POST /api/booking/reservations:
  service = getBookingService(body.serviceId)
  mode = resolveBookingAccessFromServiceSettings(service.settings)
  if mode === "public": nonce + botProtection
  if mode === "internal":
    allow only user || apiKey(has "booking.submit")
    if user -> requirePermission("booking:write")
```

## Acceptance Criteria
1. Internal booking services cannot be used anonymously.
2. Public services keep existing anti-abuse checks.
3. API key path is deterministic (`booking.submit` scope).
4. Error codes are stable (`auth_required`/`forbidden`/validation).
