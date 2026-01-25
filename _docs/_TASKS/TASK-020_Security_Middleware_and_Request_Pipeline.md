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

tests/unit/security/
  csrf.test.ts
  rateLimit.test.ts
```

## Commands (if needed)

```bash
# core
bun add ajv
```

---

## Sub-Tasks

### TASK-020-01_Request_ID_and_logging

**Status:** To Do

- Generate request ID per request.
- Add to logs and response headers.
- Use UUIDv4 format.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/middleware/requestId.ts` | request id middleware |

Request ID sketch:

```ts
export function requestId(req, res, next) {
  const id = crypto.randomUUID();
  req.context.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
```

---

### TASK-020-02_CSRF_and_CORS

**Status:** To Do

- CSRF token endpoint: `GET /auth/csrf`.
- Validate `X-CSRF-Token` for POST/PUT/PATCH/DELETE.
- CORS allow only admin origin.
- Allow `OPTIONS` preflight.

CSRF token sketch:

```ts
router.get("/auth/csrf", async (req) => {
  const token = randomToken();
  await saveCsrfToken(req.session.id, token);
  return json({ token });
});
```

Example check:

```ts
const token = req.headers.get("x-csrf-token");
if (!token || token !== session.csrfToken) {
  return new Response("Invalid CSRF", { status: 403 });
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/middleware/csrf.ts` | CSRF validation |
| `core/server/middleware/cors.ts` | CORS rules |

CORS sketch:

```ts
export function cors(req, res, next) {
  res.setHeader("access-control-allow-origin", ADMIN_ORIGIN);
  next();
}
```

---

### TASK-020-03_Rate_limiting_and_headers

**Status:** To Do

- Per-IP rate limit for login and admin API.
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options.
- Use in-memory store for v1 (replaceable).

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/middleware/rateLimit.ts` | rate limiting |
| `core/server/middleware/securityHeaders.ts` | headers |

Headers sketch:

```ts
res.setHeader("x-frame-options", "DENY");
res.setHeader("x-content-type-options", "nosniff");
```

Rate limit sketch:

```ts
const buckets = new Map();
export function rateLimit(req, res, next) {
  const key = req.ip;
  const hits = buckets.get(key) ?? 0;
  if (hits > MAX_REQ) return res.status(429).end();
  buckets.set(key, hits + 1);
  next();
}
```

---

### TASK-020-04_Input_validation

**Status:** To Do

- Validate payloads with JSON schema.
- Reject unknown fields.
- Normalize validation errors to standard API error format.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/server/validation/schemaValidator.ts` | validation helpers |

Validator sketch:

```ts
export function validate(schema, payload) {
  const ok = ajv.validate(schema, payload);
  if (!ok) throw new ValidationError(ajv.errors);
}
```

---

## Testing Requirements

- [ ] `tests/unit/security/csrf.test.ts` rejects missing token.
- [ ] `tests/unit/security/rateLimit.test.ts` blocks repeated login attempts.
- [ ] `tests/integration/routes/securityHeaders.test.ts` verifies headers.
- [ ] `tests/integration/routes/cors.test.ts` allows only admin origin.

---

## New Files to Create

- `core/server/middleware/requestId.ts`
- `core/server/middleware/csrf.ts`
- `core/server/middleware/cors.ts`
- `core/server/middleware/rateLimit.ts`
- `core/server/middleware/securityHeaders.ts`
- `core/server/validation/schemaValidator.ts`
- `tests/unit/security/csrf.test.ts`
- `tests/unit/security/rateLimit.test.ts`
- `tests/integration/routes/securityHeaders.test.ts`
- `tests/integration/routes/cors.test.ts`

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
