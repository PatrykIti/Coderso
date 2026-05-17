# TASK-280-08: Product Gallery Report Docs Changelog and Closure

# FileName: TASK-280-08_Product_Gallery_Report_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** Widgets + Commerce + Documentation + QA
**Estimated Effort:** Medium
**Dependencies:** TASK-280-01, TASK-280-02, TASK-280-03, TASK-280-04, TASK-280-05, TASK-280-06, TASK-280-07
**Status:** To Do

---

## Overview

Close the Product Gallery Playwright follow-up family with report evidence,
widget docs, changelog, board synchronization, and validation proof.

This leaf covers the final fixed/deferred evidence for
`_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`.

## Scope Boundary

In scope:

- refresh Product Gallery report findings with textual evidence;
- update Product Gallery widget docs and pack matrix only when behavior changed;
- update task statuses, `_docs/_TASKS/README.md`, changelog entry, and changelog
  index;
- run and record the required validation lanes.

Out of scope:

- committing Playwright PNG screenshots;
- closing TASK-256 shared-contract rows from inside TASK-280;
- claiming the Product Gallery family complete while any TASK-280 leaf remains
  unimplemented or explicitly deferred without reason.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md` | Add fixed/deferred status and textual admin/frontend evidence for Product Gallery rows. |
| `_docs/_WIDGETS/PRODUCT_GALLERY.md` | Refresh the final schema/editor/runtime contract. |
| `_docs/WIDGETS.md` | Update only if a shared widget contract changed outside TASK-256. |
| `_docs/WIDGET_PACK_MATRIX.md` | Update only if Product Gallery pack readiness/completeness changed. |
| `_docs/_TASKS/TASK-280*.md` | Move completed/deferred statuses with dates and validation notes. |
| `_docs/_TASKS/README.md` | Move rows and recompute board statistics. |
| `_docs/_CHANGELOG/{N}-2026-05-17-task-280-product-gallery-followups.md` | Add final user-facing changelog entry when the family is done. |
| `_docs/_CHANGELOG/README.md` | Add the new changelog index row with the next unused number. |

## Implementation Pseudocode

Report closure flow:

```ts
type ProductGalleryFindingStatus = "fixed" | "deferred" | "owned-by-task-256" | "out-of-family";

function classifyFinding(findingId: string): ProductGalleryFindingStatus {
  if (task256Findings.has(findingId)) return "owned-by-task-256";
  if (implementedTask280Findings.has(findingId)) return "fixed";
  if (sharedCommerceFindings.has(findingId)) return "out-of-family";
  return "deferred";
}
```

Documentation flow:

1. Re-read `REPORT_PRODUCT_GALLERY_WIDGET.md` and every `TASK-280*` file.
2. Verify each report row maps to TASK-256, a completed TASK-280 leaf, an
   explicit out-of-family shared-commerce item, or a documented deferral.
3. Update `_docs/_WIDGETS/PRODUCT_GALLERY.md` to match the final live schema and
   runtime behavior.
4. Update task files/statuses, board counts, and changelog only after validation
   proof is available.

Error handling:

- If any report row cannot be mapped, keep TASK-280 open and add or repair a
  physical leaf before closure.
- If validation fails for unrelated reasons, record the blocker and do not mark
  the leaf `Done` until the required Product Gallery evidence is clear.
- If `_docs/_TASKS/README.md` has drift from parallel agents, preserve unrelated
  rows and recompute counts from current file statuses instead of overwriting
  the board from an older branch.

Regression-test shape:

```sh
git diff --check
bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx
bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx
bun test tests/unit/commerce/commerceWidgetRuntime.test.ts
bun --cwd core lint
bun --cwd core lint:types
bun run gates:coderso
bun run scan:security:strict
bun run precommit
```

## Security Contract

This closure leaf does not add API routes.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: closure must verify every new Product Gallery
  schema field has validator or focused schema coverage.
- Anti-abuse: closure must verify no raw HTML, scripts, arbitrary class names,
  unsafe hrefs, or provider secrets were added.
- Secret handling: Playwright evidence, docs, and changelog must not include
  provider keys, private URLs, cookies, tokens, or privileged settings.

## Testing Requirements

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/productGallery.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts` if resolver
  mapping changed in earlier leaves.
- `bun test tests/unit/commerce/commerceQueryService.test.ts` if query semantics
  changed in earlier leaves.
- `bun test tests/unit/widgets/validator.test.ts` if schema/defaults changed.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- `_docs/PLAYWRIGHT/REPORT_PRODUCT_GALLERY_WIDGET.md`
- `_docs/_WIDGETS/PRODUCT_GALLERY.md`
- `_docs/WIDGETS.md` only for shared contract changes
- `_docs/WIDGET_PACK_MATRIX.md` only for readiness/completeness changes
- `_docs/_TASKS/TASK-280*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/{N}-2026-05-17-task-280-product-gallery-followups.md`

## Acceptance Criteria

- Every Product Gallery report finding has a current status with evidence or a
  documented owner outside TASK-280.
- TASK-280 task files, board, docs, report, changelog, and validation notes
  agree.
- No Playwright PNG files are committed.
- Final validation output is recorded before moving the family to `Done`.
