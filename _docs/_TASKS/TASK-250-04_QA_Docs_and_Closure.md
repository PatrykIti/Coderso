# TASK-250-04: QA, Docs, and Closure
# FileName: TASK-250-04_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-250-01, TASK-250-02, TASK-250-03
**Status:** To Do

---

## Overview

Close the follow-up only after the screen widget family has broader editor,
runtime, and registry validation, and after the docs clearly explain where
screen widget UX now matches the shared widget system and where it still
intentionally differs from public widgets.

## Sub-Tasks

- [ ] TASK-250-04-01: Screen Widget Editor/Runtime Test Matrix and Documentation Closure

## Files to Change

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` if missing
- `_docs/_WIDGETS/README.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- task-family docs under `_docs/_TASKS/TASK-250*.md`

## Security Contract

- Visibility: internal admin QA flow and source docs only.
- Auth model: authenticated admin session for any replay step.
- RBAC: replay uses only existing content permissions.
- CSRF: unchanged current admin clients for any replayed write.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: docs and replay evidence must match the final
  screen widget contract and test ownership.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- Run the focused suites required by TASK-250-04-01.
- Rerun all targeted lint/type/Vitest/Bun suites collected by TASK-250-01
  through TASK-250-03 before closure.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` if missing
- `_docs/_WIDGETS/README.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Screen widget parity gaps are reflected in tests and docs, not only in code.
2. Closure evidence shows materially improved screen-widget coverage.
