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
against the resolved form fields in the service. The post-audit correction also owns the
narrow current form-write-state projection and prevents unpublished runtime data from
minting a public nonce.

## Source ownership

This leaf is the only TASK-536 writer of:

- core/server/validation/formSchemas.ts;
- core/services/forms/formSettings.ts;
- core/services/forms/fieldSettings.ts;
- core/services/forms/validation.ts;
- core/services/forms/formRuntimeResolver.ts (the legacy-pattern public-projection filter
  plus the post-audit unpublished nonce/bot-projection correction); and
- core/services/forms/formsService.ts (the `setFormFields` pre-write assertion call plus
  the post-audit `getFormWriteState` narrow projection).

Keep the reusable schema builders in those existing owners. Do not create the optional
`core/services/forms/formDocumentSchemas.ts` or any other production helper file; the
fixed file list above is exhaustive under YAGNI except for the one post-audit seam below.

The TASK-536 post-audit adds exactly one existing service seam to this leaf's ownership:
`core/services/forms/formAttachment.ts` may be changed only so optional magic-named File
fields are read from normalized submission data with an own-property guard. The matching
DB-backed absent/present regressions belong to
`tests/unit/forms/fileSubmission.test.ts`. This exception does not authorize a new
schema/helper/module, a media-service change, or any widget/editor work.

The final security audit adds a second bounded post-audit seam in the two already-owned
Forms files above. `formsService.ts` exports only a minimal `{ status,
submissionAccess }` state projection for L01's late server-side revalidation;
`formRuntimeResolver.ts` returns neither nonce nor bot-protection projection whenever a
form is draft/archived, including preview (preview may still project fields). No endpoint,
DB column, editor behavior, or new
module is added. This L02 correction lands before the reopened L01 executor patch.

The final schema-integrity audit keeps `core/services/forms/validation.ts` in this leaf
for a second bounded correction: both domain AJV validators must evaluate only own
properties; domain normalization accepts only ordinary or null-prototype records and
must not consume values inherited from a custom prototype; and a media-reference object
must have exactly one own data property, `id`. The shared route AJV and unrelated domain
validators remain out of scope because this finding is the direct Forms
service/orchestrator boundary.

It owns compatibility/changed-behavior updates in the six Vitest/Bun files named by its
gate before validation, including the post-audit DB suite. It must not edit routes,
publicFormsApi.ts, `core/widgets/**`, `core/admin/**`, editor source, runtime client
scripts, registries, presets, tests other than those six, docs, task indexes, or changelog
files. The narrow `formRuntimeResolver.ts` seam filters
legacy data before the existing renderer receives it; it does not add or expand a widget,
section, block, editor, preset, or dashboard surface.

## Grounded schema inventory

Cover create/update form settings, automation retry settings, theme and its actual
`layout`, `surface`, `typography`, `input`, and `submit` groups, field records, field
settings per field type, conditional logic, visual style, accept arrays, option arrays,
submission values, and upload envelope metadata. Each fixed object declares
`additionalProperties:false` and the exact bounds below. Preserve the existing
field-type discriminants and normalization clamps.

### Exact limits and fixed Form objects

Domain owners export constants; route schemas import them and never repeat literals.

- Form strings: name is `1..200`; slug is `null` or `0..200`, preserving the existing
  service behavior in which `null`, empty, or whitespace-only slug derives from the form
  name. Description is `null` or `0..10000`; success message is `null` or `0..2000`;
  redirect URL is `null` or `0..2048`. The write schema accepts both `null` and `""`, but
  it does not redefine persistence normalization: existing service behavior canonicalizes
  empty or whitespace-only description, success message, and redirect URL to `null`, while
  empty or whitespace-only slug derives from the form name. Non-empty authored strings
  retain their existing trim/normalization behavior.
- Form settings keys are exactly `layoutMode`, `saveProgress`, `stepTitles`, `preset`,
  `automationRetry`, and optional present-only `theme`.
- `layoutMode`: `single|multi_step`; `preset`:
  `custom|contact|lead_capture|service_intake`; `stepTitles`: at most 10 strings of
  `1..240` characters.
- `automationRetry`: optional strict keys `enabled`, `maxAttempts` integer `1..5`,
  `baseDelayMs` integer `50..5000`, `maxDelayMs` integer `100..20000`; the domain
  continues to enforce `maxDelayMs >= baseDelayMs`.
