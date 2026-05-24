# TASK-336-14: Layout Widget Advanced Technical Token Policy

# FileName: TASK-336-14_Layout_Widget_Advanced_Technical_Token_Policy.md

**Priority:** Medium
**Category:** Widgets + Layout + Advanced Mode Policy
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03, TASK-336-13
**Status:** Done (2026-05-24)

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

- [x] Audit current Advanced controls in all layout widgets.
- [x] Classify each path as daily Visual, technical Advanced, read-only
  summary, or temporary duplicate.
- [x] Add/update `editorContract` metadata for all layout widgets.
- [x] Remove or downgrade duplicate Advanced controls.
- [x] Preserve existing shared truthfulness fixes for Section and Grid Columns.
- [x] Add Vitest UI tests for the policy.
- [x] Add Playwright smoke evidence for representative layout widgets.
- [x] Document the final policy in `_docs/WIDGETS.md`.

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

The helper below is illustrative only. Implementation must first inventory the
real schema paths for the six layout widgets and classify them in a table before
any editor code changes.

Required first-pass classification table:

| Widget | Candidate Visual owner paths | Candidate Advanced technical/read-only paths |
|---|---|---|
| `section` | `layout.containerWidth`, `layout.maxWidth`, `layout.paddingBlock`, `layout.paddingInline`, `style.backgroundColor`, `style.gradientFrom`, `style.gradientTo`, `style.borderColor`, `style.radius`, `style.shadow`, `style.overlayOpacity`, `style.backgroundMedia` | read-only resolved layout/style summary unless a path is explicitly technical-only |
| `grid-columns` | `columns`, `layout.gapX`, `layout.gapY`, `layout.align`, `layout.reverseOnMobile`, `style.cardizeColumns`, column surface paths | read-only span/slot/cardize diagnostics and any explicitly justified technical token |
| `split-layout` | slot/layout/style paths discovered from `splitLayout.tsx` | read-only resolved split diagnostics |
| `stack` | `direction`, `gap`, `align`, `justify`, `wrap` | read-only responsive-resolution summary |
| `spacer` | `height`, `showGuideInEditor` | read-only computed height summary |
| `divider` | `label`, `labelColor`, `labelSize`, `labelWeight`, `labelTransform`, `labelLetterSpacing`, `labelGap`, `thickness`, `color`, `width`, `containerWidth`, `customWidth`, `align`, `lineStyle`, `opacity`, `dashPattern`, `visibility`, `marginTop`, `marginBottom` | read-only computed divider summary |

```ts
type LayoutPathClassification =
  | { owner: "visual"; path: string; reason: string }
  | { owner: "advanced"; path: string; reason: string }
  | { owner: "advanced-readonly"; path: string; reason: string };

function classifyLayoutEditorPath(widgetType: string, path: string): LayoutPathClassification {
  const classification = layoutPathPolicyByWidget[widgetType]?.[path];
  if (!classification) {
    return { owner: "advanced-readonly", path, reason: "Unclassified paths stay read-only until audited" };
  }
  return classification;
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
- Append a dated TASK-336-14 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Layout widgets follow one consistent Advanced-mode token policy.
- Any duplicate writable path is explicitly allowlisted, justified, and
  temporary.
- Existing layout truthfulness fixes are preserved.

## Completion Notes

- `section`, `grid-columns`, `split-layout`, `stack`, `spacer`, and `divider`
  now declare v2 editor contracts with setup-only Wizard ownership, Visual-owned
  daily layout/style controls, and read-only Advanced diagnostics.
- Visible Visual controls avoid raw CSS/code/token text authoring for
  nontechnical users; legacy compatibility controls are hidden, aria-hidden, and
  removed from the tab order.
- Advanced tabs keep normalized payload snapshots and technical summaries for
  debugging without duplicating Visual-owned writable paths.

## Validation Notes

- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts tests/vitest/widgets/section.test.tsx tests/vitest/widgets/gridColumns.test.tsx tests/vitest/widgets/splitLayout.test.tsx tests/vitest/widgets/stack.test.tsx tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/divider.test.tsx tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/ui/grid-columns-editor-wave.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx tests/vitest/ui/split-layout-editor-wave.test.tsx`
- Playwright CLI targeted reports:
  `_docs/PLAYWRIGHT/widget-contract-smoke-section-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-grid-columns-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-grid-columns-advanced-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-split-layout-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-stack-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-spacer-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-divider-2026-05-24.md`,
  `_docs/PLAYWRIGHT/widget-contract-smoke-divider-advanced-2026-05-24.md`.
- Known fixture debt remains outside this leaf: Stack public route
  `/test-stack-0516` still renders the historical empty fixture; full-mode
  Grid/Divider harnas reruns can lose block selection on the third mode reload,
  but dedicated Advanced-mode reruns pass with zero admin/public/fixture/metadata
  gaps.
