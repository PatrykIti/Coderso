# TASK-261-02-03: Contact Forms Runtime Bridge and Public-Write Hardening

# FileName: TASK-261-02-03_Contact_Forms_Runtime_Bridge_and_Public_Write_Hardening.md

**Priority:** High
**Category:** Widgets + Forms + Runtime Render + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-261-02-01, TASK-261-02-02
**Status:** Done (2026-05-18)

---

## Overview

Enable Contact to submit only by binding to an existing public-compatible Forms
record, preserving Contact-owned field metadata, and reusing the current Forms
runtime contract without a Contact-specific submit fork.

This leaf owns the high-risk public-write part of `REPORT_CONTACT_WIDGET.md`
row C4 and only the Contact-side runtime prerequisites of R10. It must reuse
Forms runtime hardening instead of adding a Contact-specific public endpoint or
storing an arbitrary endpoint URL in widget JSON.

## Scope Boundary

This leaf owns:

- A Contact submission binding such as `form.submission.formId`.
- A strict compatible field mapping between the four Contact field IDs and real
  `NormalizedFormField.name` values while preserving the Contact-owned
  label/placeholder/autocomplete/span contract from `TASK-261-02-01`.
- Admin picker/read behavior for existing Forms records.
- Public render hydration through `resolveFormRuntimeData()`.
- A narrow runtime-only `resolved` schema/type allowance on Contact so hydrated
  public render blocks pass widget validation without accepting arbitrary
  unknown fields.
- Runtime form attributes compatible with the current
  `getFormRuntimeClientScript()` marker contract.
- Existing success/error/status nodes and idle `aria-busy="false"` /
  `data-form-submit="1"` markup required for Contact to consume the shared
  runtime script when generic runtime behavior already exists.
- Focused route/security tests when Contact changes public submit assumptions.

This leaf does not own:

- New public Contact endpoints.
- Shared runtime busy/live-region/CAPTCHA projection gaps already owned by
  `TASK-269-05` or a future Forms/public-write task.
- Email provider routing, CAPTCHA secrets, nonce secrets, or integration keys in
  widget data.
- Forms builder redesign or Form Embed replacement.
- Internal-form public submit UX. Internal Forms bindings must remain
  static-safe on public pages and show diagnostic copy in admin/editor rather
  than a working-looking public submit path.
- Analytics, CRM sync, or automation changes unless the existing Forms route
  already owns them.

## Sub-Tasks

- [x] Add `form.submission.formId` and normalize it as an optional Forms record
  reference, not an endpoint URL.
- [x] Add `form.submission.fieldMap` from `ContactFieldId` to resolved
  `NormalizedFormField.name`, preserve Contact-owned labels/placeholders/
  autocomplete/span metadata from `TASK-261-02-01`, reject mappings to
  missing/duplicate/incompatible Forms fields, and fall back to the static-safe
  state when the selected Forms field set exceeds Contact's supported subset.
- [x] Add admin picker/copy for selecting a Forms record; respect existing
  Forms read permissions and cached client patterns, and make public-vs-internal
  compatibility explicit.
- [x] Hydrate Contact public render data from `resolveFormRuntimeData()` in
  `core/server/publicSite.tsx`.
- [x] Add an explicit Contact schema/type allowance for the render-only
  `resolved` key. Validator tests must prove hydrated Contact data is accepted
  while unrelated unknown fields still reject.
- [x] Render `method="post"`, `action="/forms/:id/submissions"`,
  `data-nextless-form-runtime="1"`, hidden `__nl_form_nonce`, status nodes, and
  `data-form-submit="1"` only when the binding is valid,
  `resolved.submissionAccess === "public"`, runtime data is available, and the
  mapped fields remain compatible with Contact's supported subset.
- [x] Reuse `getFormRuntimeClientScript()` and the existing
  `data-form-embed-success` / `data-form-embed-error` markers without a
  Contact-only runtime script. If the generic selector/status/busy behavior is
  still missing, link `TASK-269-05` or a future Forms/public-write task instead
  of patching that shared runtime locally here.
