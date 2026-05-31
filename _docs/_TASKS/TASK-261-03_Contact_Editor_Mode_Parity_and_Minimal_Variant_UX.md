# TASK-261-03: Contact Editor Mode Parity and Minimal Variant UX

# FileName: TASK-261-03_Contact_Editor_Mode_Parity_and_Minimal_Variant_UX.md

**Priority:** High
**Category:** Widgets + Admin UI + Editor UX
**Estimated Effort:** Large
**Dependencies:** TASK-261, TASK-261-01, TASK-261-02
**Status:** Done (2026-05-18)

---

## Overview

Repair Contact editor UX that is specific to this widget.

The Playwright report confirms that Wizard misses `hours`, uses a plain variant
select while Visual has cards, shows submit label outside a clear form section,
and Visual still exposes form-field controls for the `minimal` variant. Advanced
also provides little feedback after normalization. This leaf makes the Contact
editor modes coherent without changing shared editor mode infrastructure.

## Scope Boundary

This leaf owns Contact editor behavior only:

- Wizard parity for contact details, including business hours.
- Wizard variant cards or a Contact-local card selector that uses existing
  editor primitives.
- Form controls hidden or replaced by clear static copy when variant is
  `minimal`.
- Separate visible-fields, required-fields, and ordering groups.
- W8 classification: keep the existing Move up/Move down ordering path unless
  product explicitly requests drag-and-drop; record drag-and-drop as future
  product UX rather than required scope for TASK-261.
- Inline hints for address, map URL, spacing, and submission/static behavior.
- Normalization feedback in Advanced.
- Optional Contact-local collapsible sections only if an existing shared
  section primitive already supports it or the implementation stays local and
  simple.

This leaf does not own generic shared editor mode atomic updates, global
accordion/collapse primitives, or generic `Clear`/color-token behavior from
TASK-256-02.

## Sub-Tasks

- [x] Add `hours` to Contact Wizard and keep it normalized through existing
  contact details ownership.
- [x] Replace or augment the Wizard variant select with Contact variant cards
  that match Visual behavior and keep `onVariantChange` untouched.
- [x] Move Wizard submit label into a clear Contact form section with the field
  toggles it affects.
- [x] Hide the Visual "Form fields and required rules" section for `minimal`,
  replacing it with user-facing copy that explains the variant has no form.
- [x] Split RequiredFieldList into separate "Required fields" and "Field order"
  affordances or make the combined purpose explicit with copy and layout.
- [x] Record W8 as current button-ordering behavior with future drag-and-drop
  deferral; do not implement drag-and-drop in this leaf unless a separate
  physical task owns it.
- [x] Add helper text for address multiline behavior, map URL requirements,
  spacing density, static/submit-capable states, and field metadata introduced
  by TASK-261-02.
- [x] Add inline feedback after "Apply normalization now" showing whether
  normalization changed the payload.
- [x] Keep Advanced technical; add only Contact-specific diagnostics/reset
  actions that map to actual schema fields.
- [x] Redact transient `resolved` nonce/token-like runtime values from the
  Advanced diagnostics snapshot once `TASK-261-02-03` hydrates Contact runtime
  data.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Update Wizard/Visual/Advanced sections, Contact-local editor helpers, and diagnostics redaction. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover Wizard hours, variant cards, minimal hidden form controls, split required/order UX, hints, normalization feedback, and diagnostics redaction. |
| `tests/vitest/widgets/contact.test.tsx` | Add render smoke only if editor changes require new normalized defaults. |
| `_docs/_WIDGETS/CONTACT.md` | Document final editor mode responsibilities. |

## Implementation Pseudocode

```tsx
function ContactWizardEditor(props: WidgetEditorProps<ContactData>) {
  const variant = resolveContactVariant(props.variant);
  const showFormControls = variant !== "minimal";

  return (
    <div className="space-y-4">
      <EditorSection title="Contact layout">
        <VariantCards value={variant} onChange={props.onVariantChange} />
      </EditorSection>

      {showFormControls ? (
        <EditorSection title="Contact form">
          <FieldToggleList value={props.value} onChange={props.onChange} />
          <SubmitLabelControl />
        </EditorSection>
      ) : (
        <EditorSection title="Contact form">
          <p className="text-xs text-muted-foreground">
            Minimal layout shows contact details only.
          </p>
        </EditorSection>
      )}

      <EditorSection title="Contact details">
        <PhoneControl />
        <EmailControl />
        <AddressControl hint="Use separate lines for street and city." />
        <HoursControl />
      </EditorSection>
    </div>
  );
}
```

Advanced normalization feedback:

```tsx
function handleNormalize() {
  const before = JSON.stringify(normalizeContactData(value));
  const next = normalizeContactData(value);
  onChange(next);
  const after = JSON.stringify(next);
  setNormalizationMessage(before === after ? "Already normalized." : "Payload normalized.");
}
```

Error handling:

- Minimal variant must not mutate field settings just because form controls are
  hidden.
- Variant card clicks must still call only `onVariantChange`; do not rewrite the
  block data in a Contact-local way.
- Normalization feedback must not expose raw secrets or public submission
  nonce values.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged admin UI.
- Reject-unknown validation: editor controls must write only schema-owned
  Contact fields.
- Anti-abuse: no arbitrary scripts, endpoint URLs, CAPTCHA secrets, provider
  secrets, or nonce values in editor diagnostics.
- Secret handling: diagnostics must be redacted if future resolved runtime data
  includes nonces or token-like values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx` if normalized
  defaults or render-facing fields change
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with final Wizard, Visual, and Advanced
  responsibilities.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C5, W8, W11, U1, U3,
  U4, U5, U6, U7, U8, U9, and U10 after validation/classification.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Wizard exposes `hours` and has the same variant comprehension as Visual.
- Minimal variant no longer shows form-field editing controls as if they affect
  runtime output.
- Required state and field order are clear as separate user tasks.
- W8 is either explicitly classified as future drag-and-drop product scope or
  covered by a separate physical task; TASK-261-03 itself preserves the current
  working button-ordering behavior.
- Advanced normalization gives visible feedback and stays technical without
  duplicating everyday Visual editing.
- Advanced diagnostics never expose runtime nonce or token-like values after
  Contact runtime hydration exists.
