# TASK-318: Section Surface Overflow and Sticky Child Containment Contract

# FileName: TASK-318_Section_Surface_Overflow_and_Sticky_Child_Containment_Contract.md

**Priority:** High
**Category:** Shared Layout + Runtime Render + CSS Semantics
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-275
**Status:** Done (2026-05-21)

---

## Overview

Create the exact shared owner for sticky-child failures caused by the Section
surface wrapper. The current `SectionBlock` applies `overflow-hidden` to the
same container that wraps slotted child widgets, which blocks child
`position: sticky` behavior such as Navigation’s public sticky header.

This task owns the shared Section/layout containment contract. Widget families
may record evidence, but they must not patch `Section` or page-shell overflow in
their own task slices.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:378-393,405` - the public sticky
  Navigation failure is traced to a shared `Section` / page-shell overflow
  wrapper, not to Navigation-local sticky classes.
- `core/widgets/core/section.tsx:348-353` - `SectionBlock` currently applies
  `relative w-full overflow-hidden` to the live surface wrapper that contains
  slotted child widgets.
- `_docs/_TASKS/TASK-256-05-01_Section_and_Grid_Columns_Structural_Findings.md:42-47`
  - existing shared Section work already owns structural wrapper truthfulness;
  sticky-child containment belongs with shared Section/layout ownership, not
  Navigation-only follow-ups.

## Sub-Tasks

- [x] Split clipping/background layers from the live content flow so child
  widgets can rely on CSS sticky where the product contract expects it.
- [x] Preserve Section background, overlay, border, and radius behavior while
  removing the sticky blocker from slotted child content.
- [x] Verify the change against a sticky-child consumer such as Navigation
  without moving Navigation-specific runtime logic into Section.
- [x] Keep any remaining page-shell-only overflow blockers explicit if evidence
  shows an additional owner outside `SectionBlock`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Stop applying the clipping wrapper directly to the slotted child-content container. Split background/overlay clipping from content flow so sticky child widgets are not blocked by default. |
| `tests/vitest/widgets/section.test.tsx` | Add focused assertions for the shared Section wrapper/overlay structure and for the absence of the sticky-blocking clip on slotted content. |
| `tests/vitest/widgets/navigation.test.tsx` | Add a consumer proof that sticky Navigation markup can be rendered inside Section without the shared wrapper forcing the old blocked structure. |
| `tests/integration/runtime/pages-runtime.test.ts` | Run/update if the public page render contract needs a runtime integration proof for sticky child behavior. |
| `_docs/_WIDGETS/SECTION.md` | Update only if Section’s user-facing surface/overlay containment contract changes. |

## Implementation Pseudocode

```tsx
const surfaceFrameClass = joinClasses(
  "relative w-full",
  paddingBlockClassMap[layout.paddingBlock ?? "md"],
  resolvedVariant === "contained" ? "shadow-sm" : undefined
);

const clippedBackgroundClass = joinClasses(
  "absolute inset-0 overflow-hidden",
  radiusClassMap[style.radius ?? "none"]
);

return (
  <Element className={wrapperClass}>
    <div className={surfaceFrameClass}>
      <div className={clippedBackgroundClass} aria-hidden="true">
        {renderBackgroundAndOverlay()}
      </div>
      <div className="relative z-[1] flex flex-col gap-4">
        {renderSectionHeading()}
        {renderSectionSlots()}
      </div>
    </div>
  </Element>
);
```

Error handling:

- Do not regress Section radius, background media, overlay, or placeholder
  behavior while removing the sticky blocker.
- If a true page-shell blocker remains outside `SectionBlock`, record that exact
  owner separately instead of reintroducing `overflow-hidden` on live content.
- Keep legacy Section payloads backward-compatible; this is a wrapper-structure
  change, not a schema change.

## Data Flow

1. Section normalization remains unchanged.
2. `SectionBlock` renders background/overlay styling in a clipped decorative
   layer rather than on the live child-content wrapper.
3. Slotted child widgets render in a non-clipping content flow that preserves
   their own sticky/positioning semantics.
4. Consumer widget tests prove the shared wrapper contract without moving
   widget-local behavior into Section.

Regression-test shape:

```tsx
test("section clips decorative background layers without clipping slotted content flow", () => {
  const { container } = render(<SectionBlock data={fixtureWithStickyChild} />);
  expect(container.querySelector(".overflow-hidden [data-slot-child]")).toBeNull();
});

test("navigation can render its sticky row inside section without the old blocked wrapper", () => {
  const { container } = renderSectionWithNavigationStickyFixture();
  expect(container.querySelector("[data-navigation-sticky-row]")).not.toBeNull();
});
```

## Security Contract

This shared task adds no API routes.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged; no new persisted Section fields are
  required by default.
- Anti-abuse: no raw style strings, script injection, or privileged data are
  introduced. This task only changes shared DOM structure and class ownership.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun test tests/integration/runtime/pages-runtime.test.ts` when the public
  page render contract changes materially
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate reliability`
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_TASKS/TASK-318_Section_Surface_Overflow_and_Sticky_Child_Containment_Contract.md`
- `_docs/_TASKS/README.md`
- `_docs/_WIDGETS/SECTION.md` only if the shared Section surface contract changes
- `_docs/_WIDGETS/NAVIGATION.md` when the routed sticky-containment note changes
- `_docs/_CHANGELOG/886-2026-05-21-task-318-section-sticky-containment-contract.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- The repo has one exact shared owner for sticky-child failures caused by
  Section/layout overflow clipping.
- `SectionBlock` no longer applies the sticky-blocking clip to the same wrapper
  that contains slotted child widgets.
- Background, overlay, radius, and other Section surface behaviors remain
  intact after the wrapper change.
- Widget families such as Navigation can route sticky-overflow findings to this
  exact task ID instead of vague shared-owner wording.

## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx` - passed
  (`9` tests)
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx` - passed
  (`17` tests)
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `bun run gates:coderso` - passed
- `bun run scan:security:strict` - attempted but failed outside TASK-318 scope
  because the local Semgrep trust store had no CA anchors and `bun audit` could
  not reach the advisory endpoint; Trivy and Gitleaks sub-scanners were clean
  in the same run
- `bun run precommit` - passed

## Completion Notes

- 2026-05-21: `SectionBlock` now keeps decorative clipping in an inset surface
  layer while letting slotted child widgets render in unclipped content flow,
  closing the shared sticky blocker routed from Navigation.
