# TASK-547-03-L03: Contact Form, Action and Generator Tests
# FileName: TASK-547-03-L03-Contact-Form-Action-And-Generator-Tests.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Forms / Reference Example
**Estimated Effort:** Large
**Dependencies:** TASK-547-03-L01, TASK-547-03-L02
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — the installed native Form exists, but its public
fields, supporting note and success copy must be corrected to the designated
reference and the aggregate must preserve the corrected SEO/content slices.

## Overview

Own the real `project-brief` Form seed, its ordered native fields, safe
`success_message` action, present-only submit supporting text and the canonical
TASK-547-03 aggregate. The form uses the production Forms pipeline; the static
prototype's fake click handler is only the source of public success copy, never
the implementation mechanism. The prototype's post-submit note becomes one
strict native Forms theme field so CMS authors can persist, edit, preview and
render that placement without a one-off Page workaround.

## Exact Ownership

This leaf is the sole writer for:

- `scripts/projekty-domow/content/projectForm.ts`;
- `scripts/projekty-domow/content/buildFormaDomContentResources.ts`;
- `tests/vitest/kits/projekty-domow-form-and-slice.test.ts`;
- `core/services/forms/formSettings.ts`;
- `core/services/forms/formTheme.ts`;
- `core/widgets/core/formEmbed.tsx`;
- new `core/widgets/core/formEmbedContract.ts`;
- new `core/widgets/core/formEmbedFields.tsx`;
- `core/admin/ui/forms/FormDesignPanel.tsx`;
- `core/admin/ui/forms/FormCanvas.tsx`;
- `core/admin/ui/forms/FormRuntimePreviewDialog.tsx`;
- new `tests/vitest/forms/formSupportingText.test.ts`;
- new `tests/vitest/ui-integration/form-supporting-text.test.tsx`;
- new `tests/unit/forms/formSupportingTextPersistence.test.ts`;
- new `tests/integration/routes/formSupportingTextRoutes.test.ts`.

This leaf alone exports `buildFormaDomContentResources`. L01/L02 must not edit or
duplicate the aggregate. TASK-547-07 derives the live path count from its
ownership map; a separately pinned expected-count value is an integrity
assertion that its owner must update whenever the map changes, not an
alternative source of path ownership.

The generic Forms files are the smallest verified end-to-end path: settings owns
the strict persisted key, theme resolves it without a default, the design panel
authors and clears it, canvas/runtime preview expose authoring parity, and Form
Embed owns public SSR placement. The two new Form Embed modules preserve the
required cohesive split of the pre-split 1,922-line `formEmbed.tsx`:
contract/schema/normalization live in `formEmbedContract.ts`, while field DOM
allocation and field-control rendering live in `formEmbedFields.tsx`;
`formEmbed.tsx` remains the stable public entry and re-exports every pre-existing
public contract symbol. All three files must finish at or below 1,000 physical
lines.

These paths remain explicitly read-only: `core/widgets/core/formRuntimeScript.ts`
already implements `show-message-keep-form`, and the over-limit
`tests/vitest/widgets/formEmbed.test.tsx` must not receive more lines. Existing
`FormBuilderPage` group-replace plumbing and `formsClient` normalization already
transport the shared settings contract and require no production edit. The
focused new Bun route test may exercise route registration/schema/error mapping
but must not edit route or service production modules. TASK-547-04, not this
leaf, owns the Page Form block props and `pageRendererV2` mapping.

This is not a new widget authoring surface: do not add a widget type, preset,
Wizard/Visual/Advanced editor control, module-pack entry or public endpoint.
Native Form Design is the authoring owner; the existing Form Embed remains only
its Page/runtime rendering consumer.

## Exact Public Form Contract

Source: the TASK-547-07 hash-verified read-only files
`/home/coder/project/Coderso/_docs/projekty-domow-wow-site/kontakt.html:40,48-61`
and `assets/app.js:102-107` under the same exact reference root.

`projectForm.ts` owns and exports exact constants for Page/form consumers:

```ts
export const PROJECT_BRIEF_FORM_KEY = "project-brief";
export const PROJECT_BRIEF_FORM_TITLE = "Zacznij projekt";
export const PROJECT_BRIEF_SUBMIT_LABEL = "Wyślij brief";
export const PROJECT_BRIEF_INITIAL_NOTE =
  "Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.";
export const PROJECT_BRIEF_SUCCESS_MESSAGE =
  "Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom — do usłyszenia.";
export const PROJECT_BRIEF_LOADING_LABEL = "Wysyłanie...";
```

