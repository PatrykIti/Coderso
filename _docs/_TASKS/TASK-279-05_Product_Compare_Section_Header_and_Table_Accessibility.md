# TASK-279-05: Product Compare Section Header and Table Accessibility

# FileName: TASK-279-05_Product_Compare_Section_Header_and_Table_Accessibility.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-256-04, TASK-279-02, TASK-279-03, TASK-279
**Status:** To Do

---

## Overview

Add Product Compare section header fields and repair the widget-local table,
error, empty-state, and overflow accessibility defects reported by Playwright.

Source report coverage:

- BF-03: no section title/description above the table.
- A1: table has no caption.
- A2/A3: column headers have no `scope="col"`.
- A4: section has no accessible label.
- A7: runtime error banner has no `role="alert"`.
- A8: empty state lacks semantic role/relationship.
- A9: horizontal overflow container is not keyboard focusable.

## Scope Boundary

In scope:

- Product Compare-owned `section`/header/caption fields, normalized defaults,
  renderer output, and editor controls.
- Local table semantics for the Product Compare renderer.
- Error and empty-state roles tied to the widget's own DOM.

Out of scope:

- Global accessibility helper extraction unless TASK-256 creates it first.
- Page shell or Section widget semantics outside the Product Compare root.
- Product media alt text beyond the Product Compare media fields in
  TASK-279-03.

## Sub-Tasks

- None. This is an execution leaf.

## Current Owner Files

- `core/widgets/core/productCompare.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `tests/vitest/widgets/renderer.test.tsx` when public renderer output changes.
- `_docs/_WIDGETS/PRODUCT_COMPARE.md`

## Implementation Pseudocode

```tsx
type ProductCompareSection = {
  title?: string;
  description?: string;
  caption?: string;
  hideCaptionVisually?: boolean;
};

function normalizeProductCompareSection(value: unknown): ProductCompareSection {
  return compactObject({
    title: optionalText(value.title),
    description: optionalText(value.description),
    caption: text(value.caption, value.title ?? "Product comparison"),
    hideCaptionVisually: value.hideCaptionVisually !== false,
  });
}

function ProductCompareBlock({ data }: Props) {
  const headingId = useStableProductCompareId("heading", data);
  return (
    <section aria-labelledby={section.title ? headingId : undefined} aria-label={!section.title ? section.caption : undefined}>
      {section.title ? <h2 id={headingId}>{section.title}</h2> : null}
      {hasError ? <div role="alert">Commerce runtime warning: {error}</div> : null}
      {rows.length === 0 ? (
        <div role="status" aria-live="polite">
          <p>{normalized.emptyState?.title}</p>
          <p>{normalized.emptyState?.description}</p>
        </div>
      ) : null}
      <div tabIndex={0} aria-label="Product comparison table" className="overflow-x-auto">
        <table>
          <caption className={section.hideCaptionVisually ? "sr-only" : undefined}>{section.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{attributeHeaderLabel}</th>
              {rows.map((row) => <th scope="col" key={row.id}>{row.title}</th>)}
            </tr>
          </thead>
        </table>
      </div>
    </section>
  );
}
```

Error handling:

- Empty title falls back to `aria-label`/caption so the section remains named.
- Empty caption falls back to title or "Product comparison".
- Empty state remains visible, keeps the existing copy, and exposes a stable
  semantic status/relationship instead of plain orphan text.

Regression shape:

- Renderer tests assert caption, `scope="col"`, section label/heading,
  `role="alert"`, empty-state semantics, and `tabindex="0"` for overflow
  container.
- Editor tests assert section title/description/caption fields normalize and
  update without breaking empty-state controls.
- Public renderer smoke covers the same markup when Product Compare is rendered
  through the page renderer.

## Security Contract

This leaf does not add routes.

- Endpoint visibility: unchanged public read-only rendering and internal admin
  editing.
- Auth/RBAC/CSRF: unchanged widget save protections.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: section/caption fields must be declared in
  `productCompareSchema`.
- Anti-abuse: section text is plain text. No raw HTML, scripts, or ARIA ID
  values from untrusted payloads.
- Secret handling: no private data in labels, captions, or warnings.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productCompare.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer output changes.
- `bun test tests/unit/widgets/validator.test.ts` when schema changes.
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/_WIDGETS/PRODUCT_COMPARE.md`
- `_docs/PLAYWRIGHT/REPORT_PRODUCT_COMPARE_WIDGET.md`
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` when completed.

## Acceptance Criteria

- Product Compare can render a section title/description above the comparison.
- The table has a caption and scoped column headers.
- The section is named by heading or aria-label.
- Runtime error and empty-state output are announced semantically with an
  explicit empty-state role/relationship, not only plain paragraphs.
- Horizontal table scrolling is reachable by keyboard.
