# TASK-273-06: Layout Variants, Collapsible Facets, and Width Controls

# FileName: TASK-273-06_Layout_Variants_Collapsible_Facets_and_Width_Controls.md

**Priority:** High
**Category:** Widgets + Listing Filters + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-256-01, TASK-256-04, TASK-273-03, TASK-273-05
**Status:** Done (2026-05-19)

---

## Overview

Expand Listing Filters from one framed default layout into product-ready
filter surfaces: horizontal filters above a listing, sidebar/sticky panel,
drawer-style mobile filters, collapsible facet groups, and configurable width.

This leaf must remain Listing Filters-specific. Do not use it to change the
global widget variant selector, generic page-builder responsive controls, or
shared mode-switch behavior.
If drawer/collapsible interaction requires shared refresh/rebinding/runtime
state changes, split that portion to TASK-315 and consume only the shared
result here.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:63` - current widget has
  only the `default` variant.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:91` - missing horizontal,
  sidebar, and drawer layouts.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:100` - missing collapsible
  facet groups for long mobile filter panels.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:102` - width is hard-coded
  to `max-w-6xl`.
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md:336` - layout variants are
  a priority repair.
- `core/widgets/core/listingFilters.tsx:15` - type supports only `"default"`.
- `core/widgets/core/listingFilters.tsx:512-549` - renderer hard-codes
  `max-w-6xl` and a two-column facet grid.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/listingFilters.tsx` | Add variant/layout/width/collapsible schema, defaults, normalizer, class maps, and renderer output. |
| `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx` | Add visual layout selection, width controls, collapsible settings, and drawer/mobile guidance. |
| `core/widgets/core/listingRuntimeScript.ts` | Bind drawer/collapsible controls only through Listing Filters-specific markers if the renderer needs local runtime interactivity. Do not rewrite shared refresh, fetch lifecycle, rebinding, or block-replacement behavior here; route that to TASK-315. |
| `tests/vitest/widgets/listingFilters.test.tsx` | Cover variant rendering, width normalization, collapsible markup, and backward-compatible defaults. |
| `tests/vitest/ui/listing-filters-editor-wave.test.tsx` | Cover layout/width/collapsible editor controls. |
| `tests/unit/widgets/registry.test.ts` | Cover variant registry changes if new variants are registered. |
| `tests/unit/widgets/validator.test.ts` | Cover new schema fields. |
| `_docs/_WIDGETS/LISTING_FILTERS.md` | Document variants/layout controls. |
| `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md` | Mark B-01, B-10, and B-12 fixed or record deferral evidence. |

## Implementation Pseudocode

```tsx
export type ListingFiltersVariantId = "default" | "horizontal" | "sidebar" | "drawer";

type ListingFiltersLayout = {
  maxWidth?: "narrow" | "content" | "wide" | "full";
  stickySidebar?: boolean;
  collapsibleFacets?: boolean;
  defaultCollapsed?: boolean;
};

const layoutClassMap: Record<NonNullable<ListingFiltersLayout["maxWidth"]>, string> = {
  narrow: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-none",
};

function ListingFiltersLayoutShell({ variant, layout, children }: Props) {
  if (variant === "horizontal") return <HorizontalFilterBar layout={layout}>{children}</HorizontalFilterBar>;
  if (variant === "sidebar") return <SidebarFilterPanel layout={layout}>{children}</SidebarFilterPanel>;
  if (variant === "drawer") return <DrawerFilterPanel layout={layout}>{children}</DrawerFilterPanel>;
  return <DefaultFilterPanel layout={layout}>{children}</DefaultFilterPanel>;
}
```

Data flow:

- Variant IDs are registered in `createListingFiltersWidget` only after the
  renderer and editor understand them.
- Width/collapsible settings are normalized through a single Listing
  Filters-owned layout helper.
- Drawer/collapsible state is runtime UI state, not persisted per visitor.
- Existing payloads without layout settings render exactly like the current
  default layout.
- If interactive drawer/collapsible state needs shared runtime binding or ARIA
  helpers beyond local markers, this leaf consumes TASK-256-04/TASK-315 instead
  of defining widget-local shared mechanics.

Error handling:

- Unknown variants normalize to `default`.
- Unsupported width tokens normalize to current `wide` behavior.
- Drawer/collapsible JS must fail open so filters remain usable without
  JavaScript.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth model: unchanged admin editing and public runtime rendering.
- RBAC: unchanged page/template/widget write permissions.
- CSRF: unchanged because no write route is introduced.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: new variant/layout fields must be enum/clamped and
  `additionalProperties: false`.
- Anti-abuse: no raw class names or arbitrary CSS strings for layout choices;
  use fixed class maps.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/listingFilters.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts` when variant registration changes.
- `bun run test:vitest -- tests/vitest/widgets/listingRuntimeScript.test.ts`
  after creating that new suite when drawer/collapsible JS is introduced;
  include Search Box listing-mode no-regression coverage if shared script
  behavior changes.
- `bun run gates:coderso`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/LISTING_FILTERS.md`
- `_docs/PLAYWRIGHT/REPORT_LISTING_FILTERS_WIDGET.md`
- `_docs/_TASKS/TASK-273-06_Layout_Variants_Collapsible_Facets_and_Width_Controls.md`
- `_docs/_TASKS/README.md` on status changes

## Acceptance Criteria

- Authors can choose a Listing Filters layout that fits above-list, sidebar, and
  mobile drawer use cases.
- Long facet lists can collapse without hiding filters permanently.
- Width is configured through bounded product options, not raw class strings.
- Layout variants preserve current URL sync, clear-all, loading, and pagination
  behavior.
- Any interactive drawer/collapsible wiring stays within the shared
  TASK-256-04/TASK-315 runtime boundaries instead of redefining them locally.