The ordered native fields are:

| Order | Name | Type | Exact label | Exact settings | Requiredness |
| ---: | --- | --- | --- | --- | --- |
| 0 | `name` | `text` | `Imię i nazwisko` | placeholder `Jan Kowalski` | required production validation |
| 1 | `email` | `email` | `E-mail` | placeholder `jan@email.pl` | required production validation |
| 2 | `stage` | `select` | `Na jakim jesteś etapie?` | options listed below | required production validation |
| 3 | `message` | `textarea` | `Krótki opis` | placeholder listed below | required production validation |
| 4 | `consent` | `checkbox` | `Zgoda na kontakt w sprawie zapytania` | default `false` | required native privacy addition |

The `stage` options are exact and ordered:

1. `Mam działkę`;
2. `Szukam działki`;
3. `Mam gotowy projekt do adaptacji`;
4. `Chcę tylko konsultację`.

The message placeholder is exactly:
`Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl lubisz.`

There is no blank/placeholder option in the designated reference. The rendered
select contains exactly those four options; `Mam działkę` is its initial native
selection. The seeded stage settings contain the exact options and no
`placeholder` or `defaultValue` own key. A forged missing or blank submission
still fails required-field validation. The textarea has exactly `rows="5"`.
The loading literal above is a bounded native localization addition; it does not
claim to be prototype copy. The reference defines no error copy. Existing safe,
code-specific Forms runtime errors remain unchanged native security behavior,
with no reference-parity or extra-residual claim.

Required field validation and the consent field are explicit native production
additions; they do not authorize altered labels or a claim that the static fake
form already implemented those protections. Form `desired.description` is
exactly `null`: native Form Embed renders a present description before the
fields, but `kontakt.html:60-61` places the note after the submit button. L03
owns and exports exact `PROJECT_BRIEF_INITIAL_NOTE` and persists it only as
`settings.theme.submit.supportingText`. The contact Page adds no sibling note or
text block. The Form theme alone owns its present
`label:PROJECT_BRIEF_SUBMIT_LABEL`; the TASK-547-04 contact Form block does not
override `submitLabel`, so Form Embed inherits the exact native label. The Page
imports `PROJECT_BRIEF_FORM_TITLE` and `PROJECT_BRIEF_LOADING_LABEL` for its
required visible Form block props; it does not import the note for rendering.

## Native Submit Supporting-Text Contract

The shared persisted type gains exactly:

```ts
export type FormFormTheme = {
  // existing groups stay unchanged
  submit?: {
    // existing keys stay unchanged
    supportingText?: string;
  };
};
```

The property is strict and present-only:

- key: exactly `FormFormTheme.submit.supportingText`;
- value: string, trimmed by the normalizer, non-empty after trimming and at most
  `FORM_SCHEMA_LIMITS.submitSupportingText === 2_000` characters;
- the strict Form create/update settings schema allowlists the key, rejects
  empty/whitespace-only, oversized and unknown sibling/nested properties;
- before this leaf implements the seed, TASK-547-02-L02 must extend
  `assertFormNestedContract` to admit this exact key and strictly reject blank,
  2,001-character, wrong-type and unknown submit keys, importing
  `FORM_SCHEMA_LIMITS.submitSupportingText` from the Forms domain owner instead
  of duplicating `2_000`; adapter preflight must reject rather than rely on
  fail-soft normalization;
- the defensive normalizer omits blank or oversized input without truncating it;
- `getDefaultFormSettings()`, absent-theme normalization,
  `FORM_THEME_DEFAULTS`, `formEmbedDefaults` and legacy Form documents seed no
  supporting text; resolving an absent value returns `undefined` and does not
  add an own `supportingText` property;
- normalizing, resolving, saving or rendering an unauthored legacy document is
  byte-identical to the pre-key contract and emits no supporting-text DOM node;
- `FormDesignPanel` provides one `Textarea` under Submit with exact
  `aria-label="Submit supporting text"`,
  `data-form-theme-control="submit.supportingText"` and
  `maxLength={FORM_SCHEMA_LIMITS.submitSupportingText}` imported from the
  domain owner, never a duplicated `2_000` UI literal.
  Typing non-blank copy emits a complete submit-group replacement; its exact
  `aria-label="Reset submit supporting text"` reset/clear control deletes only
  `supportingText`, preserves sibling submit keys and emits an undefined group
  only when it was the group's last key;
