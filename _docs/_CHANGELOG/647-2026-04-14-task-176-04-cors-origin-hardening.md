# 647. TASK-176-04 CORS origin hardening

**Date:** 2026-04-14
**Version:** 0.1.0
**Tasks:** TASK-176, TASK-176-04

## Key Changes

### Security
- Hardened CORS middleware so `Access-Control-Allow-Origin` is emitted from trusted configured origins or literal `*`, not raw request origin casing.
- Kept wildcard CORS incompatible with credentials.
- Added CORS tests for trusted origins, untrusted origins, configured-origin casing, and wildcard-without-credentials behavior.
- Resolved Semgrep `javascript.express.security.cors-misconfiguration.cors-misconfiguration` finding in `core/server/middleware/cors.ts`.

### Validation
- Ran:
  - `bun test tests/integration/routes/cors.test.ts tests/unit/security/securitySettings.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - filtered Semgrep check confirming CORS finding is resolved
- Notes:
  - DB-backed `tests/unit/security/securitySettings.test.ts` cases skipped without DB.
