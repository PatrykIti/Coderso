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
- `_docs/CONTENT_EDITOR_UX.md` if updated
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if updated
- widget docs updated by TASK-251-03-01 if binding-target metadata becomes
  documented source of truth

## Validation Matrix

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- mounted list-canvas suite created for TASK-251-02-01
- additional pure helper coverage for preview-state shaping or widget target
  resolution if new helpers were introduced
- `bun run gates:coderso` if the final diff changes release-gated admin UX
  beyond the targeted suites above

## Documentation Updates Required

- Update all relevant `TASK-251*` statuses and checkbox lists.
- Move `TASK-251*` rows in `_docs/_TASKS/README.md` to `Done` and synchronize
  board statistics.
- Add the matching changelog entry and README index update.
- Update source-of-truth docs touched by the implementation:
  - `_docs/CONTENT_EDITOR_UX.md`
  - `_docs/ADMIN_CACHE.md`
  - `_docs/ADMIN_CACHE_MAP.md`
  - widget docs under `_docs/_WIDGETS/*` if bindable prop targets become
    documented source-of-truth.

## Acceptance Criteria

1. Targeted preview/list-canvas/binding tests pass in the correct Vitest lane.
2. Any new pure helpers or metadata owners have focused regression coverage.
3. Task docs, board rows, statistics, changelog, and touched source docs are
   synchronized on closure.
