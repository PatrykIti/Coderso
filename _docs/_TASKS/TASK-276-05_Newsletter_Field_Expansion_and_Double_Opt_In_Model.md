# TASK-276-05: Newsletter Field Expansion and Double Opt-In Model

# FileName: TASK-276-05_Newsletter_Field_Expansion_and_Double_Opt_In_Model.md

**Priority:** Medium
**Category:** Widgets + Forms + Admin UI + Runtime Render + Public Write Security
**Estimated Effort:** Large
**Dependencies:** TASK-276, TASK-276-01, TASK-276-02, TASK-276-03
**Status:** To Do

---

## Overview

Add bounded Newsletter product fields only after the base form, submit state,
and integration contracts are stable.

The report asks for additional fields such as first name and double opt-in
configuration. The base configurable email `name` belongs to TASK-276-01. This
leaf keeps the remaining expansion
Newsletter-specific and bounded so schema/default/render/editor/tests move
together.

## Scope Boundary

This leaf owns:

- Optional first-name field and a small bounded custom-field model for
  Newsletter use cases.
- Required/optional state, labels, placeholders, autocomplete, field names, and
  submitted payload semantics for those fields.
- Double opt-in user-facing configuration as metadata/copy, with backend-owned
  enforcement only when a Coderso route owns submission.

This leaf does not own:

- Generic form builder replacement. Complex forms should use `form-embed`.
- Unlimited arbitrary fields, raw HTML, custom scripts, custom validation code,
  or provider secret mapping.
- Redefining `form.emailFieldName`; TASK-276-01 owns base email name, label,
  ID, and autocomplete semantics.
- Backend email delivery or provider API implementation unless a separate
  route/service task is created.

## Sub-Tasks

- [ ] Define a bounded `NewsletterFieldConfig` model for `email`, optional
  `firstName`, and at most a small number of additional safe text/select/checkbox
  fields if approved by research.
- [ ] Preserve `email` as always present and required, reusing the
  `form.emailFieldName` normalized by TASK-276-01 for the base email field,
  unless a later product task explicitly changes the core Newsletter purpose.
- [ ] Add first-name label, placeholder, `name`, autocomplete, required flag,
  and render output.
- [ ] Add editor controls for enabled fields and field metadata.
- [ ] Add double opt-in configuration with visible copy, confirmation note, and
  backend-enforcement diagnostics.
- [ ] If double opt-in is enforced by Coderso, add or link the backend owner
  route/service that sends confirmation and persists pending status.
- [ ] If no backend owner exists, render double opt-in as provider expectation
  copy only and mark enforcement as external/provider-owned in docs.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/newsletter.tsx` | Extend schema/defaults/normalizer/render for bounded fields and double opt-in metadata. |
| `core/admin/ui/widgets/editors/NewsletterEditors.tsx` | Add field-management and double opt-in controls with diagnostics. |
| `tests/vitest/widgets/newsletter.test.tsx` | Cover first-name/custom field render, names, autocomplete, required flags, and double opt-in metadata. |
| `tests/vitest/ui/newsletter-editor-wave.test.tsx` | Cover field-management and double opt-in editor flows. |
| `tests/unit/widgets/validator.test.ts` | Cover schema rejection for unknown or oversized field config. |
| `tests/integration/routes/forms.test.ts` and `tests/security/codersoSecurityGate.test.ts` | Run/update only when backend-owned submission payload changes. |
| `_docs/_WIDGETS/NEWSLETTER.md` | Document fields and double opt-in boundary. |

## Implementation Pseudocode

```ts
type NewsletterFieldId = "email" | "firstName" | string;

type NewsletterFieldConfig = {
  id: NewsletterFieldId;
  type: "email" | "text" | "checkbox" | "select";
  label: string;
  name: string;
  placeholder?: string;
  autocomplete?: "email" | "given-name" | "name" | "off";
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type NewsletterOptIn = {
  mode?: "single" | "double";
  confirmationCopy?: string;
  enforcement?: "provider-owned" | "coderso-owned";
};

function normalizeNewsletterFields(input: unknown): NewsletterFieldConfig[] {
  const fields = toArray(input).slice(0, NEWSLETTER_FIELD_LIMIT).map(normalizeField);
  return ensureEmailField(fields);
}
```

Renderer shape:

```tsx
{fields.map((field) => (
  <NewsletterFieldControl
    key={field.id}
    field={field}
    id={`${instanceId}-${field.id}`}
  />
))}
{optIn.mode === "double" ? (
  <p data-newsletter-double-opt-in="true">{optIn.confirmationCopy}</p>
) : null}
```

Error handling:

- Duplicate field names normalize to unique safe names or fail validation with a
  machine-readable widget validation error.
- Unsupported field types are rejected by schema and normalizer tests.
- Empty custom select options drop the field or surface editor validation; do
  not silently render a different field type.
- Double opt-in cannot claim Coderso enforcement unless a backend route/service
  exists and is tested.

## Security Contract

This leaf may affect public payload shape when Newsletter submits through
Coderso.

- Endpoint visibility: unchanged unless a backend-owned Newsletter/Forms submit
  route is explicitly updated.
- Auth model: public writes keep nonce/CAPTCHA; internal mode requires session
  or API key scope.
- RBAC: admin widget editing remains under page/template/widget permissions.
- CSRF: admin writes keep CSRF; public writes keep HMAC nonce.
- Rate-limit bucket: `public_write` for Coderso-owned submits.
- Reject-unknown validation: widget schema rejects unknown field config;
  backend route rejects unknown submitted fields and oversized metadata.
- Anti-abuse: field expansion must not bypass honeypot, nonce, CAPTCHA, or
  provider-owned confirmation rules.
- Secret handling: no provider API keys, confirmation secrets, nonce secrets,
  or raw submitted payloads in widget JSON or reports.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/newsletter.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/newsletter-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/routes/forms.test.ts` when backend payload changes
- `bun test tests/security/codersoSecurityGate.test.ts` when public-write
  hardening changes
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/NEWSLETTER.md`
- `_docs/PLAYWRIGHT/REPORT_NEWSLETTER_WIDGET.md` rows BF-05 and BF-09 after
  validation. BF-04 is owned by TASK-276-01 because it is the base email field
  name contract.

## Changelog Policy

- Covered by the TASK-276 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- Newsletter can collect the approved additional field data with stable names,
  labels, and autocomplete attributes.
- Field expansion remains bounded and schema-validated.
- Double opt-in behavior is either backend-enforced with tests or clearly
  documented as provider-owned copy.
- Complex form use cases remain directed to `form-embed` instead of turning
  Newsletter into an unbounded form builder.
