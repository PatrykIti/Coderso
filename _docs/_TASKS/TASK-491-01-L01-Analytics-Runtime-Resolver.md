# TASK-491-01-L01: Analytics runtime resolver + tag builder
# FileName: TASK-491-01-L01-Analytics-Runtime-Resolver.md

**Parent Subtask:** TASK-491-01
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ⏳ To Do
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

- **Goal:** Provide a pure builder that renders the GA4 `gtag.js` head snippet
  for a validated `measurementId`, plus an async resolver that reads the
  `google-analytics` integration config and returns the snippet (or `null`).
- **Owning module(s) to create-or-extend:**
  - Create `core/services/integrations/analyticsRuntime.ts` with
    `GA_MEASUREMENT_ID_PATTERN`, `isValidGaMeasurementId(value)`,
    `buildGoogleAnalyticsHeadSnippet(measurementId)` (pure), and
    `resolvePublicAnalyticsHead()` (reads runtime config via a lazy-imported
    `getIntegrationRuntimeConfig`).
  - Keep the module Bun-free at import time: import `getIntegrationRuntimeConfig`
    lazily (dynamic `import`) or via an injectable default dep so Vitest can load
    `buildGoogleAnalyticsHeadSnippet` without touching `db/client`.
- **Source-of-truth docs:** `_docs/CMS_API.md` (Integrations v1),
  `_docs/ARCHITECTURE.md` (public render pipeline), `_docs/SECURITY_SPEC.md`
  (secret/client-payload handling).
- **Out of scope:** Threading the snippet into the renderers (that is L02);
  any GA event/measurement-protocol calls; consent-mode / IP-anonymization
  config (no field exists for it).

---

## Security Contract

- **Endpoint visibility:** n/a (no route; pure service helper).
- **Auth model:** n/a.
- **RBAC:** n/a.
- **CSRF:** n/a.
- **Rate-limit bucket:** n/a.
- **Validation:** `measurementId` MUST match `^G-[A-Z0-9]{4,}$`
  (`GA_MEASUREMENT_ID_PATTERN`). Reject anything else → resolver returns `null`,
  builder returns `""`. This is the injection guard: only a format-validated id
  is interpolated into the inline script/URL.
- **Anti-abuse:** n/a.
- **Secret handling:** `measurementId` is the only GA field and is `text`
  (public). No GA secret exists, so nothing secret is read or emitted. Confirm
  the resolver never reads other integrations and never logs the config.

---

## Implementation Pseudocode

```ts
// core/services/integrations/analyticsRuntime.ts
export const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;

export function isValidGaMeasurementId(value: unknown): value is string {
  return typeof value === "string" && GA_MEASUREMENT_ID_PATTERN.test(value.trim());
}

// Pure, deterministic, no I/O. Returns "" for an invalid id (fail closed).
export function buildGoogleAnalyticsHeadSnippet(measurementId: string): string {
  if (!isValidGaMeasurementId(measurementId)) return "";
  const id = measurementId.trim(); // already constrained to [A-Z0-9-], no escaping needed
  return [
    `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>`,
    `<script>window.dataLayer=window.dataLayer||[];`,
    `function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`,
    `gtag('config','${id}');</script>`,
  ].join("");
}

type AnalyticsRuntimeDeps = {
  getIntegrationRuntimeConfig: (id: string) => Promise<Record<string, string | null> | null>;
};

const defaultDeps: AnalyticsRuntimeDeps = {
  getIntegrationRuntimeConfig: async (id) => {
    const mod = await import("./integrationsService");
    return mod.getIntegrationRuntimeConfig(id);
  },
};

// Returns the ready-to-inject head HTML, or null when GA is not configured/invalid.
export async function resolvePublicAnalyticsHead(
  deps: AnalyticsRuntimeDeps = defaultDeps
): Promise<string | null> {
  const config = await deps.getIntegrationRuntimeConfig("google-analytics");
  const id = config?.measurementId;
  if (!isValidGaMeasurementId(id)) return null;
  return buildGoogleAnalyticsHeadSnippet(id);
}
```

**Data flow:** `resolvePublicAnalyticsHead` → read integration runtime config →
validate `measurementId` format → return built snippet or `null`. The renderer
(L02) decides where to place it and whether preview suppresses it.

**Error handling:** no throws on the happy/empty path — invalid/missing →
`null`/`""` (fail closed). If `getIntegrationRuntimeConfig` rejects, let the
caller's existing `try/catch` in `publicSite.tsx` degrade to no tag; do not crash
the page render.

**Regression-test shape:**

- `buildGoogleAnalyticsHeadSnippet("G-ABC123")` contains the `gtag/js?id=G-ABC123`
  src and `gtag('config','G-ABC123')`.
- `buildGoogleAnalyticsHeadSnippet("</script><script>alert(1)")` → `""`.
- `buildGoogleAnalyticsHeadSnippet("ga-123")`/`""`/`"UA-1"` → `""`.
- `resolvePublicAnalyticsHead` with a stub dep: configured valid id → snippet;
  `null`/empty/invalid id → `null`; verify the dep was called with
  `"google-analytics"` and no other id.

---

## Testing Requirements

- Vitest (`tests/vitest/integrations/analyticsRuntime.test.ts`) — covers the
  builder + resolver shapes above. Must import the module without any
  Bun/`db/client` side effects (lazy/injected dep).
- Lint + type-check.
