# TASK-180-02-01: Counted Delete and Archive Target Planning
# FileName: TASK-180-02-01_Counted_Delete_and_Archive_Target_Planning.md

**Priority:** High
**Category:** Assistant/Core + Destructive Planning
**Estimated Effort:** Medium
**Dependencies:** TASK-180-02, TASK-174-03
**Status:** To Do

---

## Overview

Extend counted multi-target delete/archive planning beyond the page regression from changelog `667`.

The user should be able to ask for multiple exact resources by count, and the assistant should generate one reviewed typed action per target when the resolver can prove the count and every action is safe.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts` if planner orchestration behavior changes

## Supported Families

Counted delete/archive prompts can produce many reviewed typed actions for:

- `page.delete`
- `custom-screen.delete`
- `form.delete`
- `form.archive`
- `listing-query.delete`
- `listing-template.delete`
- `widget-template.delete`
- `menu.item.delete`
- `seo.document.delete`
- `content-type.delete` only when every matched content type has zero entries
- `entry.delete` only when `contentTypeSlug` is known for every target

## Blocking Rules

Return `needs_input` when:

- `expectedCount` is missing for a partial/broad destructive prompt,
- matched count differs from `expectedCount`,
- a target cannot build a strict typed action,
- content type candidates have entries,
- form hard delete is unsafe and should be archive/blocked by existing service rules,
- listing query/template reference checks would block in dry-run/execute,
- entry type slug is missing,
- prompt can mean page instance vs reusable widget template.

## Acceptance Criteria

1. Existing counted page delete regression remains green.
2. Counted custom screen/form/listing/widget/menu/SEO/content-type/entry cases are covered.
3. Mismatched counts return `needs_input` with candidates.
4. Generated plans include one action per target and preserve review flow.
5. No broad delete/archive plan is generated from vague prompts.

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: execute permissions remain enforced by action family contracts.
- CSRF: existing planning route CSRF unchanged.
- Rate-limit bucket: existing `assistant`.
- Reject-unknown validation: generated actions must pass strict action schemas.
- Anti-abuse: destructive multi-target planning requires counted or explicit exact target resolution.
- Secret handling: candidates/plans must not expose form submissions, raw configs with secrets, provider payloads, API keys, cookies, or CSRF tokens.

## Testing Requirements

- `tests/vitest/assistant/cms-target-resolver.test.ts`
  - counted partial matches for non-page families,
  - count mismatch returns ambiguous/needs-input path.
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
  - one multi-delete/archive plan per supported safe family,
  - blocked unsafe families return `needs_input`.
- Optional `tests/vitest/assistant/actionPlannerService.test.ts` if route-level planning orchestration changes.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts`

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md` if destructive planning policy changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
