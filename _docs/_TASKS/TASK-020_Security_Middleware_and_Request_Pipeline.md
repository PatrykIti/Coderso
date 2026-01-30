# TASK-020: Security Middleware and Request Pipeline
# FileName: TASK-020_Security_Middleware_and_Request_Pipeline.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-004, TASK-007
**Status:** Done (2026-01-30)

---

## Overview

Implement core security middleware for admin API and server requests, fully configurable from the Admin Dashboard.

**Goals:**
- Request ID and request context for consistent logging.
- CSRF protection for state-changing routes (configurable).
- CORS policy control (configurable).
- Rate limiting (configurable).
- Security headers (configurable).
- Input validation middleware (AJV + standard errors).
- Admin UI to manage all settings without server restart.

---

## Architecture

```
core/server/middleware/
  requestId.ts
  csrf.ts
  cors.ts
  rateLimit.ts
  securityHeaders.ts
core/server/validation/
  schemaValidator.ts
core/services/settings/
  securitySettings.ts
tests/unit/security/
  securitySettings.test.ts
  csrf.test.ts
  rateLimit.test.ts
tests/integration/routes/
  securityHeaders.test.ts
  cors.test.ts
  securitySettings.test.ts
```

## Commands (if needed)

```bash
# core
bun add ajv
```

---

## Sub-Tasks (detailed task files)

- `TASK-020-01_Security_Settings_Model_and_Defaults.md`
- `TASK-020-02_Security_Settings_API_and_Validation.md`
- `TASK-020-03_Request_Context_and_Request_ID.md`
- `TASK-020-04_CSRF_Protection_Middleware.md`
- `TASK-020-05_CORS_Policy_Middleware.md`
- `TASK-020-06_Rate_Limiting_Middleware.md`
- `TASK-020-07_Security_Headers_Middleware.md`
- `TASK-020-08_Input_Validation_Middleware.md`
- `TASK-020-09_Security_Settings_UI_Wiring.md`
- `TASK-020-10_Session_Limits_Settings.md`

## Implementation Order

1. Security settings model + API (020-01, 020-02)
2. Request context + request ID (020-03)
3. CSRF + CORS (020-04, 020-05)
4. Rate limiting (020-06)
5. Security headers (020-07)
6. Input validation (020-08)
7. Admin UI wiring (020-09)
8. Session limits in security settings (020-10)

---

## Testing Requirements

- [ ] `tests/unit/security/securitySettings.test.ts` validates defaults + merges.
- [ ] `tests/unit/security/csrf.test.ts` rejects missing token.
- [ ] `tests/unit/security/rateLimit.test.ts` blocks repeated login attempts.
- [ ] `tests/integration/routes/securityHeaders.test.ts` verifies headers.
- [ ] `tests/integration/routes/cors.test.ts` allows only admin origin.
- [ ] `tests/integration/routes/securitySettings.test.ts` validates settings API.

---

## New Files to Create

- `core/services/settings/securitySettings.ts`
- `core/server/middleware/requestId.ts`
- `core/server/middleware/csrf.ts`
- `core/server/middleware/cors.ts`
- `core/server/middleware/rateLimit.ts`
- `core/server/middleware/securityHeaders.ts`
- `core/server/validation/schemaValidator.ts`
- `tests/unit/security/securitySettings.test.ts`
- `tests/unit/security/csrf.test.ts`
- `tests/unit/security/rateLimit.test.ts`
- `tests/integration/routes/securityHeaders.test.ts`
- `tests/integration/routes/cors.test.ts`
- `tests/integration/routes/securitySettings.test.ts`

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (middleware details).
- `_docs/CMS_API.md` (security settings + CSRF usage).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-middleware.md`
- Notes: CSRF, rate limiting, headers.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
