# TASK-319-02: Newsletter Bounded Mobile Variant Implementation

# FileName: TASK-319-02_Newsletter_Bounded_Mobile_Variant_Implementation.md

**Priority:** Low
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Large
**Dependencies:** TASK-319-01
**Status:** To Do

---

## Overview

Implement a bounded Newsletter mobile variant override only if `TASK-319-01`
explicitly approves it.

This leaf owns code changes only after the product decision is made. It must
not introduce arbitrary breakpoint maps or shared breakpoint infrastructure.

## Sub-Tasks

- None. This is an execution-ready implementation leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Add the approved bounded mobile override model and runtime resolution only if `TASK-319-01` approved it. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add bounded editor controls and truthful mobile behavior guidance. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover render behavior for the approved bounded contract. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover editor controls and guidance copy for the approved contract. |
| `tests/unit/widgets/validator.test.ts` | Update only if a new schema field is introduced. |

## Implementation Pseudocode

```ts
type NewsletterResponsiveLayout = {
  mobileVariant?: "inherit" | "stacked";
};

function resolveNewsletterMobileVariant(
  variant: NewsletterVariantId,
  layout: NewsletterResponsiveLayout | undefined
) {
  return layout?.mobileVariant === "stacked" ? "stacked" : variant;
}
```

## Data Flow

1. Newsletter schema/defaults own one bounded optional mobile override field.
2. Normalization clamps that field to the approved enum.
3. Editor surfaces the bounded choice with explicit mobile-behavior guidance.
4. Runtime resolves the effective mobile variant from the scalar base variant
   plus the bounded override.

Error handling:

- Do not introduce arbitrary breakpoint maps or raw media-query fields.
- If `TASK-319-01` rejected the feature, stop and leave this leaf closed as not
  applicable instead of widening scope.
- New fields must reject unknown values through schema validation.

Regression-test shape:

```ts
test("newsletter applies the approved bounded mobile override only on mobile resolution", () => {
  expect(resolveNewsletterMobileVariant("inline", { mobileVariant: "stacked" })).toBe("stacked");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: any new responsive field must stay schema-bounded.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun run scan:security:strict`
- `bun run precommit`
- `git diff --check`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_TASKS/TASK-319*.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- Newsletter ships only the approved bounded mobile override contract.
- Editor and runtime behavior stay truthful and tested.
- The implementation stays Newsletter-local and does not widen into shared
  breakpoint infrastructure.
