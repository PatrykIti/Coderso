# TASK-184-02: Pages Live CMS Operation Matrix
# FileName: TASK-184-02_Pages_Live_CMS_Operation_Matrix.md

**Priority:** High
**Category:** Assistant/QA + Pages
**Estimated Effort:** Medium
**Dependencies:** TASK-184-01
**Status:** Done (2026-04-18)

---

## Overview

Add live OpenAI/OpenRouter E2E coverage for page operations.

The test should create a deterministic group of pages, ask natural prompts to find pages by title/slug/status, edit single and multiple pages, delete selected pages, and verify unrelated pages are never returned or mutated.

## Sub-Tasks

No child task files.

## Scenario Matrix

- Create pages:
  - two or more pages with shared prefix, for example `llm-live-<runId>-test-alpha`.
  - at least one unrelated published page.
- Search:
  - find published pages by word in title,
  - find by slug fragment,
  - verify unrelated published pages are excluded.
- Update:
  - rename one page by exact title,
  - update status or metadata for counted matching pages when supported.
- Delete:
  - delete two counted pages by title prefix,
  - follow-up confirmation: `tak, te dwie, usun je`.
- Negative:
  - broad "delete all pages" returns `needs_input`.

## Files to Change

- New live test file for pages.
- Shared live fixture helper from TASK-184-01.
- Existing page/action tests only if helper contracts require it.

## Security Contract

- Visibility: internal assistant action tests.
- Auth model: test admin actor.
- RBAC: page execute requires content write/publish permissions as existing contracts require.
- CSRF: preserve route/service test ownership from harness.
- Rate-limit bucket: opt-in live provider.
- Reject-unknown validation: generated `page.*` actions must pass strict schema.
- Anti-abuse: only resources with test prefix may be deleted.
- Secret handling: no page data with secrets and no provider keys in logs.

## Testing Requirements

- OpenAI and OpenRouter live cases.
- Assertions:
  - provider metadata present,
  - expected `page.upsert`, `page.update`, `page.delete` actions where applicable,
  - dry-run ready before execute,
  - final page list matches expected state,
  - unrelated pages unchanged.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- changelog on completion

## Completion Notes (2026-04-18)

- Added `tests/integration/assistant-live/pagesLiveMatrix.test.ts`.
- Live matrix seeds provider-scoped published page fixtures with a disposable `llm-live-*` prefix.
- OpenAI/OpenRouter live cases now cover page create, title search with unrelated exclusion, exact title update, broad delete safety, counted two-page delete, state verification, and cleanup.
- Provider planning now includes explicit create guidance for `mutation.patch.items[]`, and planner recovery can map explicit page create prompt fields to `page.upsert` when provider returns an actionless draft.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/cms-target-resolver.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant-live/pagesLiveMatrix.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/live-cms-harness.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
