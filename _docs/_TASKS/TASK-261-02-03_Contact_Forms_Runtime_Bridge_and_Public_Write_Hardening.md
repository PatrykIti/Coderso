# TASK-261-02-03: Contact Forms Runtime Bridge and Public-Write Hardening

# FileName: TASK-261-02-03_Contact_Forms_Runtime_Bridge_and_Public_Write_Hardening.md

**Priority:** High
**Category:** Widgets + Forms + Runtime Render + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-261-02-01, TASK-261-02-02
**Status:** To Do

---

## Overview

Enable Contact to submit only by binding to an existing Forms record and
reusing the current Forms runtime contract.

This leaf owns the high-risk public-write part of `REPORT_CONTACT_WIDGET.md`
row C4 and the status-state part of R10. It must reuse Forms runtime hardening
instead of adding a Contact-specific public endpoint or storing an arbitrary
endpoint URL in widget JSON.

## Scope Boundary

This leaf owns:

- A Contact submission binding such as `form.submission.formId`.
- A strict field mapping between the four Contact field IDs and real
  `NormalizedFormField.name` values, or a renderer path that uses resolved Forms
  fields directly.
- Admin picker/read behavior for existing Forms records.
- Public render hydration through `resolveFormRuntimeData()`.
- A narrow runtime-only `resolved` schema/type allowance on Contact so hydrated
  public render blocks pass widget validation without accepting arbitrary
  unknown fields.
- Runtime form attributes compatible with `getFormRuntimeClientScript()`.
- Success/error/status nodes compatible with the existing Forms client script,
  including dynamic submit-button busy state for the R10 loading-state finding.
- Focused route/security tests when Contact changes public submit assumptions.

This leaf does not own:

- New public Contact endpoints.
- Email provider routing, CAPTCHA secrets, nonce secrets, or integration keys in
  widget data.
- Forms builder redesign or Form Embed replacement.
- Analytics, CRM sync, or automation changes unless the existing Forms route
  already owns them.

## Sub-Tasks

- [ ] Add `form.submission.formId` and normalize it as an optional Forms record
  reference, not an endpoint URL.
- [ ] Choose and document one strict field strategy:
  - render the resolved Forms fields directly, preserving Forms-owned field
    names and validation; or
  - add `form.submission.fieldMap` from `ContactFieldId` to resolved
    `NormalizedFormField.name`, reject mappings to missing/duplicate Forms
    fields, and hide/drop unmapped Contact fields in active mode.
- [ ] Add admin picker/copy for selecting a Forms record; respect existing
  Forms read permissions and cached client patterns.
- [ ] Hydrate Contact public render data from `resolveFormRuntimeData()` in
  `core/server/publicSite.tsx`.
- [ ] Add an explicit Contact schema/type allowance for the render-only
  `resolved` key. Validator tests must prove hydrated Contact data is accepted
  while unrelated unknown fields still reject.
- [ ] Render `method="post"`, `action="/forms/:id/submissions"`,
  `data-nextless-form-runtime="1"`, hidden `__nl_form_nonce`, status nodes, and
  `data-form-submit="1"` only when the binding is valid and runtime data is
  available.
- [ ] Reuse `getFormRuntimeClientScript()` without a Contact-only runtime script
  unless the existing selector/status node contract must be generalized.
- [ ] Close R10 dynamic loading-state behavior by making the shared Forms
  runtime script set/clear `aria-busy` on `[data-form-submit]`; if this is
  deliberately deferred, create a named follow-up task and mark R10 deferred
  instead of fixed.