- `FormCanvas` and `FormRuntimePreviewDialog` render the normalized resolved
  copy exactly once immediately after their submit-control row, using the
  existing helper-text visual treatment;
- public Form Embed renders the supporting text immediately after the
  submit-control wrapper, still inside
  `<div data-form-embed-form-body="true">`; it renders no supporting-text node
  when the key is absent;
- for `show-message-keep-form` plus authored supporting text, that one paragraph
  is the existing `data-form-embed-success="true"` target as well as
  `data-form-submit-supporting-text="true"`. It initially contains the note;
  the unchanged runtime writes the success message into the same node and keeps
  the body/controls visible. It is the sole `aria-live="polite"` target and has
  no `role="alert"` before or after mutation, so the static initial note is not
  exposed as an alert;
- for every non-combined case, including keep-form without authored supporting
  text and the other success behaviors, preserve the legacy separate hidden
  success target with `role="alert" aria-live="polite"` outside the body so
  hide-form/reset behavior does not regress. No second success target is emitted
  in any one form and `formRuntimeScript.ts` remains read-only.

## Present-Only Form Embed Presentation Contract

L03 also adds the smallest generic Form Embed presentation seam needed for the
reference without changing the persisted Form resource:

```ts
export const FORM_EMBED_TEXTAREA_ROWS_LIMITS = {
  min: 2,
  max: 20,
  legacyDefault: 4,
} as const;
export const FORM_EMBED_LOADING_LABEL_MAX_LENGTH = 1_000;
export const FORM_EMBED_SUCCESS_BEHAVIORS = [
  "show-message-hide-form",
  "show-message-reset-form",
  "show-message-keep-form",
] as const;

export type FormEmbedFields = {
  showLabels?: boolean;
  showRequiredIndicator?: boolean;
  textareaRows?: number;
  showSelectPrompt?: boolean;
};

export type FormEmbedSubmitBehavior = {
  loadingLabel?: string;
  successBehavior?: (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number];
};
```

`textareaRows` is an integer from 2 through 20. `showSelectPrompt` is boolean.
`loadingLabel` is a trimmed, non-empty string at most
`FORM_EMBED_LOADING_LABEL_MAX_LENGTH === 1_000` characters; its existing schema
and normalizer now consume that owner constant, and invalid input resolves to
the unchanged existing pending-label fallback. Only the two new field keys
`textareaRows` and `showSelectPrompt` are present-only:
`formEmbedDefaults`, absent normalization and serialized legacy data do not gain
them. At render time an absent `textareaRows` retains four rows and absent
`showSelectPrompt` retains the legacy synthetic prompt.
`FORM_EMBED_SUCCESS_BEHAVIORS` centralizes the existing enum without changing
its default. These rules preserve legacy bytes and behavior.

Normalization and rendering stay separate so a resolved default never becomes
authored data:

```ts
function normalizeFormEmbedFields(value: FormEmbedFields | undefined): FormEmbedFields {
  return {
    showLabels: resolveExistingShowLabels(value?.showLabels),
    showRequiredIndicator: resolveExistingRequiredIndicator(
      value?.showRequiredIndicator
    ),
    ...(isTextareaRows(value?.textareaRows)
      ? { textareaRows: value.textareaRows }
      : {}),
    ...(typeof value?.showSelectPrompt === "boolean"
      ? { showSelectPrompt: value.showSelectPrompt }
      : {}),
  };
}

function resolveFormEmbedFieldPresentation(value?: FormEmbedFields) {
  return {
    textareaRows:
      value?.textareaRows ?? FORM_EMBED_TEXTAREA_ROWS_LIMITS.legacyDefault,
    showSelectPrompt: value?.showSelectPrompt ?? true,
  };
}
```

The strict schema rejects invalid authored values; the defensive normalizer
omits invalid new field keys rather than clamping or emitting defaults. The
renderer receives resolved presentation separately and never writes it back to
the document.

TASK-547-04-L01 exclusively authors the contact Page Form block props:

```ts
{
  title: PROJECT_BRIEF_FORM_TITLE,
  textareaRows: 5,
  showSelectPrompt: false,
  loadingLabel: PROJECT_BRIEF_LOADING_LABEL,
  successBehavior: "show-message-keep-form",
}
```

