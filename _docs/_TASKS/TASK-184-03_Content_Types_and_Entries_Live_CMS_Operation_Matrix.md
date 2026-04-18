# TASK-184-03: Content Types and Entries Live CMS Operation Matrix
# FileName: TASK-184-03_Content_Types_and_Entries_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Engine/Entries
**Estimated Effort:** Large
**Dependencies:** TASK-184-01
**Status:** Done (2026-04-18)

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for Engine/content type and entry operations.

The suite should create a test content type, create entries, search entries by title/slug/status/field values where supported, update single and grouped entries, delete entries, and delete only zero-entry content types.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Content type:
  - create `llm-live-<runId>` content type with simple fields,
  - search by model name in Engine,
  - update model name or schema only if supported by current typed action contract,
  - delete after entries are removed.
- Entries:
  - create multiple draft entries under the test content type,
  - search by title and slug,
  - update one entry title/status/SEO metadata,
  - update counted matching entries where supported,
  - delete selected entries.
- Negative:
  - content type delete with existing entries must be blocked,
  - entry operations without content type scope must return `needs_input`.

## Files to Change

- New live test file for content types and entries.
- Shared live fixture helper from TASK-184-01.
- Existing action mapper/executor tests only if helper contracts change.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: content/entry mutations require existing content permissions.
- CSRF: preserve route/service test ownership from harness.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: `content-type.*` and `entry.*` actions must pass strict schemas.
- Anti-abuse: test prefix required; content type delete blocked while entries exist.
- Secret handling: entry field values must be non-secret fixture data only.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - expected resources created,
  - searches exclude unrelated entries/models,
  - unsafe content type delete is blocked,
  - cleanup removes entries before content type.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/CMS_API.md` if live contract examples are added
- `_docs/_TASKS/README.md`
- changelog on completion

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/contentEntriesLiveMatrix.test.ts`.
- Live matrix seeds provider-scoped content types and entries with disposable `llm-live-*` prefixes.
- OpenAI/OpenRouter live cases cover Engine content type inspection, unsafe content type delete while entries exist, active entry update, active entry delete, zero-entry content type delete, state verification, and cleanup.
- Provider local recovery now supports active entry update/delete paths when provider returns an actionless draft.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/contentEntriesLiveMatrix.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
