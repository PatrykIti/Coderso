# TASK-491-01: Google Analytics tag injection
# FileName: TASK-491-01-Google-Analytics-Tag-Injection.md

**Parent Task:** TASK-491
**Priority:** Medium
**Category:** Settings / Integrations
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Completed:** 2026-08-15
**Started:** `<YYYY-MM-DD>`
**Completed:** `<YYYY-MM-DD>`

---

## Overview

Inject the GA4 `gtag.js` tag into the public site `<head>` when the
`google-analytics` integration has a valid `measurementId`. The measurement id
is a **public** identifier (the only field on the GA integration, typed `text`,
format `G-XXXXXXXX`), so it may reach the client; no GA secret exists. The tag
must NOT render in preview renders, and a missing/invalid id must fail closed to
no tag (never a malformed `<head>`).

The public render head is built once by the shared `renderDocument` helper in
`core/site/renderPublicPage.tsx` (used by `renderPublicPageHtml`,
`renderPublicPageRuntimeHtml`, and `renderPublicPageV2RuntimeHtml`) and by the
entry renderer in `core/site/renderPublicEntry.tsx`. The orchestrator
`core/server/publicSite.tsx` resolves per-request data and calls those
renderers; it is the right place to resolve the GA snippet once and thread it in.

### Leaves

| ID              | Title                                   | Effort | Status   |
| --------------- | --------------------------------------- | ------ | -------- |
| TASK-491-01-L01 | Analytics runtime resolver + tag builder | Small  | ⏳ To Do |
| TASK-491-01-L02 | Public `<head>` tag wiring               | Small  | ⏳ To Do |

---

## Dependencies

- Consumes `getIntegrationRuntimeConfig("google-analytics")` from
  `core/services/integrations/integrationsService.ts` (already returns the
  decrypted/plain config map; `measurementId` is plain text).
- L02 depends on L01 (the resolver + builder must exist before the renderers
  thread it in).

---

## Testing Requirements

- L01: Vitest (`tests/vitest/*`) — pure builder + resolver (format validation,
  escaping, null/invalid → no snippet). No DB/runtime imports at module load.
- L02: Bun (`tests/integration/routes/*`) — request a public page/entry over the
  server and assert the `gtag.js` tag is present when configured, absent when
  unconfigured, and absent in preview renders.
