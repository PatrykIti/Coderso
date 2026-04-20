# TASK-191-04: Page Builder Branch Coverage Closure
# FileName: TASK-191-04_Page_Builder_Branch_Coverage_Closure.md

**Priority:** Medium
**Category:** QA + Admin/UI + Page Builder
**Estimated Effort:** Medium
**Dependencies:** TASK-191
**Status:** Done (2026-04-20)

---

## Overview

Close the remaining useful Vitest branch gaps in Page Editor and Page Builder
UI/model code.

The Pages UI has strong line coverage after the existing `TASK-105-05` waves,
but branch coverage still identifies focused gaps:

- `core/admin/ui/pages/builder/AdvancedPanel.tsx`
- `core/admin/ui/pages/builder/BlockList.tsx`
- `core/admin/ui/pages/builder/blockUtils.ts`
- `core/admin/ui/pages/builder/BlockSettings.tsx`
- `core/admin/ui/pages/PageCreateDrawer.tsx`
- `core/admin/ui/pages/PagePreview.tsx`
- residual Page Editor shell branches that are worth testing as behavior, not
  only as metric closure.

Do not add brittle implementation-only tests. Every new assertion should map to
a user-visible editor behavior, normalized block contract, or stable helper
contract from `_docs/PAGE_MODEL.md`.

## Sub-Tasks

- Expand Page Builder helper tests:
  - invalid path handling,
  - moving unknown block ids,
  - repeatable slot min/max no-op cases,
  - legacy `children` to `slots.default` fallback where not already covered,
  - block creation defaults for less common widget slot definitions.
- Expand `AdvancedPanel` branch tests:
  - optional/missing layout and visibility values,
  - disabled/inherited token combinations,
  - callback routing for editor mode, layout, and visibility changes.
- Expand `BlockList` branch tests:
  - empty nested slots,
  - invalid drag tokens,
  - invalid drop target paths,
  - keyboard selection/movement edge cases,
  - selected/missing widget labels.
- Expand page shell leaf branch tests:
  - `PageCreateDrawer` disabled submit/error/loading and slug normalization
    edges not already covered.
  - `PagePreview` missing query/window-close fallback.
  - Page Editor shell residual branches only where they represent stable UX.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: tests use component-level mocks; real auth is server-owned.
- RBAC: UI may disable/hide actions based on props/state, but server remains
  authoritative.
- CSRF: not directly exercised by component tests; client mutation CSRF belongs
  to `TASK-191-03`.
- Rate-limit bucket: not applicable at component-test level.
- Reject-unknown validation: builder helper tests should preserve schema-first
  contracts and not add ad-hoc invalid production fallbacks.
- Anti-abuse: no public write surface.
- Secret handling: do not put secrets, preview tokens, or privileged settings
  in component fixtures.

## Testing Requirements

- Update or add Vitest suites:
  - `tests/vitest/pageBuilder/blockList.test.tsx`
  - `tests/vitest/pageBuilder/blockSettings-wave.test.tsx`
  - `tests/vitest/pageBuilder/advancedPanel.test.tsx`
  - `tests/vitest/pageBuilder/advancedPanelLeaf.test.tsx`
  - `tests/vitest/ui/page-post-list-wave.test.tsx`
  - `tests/vitest/ui/page-preview.test.tsx`
  - `tests/vitest/ui/page-editor-shell-wave.test.tsx` only for stable shell
    branches.
- Run:
  - `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/pageBuilder tests/vitest/ui/page-post-list-wave.test.tsx tests/vitest/ui/page-preview.test.tsx tests/vitest/ui/page-editor-shell-wave.test.tsx`

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` only if a tested builder behavior reveals a contract gap.
- `_docs/_TASKS/README.md` when status changes.
- `_docs/_CHANGELOG/*` on completion.

## Completion Notes (2026-04-20)

- Expanded Page Builder helper coverage for no-op move/update/delete/duplicate
  branches, fallback insertion, invalid repeatable slots, parent-to-descendant
  move prevention, flatten traversal, and editor stripping for nested
  slots/legacy children.
- Added `AdvancedPanel` fallback coverage for missing variant, missing
  visibility, and invalid layout sanitization.
- Focused Page Builder coverage now reports `96.24%` lines and `80.79%`
  branches for `core/admin/ui/pages/builder/*`; `blockUtils.ts` reports
  `98.31%` lines and `80.45%` branches in the focused coverage run.
- No Page Builder model contract changes were required.

## Validation (2026-04-20)

- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts tests/vitest/pageBuilder`
- `set -a && source .env && set +a && bun run vitest run --config vitest.config.ts --coverage tests/vitest/pageBuilder`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