- Theme `layout`: `width sm|md|lg|xl|full`, `align left|center|right`, `fieldGap
  sm|md|lg`, `columns 1|2`, `buttonAlignment left|center|right|full`.
- Theme `surface`: `card` boolean; color strings `background`/`borderColor` max 128;
  `borderWidth none|sm|md`, `radius none|sm|md|lg|xl`, `padding sm|md|lg|xl`,
  `shadow none|soft|sm|md|lg`.
- Theme `typography`: `titleSize sm|md|lg|xl`, `titleWeight
  normal|medium|semibold|bold`, color strings `titleColor`/`labelColor`/`helperColor`
  max 128, `fontFamily display|inherit|sans|serif|mono`.
- Theme `input`: `size sm|md|lg`, the same radius enum, and max-128 color strings
  `borderColor`/`background`/`textColor`.
- Theme `submit`: max-128 `background`/`textColor`, the radius enum, `fullWidth`
  boolean, and label `1..240`.
- Create requires `name`; update has `minProperties:1`. Every remaining supported
  top-level key is optional and the existing status/access enums remain imported from
  their domain owners. `submissionAccess` imports L01's runtime
  `SUBMISSION_ACCESS_MODE_VALUES`; no route-local `public|internal` mirror remains.

### Exact field branches

The fields array has `maxItems:100`. Each branch requires `type` and label `1..240`;
optional id must exactly match the canonical UUID structure
`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` case-insensitively,
then normalize to lowercase before duplicate detection and persistence because PostgreSQL
returns UUIDs in canonical lowercase form. A lower/upper spelling of the same UUID is one
identity and must fail the domain duplicate check rather than reaching the database; name is
`1..120`, required is boolean, and orderIndex is integer `0..9999`. The complete discriminant list is `text`, `email`, `select`, `radio`,
`number`, `time`, `range`, `rating`, `hidden`, `checkbox`, `textarea`, `phone`, `file`,
and `date`.

When `name` is omitted, the domain normalizer derives the existing lowercase ASCII
underscore form from `label`, deterministically truncates that derived value to 120
characters, removes any underscore exposed at the truncated tail, and then applies the
existing `field_${index + 1}` fallback. It never silently suffixes a collision: the
existing normalized-name duplicate check remains authoritative. This keeps every
schema-valid field addressable by the 120-character submission/upload key contract.

Every branch may carry `formStep` and legacy `step` integers `1..10`, strict `logic`,
strict `style`, and the currently normalized/authorable compatibility keys
`placeholder`, `helper`, `pattern`, and string `defaultValue`. Optional
placeholder/helper/default strings are `0..2000`; an empty value is intentionally
accepted because the current admin editor emits it while adding or clearing controls and
the domain normalizer omits it. Optional pattern is `0..256`; an empty pattern is likewise
omitted, while every non-empty pattern passes the safe-pattern validator. Checkbox keeps
the existing `boolean | string` compatibility union (the admin authors booleans); this
leaf does not silently migrate legacy string defaults. Hidden is the one
exception: its settings object and a nonblank `defaultValue` of `1..2000` are required.

`logic` is a discriminator: `always` has only required `operator`;
`equals|not_equals|contains|not_contains` additionally require field `1..120` and value
`1..2000`; `exists|not_exists` require field and forbid value. `style` permits only
`width full|half` and `labelPosition above|inline|hidden`.

| Field type | Type-specific settings in addition to the common compatibility keys |
|---|---|
| text, email, phone, date, textarea | none |
| select, radio | options max 100 × `1..2000`; a non-empty default must belong to normalized options |
| checkbox | boolean or compatibility string defaultValue |
| number | finite min/max `-10^12..10^12`; inputStep `>0..10^12` |
| time | a non-empty default must be `HH:MM`; inputStep `>0..10^12` |
| range | finite min/max `-10^12..10^12`; inputStep `>0..10^12` |
| rating | integer max `3..10`; no min |
| hidden | required settings with required nonblank defaultValue `1..2000` |
| file | accept max 32 MIME tokens (`1..127`); integer maxSizeMb `1..100`; multiple boolean |

