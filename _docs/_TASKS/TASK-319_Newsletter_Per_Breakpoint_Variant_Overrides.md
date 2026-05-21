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
execution-ready. The parent task is an umbrella only; implementation must land
through the physical subtasks below.

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

- [ ] TASK-319-01: Newsletter Responsive Variant Audit and Product Decision
- [ ] TASK-319-02: Newsletter Bounded Mobile Variant Implementation
- [ ] TASK-319-03: Newsletter Responsive Variant Docs and Closure

## Implementation Order

1. Land `TASK-319-01` first to capture the product decision from current
   shipped behavior and report evidence.
2. Land `TASK-319-02` only if `TASK-319-01` approves a bounded mobile override.
3. Land `TASK-319-03` last to close docs/report/changelog/board against the
   actual decision and shipped behavior.

## Files to Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-319*.md` | Keep the decision, implementation leaf, and closure leaf synchronized. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Reflect the final product decision once the physical owner leaf lands. |
| `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` | Record BF-15 evidence through the exact owner leaf. |
| `_docs/_TASKS/README.md` | Track the new `TASK-319-*` physical subtasks and board statistics. |

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
- The decision and any implementation/closure work route through physical
  `TASK-319-*` leaves instead of one mixed decision-plus-implementation task.
