# TASK-213-01: Widget Editor Stability and Data Loading
# FileName: TASK-213-01_Widget_Editor_Stability_and_Data_Loading.md

**Priority:** High
**Category:** Widget Editors + Admin/UI + Reliability
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-194, TASK-208
**Status:** To Do

---

## Overview

Repair the stability blockers from the Widget Library Playwright report:

- `BUG-9`: opening Form Embed crashes the editor because a Radix
  `<Select.Item>` receives an empty string value.
- `BUG-10`: Listing Filters and Search Box can look permanently stuck on
  `Loading listing queries...` when the listing-query request completes with an
  empty result.

The business outcome is simple: adding or configuring a widget must never blank
the admin app, and empty dependencies must guide the editor to the next action
instead of looking like a broken loading state.

## Sub-Tasks

- `TASK-213-01-01_Form_Embed_Select_Sentinel_and_Crash_Regression.md`
- `TASK-213-01-02_Listing_Query_Empty_State_for_Filter_Widgets.md`

## Files to Change

- `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
- `core/widgets/core/formEmbed.tsx`
- `tests/vitest/widgets/formEmbed.test.tsx`
- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
- `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
- `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
- `core/widgets/core/listingFilters.tsx`
- `core/widgets/core/searchBox.tsx`
- `tests/vitest/widgets/listingFilters.test.tsx`
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
- `tests/vitest/widgets/searchBox.test.tsx`
- `tests/vitest/ui/search-box-editor-wave.test.tsx`

## Implementation Direction

Handle empty choices with explicit sentinels, not empty strings, and make
loading state derive from the real request lifecycle.

Pseudocode:

```ts
const NO_FORM_VALUE = "__no_form__";

<Select
  value={normalized.formId || NO_FORM_VALUE}
  onValueChange={(next) =>
    patch({ formId: next === NO_FORM_VALUE ? "" : next })
  }
>
  <SelectItem value={NO_FORM_VALUE} disabled={forms.length === 0}>
    {isLoading ? "Loading forms..." : "No forms found"}
  </SelectItem>
</Select>
```

For listing query selectors:

```ts
const status = loading
  ? "loading"
  : error
    ? "error"
    : items.length === 0
      ? "empty"
      : "ready";

const helper =
  status === "empty"
    ? "No listings yet. Create a listing before binding this widget."
    : null;
```

The selector label should stay stable (`Listing query`) after loading finishes.
The transient loading message may appear as helper text only while the request is
actually in flight.

## Security Contract

- Visibility: internal admin widget editor only.
- Auth model: unchanged admin session/API-key reads for forms and listings.
- RBAC: existing form/listing read permissions remain authoritative.
- CSRF: no write route changes in this subtask.
- Rate-limit bucket: existing admin read bucket.
- Reject-unknown validation: empty sentinels must normalize back to the existing
  empty string/undefined domain shape before persistence.
- Anti-abuse: do not expose private form submission settings, nonces, API keys,
  or raw listing query payloads in helper text or error messages.

## Testing Requirements

- `tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - opening Form Embed with zero forms does not throw;
  - no `SelectItem value=""` path remains;
  - internal form warning still renders for internal submission access.
- `tests/vitest/widgets/formEmbed.test.tsx`
  - normalizer keeps `formId` empty/sentinel-free in stored data.
- `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - loading helper disappears when the request resolves empty;
  - empty helper links/copy are visible and bounded;
  - API errors remain distinct from empty results.
- `tests/vitest/ui/search-box-editor-wave.test.tsx`
  - same loading/empty/error contract for listing mode.
- Manual Playwright:
  - add Form Embed three times without blank page;
  - open Listing Filters/Search Box on an empty listings dataset and verify no
    persistent loading label remains.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md` if selector empty-state behavior becomes part of the
  widget editor contract
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Form Embed cannot crash the editor because of an empty Radix Select item.
2. Listing Filters and Search Box distinguish loading, empty, ready, and error
   states.
3. Stored widget data remains sentinel-free and schema-valid.
4. Regression coverage proves the user-visible no-crash/no-stuck-loading path.
