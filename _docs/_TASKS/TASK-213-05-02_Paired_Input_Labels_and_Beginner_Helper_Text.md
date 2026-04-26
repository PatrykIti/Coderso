# TASK-213-05-02: Paired Input Labels and Beginner Helper Text
# FileName: TASK-213-05-02_Paired_Input_Labels_and_Beginner_Helper_Text.md

**Priority:** Medium
**Category:** Widget Editors + Accessibility + UX Copy
**Estimated Effort:** Medium
**Dependencies:** TASK-213-05
**Status:** To Do

---

## Overview

Fix the global paired-input and technical-copy pattern from the widget audit.

Inputs such as link name + href, CTA label + URL, social label + URL, pricing
plan name + price, and FAQ question/answer pairs need per-field labels or
accessible names. Technical fields such as `Flow key` and `Links source` need
beginner-facing helper copy.

Business outcome: editors can understand and safely fill every quick-setup
field without guessing which unlabeled textbox controls the public copy,
destination URL, price display, or technical source binding.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/admin/ui/widgets/editors/PricingPlansEditors.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- matching `tests/vitest/widgets/*.test.tsx` files.
- Existing UI editor wave suites for every touched editor, including:
  - `tests/vitest/ui/navigation-editor-wave.test.tsx`
  - `tests/vitest/ui/footer-editor-wave.test.tsx`
  - `tests/vitest/ui/hero-editor-wave.test.tsx`
  - `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - `tests/vitest/ui/split-layout-editor-wave.test.tsx`
  - `tests/vitest/ui/stack-editor-wave.test.tsx`
  - `tests/vitest/ui/toggle-block-editor-wave.test.tsx`

## Implementation Direction

Use visible labels where there is room; use `aria-label` only for compact row
controls where repeated visible labels would create clutter.

Pseudocode:

```tsx
<Input
  aria-label={`Navigation link ${index + 1} label`}
  value={item.label}
/>
<Input
  aria-label={`Navigation link ${index + 1} URL`}
  value={item.href}
/>
```

For technical fields:

```tsx
<TextField
  label="Flow key"
  description="Connects this widget to a saved booking flow. Keep the default unless you are wiring a custom flow."
/>
```

For `Links source`, describe what changes when switching modes and keep menu
auto-source behavior covered if it already exists.

For Pricing Plans, keep the existing display-price contract backward-compatible
unless the implementation deliberately adds schema-owned `amount`/`currency`
fields. At minimum, label quick fields as `Plan 1 name` and `Plan 1 display
price`, with helper copy that explains values such as `$49` are public display
text.

For FAQ Accordion, either expose answer fields next to the quick questions or
state clearly that Wizard edits only the initial question labels while Visual
owns answers. Do not leave preset answers silently rendered without editor
visibility.

## Security Contract

- Visibility: internal admin widget editors plus public rendering of normalized
  values.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: no new editor-only fields are persisted.
- Anti-abuse:
  - URL helper text must preserve existing safe URL expectations;
  - do not encourage secrets, tokens, provider keys, or internal URLs in public
    widget fields.

## Testing Requirements

- Widget suites assert:
  - paired inputs have distinct labels or `aria-label`s;
  - helper copy appears for `Flow key`, `Links source`, and default active pane
    controls where added;
  - existing href validation tests remain green.
- Required targeted suites:
  - `tests/vitest/widgets/navigation.test.tsx`
  - `tests/vitest/widgets/footer.test.tsx`
  - `tests/vitest/widgets/heroEditors.test.tsx`
  - `tests/vitest/widgets/ctaBanner.test.tsx`
  - `tests/vitest/widgets/pricingPlans.test.tsx`
  - `tests/vitest/ui/pricing-plans-editor-wave.test.tsx`
  - `tests/vitest/widgets/faqAccordion.test.tsx`
  - `tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
  - `tests/vitest/widgets/bookingCalendar.test.tsx`
  - `tests/vitest/ui/booking-calendar-editor-wave.test.tsx`
  - `tests/vitest/widgets/appointmentForm.test.tsx`
  - `tests/vitest/ui/appointment-form-editor-wave.test.tsx`
  - layout widget suites plus `tests/vitest/ui/split-layout-editor-wave.test.tsx`,
    `tests/vitest/ui/stack-editor-wave.test.tsx`, and
    `tests/vitest/ui/toggle-block-editor-wave.test.tsx` if touched.
- Manual Playwright:
  - inspect labels for Navigation/Footer pairs;
  - inspect Pricing Plans and FAQ quick rows for distinct field names;
  - verify Booking Calendar and Appointment Form explain `Flow key`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` docs if field copy changes.

## Acceptance Criteria

1. Every paired field in the touched widgets has a distinct accessible name.
2. Technical quick-setup fields include beginner-facing helper copy.
3. Pricing display values and FAQ answers are either directly editable in
   Wizard or explicitly routed to Visual without hidden public preset content.
4. Existing validation/sanitization behavior remains unchanged.
