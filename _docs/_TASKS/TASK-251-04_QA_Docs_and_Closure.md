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
- `_docs/WIDGETS.md` if widget-owned binding targets become canonical source of
  truth
- widget docs updated by TASK-251-03-01 if binding-target metadata becomes
  documented source of truth

## Implementation Pseudocode

```md
1. Re-run the exact targeted Vitest suites collected by TASK-251-01 through
   TASK-251-03.
2. Confirm the final doc set includes every source-of-truth file promised by
   the implementation leaves: cache docs, content-editor UX docs, widget docs,
   board rows, and changelog index.
3. Update `TASK-251*` statuses, checkbox lists, board counts, and changelog
   references in one closure pass after validation is complete.
4. Run `git diff --check` and `bun run precommit` before the final manual
   commit so docs-only drift does not slip through.
```

## Security Contract

- Visibility: internal admin UI, internal docs, and existing internal admin API
  contracts only.
- Auth model: unchanged authenticated admin session for all runtime behavior
  covered by the family.
- RBAC:
  - no closure step may weaken the `content:read` / `content:write` /
    `content:publish` boundaries defined in TASK-251-01 through TASK-251-03,
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
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-page.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-binding-panel.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx`
- mounted list-canvas suite created for TASK-251-02-01
- additional pure helper coverage for preview-state shaping or widget target
  resolution if new helpers were introduced
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`

## Documentation Updates Required

- Update all relevant `TASK-251*` statuses and checkbox lists.
- Move `TASK-251*` rows in `_docs/_TASKS/README.md` to `Done` and synchronize
  board statistics.
- Add the matching changelog entry and README index update.
- Update source-of-truth docs touched by the implementation:
  - `_docs/CONTENT_EDITOR_UX.md`
  - `_docs/ADMIN_CACHE.md`
  - `_docs/ADMIN_CACHE_MAP.md`
  - `_docs/WIDGETS.md`
  - widget docs under `_docs/_WIDGETS/*` if bindable prop targets become
    documented source-of-truth.

## Acceptance Criteria

1. Targeted preview/list-canvas/binding tests pass in the correct Vitest lane.
2. Any new pure helpers or metadata owners have focused regression coverage.
3. Task docs, board rows, statistics, changelog, and touched source docs are
   synchronized on closure.
