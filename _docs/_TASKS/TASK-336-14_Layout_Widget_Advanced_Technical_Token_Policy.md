# TASK-336-14: Layout Widget Advanced Technical Token Policy

# FileName: TASK-336-14_Layout_Widget_Advanced_Technical_Token_Policy.md

**Priority:** Medium
**Category:** Widgets + Layout + Advanced Mode Policy
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-13
**Status:** To Do

---

## Overview

Define and apply a consistent Advanced-mode technical token policy for layout
widgets.

Layout widgets have a different shape from content widgets: some controls that
look visual are also structural or technical layout tokens. This task decides
which Advanced controls are legitimate technical owners and which are duplicate
Visual controls.

## Widgets in Scope

- `section`
- `grid-columns`
- `split-layout`
- `stack`
- `spacer`
- `divider`
- Any layout widget added to the 38-widget inventory before this task starts.

## Policy Decision

- Visual owns normal daily layout and styling controls that authors use to
  design the page.
- Advanced may own technical layout tokens only when they are not better
  represented as daily design controls.
- Advanced may display read-only summaries for Visual-owned tokens.
- Any duplicate writable token requires an explicit `allowedDuplicateWritablePaths`
  entry with reason and expiry task.

## Sub-Tasks

- [ ] Audit current Advanced controls in all layout widgets.
- [ ] Classify each path as daily Visual, technical Advanced, read-only
  summary, or temporary duplicate.
- [ ] Add/update `editorContract` metadata for all layout widgets.
- [ ] Remove or downgrade duplicate Advanced controls.
- [ ] Preserve existing shared truthfulness fixes for Section and Grid Columns.
- [ ] Add Vitest UI tests for the policy.
- [ ] Add Playwright smoke evidence for representative layout widgets.
- [ ] Document the final policy in `_docs/WIDGETS.md`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Add/update contract and preserve Section shared truthfulness fixes. |
| `core/widgets/core/gridColumns.tsx` | Add/update contract and preserve TASK-325 decisions. |
| `core/widgets/core/splitLayout.tsx` | Add/update contract. |
| `core/widgets/core/stack.tsx` | Add/update contract and preserve Stack product follow-ups. |
| `core/widgets/core/spacer.tsx` | Add/update contract. |
| `core/widgets/core/divider.tsx` | Add/update contract. |
| `core/admin/ui/widgets/editors/*Editors.tsx` | Apply Visual/Advanced technical token policy. |
| `tests/vitest/ui/*editor-wave.test.tsx` | Add layout policy assertions. |
| `_docs/WIDGETS.md` | Document Advanced technical token policy. |

## Implementation Pseudocode

```ts
type LayoutPathClassification =
  | { owner: "visual"; path: string; reason: string }
  | { owner: "advanced"; path: string; reason: string }
  | { owner: "advanced-readonly"; path: string; reason: string };

function classifyLayoutEditorPath(path: string): LayoutPathClassification {
  if (path.startsWith("style.") || path.startsWith("layout.daily")) {
    return { owner: "visual", path, reason: "Daily design control" };
  }
  if (path.startsWith("technical.") || path.endsWith("Token")) {
    return { owner: "advanced", path, reason: "Technical layout token" };
  }
  return { owner: "advanced-readonly", path, reason: "Resolved layout summary" };
}
```

Data flow:

- Each layout widget declares contract sections that match the policy.
- Tests validate no Visual-owned path remains writable in Advanced.
- Advanced summaries derive from normalized widget data.
- Runtime layout rendering is unchanged unless a specific widget bug is found
  and split into a dedicated task.

Error handling:

- Do not undo Section/Grid Columns truthfulness decisions from previous tasks.
- If a layout token has both beginner and technical meanings, prefer Visual
  ownership plus Advanced read-only summary.
- If a real duplicate is required, document it as temporary and route removal.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict widget schemas.
- Anti-abuse: no raw CSS/class/script escape hatches.
- Secret handling: no secrets in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- Focused layout editor Vitest suites for touched widgets.
- Focused widget tests for touched layout widgets.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for layout widgets and public CSS fixtures.

Regression-test shape:

- Section/Grid Columns previous truthfulness tests stay green.
- Advanced has no unallowlisted duplicate Visual paths.
- Allowed technical tokens are documented and tested.
- Read-only summaries are not counted as writable controls.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` with the layout Advanced policy.
- Update affected `_docs/_WIDGETS/*` files.
- Update Playwright report rows for layout widgets.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Layout widgets follow one consistent Advanced-mode token policy.
- Any duplicate writable path is explicitly allowlisted, justified, and
  temporary.
- Existing layout truthfulness fixes are preserved.

