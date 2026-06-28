# TASK-491-03-L01: Sentry server-side init + capture
# FileName: TASK-491-03-L01-Sentry-Server-Init.md

**Parent Subtask:** TASK-491-03
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Initialize Sentry on the server at boot from the configured
  `dsn`/`environment`, and capture unhandled errors from the request handler, so
  the Sentry integration actually reports production errors. Initialization is a
  no-op when no DSN is configured.
- **Owning module(s) to create-or-extend:**
  - Create `core/services/integrations/errorMonitoring.ts` —
    `initializeErrorMonitoringOnBoot()` (reads `getIntegrationRuntimeConfig("sentry")`,
    inits the SDK once if a non-empty `dsn` is present, idempotent via a module
    flag), `captureServerError(error, context?)` (no-op when uninitialized), and
    `isErrorMonitoringEnabled()`.
  - `core/server/httpServer.ts` — add `void initializeErrorMonitoringOnBoot()`
    next to the existing boot tasks in `startHttpServer`, and wrap the `fetch`
    handler body so a thrown/unhandled error calls `captureServerError` before
    the existing error response is returned (do not change the response shape).
  - `package.json` — add `@sentry/node` (verify Bun compatibility). If unsuitable
    under Bun, implement a minimal DSN-envelope POST sender inside
    `errorMonitoring.ts` instead (parse the DSN, POST to the ingest envelope
    endpoint via `postWithRetry`), keeping the same public function shape.
- **Source-of-truth docs:** `_docs/ARCHITECTURE.md` (server bootstrap + runtime),
  `_docs/SECURITY_SPEC.md` (secret handling), `_docs/CMS_API.md`.
- **Out of scope:** A client/browser Sentry SDK and a public browser DSN. The
  stored `dsn` is `secret`-typed and must stay server-side; client reporting
  would require a new public `clientDsn` field on the GA-style public contract,
  which is deferred (note in closeout). Performance tracing / profiling /
  source-map upload are out of scope — error capture only.

---

## Security Contract

- **Endpoint visibility:** n/a (boot task + in-process capture; no new route).
- **Auth model:** n/a (runs in server process context).
- **RBAC:** n/a.
- **CSRF:** n/a.
- **Rate-limit bucket:** outbound to Sentry is the SDK's responsibility; the
  fallback sender uses `postWithRetry` (bounded attempts).
- **Validation:** treat `dsn` as opaque; only init when it is a non-empty string
  (and, for the fallback path, a parseable Sentry DSN URL). Reject/ignore
  otherwise (no-op).
- **Anti-abuse:** n/a.
- **Secret handling:** the `dsn` is a secret — NEVER log it, never include it in
  any captured event metadata, and never return it from any function. On init
  failure, log a machine-readable code (`sentry_init_failed`) only. Captured
  error context must be scrubbed of request bodies/headers that could carry
  secrets (rely on the SDK's default PII-off config; for the fallback, send only
  error type/message/stack, no request body).

---

## Implementation Pseudocode

```ts
// core/services/integrations/errorMonitoring.ts
let initialized = false;
let enabled = false;

export async function initializeErrorMonitoringOnBoot(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const config = await getIntegrationRuntimeConfig("sentry");
    const dsn = config?.dsn?.trim();
    if (!dsn) return; // not configured -> stays disabled (no-op)
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: config?.environment?.trim() || process.env.NODE_ENV || "production",
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });
    enabled = true;
  } catch (error) {
    console.warn("sentry_init_failed"); // no dsn, no SDK error detail that could leak the dsn
  }
}

export function isErrorMonitoringEnabled(): boolean { return enabled; }

export function captureServerError(error: unknown, context?: Record<string, string>): void {
  if (!enabled) return;
  try {
    const Sentry = require("@sentry/node"); // already initialized
    Sentry.captureException(error, context ? { tags: context } : undefined);
  } catch { /* never throw from capture */ }
}
```

```ts
// core/server/httpServer.ts (inside startHttpServer)
void initializeErrorMonitoringOnBoot().catch(() => {
  console.warn("sentry_init_failed");
});

// fetch handler: wrap dispatch so unhandled errors are captured
async fetch(req) {
  try {
    /* ...existing routing... */
  } catch (error) {
    captureServerError(error, { path: new URL(req.url).pathname });
    throw error; // preserve existing error-response behavior
  }
}
```

**Data flow:** boot → read sentry runtime config → init SDK once if dsn present →
`enabled = true`. Request error → `captureServerError` → SDK send (no-op if
disabled) → existing error response unchanged.

**Error handling:** init is idempotent and fail-closed (no dsn / SDK error →
disabled, server still boots). `captureServerError` never throws.

**Regression-test shape:**

- `initializeErrorMonitoringOnBoot` with stubbed `getIntegrationRuntimeConfig`:
  no dsn → `isErrorMonitoringEnabled()` false, SDK init not called; valid dsn →
  enabled true, init called once (idempotent on second call).
- `captureServerError` is a no-op when disabled; calls `captureException` when
  enabled; never throws on SDK error.
- Security: capture an init failure and assert the dsn string never appears in
  `console` output.

---

## Testing Requirements

- Bun (`tests/integration/routes/sentryInit.test.ts`) — boot init + idempotency +
  guard-when-unset with a mocked `@sentry/node` (runtime bootstrap → Bun lane).
- `tests/security/sentryDsnRedaction.test.ts` (Bun) — dsn never logged.
- Lint + type-check; confirm `@sentry/node` resolves under Bun (or the fallback
  sender is used). No DB change → no migration artifacts.