Numeric branches retain the domain cross-check `max >= min`; select/radio options retain
trim/dedupe and their default must be one of the normalized options when present. MIME
tokens at the pre-normalized schema boundary accept ASCII uppercase/lowercase in the same
shape, then the domain owner trims/lowercases/dedupes and requires the canonical
`^[a-z0-9.+-]+/[a-z0-9.*+-]+$` result. The safe
pattern owner in `validation.ts` rejects controls, invalid syntax, lookarounds/inline
groups, backreferences, and quantified groups/nested quantifiers; the 256-character cap
alone is not claimed as ReDoS protection. Add accepted-simple and catastrophic-pattern
regressions.

### Submission and upload bounds

Submission data has at most 100 properties; property names are `1..120`. Values are
only null, boolean, finite number within `±10^12`, string max 20000, a strict `{id}`
UUID object, or an array of at most 20 UUID strings/strict `{id}` objects. Arbitrary
nested JSON is rejected. Field-resolved service validation remains authoritative.
`formNonce` is `1..1024`; `captchaToken` is `1..4096`.

Upload metadata uses fieldName `1..120`, the same nonce/captcha bounds, and an opaque
object only for the runtime-checked File. Duplicate multipart fixed keys reject in L01.
L01's raw transport caps run before these schema budgets.

## Implementation Pseudocode

~~~ts
export const formSettingsSchema = strictObject({
  layoutMode, saveProgress, stepTitles, preset,
  automationRetry: strictObject({ enabled, maxAttempts, baseDelayMs, maxDelayMs }),
  theme: strictObject({
    layout: strictObject({ width, align, fieldGap, columns, buttonAlignment }),
    surface: strictObject({ card, background, borderColor, borderWidth, radius,
      padding, shadow }),
    typography: strictObject({ titleSize, titleWeight, titleColor, labelColor,
      helperColor, fontFamily }),
    input: strictObject({ size, radius, borderColor, background, textColor }),
    submit: strictObject({ background, textColor, radius, fullWidth, label }),
  }),
});

const common = {
  placeholder: optionalEmptyAuthoringText,
  helper: optionalEmptyAuthoringText,
  pattern: optionalEmptySafePattern,
  defaultValue: optionalEmptyAuthoringText,
  formStep, step, logic: formFieldLogicSchema, style: formFieldStyleSchema,
};
export const fieldSettingsSchemaByType = {
  text: strictObject({ ...common }),
  email: strictObject({ ...common }),
  select: strictObject({ ...common, options }),
  radio: strictObject({ ...common, options }),
  number: strictObject({ ...common, min, max, inputStep }),
  time: strictObject({ ...common, defaultValue: emptyOrHhmm, inputStep }),
  range: strictObject({ ...common, min, max, inputStep }),
  rating: strictObject({ ...common, max: ratingMax }),
  hidden: strictObject({ ...common, defaultValue: requiredText },
    { required: ["defaultValue"] }),
  checkbox: strictObject({ ...common,
    defaultValue: { oneOf: [boolean, optionalEmptyAuthoringText] } }),
  textarea: strictObject({ ...common }),
  phone: strictObject({ ...common }),
  file: strictObject({ ...common, accept, maxSizeMb, multiple }),
  date: strictObject({ ...common }),
} satisfies Record<FormFieldType, JsonSchema>;

function compileSafeFormFieldPattern(pattern, failureCode) {
  enforce the shared 256-character/control/lookaround/inline-group/backreference/
    quantified-group/nested-quantifier policy before constructing RegExp;
  compile only after that guard; map syntax/policy failure to failureCode;
  return the compiled RegExp;
}

export function isSafeFormFieldPattern(pattern) {
  return the same non-throwing policy predicate used by compileSafeFormFieldPattern;
}

export const formFieldSchema = {
  oneOf: FORM_FIELD_TYPE_VALUES.map((type) => strictObject({
    id: optionalExactUuidString,
    type: { const: type },
    label: boundedString,
    name: boundedOptionalString,
    required: optionalBoolean,
    orderIndex: optionalBoundedInteger,
    settings: fieldSettingsSchemaByType[type],
  }, {
    required: type === "hidden" ? ["type", "label", "settings"] : ["type", "label"],
  })),
};

