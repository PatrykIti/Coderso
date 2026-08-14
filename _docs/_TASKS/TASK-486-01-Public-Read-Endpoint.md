# TASK-486-01: Public Read Endpoint + Server-Side Targeting Eval
# FileName: TASK-486-01-Public-Read-Endpoint.md

**Parent Task:** TASK-486
**Priority:** High
**Category:** Engagement / Popups / Public Site
**Estimated Effort:** Medium
**Dependencies:** None (reads the existing `popups` table from TASK-054-12)
**Status:** ✅ Done
**Completed:** 2026-08-14
**Started:** `<YYYY-MM-DD>`

---

## Overview

Add a secure, anonymous **public read** path so the live site can fetch the
published popups that target the current request. Today all `/popups` routes are
`popups:read`/`popups:write` gated; visitors have no way to read them. This
subtask delivers a PII-free public DTO + a pure targeting matcher (L01), a
DB-backed resolver that returns published+targeted popups (L02), and the public
route handler `handlePublicPopupsApi` wired into `handlePublicRequest` (L03).

Server-side targeting is authoritative: path include/exclude is matched on the
server, and audience (`all`/`logged_in`/`logged_out`) is resolved from the
session — the client never asserts its own segment.

This is the foundation for TASK-486-02/03 (the client engine consumes this
endpoint's DTO).

---

## Sub-Tasks

| ID | Title | Lane | Status |
| --- | --- | --- | --- |
| TASK-486-01-L01 | Public popup DTO + targeting/audience matcher + query schema | Vitest | ⏳ To Do |
| TASK-486-01-L02 | Published-popup public resolver (DB-backed) | Bun | ⏳ To Do |
| TASK-486-01-L03 | `/api/popups` public route handler + publicSite wiring | Bun | ⏳ To Do |

---

## Dependencies

- Existing popup domain: `core/services/popups/popupService.ts`,
  `popupTypes.ts`, `popupValidation.ts`,
  `core/server/validation/popupSchemas.ts`.
- Existing public dispatch + helpers in `core/server/publicSite.tsx`
  (`handlePublicRequest`, `getSecuritySettings`, `checkRateLimit`; note
  `jsonResponse` and `resolveIp` are module-private there — the public popups
  route self-defines its own `json`, and the dispatch call site in
  `handlePublicRequest` supplies `ip`/`userAgent`/`security` already) and
  `core/server/middleware/auth.ts` (`attachUserFromSession`).
- Reference public-read precedent: `core/server/publicBookingApi.ts`
  (`GET /api/booking/slots`).

---

## Testing Requirements

- **L01** → Vitest (pure: matcher truth-table, DTO sanitization, schema reject).
- **L02** → Bun (DB-backed resolver against seeded popups).
- **L03** → Bun (route registration, anonymous read, rate-limit bucket,
  visibility, no-PII payload, served via Bun.serve).
