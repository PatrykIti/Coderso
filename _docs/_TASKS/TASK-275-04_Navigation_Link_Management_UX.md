# TASK-275-04: Navigation Link Management UX

# FileName: TASK-275-04_Navigation_Link_Management_UX.md

**Priority:** Medium
**Category:** Widgets + Navigation + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-275, TASK-275-01, TASK-275-03
**Status:** To Do

---

## Overview

Improve repeated-link authoring in the Navigation Visual editor. Users need a
bounded, understandable way to reorder main links and sub-links, understand
limits, distinguish parent links from child links, and see what a synced menu
will render.

Prefer keyboard-accessible move buttons first. Drag-and-drop is allowed only if
it follows existing repo patterns and does not add a heavy new dependency
without approval.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:86-95` - no link reordering,
  disabled 8-link limit lacks feedback, and sub-link limits are inconsistent.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:181-186` - Wizard shows only
  three quick links without enough state, and Visual does not clearly separate
  links from sub-links.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:271-280,323-333` - browser tests
  confirm missing synced-menu preview and limit feedback.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:418,425-427` - prioritized menu
  preview, limit, and reorder fixes.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add move-up/move-down controls for top-level links and sub-links, visible limit helper text, disabled-state reasons, clearer parent/child grouping, Wizard quick-link count/overflow summary, and read-only menu-source previews for current synced `items`. |
| `core/widgets/core/navigation.tsx` | Update constants or schema only if link/sub-link limits become persisted or normalized. Prefer editor-only limits if runtime already supports existing payloads safely. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert reorder operations preserve item data, child reorder operations are scoped to the parent, limit feedback appears, Wizard quick-link count/overflow state is truthful, menu previews show synced links, and remove controls remain bounded. |
| `tests/vitest/widgets/navigation.test.tsx` | Run/update only if normalization, runtime ordering, or limits change. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document link management limits, reorder behavior, and synced-menu preview. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for reorder, limit, preview, and editor grouping findings. |

## Implementation Pseudocode

```tsx
const MAX_NAVIGATION_ITEMS = 8;
const MAX_NAVIGATION_CHILD_ITEMS = 6;

function moveItem(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  update({ items: next });
}

function moveChild(itemIndex: number, childIndex: number, direction: -1 | 1) {
  const next = [...items];
  const children = [...(next[itemIndex].children ?? [])];
  const target = childIndex + direction;
  if (target < 0 || target >= children.length) return;
  [children[childIndex], children[target]] = [children[target], children[childIndex]];
  next[itemIndex] = { ...next[itemIndex], children };
  update({ items: next });
}

function NavigationMenuPreview({ items }: { items: NavigationItem[] }) {
  if (items.length === 0) return <p>No synced links yet.</p>;
  return items.map((item) => (
    <div key={`${item.href}:${item.label}`}>
      <span>{item.label}</span>
      <span>{item.href}</span>
      {item.children?.length ? <span>{item.children.length} sub-links</span> : null}
    </div>
  ));
}
```

Error handling:

- Move controls should no-op at list boundaries and expose disabled reasons.
- Add controls should explain the max instead of silently disabling.
- Removing a parent link must not accidentally move child links into another
  parent.
- Menu previews must not clear or mutate synced `items`; they are read-only
  evidence of the current selected menu payload.
- Keep the existing minimum item count unless the task explicitly changes and
  tests the policy.

## Data Flow

1. Manual editor state owns reorder actions for top-level `items[]` and nested
   `children[]` arrays.
2. Wizard mode derives a first-three quick-link summary plus an overflow count
   from the same `items[]` array instead of hiding additional configured links.
3. Menu-source mode consumes the resolved `items[]` payload as read-only
   preview data; preview rendering never mutates or persists source-menu data.
4. Editor updates call the existing widget update path with reordered arrays.
5. Focused Vitest coverage asserts item order, child scope, disabled-state copy,
   Wizard overflow state, and synced preview output.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged unless persisted limit fields are added.
- Anti-abuse: previewed link labels and hrefs render as React text. No raw
  HTML, script, or unbounded class-name input is introduced.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx` if runtime
  normalization or limits change.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-04_Navigation_Link_Management_UX.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Top-level links and sub-links can be reordered without manual retyping.
- Limit states explain why an add action is disabled.
- Wizard quick links show truthful count/overflow state when more than three
  links exist.
- Parent link rows and sub-link rows are visually distinct in the editor.
- Menu-source mode shows read-only synced links and child counts.
- Reorder, preview, and limit behavior is covered by focused editor tests.