- [ ] Add tests for missing, unpublished, public, and internal Forms bindings.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Add runtime binding fields, strict Forms field mapping or Forms-field rendering, a narrow render-only `resolved` schema/type allowance, and Forms-compatible submit/status markup. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add Forms binding controls, field-map UI if mapping is chosen, and static-vs-submit state copy. |
| `core/server/publicSite.tsx` | Hydrate Contact runtime data with `resolveFormRuntimeData()` for public rendering. |
| `core/widgets/core/formRuntimeScript.ts` | Update the shared script to set/clear submit-button `aria-busy` when it owns a Forms runtime submit. Keep selectors generic for Form Embed and Contact. |
| `core/widgets/core/formEmbed.tsx` | Touch only if `formRuntimeScript.ts` selector/status attributes are generalized; keep Form Embed behavior unchanged and covered by regression tests. |
| `core/services/forms/formRuntimeResolver.ts` | Reuse as-is; add adapter only if Contact needs a small typed wrapper. |
| `tests/vitest/widgets/contact.test.tsx` | Cover active Forms-runtime markup, strict field mapping/Forms-field names, and missing/unavailable fallback. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover Forms picker/state copy and field-map UI if added. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Run/update for shared `formRuntimeScript.ts` busy-state/status behavior so Form Embed does not regress. |
| `tests/vitest/forms/formRuntimeResolver.test.ts` | Add Contact hydration coverage if resolver/adapter logic changes. |
| `tests/unit/widgets/validator.test.ts` | Prove the Contact schema accepts render-only `resolved` data and still rejects unrelated unknown fields. |
| `tests/integration/runtime/pages-runtime.test.ts` | Add public page runtime smoke proving Contact hydration if `publicSite.tsx` changes. |
| `tests/integration/routes/forms.test.ts` | Run/update when Contact changes submission payload/action assumptions. |
| `tests/unit/forms/submissionService.test.ts` | Run/update when submitted data normalization changes. |
| `tests/security/codersoSecurityGate.test.ts` | Run/update when nonce/CAPTCHA/public-write policy changes. |

## Implementation Pseudocode

```ts
type ContactSubmissionSettings = {
  mode?: "static" | "forms-runtime";
  formId?: string;
  fieldMap?: Partial<Record<ContactFieldId, string>>;
  successMessage?: string;
  errorMessage?: string;
};

function resolveContactFormsBinding(data: ContactData): string | undefined {
  const submission = normalizeContactData(data).form?.submission;
  return submission?.mode === "forms-runtime" ? normalizeId(submission.formId) : undefined;
}

function resolveContactRuntimeFields(
  contactFields: ContactFieldId[],
  resolvedFields: NormalizedFormField[],
  fieldMap: Partial<Record<ContactFieldId, string>>
) {
  const byName = new Map(resolvedFields.map((field) => [field.name, field]));
  return contactFields.flatMap((contactField) => {
    const formFieldName = fieldMap[contactField];
    const formField = formFieldName ? byName.get(formFieldName) : undefined;
    return formField ? [{ contactField, formField }] : [];
  });
}
```

Schema/type shape:

```ts
type ContactResolvedRuntimeData = {
  formId?: string;
  formName?: string;
  fields?: NormalizedFormField[];
  status?: string;
  successMessage?: string | null;
  successRedirectUrl?: string | null;
  submissionAccess?: "public" | "internal";
  submissionNonce?: string | null;
  error?: string;
};

type ContactDataForRender = ContactData & {
  // Render-request data only. This key is schema-allowed so validation can
  // accept hydrated blocks, but it is never stored in page/widget JSON.
  resolved?: ContactResolvedRuntimeData;
};
```

Public render hydration:

```ts
if (block.type === "contact") {
  const normalized = normalizeContactData(ensureRecord(block.data) as ContactData);
  const formId = resolveContactFormsBinding(normalized);
  const resolved = formId
    ? await resolveFormRuntimeData(formId, { preview: options.preview })
    : undefined;

  nextBlock = {
    ...block,
    data: {
      ...normalized,
      // Transient render-request data only. Never persist this back to page JSON.
      resolved,
    },
  };
}
```

Renderer shape:

