# TASK-451: Page Editor Preview Surface And Toolbar Shell Parity
# FileName: TASK-451_Page_Editor_Preview_Surface_And_Toolbar_Shell_Parity.md

**Priority:** High
**Category:** Pages / Admin UI / Preview
**Estimated Effort:** Large
**Dependencies:** TASK-421, TASK-423
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-11

---

## Overview

Close the remaining issues from `_docs/AUDIT/_cross-parity-2026-06-10.md` that
are not already owned by the shared control-widget work: the preview dialog is
unreachable in the audited environment even though the public `/preview` route
IS registered and 404s by design without a valid token/type
(`core/server/publicSite.tsx:1312-1319`) — the failure is environmental
(preview URL/environment composition), not a missing route — the editor
achieves only 2/3 surface parity, and the remaining shell polish gaps (toolbar
labels, preview dialog behavior, inline add affordances) need a dedicated
closure family instead of staying as loose notes.

---

## Sub-Tasks

- [x] TASK-451-01: Preview route and dialog contract freeze.
- [x] TASK-451-01-L01: Diagnose and fix the preview URL/environment composition
      so the dialog renders, without weakening preview-token rules.
- [x] TASK-451-02: Toolbar shell and parity polish.
- [x] TASK-451-02-L01: Normalize toolbar labels, add-surface affordances, and
      remaining shell parity behaviors.
- [x] TASK-451-03: Three-surface validation and closure.

---

## Security Contract

- **Endpoint visibility:** existing public `/preview` route plus internal admin
  preview dialog orchestration only.
- **Auth model:** preview remains token-gated; published pages remain anonymous.
- **RBAC:** existing Pages permissions for preview issuance.
- **CSRF:** unchanged admin preview issuance behavior.
- **Rate-limit bucket:** existing preview bucket.
- **Validation:** preview must keep using normalized page documents and current
  preview-token ownership checks.
- **Anti-abuse controls:** keep TTL, target validation, sanitized preview
  diagnostics, and the `site.previewEnabled` kill-switch
  (`core/server/publicSite.tsx:1318-1319`).

---

## Testing Requirements

- Relevant Bun preview/runtime suites.
- Relevant Page editor UI Vitest suites.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `coderso-dev-core-host` plus `playwright-cli` parity replay.

---

## Documentation Updates Required

- `_docs/PREVIEW_SPEC.md`
- `_docs/PAGE_MODEL.md`
- `_docs/_TASKS/README.md`

---

## Completion Notes

Family completed 2026-06-11. Preview root cause diagnosed (NOT a missing route): the server-side probe failed because Bun fetch connects IPv6-only for *.localhost while the dev server binds IPv4 — fixed with a loopback IPv4 retry preserving the Host header (token model unchanged). Toolbar labels no longer leak content (resolveToolbarTargetLabel; "Text tools"/"Statistic tools" verified live). Inline per-gap "Add section" zones insert at the exact index. Live smoke C PASS incl. draft-vs-published proof in the dialog.
