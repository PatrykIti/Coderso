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

`REPORT_FORM_EMBED_WIDGET.md` shows that `radio`, `number`, `time`, `hidden`,
`file`, `range`, and `rating` fields are not represented truthfully, checkbox
inline label placement is inconsistent, and field controls lack stable IDs,
`htmlFor`, `aria-required`, and `aria-describedby`. This leaf fixes Form
Embed-owned field rendering and field-level accessibility without changing
unrelated widgets.

## Scope Boundary

This leaf owns Form Embed field markup and runtime value collection:

- `radio`, `number`, `time`, `hidden`, `range`, and rating rendering;
- truthful file field behavior, either through an existing supported upload
  contract or a disabled/explained unsupported state;
- stable field IDs derived from the widget instance and field ID/name;
- `label htmlFor`, `aria-label` fallback when labels are hidden,
  `aria-required`, and helper text `aria-describedby`;
- fieldset/legend output for option groups;
- checkbox inline label placement parity with other field types.

This leaf does not invent a new file upload endpoint, a generic field renderer
for all widgets, or a shared ARIA helper outside the Form Embed owner. If the
Forms submission API cannot accept a field type safely, render a truthful
non-submitting state and open a separate Forms task.

## Sub-Tasks

- [ ] Add a Form Embed field rendering helper that returns a structured render
  model for each supported field type.
- [ ] Render `radio` options as a fieldset with one radio per option, stable
  names, IDs, labels, required state, and helper linkage.
- [ ] Render `number`, `time`, `hidden`, `range`, and rating controls with
  schema-bounded attributes and no unsafe arbitrary HTML.
- [ ] Decide file field handling against the current Forms route. If upload is
  unsupported, render a disabled field plus editor/runtime diagnostic instead
  of submitting fake file paths.
- [ ] Add stable IDs and `htmlFor` to text, textarea, checkbox, select, and new
  controls.
- [ ] Add `aria-label` when `showLabels=false`, `aria-required` for required
  fields, and `aria-describedby` for helper text.
- [ ] Preserve conditional logic disabling and required restoration in
  `formRuntimeScript.ts` for new field types.
- [ ] Keep old form payloads rendering with current defaults.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/formEmbed.tsx` | Extend field rendering, stable IDs, labels, descriptions, option groups, and truthful unsupported states. |
| `core/widgets/core/formRuntimeScript.ts` | Update value collection/hydration only for new controls that need script support. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover every supported field type, stable IDs, labels, ARIA, helper linkage, and unsupported file behavior. |
| `tests/vitest/ui/form-embed-editor-wave.test.tsx` | Cover field summary/editor diagnostics if new field states are surfaced there. |
| `tests/unit/widgets/validator.test.ts` | Update if Form Embed schema changes. |
| `_docs/_WIDGETS/FORM_EMBED.md` | Document supported field types and unsupported file behavior if applicable. |

## Implementation Pseudocode

```ts
type FormEmbedFieldRenderKind =
  | "text"
  | "email"
  | "phone"
  | "date"
  | "number"
  | "time"
  | "textarea"
  | "checkbox"
  | "select"
  | "radio"
  | "range"
  | "rating"
  | "hidden"
  | "unsupported-file";

type FieldA11yIds = {
  inputId: string;
  labelId: string;
  helperId?: string;
  groupId?: string;
};

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
  switch (field.type) {
    case "radio":
    case "number":
    case "time":
    case "hidden":
    case "range":
    case "rating":
      return field.type;
    case "file":
      return formsRouteSupportsFileUpload() ? "file" : "unsupported-file";
    default:
      return knownInputKind(field.type);
  }
}
```

Renderer shape:

```tsx
function renderRadioGroup(field: ResolvedFormField, ids: FieldA11yIds) {
  return (
    <fieldset id={ids.groupId} aria-describedby={ids.helperId}>
      <legend id={ids.labelId}>{field.label}</legend>
      {field.settings?.options?.map((option, index) => {
        const optionId = `${ids.inputId}-${index}`;
        return (
          <label key={option} htmlFor={optionId}>
            <input id={optionId} type="radio" name={field.name} value={option} required={field.required} />
            {option}
          </label>
        );
      })}
      {helper ? <p id={ids.helperId}>{helper}</p> : null}
    </fieldset>
  );
}
```

Error handling:

- Unknown field types render a clear unsupported-field placeholder in admin
  preview and public output only when the Forms model cannot safely map them.
- `file` fields must never submit browser fake paths as JSON. Use a disabled
  explanatory state unless an existing upload contract is verified and tested.
- Missing `field.name` should fall back to a stable field ID for DOM IDs but
  must not submit unnamed data silently.
- Empty option lists render an explanatory disabled state instead of an empty
  radio/select group.

## Security Contract

No API routes are added by this leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: schema changes must stay allowlisted and covered
  by widget validator tests.
- Anti-abuse: field labels, helper text, and option labels render as text only;
  no arbitrary HTML/script/style injection.
- Secret handling: hidden fields must be Form model fields only; do not embed
  secrets, API keys, CAPTCHA secrets, nonce secrets, or privileged values in
  widget JSON or public DOM.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx`
- focused runtime-script DOM/value tests when `formRuntimeScript.ts` changes
- `bun test tests/unit/widgets/validator.test.ts` when schema/defaults change
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/FORM_EMBED.md` with the supported field type matrix,
  accessibility behavior, and any explicit unsupported file upload note.
- Update `_docs/PLAYWRIGHT/REPORT_FORM_EMBED_WIDGET.md` rows C2, W1, W17,
  A3-A7, and A10 after validation.

## Changelog Policy

- Covered by the TASK-269 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Radio and other non-text Forms field types render truthfully instead of
  silently falling back to text inputs.
- Field labels, IDs, helper text, required state, and hidden-label fallback are
  programmatically connected.
- File fields are either supported through a verified existing route contract or
  clearly disabled with user-facing explanation.
- Conditional logic and progress hydration still work for newly supported
  controls.
