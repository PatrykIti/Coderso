# TASK-319-01: Newsletter Responsive Variant Audit and Product Decision

# FileName: TASK-319-01_Newsletter_Responsive_Variant_Audit_and_Product_Decision.md

**Priority:** Medium
**Category:** Widgets + Product Decision + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-319, TASK-276, TASK-276-04, TASK-276-06
**Status:** Done (2026-05-21)

---

## Overview

Audit the shipped Newsletter desktop/mobile behavior and record whether a
bounded per-breakpoint override is still warranted.

This leaf owns the product decision only. It must not silently implement schema
or editor changes during the same step.

## Decision Outcome

- 2026-05-21: reject a new per-breakpoint Newsletter variant override as
  unnecessary.
- The shipped `inline` and `minimal` variants already render stacked mobile
  layouts and only switch to a row from the `sm` breakpoint upward.
- That existing scalar contract already covers the BF-15 example (`inline` on
  desktop, stacked on mobile), so code work routes to closure rather than a new
  schema field.

## Sub-Tasks

- None. This is an execution-ready decision leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` | Record whether BF-15 still requires implementation or is rejected after auditing shipped behavior. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Add explicit current-state guidance if the decision is rejection/current-state OK. |
| `_docs/_TASKS/TASK-319*.md` | Record the decision and route follow-up work to the correct physical leaf. |

## Implementation Pseudocode

```md
if (current mobile behavior is already truthful and sufficient) {
  decision = "reject";
  owner = "TASK-319-03";
} else {
  decision = "approve-bounded-mobile-override";
  owner = "TASK-319-02";
}
```

## Data Flow

1. Re-read the shipped `TASK-276` Newsletter runtime/editor behavior.
2. Compare the current scalar variant behavior against BF-15 expectations.
3. Record one explicit decision: reject/current-state OK, or approve a bounded
   mobile override.
4. Route any code work only to `TASK-319-02`.

Error handling:

- Do not mix decision capture with schema/editor/runtime implementation.
- If evidence is mixed, keep the result explicit and route the unresolved gap to
  `TASK-319-02` rather than leaving the parent task ambiguous.

Regression-test shape:

```md
- Capture the exact current runtime/editor evidence used for the decision.
```

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged in this decision leaf.
- Anti-abuse: unchanged.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `git diff --check`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md`
- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/_TASKS/TASK-319*.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

- BF-15 has one explicit product decision backed by current evidence.
- The decision routes implementation to `TASK-319-02` or closes through
  `TASK-319-03`; it does not remain implicit in the parent task.


## Validation Notes (2026-05-21)

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx` - passed
  (`13` tests), including scalar/mobile layout proof and rejection of an
  unknown responsive override field
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx` -
  passed (`6` tests), including truthful mobile-guidance assertions
- `bun --cwd core lint` - passed
- `bun --cwd core lint:types` - passed
- `git diff --check` - passed

## Completion Notes

- 2026-05-21: the audit concluded that the shipped scalar variants already
  cover the cited desktop-inline/mobile-stacked request, so follow-up work
  routes directly to TASK-319-03 closure instead of TASK-319-02 implementation.
