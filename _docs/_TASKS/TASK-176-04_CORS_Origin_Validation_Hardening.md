# TASK-176-04: CORS Origin Validation Hardening
# FileName: TASK-176-04_CORS_Origin_Validation_Hardening.md

**Priority:** High
**Category:** Security + Server Middleware
**Estimated Effort:** Medium
**Dependencies:** TASK-176
**Status:** To Do

---

## Overview

Resolve Semgrep CORS finding in `core/server/middleware/cors.ts` by making trusted-origin validation explicit and scanner-legible without weakening admin CORS behavior.

Current finding:
- `javascript.express.security.cors-misconfiguration.cors-misconfiguration`
- `headers.set("Access-Control-Allow-Origin", allowAny ? "*" : origin);`

## Sub-Tasks

No child task files.

## Files to Change

- `core/server/middleware/cors.ts`
- server/security middleware tests
- `_docs/SECURITY_SPEC.md` if the CORS contract is clarified

## Security Contract

- Visibility: HTTP middleware.
- Auth model: no change.
- RBAC: no change.
- CSRF: no change.
- Rate-limit bucket: no change.
- Reject-unknown validation: no change.
- Anti-abuse:
  - never reflect arbitrary untrusted origins,
  - wildcard CORS must not be combined with credentials,
  - admin origins must come from trusted config only.
- Idempotency: not applicable.
- Secret handling: do not log cookies, tokens, or request secrets while testing CORS.

## Testing Requirements

- Add/update middleware tests for:
  - trusted origin allowed,
  - untrusted origin rejected/not reflected,
  - wildcard behavior with credentials disabled,
  - admin credential behavior stays safe.
- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - relevant route/middleware security tests
  - `bun run scan:semgrep`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion.

## Acceptance Criteria

1. CORS origin reflection is clearly guarded by trusted-origin checks.
2. Middleware tests cover trusted/untrusted/wildcard behavior.
3. Semgrep CORS finding is resolved or justified with a precise scanner suppression and documented rationale.
