# TASK-536-04-L02: Strict Nested Forms Schemas

# FileName: TASK-536-04-L02-Strict-Nested-Forms-Schemas.md

**Parent Task:** TASK-536
**Parent Subtask:** TASK-536-04
**Priority:** High
**Category:** Forms Domain / API Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-536-04-L01
**Status:** ⏳ To Do
**Changelog:** 1248 (pinned; create only at implementation closure)

---

## Scope

Define reusable Bun-free schemas for every fixed Form and field settings object, then
compose them into route schemas so unknown nested keys are rejected before normalization
or persistence. Keep submission data dynamic at JSON-schema level and enforce its keys
against the resolved form fields in the service.

## Source ownership

This leaf is the only TASK-536 writer of:

- core/server/validation/formSchemas.ts;
- core/services/forms/formSettings.ts;
- core/services/forms/fieldSettings.ts;
- core/services/forms/validation.ts;

Keep the reusable schema builders in those existing owners. Do not create the optional
`core/services/forms/formDocumentSchemas.ts` or any other production helper file; the
fixed file list above is exhaustive under YAGNI.

It owns compatibility/changed-behavior updates in the four Vitest/Bun files named by its
gate before validation. It must not edit routes, publicFormsApi.ts, runtime/widget
source, other tests, docs, task indexes, or changelog files.

## Grounded schema inventory

Cover create/update form settings, automation retry settings, theme and every nested
theme subgroup, field records, field settings per field type, conditional logic, visual
style, accept arrays, option arrays, and the upload envelope metadata. Each fixed object
must declare additionalProperties: false and explicit types/bounds. Preserve the existing
field-type discriminants and normalization clamps.

## Implementation Pseudocode

~~~ts
export const formSettingsSchema = strictObject({
  ...all supported top-level keys,
  automationRetry: strictObject(...),
  theme: strictObject({
    ...supported keys,
    typography: strictObject(...),
    colors: strictObject(...),
    controls: strictObject(...),
  }),
});

export const fieldSettingsSchemaByType = {
  text: strictFieldSettingsSchema(...),
  email: strictFieldSettingsSchema(...),
  select: strictFieldSettingsSchema(...),
  // every value in the domain-owned FormFieldType set, with common keys plus only
  // the settings meaningful for that type
} satisfies Record<FormFieldType, JsonSchema>;

export const formFieldSchema = {
  oneOf: FORM_FIELD_TYPE_VALUES.map((type) => strictObject({
    required: ["type", "label"],
    properties: {
      id: boundedOptionalString,
      type: { const: type },
      label: boundedString,
      name: boundedOptionalString,
      required: optionalBoolean,
      orderIndex: optionalBoundedInteger,
      settings: fieldSettingsSchemaByType[type],
    },
  })),
};

formCreateSchema = strictObject({... settings: formSettingsSchema});
formUpdateSchema = strictObject({... settings: formSettingsSchema});

formSubmissionSchema = strictObject({
  data: objectWithDynamicKeysAndJsonValueBounds,
  formNonce,
  captchaToken,
});

validateSubmission(data, resolvedFields) {
  reject every key not present in resolvedFields;
  normalize according to the matching field contract;
}
~~~

Do not maintain a route-local mirror of enums/defaults. The domain/service module owns
the supported keys and normalizers; formSchemas.ts composes or re-exports that contract.
Every newly accepted key must be consciously added and receive a round-trip test.
The discriminator belongs to the complete field object, not to `settings` alone: several
valid field types accept `{}` or overlapping optional keys, so a settings-only `oneOf`
would be ambiguous. Preserve the real `FormFieldInput` shape (`id`, `name`, `required`,
and `orderIndex` optional; `type` and `label` required). There is no `position` field.

## Security Contract

Existing public/internal Forms endpoints, auth, forms:write/forms.submit, CSRF, nonce,
captcha, and rate buckets do not change in this leaf. Every fixed request object is
reject-unknown before persistence. The intentionally dynamic submission data map is
bounded and then checked against server-resolved field names/types; unknown fields never
become persisted data. No normalizer is a substitute for route rejection.

## Error and compatibility contract

Unknown fixed keys produce the existing request-validation 400 error before any write.
Known invalid values keep stable form_invalid/form_field_invalid mapping. Read
normalizers remain non-destructive for valid legacy records; they may continue to
normalize historical missing fields, but write paths never silently drop an unknown key.
Submission data cannot set undeclared field names even though its JSON keys are dynamic.

## Regression-test shape

This leaf updates its four named suites before the source gate with a table-driven corpus
containing one unknown key at every
nested depth, supported full-document round trips, field-type-specific invalid keys,
dynamic submission keys accepted only when declared, and no-default/present-only
identity for unaffected documents. Update the existing route test that currently accepts
bare settings only when it represents a valid empty object.
For every field type, test the outer discriminator with `{}` settings, optional-field
omission, `orderIndex`, a key valid only for that type, a key owned by another type, and
one unknown key. Assert the real `PUT /forms/:id/fields` route returns 400 without writes
for a mismatched branch.

TASK-536-05-L01 may add cross-layer schema/security cases later but cannot re-baseline
these strict-write and round-trip assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/formSettings.test.ts \
  tests/vitest/forms/fileField.test.ts
set -a && source .env && set +a && bun test --timeout=15000 tests/integration/routes/forms.test.ts
~~~

Re-run a named failure alone before classifying it.

## Acceptance criteria

- Every fixed nested object is reject-unknown.
- Domain modules, not route modules, own supported keys and normalization.
- Dynamic submission data is still usable but cannot bypass field ownership.
- Valid legacy/no-override documents retain their intended normalized output.