export const formFieldsWriteSchema = {
  type: "array", maxItems: 100, items: formFieldSchema,
};

isPlainFormDataRecord(value) {
  if value is not a non-array object: return false;
  read its prototype defensively; accept only Object.prototype or null;
  inspect own property descriptors without invoking accessors;
  reject symbol keys and accessor-backed values before any normalizer read;
}

clonePlainFormData(value, profile, state) {
  FIELD_PROFILE = { maxDepth: 3, maxArrayItems: 100,
    maxRecordProperties: 100, maxNodes: 501 };
  SUBMISSION_PROFILE = { maxDepth: 2, maxArrayItems: 20,
    maxRecordProperties: 100, maxNodes: 2101 };
  // Root object/array depth is 0. Each nested object/array increments depth; primitives
  // consume neither depth nor nodes. Charge one node only the first time an object/array
  // is seen in this preflight. Active-path reuse is a cycle failure; completed WeakMap
  // reuse consumes no additional node and returns the already-completed snapshot.
  // 501 = root field array + 100 * (field + settings + logic + style + one options/accept
  // array). 2101 = submission root + 100 * (one array + 20 media-id objects).
  before Reflect.ownKeys or allocation, read/validate an array's own length descriptor and
    reject values beyond profile.maxArrayItems; snapshot record keys once and reject more
    than profile.maxRecordProperties;
  decrement the total node budget and reject depth max+1 as the existing domain error;
  keep an active-path WeakSet for cycles and a completed WeakMap so a shared subtree is
    cloned once rather than amplified; return descriptor-safe ordinary/null-prototype
    snapshots only;
  // Arbitrary Proxy meta-traps cannot be made side-effect-free in JavaScript. Proxy input
  // is not supported JSON; catch reflection failures and fail closed. The guaranteed
  // invariant is that rejected own-property accessor getters are never invoked.
}

compileDomainValidator(schema) {
  return new Ajv({ strict: true, allErrors: true, strictTypes: false,
    allowUnionTypes: true, ownProperties: true }).compile(schema);
}

assertFormFieldsWriteShape(fields) {
  snapshotFormFieldsWriteShape(fields); // compatibility assertion wrapper
}

snapshotFormFieldsWriteShape(fields) {
  snapshot = clonePlainFormData(fields, FIELD_PROFILE, freshState);
  if snapshot fails: throw form_field_invalid, including revoked record/array Proxies;
  lazily compile the domain-owned formFieldsWriteSchema with Bun-free Ajv configured
    with ownProperties:true;
  run AJV only on snapshot and reject every structural/type/bound/unknown-key violation
    as form_field_invalid;
  return the validated, caller-detached snapshot;
  // Keep this pure and side-effect free; direct normalizer-only compatibility tests do
  // not become persistence authorization.
}

normalizeFormFields(fields) {
  snapshot = clonePlainFormData(fields, FIELD_PROFILE, freshState);
  if snapshot fails: throw form_field_invalid;
  normalize only snapshot, including each field and authored settings/logic/style; never
    read the caller object after preflight;
  normalize each snapshot UUID to lowercase before seenIds duplicate detection;
  preserve existing direct-normalizer compatibility (including intended clamps and
    lowercase/dedupe behavior) plus existing named domain errors;
  compile every non-empty authored pattern through compileSafeFormFieldPattern with
    form_field_invalid before returning normalized settings;
}

setFormFields(formId, fields) {
  validatedSnapshot = snapshotFormFieldsWriteShape(fields) synchronously before getForm;
  await getForm without retaining any later read from the caller-owned fields;
  normalized = normalizeFormFields(validatedSnapshot);
  persist normalized fields transactionally as today;
  // Mandatory for direct writers such as assistant -> setFormFields that do not traverse
  // the HTTP route validator.
}

validateSubmissionPayload(data, resolvedFields) {
  snapshot = clonePlainFormData(data, SUBMISSION_PROFILE, freshState);
  if snapshot fails: throw form_payload_invalid;
  run the own-properties-only submission AJV, every field lookup, conditional check, and
    media-reference normalization only against snapshot;
  for every single/array media-reference object in snapshot, require an ordinary or
    null-prototype record, then use Reflect.ownKeys plus its property descriptor and
    accept exactly one enumerable own data property named id; inherited/accessor/extra
    keys or a custom prototype fail as form_payload_invalid without invoking accessors;
  before testing any stored/legacy pattern, pass it through the same
    compileSafeFormFieldPattern with form_payload_invalid; never call `new RegExp` directly
    on DB settings, so a legacy catastrophic pattern fails closed at runtime;
}

