# TASK-291-06: Timeline Motion Presets and Reduced-Motion Policy

# FileName: TASK-291-06_Timeline_Motion_Presets_and_Reduced_Motion_Policy.md

**Priority:** Low
**Category:** Widgets + Runtime Render + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-291, TASK-291-03
**Status:** To Do

---

## Overview

Decide and implement the Timeline-local portion of W8 from
`REPORT_TIMELINE_WIDGET.md`: animation and transition controls.

This leaf must stay conservative. It may add CSS-safe, SSR-compatible motion
presets with `prefers-reduced-motion` behavior. It must not invent a generic
scroll-trigger runtime script contract; if scroll-triggered behavior is needed,
TASK-291-07 must route it to an exact shared runtime-motion task first.

## Sub-Tasks

- [ ] Decide which motion presets belong to Timeline without broad platform
  runtime changes.
- [ ] Add bounded motion tokens such as `none`, `fade`, and `stagger` only if
  they can render without client-side scripts.
- [ ] Add reduced-motion safe classes/styles and tests.
- [ ] Add editor controls with clear copy about static vs animated behavior.
- [ ] If scroll-triggered animation remains required, defer it with an exact
  shared runtime-motion owner instead of adding a one-off script.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/timeline.tsx` | Add optional motion schema/defaults/resolver and SSR-safe classes or record no-code deferral. |
| `core/admin/ui/widgets/editors/TimelineEditors.tsx` | Add bounded motion controls if implementation is accepted. |
| `tests/vitest/widgets/timeline.test.tsx` | Cover motion token normalization and SSR output. |
| `tests/vitest/ui/timeline-editor-wave.test.tsx` | Cover editor controls and no-script copy. |

## Implementation Pseudocode

```ts
type TimelineMotionPreset = "none" | "fade" | "stagger";

function resolveTimelineMotion(motion: TimelineData["motion"]) {
  const preset = motion?.preset ?? "none";
  return preset === "fade" || preset === "stagger" ? preset : "none";
}

function timelineMotionClass(preset: TimelineMotionPreset) {
  if (preset === "none") return undefined;
  return preset === "fade"
    ? "motion-safe:animate-in motion-safe:fade-in"
    : "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2";
}
```

Data flow:

1. Add a strict `motion.preset` enum only if the final decision accepts CSS-safe
   motion.
2. Resolve unknown values to `none`.
3. Apply classes to Timeline items without adding scripts or persistent timers.
4. Ensure reduced-motion users receive static output.

Error handling:

- Unknown motion tokens normalize to `none`.
- If available class utilities cannot express the preset safely, defer instead
  of introducing bespoke global CSS or client-side effects.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: new motion fields must be enum-limited.
- Anti-abuse: no user-authored scripts, raw class strings, or inline animation
  code.
- Secret handling: no secrets in motion config or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with supported motion presets or the
  explicit deferral.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred W8
  status.

## Acceptance Criteria

- Timeline has either bounded, reduced-motion-safe motion presets or a precise
  no-code deferral to a shared runtime-motion task.
- No one-off scroll-trigger script is added.
- Tests prove unknown motion config is rejected or normalized safely.
