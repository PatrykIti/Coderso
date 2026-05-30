# TASK-343-08: Compare Timeline Audit Remediation Family

# FileName: TASK-343-08_Compare_Timeline_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Compare Timeline + Runtime + QA + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-343
**Status:** Done (2026-05-30)

---

## Overview

Fix the confirmed Compare Timeline defect where `Segment label size` never has a
visible effect because a hard-coded `text-xs` always wins.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_COMPARE_TIMELINE_WIDGET.md:214-239`
- `core/widgets/core/compareTimeline.tsx:144-146,899-910,1045-1050`

## Sub-Tasks

- [x] Remove the hard-coded size class from the segment-label base class or make
  the size map own the entire size output.
- [x] Keep `Hidden` semantics truthful for segment labels.
- [x] Add runtime regression coverage for all segment-label size tokens.

## Completion Notes

- Segment badge base classes no longer include a hard-coded `text-xs`.
- `style.segmentLabelSize` now owns the full text-size output for `none`,
  `xs`, `sm`, and `base`.
- `segmentLabelSize="none"` emits no segment badge `text-*` size class instead
  of behaving like `text-xs`.

## Files To Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Make `segmentLabelSize` own the real font-size output. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Cover all segment-label size cases, especially `none`, `xs`, `sm`, and `base`. |
| `_docs/PLAYWRIGHT/28-05-2026/REPORT_COMPARE_TIMELINE_WIDGET.md` | Update final task routing. |

## Implementation Pseudocode

```ts
const segmentLabelBaseClass = joinClasses("rounded-full border px-2 py-1", segmentLabelWeightClass);
const segmentLabelSizeClass = segmentLabelSizeClassMap[style.segmentLabelSize ?? "xs"];
```

## Regression Test Shape

- The segment badge element itself is asserted for `none`, `xs`, `sm`, and
  `base`; do not rely on global HTML substring checks.
- `none` and `base` do not retain a base `text-xs` class from the shared badge
  base class.

## Security Contract

No API routes are added and no schema widening is needed.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `git diff --check`

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/28-05-2026/REPORT_COMPARE_TIMELINE_WIDGET.md`.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- `Segment label size` visibly changes the rendered label size.
- `Hidden` no longer behaves like `text-xs`.

## Validation Evidence

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget compare-timeline --session task-343-08-compare-timeline-rerun --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-08-compare-timeline-smoke-rerun.json --output-md .tmp/task-343-08-compare-timeline-smoke-rerun.md`
- Claude review: no blockers.