resolveFormRuntimeData(formId, options) {
  resolve the existing form and fields as today;
  if status is not published:
    force submissionNonce=null and botProtection=null;
    if !options.preview:
      return the existing form_unpublished noninteractive resolution with no fields;
    // Preview may still project fields for visual authoring, but never write capability.
  before returning the public/preview field projection, preserve a pattern only when
    isSafeFormFieldPattern(pattern) is true; omit an unsafe legacy stored pattern;
  never mutate or rewrite the stored field and never add renderer/editor behavior;
}

getFormWriteState(formId) {
  select only forms.status and forms.submissionAccess for the exact id;
  return null for missing or non-canonical persisted values;
  otherwise return an immutable exact FormStatus + SubmissionAccessMode projection;
  // This is not an access/auth decision and never falls back an invalid stored mode.
}

formCreateSchema = strictObject({ name, slug, status, description, successMessage,
  successRedirectUrl, submissionAccess, settings: formSettingsSchema },
  { required: ["name"] });
formUpdateSchema = strictObject({ name, slug, status, description, successMessage,
  successRedirectUrl, submissionAccess, settings: formSettingsSchema },
  { minProperties: 1 });

formSubmissionSchema = strictObject({
  data: boundedDeclaredFieldMap({ maxProperties: 100, keyMax: 120,
    stringMax: 20000, arrayMax: 20, maxDepth: 2 }),
  formNonce: boundedString(1, 1024),
  captchaToken: boundedString(1, 4096),
}, { required: ["data"] });

formAttachmentUploadSchema = strictObject({
  fieldName: boundedString(1, 120),
  file: opaqueRuntimeCheckedObject,
  formNonce: boundedString(1, 1024),
  captchaToken: boundedString(1, 4096),
}, { required: ["fieldName", "file"] });

validateSubmission(data, resolvedFields) {
  reject every key not present in resolvedFields;
  normalize according to the matching field contract;
}
~~~

Do not maintain a route-local mirror of enums/defaults. The domain/service module owns
the supported keys, the shared 120-character field-name limit, and normalizers;
formSchemas.ts composes or re-exports that contract.
Every newly accepted key must be consciously added and receive a round-trip test.
The discriminator belongs to the complete field object, not to `settings` alone: all
non-hidden field types accept `{}` or overlapping optional keys, while hidden requires
`settings.defaultValue`; a settings-only `oneOf` would therefore be ambiguous. Preserve
the real `FormFieldInput` shape (`id`, `name`, `required`, and `orderIndex` optional;
`type` and `label` required, with the explicit hidden-settings invariant). There is no
`position` field.

`FORM_FIELD_TYPE_VALUES`, schema-limit constants, logic/style schemas, and the per-type
settings map are exported from their existing domain owners. `validation.ts` owns the
complete `formFieldsWriteSchema` and its pure assertion;
`formsService.setFormFields` invokes that assertion at the domain write boundary;
`formSchemas.ts` re-exports that exact object as `formFieldsSchema` and composes the other
domain exports. Do not use placeholder spreads, invent `colors`/`controls` theme groups,
or repeat a literal enum/bound in the route module.

## Security Contract

Existing public/internal Forms endpoints, auth, forms:write/forms.submit, CSRF, nonce,
captcha, and rate buckets do not change in this leaf. Every fixed request object is
reject-unknown before persistence. The intentionally dynamic submission data map is
bounded and then checked against server-resolved field names/types; unknown fields never
become persisted data. No normalizer is a substitute for route rejection.
An unpublished public runtime returns no nonce or captcha projection, including preview.
Preview may still receive fields for visual authoring but has no public-write capability. The
narrow state projection is backend-only and contains no settings, fields, secrets, or
principal data; L01 uses it after its single full access-target load to fail closed on
unpublish/access-mode drift.
The domain-owned `formFieldsWriteSchema` is additionally enforced by
`setFormFields` before DB access so direct trusted orchestrators such as the assistant cannot bypass
the same fixed field/settings shape; this defense-in-depth does not turn the normalizer
into a route error mapper.

