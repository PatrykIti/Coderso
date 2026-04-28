# TASK-151: Sessions Admin UI Assistant Documentation Refresh
# FileName: TASK-151_Sessions_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/settings/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Sessions surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
`/admin/settings/security/sessions` out of the broader security article and
replace it with a guided document that matches the shipped active-session table,
revoke controls, and session-safety guidance workflow.

## Scope

1. Review the current security assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on
   `http://localhost:5173/admin/settings/security/sessions` with an
   authenticated session and record actual behavior.
3. Create a dedicated Sessions doc using the
   `Basic / Medium / Instruction / Advanced` structure with more guided user
   instructions.
4. Update the coverage matrix so `/settings/security/sessions` points to the
   new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the page shell:
   - revoke-all action,
   - local tabs,
   - active-session count badge.
2. Capture the sessions table flow:
   - device/OS,
   - location and IP,
   - last active,
   - current vs active state,
   - revoke action.
3. Capture the current-session guidance block:
   - revoke guidance,
   - change password,
   - security settings shortcut.
4. Rewrite the doc without leaving Sessions only as a sub-section inside the
   broader Security Settings article.

## Acceptance Criteria

1. Sessions has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about active sessions, revoke flow, current-session
   constraints, and security follow-up guidance.
4. The coverage matrix points `/settings/security/sessions` at the new canonical
   doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Sessions UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/settings/*`

## Documentation Updates Required

- `docs/screens/sessions.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-151_Sessions_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Sessions UI on
  `/admin/settings/security/sessions`.
- The walkthrough confirmed:
  - route shell,
  - revoke-all action,
  - local tabs,
  - active-session badge,
  - sessions table,
  - session-safety guidance block.
- The rewritten doc was verified against:
  - `core/admin/ui/settings/SessionsPage.tsx`
  - `core/admin/ui/settings/SessionsTable.tsx`
  - `core/admin/services/sessionsClient.ts`
- No automated lint or test commands were run because this was a docs-only
  change.
