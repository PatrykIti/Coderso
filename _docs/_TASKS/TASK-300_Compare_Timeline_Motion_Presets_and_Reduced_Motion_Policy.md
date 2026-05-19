# TASK-300: Compare Timeline Motion Presets and Reduced Motion Policy

# FileName: TASK-300_Compare_Timeline_Motion_Presets_and_Reduced_Motion_Policy.md

**Priority:** Low
**Category:** Widgets + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-260
**Status:** Done (2026-05-19)

---

## Overview

Create the exact future owner for `REPORT_COMPARE_TIMELINE_WIDGET.md` row `W8`.

`TASK-260` intentionally ships Compare Timeline with static SSR-safe output.
This task exists so the deferred motion request has a real physical owner
instead of a generic “future task” note. The eventual implementation must stay
CSS-safe by default, respect reduced-motion preferences, and avoid inventing a
widget-specific client runtime script unless the broader product/runtime policy
explicitly approves it.

## Sub-Tasks

- [x] Decide whether Compare Timeline motion can stay CSS-only or whether a
  broader runtime motion contract is required first.
- [x] Define bounded motion presets (`none`, `fade`, `slide`, or equivalent)
  that remain truthful in SSR output.
- [x] Respect `prefers-reduced-motion` and provide a stable no-motion fallback.
- [x] Add editor controls, runtime output, tests, and docs only after the final
  motion policy is approved.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/compareTimeline.tsx` | Add runtime-safe motion classes/data attributes only if the approved policy stays local to Compare Timeline. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Add bounded motion controls only after runtime semantics are approved. |
| `tests/vitest/widgets/compareTimeline.test.tsx` | Cover motion defaults and reduced-motion-safe output. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Cover editor controls once the task becomes executable. |
| `_docs/_WIDGETS/COMPARE_TIMELINE.md` | Document the final motion contract. |
| `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` | Replace the deferred `W8` note with final fixed/deferred evidence. |

## Implementation Pseudocode

```ts
type CompareTimelineMotion = "none" | "fade" | "slide";

function resolveCompareTimelineMotionClass(motion: CompareTimelineMotion): string | undefined {
  if (motion === "none") return undefined;
  return motion === "fade" ? "motion-safe:animate-in motion-safe:fade-in-0" : "motion-safe:animate-in motion-safe:slide-in-from-bottom-2";
}
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any motion token must be schema-owned and bounded.
- Anti-abuse: no unbounded class-name passthrough or arbitrary script hooks.
- Secret handling: unchanged.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/compareTimeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md`

## Acceptance Criteria

- `W8` from `REPORT_COMPARE_TIMELINE_WIDGET.md` has an exact physical owner.
- Any future motion preset respects reduced-motion expectations.
- Compare Timeline keeps a truthful static fallback when motion is disabled or
  unsupported.
