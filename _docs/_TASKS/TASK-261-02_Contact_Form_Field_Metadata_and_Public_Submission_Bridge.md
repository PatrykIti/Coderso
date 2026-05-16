# TASK-261-02: Contact Form Field Metadata and Public Submission Bridge

# FileName: TASK-261-02_Contact_Form_Field_Metadata_and_Public_Submission_Bridge.md

**Priority:** High
**Category:** Widgets + Forms + Runtime Render + Public Write Security + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-261, TASK-261-01
**Status:** To Do

---

## Overview

Make the Contact form HTML complete and route active submissions through the
existing Forms runtime hardening.

`REPORT_CONTACT_WIDGET.md` confirms that Contact inputs have no `name`, no
explicit `id`, no `autocomplete`, and the form defaults to a native GET against
the current page. This leaf fixes the Contact form contract without inventing an
arbitrary endpoint in widget data.

## Scope Boundary

This leaf owns:

- Contact field `name`, `id`, `autocomplete`, `label`, `placeholder`, and layout
  span metadata.
- Explicit `<label htmlFor>` relationships and form accessible naming.
- A safe non-submitting state for presentational Contact blocks.
- Optional binding to an existing Forms record for real submission via the
  existing `POST /forms/:id/submissions` route, nonce, CAPTCHA, and runtime
  script contract.
- Submit button `data-form-submit` / `aria-busy` state compatibility when the
  Forms runtime script owns submission.

This leaf does not own:

- Creating a new public Contact endpoint.
- Storing endpoint URLs, provider secrets, CAPTCHA settings, or email routing in
  Contact widget JSON.
- Replacing Form Embed or the Forms builder.
- Generic Forms route redesign beyond focused integration coverage required by
  Contact.

## Sub-Tasks

- [ ] Extend `ContactData.form` with field metadata keyed by
  `ContactFieldId`, including label, placeholder, autocomplete, and layout span.
- [ ] Add a Contact submission binding, preferably `form.sourceFormId` or
  `submission.formId`, that points to an existing Forms record.
- [ ] Hydrate the selected Forms runtime data in public rendering the same way
  `form-embed` does, reusing `resolveFormRuntimeData()` and existing nonce
  generation.
- [ ] Render `method="post"` and `action="/forms/:id/submissions"` only when a
  valid Forms runtime binding exists.
- [ ] If no valid binding exists, prevent silent GET reloads by rendering a
  non-submitting presentational form state and explicit editor/runtime copy.
- [ ] Add field `name`, stable `id`, `autocomplete`, explicit labels, and
  per-field placeholder/label output.
- [ ] Add success/error/status nodes compatible with existing
  `getFormRuntimeClientScript()` instead of a Contact-only script.
- [ ] Keep required fields clamped to selected fields and keep unknown public
  payload keys rejected by Forms schemas.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Extend schema/defaults/normalizer/render for field metadata and Forms runtime binding. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add editor controls for labels, placeholders, autocomplete hints, field layout spans, selected Forms binding, and static-vs-submit state copy. |
| `core/server/publicSite.tsx` | Hydrate Contact Forms runtime data when Contact is bound to an existing form. |
| `core/widgets/core/formRuntimeScript.ts` | Reuse as-is when possible; change only if Contact needs a generalized selector/name that remains compatible with Form Embed. |
| `core/services/forms/formRuntimeResolver.ts` | Reuse existing resolver; add focused coverage if Contact requires a small adapter. |
| `tests/vitest/widgets/contact.test.tsx` | Cover names, ids, autocomplete, labels/placeholders, static non-submit state, and active Forms runtime action. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover metadata controls and submission binding UI. |
| `tests/vitest/forms/formRuntimeResolver.test.ts` | Add Contact hydration coverage only if resolver/adapter logic changes. |
| `tests/integration/routes/forms.test.ts` | Add public submit route coverage if Contact changes payload shape or runtime assumptions. |
| `tests/security/codersoSecurityGate.test.ts` | Run/update when nonce, CAPTCHA, or public-write policy behavior changes. |
| `tests/unit/widgets/validator.test.ts` | Update when Contact schema changes. |

## Implementation Pseudocode

