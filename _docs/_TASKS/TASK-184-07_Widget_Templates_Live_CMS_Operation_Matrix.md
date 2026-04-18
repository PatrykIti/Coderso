# TASK-184-07: Widget Templates Live CMS Operation Matrix
# FileName: TASK-184-07_Widget_Templates_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Widget Templates
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** Done (2026-04-18)

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for reusable widget template operations.

The suite should create reusable templates where supported, search by name/category/status, update metadata/settings, patch a selected block data path, delete unreferenced templates, and verify page-instance vs reusable-template ambiguity stays safe.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create:
  - reusable widget template with test prefix and safe blocks.
- Search:
  - by name,
  - by category/status,
  - exclude unrelated templates.
- Update/Patch:
  - rename template,
  - update category/status/settings,
  - patch selected block data path.
- Delete:
  - delete exact unreferenced template,
  - counted delete by prefix.
- Negative:
  - page instance vs reusable template prompt returns `needs_input` when ambiguous,
  - broad template delete blocked.

## Files to Change

- New live test file for widget templates.
- Shared live fixture helper.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: widget template mutations require widget write permissions.
- CSRF: preserve route/service ownership.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `widget-template.*` actions must pass strict schemas.
- Anti-abuse: referenced reusable templates require explicit reviewed target and blast-radius warning.
- Secret handling: no raw secret-like settings in provider prompts/logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - block patch is bounded to data path,
  - unrelated blocks/settings are preserved,
  - cache/catalog invalidation is observable if harness captures client events.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/WIDGET_PACK_MATRIX.md` only if pack readiness changes
- `_docs/_TASKS/README.md`
- changelog on completion

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/widgetTemplatesLiveMatrix.test.ts`.
- OpenAI/OpenRouter live cases cover widget template inspection, active template rename, selected hero block headline patch, broad delete safety, exact active template delete, state verification, and cleanup.
- Active-surface selected-block prompts now prefer local context before provider inference to avoid metadata updates replacing block patches.
- Live fixture hero blocks now use valid widget variants/data so executor validation covers real widget contracts.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/widgetTemplatesLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
