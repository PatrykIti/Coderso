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

Inputs such as link name + href, CTA label + URL, social label + URL, and FAQ
question/answer pairs need per-field labels or accessible names. Technical
fields such as `Flow key` and `Links source` need beginner-facing helper copy.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- `core/admin/ui/widgets/editors/HeroEditors.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `core/admin/ui/widgets/editors/FaqAccordionEditors.tsx`
- `core/admin/ui/widgets/editors/BookingCalendarEditors.tsx`
- `core/admin/ui/widgets/editors/AppointmentFormEditors.tsx`
- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- matching `tests/vitest/widgets/*.test.tsx` files.

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
  - `tests/vitest/widgets/bookingCalendar.test.tsx`
  - `tests/vitest/widgets/appointmentForm.test.tsx`
  - layout widget suites for Split/Stack/Toggle if touched.
- Manual Playwright:
  - inspect labels for Navigation/Footer pairs;
  - verify Booking Calendar and Appointment Form explain `Flow key`.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- affected `_docs/_WIDGETS/*` docs if field copy changes.

## Acceptance Criteria

1. Every paired field in the touched widgets has a distinct accessible name.
2. Technical quick-setup fields include beginner-facing helper copy.
3. Existing validation/sanitization behavior remains unchanged.