Its owned Page renderer mapping passes those present Page props to
`FormEmbedData.fields` and `FormEmbedData.submitBehavior`; its Page contract
strictly allowlists, normalizes and round-trips every consumed present-only
prop, importing `FORM_EMBED_TEXTAREA_ROWS_LIMITS` and
`FORM_EMBED_LOADING_LABEL_MAX_LENGTH` plus
`FORM_EMBED_SUCCESS_BEHAVIORS` from L03's domain owner instead of duplicating
bounds or enum values. L03 does not put any of them in `project-brief` Form
desired data and does not edit Page paths. With `showSelectPrompt:false`, a
configured select renders its substantive options only; the no-options disabled
state may retain its existing neutral diagnostic.

`core/widgets/core/formEmbed.tsx` remains the public import boundary for all
existing exports: `FormEmbedVariantId`, `FormEmbedLayout`, `FormEmbedStyle`,
`FormEmbedFields`, `FormEmbedNavigation`, `FormEmbedSubmitBehavior`,
`ResolvedFormField`, `FormEmbedResolvedData`, `FormEmbedData`,
`formEmbedThemeDefaultColorValues`, `isFormEmbedThemeDefaultStyleValue`,
`resolveFormEmbedSpacing`, `clampSavedProgressTtl`, `formEmbedSchema`,
`formEmbedDefaults`,
`resolveFormEmbedRuntimeErrorMessage`, `normalizeFormEmbedData`,
`FormEmbedBlock`, `formEmbedEditorContract` and `createFormEmbedWidget`.
It also re-exports new owners `FORM_EMBED_TEXTAREA_ROWS_LIMITS` and
`FORM_EMBED_LOADING_LABEL_MAX_LENGTH` plus
`FORM_EMBED_SUCCESS_BEHAVIORS`. Extraction may add internal exports, but no
existing consumer import path, runtime-script contract or rendered legacy markup
may change.

The Form resource `name` and TASK-547-04-L01 Page Form block `props.title` both
use `PROJECT_BRIEF_FORM_TITLE`. The title is public: the native Page renderer
resolves `block.props.title → binding.title → formName → "Form"`, and Form Embed
always renders that resolved heading. Therefore `Zacznij projekt`, copied from
`kontakt.html:40`, is required in both places; the resource name must not be
described or tested as admin-only. The resulting extra native heading is the
bounded difference recorded by `native-form-heading-approximated`; that residual
does not permit a blank/fallback heading or different public copy.

The Form seed has:

- `name:PROJECT_BRIEF_FORM_TITLE` (`Zacznij projekt`), matching the Page block;
- `description:null`; the initial note is not stored as Form description;
- `status:"published"` as target state (installer staging remains draft-first);
- `submissionAccess:"public"`;
- `successMessage:PROJECT_BRIEF_SUCCESS_MESSAGE`;
- normalized settings with present
  `theme.submit.label:PROJECT_BRIEF_SUBMIT_LABEL` and
  `theme.submit.supportingText:PROJECT_BRIEF_INITIAL_NOTE`;
- exactly the five fields above;
- exactly one enabled `success_message` action whose config message is the same
  exact success constant;
- no Form-level success-behavior, loading-label, textarea-row or
  select-prompt field; those are Page Form block presentation owned by
  TASK-547-04-L01;
- no form-level `enabled`, redirect, recipient, mail, webhook or secret config.

## Security Contract

- No new endpoint and no route production edit. Canonical
  `POST /admin/api/forms` and `PATCH /admin/api/forms/:id` are internal
  authenticated-admin-session writes. Both require `forms:write`, shared
  session CSRF, the `admin_write` bucket and strict
  `formCreateSchema`/`formUpdateSchema` reject-unknown validation. Expected
  domain failures map through the existing centralized Form error mapper.
- Canonical `PUT /admin/api/forms/:id/actions` is likewise internal,
  session-authenticated, `forms:write`, CSRF-protected and charged to
  `admin_write`; `formActionsUpdateSchema` strictly validates the sole seeded
  `success_message` action and maps known invalid action errors to
  `form_action_invalid`.
