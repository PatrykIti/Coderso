# TASK-252-04: Timeline Editor Motion and Chronology Expansion

# FileName: TASK-252-04_Timeline_Editor_Motion_and_Chronology_Expansion.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Expand the Timeline widget so it can represent both process steps and true
chronological timelines. Scroll/feed behavior stays Adapt-only and must not be
implemented as required scope unless the leaf extends schema, renderer, editor,
and tests together.

The current Timeline widget exposes useful controls, but its horizontal
three-item form does not always read as a timeline. TASK-252-04 should add real
timeline modes while preserving existing payloads and editor tests.

## Business Requirements

- Keep one `timeline` widget type.
- Preserve existing variants (`milestones`, `cards`, `compact`) as compatible
  display options or map them to a richer mode model.
- Add true timeline capabilities:
  - configurable number of points within safe min/max bounds;
  - step title, description, optional date/time label, icon, accent color, and
    optional CTA/link;
  - horizontal dot-line-dot mode;
  - vertical chronological mode;
  - alternating event cards mode;
  - current/active milestone highlighting where appropriate.
- Leave feed/activity and scroll-aware animation outside required scope. They
  are Adapt-only progressive enhancements:
  - sequence left/middle/right or top-to-bottom reveal;
  - moving marker/connector progression;
  - reset when the widget leaves the viewport and replay on re-entry;
  - respect `prefers-reduced-motion`;
  - no layout shift and no blocking runtime dependency.
- Use semantic HTML:
  - ordered list for timeline items;
  - `<time>` when a date is present;
  - accessible labels for decorative connectors/markers.
- Reorganize editor modes:
  - `Wizard`: choose timeline purpose (`process`, `chronology`, `alternating`),
    orientation, step count, and starter labels.
  - `Visual`: Mode and layout; Items and dates; Motion; Axis and markers;
    Colors; Typography and spacing.
  - `Advanced`: data normalization, IDs, reduced-motion/debug options, raw
    diagnostics only if needed.

## Sub-Tasks

This parent is now executed through physical per-widget leaves. Do not implement this parent as one broad batch; complete the leaves below in dependency order.

- [ ] TASK-252-04-01: Timeline Chronology Motion and Editor IA

## Files to Change

- `core/widgets/core/timeline.tsx`
- `core/admin/ui/widgets/editors/TimelineEditors.tsx`
- `core/widgets/types.ts` only if shared editor metadata/capabilities are
  extended by TASK-252-01.
- `tests/vitest/widgets/timeline.test.tsx`
- `tests/vitest/ui/timeline-editor-wave.test.tsx`
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token behavior changes.
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer/slot behavior is
  touched.
- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/WIDGETS.md`

## Implementation Pseudocode

Extend the Timeline data contract without breaking current payloads.

```ts
type TimelineDisplayMode =
  | "process"
  | "axis"
  | "chronology"
  | "alternating";

// Adapt-only. Do not expose this until motion schema, render, editor, and
// reduced-motion tests are implemented together.
type TimelineMotion = {
  reveal?: "none" | "scroll-sequence" | "connector-progress";
  resetOnExit?: boolean;
};

type TimelineStep = {
  id: string;
  title: string;
  description?: string;
  date?: string;
  dateLabel?: string;
  icon?: string;
  accent?: string;
  cta?: {
    label: string;
    href: string;
  };
  status?: "upcoming" | "current" | "complete";
};

function normalizeTimelineData(raw: unknown): TimelineData {
  const input = coerceTimelineInput(raw);
  return {
    ...legacyCompatibleFields,
    mode: normalizeDisplayMode(input.mode, input.variant),
    steps: normalizeTimelineSteps(input.steps, {
      normalizeCta: normalizeTimelineStepCta,
    }),
    ...(isTimelineMotionAdaptEnabled(input) ? { motion: normalizeTimelineMotion(input.motion) } : {}),
  };
}
```

Render core timeline state with semantic markup. Add motion data attributes only
when the Adapt motion slice is implemented.

```tsx
<ol data-timeline-mode={mode} {...resolveTimelineMotionDataAttributes(motion)}>
  {steps.map((step) => (
    <li data-timeline-step={step.id}>
      {step.date ? <time dateTime={step.date}>{step.dateLabel ?? step.date}</time> : null}
      <span aria-hidden="true" data-timeline-marker />
    </li>
  ))}
</ol>
```

If the Adapt motion slice needs JavaScript for replay-on-scroll, keep it narrow
and deterministic:

```ts
function attachTimelineReveal(root: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return noop;
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      root.toggleAttribute("data-in-view", entry.isIntersecting);
      if (!entry.isIntersecting && root.dataset.timelineResetOnExit === "true") {
        root.removeAttribute("data-revealed");
      }
    }
  });
  observer.observe(root);
  return () => observer.disconnect();
}
```

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered Timeline output is public.
- Auth model:
  - no new endpoint;
  - existing page/template save calls remain authenticated admin writes.
- RBAC:
  - unchanged page/template write permissions.
- CSRF:
  - unchanged admin CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - Timeline schema must reject unknown fields and normalize legacy variants.
- Anti-abuse:
  - titles/descriptions/icons are text, not raw HTML;
  - optional href must use the safe URL pattern;
  - public write protection is not applicable because no public write endpoint
    is added.
- Runtime safety:
  - any scroll script must clean up observers/listeners and respect reduced
    motion.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  spacing/typography tokens are touched.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer behavior changes.
- Add focused reduced-motion/animation tests in the Vitest widget or UI lane if
  the motion implementation is Bun-free.
- Add Bun runtime coverage only if a public runtime script/adaptor is introduced
  outside pure widget rendering.

## Documentation Updates Required

- `_docs/_WIDGETS/TIMELINE.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/tmp/timeline/*` research references created by TASK-252-02.
- `_docs/_TASKS/TASK-252*.md`

## Acceptance Criteria

- Timeline can render process, horizontal axis, vertical chronology, and
  alternating cards from one schema, with current/status highlighting where the
  Keep matrix requires it.
- Existing timeline payloads remain editable and render safely.
- Scroll/feed behavior is absent unless the Adapt slice is explicitly
  implemented; if implemented, it is accessible, reduced-motion-safe, and
  replayable only when configured.
- Timeline editor groups structure, items, motion, styling, and advanced
  normalization in predictable sections.
