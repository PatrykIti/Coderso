# TASK-244-03-02: Booking, Listing, Search, and Commerce Frame Surface Clear

# FileName: TASK-244-03-02_Booking_Listing_Search_and_Commerce_Frame_Surface_Clear.md

**Priority:** High
**Category:** Widgets + Operational Runtime
**Estimated Effort:** Large
**Dependencies:** TASK-244-01-01, TASK-244-01-02, TASK-244-02-02
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
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
- `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
- `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
- `core/admin/ui/widgets/editors/CommerceWidgetEditorShared.tsx` only if the
  product widgets share the same style editor controls
- `tests/vitest/widgets/bookingCalendar.test.tsx`
- `tests/vitest/widgets/appointmentForm.test.tsx`
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/widgets/searchBox.test.tsx`
- `tests/vitest/widgets/productGallery.test.tsx`
- `tests/vitest/widgets/productTable.test.tsx`
- `tests/vitest/widgets/productCompare.test.tsx`
- `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
- `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `tests/vitest/ui/search-box-editor-wave.test.tsx`
- `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
- `tests/vitest/ui/product-table-editor-wave.test.tsx`
- `tests/vitest/ui/product-compare-editor-wave.test.tsx`
- `_docs/WIDGETS.md`

No per-widget docs currently exist under `_docs/_WIDGETS/` for these seven
widgets. Update `_docs/WIDGETS.md`; create exact new `_docs/_WIDGETS/*.md` files
only if implementation introduces a new per-widget documentation surface.

## Implementation Notes

Keep semantic state colors intact:

- warning/runtime errors;
- validation failures;
- success messages;
- stock or availability state colors;
- destructive states.

Only clear user-configurable frame/surface/background styling.

Several target widgets do not currently expose a `style` object. This leaf is
therefore a contract-extension task, not only an editor affordance task:

- `booking-calendar` has no `style` object in `BookingCalendarData` and no
  schema style property at `bookingCalendar.tsx:31-54` and
  `bookingCalendar.tsx:178-245`;
- `appointment-form` has no `style` object in `AppointmentFormData` and no
  schema style property at `appointmentForm.tsx:8-32` and
  `appointmentForm.tsx:68-100`;
- `listing-filters` has no `style` object in `ListingFiltersData` and no schema
  style property at `listingFilters.tsx:16-33` and `listingFilters.tsx:128-267`;
- `search-box` has no `style` object in `SearchBoxData` and no schema style
  property at `searchBox.tsx:14-33` and `searchBox.tsx:63-97`;
- `product-table` has no style contract in `ProductTableData` / schema at
  `productTable.tsx:16` and `productTable.tsx:153`;
- `product-compare` has no style contract in `ProductCompareData` / schema at
  `productCompare.tsx:16` and `productCompare.tsx:127`;
- `product-gallery` exposes a limited style contract, but new card/empty surface
  clear fields must still be added to its existing type/schema/default/
  normalizer/editor path.

For every new style field, extend the owning widget module in place, preserve
`additionalProperties: false`, and add schema tests that accept the new field,
accept cleared omission, and reject unknown style keys. Reuse existing editor
sections for presentation/style controls; do not create a second operational
widget styling flow.

## Per-Widget Implementation Matrix

