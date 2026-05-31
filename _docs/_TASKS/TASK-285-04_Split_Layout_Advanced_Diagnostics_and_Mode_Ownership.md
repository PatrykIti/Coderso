# TASK-285-04: Split Layout Advanced Diagnostics and Mode Ownership

# FileName: TASK-285-04_Split_Layout_Advanced_Diagnostics_and_Mode_Ownership.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Medium
**Dependencies:** TASK-285, TASK-256-01, TASK-256-05-02, TASK-285-01
**Status:** Done (2026-05-21)

---

## Overview

Repair Split Layout Advanced-mode usefulness from
`_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-03.

The original report noted that Advanced mostly duplicated Visual controls plus
developer-facing saved-data details. TASK-256 owns generic editor-mode
ownership. This leaf kept the first Split Layout-specific repair focused on a
truthful responsive diagnostic surface, and TASK-336-19 later tightened that
surface to human support summaries only.

## Sub-Tasks

- [x] Decide the final Split Layout Advanced role on top of the landed
  TASK-256-01 contract: direct technical token editing, responsive diagnostics,
  or read-only diagnostics.
- [x] Show effective pane balance per device from normalized data.
- [x] Explain variant, desktop/tablet/mobile ratios, collapse mode, reverse
  order, gap, and vertical alignment in one normalized summary.
- [x] Avoid duplicating Visual controls unless the final shared mode contract
  requires Advanced token editing.
- [x] Keep saved-data diagnostics bounded to widget data only.
- [x] Superseded by TASK-336-19: avoid visible developer-facing snapshots or
  implementation labels in Advanced.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | Add Advanced diagnostics and mode-appropriate controls/copy; remove or relabel duplicated Visual controls if the shared contract requires it. |
| `core/widgets/core/splitLayout.tsx` | Export pure resolver helpers only if needed for diagnostics; keep them Bun-free. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | Assert Advanced diagnostics, copy, and no misleading duplicated controls. |
| `tests/vitest/widgets/splitLayout.test.tsx` | Add pure resolver tests when helpers move to the widget owner. |

## Implementation Pseudocode

```tsx
type SplitLayoutDiagnostics = {
  variant: SplitLayoutVariantId;
  desktop: { ratio: SplitLayoutRatio; leftSpan: number; rightSpan: number };
  tablet: { ratio: SplitLayoutRatio; leftSpan: number; rightSpan: number };
  mobile: { mode: SplitLayoutCollapseMobile; ratio?: SplitLayoutRatio; order: "normal" | "reversed" };
  gapLabel: string;
  alignLabel: string;
};

function getSplitLayoutDiagnostics(data: SplitLayoutData, variant: string): SplitLayoutDiagnostics {
  const normalized = normalizeSplitLayoutData(data, variant);
  return resolveDiagnosticsFromNormalizedData(normalized, resolveSplitLayoutVariant(variant));
}
```

Editor flow:

1. Normalize current data through `normalizeSplitLayoutData()`.
2. Build a display-only diagnostics object from owner helpers.
3. Render responsive rows for desktop, tablet, and mobile.
4. Render a human saved-layout summary after diagnostics, not visible
   developer-facing saved-data details.
5. Keep any editable controls aligned with the final TASK-256 mode contract.

Error handling:

- Invalid input normalizes before diagnostics render.
- Diagnostics must not throw if optional future fields are missing.
- Support summaries must include only normalized Split Layout data, not page,
  user, cache, or internal service state.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless new persisted diagnostics fields
  are added, which should be avoided.
- Anti-abuse: diagnostics are derived from bounded normalized widget data and
  must not expose arbitrary implementation labels.
- Secret handling: no secrets, internal IDs beyond widget-local tokens, or
  privileged settings in diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx` if pure
  diagnostics helpers are exported
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Before a manual commit for this leaf, also run the TASK-285 implementation
  baseline: `bun run gates:coderso`, `bun run scan:security:strict`, and
  `bun run precommit`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` ISSUE-03 evidence
  after implementation.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` Advanced mode notes.
- Update `_docs/WIDGETS.md` only if the shared Advanced-mode contract changes.

## Changelog Policy

- Covered by the TASK-285 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Advanced mode gives Split Layout users useful device-layout diagnostics and a
  beginner-safe support summary.
- Advanced no longer looks like an unexplained duplicate of Visual controls.
- Diagnostics are derived from normalized owner data and remain Bun-free.

## Completion Notes (2026-05-21)

- Advanced now has a single truthful role: read-only responsive diagnostics. On
  2026-05-25, TASK-336-19 superseded the earlier visible saved-data details
  with a human saved-layout summary.
- The duplicate editable ratio/gap/align controls were removed so Advanced no longer competes with Visual ownership.