- Both `POST /forms/:id/submissions` and its stripped-admin alias
  `POST /admin/api/forms/:id/submissions` traverse the same mode-based executor.
  They preserve the shared `evaluateSubmissionAccess` decision on both mounts;
  an admin URL prefix never bypasses or reimplements it. For this published
  `submissionAccess:"public"` Form, an anonymous principal requires the signed
  nonce, `public_write`, no session CSRF and configured reCAPTCHA v3
  `public_write` policy. A coherent authenticated public session remains public:
  it still requires the nonce and `public_write`, requires no session CSRF, and
  has `requireCaptcha:false`. Its cookie changes only the evaluator's principal
  and CAPTCHA decision; it does not upgrade the request to internal/admin mode.
- A form configured `submissionAccess:"internal"` requires on either mount a
  coherent session with `forms:write` plus session CSRF, or an API key with exact
  scope `forms.submit`; it charges `admin_write` and rejects anonymous access.
- Consent is required and defaults false. Unknown form, settings, theme/submit,
  field and action properties fail closed. Supporting text is inert plain React
  text, never HTML, Markdown or script input; normal React escaping is preserved.
- No SMTP/webhook/CRM recipient or credential is packaged. Those remain
  explicit post-install operator configuration.
- Tests use fake data and DB-backed closure tests delete only their own scoped
  submission.

`tests/integration/routes/formSupportingTextRoutes.test.ts` is a focused Bun
registration/boundary suite. With fake handlers it proves the exact Form
create/update/action methods, real schema identity, unknown/blank/over-limit
supporting-text rejection, valid boundary acceptance, and mapped
`form_invalid`/`form_not_found` responses through exported `mapFormError`. It
must not restate mount-derived submission access; the existing read-only
`formsWriteMounts.test.ts` owns shared-executor public/internal mode parity.
Existing `formActionsContract` and `formActionsRoutes` suites retain strict
action-config and route-registration coverage. Existing public write security
suites remain read-only: `formsWriteMounts.test.ts` pins anonymous and coherent-
session public decisions on both aliases (same nonce/`public_write`/no-CSRF,
CAPTCHA true versus false) through the unmodified evaluator. TASK-547-06 reruns
their nonce, rate-plan, CSRF/API-key and CAPTCHA scenarios against the installed
Form.

## Aggregate Contract

`buildFormaDomContentResources` composes, without rebuilding or mutating:

- L01: one content type and six ordered entries;
- L02: one listing template, one listing query, one detail document and one
  `site.contentRoutes` setting;
- L03: one Form.

The resulting 12 seeds retain all exact `{key, desired}` snapshots and closed
refs. In particular, aggregation and the exported Page-consumer contract must
preserve:

- every entry's exact `seoDescription`;
- every entry's exact source-backed `cardHref`, including Aurora-only
  `/projekty/aurora` and five `/projekty` values;
- exact listing semantic `description`/`href` bindings, empty item actions and
  `{limit:24,offset:0}`, plus the exact authored Polish empty state with null CTA
  fields;
- neutral detail `titlePattern === "{{ title }}"`;
- detail `seo.titlePattern` equal to
  `{{ title }} — projekt pokazowy — FormaDom Studio`;
- detail `seo.descriptionField === "seoDescription"`;
- every Aurora-only detail binding remains required and has no fallback, so the
  aggregate cannot make non-Aurora detail public;
- absence of any detail related/listing-query dependency;
- null Form description plus the exact exported initial-note constant at the
  sole `settings.theme.submit.supportingText` placement;
- the exact submit label and success message;
- the exact visible Form resource title `Zacznij projekt` plus the exported
  Polish loading presentation literal used by the Page block.

TASK-547-04-L01 must assert that the contact Page contains no sibling block with
`PROJECT_BRIEF_INITIAL_NOTE`; the Form binding is the only Page-owned connection
to this note. It also owns present Page props `textareaRows:5`,
`showSelectPrompt:false`, the exact loading label and
`successBehavior:"show-message-keep-form"`. This cross-leaf assertion does not
transfer any TASK-547-04 file to L03.

The aggregate adds no ID, default, copy, status or fallback and never serializes
`undefined` through an ad hoc replacement. It may assert invariants and return
the child arrays in canonical resource-kind order.

## Implementation Pseudocode

