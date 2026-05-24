# TASK-336-15: Renderer Fixture Overflow and Team UX Contract

# FileName: TASK-336-15_Renderer_Fixture_Overflow_and_Team_UX_Contract.md

**Priority:** Medium
**Category:** Widgets + Frontend CSS + Fixtures + Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-336-03, TASK-336-13, TASK-336-14
**Status:** Done (2026-05-24)

---

## Overview

Close frontend CSS and fixture gaps found during the 38-widget re-audit.

Some widgets can look correct in admin but fail or remain unproven on the
frontend because fixture content is empty, weak, or missing. This task makes
frontend smoke meaningful and fixes known CSS drift such as overflow and Team
spotlight layout behavior.

## Scope

- Improve public fixtures so widgets render realistic content.
- Add explicit intentional-overflow markers where overflow is a product choice.
- Fix unintentional public CSS overflow or layout drift.
- Recheck Team spotlight and representative long-content cases.
- Ensure Playwright can distinguish real frontend bugs from empty fixture noise.

## Widgets in Scope

- `team`
- `testimonials`
- `pricing-plans`
- `product-gallery`
- `product-compare`
- `product-table`
- `content-list`
- `stack`
- `split-layout`
- `grid-columns`
- Any widget flagged by `TASK-336-03` as frontend CSS/fixture gap.

## Sub-Tasks

- [x] Run the Playwright frontend smoke and collect current failures.
- [x] Replace empty fixture data with realistic bounded content.
- [x] Add long-name/long-copy Team spotlight fixture coverage.
- [x] Add intentional overflow markers to widgets where horizontal scroll is a
  deliberate interaction.
- [x] Fix any unintentional `body` overflow.
- [x] Add renderer/unit tests where CSS classes or runtime markup change.
- [x] Re-run Playwright frontend smoke and save evidence.
- [x] Update report rows with final CSS/fixture status.

## Status Notes

- 2026-05-24: Initial frontend-only smoke recorded
  `publicFailures=2` (`testimonials`, `team`) and `fixtureGaps=8`.
- 2026-05-24: Fixed Team spotlight rail collapse, approved horizontal-scroll
  affordances, row-flow child containment, and the Playwright intentional
  overflow allowlist. Repaired public fixture data for Stack/Split/Grid,
  Content List, commerce widgets, Search Box, Timeline, and Template Section.
  Rerun evidence:
  `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-15-front-rerun-2026-05-24.md`
  with 38/38 widgets passing and zero public failures/fixture gaps.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/team.tsx` | Fix or document Team spotlight frontend layout behavior if needed. |
| `core/widgets/core/testimonials.tsx` | Add intentional overflow marker if slider/static overflow is deliberate. |
| `core/widgets/core/pricingPlans.tsx` | Add intentional overflow marker or fix CSS if overflow is accidental. |
| `core/widgets/core/product*.tsx` | Improve realistic fixture coverage and CSS checks. |
| `core/widgets/core/contentList.tsx` | Improve fixture coverage if empty content hides render bugs. |
| `core/widgets/core/stack.tsx` | Add representative nested fixture coverage. |
| `core/widgets/core/splitLayout.tsx` | Add representative responsive fixture coverage. |
| `core/widgets/core/gridColumns.tsx` | Add deep fixture coverage for current layout cases. |
| `_docs/PLAYWRIGHT/` | Store smoke output and screenshots. |

## Implementation Pseudocode

```ts
function assertNoUnexpectedBodyOverflow(page: Page) {
  return page.evaluate(() => {
    const roots = document.querySelectorAll<HTMLElement>("[data-widget-renderer], main > *");
    const candidates = [...roots].flatMap((root) => [
      root,
      ...root.querySelectorAll<HTMLElement>("*"),
    ]);
    const overflowing = candidates
      .filter((element) => element.scrollWidth > element.clientWidth)
      .filter((element) => element.dataset.overflowIntentional !== "true");
    return overflowing.map((element) => ({
      tag: element.tagName,
      className: element.className,
      width: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
  });
}
```

Data flow:

- Fixture inventory identifies which public page covers each widget.
- Public renderer receives realistic normalized widget data.
- Playwright checks body overflow and widget-specific layout assertions.
- Runtime tests cover markup/class changes where Playwright alone is too broad.

Error handling:

- Do not mark overflow intentional unless it is a user-facing interaction with
  visible affordance.
- Do not create oversized fixture data that exceeds the widget's product
  contract.
- Do not hide frontend bugs by clipping the page globally.
- Scope overflow scanning to known page/widget roots and use a Playwright
  timeout guard so dense overlays or unrelated browser chrome do not create
  flaky false positives.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: fixture content must not include scripts, unsafe HTML, or
  untrusted external payloads.
- Secret handling: no secrets, private draft data, or real customer data in
  fixtures/screenshots.

## Testing Requirements

- Focused widget renderer tests for any changed runtime markup/classes.
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts` if
  fixture changes touch widget definitions.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI frontend CSS/overflow smoke for all affected fixtures.

Regression-test shape:

- Body overflow is zero unless the owning element has
  `data-overflow-intentional="true"`.
- Team spotlight remains readable with long names/roles/bios.
- Product/content fixtures are non-empty and representative.
- Stack/Split/Grid fixture pages expose nested layout behavior.

## Documentation Updates Required

- Append a dated TASK-336-15 status note to the Playwright re-audit report or
  leave source evidence stable and link the final superseding report from
  TASK-336-17.
- Update affected widget docs if product overflow behavior is intentional.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Frontend fixture pages give meaningful coverage for affected widgets.
- Unintentional body overflow is fixed.
- Intentional overflow is marked and documented.
- Team spotlight and representative complex layouts pass smoke checks.
