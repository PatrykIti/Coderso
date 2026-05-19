# TASK-299: Shared Widget Contrast Guidance and Validation

# FileName: TASK-299_Shared_Widget_Contrast_Guidance_and_Validation.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-256-02, TASK-260
**Status:** To Do

---

## Overview

Create the exact shared owner for Playwright rows that report missing contrast
guidance or contrast validation in widget-owned color controls.

This task is opened from `REPORT_COMPARE_TIMELINE_WIDGET.md` row `W7`, where
`TASK-260` deliberately avoided inventing a one-off local contrast warning.
The goal here is a reusable shared contract for widget color controls that can
warn when configured foreground/background pairs become unreadable, while still
respecting CSS variables, omitted defaults, and widgets that intentionally do
not own a given color surface.

## Routed Adopters

| Routed row | Current owner here | Notes |
|---|---|---|
| Compare Timeline `W7` | Yes | Current concrete deferred adopter from `TASK-260`. |
| Timeline `W7` / shared contrast closure from `TASK-291` | Yes | Timeline closure already depends on a concrete shared contrast owner rather than generic TASK-256 routing. |
| Any future widget-local contrast warning | Later explicit row | Do not silently widen scope; add a routed adopter entry first. |

## Sub-Tasks

- [ ] Define the shared contrast-evaluation contract for color fields that have
  both a configured value and a runtime fallback/background context.
- [ ] Decide which widget surfaces can support advisory contrast warnings
  truthfully without false certainty when CSS variables or inherited themes are
  involved.
- [ ] Add reusable editor helper copy/state for advisory warnings rather than a
  Compare Timeline-only inline warning.
- [ ] Apply the shared helper to Compare Timeline `markerColor`/track surface
  ownership only after the generic contract is stable.
- [ ] Apply the same shared helper to Timeline color surfaces or record an
  explicit blocked/deferred reason in the Timeline docs/report.
- [ ] Update the routed source reports/closure notes that now depend on this
  shared owner.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` or adjacent shared widget editor helpers | Own the reusable advisory state/presentation contract instead of one-off widget copy. |
| `core/widgets/core/clearableStyle.ts` and any shared contrast helper introduced here | Normalize/resolve the shared contrast input shape without inventing per-widget sentinel values. |
| `core/admin/ui/widgets/editors/CompareTimelineEditors.tsx` | Consume the shared contrast helper only after the reusable contract lands. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Consume the same shared contrast helper for Timeline-owned color surfaces once the routed adopter contract is settled. |
| `tests/vitest/ui/clearable-fields.test.tsx` or adjacent shared helper suites | Cover warning visibility, CSS-variable fallback behavior, and false-positive guards. |
| `tests/vitest/ui/compare-timeline-editor-wave.test.tsx` | Cover Compare Timeline adoption once the shared helper is wired. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover Timeline adoption or explicit blocked-state copy once the routed adopter path is settled. |
| `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md` | Replace the deferred `W7` placeholder with final fixed/deferred evidence. |
| `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` | Replace the Timeline shared-contrast placeholder with final fixed/deferred evidence. |
| `_docs/_WIDGETS/COMPARE_TIMELINE.md` | Keep the Compare Timeline source-of-truth note aligned with the landed shared contrast contract. |
| `_docs/_WIDGETS/TIMELINE.md` | Keep the Timeline source-of-truth note aligned with the landed shared contrast contract. |

## Implementation Pseudocode

```ts
type ContrastAdvisory = {
  status: "ok" | "unknown" | "warning";
  message?: string;
};

function resolveWidgetContrastAdvisory(input: {
  foreground?: string;
  background?: string;
  fallbackBackground?: string;
}): ContrastAdvisory {
  if (!input.foreground || !input.background) return { status: "unknown" };
  if (containsCssVariable(input.foreground) || containsCssVariable(input.background)) {
    return { status: "unknown", message: "Contrast depends on theme variables." };
  }
  return meetsContrastThreshold(input.foreground, input.background)
    ? { status: "ok" }
    : { status: "warning", message: "Configured colors may be hard to read together." };
}
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless a shared helper adds persisted
  advisory metadata, which is not expected here.
- Anti-abuse: no public-write behavior.
- Secret handling: no diagnostic payload may expose secrets or privileged theme
  internals.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/compare-timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_COMPARE_TIMELINE_WIDGET.md`
- `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md`
- `_docs/_WIDGETS/COMPARE_TIMELINE.md`
- `_docs/_WIDGETS/TIMELINE.md`
- Any additional widget report that is physically routed to this shared task
- `_docs/WIDGETS.md` only if the shared color-guidance contract becomes a new
  source-of-truth widget rule

## Acceptance Criteria

- `W7` from `REPORT_COMPARE_TIMELINE_WIDGET.md` has an exact physical owner.
- The current Timeline shared-contrast row also has exact fixed/deferred
  evidence under this task instead of a generic future-task placeholder.
- Shared contrast guidance is reusable and does not depend on Compare Timeline-
  specific assumptions.
- Compare Timeline and Timeline adopt the shared contract only after the helper
  exists, or the task records a truthful explicit blocker for either adopter.