```ts
// Relevant delta; all existing Form theme keys keep their current behavior.
function normalizeSubmitSupportingText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (
    normalized.length === 0 ||
    normalized.length > FORM_SCHEMA_LIMITS.submitSupportingText
  ) return undefined;
  return normalized;
}

export function normalizeFormTheme(value: unknown): FormFormTheme | undefined {
  if (!isRecord(value)) return undefined;
  const theme: FormFormTheme = {};
  // Populate layout/surface/typography/input with the unchanged current inline
  // group normalizers, then normalize the complete submit allowlist here.
  const submit = normalizeThemeGroup<ThemeSubmit>(value.submit, {
    background: normalizeThemeColor,
    textColor: normalizeThemeColor,
    radius: (entry) => normalizeThemeEnum(entry, FORM_THEME_RADII),
    fullWidth: normalizeThemeBool,
    label: normalizeOptionalText,
    supportingText: normalizeSubmitSupportingText,
  });
  if (submit) theme.submit = submit;
  return Object.keys(theme).length === 0 ? undefined : theme;
}

export function resolveFormTheme(theme?: FormFormTheme): ResolvedFormTheme {
  const defaults = FORM_THEME_DEFAULTS;
  const submit = theme?.submit;
  const supportingText = theme?.submit?.supportingText;
  const resolvedSubmit: ResolvedFormTheme["submit"] = {
    fullWidth: submit?.fullWidth ?? defaults.submit.fullWidth,
    radius: submit?.radius ?? defaults.submit.radius,
    label: submit?.label ?? defaults.submit.label,
    background: resolveColor(submit?.background) ?? defaults.submit.background,
    textColor: resolveColor(submit?.textColor) ?? defaults.submit.textColor,
    ...(supportingText === undefined ? {} : { supportingText }),
  };
  return {
    layout: { /* current inline keys unchanged */ },
    surface: { /* current inline keys unchanged */ },
    typography: { /* current inline keys unchanged */ },
    input: { /* current inline keys unchanged */ },
    submit: resolvedSubmit,
  };
}

function SubmitMessageSlot({
  supportingText,
  successBehavior,
}: {
  supportingText?: string;
  successBehavior: FormEmbedSubmitBehavior["successBehavior"];
}) {
  if (supportingText && successBehavior === "show-message-keep-form") {
    return (
      <p
        data-form-submit-supporting-text="true"
        data-form-embed-success="true"
        aria-live="polite"
      >
        {supportingText}
      </p>
    );
  }
  return supportingText ? (
    <p data-form-submit-supporting-text="true">{supportingText}</p>
  ) : null;
}

export function buildProjectBriefForm(): ResourceSeed {
  const desired = normalizeProjectBriefDesired({
    name: PROJECT_BRIEF_FORM_TITLE,
    slug: PROJECT_BRIEF_FORM_KEY,
    status: "published",
    description: null,
    successMessage: PROJECT_BRIEF_SUCCESS_MESSAGE,
    successRedirectUrl: null,
    submissionAccess: "public",
    settings: {
      theme: {
        submit: {
          label: PROJECT_BRIEF_SUBMIT_LABEL,
          supportingText: PROJECT_BRIEF_INITIAL_NOTE,
        },
      },
    },
    fields: buildExactReferenceFieldsWithRequiredConsent(),
    actions: [enabledSuccessMessageAction(PROJECT_BRIEF_SUCCESS_MESSAGE)],
  });
  assertExactFormCopyAndSecurity(desired);
  assertExactStageOptions(desired, {
    options: PROJECT_BRIEF_STAGE_OPTIONS,
    authoredPlaceholder: undefined,
  });
  assertFormDescription(desired, null);
  assertSubmitSupportingText(desired, PROJECT_BRIEF_INITIAL_NOTE);
  assertNoPresentationPropsInFormDesired(desired);
  return { key: PROJECT_BRIEF_FORM_KEY, desired };
}

export function buildFormaDomContentResources(): FormaDomContentResources {
  const projects = buildProjectResources();
  const discovery = buildProjectDiscoveryResources();
  const form = buildProjectBriefForm();
  const resources = {
    contentTypes: projects.contentTypes,
    forms: [form],
    listingTemplates: discovery.listingTemplates,
    entries: projects.entries,
    listingQueries: discovery.listingQueries,
    detailPages: discovery.detailPages,
    settings: discovery.settings,
  };
  assertReferenceClosure(resources);
  assertProjectLinkMatrixPreserved(resources.entries);
  assertListingBindingsAndPaginationPreserved(resources);
  assertProjectListingEmptyStatePreserved(resources);
  assertRequiredAuroraEligibilityPreserved(resources.detailPages[0]);
  assertDetailSeoPreserved(resources.detailPages[0]);
  assertVisibleFormTitlePreserved(resources.forms[0], PROJECT_BRIEF_FORM_TITLE);
  return resources;
}
```

