# TASK-192: Assistant Admin Menu Resource Catalog Repair
# FileName: TASK-192_Assistant_Admin_Menu_Resource_Catalog_Repair.md

**Priority:** High
**Category:** Assistant/Core + Admin Context + CMS Resource Catalog
**Estimated Effort:** Medium
**Dependencies:** TASK-188, TASK-189, TASK-191
**Status:** Done (2026-04-20)

---

## Overview

Repair `LLM Guide` resource visibility for admin sidebar/menu sections that are
represented in operation policy and Admin UI but are missing or incomplete in
the assistant resource catalog/resolver path.

Observed user-facing failures:
- `pokaz mi wszystkie posty` returns no candidates even when Posts has published
  and draft records.
- Left/admin menu areas such as Menus, Media, Entries, Screens, Commerce, and
  Solution Kits are not consistently inspectable from LLM Guide prompts.
- A TypeScript diagnostic in `tests/vitest/assistant/actionPlannerService.test.ts`
  reads `action.input.name` without narrowing the action type.

This task must not touch TASK-190 blueprint-composer planning. It is a repair of
the existing TASK-188/TASK-189 operation-policy planner and admin resource
catalog path.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/assistant/adminContextTypes.ts`
- `core/services/assistant/adminContextCatalogNormalizer.ts`
- `core/services/assistant/adminContextCatalogs.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/operationPolicy/resolverPolicy.ts`
- `tests/vitest/assistant/admin-context-catalog-normalizer.test.ts`
- `tests/vitest/assistant/admin-context-catalogs.test.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entry on completion

## Technical Scope

Add bounded/redacted catalog summaries for:

- posts,
- entries,
- media,
- commerce products,
- commerce collections,
- solution kits.

Confirm existing coverage for:

- menu items from `menus`,
- screens from `customScreens`.

Update resolver candidates for:

- `post`,
- `entry`,
- `media`,
- `commerce`,
- `solution-kit`.

Fix read-only routing so `pokaz/list/show` prompts inspect resources rather
than falling into update/needs-input when the prompt does not contain a mutation
verb.

Fix test type narrowing:

```ts
const deleteActions = plan.actions.filter(
  (action): action is Extract<AssistantPlannedAction, { type: "custom-screen.delete" }> =>
    action.type === "custom-screen.delete"
);
expect(deleteActions.map((action) => action.input.name)).toEqual([...]);
```

## Security Contract

- Visibility: internal assistant planning/inspection only.
- Auth model: existing admin session on assistant plan route.
- RBAC:
  - resource catalog hydration still happens server-side through existing
    assistant route permissions,
  - execute/dry-run permissions remain unchanged and authoritative.
- CSRF: no route changes.
- Rate-limit bucket: existing `assistant` bucket.
- Reject-unknown validation:
  - normalized catalog summaries remain bounded and schema-versioned,
  - unknown catalog fields are ignored, not exposed.
- Anti-abuse:
  - read-only inspections return `actions: []`,
  - gated domains such as commerce/solution kits remain non-executable unless
    a typed action contract already exists.
- Public-write hardening: not applicable; no public write endpoint.
- Secret handling:
  - no raw entry values,
  - no raw post data,
  - no media signed URLs/secrets,
  - no commerce payment secrets,
  - no solution-kit internal install payloads.

## Testing Requirements

- Vitest:
  - resource catalog normalizes all added groups,
  - default deps load all added groups,
  - resolver returns candidates for posts, entries, media, commerce, solution
    kits, menus, and screens,
  - planner responds to representative prompts:
    - `pokaz mi wszystkie posty`,
    - `pokaz menu`,
    - `pokaz media`,
    - `pokaz entries`,
    - `pokaz screens`,
    - `pokaz commerce`,
    - `pokaz solution kits`,
  - custom-screen delete test narrows action type before reading `input.name`.
- Commands:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - targeted assistant Vitest if planner/resolver behavior changes broadly,
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- DB-backed smoke when feasible:
  - hydrate default assistant resource catalog from `.env`,
  - verify real posts appear in `pokaz mi wszystkie posty`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` resource catalog context list.
- `_docs/SECURITY_SPEC.md` bounded/redacted catalog guarantees.
- `_docs/_TASKS/README.md` status/statistics.
- `_docs/_CHANGELOG/README.md` and new changelog entry on completion.

## Completion Notes (2026-04-20)

- Added bounded assistant resource catalog summaries for posts, entries, media,
  commerce products/collections, and solution kits.
- Kept menu items available for item-level actions and added a separate read-only
  `menu` policy/resource path so prompts such as `pokaz menu` inspect full menus.
- Confirmed custom screens already flow through `customScreens`, and added
  representative planner coverage for `pokaz screens`.
- Added resolver candidates for `post`, `entry`, `media`, `menu`, `commerce`, and
  `solution-kit`.
- Changed read-only operation inference so `pokaz/show/list` prompts inspect
  resources instead of falling into update needs-input.
- Fixed the TypeScript narrowing issue in `actionPlannerService.test.ts` by
  filtering to `custom-screen.delete` actions before reading `input.name`.

## Validation (2026-04-20)

- `bun --cwd core lint:types`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/operation-policy-resolver.test.ts tests/vitest/assistant/operation-policy-safety.test.ts tests/vitest/assistant/operation-policy-follow-up.test.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/operation-policy-admin-surfaces.test.ts tests/vitest/assistant/operation-policy-coverage.test.ts tests/vitest/assistant/live-coverage-matrix.test.ts tests/vitest/assistant/cms-operation-fixtures.test.ts tests/vitest/assistant/operation-policy-cms-resources.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/assistant/admin-context-catalogs.test.ts`
- `bun --cwd core lint`
- DB-backed smoke with `.env` verified real default catalog counts and inspection
  responses for:
  - `pokaz menu`,
  - `pokaz media`,
  - `pokaz entries`,
  - `pokaz screens`,
  - `pokaz commerce`,
  - `pokaz solution kits`,
  - `pokaz posty`.
