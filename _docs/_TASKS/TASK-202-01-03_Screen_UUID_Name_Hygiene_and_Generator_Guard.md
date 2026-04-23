# TASK-202-01-03: Screen UUID Name Hygiene and Generator Guard
# FileName: TASK-202-01-03_Screen_UUID_Name_Hygiene_and_Generator_Guard.md

**Priority:** Medium
**Category:** CMS/Engine + Custom Screens + Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01, TASK-202-03
**Status:** To Do

---

## Overview

Investigate and stop the source of `Screen <uuid>` content type names reported
in `BUG-7`. The short-term fix is not a blind cleanup script. First identify the
writer, then add a guard at that owner seam and use the safe delete/archive path
from `TASK-202-03` for cleanup.

## Sub-Tasks

No child task files.

## Files to Inspect or Change

- `core/services/assistant/actionExecutorService.ts:2731-2762`
  - content type upsert execution.
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
  - generated catalog/screen naming inputs.
- `core/services/customScreens/customScreenService.ts:123-154`
  - custom screen creation normalization.
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx:451-493`
  - custom screen content type selection UI.
- `core/services/content/typeService.ts:63-76`
  - content type creation guard if the writer is generic.
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/vitest/assistant/actionExecutorService.test.ts` or the current
  assistant executor owner suite.

## Security Contract

- Visibility: internal admin/generator paths only.
- Auth model: unchanged for the owning path.
- RBAC: content type creation still requires `content:write`.
- CSRF: unchanged for admin UI creation; assistant execution keeps existing
  review/execute safeguards.
- Rate-limit bucket: existing admin/assistant buckets.
- Reject-unknown validation: generated names and slugs must pass existing
  content type validation.
- Anti-abuse:
  - do not auto-delete existing records in this leaf,
  - generated names must be human-readable and deterministic,
  - source tracing must not log secrets or raw entry data.

## Testing Requirements

- Unit/Vitest coverage for the identified generator guard.
- Regression proving UUID-like fallback names are rejected or converted into a
  readable deterministic label.
- Manual inventory note in closure documenting which path created the reported
  records.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The source of `Screen <uuid>` content type names is identified.
2. The owning path no longer creates unreadable UUID-based content type names.
3. Cleanup of existing records is deferred until safe delete/cleanup evidence
   exists.
