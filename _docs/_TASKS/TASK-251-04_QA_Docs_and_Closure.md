# TASK-251-04: QA, Docs, and Closure
# FileName: TASK-251-04_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-251-01, TASK-251-02, TASK-251-03
**Status:** To Do

---

## Overview

Close the residual Custom Screens builder hardening family with targeted
validation, docs/changelog updates, and board synchronization.

This task exists because the implementation touches preview ergonomics, cached
record-backed preview data, `List View` canvas interactions, and widget-owned
binding metadata. Those seams need one explicit closure pass instead of being
left as implicit fallout from code changes.

## Sub-Tasks

No child task files.

## Files to Change

- task-family docs under `_docs/_TASKS/TASK-251*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` when the family adds
  builder-side cached-first preview ownership, changes builder-route warmup, or
  otherwise changes the documented entries-cache contract
- `_docs/ASSISTANT_SITE_BUILDER.md` when the binding slice changes assistant
  active-surface summaries, `writableBindingFields`, or assistant validation
  expectations
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
- `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
- `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` and
  `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` only when their layout-only
  `selected-content-type` contract or non-bindable guidance changes in the same
  family

## Implementation Pseudocode

```md
1. When the family or any owned leaf moves to `In Progress`, update the task
   headers plus `_docs/_TASKS/README.md` tables/statistics immediately instead
   of waiting for final closure.
2. Re-run the exact leaf-owned suites collected by TASK-251-01 through
   TASK-251-03, but keep conditional suites conditional:
   `adminPrefetch.test.ts` and `custom-screen-route-params.test.ts` only when
   builder-route prefetch changes, `entriesClient.test.ts` only when new
   preview/cache helpers are introduced, `custom-screen-entry-draft.test.ts`,
   `bindingResolver.test.ts`, and `capabilities.test.ts` when binding-target
   modes change which bindings count as writable, `custom-screen-schemas.test.ts`,
   `customScreenService.test.ts`, and `customScreensRoutes.test.ts` when
   save-time reject rules / `custom_screen_definition_invalid` route mapping
   change, `admin-context-service.test.ts` and
   `admin-context-catalog-normalizer.test.ts` when assistant binding summaries
   or `writableBindingFields` change, `advanced-modules.test.ts` and
   `admin-shell-nav.test.tsx` when `supportsDedicatedEditor` changes active
   Custom Screen shortcut gating, `custom-screen-records.test.tsx` when
   route-level workspace gating or preview-only copy changes, and the newly
   named owner suites only after their implementing leaves add them to the
   branch.
3. Confirm the final doc set includes every source-of-truth file promised by
   the implementation leaves: content-editor UX docs, widget docs, assistant
   workflow docs when the assistant contract moves, cache docs only when cache
   ownership/behavior changes, board rows, and changelog index.
4. Update `TASK-251*` statuses, checkbox lists, board counts, and changelog
   references in one closure pass after validation is complete, including the
   required task-file date fields used in this repo when a task moves to
   `In Progress` or `Done` (for example `**Started:** YYYY-MM-DD` and
   `**Completed:** YYYY-MM-DD` where applicable).
5. Run `git diff --check` and `bun run precommit` before the final manual
   commit so docs-only drift does not slip through.
