# TASK-261-02: Contact Form Field Metadata and Public Submission Bridge

# FileName: TASK-261-02_Contact_Form_Field_Metadata_and_Public_Submission_Bridge.md

**Priority:** High
**Category:** Widgets + Forms + Runtime Render + Public Write Security + Admin UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-261, TASK-261-01
**Status:** Done (2026-05-18)

---

## Overview

Coordinate the Contact form execution leaves for the Playwright findings around
field metadata, accessible HTML, no-GET safety, and optional Forms runtime
submission.

This parent is not an implementation leaf. The work is intentionally split into
three physical children so each implementer can change one contract without
rediscovering the full public-write strategy:

- `TASK-261-02-01`: Contact field metadata and accessible HTML.
- `TASK-261-02-02`: presentational/static form behavior and no native GET
  reload.
- `TASK-261-02-03`: optional bridge to the current public-compatible Forms
  runtime projection, Contact-safe field mapping, and focused public-write
  tests.

`REPORT_CONTACT_WIDGET.md` confirms that Contact inputs currently have no
`name`, no explicit `id`, no `autocomplete`, and the form defaults to native GET
against the current page. The children must fix that Contact contract without
inventing an arbitrary endpoint in widget data.

## Scope Boundary

This parent owns dependency order and cross-leaf invariants only.

In scope across the children:

- Contact field `name`, `id`, `autocomplete`, `label`, `placeholder`, and layout
  span metadata.
- Explicit `<label htmlFor>` relationships and form accessible naming.
- A safe non-submitting state for presentational Contact blocks.
- Optional binding to an existing Forms record for real submission through the
  existing `POST /forms/:id/submissions` route and whatever safe runtime
  projection the shared Forms owners currently expose.
- A narrow runtime-only Contact `resolved` schema/type allowance when
  `publicSite.tsx` hydrates Forms data for rendering. Do not loosen Contact to
  arbitrary additional properties.
- `data-form-submit` / idle `aria-busy="false"` compatibility when the shared
  Forms runtime script owns submission.

Out of scope:

- Creating a new public Contact endpoint.
- Storing arbitrary endpoint URLs, provider secrets, CAPTCHA settings, nonce
  secrets, raw submissions, or email routing in Contact widget JSON.
- Replacing Form Embed or the Forms builder.
- Shared Forms runtime busy/live-region/CAPTCHA projection gaps that are not
  already exposed through the current runtime contract; route those to
  `TASK-269-05` or a future Forms/public-write task instead of fixing them
  locally inside Contact.
- Generic Forms route redesign beyond focused integration coverage required by
  Contact.

## Sub-Tasks

- [x] TASK-261-02-01: Contact Field Metadata and Accessible HTML
- [x] TASK-261-02-02: Contact Static Form State and No-GET Safety
- [x] TASK-261-02-03: Contact Forms Runtime Bridge and Public-Write Hardening

## Files to Change

| File | Required change |
|---|---|
| `_docs/_TASKS/TASK-261-02-01_Contact_Field_Metadata_and_Accessible_HTML.md` | Execution leaf for labels, placeholders, `name`, `id`, `autocomplete`, and field layout metadata. |
| `_docs/_TASKS/TASK-261-02-02_Contact_Static_Form_State_and_No_GET_Safety.md` | Execution leaf for non-submitting presentational behavior, static copy, and no native GET reload. |
| `_docs/_TASKS/TASK-261-02-03_Contact_Forms_Runtime_Bridge_and_Public_Write_Hardening.md` | Execution leaf for Forms runtime binding, public route/security proof, and status behavior. |
| `core/widgets/core/contact.tsx` | Shared Contact schema/default/normalizer/render owner touched by all children; TASK-261-02-03 may add a narrow render-only `resolved` schema/type field. |
| `core/admin/ui/widgets/editors/ContactEditors.tsx` | Editor controls for child-owned Contact form fields and runtime binding. |
| `core/server/publicSite.tsx` | Touched only by TASK-261-02-03 when runtime Forms data must be hydrated for Contact. |
| `core/widgets/core/formRuntimeScript.ts` | Reuse as-is if possible; touch only through TASK-261-02-03 when a shared runtime task has already generalized selectors/status behavior and Contact needs to consume it without a local fork. |
| `core/services/forms/formRuntimeResolver.ts` | Reuse as-is if possible; add focused adapter coverage only through TASK-261-02-03. |

