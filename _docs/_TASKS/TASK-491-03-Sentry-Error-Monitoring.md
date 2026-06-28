# TASK-491-03: Sentry server-side error monitoring init
# FileName: TASK-491-03-Sentry-Error-Monitoring.md

**Parent Task:** TASK-491
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

The `sentry` integration stores an encrypted `dsn` (secret) and an optional
`environment`, but nothing initializes Sentry — no Sentry SDK is even a
dependency. This subtask initializes server-side error monitoring at boot from
the configured DSN and captures unhandled request errors, so the "Sentry"
integration genuinely monitors production errors.

The boot seam is `startHttpServer` in `core/server/httpServer.ts` (line ~494),
which already kicks off fire-and-forget boot tasks
(`void ensureThemesLoaded()`, `void initializeDocsIndexOnBootIfEnabled()`). The
request error-capture seam is the `fetch` handler in the same file (line ~507).

### Leaves

| ID              | Title                          | Effort | Status   |
| --------------- | ------------------------------ | ------ | -------- |
| TASK-491-03-L01 | Sentry server-side init + capture | Small | ⏳ To Do |

---

## Dependencies

- Reads the decrypted `dsn`/`environment` via
  `getIntegrationRuntimeConfig("sentry")` in
  `core/services/integrations/integrationsService.ts`.
- Adds a server-side Sentry dependency (`@sentry/node`, Bun-compatible) — verify
  it loads under Bun before committing to it; the leaf documents a minimal
  DSN-envelope fallback if the SDK is unsuitable.

---

## Testing Requirements

- Bun (`tests/integration/routes/*`, `tests/security/*`) — server-boot init flow,
  guard-when-unset, and the secret-handling assertion (DSN never logged). This is
  a `Bun.serve`/runtime bootstrap flow → Bun lane (per AGENTS plugin/runtime
  rule).
