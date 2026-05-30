# TASK-343-20: Search Box Audit Remediation Family

# FileName: TASK-343-20_Search_Box_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Search Box + Accessibility + Admin UI + Runtime + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Close the Search Box report drift where the public section and input lack
accessible naming, source checkbox state can look stale until reload, default
theme colors are labeled as custom, and `compact` display is nearly inert in
`listing` mode without a truthful explanation.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_SEARCH_BOX_WIDGET.md:284-390`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/widgets/core/searchBox.tsx`

## Sub-Tasks

- [x] Add a stable accessible name for the Search Box section and a real label
  or `aria-label`/`aria-labelledby` for the search input.
- [x] Make source checkbox toggles in the rendered global branch visually
  reflect current state immediately, not only through emitted markup or reload.
- [x] Route theme-token color label fixes through the shared color-state owner
  in `TASK-343-30`, while preserving Search Box-specific tests for the surface.
- [x] Make `compact` in `listing` mode either visibly meaningful or explicitly
  documented as limited to the `route-submit` branch.

## Implementation Notes

- Added widget-scoped section heading and input label/id wiring across
  placeholder, listing runtime, route-submit, and global Search Box branches.
- Made global source checkboxes controlled by widget data in React preview so
  data updates immediately refresh live `.checked` state while public SSR keeps
  ordinary source inputs for form submission.
- Applied compact layout semantics to listing mode: narrower shell, tighter
  spacing, single-line input row, and collapsed helper description copy.
- Passed Search Box default theme tokens into `SharedColorControl` as
  `Theme default` values while keeping cleared color fields as `No inline color`.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SearchBoxEditors.tsx` | Fix compact/listing copy and color-state integration points. |
| `core/widgets/core/searchBox.tsx` | Add section/input accessible names, fix global source checkbox state truthfulness, and make compact-mode semantics truthful. |
| `tests/vitest/widgets/searchBox.test.tsx` | Cover public a11y and compact/listing render semantics. |
| `tests/vitest/ui/search-box-editor-wave.test.tsx` | Cover source toggle state and color/default messaging. |

## Implementation Pseudocode

```ts
function resolveSearchBoxA11y(data: SearchBoxData, blockId: string) {
  const titleId = data.title ? `search-box-${blockId}-title` : undefined;
  return {
    section: titleId ? { "aria-labelledby": titleId } : { "aria-label": "Search" },
    inputId: `search-box-${blockId}-input`,
  };
}

function resolveCompactModeNotice(mode: SearchBoxMode, displayMode: SearchBoxDisplayMode) {
  return mode === "listing" && displayMode === "compact" ? "limited_in_listing_runtime" : "active";
}
```

The stale checkbox finding is in `SearchBoxBlock`'s global render branch
(`defaultChecked` state), not only in the editor component. The implementation
may add these helpers or fix the branch inline, but tests must exercise the
renderer path.

## Regression Test Shape

- Public Search Box has named section/input semantics.
- Source checkboxes update their checked state without reload.
- `compact` mode communicates when it has limited runtime effect.

## Security Contract

No API routes are added. Existing search query validation and safe route
handling must remain unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/search-box-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_SEARCH_BOX_WIDGET.md`.
- Update `_docs/_WIDGETS/SEARCH_BOX.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Search Box is accessible without relying on placeholder text.
- Editor state and display-mode copy match the actual rendered branch.