```

## Security Contract

- Visibility: internal admin UI, internal docs, and existing internal admin API
  contracts only.
- Auth model: unchanged authenticated admin session for all runtime behavior
  covered by the family.
- RBAC:
  - no closure step may weaken the `content:read` / `content:write`
    boundaries defined in TASK-251-01 through TASK-251-03,
  - docs updates must reflect the existing runtime permissions accurately.
- CSRF:
  - no new route is introduced in closure,
  - any validation note that references writes must continue to describe the
    current CSRF-backed admin client path.
- Rate-limit bucket:
  - no closure step changes current admin read/write bucket ownership.
- Reject-unknown validation:
  - closure docs must keep widget binding-target metadata, preview data, and
    screen-definition updates aligned with the strict schema-first contract
    defined in the implementation leaves.
- Anti-abuse:
  - no public endpoint, nonce flow, or reCAPTCHA change is introduced by this
    family.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entry-draft.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-records.test.tsx` when route-level workspace gating, preview-only messaging, or dedicated-editor readiness copy changes in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/bindingResolver.test.ts` when the shared widget-aware write/read helper changes
- Re-run the owner suites introduced by `TASK-251-01-02`, `TASK-251-02-01`, and
  `TASK-251-03-01` only after they exist in the branch; until then, treat their
  paths as implementation deliverables rather than ready validation proof:
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-preview-data.test.ts`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-list-view-canvas.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts`
- Re-run the existing owner suites below when their touched seams move in the
  same slice:
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenLayoutEditors.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx` when shared `screen-*` widget contract or record-editor binding refresh seams change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx` when preview messaging or core `screen-*` render/normalization ownership moves
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/styleNoneTokens.test.tsx` when `screen-two-column` normalization or style keys change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/capabilities.test.ts` when the set of write-capable `screen-field-value` targets or dedicated-editor support rules changes
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/custom-screen-schemas.test.ts` when persisted binding normalization or save-time reject rules change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/customScreens/customScreenService.test.ts` when persisted definition rejection or save-path error handling changes
- `bun test tests/integration/routes/customScreensRoutes.test.ts` when
  persisted binding reject rules, route validation wiring, or
  `mapCustomScreenError("custom_screen_definition_invalid")` behavior changes in
  the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/admin-context-service.test.ts` when assistant surface binding summaries or `writableBindingFields` change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts` when assistant catalog snapshots or secret-safe binding filtering change
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/use-assistant-admin-context.test.tsx` when active custom screen surface summaries or `writableBindingFields` change in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/advanced-modules.test.ts`
  and `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/admin-shell-nav.test.tsx`
  when `supportsDedicatedEditor` changes active Custom Screen shortcut gating
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts` when the broader `/advanced/custom-screens` prefetch entry or workspace warmup branch changes
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-route-params.test.ts` when `resolveCustomScreenWorkspacePrefetchTarget()` changes the `/advanced/custom-screens/:screenId/entries...` matcher contract or when direct `/advanced/custom-screens/:screenId` builder warmup is introduced in the same slice
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/entriesClient.test.ts` when new preview/cache helpers are introduced
- `bun test tests/unit/widgets/registry.test.ts`
- `bun test tests/unit/widgets/runtimeRegistry.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`

## Documentation Updates Required

- Update all relevant `TASK-251*` statuses and checkbox lists.
- Move `TASK-251*` rows in `_docs/_TASKS/README.md` to `Done` and synchronize
  board statistics.
- Add the matching changelog entry and README index update.
- Update the source-of-truth docs promised by the implemented leaves:
  - `_docs/CONTENT_EDITOR_UX.md`
  - `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` when the family adds
    builder-side cached-first preview ownership, changes builder-route warmup,
    or otherwise changes the documented entries-cache contract
  - `_docs/ASSISTANT_SITE_BUILDER.md` when the binding slice changes assistant
    active-surface summaries, `writableBindingFields`, or assistant validation
    expectations
  - `_docs/WIDGETS.md`
  - `_docs/_WIDGETS/README.md`
  - `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md`
  - `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md`
  - `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` and
    `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md` only when their layout-only
    `selected-content-type` contract or non-bindable guidance changes in the
    same family

## Acceptance Criteria

1. Targeted preview/list-canvas/binding Vitest suites and the required Bun
   smoke/regression lanes for touched seams pass, including `gates:coderso`.
2. Any new pure helpers or metadata owners have focused regression coverage,
   including persistence-path owners, route-level workspace gating owners, and
   write/readiness owners when the binding contract narrows writable prop
   paths.
3. Task docs, board rows, statistics, changelog, and only the source-of-truth
   docs whose contracts actually changed are synchronized on closure.