- [x] Add tests for missing, unpublished, public, and internal Forms bindings.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/contact.tsx` | Add runtime binding fields, strict compatible Forms field mapping, a narrow render-only `resolved` schema/type allowance, and Forms-compatible submit/status markup that preserves Contact-owned field metadata. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Add Forms binding controls, required field-map UI, internal/public compatibility warnings, and static-vs-submit state copy. |
| `core/server/publicSite.tsx` | Hydrate Contact runtime data with `resolveFormRuntimeData()` for public rendering. |
| `core/widgets/core/formRuntimeScript.ts` | Touch only if a shared runtime task has already generalized selectors/status behavior and Contact needs to consume it; do not land Contact-only busy/CAPTCHA logic here. |
| `core/widgets/core/formEmbed.tsx` | Touch only if shared runtime selectors/status attributes are generalized; keep Form Embed behavior unchanged and covered by regression tests. |
| `core/services/forms/formRuntimeResolver.ts` | Reuse as-is; add adapter only if Contact needs a small typed wrapper. |
| `tests/vitest/widgets/contact.test.tsx` | Cover active Forms-runtime markup, strict field mapping/Forms-field names, and missing/unavailable fallback. |
| `tests/vitest/ui/contact-editor-wave.test.tsx` | Cover Forms picker/state copy, internal/public compatibility warnings, and required field-map UI. |
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
  const supportedTypes = new Set(["text", "email", "tel", "textarea"]);
  const byName = new Map(resolvedFields.map((field) => [field.name, field]));
  const usedNames = new Set<string>();
  return contactFields.flatMap((contactField) => {
    const formFieldName = fieldMap[contactField];
    const formField = formFieldName ? byName.get(formFieldName) : undefined;
    if (!formField) return [];
    if (usedNames.has(formField.name)) return [];
    if (!supportedTypes.has(formField.type)) return [];
    usedNames.add(formField.name);
    return [{ contactField, formField }];
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
  resolved.submissionAccess === "public" &&
  resolved.fields.length > 0 &&
  runtimeFields.length > 0;

<form
  method={canSubmit ? "post" : undefined}
  action={canSubmit ? `/forms/${encodeURIComponent(submission.formId)}/submissions` : undefined}
  data-form-id={canSubmit ? submission.formId : undefined}
  data-nextless-form-runtime={canSubmit ? "1" : undefined}
  data-form-success-message={successMessage}
>
  {canSubmit && resolved.submissionNonce ? (
    <input type="hidden" name="__nl_form_nonce" value={resolved.submissionNonce} />
  ) : null}
  {runtimeFields.map(({ contactField, formField }) => (
    renderContactField(contactField, {
      name: formField.name,
      required: formField.required,
      label: fieldSettings[contactField].label,
      placeholder: fieldSettings[contactField].placeholder,
      autocomplete: fieldSettings[contactField].autocomplete,
      span: fieldSettings[contactField].span,
    })
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
- Internal Forms bindings, incompatible field types, duplicate mappings, or
  missing field mappings also render the same static-safe state on public pages.
- Contact schema validation must accept only the runtime `resolved` key added by
  hydration and continue rejecting unrelated unknown fields.
- Contact fixed field IDs must never be submitted as raw payload keys unless
  they match the selected Forms field names through the strict mapping contract.
- Unknown submitted fields remain rejected by the existing Forms schemas.
- Internal Forms mode still requires admin session or API key scope
  `forms.submit`; Contact must not render that as a public working submit path.
- If `TASK-269-05` or another shared Forms/public-write task has not landed the
  generic busy/live-region contract yet, Contact still renders existing marker
  compatibility plus idle `aria-busy="false"` and records R10 as a shared
  dependency instead of forking the runtime script locally.
- If shared Forms runtime projection does not yet expose the safe CAPTCHA/public
  metadata required by current security settings, Contact must stay static-safe
  rather than invent widget-owned anti-abuse switches.
- Runtime diagnostics and final reports must redact nonce values.

## Security Contract

This leaf affects existing Forms public submission behavior through Contact
runtime integration. It must not introduce a new public endpoint.

- Endpoint visibility: existing public `POST /forms/:id/submissions`; admin
  editing remains internal.
- Auth model: active public Contact submit is allowed only for bindings whose
  resolved `submissionAccess` is `public`; internal bindings remain
  static/informational on public pages and still require admin session or API
  key scope `forms.submit` outside this widget family.
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
  security settings and must arrive through a shared Forms projection before
  Contact can rely on it.
- Secret handling: widget JSON, admin diagnostics, reports, and changelog notes
  must not store nonce secrets, CAPTCHA secrets, provider keys, raw submission
  payloads, or arbitrary endpoint URLs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/formEmbed.test.tsx` for shared
  Forms runtime/status behavior only when a shared runtime task changes generic
  selectors or markers consumed by Contact.
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
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with Forms runtime binding, field mapping,
  and nonce/CAPTCHA boundary.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C4 and R10 after
  validation. If dynamic busy/live-region/CAPTCHA projection still depends on
  shared runtime work, link `TASK-269-05` or the follow-up Forms/public-write
  task instead of marking that shared portion fixed under Contact.
- Update `_docs/SECURITY_SPEC.md` only if the existing Forms public-write
  contract changes.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Contact submits only through an existing Forms record and route.
- Active mode uses a strict Contact-to-Forms field map, preserves Contact-owned
  field metadata, and submits Forms-owned field names only for compatible
  public bindings.
- Valid public runtime bindings render Forms-compatible markup, nonce, existing
  shared status markers, and client script behavior without a Contact-only
  runtime fork.
- Missing/unavailable bindings fall back to the static-safe state without
  native GET behavior.
- Internal/incompatible bindings also fall back to the static-safe state on
  public pages instead of a working-looking submit UI.
- R10 dynamic busy/live-region behavior is marked fixed only when the shared
  runtime owner has landed it; otherwise Contact-side marker compatibility and
  fallback behavior are fixed while the shared dependency is explicitly linked.
- Public-write route/security lanes are green or documented with exact blockers.
