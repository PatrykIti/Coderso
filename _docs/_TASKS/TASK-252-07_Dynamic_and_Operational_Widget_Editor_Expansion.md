# TASK-252-07: Dynamic and Operational Widget Editor Expansion

# FileName: TASK-252-07_Dynamic_and_Operational_Widget_Editor_Expansion.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** To Do

---

## Overview

Apply the TASK-252 editor IA to dynamic and operational Pages widgets while
preserving their runtime, data-source, cache, and security contracts.

These widgets are riskier than static marketing widgets because many of them
resolve entries, posts, commerce data, search/listing state, forms, booking
slots, navigation, or public submissions. The editor should become clearer and
more flexible, but implementation must not weaken runtime contracts.

## Widgets In Scope

- Dynamic content:
  - `content-list`
  - `posts-feed`
  - `entry-teaser`
- Commerce/listing/search:
  - `product-gallery`
  - `product-compare`
  - `product-table`
  - `listing-filters`
  - `search-box`
- Forms and booking:
  - `newsletter`
  - `booking-calendar`
  - `appointment-form`
  - `form-embed`
  - `contact`
- Site shell:
  - `navigation`
  - `footer`

## Business Requirements

- Use TASK-252-01 shared editor metadata and compact info affordances.
- Complete `_docs/_WIDGETS/tmp/<widget>/` research for every widget in this
  family before finalizing its option list. Each widget needs ten credible
  patterns or a widget-local `SHORTFALL.md`, plus a Keep/Adapt/Reject matrix.
- Keep runtime/data ownership explicit:
  - source selection belongs in Visual only when it is a normal editor decision;
  - endpoint, fallback, and diagnostics belong in Advanced.
- Do not move runtime-kernel behavior into Vitest-only layers.
- Add missing `_docs/_WIDGETS` contract docs for:
  - `product-gallery`
  - `product-compare`
  - `product-table`
  - `listing-filters`
  - `search-box`
  - `booking-calendar`
  - `appointment-form`
- Preserve public-write security for form/booking widgets:
  - existing nonce/captcha/rate-limit behavior remains owned by the current
    forms/booking runtime services;
  - widget editor changes must not add a weaker public submission route.
- Make dynamic widget flexibility product-focused:
  - `content-list`: card/list/grid modes, field visibility, empty/error states.
  - `posts-feed`: latest/featured/category/manual source clarity, card density.
  - `entry-teaser`: source selection, fallback behavior, CTA/card mode.
  - Commerce widgets: gallery/table/compare display modes, empty states,
    selected product/catalog source, action labels.
  - `listing-filters`: facet layout, query binding, reset/apply behavior.
  - `search-box`: placeholder/results behavior, compact/full modes.
  - Forms/booking/contact/newsletter: field visibility, success/error copy,
    integration/source clarity, submit label, layout mode.
  - `navigation`/`footer`: source/manual links, CTA/social/logo grouping,
    mobile/sticky/footer column behavior.

## Sub-Tasks

- [ ] Apply TASK-252-01 editor IA to dynamic content widgets.
- [ ] Complete per-widget research folders and Keep/Adapt/Reject matrices for
  every dynamic/operational widget in scope.
- [ ] Apply TASK-252-01 editor IA to commerce, listing, and search widgets.
- [ ] Apply TASK-252-01 editor IA to forms, booking, contact, and newsletter
  widgets without weakening public-write security.
- [ ] Apply TASK-252-01 editor IA to navigation and footer.
- [ ] Create missing `_docs/_WIDGETS` docs for commerce, listing/search, and
  booking widgets.
- [ ] Run focused UI/widget/runtime/security owner tests for every changed
  contract.

## Files to Change

- Editor owners:
  - `core/admin/ui/widgets/editors/ContentListEditors.tsx`
  - `core/admin/ui/widgets/editors/PostsFeedEditors.tsx`
  - `core/admin/ui/widgets/editors/EntryTeaserEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductCompareEditors.tsx`
  - `core/admin/ui/widgets/editors/ProductTableEditors.tsx`
  - `core/admin/ui/widgets/editors/ListingFiltersEditors.tsx`
  - `core/admin/ui/widgets/editors/SearchBoxEditors.tsx`
  - `core/admin/ui/widgets/editors/NewsletterEditors.tsx`
  - `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
  - `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
  - `core/admin/ui/widgets/editors/FormEmbedEditors.tsx`
  - `core/admin/ui/widgets/editors/ContactEditors.tsx`
  - `core/admin/ui/widgets/editors/NavigationEditors.tsx`
  - `core/admin/ui/widgets/editors/FooterEditors.tsx`
- Runtime/data owners under `core/widgets/core/*.tsx` when schemas/defaults/
  renderers change.
- `_docs/_WIDGETS/tmp/<widget>/*.md` research cards for every widget in scope.
- `_docs/_WIDGETS/tmp/<widget>/SHORTFALL.md` only when TASK-252-02 permits a
  smaller research sample.
