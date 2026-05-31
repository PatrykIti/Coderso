# TASK-285-05: Split Layout Gap Labels and Spacing Context

# FileName: TASK-285-05_Split_Layout_Gap_Labels_and_Spacing_Context.md

**Priority:** Low
**Category:** Widgets + Admin UI + Design Tokens
**Estimated Effort:** Medium
**Dependencies:** TASK-285, TASK-256-02
**Status:** Done (2026-05-21)

---

## Overview

Improve Split Layout gap labels from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-04.

BUG-02 duplicate `None`/`Gap 0` semantics are owned by TASK-256-02. That
shared token decision landed on 2026-05-17. This leaf consumes it and adds
Split Layout-specific spacing context without changing the global `none`/zero
contract.

## Sub-Tasks

- [x] Replace vague `Gap N` labels with labels that include the design-token
  scale or resolved spacing context approved by TASK-256.
- [x] Add concise helper copy that explains the gap affects space between the
  left and right panes.
- [x] Keep labels derived from the current token map, not hardcoded duplicate
  values in the editor.
- [x] Preserve `splitLayoutGapTokens` compatibility until TASK-256 decides
  whether `none` and `0` both remain valid serialized values.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Use a Split Layout gap-label resolver and add helper copy. |
| `core/widgets/core/splitLayout.tsx` | Export or own a pure gap-label/metadata map only if shared token helpers do not already provide it. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Assert gap labels and helper copy. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Add tests only if the widget owner exports a new gap metadata resolver. |
| `tests/vitest/widgets/styleNoneTokens.test.tsx` | Run/update only when this leaf consumes final shared token semantics. |

## Implementation Pseudocode

```tsx
type SplitLayoutGapOption = {
  id: SplitLayoutGap;
  label: string;
  description: string;
};

const splitLayoutGapDescriptions: Record<SplitLayoutGap, string> = {
  none: "No pane gap",
  "0": "Legacy zero pane gap",
  "1": "Compact pane gap",
  "2": "Small pane gap",
  "3": "Small-medium pane gap",
  "4": "Medium pane gap",
  "5": "Medium-large pane gap",
  "6": "Default pane gap",
  "8": "Large pane gap",
  "10": "Extra-large pane gap",
  "12": "Max pane gap",
};

function getSplitLayoutGapOptions(): SplitLayoutGapOption[] {
  return splitLayoutGapTokens.map((token) => ({
    id: token,
    label: token === "none" ? "None" : `Gap ${token}`,
    description: splitLayoutGapDescriptions[token],
  }));
}
```

Editor flow:

1. Consume the final TASK-256 token metadata/labeling helper only if TASK-256
   ships one; otherwise keep the Split Layout resolver static and owner-local.
2. Build the Split Layout options from `splitLayoutGapTokens`, not a separate
   editor-only token list.
3. Show labels/descriptions in Wizard, Visual, and Advanced wherever a gap
   control remains mode-appropriate.
4. Do not remove or remap serialized tokens in this leaf unless TASK-256 has
   already landed that migration.

Error handling:

- Missing token metadata falls back to stable labels without throwing.
- Unknown saved gap values normalize through `normalizeSplitLayoutData()`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless TASK-256 changes serialized token
  values.
- Anti-abuse: labels and descriptions must come from static token metadata, not
  user-controlled HTML or class strings.
- Secret handling: no secrets in token metadata, widget data, diagnostics, or
  report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx` if a
  widget-owned gap metadata helper is added
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` when
  final TASK-256 token semantics are consumed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before a manual commit for this leaf, also run the TASK-285 implementation
  baseline: `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-04 evidence
  after implementation.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` gap-token notes when labels or
  semantics change.
- Update `_docs/WIDGETS.md` only if TASK-256 changes the shared spacing-token
  contract.

## Changelog Policy

- Covered by the TASK-285 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Gap options communicate useful spacing context.
- Split Layout does not duplicate or contradict TASK-256 `none`/zero decisions.
- Serialized gap compatibility is preserved unless the shared token task ships a
  tested migration.

## Completion Notes (2026-05-21)

- Gap labels now include rem/px scale context and describe how the selected token changes the space between panes.
- Legacy serialized `"0"` values still render and validate, but the editor resolves them through the canonical zero-gap control state and helper copy.
