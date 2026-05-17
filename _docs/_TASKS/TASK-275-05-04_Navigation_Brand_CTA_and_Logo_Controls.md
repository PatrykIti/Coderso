# TASK-275-05-04: Navigation Brand CTA and Logo Controls

# FileName: TASK-275-05-04_Navigation_Brand_CTA_and_Logo_Controls.md

**Priority:** Medium
**Category:** Widgets + Navigation + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-275, TASK-275-01, TASK-275-02, TASK-275-05
**Status:** To Do

---

## Overview

Add bounded brand/action controls for the Navigation widget: logo size, CTA
radius, CTA separator, truthful Wizard CTA helper copy, and a documented
secondary-CTA policy. This leaf must avoid arbitrary platform expansion such as
mega-menu, search, or dark-mode systems.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:104-114,122-123` - second CTA,
  CTA radius, logo size, and CTA separator controls are missing.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:183` - Wizard CTA inputs are
  hidden when `ctaEnabled=false`, but the helper text is misleading and needs
  Navigation-specific copy.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:434-435` - CTA radius and logo
  size appear in lower-priority backlog rows.
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md:228-233` - mega-menu/search/dark
  switch comparisons are out of current Navigation v1 scope.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/navigation.tsx` | Add schema/default/normalizer/render support for bounded logo height, CTA radius, CTA separator, and chosen secondary-CTA policy. Prefer the existing `right` slot when that keeps the product contract simpler; if a persisted secondary CTA is approved, make it schema-backed and safe-href normalized. |
| `core/admin/ui/widgets/editors/NavigationEditors.tsx` | Add Visual controls for logo size and CTA shape/separation. Fix Wizard CTA helper copy so disabled CTA state is truthful. Add editor copy explaining the secondary-CTA policy without implying mega-menu/search/dark-mode support. |
| `tests/vitest/widgets/navigation.test.tsx` | Assert logo-size classes/styles, CTA radius/separator output, safe secondary-CTA behavior if added, and legacy payload normalization. |
| `tests/vitest/ui/navigation-editor-wave.test.tsx` | Assert brand/action controls persist and clear safely, and Wizard CTA helper copy is truthful when CTA fields are hidden. |
| `tests/unit/widgets/validator.test.ts` | Update if persisted fields are added. |
| `_docs/_WIDGETS/NAVIGATION.md` | Document logo/CTA control ranges and secondary-CTA policy. |
| `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md` | Record fixed/deferred evidence for brand/CTA rows and defer arbitrary platform expansions with reason. |

## Implementation Pseudocode

```tsx
type NavigationBrandActionStyle = {
  logoHeight?: "sm" | "md" | "lg" | "xl";
  ctaBorderRadius?: "sm" | "md" | "lg" | "full";
  ctaSeparator?: "none" | "line" | "spacing";
};

function renderNavigationCta(data: NavigationData) {
  if (!data.cta?.label) return null;
  const href = normalizeNavigationHref(data.cta.href);
  return (
    <a
      href={href}
      className={cx(resolveCtaRadius(data.style.ctaBorderRadius), resolveCtaSeparator(data.style.ctaSeparator))}
    >
      {data.cta.label}
    </a>
  );
}
```

Error handling:

- Unknown logo/CTA tokens normalize to defaults.
- Empty CTA labels keep existing no-CTA behavior.
- If secondary CTA is implemented as a persisted field, it must use the same
  label/href normalization and safe-href rendering as the primary CTA.
- Do not introduce arbitrary link lists, mega-menu blocks, raw HTML, raw class
  names, or search/dark-mode controls.

## Data Flow

1. Admin configures brand/action controls in Visual mode.
2. Wizard derives CTA helper copy from `ctaEnabled` so hidden inputs do not look
   like always-visible required fields.
3. `navigationSchema` and `normalizeNavigationData()` clamp tokens and optional
   CTA data.
4. `navigation.tsx` renders logo size and CTA shape/separator from normalized
   values and safe-href-normalized CTA destinations.
5. Tests cover renderer output, editor persistence, truthful Wizard copy,
   validator strictness, and
   legacy payload behavior.
6. Docs/report record the chosen secondary-CTA policy and defer out-of-scope
   platform expansion rows.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: every persisted brand/action field must be strict
  in `navigationSchema`.
- Anti-abuse: CTA links continue through existing safe-href normalization. No
  raw HTML, script, unbounded class names, or privileged settings are stored in
  widget data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if persisted fields change.
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer
  output assumptions change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun scripts/coderso-release-gates.ts --gate ux`
- `bun scripts/coderso-release-gates.ts --gate security` when public CTA link
  output changes.
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/PLAYWRIGHT/REPORT_NAVIGATION_WIDGET.md`
- `_docs/_TASKS/TASK-275-05-04_Navigation_Brand_CTA_and_Logo_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Logo-size and CTA shape/separator controls are bounded, tested, and
  documented.
- Wizard CTA helper copy accurately reflects disabled/enabled CTA state.
- Secondary CTA policy is explicit: either use the existing `right` slot or add
  a schema-backed safe field with tests.
- Arbitrary mega-menu/search/dark-mode expansion remains deferred outside this
  leaf.
- Existing primary CTA behavior stays backward-compatible and safe.