```tsx
const canSubmit =
  showForm &&
  submission.mode === "forms-runtime" &&
  submission.formId &&
  resolved &&
  !resolved.error &&
  resolved.fields.length > 0 &&
  runtimeFields.length > 0;

<form
  method={canSubmit ? "post" : undefined}
  action={canSubmit ? `/forms/${encodeURIComponent(submission.formId)}/submissions` : undefined}
  data-form-id={canSubmit ? submission.formId : undefined}
  data-nextless-form-runtime={canSubmit ? "1" : undefined}
>
  {canSubmit && resolved.submissionNonce ? (
    <input type="hidden" name="__nl_form_nonce" value={resolved.submissionNonce} />
  ) : null}
  {runtimeFields.map(({ contactField, formField }) => (
    <input
      key={contactField}
      name={formField.name}
      required={formField.required}
      data-contact-field={contactField}
    />
  ))}
  <button type={canSubmit ? "submit" : "button"} data-form-submit="1" aria-busy="false">
    {submitLabel}
  </button>
  <p className="hidden" data-form-embed-success="true">{successMessage}</p>
  <p className="hidden" data-form-embed-error="true">{errorMessage}</p>
</form>
{canSubmit ? <script dangerouslySetInnerHTML={{ __html: getFormRuntimeClientScript() }} /> : null}
```

Error handling:

- Missing or unpublished Forms bindings render the static-safe state from
  `TASK-261-02-02`, not a GET submit.
- Contact schema validation must accept only the runtime `resolved` key added by
  hydration and continue rejecting unrelated unknown fields.
- Contact fixed field IDs must never be submitted as raw payload keys unless
  they match the selected Forms field names through the strict mapping contract.
- Unknown submitted fields remain rejected by the existing Forms schemas.
- Internal Forms mode requires admin session or API key scope `forms.submit`.
- The shared runtime script must set submit-button `aria-busy="true"` while a
  Forms submission is in flight and restore `aria-busy="false"` on success,
  failure, or thrown network errors. The existing `data-submitting` behavior may
  remain, but it is not enough by itself to close R10.
- Runtime diagnostics and final reports must redact nonce values.

## Security Contract

This leaf affects existing Forms public submission behavior through Contact
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
- Reject-unknown validation: Contact schema rejects unknown widget fields except
  the explicit render-only `resolved` hydration key; Forms schemas reject
  unknown submission fields.
- Anti-abuse: nonce + signature/HMAC remain required for public submit when
  access policy requires it; optional reCAPTCHA remains backend-owned through
  security settings.
- Secret handling: widget JSON, admin diagnostics, reports, and changelog notes
  must not store nonce secrets, CAPTCHA secrets, provider keys, raw submission
  payloads, or arbitrary endpoint URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx` for shared
  Forms runtime busy-state/status behavior.
- `bun run test:vitest -- tests/vitest/forms/formRuntimeResolver.test.ts` when
  runtime hydration changes.
- `bun test tests/integration/runtime/pages-runtime.test.ts` when
  `publicSite.tsx` hydrates Contact runtime data.
- `bun test tests/integration/routes/forms.test.ts` when Contact changes public
  submission payload/action behavior.
- `bun test tests/unit/forms/submissionService.test.ts` when submitted data
  normalization changes.
- `bun test tests/unit/widgets/validator.test.ts` when Contact schema accepts
  runtime `resolved` data.
- `bun test tests/security/codersoSecurityGate.test.ts` when nonce/CAPTCHA or
  public-write hardening changes.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with Forms runtime binding, field mapping,
  and nonce/CAPTCHA boundary.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C4 and R10 after
  validation.
- Update `_docs/SECURITY_SPEC.md` only if the existing Forms public-write
  contract changes.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Contact submits only through an existing Forms record and route.
- Active mode submits Forms-owned field names, either by rendering resolved
  Forms fields directly or by a strict Contact-to-Forms field map.
- Valid runtime bindings render Forms-compatible markup, nonce, status nodes,
  submit-button `aria-busy` transitions, and client script behavior.
- Missing/unavailable bindings fall back to the static-safe state without
  native GET behavior.
- Public-write route/security lanes are green or documented with exact blockers.
