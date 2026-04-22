# TASK-194-04-01: Block Toolbar Accessibility Labels and Action Hints
# FileName: TASK-194-04-01_Block_Toolbar_Accessibility_Labels_and_Action_Hints.md

**Priority:** High
**Category:** CMS/Pages + Builder + Accessibility
**Estimated Effort:** Small
**Dependencies:** TASK-194-04
**Status:** To Do

---

## Overview

Add accessible labels and hints to the widget-card toolbar actions in the page
builder.

Current owner seams:

- `core/admin/ui/pages/builder/BlockToolbar.tsx:14-46`
  - buttons render icon-only controls with no `aria-label` or `title`.
- `core/admin/ui/pages/builder/BlockList.tsx:208-215`
  - toolbar is rendered with enough context to pass a block label/index.
- `tests/vitest/pageBuilder/blockList.test.tsx:465-480`
  - existing tests already click toolbar controls via a test double, so they are
    not sufficient proof of the real accessibility contract.

The report explicitly called out the move up, move down, duplicate, and delete
icons as inaccessible and guesswork-driven.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/builder/BlockToolbar.tsx:14-46`
- `core/admin/ui/pages/builder/BlockList.tsx:208-215`
- `core/admin/ui/pages/BlockToolbar.tsx:5-19` only if the legacy/demo toolbar is
  still kept as a public visual leaf and should stay consistent
- `tests/vitest/pageBuilder/blockList.test.tsx:465-480` only if one pass keeps
  an integration assertion after removing or narrowing the toolbar mock
- `tests/vitest/ui/page-leaf-components.test.tsx:25-31` only if the legacy
  toolbar stays in scope

## New Files to Create

- `tests/vitest/pageBuilder/blockToolbar.test.tsx` unless the existing
  `blockList` suite is explicitly changed to exercise the real toolbar component.

## Implementation Direction

- Pass block label context from `BlockList` into `BlockToolbar`.
- Add `aria-label` and `title` to every icon-only action.
- Prove the contract on the real `BlockToolbar` owner; do not count mocked
  `BlockToolbar` usage in `blockList.test.tsx` as sufficient validation.
- Keep labels action-specific:
  - `Move Hero up`
  - `Move Hero down`
  - `Duplicate Hero`
  - `Delete Hero`
- Disabled buttons should still expose their labels.
- Keep destructive affordance explicit on delete (for example via destructive
  hover or title text), aligned with the existing destructive-action language
  used elsewhere in admin UI.

## Security Contract

- Visibility: internal admin builder only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: none; this is an accessibility-only improvement.

## Testing Requirements

- `tests/vitest/pageBuilder/blockToolbar.test.tsx`
  - real toolbar buttons expose `aria-label`/`title`,
  - disabled move buttons still expose labels,
  - delete action keeps destructive affordance metadata/classing if one is
    added.
- `tests/vitest/pageBuilder/blockList.test.tsx`
  - only verify label propagation/context wiring if the suite still touches the
    real toolbar path.
- `tests/vitest/ui/page-leaf-components.test.tsx`
  - update only if the legacy toolbar remains part of the supported surface.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Every icon-only widget-card action has an accessible label.
2. Labels include enough context for screen readers and hover hints.
3. Delete remains visually/semantically identifiable as destructive.
4. Existing action behavior does not change.