```ts
type ContactFieldSettings = {
  label?: string;
  placeholder?: string;
  autocomplete?: "name" | "email" | "tel" | "off";
  span?: "full" | "half";
};

type ContactSubmissionSettings = {
  formId?: string;
  mode?: "static" | "forms-runtime";
  successMessage?: string;
  errorMessage?: string;
};

type ContactData = {
  form?: {
    fields?: ContactFieldId[];
    required?: ContactFieldId[];
    submitLabel?: string;
    fieldSettings?: Partial<Record<ContactFieldId, ContactFieldSettings>>;
    fieldLayout?: "one" | "two";
    submission?: ContactSubmissionSettings;
  };
  resolved?: {
    formId?: string;
    submissionNonce?: string | null;
    submissionAccess?: "public" | "internal";
    error?: string;
  };
};
```

Runtime hydration:

```ts
if (block.type === "contact") {
  const normalized = normalizeContactData(ensureRecord(block.data) as ContactData);
  const formId = normalized.form?.submission?.formId;
  const resolved = formId
    ? await resolveFormRuntimeData(formId, { preview: options.preview })
    : { error: "contact_form_missing" };

  nextBlock = {
    ...block,
    data: {
      ...normalized,
      resolved,
    },
  };
}
```

Renderer shape:

```tsx
const canSubmit =
  showForm &&
  normalized.form?.submission?.mode === "forms-runtime" &&
  normalized.form?.submission?.formId &&
  !normalized.resolved?.error;

<form
  method={canSubmit ? "post" : undefined}
  action={canSubmit ? `/forms/${formId}/submissions` : undefined}
  data-nextless-form-runtime={canSubmit ? "1" : undefined}
  aria-labelledby={formTitleId}
  onSubmit={canSubmit ? undefined : preventNativeSubmit}
>
  {nonce ? <input type="hidden" name="__nl_form_nonce" value={nonce} /> : null}
  {fields.map((field) => (
    <input
      id={`${instanceId}-${field}`}
      name={fieldSettings[field].name ?? field}
      autoComplete={fieldSettings[field].autocomplete}
      required={requiredFields.has(field)}
    />
  ))}
  <button
    type={canSubmit ? "submit" : "button"}
    data-form-submit={canSubmit ? "1" : undefined}
    aria-busy="false"
  >
    {submitLabel}
  </button>
</form>
```

Error handling:

- Missing or unpublished Forms bindings render a clear non-submitting fallback
  and do not produce a GET submit.
- Unknown field setting keys are rejected by Contact schema validation.
- Unknown submitted fields are still rejected by the Forms submission schema.
- Internal Forms mode requires admin session or API key scope `forms.submit`.

## Security Contract

This leaf may affect existing Forms public submission behavior through Contact
runtime integration. It must not introduce a new public endpoint.

- Endpoint visibility: existing public `POST /forms/:id/submissions`; admin
  editing remains internal.
- Auth model: public mode uses existing Forms nonce and CAPTCHA policy; internal
  mode requires admin session or API key scope `forms.submit`.
- RBAC: admin configuration changes use existing page/template/widget-template
  permissions and Forms read permissions for picker data.
- CSRF: admin writes keep CSRF; public form submission uses HMAC nonce
  `__nl_form_nonce`.
- Rate-limit bucket: existing public write/forms bucket through current route
  middleware; do not add a weaker widget bucket.
- Reject-unknown validation: Contact schema rejects unknown widget fields;
  Forms schemas reject unknown submission fields.
- Anti-abuse: nonce + signature/HMAC remain required for public submit when
  access policy requires it; optional reCAPTCHA remains backend-owned through
  security settings.
- Secret handling: widget JSON must not store nonce secrets, CAPTCHA secrets,
  provider keys, raw submission payloads, or arbitrary endpoint URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts` when
  runtime hydration changes
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/routes/forms.test.ts` when Contact changes public
  submission payload/action behavior
- `bun test tests/unit/forms/submissionService.test.ts` when submitted data
  normalization changes
- `bun test tests/security/codersoSecurityGate.test.ts` when nonce/CAPTCHA or
  public-write hardening changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with form metadata, static state, Forms
  runtime binding, nonce/CAPTCHA boundary, and accepted field settings.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C3, C4, W2, W3, W11,
  W12, R2, R3, R4, and R10 after validation.
- Update `_docs/SECURITY_SPEC.md` only if the existing Forms public-write
  contract changes, not for Contact simply reusing it.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Contact form fields have stable names, IDs, labels, placeholders, and
  autocomplete attributes.
- Contact no longer submits a blank GET to the current page.
- Active Contact submissions use the existing Forms route, nonce/CAPTCHA/access
  checks, and runtime status behavior.
- Static Contact forms are visibly non-submitting or editor-clearly
  presentational, without pretending to send data.
- Tests cover both static and active Forms-runtime modes.
