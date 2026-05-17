# TASK-281-05: Product Table Accessibility and Runtime Semantics

# FileName: TASK-281-05_Product_Table_Accessibility_and_Runtime_Semantics.md

**Priority:** High
**Category:** Widgets + Commerce + Runtime Render + Accessibility
**Estimated Effort:** Medium
**Dependencies:** TASK-281, TASK-281-02, TASK-256-04
**Status:** To Do

---

## Overview

Repair Product Table-specific semantic output reported in the Playwright audit.
This leaf covers A1, A2, A3, A4, A5, and A6 from
`_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md`.

TASK-256 owns generic shared accessibility helpers. This leaf owns only the
current `product-table` renderer output because TASK-256 does not list
`core/widgets/core/productTable.tsx` as a concrete accessibility owner.

## Scope Boundary

In scope:

- `<caption>` support derived from Product Table heading/caption data;
- `scope="col"` on every Product Table header cell;
- Product Table section/table accessible labels;
- status/title accessible copy so draft/archive status is not announced twice
  or inconsistently;
- `role="alert"` for commerce runtime warnings;
- `aria-live` or equivalent behavior for empty/error state where dynamic admin
  preview updates are introduced;
- tests that fail on regressions in the Product Table renderer.

Out of scope:

- global widget instance ID helper design;
- unrelated pricing/FAQ/tabs/toggle accessibility repairs;
- generic table component extraction unless TASK-256 creates it first.

## Sub-Tasks

- [ ] Add a Product Table caption or equivalent tested accessible label.
- [ ] Add `scope="col"` to every rendered Product Table header cell.
- [ ] Add section/table labels that stay in sync with header/caption data.
- [ ] Align status/title accessible copy when status badges and row-state
  output are added by TASK-281-03.
- [ ] Add alert/live semantics for runtime warning and dynamic preview states.
- [ ] Add renderer/editor tests for the Product Table accessibility output.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/productTable.tsx` | Add caption/section labels, header scopes, alert/live semantics, and consistent row/cell accessible names. |
| `core/admin/ui/widgets/editors/ProductTableEditors.tsx` | Add caption/accessible-title controls if they are user-authored rather than derived from section header fields. |
| `tests/vitest/widgets/productTable.test.tsx` | Assert caption, header scopes, alert role, empty-state live behavior, and accessible label output. |
| `tests/vitest/ui/product-table-editor-wave.test.tsx` | Cover editor controls if new accessibility text fields are added. |

## Implementation Pseudocode

Renderer shape:

```tsx
const caption = normalized.table?.caption ?? normalized.header?.title ?? "Product table";
const tableLabel = normalized.table?.ariaLabel ?? caption;

<section aria-label={tableLabel}>
  {hasError ? <div role="alert">Commerce runtime warning: {error}</div> : null}
  <table aria-label={tableLabel}>
    <caption className={captionClassName}>{caption}</caption>
    <thead>
      <th scope="col">{label}</th>
    </thead>
  </table>
</section>
```

Error handling:

- Blank captions normalize to a deterministic fallback.
- If a visible section header is added by TASK-281-06, reuse it instead of
  duplicating visible text.
- Do not hide meaningful table captions unless an equivalent accessible label
  is present and tested.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: any caption/label fields must be schema-owned.
- Anti-abuse: captions and labels render as plain text, never HTML.
- Secret handling: no private runtime details in accessible labels.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
  if editor fields are added.
- `bun test tests/unit/widgets/validator.test.ts` if schema fields change.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/PRODUCT_TABLE.md` accessibility notes.
- Update `_docs/PLAYWRIGHT/REPORT_PRODUCT_TABLE_WIDGET.md` A1/A2/A3/A4/A5/A6
  evidence after implementation.

## Changelog Policy

- Covered by the TASK-281 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Product Table output includes a meaningful caption or equivalent tested label.
- Every rendered header cell has `scope="col"`.
- Runtime errors announce through `role="alert"`.
- Empty/error updates introduced by admin preview are accessible without noisy
  repeated announcements.
