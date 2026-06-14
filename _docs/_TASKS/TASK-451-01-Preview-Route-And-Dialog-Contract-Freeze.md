# TASK-451-01: Preview Route And Dialog Contract Freeze
# FileName: TASK-451-01-Preview-Route-And-Dialog-Contract-Freeze.md

**Parent Task:** TASK-451
**Priority:** High
**Category:** Pages / Preview / Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-423
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Freeze the actual preview contract before fixing the preview surface: route
ownership, preview-token protections, dialog behavior, and what counts as
truthful 3-surface parity for the Page editor. The public `/preview` route IS
registered and 404s by design without a valid token/type
(`core/server/publicSite.tsx:1312-1319`); the audited failure is environmental
(preview URL/environment composition), so the leaf work is diagnose-and-fix,
not route restoration.

---

## Sub-Tasks

- [x] TASK-451-01-L01: Restore preview surface and preserve preview-token
      guards.

---

## Security Contract

- **Endpoint visibility:** existing public `/preview` route and internal admin
  dialog orchestration only.
- **Auth model:** preview remains token-gated.
- **RBAC:** existing Pages permissions for token issuance.
- **CSRF:** unchanged admin preview issuance behavior.
- **Rate-limit bucket:** existing preview bucket.
- **Validation:** preview must keep using normalized Page documents.

---

## Testing Requirements

- Relevant Bun preview/runtime suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`

---

## Completion Notes

Completed 2026-06-11: diagnose-first contract executed; probe transport fix in previewService.fetchPreviewProbe with security guards unchanged.
