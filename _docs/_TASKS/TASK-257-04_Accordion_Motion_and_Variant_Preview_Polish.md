# TASK-257-04: Accordion Motion and Variant Preview Polish

# FileName: TASK-257-04_Accordion_Motion_and_Variant_Preview_Polish.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render + UX Polish
**Estimated Effort:** Medium
**Dependencies:** TASK-256-04, TASK-256-05-04, TASK-257-02, TASK-257-03, TASK-257
**Status:** To Do

---

## Overview

Add Accordion-specific motion and visual preview polish after functional product
controls land.

The Accordion parts of `REPORT_ACCORDION_WIDGET.md` rows W1 and U4 are product
UX improvements, not shared-contract defects. FAQ parts of those same mixed
rows remain outside TASK-257. This leaf keeps the Accordion work out of TASK-256
while still making the Accordion widget feel consistent and inspectable in the
editor.

## Scope Boundary

This leaf does not replace TASK-256 runtime accessibility work. Motion must
respect the already-landed accessible details/summary behavior from TASK-256
and must not introduce keyboard traps, duplicate IDs, runtime scripts, or
hydration-sensitive behavior.

Persist motion as `options.motion`. The `"none"` value in this enum is a motion
mode, not a TASK-242 visual-off token.

## Sub-Tasks

- [ ] Define a small Accordion motion model, such as `none`, `subtle`, and
  `smooth`, with `none` as an accessible opt-out.
- [ ] Implement motion with CSS/classes only. If a future animation requires
  instance-scoped runtime script behavior, split that into a separate runtime
  task with Bun-owned validation before implementing it.
- [ ] Respect `prefers-reduced-motion` for any animated state.
- [ ] Replace text-only variant cards with compact visual previews for `soft`,
  `bordered`, and `compact`.
- [ ] Keep variant preview cards generated from the same token names used by the
  runtime so previews do not drift from rendered output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/accordion.tsx` | Add `options.motion` schema/default/normalizer and render output. |
| `core/admin/ui/widgets/editors/AccordionEditors.tsx` | Add motion control and variant preview cards. |
| `tests/vitest/widgets/accordionWidget.test.tsx` | Add motion class/data output coverage. |
| `tests/vitest/ui/accordion-editor-wave.test.tsx` | Add motion and variant preview editor coverage. |

## Implementation Pseudocode

```ts
const accordionMotionClassMap = {
  none: "",
  subtle: "motion-safe:transition-colors motion-safe:duration-150",
  smooth: "motion-safe:transition-all motion-safe:duration-200",
} as const;

function resolveAccordionMotion(value: unknown): AccordionMotion {
  return value === "subtle" || value === "smooth" ? value : "none";
}
```

Variant preview shape:

```tsx
function VariantPreviewCard({ variant, selected, onSelect }: Props) {
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}>
      <PreviewAccordionFrame variant={variant} />
      <span>{variant.label}</span>
    </button>
  );
}
```

Error handling:

- Unknown motion values normalize to `none`.
- Motion classes must be additive and must not remove native details behavior.
- TASK-257-04 must not add runtime scripts. Any script-based behavior requires a
  separate task and Bun runtime-kernel tests.
- Variant previews are visual only and must not duplicate live editor controls.
- If the shared Accordion runtime shape drifts again, rebase the motion
  implementation on that shape before adding animation.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema must reject unknown motion keys.
- Anti-abuse: no user-authored script/CSS injection and no widget-owned runtime
  script.
- Secret handling: no secrets in preview metadata or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`

## Documentation Updates Required

- Update `_docs/_WIDGETS/ACCORDION.md`.
- Update `_docs/PLAYWRIGHT/REPORT_ACCORDION_WIDGET.md` Accordion parts of rows
  W1 and U4 after validation; leave FAQ parts routed outside TASK-257.

## Changelog Policy

- Covered by the TASK-257 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Accordion exposes a documented motion option with a reduced-motion-safe output.
- Editor variant cards show compact visual previews that match runtime variants.
- No new motion behavior weakens native keyboard or screen-reader operation.
