# TASK-174-04-02: Page Widget Block Patch Actions
# FileName: TASK-174-04-02_Page_Widget_Block_Patch_Actions.md

**Priority:** High
**Category:** Assistant/Edit + Page Widgets
**Estimated Effort:** Large
**Dependencies:** TASK-174-02, TASK-174-04
**Status:** To Do

---

## Overview

Expand `page.widget.patch` so the assistant can edit selected page widget block data, not only top-level upsert.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/widgets/validator.ts`
- `core/services/pages/pageService.ts`
- `tests/vitest/assistant/*`
- `tests/unit/assistant/actionExecutorService.test.ts`

## Security Contract

- Visibility: internal assistant action only.
- Auth model: existing admin session.
- RBAC: dry-run requires `content:read`; execute requires `content:write`.
- CSRF: execute endpoint remains CSRF-protected.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: patch schema allows only known block id/path/value operations.
- Anti-abuse: no blind JSON rewrites; selected block must exist unless operation is explicit upsert.
- Idempotency: execute requires idempotency key.
- Secret handling: block config summaries redacted.

## Testing Requirements

- Vitest:
  - pure block patch helpers,
  - selected block path resolution,
  - unsupported widget/config path conflicts.
- Bun:
  - executor updates selected block and preserves unrelated blocks,
  - dry-run before/after summary,
  - route permissions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Assistant can edit selected page widget config after review.
2. Patch preserves unrelated blocks/slots.
3. Unknown paths are blocked rather than broad-rewritten.
