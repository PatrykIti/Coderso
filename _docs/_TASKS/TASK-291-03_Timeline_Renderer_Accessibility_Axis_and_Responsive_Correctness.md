# TASK-291-03: Timeline Renderer Accessibility Axis and Responsive Correctness

# FileName: TASK-291-03_Timeline_Renderer_Accessibility_Axis_and_Responsive_Correctness.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-291, TASK-256-04
**Status:** Done (2026-05-22)

---

## Overview

Repair Timeline renderer behavior confirmed in the Playwright report.

This leaf owns C5 and R1-R10 for the concrete Timeline renderer. It must follow
shared accessibility policy from TASK-256-04 but should not create generic ARIA
helpers or rewrite unrelated widgets.

## Sub-Tasks

- [x] Keep dates visible in `TimelineAlternatingLayout` on mobile.
- [x] Replace fixed `md:grid-cols-[10rem_1fr]` chronology columns with
  overflow-safe responsive sizing.
- [x] Repair horizontal milestone responsiveness so wrapped rows remain
  coherent or intentionally switch to a scroll/stack mode.
- [x] Add section and ordered-list accessible names from static Timeline labels
  or existing visible copy; TASK-291-05 may later upgrade this to
  header-backed `aria-labelledby` after header fields exist.
- [x] Render `aria-current="step"` on the current step container.
- [x] Hide decorative emoji/icon output with `aria-hidden="true"` unless a later
  task adds labelled icon semantics.
- [x] Replace fixed `4rem` milestone connector width with layout-aware flex or
  token-based sizing.
- [x] Stop applying `lineStyle` to card borders when the control is meant to
  style the axis/guide.
- [x] Add bounded short-timeline density behavior with existing renderer
  structure; persisted `layout.minHeight` tokens, if accepted, belong to
  TASK-291-05.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/timeline.tsx` | Update milestone, cards, chronology, alternating, compact renderers for accessibility, responsive layout, connectors, line semantics, and short-timeline density without new persisted layout tokens. |
| `tests/vitest/widgets/timeline.test.tsx` | Add SSR assertions for ARIA, mobile-visible date output, connector style, card border semantics, chronology classes/styles, and short-timeline density. |
| `tests/vitest/widgets/renderer.test.tsx` | Add or update Timeline renderer assertions when shared renderer snapshots are affected. |

## Implementation Pseudocode

```tsx
function getTimelineLabel(data: TimelineData) {
  return "Timeline";
}

function renderTimelineList(props: TimelineListProps) {
  return (
    <ol aria-label={`${props.label} steps`} className={props.className}>
      {props.steps.map((step) => (
        <li
          key={step.id}
          aria-current={step.status === "current" ? "step" : undefined}
        >
          {renderStepText(step)}
        </li>
      ))}
    </ol>
  );
}

const horizontalConnectorStyle = {
  flex: "1 1 var(--timeline-connector-min, 1rem)",
  minWidth: "1rem",
  maxWidth: "min(8rem, 20vw)",
  height: lineThickness,
};
```

Data flow:

1. Normalize data through `normalizeTimelineData()`.
2. Resolve static labels and existing style tokens before entering
   layout-specific renderer functions; do not assume TASK-291-05 header or
   min-height fields already exist.
3. Pass label, `aria-current`, connector, and short-timeline density decisions
   into every layout that renders an ordered list.
4. Keep legacy data attributes used by Playwright/report evidence.

Error handling:

- Missing or future header/title data falls back to a static accessible label
  until TASK-291-05 adds header-backed labels.
- Unknown/omitted status does not render `aria-current`.
- Missing dates in alternating/chronology render fallback copy without hiding
  actual `dateLabel` values.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged unless new renderer fields are persisted.
- Anti-abuse: no runtime scripts, raw HTML, or unsafe link changes in this leaf.
- Secret handling: no secrets in DOM data attributes or report evidence.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if shared
  renderer assertions change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` plus targeted release-gate suites when this leaf
  changes accessibility, public runtime output, or other release-gated
  behavior.
- `bun run scan:security:strict` before committing or closing this leaf
- `bun run precommit` before committing or closing this leaf

## Documentation Updates Required

- Update `_docs/_WIDGETS/TIMELINE.md` with final renderer/accessibility notes.
- Update `_docs/PLAYWRIGHT/REPORT_TIMELINE_WIDGET.md` with fixed/deferred
  status and textual evidence for C5 and R1-R10.

## Acceptance Criteria

- Timeline renderer has section/list names and current-step semantics using
  fields that exist before TASK-291-05.
- Alternating dates remain available on mobile.
- Chronology and milestone layouts avoid fixed-width/connector overflow.
- `lineStyle` no longer changes card border appearance when the control is
  intended for the axis/guide.
- Short timelines render with intentional density instead of looking empty,
  without requiring future TASK-291-05 layout tokens.
