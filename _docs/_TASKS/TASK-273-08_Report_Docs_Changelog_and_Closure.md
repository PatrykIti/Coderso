# TASK-273-08: Report, Docs, Changelog, and Closure

# FileName: TASK-273-08_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Listing Filters + Playwright QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-256-08, TASK-273-01, TASK-273-02, TASK-273-03, TASK-273-04, TASK-273-05, TASK-273-06, TASK-273-07
**Status:** Done (2026-05-20)

---

## Overview

Close the Listing Filters Playwright follow-up family with report evidence,
source-of-truth docs, task-board state, changelog entry, and final validation.

This leaf must not hide incomplete implementation behind docs updates. Every
finding from `REPORT_LISTING_FILTERS_WIDGET.md` must be marked fixed, routed to
TASK-256, or explicitly deferred with a reason.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:312-363` - final priority
  and quality summary.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:367-393` - screenshot names
  are local labels; PNG files are not repo evidence.
- `_docs/_TASKS/TASK-273_Listing_Filters_Widget_Playwright_Product_Followups.md`
  - owner matrix for this family.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Add fixed/deferred textual evidence and final replay notes for every TASK-273-owned row. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Update final schema/editor/runtime documentation. |
| `_docs/WIDGETS.md` | Update only if a global widget contract changed; otherwise leave TASK-256 as owner. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if pack readiness/completeness changes. |
| `_docs/_TASKS/TASK-273*.md` | Move completed leaves and umbrella to `Done` with dates when implementation is complete. |
| `_docs/_TASKS/README.md` | Move TASK-273 rows from To Do/In Progress to Done and update statistics. |
| `_docs/_CHANGELOG/NNN-YYYY-MM-DD-task-273-listing-filters-widget-playwright-followups.md` | Add the final changelog entry. |
| `_docs/_CHANGELOG/README.md` | Add the changelog index row. |

## Implementation Pseudocode

```md
## Fixed Evidence

| Finding | Owner leaf | Evidence | Validation |
|---|---|---|---|
| B-03 active filters | TASK-273-04 | DOM excerpt and test names | Vitest + Playwright replay |

## Deferred Evidence

| Finding | Owner | Reason | Follow-up |
|---|---|---|---|
| T-02 script policy | TASK-256-04 | Shared runtime contract | TASK-256 evidence |
```

Closure flow:

1. Re-read `REPORT_LISTING_FILTERS_WIDGET.md`, all `TASK-273*` files, current
   Listing Filters owner files, and tests.
2. Build a finding-to-owner checklist from the umbrella matrices.
3. Confirm `TASK-256-08` is closed or has current evidence for all
   TASK-256-owned Listing Filters exclusions referenced by TASK-273, and verify
   the extracted/shared owners that TASK-273 now depends on:
   TASK-262-03 for linked-results pagination, TASK-315 for shared listing
   runtime refresh behavior, and TASK-316 for shared listing-query picker
   loading/retry.
4. Run targeted validation for every implemented leaf.
5. Run required repo gates before closure:
   `bun run lint`, `bun run test:bun`, `bun run test:vitest`,
   `bun run scan:security:strict`, plus `bun run gates:coderso` if the family
   touches release-gated behavior beyond the targeted suites.
6. Update report/docs/task-board/changelog together.
7. Verify no PNG screenshots or unrelated files are staged.

Error handling:

- If any leaf is not implemented, keep TASK-273 and TASK-273-08 open and record
  the specific remaining row.
- If Playwright replay is blocked by environment, record the blocker and provide
  replacement DOM/test evidence; do not claim browser replay passed.
- If a validation lane fails for unrelated existing reasons, isolate and record
  the exact failure before deciding whether closure can proceed.

## Security Contract

This closure leaf does not add API routes.

- Endpoint visibility: none.
- Auth model/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: verify implementation leaves have schema tests for
  every new persisted field.
- Anti-abuse: verify docs/report do not include secrets, provider keys, cookies,
  bearer tokens, raw screenshots with sensitive data, or privileged debug
  payloads.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run test:bun`
- `bun run test:vitest`
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
  after the implementation leaves create the new shared runtime-script suite.
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-query-parser.test.ts`
- Any new runtime-script, validator, registry, renderer, or Playwright replay
  tests added by TASK-273 implementation leaves.
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/WIDGETS.md` only for global contract changes
- `_docs/WIDGET_PACK_MATRIX.md` only for pack readiness/completeness changes
- `_docs/_TASKS/TASK-273*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- New `_docs/_CHANGELOG/` entry for TASK-273 closure

## Acceptance Criteria

- Every row in the TASK-273 scope matrix has fixed/deferred textual evidence or
  an explicit reference to the extracted shared owners (`TASK-262-03`,
  `TASK-315`, `TASK-316`) when TASK-273 does not own that implementation seam.
- TASK-256-owned findings remain referenced to TASK-256 and are not claimed as
  TASK-273 fixes.
- Listing Filters docs match the implemented schema, editor modes, runtime
  markers, and validation behavior.
- Task board statistics and changelog index are synchronized.
- Final validation output is recorded before TASK-273 moves to `Done`.

## Validation Notes (2026-05-21 audit)

- `bun --cwd core lint`: passed
- `bun --cwd core lint:types`: passed
- `bun run lint`: passed
- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/listingRuntimeScript.test.ts tests/vitest/ui/listing-filters-editor-wave.test.tsx tests/vitest/ui/listing-filters-query-parser.test.ts tests/vitest/widgets/navigation.test.tsx tests/vitest/widgets/navigationRuntimeScript.test.ts tests/vitest/ui/navigation-editor-wave.test.tsx tests/vitest/widgets/newsletter.test.tsx tests/vitest/ui/newsletter-editor-wave.test.tsx tests/vitest/widgets/pricingPlans.test.tsx tests/vitest/ui/pricing-plans-editor-wave.test.tsx tests/vitest/widgets/productCompare.test.tsx tests/vitest/ui/product-compare-editor-wave.test.tsx tests/vitest/ui/product-compare-admin-preview.test.tsx`: passed (`14` files, `116` tests)
- `bun run test:vitest -- tests/vitest/widgets/searchBox.test.tsx tests/vitest/ui/search-box-editor-wave.test.tsx`: passed (`2` files, `14` tests)
- `bun test tests/unit/navigation/navigationRuntimeResolver.test.ts tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts`: passed (`43` tests)
- `bun run gates:coderso`: passed
- `bun run scan:security:strict`: attempted during the 2026-05-21 audit wave but failed outside TASK-273 scope because the local Semgrep trust store had no CA anchors and `bun audit` could not reach the advisory endpoint; Trivy and Gitleaks sub-scanners were clean in the same run
- `bun run precommit`: passed repeatedly while staging the 2026-05-21 audit commits
