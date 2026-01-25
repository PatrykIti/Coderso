# TASK-020: Security Middleware and Request Pipeline
# FileName: TASK-020_Security_Middleware_and_Request_Pipeline.md

**Priority:** High
**Category:** Core/Security
**Estimated Effort:** Medium
**Dependencies:** TASK-004
**Status:** To Do

---

## Overview

Implement core security middleware for admin API and server requests.

**Goals:**
- Request ID and structured logging.
- CSRF protection for state-changing routes.
- Rate limiting and security headers.

---

## Architecture

```
core/server/middleware/
  requestId.ts
  csrf.ts
  rateLimit.ts
  securityHeaders.ts
  cors.ts
core/server/validation/
  schemaValidator.ts
```

---

## Sub-Tasks

### TASK-020-1: Request ID and logging

**Status:** To Do

- Generate request ID per request.
- Add to logs and response headers.

---

### TASK-020-2: CSRF and CORS

**Status:** To Do

- CSRF token endpoint: `GET /auth/csrf`.
- Validate `X-CSRF-Token` for POST/PUT/PATCH/DELETE.
- CORS allow only admin origin.

Example check:

```ts
const token = req.headers.get("x-csrf-token");
if (!token || token !== session.csrfToken) {
  return new Response("Invalid CSRF", { status: 403 });
}
```

---

### TASK-020-3: Rate limiting and headers

**Status:** To Do

- Per-IP rate limit for login and admin API.
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options.

---

### TASK-020-4: Input validation

**Status:** To Do

- Validate payloads with JSON schema.
- Reject unknown fields.

---

## Testing Requirements

- [ ] Missing CSRF token returns 403.
- [ ] Rate limiter blocks repeated login attempts.
- [ ] Security headers present on responses.

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (middleware details).
- `_docs/CMS_API.md` (CSRF usage).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-security-middleware.md`
- Notes: CSRF, rate limiting, headers.

---

## Additional Docs

- `_docs/ARCHITECTURE.md`