| Widget | Runtime fields/classes to own | Editor contract | Regression tests |
|---|---|---|---|
| `booking-calendar` | Add a minimal `style` contract, then replace root `bg-[var(--color-bg)]/95` at `bookingCalendar.tsx:348` with clearable `style.frameBackground`; keep warning colors at `bookingCalendar.tsx:361-364`; make refresh action background clearable only if it becomes a style field | Extend existing `BookingCalendarEditors.tsx` presentation/style area with frame/action controls plus `Clear`; remove keys from `style` | Assert schema accepts new fields/rejects unknown style keys; cleared frame omits `backgroundColor`/forced bg class and warning state still renders |
| `appointment-form` | Add a minimal `style` contract, then replace root `appointmentForm.tsx:229` and selected-slot panel `appointmentForm.tsx:250` with clearable frame/summary surfaces; submit background at `appointmentForm.tsx:317-323` is style-owned only if exposed | Extend existing `AppointmentFormEditors.tsx` presentation/style area for frame/summary/action fields plus `Clear` | Assert schema accepts new fields/rejects unknown style keys; cleared root and selected-slot surfaces omit background output; error/success colors stay intact |
| `listing-filters` | Add a minimal `style` contract, then replace filter shell `listingFilters.tsx:493`; treat apply button `listingFilters.tsx:543-548` as style-owned only when editor exposes it | Extend existing `ListingFiltersEditors.tsx` presentation/style area plus `Clear` | Assert schema accepts new fields/rejects unknown style keys; filter form still works and cleared shell/action keys are absent |
| `search-box` | Add a minimal `style` contract, then replace listing shell `searchBox.tsx:190-221` and global shell `searchBox.tsx:265-292`; treat submit button background as style-owned only when exposed | Extend existing `SearchBoxEditors.tsx` presentation/style area plus `Clear` | Assert schema accepts new fields/rejects unknown style keys; both listing and global variants omit cleared shell backgrounds |
| `product-gallery` | Replace empty state `productGallery.tsx:342` and card backgrounds `productGallery.tsx:363-365` with clearable empty/card surfaces | Add clearable card/empty surface controls in `ProductGalleryEditors.tsx`; use `CommerceWidgetEditorShared.tsx` only for shared product style UI | Assert cards and empty state can render without forced backgrounds while stock labels remain semantic |
| `product-table` | Add a minimal `style` contract, then replace empty state `productTable.tsx:350`, table wrapper `productTable.tsx:359`, and header `productTable.tsx:362` with clearable surfaces | Extend existing `ProductTableEditors.tsx` presentation/style area with table/header/empty clear controls | Assert schema accepts new fields/rejects unknown style keys; table wrapper/header omit cleared backgrounds and structure stays scrollable |
| `product-compare` | Add a minimal `style` contract, then replace empty state `productCompare.tsx:339`, table wrapper `productCompare.tsx:348`, and header `productCompare.tsx:351` with clearable surfaces | Extend existing `ProductCompareEditors.tsx` presentation/style area with table/header/empty clear controls | Assert schema accepts new fields/rejects unknown style keys; compare table wrapper/header omit cleared backgrounds and attribute rows remain readable |

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

When an editor clears a field, remove the property from `style`.

```ts
const clearOperationalStyle = (key: keyof OperationalSurfaceStyle) => {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  onChange({
    ...value,
    style: Object.keys(nextStyle).length > 0 ? nextStyle : undefined,
  });
};
```

## Security Contract

- Visibility:
  - booking/listing/search/commerce widget editor controls are internal admin UI;
  - rendered widgets remain public runtime output.
- Auth model:
  - no new endpoint is introduced;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - each widget that gains `style` fields must update schema/default/normalizer
    ownership and preserve unknown-key rejection.
- Anti-abuse:
  - no public write surface is added;
  - operational state colors, errors, availability states, and commerce/listing
    semantic states must not be converted into unvalidated user-controlled class
    fragments.
- Compatibility:
  - public booking/listing/search behavior and existing state/readability colors
    must remain intact when a decorative surface is cleared.

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
- Add schema/normalizer tests for widgets that gain new `style` fields:
  accepted configured values, accepted cleared omission, and rejected unknown
  style keys.
- Add assertions that cleared fields do not serialize `"transparent"` or empty
  string sentinels.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- New exact `_docs/_WIDGETS/*.md` files only if implementation adds per-widget
  docs for these widgets; otherwise document the shared operational clear
  semantics in `_docs/WIDGETS.md`.
- `_docs/_TASKS/README.md` status only when this leaf moves state

## Acceptance Criteria

1. Operational widget frames can be cleared without breaking controls.
2. Commerce cards/tables can remove visual surfaces while preserving layout.
3. Semantic state colors remain untouched.
4. Runtime/editor tests cover cleared/default behavior.
5. Clear removes the saved style keys and rendered backgrounds; it does not
   write `"transparent"` solely to suppress output.