**Data flow:** exact Form literals → strict Form theme/settings, field and action
normalizers → Form `{key,desired}` seed with null description and present submit
supporting text → Form service/client persistence → shared resolver → design
canvas/runtime preview/public Form Embed. Independently, TASK-547-04 maps the
contact Page's present-only rows/prompt/loading/success-behavior props into
Form Embed; those values never enter the Form seed. L03 then composes current
L01/L02 child arrays → asserts closed refs/listing/detail eligibility/Form/SEO
invariants → returns the canonical content resource slice.
`PROJECT_BRIEF_INITIAL_NOTE` never flows through Form description or a Page text
block.

**Error handling:** throw stable errors for unknown form keys, reordered/missing
field or option, drifted title/label/placeholder/note/submit/success copy,
an invented blank select prompt, invalid rows/prompt/loading presentation,
non-null or duplicated Form description, invalid public access/status, missing
consent, disabled or extra action, redirect, secret-bearing config, aggregate
ref failure, weakened required detail binding or altered detail SEO. Form write
validation and full-site preflight reject unknown,
blank/whitespace-only and over-2,000-character supporting text. Defensive
normalization omits invalid supporting text without truncation, interpretation
as markup or fallback. Never repair a child slice by silently replacing its data
in the aggregate.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-form-and-slice.test.ts` to prove:

- exact ordered names/types/labels/placeholders/options/requiredness, exactly
  four stage options, no blank/prompt option and `Mam działkę` first;
- consent is the fifth required field and defaults false;
- Form description normalizes to exact `null`, while the exported initial-note
  constant remains exact and occurs once at
  `desired.settings.theme.submit.supportingText` only;
- TASK-547-04-L01 independently proves the contact Page has no sibling text/note
  block containing that constant;
- exact submit label and success message survive normalization;
- exact visible resource name `Zacznij projekt` survives normalization; the
  TASK-547-04-L01 Page test independently pins the identical Form block title
  and the `native-form-heading-approximated` residual;
- exactly one enabled normalized `success_message` action uses the same success
  constant and the seed contains no secret-like config;
- native `status:"published"`, `submissionAccess:"public"`, no form-level
  `enabled`, success behavior/loading/rows/prompt, redirect or DB ID;
- unknown form/settings/field/action keys and invalid public access fail closed;
- aggregate counts and reference closure are exact and deterministic;
- aggregate entry `cardHref`, entry SEO and exact dynamic detail SEO are
  unchanged; exact listing pagination/bindings/no actions/authored empty state
  and required Aurora-only detail eligibility remain unchanged; the detail still
  has no related/listing-query dependency;
- published detail staging yields draft without mutating desired evidence.

Create `tests/vitest/forms/formSupportingText.test.ts` for the pure Form contract:

- compile the real `formSettingsSchema`, `formCreateSchema` and
  `formUpdateSchema`; accept the exact key at 1 and 2,000 characters and reject
  empty, whitespace-only, 2,001-character, wrong-type and unknown submit keys;
- prove normalization trims valid text, preserves Unicode copy, drops blank/
  oversized input without truncation, and preserves all sibling submit keys;
- prove default/no-theme/legacy settings contain no key, normalize to the same
  JSON bytes as the frozen pre-key settings shape and resolve to
  `supportingText === undefined` without an own supporting-text property;
- prove an authored value survives normalize → resolve unchanged and the public
  exports remain importable from `core/widgets/core/formEmbed.tsx` after the
  split, including `clampSavedProgressTtl` and all three new owner constants;
- compile the real Form Embed schema for `textareaRows`, `showSelectPrompt`,
  `loadingLabel` and `successBehavior`; accept exact boundaries and enum values
  from all three exported owner constants, reject one-under/one-over,
  fractional/wrong-type/blank/unknown values, and prove absent new field keys
  keep frozen legacy JSON bytes, four rows and the synthetic prompt while the
  existing loading/success defaults remain unchanged.

Create `tests/unit/forms/formSupportingTextPersistence.test.ts` in the Bun DB
lane to satisfy the new persisted-key round-trip rule. Before its DB command,
load the approved shared environment only with
`set -a && source /home/coder/project/Coderso/.env && set +a`; never inspect,
print, copy, hash or persist its contents. Use a unique UUID-derived Form
name/slug, create/update/read the Form through the real service, assert the exact
trimmed supporting text and sibling label survive JSONB, clear the key without
clearing the sibling, and delete only that Form in `finally`. Never truncate or
globally delete Forms; every case has a timeout of at least 360,000 ms and a slow
shared Render database is not interrupted.

Create `tests/integration/routes/formSupportingTextRoutes.test.ts` in the Bun
route lane as specified by the Security Contract. It must assert exact
registration/middleware/schema identities for Form create/update and action
update, exercise valid 1/2,000 and invalid blank/2,001/unknown nested settings,
and prove exported `mapFormError` mappings for known Form failures without
touching production routes or the database.

Create `tests/vitest/ui-integration/form-supporting-text.test.tsx` for all render
surfaces, keeping it independently runnable and below 1,000 lines:

- Form Design set/clear/reset emits the documented group-replace patches and
  preserves `label`, `fullWidth` and other submit siblings;
- Canvas and Runtime Preview render exact copy once immediately after their
  submit-control row, and render zero supporting-text nodes when absent;
- public `renderToString(FormEmbedBlock)` puts exactly one
  `data-form-submit-supporting-text="true"` node after the submit wrapper and
  before the closing `data-form-embed-form-body` boundary; no-theme SSR stays
  byte-identical under the existing structural baseline;
- direct Form Embed SSR with `textareaRows:5` and
  `showSelectPrompt:false` renders `rows="5"`, exactly four substantive options
  in order, no blank option and no `Select an option`; the authored Polish
  loading label reaches the exact form data attribute;
- hostile-looking text is React-escaped and never becomes an element/script;
- in happy-dom, execute the existing inline Form runtime against a successful
  mocked submission using `show-message-keep-form`; assert all fields and submit
  controls remain visible, the single message-slot paragraph changes from the
  exact initial note to the exact success message, no note/success node is
  duplicated, the initial note is not an alert, and that same sole live node
  retains `aria-live="polite"` without gaining `role="alert"`.

Run the existing `tests/vitest/forms/formActionsContract.test.ts`, Form settings/
theme, admin Forms, Form Embed structural baseline, Form runtime-script and
forms-client suites read-only. Runtime nonce/rate/captcha/submission and final
scoped submission cleanup evidence remains additionally owned by TASK-547-06.

## Sub-Tasks

- [ ] Add the strict present-only submit supporting-text contract and split Form
  Embed by cohesive responsibility without changing public imports or legacy
  output.
- [ ] Correct exact Form constants, fields, settings and safe action.
- [ ] Wire editor, canvas, runtime preview and public Form Embed placement plus
  present-only Form Embed rows/prompt/loading contracts; hand Page prop authoring
  and mapping to TASK-547-04-L01.
- [ ] Preserve child slices, reference closure and dynamic SEO in the aggregate.
- [ ] Add focused pure, UI-integration and scoped DB regression suites without
  modifying oversized legacy tests or weakening security/failure assertions.

## Testing Requirements

- `bunx vitest run tests/vitest/kits/projekty-domow-form-and-slice.test.ts tests/vitest/forms/formSupportingText.test.ts tests/vitest/ui-integration/form-supporting-text.test.tsx tests/vitest/forms/formActionsContract.test.ts tests/vitest/forms/formSettings.test.ts tests/vitest/forms/formTheme.test.ts tests/vitest/admin/formDesignPanel.test.tsx tests/vitest/admin/formCanvas.test.tsx tests/vitest/admin/formRuntimePreviewDialog.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts`;
- after `set -a && source /home/coder/project/Coderso/.env && set +a`, without
  inspecting, printing, copying, hashing or persisting the environment contents,
  `bun test --timeout 360000
  tests/unit/forms/formSupportingTextPersistence.test.ts
  tests/integration/routes/formSupportingTextRoutes.test.ts
  tests/integration/server/formsWriteMounts.test.ts
  tests/integration/routes/forms.test.ts
  tests/integration/routes/formActionsRoutes.test.ts` plus relevant existing
  Bun Form runtime/service suites selected by dependency shape. Every DB-backed
  case uses unique scoped fixtures/cleanup and a timeout of at least 360 seconds;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- baseline-to-final physical line counts for every added or modified production/
  test file, including all three Form Embed modules; each must be at most 1,000.

## Documentation Updates Required

Send exact field/action setup, null-description/native-submit-note placement,
nonce/rate/principal-aware CAPTCHA/consent and optional post-install integration guidance to
TASK-547-06; do not edit shared docs here.