- Runtime service/tests only when the widget runtime contract changes:
  - content/posts owners under `tests/unit/widgets/*`
  - commerce runtime owner under `tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - booking/forms/security suites named by the touched endpoint owner.
- Docs under `_docs/_WIDGETS/*.md`.

## Implementation Pseudocode

Keep editor grouping separate from runtime source resolution.

```tsx
<WidgetEditorSection id="source" title="Source">
  <WidgetControlRow id="content-list.source.type" label="Source type">
    <Select value={value.source?.type} onValueChange={...} />
  </WidgetControlRow>
</WidgetEditorSection>

<WidgetEditorSection id="display" title="Display">
  <WidgetControlRow id="content-list.display.mode" label="Display mode">
    <SegmentedControl value={value.display?.mode} onChange={...} />
  </WidgetControlRow>
</WidgetEditorSection>

<WidgetEditorSection id="runtime" title="Runtime" advanced>
  <WidgetControlRow id="content-list.runtime.emptyMessage" label="Empty message">
    <Input value={value.runtime?.emptyMessage} onChange={...} />
  </WidgetControlRow>
</WidgetEditorSection>
```

For public-write widgets, keep security settings backend-owned:

```ts
function normalizeContactWidgetData(raw: unknown): ContactData {
  return {
    fields: normalizeVisibleFields(raw.fields),
    copy: normalizeCopy(raw.copy),
    // Do not persist captcha secrets or privileged provider config here.
  };
}
```

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered widgets are public page/runtime output.
- Auth model:
  - editor saves use existing authenticated admin writes;
  - public submissions keep the current public endpoint contracts.
- RBAC:
  - unchanged page/template write permissions;
  - source selection must not expose data beyond existing runtime resolver
    permissions.
- CSRF:
  - admin writes keep existing CSRF handling;
  - public writes keep existing nonce/captcha/security contracts.
- Rate-limit bucket:
  - unchanged admin write buckets;
  - unchanged public form/booking/search/listing buckets unless the specific
    endpoint owner task changes them.
- Reject-unknown validation:
  - all changed widget schemas must reject unknown fields;
  - dynamic source payloads must normalize through owner modules.
- Anti-abuse:
  - do not store provider secrets in widget data/browser cache/localStorage;
  - public forms/booking widgets must keep nonce/captcha/rate-limit protection;
  - search/listing widgets must clamp limits and reject unsafe query/facet data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Dynamic content:
  - `tests/unit/widgets/contentList.test.tsx`
  - `tests/vitest/ui/content-list-editor-wave.test.tsx`
  - `tests/unit/widgets/postsFeedWidget.test.tsx`
  - `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
  - `tests/unit/widgets/entryTeaser.test.tsx`
  - `tests/vitest/ui/entry-teaser-editor-wave.test.tsx`
- Commerce/listing/search:
  - `tests/vitest/widgets/productGallery.test.tsx`
  - `tests/vitest/ui/product-gallery-editor-wave.test.tsx`
  - `tests/vitest/widgets/productCompare.test.tsx`
  - `tests/vitest/ui/product-compare-editor-wave.test.tsx`
  - `tests/vitest/widgets/productTable.test.tsx`
  - `tests/vitest/ui/product-table-editor-wave.test.tsx`
  - `tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - `tests/vitest/widgets/listingFilters.test.tsx`
  - `tests/vitest/ui/listing-filters-editor-wave.test.tsx`
  - `tests/vitest/widgets/searchBox.test.tsx`
  - `tests/vitest/ui/search-box-editor-wave.test.tsx`
- Forms/booking/shell:
  - `tests/vitest/widgets/newsletter.test.tsx`
  - `tests/vitest/ui/newsletter-editor-wave.test.tsx`
  - `tests/vitest/widgets/bookingCalendar.test.tsx`
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/widgets/appointmentForm.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `tests/vitest/widgets/formEmbed.test.tsx`
  - `tests/vitest/ui/form-embed-editor-wave.test.tsx`
  - `tests/vitest/widgets/contact.test.tsx`
  - `tests/vitest/ui/contact-editor-wave.test.tsx`
  - `tests/vitest/widgets/navigation.test.tsx`
  - `tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
  - `tests/vitest/ui/footer-editor-wave.test.tsx`
- Add Bun route/security suites when endpoint behavior changes.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- Existing docs for widgets in scope.
- New docs for `product-gallery`, `product-compare`, `product-table`,
  `listing-filters`, `search-box`, `booking-calendar`, and
  `appointment-form`.
- `_docs/_TASKS/TASK-252*.md`

## Acceptance Criteria

- Dynamic/operational editors are easier to scan without hiding critical runtime
  or security choices, and their option lists are backed by per-widget research
  decisions.
- Missing widget docs are created for commerce, listing/search, and booking
  widgets.
- No public-write security contract is weakened.
- Runtime/data-source changes have Bun or owner-suite proof when they leave the
  pure UI/widget lane.
