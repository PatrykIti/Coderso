# TASK-281-05: Product Table Accessibility and Runtime Semantics

# FileName: TASK-281-05_Product_Table_Accessibility_and_Runtime_Semantics.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-281, TASK-281-01, TASK-281-02, TASK-281-04, TASK-256-04
**Status:** Done (2026-05-21)

---

## Overview

Repair Product Table-specific semantic output reported in the Playwright audit.
This leaf covers A1, A2, A4, A5, and A6 from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`. A3 ownership stays with
`TASK-281-03`, which already removed duplicated title/status copy.

TASK-256 owns generic shared accessibility helpers. This leaf owns only the
current `product-table` renderer output because TASK-256 does not list
`core/widgets/core/productTable.tsx` as a concrete accessibility owner.

## Scope Boundary

In scope:

- deterministic `<caption>` support for the current Product Table renderer;
- `scope="col"` on every Product Table header cell, including the Action
  column added by `TASK-281-04`;
- Product Table section/table accessible labels without redundant wrapper table
  roles;
- `role="alert"` for commerce runtime warnings;
- preview/live-region semantics that stay local to `productTable.tsx`;
- tests that fail on regressions in the Product Table renderer, including the
  existing `TASK-281-03` status badge/title accessible-copy baseline.

Out of scope:

- global widget instance ID helper design;
- visible section header, eyebrow, title, or description fields owned by
  `TASK-281-06`;
- unrelated pricing/FAQ/tabs/toggle accessibility repairs;
- generic table component extraction unless TASK-256 creates it first.

## Sub-Tasks

- [x] Add a Product Table caption or equivalent tested accessible label.
- [x] Add `scope="col"` to every rendered Product Table header cell.
- [x] Add section/table labels that preserve native table semantics.
- [x] Lock the existing `TASK-281-03` status badge/title accessible-copy
  baseline so A3 does not regress.
- [x] Add alert/live semantics for runtime warning and dynamic preview states.
- [x] Add focused renderer tests for the Product Table accessibility output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add caption/section labels, header scopes, alert/live semantics, and native table accessibility labeling. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert caption, header scopes, alert role, empty-state live behavior, and the existing status/title accessible-copy baseline. |

## Implementation Pseudocode

Renderer shape:

```tsx
const captionText = "Product table";
const captionId = useId();

<section aria-label={captionText}>
  {hasError ? <div role="alert">Commerce runtime warning: {error}</div> : null}
  <div tabIndex={0} aria-label={captionText}>
    <table aria-labelledby={captionId}>
      <caption id={captionId} className="sr-only">{captionText}</caption>
      <thead>
        <th scope="col">{label}</th>
      </thead>
    </table>
  </div>
</section>
```

Error handling:

- Use a deterministic fallback caption until visible section header fields land
  in `TASK-281-06`.
- Preserve native `<table>` semantics; do not add a redundant wrapper
  `role="table"`.
- Keep preview/live-region work local to `productTable.tsx`; split to a shared
  task only if a reusable helper becomes necessary.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any caption/label fields must be schema-owned.
- Anti-abuse: captions and labels render as plain text, never HTML.
- Secret handling: no private runtime details in accessible labels.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` accessibility notes.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` A1/A2/A4/A5/A6
  evidence after implementation and synchronize the A3 ownership note with
  `TASK-281-03`.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table output includes a meaningful caption or equivalent tested label.
- Every rendered header cell, including the Action header, has `scope="col"`.
- Runtime errors announce through `role="alert"`.
- Empty/error updates introduced by admin preview are accessible without noisy
  repeated announcements.
- Visible section header fields remain deferred to `TASK-281-06`.


## Validation Evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Closure Notes

- Product Table now keeps native table semantics through an sr-only `Product table` caption, explicit `scope="col"` headers for every rendered column including Action, and deterministic section/table labels without adding a redundant wrapper `role="table"`.
- Commerce runtime warnings now announce through `role="alert"`, preview refresh banners announce through `role="status"` with polite live behavior, and the existing editor-preview empty-state live region is now locked by focused SSR coverage.
- A3 ownership is synchronized back to `TASK-281-03`: the status badge/title accessible-copy baseline stays covered here only as regression protection while visible section header fields remain deferred to `TASK-281-06`.
