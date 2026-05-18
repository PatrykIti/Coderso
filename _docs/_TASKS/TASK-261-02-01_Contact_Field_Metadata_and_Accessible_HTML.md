# TASK-261-02-01: Contact Field Metadata and Accessible HTML

# FileName: TASK-261-02-01_Contact_Field_Metadata_and_Accessible_HTML.md

**Priority:** High
**Category:** Widgets + Runtime Render + Accessibility + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-261-02
**Status:** Done (2026-05-18)

---

## Overview

Make Contact form controls real, accessible HTML controls without changing
submission behavior yet.

`REPORT_CONTACT_WIDGET.md` rows C3, W2, W3, W12, R2, R3, R4, and the static
Contact-side prerequisites of R10 show that the current renderer uses hardcoded
labels/placeholders, lacks `name`, `id`, and `autocomplete`, and gives the
form/button no accessible submit-state metadata. This leaf adds the
Contact-owned field model and renderer/editor controls that later leaves can
reuse.

## Scope Boundary

This leaf owns:

- `form.fieldSettings` keyed by `ContactFieldId`.
- Custom `label`, `placeholder`, `autocomplete`, and `span` per field.
- Optional `form.fieldLayout` for one-column vs two-column field grids.
- Explicit `<label htmlFor>` and stable field IDs.
- `aria-labelledby` or `aria-label` for the form shell.
- `data-form-submit` and `aria-busy="false"` on the button as static metadata
  for later runtime binding.

This leaf does not own:

- Real form submission, runtime nonce, CAPTCHA, or route behavior.
- A new custom field system beyond the existing four Contact fields.
- Arbitrary HTML labels/placeholders or unsafe field names.

## Sub-Tasks

- [x] Extend Contact schema/defaults/normalizer with bounded field metadata.
- [x] Render `id`, `name`, `autocomplete`, explicit labels, placeholders, and
  field grid spans from normalized metadata.
- [x] Keep names restricted to existing `ContactFieldId` values unless a later
  Forms bridge maps to Forms-owned field names.
- [x] Add Contact editor controls for label/placeholder/autocomplete/span.
- [x] Add renderer/editor tests for metadata, legacy defaults, and unknown key
  rejection.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Extend schema/defaults/normalizer and render accessible field metadata. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add Contact-local field metadata controls in Wizard/Visual where appropriate. |
| `tests/vitest/widgets/contact.test.tsx` | Cover names, IDs, autocomplete, labels/placeholders, layout spans, and backward-compatible defaults. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover editor metadata controls and field layout updates. |
| `tests/unit/widgets/validator.test.ts` | Update schema coverage for accepted/rejected field metadata. |
| `_docs/_WIDGETS/CONTACT.md` | Document field metadata and accessibility contract. |

## Implementation Pseudocode

```ts
type ContactFieldSettings = {
  label?: string;
  placeholder?: string;
  autocomplete?: "name" | "email" | "tel" | "off";
  span?: "full" | "half";
};

type ContactFormData = {
  fields?: ContactFieldId[];
  required?: ContactFieldId[];
  submitLabel?: string;
  fieldSettings?: Partial<Record<ContactFieldId, ContactFieldSettings>>;
  fieldLayout?: "one" | "two";
};

function normalizeContactFieldSettings(
  field: ContactFieldId,
  value: unknown
): Required<ContactFieldSettings> {
  return {
    label: normalizeNonEmptyString(readString(value, "label"), contactFieldLabelMap[field]),
    placeholder: normalizeString(readString(value, "placeholder"), contactFieldPlaceholderMap[field]),
    autocomplete: normalizeAutocomplete(field, readString(value, "autocomplete")),
    span: normalizeSpan(readString(value, "span")),
  };
}
```

Renderer shape:

```tsx
const fieldId = `${blockId ?? "contact"}-${field}`;
const settings = fieldSettings[field];

<form aria-labelledby={formTitleId} data-contact-form-mode="static">
  <div className={fieldLayout === "two" ? "grid md:grid-cols-2" : "grid grid-cols-1"}>
    <div className={settings.span === "full" ? "md:col-span-2" : undefined}>
      <label htmlFor={fieldId}>{settings.label}</label>
      <input
        id={fieldId}
        name={field}
        autoComplete={settings.autocomplete}
        placeholder={settings.placeholder}
        required={requiredFields.has(field)}
        data-contact-field={field}
      />
    </div>
  </div>
  <button type="button" data-form-submit="1" aria-busy="false">{submitLabel}</button>
</form>
```

Error handling:

- Unknown field settings are rejected by schema validation.
- Empty custom labels fall back to current visible defaults.
- Unsupported autocomplete/span values fall back to safe per-field defaults.
- Existing blocks without metadata render the same visible labels/placeholders
  plus the new accessibility attributes.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: Contact schema must reject unknown
  `fieldSettings` keys and unsupported metadata values.
- Anti-abuse: labels/placeholders are plain text; no arbitrary HTML, scripts,
  endpoint URLs, CAPTCHA config, or provider keys.
- Secret handling: field metadata must not store form submissions, tokens,
  nonce values, or privileged routing settings.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` when public
  renderer integration changes
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with Contact field metadata and accessible
  HTML output.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C3, W2, W3, W12, R2,
  R3, R4, and the Contact-side static-marker portion of R10 after validation.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Every visible Contact form field has a stable `id`, `name`, explicit label,
  placeholder, and autocomplete value.
- Field metadata is schema-owned and does not allow arbitrary custom payloads.
- Legacy Contact blocks keep their visible defaults.
- Tests prove both renderer output and editor update behavior.
