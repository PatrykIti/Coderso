# TASK-225: Page Editor Status Badge and Action Locking
# FileName: TASK-225_Page_Editor_Status_Badge_and_Action_Locking.md

**Priority:** High
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-224
**Status:** Done (2026-04-27)

---

## Overview

Tighten two Pages editor header/action details after the preview action cleanup:

- keep the draft status badge visually unchanged;
- render published status with the same green color contract used by the
  `/admin/pages` table;
- prevent save draft and publish mutations from being started at the same time.

## Sub-Tasks

- [x] Reuse the Pages table published color contract for the editor header
  `Published` badge.
- [x] Keep the editor header `Draft` badge on the existing amber styling.
- [x] Disable `Save draft` while publish is running and disable `Publish` while
  save draft is running.
- [x] Add a synchronous in-flight guard so rapid double actions cannot bypass
  disabled button state before React re-renders.
- [x] Cover badge color and rapid save/publish locking in the Pages editor
  Vitest suite.

## Security Contract

- Visibility: internal admin Pages editor UI only.
- Auth model: unchanged existing admin session/API-key access.
- RBAC: unchanged; save draft and publish keep their existing permissions.
- CSRF: unchanged; existing admin write calls keep the shared CSRF client path.
- Rate-limit bucket: unchanged; no API endpoint is added or modified.
- Reject-unknown validation: unchanged; no payload schema changes.
- Anti-abuse: unchanged; this task only prevents concurrent editor mutations.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/page-editor-shell-wave.test.tsx`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/756-2026-04-27-task-225-page-editor-status-badge-and-action-locking.md`

## Closure Notes

- Published status in the editor header now matches the Pages table emerald
  badge treatment.
- Save draft and publish share one in-flight mutation guard, so quick clicks
  cannot start both writes concurrently.
