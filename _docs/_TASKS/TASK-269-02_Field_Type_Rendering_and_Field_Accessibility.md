# TASK-269-02: Field Type Rendering and Field Accessibility

# FileName: TASK-269-02_Field_Type_Rendering_and_Field_Accessibility.md

**Priority:** High
**Category:** Widgets + Runtime Render + Forms + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-269-01
**Status:** To Do

---

## Overview

Bring Form Embed field rendering in line with the current Forms field model.

`REPORT_FORM_EMBED_WIDGET.md` lists missing `radio`, `number`, `time`,
`hidden`, `file`, `range`, and `rating` behavior, but the current Forms
validation contract in `core/services/forms/validation.ts` accepts only `text`,
`email`, `select`, `checkbox`, `textarea`, `phone`, and `date`. Therefore this
leaf fixes Form Embed-owned rendering and field-level accessibility for the
currently supported field types, and it records report rows C2/W1 as future
Forms field-model scope when they require adding new field types before Form
Embed can render them.

## Scope Boundary

This leaf owns Form Embed field markup and runtime value collection for current
Forms fields:

- `text`, `email`, `phone`, `date`, `textarea`, `checkbox`, and `select`
  rendering parity;
- truthful unsupported-field diagnostics if legacy/resolved runtime payloads
  contain field types that the current Forms model rejects;
- stable field IDs derived from the widget instance and field ID/name;
- `label htmlFor`, `aria-label` fallback when labels are hidden,
  `aria-required`, and helper text `aria-describedby`;
- checkbox inline label placement parity with other field types;
- select option labels and helper text as plain text only.

This leaf does not add new Forms field types, invent a file upload endpoint,
create a generic field renderer for all widgets, or add a shared ARIA helper
outside the Form Embed owner. If the report-only field types are still required,
open a separate Forms field-model task that owns validation, builder UI,
persistence, submission validation, and then the Form Embed renderer.

## Sub-Tasks

- [ ] Add a Form Embed field rendering helper that returns a structured render
  model for each currently supported Forms field type.
- [ ] Keep `select` options and `checkbox` controls accessible with stable
  names, IDs, labels, required state, and helper linkage.
- [ ] Render unsupported legacy/resolved field types as non-submitting
  diagnostics instead of silently converting them to text inputs.
- [ ] Record `radio`, `number`, `time`, `hidden`, `file`, `range`, and `rating`
  as future Forms field-model scope unless the current Forms validation owner is
  expanded in a separate task.
- [ ] Add stable IDs and `htmlFor` to text, textarea, checkbox, select, phone,
  email, and date controls.
- [ ] Add `aria-label` when `showLabels=false`, `aria-required` for required
  fields, and `aria-describedby` for helper text.
- [ ] Preserve conditional logic disabling and required restoration in
  `formRuntimeScript.ts` for current supported controls.
- [ ] Keep old supported form payloads rendering with current defaults.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Extend supported field rendering, stable IDs, labels, descriptions, current option controls, and truthful unsupported states. |
| `core/widgets/core/formRuntimeScript.ts` | Update value collection/hydration only for currently supported controls that need script support. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover current supported field types, stable IDs, labels, ARIA, helper linkage, and unsupported-field diagnostics. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover field summary/editor diagnostics if new field states are surfaced there. |
| `tests/unit/widgets/validator.test.ts` | Update if Form Embed schema changes. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document the supported field type matrix and future Forms field-model boundary for report-only types. |

## Implementation Pseudocode

```ts
type FormEmbedFieldRenderKind =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "textarea"
  | "checkbox"
  | "select"
  | "unsupported";

type FieldA11yIds = {
  inputId: string;
  labelId: string;
  helperId?: string;
  groupId?: string;
};

const currentFormFieldTypes = new Set([
  "text",
  "email",
  "phone",
  "date",
  "textarea",
  "checkbox",
  "select",
]);

function resolveFieldA11yIds(instanceId: string, field: ResolvedFormField): FieldA11yIds {
  const stableKey = slugify(`${field.id || field.name}`);
  return {
    inputId: `${instanceId}-${stableKey}`,
    labelId: `${instanceId}-${stableKey}-label`,
    helperId: field.settings?.helper ? `${instanceId}-${stableKey}-help` : undefined,
    groupId: `${instanceId}-${stableKey}-group`,
  };
}

function resolveFieldRenderKind(field: ResolvedFormField): FormEmbedFieldRenderKind {
  if (currentFormFieldTypes.has(field.type)) {
    return field.type as FormEmbedFieldRenderKind;
  }
  return "unsupported";
}
```

Renderer shape:

```tsx
function renderSupportedField(field: ResolvedFormField, ids: FieldA11yIds) {
  const helperId = ids.helperId;
  const labelHidden = shouldHideLabel(field);
  return (
    <div data-form-field={field.name}>
      {!labelHidden ? (
        <label id={ids.labelId} htmlFor={ids.inputId}>{field.label}</label>
      ) : null}
      <FormEmbedControl
        id={ids.inputId}
        field={field}
        aria-label={labelHidden ? field.label : undefined}
        aria-describedby={helperId}
        aria-required={field.required ? "true" : undefined}
      />
      {helperId ? <p id={helperId}>{field.settings?.helper}</p> : null}
    </div>
  );
}

function renderUnsupportedField(field: ResolvedFormField) {
  return (
    <div data-form-field={field.name} data-form-field-unsupported={field.type}>
      Unsupported form field type: {field.type}
    </div>
  );
}
```

Error handling:

- Unknown field types render a clear unsupported-field diagnostic in admin
  preview and public output when legacy/resolved data contains types that the
  current Forms model cannot safely map.
- `file` fields must never submit browser fake paths as JSON. Keep them in the
  unsupported diagnostic path until a separate Forms upload contract is verified
  and tested.
- Missing `field.name` should fall back to a stable field ID for DOM IDs but
  must not submit unnamed data silently.
- Empty select option lists render an explanatory disabled state instead of an
  empty select.

## Security Contract

No API routes are added by this leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema changes must stay allowlisted and covered
  by widget validator tests.
- Anti-abuse: field labels, helper text, and option labels render as text only;
  no arbitrary HTML/script/style injection.
- Secret handling: unsupported hidden/file-like fields must not embed secrets,
  API keys, CAPTCHA secrets, nonce secrets, or privileged values in widget JSON
  or public DOM.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- focused runtime-script DOM/value tests when `formRuntimeScript.ts` changes
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with the current supported field type
  matrix, accessibility behavior, and future Forms field-model boundary.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows W17, A3-A7, and
  A10 after validation. Mark C2/W1 fixed only for current supported-field
  diagnostics; route new field type support to a future Forms field-model task.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Current Forms field types render truthfully instead of silently falling back
  to text inputs.
- Report-only field types that the current Forms model rejects are explicitly
  classified as future Forms field-model scope or rendered as non-submitting
  unsupported diagnostics for legacy/resolved payloads.
- Field labels, IDs, helper text, required state, and hidden-label fallback are
  programmatically connected.
- File and hidden-like unsupported fields never expose or submit secrets.
- Conditional logic and progress hydration still work for currently supported
  controls.
