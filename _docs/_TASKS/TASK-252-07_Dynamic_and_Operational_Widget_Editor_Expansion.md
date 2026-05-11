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
- Use the completed `_docs/_WIDGETS/tmp/<widget>/` research archive for every
  widget in this family. Each implementation leaf must cite the widget-local
  Keep/Adapt/Reject matrix before finalizing its option list.
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
  - presentational or external form widgets, including current `newsletter`
    action-url mode and current `contact` form rendering, are not Coderso-owned
    public-write endpoints and must not be documented as nonce/HMAC protected;
  - any leaf that introduces or changes a Coderso-owned public-write endpoint
    must use the endpoint-specific nonce bridge
    (`core/services/booking/bookingSubmissionNonce.ts` for
    `/api/booking/reservations`, `core/services/forms/submissionNonce.ts` for
    form submission routes), optional reCAPTCHA policy, strict reject-unknown
    validation, existing public rate-limit buckets, and endpoint/security tests;
  - widget editor changes must not add a weaker public submission route.
- Make dynamic widget flexibility product-focused:
  - `content-list`: cards/list/compact display variants, field visibility,
    empty/error states; column/grid behavior stays a layout control, not a
    separate mode.
  - `posts-feed`: latest/featured/category/manual source clarity, card/list/
    compact density, and current author/date toggles; category display stays
    Adapt-only unless a `showCategory` owner is added.
  - `entry-teaser`: source selection, fallback behavior, CTA/card mode.
  - Commerce widgets: shared commerce source controls for gallery/table,
    selected products for compare, display modes, empty states, and safe
    column/attribute labels.
  - `listing-filters`: facet groups, query binding, range labels, and
    reset/apply behavior.
  - `search-box`: accessible copy, compact/full modes, target route, and query
    parameter binding; suggestions/autocomplete stay Adapt-only.
  - Forms/booking/contact: field visibility, success/error copy,
    field/source clarity, submit label, and layout mode.
  - `newsletter`: email placeholder/display copy, consent/privacy copy,
    submit label, success/error/loading copy, and layout mode; additional
    fields remain Adapt-only until backed by the newsletter matrix and schema.
  - `navigation`/`footer`: source/manual links, CTA/social/logo grouping,
    accessible mobile navigation, and footer columns.

## Sub-Tasks

This parent is now executed through physical per-widget leaves. Do not implement this parent as one broad batch; complete the leaves below in dependency order.

- [ ] TASK-252-07-01: Content List Source Display Field Visibility and Empty States
- [ ] TASK-252-07-02: Posts Feed Source Density Author Date and Category
- [ ] TASK-252-07-03: Entry Teaser Selected Entry Fallback and Field Toggles
- [ ] TASK-252-07-04: Product Gallery Source Media Modes Thumbnails and Empty State
- [ ] TASK-252-07-05: Product Compare Selected Products Attributes and Highlight
- [ ] TASK-252-07-06: Product Table Columns Sort Filter and Pagination
- [ ] TASK-252-07-07: Listing Filters Facets Ranges Apply and Reset
- [ ] TASK-252-07-08: Search Box Copy Target Route Query Param and Display Mode
- [ ] TASK-252-07-09: Newsletter Fields Consent Copy and States
- [ ] TASK-252-07-10: Booking Calendar Provider Event Modes and Availability
- [ ] TASK-252-07-11: Appointment Form Fields Validation Copy and States
- [ ] TASK-252-07-12: Form Embed Form Picker Fields and State Copy
- [ ] TASK-252-07-13: Contact Form Info State Copy and Security Boundaries
- [ ] TASK-252-07-14: Navigation Source Links Mobile Menu and CTA
- [ ] TASK-252-07-15: Footer Columns Brand Legal and Social Links

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
- Existing `_docs/_WIDGETS/tmp/<widget>/README.md` and `MATRIX.md` as evidence
  references; update them only if implementation finds a concrete research
  mismatch.
- Runtime service/tests only when the widget runtime contract changes:
  - content/posts owners under `tests/unit/widgets/*`
  - commerce runtime owner under `tests/unit/commerce/commerceWidgetRuntime.test.ts`
  - booking/forms/security suites named by the touched endpoint owner.
- Docs under `_docs/_WIDGETS/*.md`.

## Implementation Pseudocode

Keep editor grouping separate from runtime source resolution.

```tsx
<WidgetEditorSection id="source" title="Source">
  <WidgetControlRow id="content-list.source.mode" label="Source mode">
    <Select value={value.source?.mode ?? "legacy"} onValueChange={(mode) => updateSource({ mode })} />
  </WidgetControlRow>
</WidgetEditorSection>

<WidgetEditorSection id="display" title="Display">
  <WidgetControlRow id="content-list.style.cardStyle" label="Card style">
    <SegmentedControl value={value.style?.cardStyle ?? "outlined"} onChange={(cardStyle) => updateStyle({ cardStyle })} />
  </WidgetControlRow>
</WidgetEditorSection>

<WidgetEditorSection id="runtime" title="Runtime" advanced>
  <WidgetControlRow id="content-list.emptyState.title" label="Empty title">
    <Input value={value.emptyState?.title ?? ""} onChange={(title) => updateEmptyState({ title })} />
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
  - presentational/external widgets do not create a Coderso-owned public-write
    endpoint by themselves;
  - any Coderso-owned public submission route added or changed by a leaf must
    use the existing public form/booking endpoint auth contract.
  - internal form submissions require an authenticated admin session or API key
    scope `forms.submit`;
  - internal booking slot/reservation flows require an authenticated admin
    session or API key scope `booking.submit`.
- RBAC:
  - unchanged page/template write permissions;
  - source selection must not expose data beyond existing runtime resolver
    permissions.
- CSRF:
  - admin writes keep existing CSRF handling;
  - public writes do not use admin CSRF; Coderso-owned public-write endpoints
    must require the endpoint-specific nonce bridge
    (`core/services/booking/bookingSubmissionNonce.ts` for
    `/api/booking/reservations`, `core/services/forms/submissionNonce.ts` for
    form submission routes).
- Rate-limit bucket:
  - unchanged admin write buckets;
  - unchanged public form/booking/search/listing buckets unless the specific
    endpoint owner task changes them.
- Reject-unknown validation:
  - all changed widget schemas must reject unknown fields;
  - dynamic source payloads must normalize through owner modules.
- Anti-abuse:
  - do not store provider secrets in widget data/browser cache/localStorage;
  - public-write endpoint changes must keep nonce + signature/HMAC, optional
    reCAPTCHA policy, strict reject-unknown validation, and
    `tests/security/codersoSecurityGate.test.ts` coverage;
  - search/listing widgets must clamp limits and reject unsafe query/facet data.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this task family `Done` or record the exact blocker.
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
- Add Bun route/security suites when endpoint behavior changes, including
  `tests/security/codersoSecurityGate.test.ts` plus the endpoint owner suite for
  any Coderso-owned public write.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/README.md`
- Existing docs for widgets in scope.
- New docs for `product-gallery`, `product-compare`, `product-table`,
  `listing-filters`, `search-box`, `booking-calendar`, and
  `appointment-form`.
- `_docs/_TASKS/TASK-252*.md`
- `_docs/_TASKS/README.md` on status, title, or board row changes.

## Acceptance Criteria

- Dynamic/operational editors are easier to scan without hiding critical runtime
  or security choices, and their option lists are backed by per-widget research
  decisions.
- Missing widget docs are created for commerce, listing/search, and booking
  widgets.
- No public-write security contract is weakened.
- Runtime/data-source changes have Bun or owner-suite proof when they leave the
  pure UI/widget lane.