## Implementation Order

1. Complete `TASK-261-02-01` first so field metadata and labels exist before
   any submit/static behavior depends on stable control names.
2. Complete `TASK-261-02-02` next so Contact never performs a blank native GET,
   even if Forms runtime binding is not enabled.
3. Complete `TASK-261-02-03` last because public submission is the high-risk
   runtime/security surface and must build on the static-safe form contract.

## Runtime Data Invariant

Forms runtime data is transient render-time data. If Contact needs resolved
Forms data, implementation must keep these rules:

```ts
type PersistedContactData = ContactDataWithoutRuntimeSecrets;

type ContactRuntimeRenderData = PersistedContactData & {
  resolved?: {
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
};

function hydrateContactForPublicRender(block: WidgetBlock): WidgetBlock {
  const data = normalizeContactData(block.data as ContactData);
  const formId = data.form?.submission?.formId;
  const resolved = formId ? resolveFormRuntimeData(formId, { preview }) : undefined;

  return {
    ...block,
    data: {
      ...data,
      // Render-request only. Do not persist this value back to page/widget JSON.
      resolved,
    },
  };
}
```

Because live widget validation uses the widget schema before render, the
Contact schema must explicitly allow only this runtime `resolved` key when
hydrated public render blocks are validated. It must still reject unrelated
unknown keys; do not use broad `additionalProperties: true`.

The hidden nonce value may appear in the rendered public form exactly like
`form-embed`, but nonce secrets and raw nonce evidence must not be stored in
Contact widget JSON, browser cache, Playwright reports, changelog entries, or
admin diagnostics. If a cache layer serializes public HTML, it must follow the
existing Forms runtime nonce/cache policy instead of inventing a Contact-specific
exception.

## Security Contract

This parent may affect existing Forms public submission behavior only through
the `TASK-261-02-03` bridge. It must not introduce a new public endpoint.

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
- Secret handling: widget JSON must not store nonce secrets, CAPTCHA secrets,
  provider keys, raw submission payloads, arbitrary endpoint URLs, or privileged
  routing settings.

## Testing Requirements

Parent validation after any child lands:

- `bun run test:vitest -- tests/vitest/widgets/contact.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/contact-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` when Contact schema changes.
- After `TASK-261-02-03` lands, Contact validator coverage must prove hydrated
  `resolved` render data is accepted while an unrelated unknown Contact field is
  still rejected.
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Additional Forms/public-write validation is owned by `TASK-261-02-03`.

## Documentation Updates Required

- Update `_docs/_WIDGETS/CONTACT.md` with final field metadata, static state,
  Forms runtime binding, nonce/CAPTCHA boundary, and accepted field settings.
- Update `_docs/PLAYWRIGHT/REPORT_CONTACT_WIDGET.md` rows C3, C4, W2, W3, W12,
  R2, R3, R4, and R10 after validation.
- Update `_docs/SECURITY_SPEC.md` only if the existing Forms public-write
  contract changes, not for Contact simply reusing it.
- Keep `_docs/_TASKS/README.md` synchronized when child task rows change state.

## Changelog Policy

- Covered by the TASK-261 family changelog or a leaf-specific changelog entry
  before moving to `Done`.

## Acceptance Criteria

- The three physical child leaves are execution-ready and cover every Contact
  field/submission finding from the source report.
- Contact form fields have stable names, IDs, labels, placeholders, and
  autocomplete attributes after the relevant child lands.
- Contact no longer submits a blank GET to the current page after the static
  behavior child lands.
- Active Contact submissions, if enabled, use the existing Forms route,
  nonce/CAPTCHA/access checks, runtime script, and status behavior.
- Static Contact forms are visibly non-submitting or editor-clearly
  presentational, without pretending to send data.
