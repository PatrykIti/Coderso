# TASK-244-03-02: Booking, Listing, Search, and Commerce Frame Surface Clear

# FileName: TASK-244-03-02_Booking_Listing_Search_and_Commerce_Frame_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Operational Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-244-03
**Status:** To Do

---

## Overview

Add clearable visual shell/surface controls to operational widgets that render
forms, filters, search, product cards, and tables inside hard-coded frames.

Target widgets:

- `booking-calendar`
- `appointment-form`
- `listing-filters`
- `search-box`
- `product-gallery`
- `product-table`
- `product-compare`

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/bookingCalendar.tsx`
- `core/widgets/core/appointmentForm.tsx`
- `core/widgets/core/listingFilters.tsx`
- `core/widgets/core/searchBox.tsx`
- `core/widgets/core/productGallery.tsx`
- `core/widgets/core/productTable.tsx`
- `core/widgets/core/productCompare.tsx`
- matching editor files under `core/admin/ui/widgets/editors/`
- matching widget/editor tests
- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`

## Implementation Notes

Keep semantic state colors intact:

- warning/runtime errors;
- validation failures;
- success messages;
- stock or availability state colors;
- destructive states.

Only clear user-configurable frame/surface/background styling.

## Implementation Pseudocode

```ts
type OperationalSurfaceStyle = {
  frameBackground?: string;
  frameBorderColor?: string;
  tableBackground?: string;
  headerBackground?: string;
  primaryActionBackground?: string;
};

const frameStyle = compactStyle({
  backgroundColor: resolveClearableStyleValue(style.frameBackground),
  borderColor: resolveClearableStyleValue(style.frameBorderColor),
});
```

For table widgets, preserve table structure and scroll wrappers:

```tsx
<div className={joinClasses("overflow-x-auto rounded-xl border", hasSurface ? undefined : "border-transparent")} style={tableStyle}>
  <table className="min-w-full text-sm">...</table>
</div>
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/bookingCalendar.test.tsx tests/vitest/widgets/appointmentForm.test.tsx tests/vitest/widgets/listingFilters.test.tsx tests/vitest/widgets/searchBox.test.tsx tests/vitest/widgets/productGallery.test.tsx tests/vitest/widgets/productTable.test.tsx tests/vitest/widgets/productCompare.test.tsx`
- Matching editor-wave tests:
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `tests/vitest/ui/product-table-editor-wave.test.tsx`
  - `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- Add tests proving `Clear` removes style keys and rendered backgrounds.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- impacted `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Operational widget frames can be cleared without breaking controls.
2. Commerce cards/tables can remove visual surfaces while preserving layout.
3. Semantic state colors remain untouched.
4. Runtime/editor tests cover cleared/default behavior.