## Error and compatibility contract

Unknown fixed keys and schema-level required/type/enum/bound violations produce the
existing `validation_error`/400 before any write, including an unknown field type,
an invalid supplied field UUID, missing hidden settings/default, invalid schema-bounded time/default shapes, and numeric
bound violations. Post-schema domain semantic/cross-invariant failures retain their
existing named `form_invalid`/`form_field_invalid` mappings. Read normalizers remain
non-destructive for valid legacy records; they may continue to normalize historical
missing fields, but write paths never silently drop an unknown key. The one fail-closed
read-projection exception is an unsafe legacy field pattern: it remains unchanged in
storage but is omitted from public/preview runtime data before it can become an HTML
`pattern`. Safe legacy patterns remain byte-identical in that projection.
The same structural failure through direct `setFormFields` maps to
`form_field_invalid` before DB access; only the HTTP route layer emits
`validation_error`/400.
Submission data cannot set undeclared field names even though its JSON keys are dynamic.
L01 already rejects unknown raw explicit-envelope keys before normalization; this leaf
owns the strict normalized envelope and must not weaken that transport guard.

## Regression-test shape

This leaf updates its six named suites before the source gate with a table-driven corpus
containing one unknown key at every
nested depth, supported full-document round trips, field-type-specific invalid keys,
dynamic submission keys accepted only when declared, and no-default/present-only
identity for unaffected documents. Update the existing route test that currently accepts
bare settings only when it represents a valid empty object.
For every non-hidden field type, test the outer discriminator with `{}` settings,
optional-field omission, a valid supplied UUID, `orderIndex`, a representative accepted common key, a foreign
key rejected by that branch, and one unknown key. Additionally table-drive every common
key (`placeholder`, `helper`, `pattern`, `defaultValue`, `formStep`, legacy `step`, `logic`,
and `style`) through every branch where the declared compatibility union permits it; do
not reduce this to one representative key. For every branch with type-specific keys, test
every accepted key, including all `accept`, `maxSizeMb`, and `multiple` file keys and the
shared-key pairs (`options` select/radio, `min|max` number/range, and `inputStep`
number/range/time), rather than claiming one representative covers the branch. Hidden must separately reject omitted settings,
`settings:{}`, and an empty default, then accept a nonblank default. Assert the real
`PUT /forms/:id/fields` route returns 400 without writes for a mismatched branch.
Through that same real route, reject a non-UUID, padded UUID, and overlong supplied field
id with `validation_error`/400 before delete/insert work, while omission still lets the
domain owner generate the id. An uppercase UUID must pass the case-insensitive schema and
round-trip in canonical lowercase; a lower/upper pair of the same UUID must fail as
`form_field_id_duplicate` before the transaction rather than reaching a PostgreSQL PK error.
Call `setFormFields` through a direct assistant-shaped/domain path with an invalid UUID,
unknown outer field key, and unknown nested settings key; each must fail
`form_field_invalid` before delete/insert work, proving route validation is not the only
write boundary.
Create a field with an omitted name and a label whose normalized form exceeds 120
characters; prove the persisted/returned derived name is deterministically capped at 120
and can be used by both strict submission and upload metadata schemas. Two omitted names
whose normalized labels share the same first 120 characters must retain the existing
duplicate-name failure rather than receiving implicit suffixes.
Include a label whose normalized character 120 is `_` and later characters are non-empty;
prove truncation removes that newly exposed trailing underscore deterministically.
Pin the current admin payload shape: an empty optional placeholder/helper/pattern is
accepted then omitted by normalization; select placeholder and helper/pattern on every
field type round-trip; checkbox boolean and legacy string defaults retain their existing
compatibility. Add `null`, empty, max, and max+1 cases for description, successMessage,
and successRedirectUrl, pinning existing service canonicalization of empty/whitespace to
`null` rather than claiming empty-string persistence. Exercise create and update with
slug `null`, empty/whitespace, non-empty, max, and max+1 through the real schema/route and
prove null/empty derive rather than fail validation.
Add max/max+1 cases for every string/array/property budget, all retry/step/numeric
boundaries and cross-invariants, the bounded submission value union/depth, safe versus
catastrophic regex patterns, update `minProperties`, nonce/captcha lengths, and upload
metadata limits.
Construct a legacy resolved field directly with a catastrophic stored pattern and pass it
to submission validation; it must return `form_payload_invalid` before unsafe regex
evaluation. Resolve that same legacy field through `resolveFormRuntimeData` and prove the
unsafe pattern is absent from the returned public/preview field settings, while a safe
legacy pattern remains unchanged; no widget or editor source may change. Add a real
schema/PUT case where uppercase MIME input such as `IMAGE/PNG`
passes the pre-normalized write boundary and returns lowercase normalized MIME; do not
cover this only through a direct domain normalizer.
Table-drive public draft and archived non-preview runtime resolutions: both retain the
existing `form_unpublished` boundary but return `submissionNonce=null` and
`botProtection=null`. Explicit preview for both statuses still projects fields without an
error but also returns no nonce/bot projection; published public behavior remains
unchanged. Pin `getFormWriteState` to the exact two-key immutable projection and
fail-closed null for missing/invalid stored status or submission access.
The normalized submission-envelope corpus must reject a missing `data` member.
The upload-envelope corpus must reject missing `fieldName` and missing `file` before the
runtime File guard.
Pass custom-prototype field records whose required or optional keys are inherited through
both `assertFormFieldsWriteShape` and `normalizeFormFields`; each must fail closed rather
than materialize inherited data. Pass single and multiple File values whose `{ id }` is
inherited, accessor-backed, or accompanied by another own key; each must fail as
`form_payload_invalid`. Preserve acceptance and round-trip identity for exact own `id`
objects and the existing own `__proto__`, `toString`, and `constructor` field names.
Count getter calls and prove zero for rejected field, settings, logic, style, top-level
submission-data, and media-id accessors. Reject a custom-prototype media object even when
it has an own valid `id`; positively prove ordinary and null-prototype field/settings,
submission-data, and exact media-id records retain their supported normalized output.
Pin each preflight profile at depth max and max+1, maximum and maximum+1 dense array/key
counts, cyclic and noncyclic shared subtrees, and total-node budget exhaustion. Every
over-budget case must return `form_field_invalid` or `form_payload_invalid`, never
`RangeError`, and index/accessor getter counts remain zero. A sparse huge-length array
must fail from its length descriptor before key enumeration/index work.
Build and accept the exact worst-case valid 501-node field document and 2101-node
submission document, then add the first unique node to each and require the matching
domain error. Reusing an already completed shared subtree must count it once.
Through real `setFormFields`, mutate the caller-owned array/field immediately after the
function reaches its first await; persistence must use the earlier validated snapshot,
not the mutated value. Pin existing missing-form/error precedence. Revoke record and
array Proxies before direct assertion/normalization/media-reference calls and require
`form_field_invalid`, `form_payload_invalid`, or `null` rather than raw `TypeError`.
Pin representative response codes from both layers: schema-level unknown/type/bound/
required failures return `validation_error`/400, while a value that passes schema shape
but fails a domain cross-invariant retains the appropriate named form error.

TASK-536-05-L01 may add cross-layer schema/security cases later but cannot re-baseline
these strict-write and round-trip assertions.

## Validation

~~~bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/forms/validation.test.ts \
  tests/vitest/forms/formSettings.test.ts \
  tests/vitest/forms/fileField.test.ts \
  tests/vitest/forms/formRuntimeResolver.test.ts
set -a && source .env && set +a && bun test --timeout=15000 tests/integration/routes/forms.test.ts
set -a && source .env && set +a && bun test --timeout=15000 tests/unit/forms/fileSubmission.test.ts
~~~

Re-run a named failure alone before classifying it.

## Acceptance criteria

- Every fixed nested object is reject-unknown.
- Domain modules, not route modules, own supported keys and normalization.
- Dynamic submission data is still usable but cannot bypass field ownership.
- Valid legacy/no-override documents retain their intended normalized output; unsafe
  legacy patterns are omitted only from runtime projection and never rewritten in storage.
- Draft/archived forms, including preview, mint no public write nonce; the server can revalidate
  only the current canonical status/access projection without loading settings or fields.
- No widget, section, block, editor, registry, preset, or dashboard surface is added or
  expanded.
