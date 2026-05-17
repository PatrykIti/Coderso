# TASK-292-02: Toggle Block Motion and Pane Transition Contract

# FileName: TASK-292-02_Toggle_Block_Motion_and_Pane_Transition_Contract.md

**Priority:** Medium
**Category:** Widgets + Runtime Render + Admin UI + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-292, TASK-292-01, TASK-256-04, TASK-256-05-04
**Status:** To Do

---

## Overview

Add bounded Toggle Block transition options so switching between panes can feel
intentional without breaking accessible state, keyboard behavior, or hidden pane
semantics.

The report calls out that pane changes are instantaneous because hidden panes
toggle directly through the `hidden` attribute. This leaf may add fade/slide
presentation only if the final TASK-256 interactive contract remains correct.

## Source Evidence

- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:70-74` reports missing pane
  transition control.
- `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md:246-247` classifies animation
  as low/future product scope, not a shared TASK-256 repair.

## Scope

- Add a bounded `motion` option such as `none`, `fade`, or `slide`.
- Respect `prefers-reduced-motion` and provide a no-motion default or fallback.
- Keep keyboard and click behavior scoped to the final TASK-256 runtime root.
- Preserve one active pane at a time with correct `data-state` markers.
- Render transition classes from enum values only.
- Use the final TASK-256 runtime namespace for any new markers, for example
  `data-coderso-*`. Do not add new `data-nextless-*` markers in TASK-292.
- If a safe two-phase pane lifecycle cannot be layered on the final TASK-256
  binding, keep this leaf to class-only/no-motion polish and record fade/slide
  as deferred in TASK-292-06.

## Out of Scope

- Replacing the shared interactive runtime binding or duplicate-ID repair.
- Adding a general animation system for all widgets.
- Persisting arbitrary class names, durations, easing strings, or scripts.
- Making hidden inactive panes focusable.

## Sub-Tasks

- [ ] Choose the final normalized motion field location (`options` vs `style`)
  based on existing Toggle Block data ownership.
- [ ] Add bounded motion enum values and schema/default/normalizer coverage.
- [ ] Render reduced-motion-safe transition classes without changing the final
  TASK-256 active/inactive state contract.
- [ ] Add editor controls for motion values in the correct modes.
- [ ] Add Vitest coverage for defaults, invalid values, rendered classes, and
  editor updates.
- [ ] Update Toggle Block widget docs and report evidence.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/toggleBlock.tsx` | Add normalized motion field, transition classes/data markers, and reduced-motion-safe rendering. |
| `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx` | Add a bounded motion selector in Visual/Advanced and, if appropriate, Wizard summary copy. |
| `tests/vitest/widgets/toggleBlock.test.tsx` | Cover default motion, enum fallback, reduced-motion-safe class output, and inactive pane state. |
| `tests/vitest/ui/toggle-block-editor-wave.test.tsx` | Cover motion selector updates and diagnostics output. |
| `tests/unit/widgets/validator.test.ts` | Cover schema acceptance/rejection for motion values if the schema changes. |
| `_docs/_WIDGETS/TOGGLE_BLOCK.md` | Document supported transition modes and accessibility behavior. |
| `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` | Record fixed/deferred status for the motion row. |

## Implementation Pseudocode

```ts
type ToggleBlockMotion = "none" | "fade" | "slide";

function resolveToggleBlockMotion(value: unknown): ToggleBlockMotion {
  if (value === "fade" || value === "slide") return value;
  return "none";
}

function resolvePaneMotionClass(motion: ToggleBlockMotion) {
  if (motion === "fade") {
    return "motion-safe:transition-opacity motion-reduce:transition-none";
  }
  if (motion === "slide") {
    return "motion-safe:transition-[opacity,transform] motion-reduce:transition-none";
  }
  return "";
}

function resolvePaneLifecycle({
  active,
  leaving,
  motion,
  transitionFinished,
}: {
  active: boolean;
  leaving: boolean;
  motion: ToggleBlockMotion;
  transitionFinished: boolean;
}) {
  if (motion === "none" || transitionFinished) {
    return { hidden: !active, ariaHidden: !active, exiting: false };
  }
  return {
    hidden: false,
    ariaHidden: !active,
    exiting: leaving,
  };
}

function renderPane({
  active,
  leaving,
  motion,
}: {
  active: boolean;
  leaving: boolean;
  motion: ToggleBlockMotion;
}) {
  const lifecycle = resolvePaneLifecycle({
    active,
    leaving,
    motion,
    transitionFinished: false,
  });
  return (
    <div
      hidden={lifecycle.hidden}
      aria-hidden={lifecycle.ariaHidden}
      data-state={active ? "active" : "inactive"}
      data-coderso-toggle-motion={motion}
      data-coderso-toggle-exiting={lifecycle.exiting ? "true" : undefined}
      className={resolvePaneMotionClass(motion)}
    />
  );
}
```

Data flow:

1. Add `options.motion` or `style.motion` only after deciding which owner best
   matches existing Toggle Block data shape.
2. Normalize unknown values to `none`.
3. Render only bounded classes and `data-coderso-*` markers.
4. For animated modes, keep a leaving pane unhidden only until
   `transitionend`; reduced-motion and `none` use immediate hidden state.
5. Update the editor through the existing `updateOptions` or `updateStyle`
   helper, not by mutating raw payloads.

Error handling:

- Unknown persisted motion values fall back to `none`.
- Missing transition events, reduced-motion mode, or unsupported motion values
  collapse to the immediate hidden/inactive state.
- If TASK-256 runtime changes the pane lifecycle, keep this leaf as a pure
  presentation layer on top of the final active/inactive state markers.

Regression-test shape:

- Widget tests assert new markers use `data-coderso-*` and do not introduce
  new `data-nextless-*` attributes.
- Runtime DOM tests cover immediate hidden behavior for `none` and the
  two-phase inactive/leaving state for animated modes without focusable
  inactive panes.
- Editor tests cover the motion selector, enum fallback diagnostics, and
  reduced-motion-safe copy.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model, RBAC, CSRF, and rate limits: unchanged.
- Reject-unknown validation: schema must reject unsupported motion values.
- Anti-abuse: no user-authored class names, scripts, inline event handlers, or
  arbitrary transition values.
- Secret handling: no secrets in widget data, diagnostics, docs, or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/toggleBlock.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/TOGGLE_BLOCK.md` with motion options and reduced-motion
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_TOGGLE_BLOCK_WIDGET.md` with final status for
  the transition row.

## Acceptance Criteria

- Toggle Block supports only bounded motion values.
- Reduced-motion users do not receive forced pane animation.
- Motion does not break hidden inactive panes, keyboard navigation, or selected
  state announcements.
- Runtime tests prove the final rendered contract.
