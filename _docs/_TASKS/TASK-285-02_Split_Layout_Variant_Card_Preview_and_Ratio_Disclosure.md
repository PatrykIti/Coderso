# TASK-285-02: Split Layout Variant Card Preview and Ratio Disclosure

# FileName: TASK-285-02_Split_Layout_Variant_Card_Preview_and_Ratio_Disclosure.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-285, TASK-256-05-02, TASK-285-01
**Status:** Done (2026-05-21)

---

## Overview

Improve Split Layout variant-card UX from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` without duplicating the shared
variant/data sync fix:

- ISSUE-01: two ratio systems can look contradictory when variant cards and
  ratio dropdowns disagree.
- ISSUE-05: variant cards lack a visual preview of the split shape.

TASK-256-05-02 owns the actual atomic update from variant selection to persisted
ratio data. That shared behavior landed on 2026-05-17. This leaf consumes it
and adds only Split Layout-specific visual disclosure and previews.

## Sub-Tasks

- [x] Add graphical miniatures to the 50/50, 40/60, and 60/40 variant cards.
- [x] Display the effective desktop/tablet/mobile ratio summary near the cards.
- [x] Make override state explicit when detailed ratio dropdowns differ from
  the selected preset.
- [x] Consume the TASK-256 atomic variant+data helper instead of reimplementing
  it in `SplitLayoutEditors.tsx`.
- [x] Preserve keyboard-accessible button/card behavior.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/splitLayout.tsx` | Expose or reuse a pure ratio-span display helper so editor miniatures stay tied to the widget owner. |
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Add ratio miniatures, effective-ratio copy, override indicators, and call the final shared variant patch path. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Assert miniatures, selected/override states, ratio summary copy, and atomic helper consumption behavior. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Update if widget definition metadata, SSR markers, or exported pure ratio helpers change. |
| `tests/vitest/pageBuilder/visualPanel.test.tsx` | Run/update only if consuming the shared atomic helper changes VisualPanel behavior. |

## Implementation Pseudocode

```tsx
function SplitRatioMiniature({ ratio }: { ratio: SplitLayoutRatio }) {
  const spans = getSplitLayoutRatioSpans(ratio);
  return (
    <span aria-hidden="true" className="grid grid-cols-12 gap-1">
      <span style={{ gridColumn: `span ${spans.left}` }} />
      <span style={{ gridColumn: `span ${spans.right}` }} />
    </span>
  );
}

function getRatioDisclosure(data: SplitLayoutData, variant: SplitLayoutVariantId) {
  const normalized = normalizeSplitLayoutData(data, variant);
  const rawRatio = data.ratio as
    | (NonNullable<SplitLayoutData["ratio"]> & { mobile?: SplitLayoutRatio })
    | undefined;
  const desktop = normalized.ratio?.desktop ?? variant;
  const tablet = normalized.ratio?.tablet ?? desktop;
  const mobile = normalized.ratio?.mobile ?? tablet;
  const hasExplicitMobile = typeof rawRatio?.mobile !== "undefined";

  return {
    desktop,
    tablet,
    mobile,
    hasOverride:
      desktop !== variant || tablet !== variant || (hasExplicitMobile && mobile !== variant),
  };
}
```

Editor flow:

1. Resolve the selected variant and normalized ratios.
2. Render each card with a non-interactive miniature plus text label.
3. Show concise current-ratio copy, for example `Desktop 60/40, tablet 50/50`.
4. On card selection, call the final shared atomic variant patch path from
   TASK-256; do not write a Split Layout-only fallback that can race.

Error handling:

- Consume the landed shared helper. If the current branch regresses it, restore
  the TASK-256-05-02 path rather than creating a one-off variant patch.
- Invalid ratios normalize through `normalizeSplitLayoutData()`.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless this leaf adds persisted fields.
- Anti-abuse: miniatures use bounded ratio tokens and static styling only; no
  user-controlled class names or raw HTML.
- Secret handling: no secrets in editor diagnostics or browser storage.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx` if widget
  metadata, SSR markers, or pure ratio helpers change
- `bun run test:vitest -- tests/vitest/pageBuilder/visualPanel.test.tsx` if the
  shared variant helper contract is consumed through VisualPanel
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before a manual commit for this leaf, also run the TASK-285 implementation
  baseline: `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-01 and ISSUE-05
  evidence after implementation.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` editor mode notes for variant
  miniatures and ratio disclosure.

## Changelog Policy

- Covered by the TASK-285 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Variant cards visually communicate the resulting pane shape.
- Users can see which ratio is actually active across breakpoints.
- Variant-card selection uses the shared TASK-256 atomic update path.
- No Split Layout-only variant/data race workaround is introduced.

## Completion Notes (2026-05-21)

- Variant cards now render bounded graphical miniatures and a current-ratio disclosure block for desktop, tablet, and mobile.
- Preset selection re-syncs persisted ratios atomically, while the editor makes any later breakpoint override explicit instead of leaving the state ambiguous.
