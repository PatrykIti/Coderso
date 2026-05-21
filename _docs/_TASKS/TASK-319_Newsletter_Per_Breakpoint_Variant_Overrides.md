# TASK-319: Newsletter Per-Breakpoint Variant Overrides

# FileName: TASK-319_Newsletter_Per_Breakpoint_Variant_Overrides.md

**Priority:** Low
**Category:** Widgets + Admin UI + Runtime Render + Responsive Layout
**Estimated Effort:** Large
**Dependencies:** TASK-276, TASK-276-04, TASK-276-06
**Status:** To Do

---

## Overview

Evaluate whether Newsletter should support different variants per breakpoint
after the TASK-276 family landed truthful mobile guidance and bounded width /
style controls.

`REPORT_NEWSLETTER_WIDGET.md` row `BF-15` asked for desktop/mobile variant
splits such as `inline` on desktop and `stacked` on mobile. TASK-276 made the
current responsive behavior explicit, but it intentionally did not widen the
schema into breakpoint-owned variant maps during the same stabilization wave.
This follow-up exists so the defer reason is physical, explicit, and
execution-ready.

## Scope Boundary

This task owns:

- A Newsletter-only decision on whether `variant` remains scalar or gains a
  bounded breakpoint override model.
- If approved, schema/default/normalizer/render/editor/test/doc support for a
  limited responsive variant contract.
- Truthful editor copy showing the effective mobile and desktop layouts.

This task does not own:

- Shared widget breakpoint infrastructure for unrelated widgets.
- Raw arbitrary CSS, custom media queries, or unbounded responsive maps.
- Reopening TASK-276 shared clear/color/runtime seams.

## Sub-Tasks

- [ ] Audit the landed TASK-276 Newsletter behavior against real mobile and
  desktop expectations to decide whether per-breakpoint variants are still
  needed.
- [ ] If the product decision stays `no`, document the rejection explicitly in
  `_docs/_WIDGETS/NEWSLETTER.md` and the Newsletter Playwright report closure.
- [ ] If the product decision is `yes`, add a bounded schema such as
  `layout.mobileVariant?: "inherit" | "stacked"` without introducing arbitrary
  breakpoint maps.
- [ ] Keep editor ownership local to Newsletter and show effective mobile
  behavior in Wizard/Visual without duplicating shared mode controls.
- [ ] Add focused runtime/editor/validator coverage for the approved contract.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Add the approved responsive variant model or explicitly document/retain scalar behavior. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add bounded responsive variant controls or explicit rejection guidance. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover render behavior for the approved responsive contract. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover the editor flow and guidance copy. |
| `tests/unit/widgets/validator.test.ts` | Update when schema changes. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document the final responsive-variant decision. |
| `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` | Update BF-15 evidence. |

## Implementation Pseudocode

```ts
type NewsletterResponsiveLayout = {
  mobileVariant?: "inherit" | "stacked";
};

function resolveNewsletterMobileVariant(
  variant: NewsletterVariantId,
  layout: NewsletterResponsiveLayout | undefined
) {
  if (layout?.mobileVariant === "stacked") return "stacked";
  return variant;
}
```

## Data Flow

1. Re-read the shipped Newsletter runtime/editor behavior from `TASK-276`
   before deciding whether a new responsive field is warranted.
2. If the decision is `no`, keep the current scalar `variant` contract and
   route the outcome into truthful editor/report/docs guidance only.
3. If the decision is `yes`, normalize one bounded override field such as
   `layout.mobileVariant` through Newsletter-owned schema/defaults/editor flow.
4. Runtime resolves the effective mobile variant from the saved scalar variant
   plus the bounded override instead of adding arbitrary breakpoint maps.

Error handling:

- Keep the decision explicit. Do not silently ship breakpoint logic without
  documenting it, and do not silently reject the request without updating docs
  and report evidence.
- Any new responsive field must stay bounded and reject unknown values through
  Newsletter-owned schema validation.
- If the product decision is `no`, editor copy must explain the effective mobile
  behavior truthfully instead of pretending a per-breakpoint override exists.

Regression-test shape:

```ts
test("newsletter keeps scalar variant behavior when no mobile override is configured", () => {
  expect(resolveNewsletterMobileVariant("inline", undefined)).toBe("inline");
});

test("newsletter supports only the approved bounded mobile override when the schema allows it", () => {
  expect(resolveNewsletterMobileVariant("inline", { mobileVariant: "stacked" })).toBe("stacked");
});
```

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged admin editing and public rendering.
- Reject-unknown validation: any new responsive field must stay schema-bounded.
- Anti-abuse: unchanged.
- Secret handling: unchanged.

## Testing Requirements

- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run scan:security:strict`
- `bun run precommit`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when schema changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` only when this task is completed

## Changelog Policy

- No changelog entry is needed until this task moves to `Done`.

## Acceptance Criteria

- Newsletter either has a bounded, tested responsive variant contract or an
  explicit documented rejection of per-breakpoint overrides.
- The editor accurately explains the effective mobile behavior.
- The final decision is reflected in the Newsletter widget doc and report.
