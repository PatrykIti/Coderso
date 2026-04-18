# TASK-180-02-02: Multi Update and Create Planning Boundaries
# FileName: TASK-180-02-02_Multi_Update_and_Create_Planning_Boundaries.md

**Priority:** High
**Category:** Assistant/Core + Bulk Planning Boundaries
**Estimated Effort:** Large
**Dependencies:** TASK-180-02, TASK-174-04, TASK-170-03
**Status:** To Do

---

## Overview

Define and implement conservative boundaries for multi-update and multi-create prompts.

The assistant may help with "many things at once", but only by producing multiple existing typed actions after every target/input is explicit. This leaf prevents the implementation from drifting into broad unreviewed bulk mutation.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/cmsOperationDraftSchema.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `core/services/assistant/actionPlanTypes.ts` only if draft/create input shape changes
- `core/services/assistant/actionPlanSchema.ts` only if draft/create input shape changes
- `core/admin/ui/assistant/components/ActionPlanReview.tsx` if multi-action review readability changes
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts` if schemas change
- `tests/vitest/ui/assistant-panel-interaction.test.tsx` if review UI changes

## Multi-Update Rules

Multi-update can generate many typed update actions only when:

- target count is explicit or selected targets are explicit,
- every target resolves exactly,
- the same bounded patch is valid for every target,
- the action family already has a typed update action,
- generated actions pass strict schema validation.

Supported candidates:

- `page.update`
- `custom-screen.update`
- `form.update`
- `listing-query.update`
- `listing-template.update`
- `widget-template.update`
- `menu.item.update`
- `seo.document.update`
- `entry.update` only when content type and patch contract are explicit.

## Multi-Create Rules

Multi-create can generate many existing typed create/upsert actions only when every resource has explicit validated input.

Allowed direction:

- multiple `page.upsert` from explicit page titles/slugs/content,
- multiple `form.upsert` from explicit form definitions,
- multiple `listing-query.upsert` / `listing-template.upsert` from explicit config,
- multiple `content-type.upsert` / `custom-screen.upsert` only when schemas/bindings are explicit or produced by existing blueprint builders.

Blocked direction:

- no new generic `*.bulk.create` action,
- no provider-defined arbitrary resource array without local schema validation,
- no partial create from vague "make a few pages/forms" prompts,
- no broad update such as "rename all" without exact counted targets and explicit patch.

## Acceptance Criteria

1. Multi-update prompts produce reviewed multi-action plans only for exact safe cases.
2. Multi-create prompts produce reviewed multi-action plans only from explicit validated inputs.
3. Broad or underspecified prompts return `needs_input`.
4. Existing single-target update/create behavior remains unchanged.
5. Review UI remains readable for multi-action plans.

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: dry-run/execute remain authoritative for permissions.
- CSRF: existing assistant action POST routes remain protected.
- Rate-limit bucket: existing `assistant`.
- Reject-unknown validation:
  - create/update draft payloads reject unknown fields,
  - generated actions must pass strict action schemas.
- Anti-abuse:
  - no arbitrary provider-defined bulk action,
  - no direct execution without review,
  - broad prompts must ask for clarification.
- Secret handling:
  - no secret-like settings, webhook secrets, API keys, submissions, cookies, CSRF tokens, or raw provider packages in plans/review metadata.

## Testing Requirements

- Vitest:
  - multi-update happy paths for at least two resource families,
  - multi-update blocked when one target cannot accept the patch,
  - multi-create happy path only for explicit validated input,
  - vague multi-create returns `needs_input`,
  - strict schemas reject unknown fields if schema changes.
- UI:
  - bulk review renders every action and count if UI rendering changes.
- Validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts`
  - add `tests/vitest/ui/assistant-panel-interaction.test.tsx` if review UI changes.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md` if bulk planning policy changes
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
