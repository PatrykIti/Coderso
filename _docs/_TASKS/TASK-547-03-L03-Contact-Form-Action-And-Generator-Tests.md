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
- new `tests/unit/forms/formSupportingTextPersistence.test.ts`.

This leaf alone exports `buildFormaDomContentResources`. L01/L02 must not edit or
duplicate the aggregate. The exact owned path count is derived by TASK-547-07
from this list; no task or workflow may retain a hardcoded family-wide count.

The generic Forms files are the smallest verified end-to-end path: settings owns
the strict persisted key, theme resolves it without a default, the design panel
authors and clears it, canvas/runtime preview expose authoring parity, and Form
Embed owns public SSR placement. The two new Form Embed modules are a required
cohesive split of the currently 1,922-line `formEmbed.tsx`: contract/schema/
normalization move to `formEmbedContract.ts`, while field DOM allocation and
field-control rendering move to `formEmbedFields.tsx`; `formEmbed.tsx` remains
the stable public entry and re-exports every pre-existing public contract symbol.
All three files must finish at or below 1,000 physical lines.

These paths remain explicitly read-only: `core/widgets/core/formRuntimeScript.ts`
already hides the entire `data-form-embed-form-body` for the default success
behavior, and the over-limit `tests/vitest/widgets/formEmbed.test.tsx` must not
receive more lines. Existing `FormBuilderPage` group-replace plumbing,
`formsClient` normalization and Form routes/services already transport the
shared settings contract and require no production edit. Run their focused
regression suites read-only rather than claiming or changing them.

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
imports only `PROJECT_BRIEF_FORM_TITLE` for its required visible block heading
and does not import the note for rendering.

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
- the defensive normalizer omits blank or oversized input without truncating it;
- `getDefaultFormSettings()`, absent-theme normalization,
  `FORM_THEME_DEFAULTS`, `formEmbedDefaults` and legacy Form documents seed no
  supporting text; resolving an absent value returns `undefined` and does not
  add an own `supportingText` property;
- normalizing, resolving, saving or rendering an unauthored legacy document is
  byte-identical to the pre-key contract and emits no supporting-text DOM node;
- `FormDesignPanel` provides one `Textarea` under Submit with exact
  `aria-label="Submit supporting text"`,
  `data-form-theme-control="submit.supportingText"` and `maxLength={2_000}`.
  Typing non-blank copy emits a complete submit-group replacement; its exact
  `aria-label="Reset submit supporting text"` reset/clear control deletes only
  `supportingText`, preserves sibling submit keys and emits an undefined group
  only when it was the group's last key;
- `FormCanvas` and `FormRuntimePreviewDialog` render the normalized resolved
  copy exactly once immediately after their submit-control row, using the
  existing helper-text visual treatment;
- public Form Embed renders one `<p data-form-submit-supporting-text="true">`
  immediately after the submit-control wrapper, still inside
  `<div data-form-embed-form-body="true">`; it renders no such element when the
  key is absent;
- the existing success node stays outside the body and remains the sole
  `role="alert" aria-live="polite"` success target. The existing default
  `show-message-hide-form` branch hides the body (and therefore the supporting
  text) before/while exposing the exact success message. Do not edit
  `formRuntimeScript.ts` and do not add a second live region.

`core/widgets/core/formEmbed.tsx` remains the public import boundary for all
existing exports: `FormEmbedVariantId`, `FormEmbedLayout`, `FormEmbedStyle`,
`FormEmbedFields`, `FormEmbedNavigation`, `FormEmbedSubmitBehavior`,
`ResolvedFormField`, `FormEmbedResolvedData`, `FormEmbedData`,
`formEmbedThemeDefaultColorValues`, `isFormEmbedThemeDefaultStyleValue`,
`resolveFormEmbedSpacing`, `formEmbedSchema`, `formEmbedDefaults`,
`resolveFormEmbedRuntimeErrorMessage`, `normalizeFormEmbedData`,
`FormEmbedBlock`, `formEmbedEditorContract` and `createFormEmbedWidget`.
Extraction may add internal exports, but no existing consumer import path,
runtime-script contract or rendered legacy markup may change.

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
- no form-level `enabled`, redirect, recipient, mail, webhook or secret config.

## Security Contract

- No new endpoint. Submission uses the existing public Forms endpoint and
  strict native field/action normalization. Admin Form create/update remains an
  internal authenticated session route with existing Forms RBAC and CSRF; this
  leaf does not alter route visibility, permissions or cache behavior.
- Public submission is allowed only for a published Form whose normalized
  `submissionAccess` is `public`; it does not use admin-session CSRF. Internal
  mode retains the existing session/API-key-scope access evaluator.
- Runtime access must require the shared signed submission nonce, charge the
  `public_write` rate-limit bucket and enforce configured optional reCAPTCHA v3
  using action `public_write`.
- Consent is required and defaults false. Unknown form, settings, theme/submit,
  field and action properties fail closed. Supporting text is inert plain React
  text, never HTML, Markdown or script input; normal React escaping is preserved.
- No SMTP/webhook/CRM recipient or credential is packaged. Those remain
  explicit post-install operator configuration.
- Tests use fake data and DB-backed closure tests delete only their own scoped
  submission.

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
- neutral detail `titlePattern === "{{ title }}"`;
- detail `seo.titlePattern` equal to
  `{{ title }} — projekt pokazowy — FormaDom Studio`;
- detail `seo.descriptionField === "seoDescription"`;
- absence of any detail related/listing-query dependency;
- null Form description plus the exact exported initial-note constant at the
  sole `settings.theme.submit.supportingText` placement;
- the exact submit label and success message;
- the exact visible Form resource title `Zacznij projekt` used by the Page block.

TASK-547-04-L01 must assert that the contact Page contains no sibling block with
`PROJECT_BRIEF_INITIAL_NOTE`; the Form binding is the only Page-owned connection
to this note. This cross-leaf assertion does not transfer any TASK-547-04 file to
L03.

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

function SubmitSupportingText({ value }: { value?: string }) {
  return value === undefined ? null : (
    <p data-form-submit-supporting-text="true">{value}</p>
  );
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
  assertFormDescription(desired, null);
  assertSubmitSupportingText(desired, PROJECT_BRIEF_INITIAL_NOTE);
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
  assertDetailSeoPreserved(resources.detailPages[0]);
  assertVisibleFormTitlePreserved(resources.forms[0], PROJECT_BRIEF_FORM_TITLE);
  return resources;
}
```

**Data flow:** exact Form literals → strict Form theme/settings, field and action
normalizers → Form `{key,desired}` seed with null description and present submit
supporting text → Form service/client persistence → shared resolver → design
canvas/runtime preview/public Form Embed → compose current L01/L02 child arrays →
assert closed refs/form and SEO invariants → canonical content resource slice.
`PROJECT_BRIEF_INITIAL_NOTE` never flows through Form description or a Page text
block.

**Error handling:** throw stable errors for unknown form keys, reordered/missing
field or option, drifted title/label/placeholder/note/submit/success copy,
non-null or duplicated Form description, invalid public access/status, missing
consent, disabled or extra action, redirect, secret-bearing config, aggregate
ref failure or altered detail SEO. Form write validation rejects unknown,
blank/whitespace-only and over-2,000-character supporting text. Defensive
normalization omits invalid supporting text without truncation, interpretation
as markup or fallback. Never repair a child slice by silently replacing its data
in the aggregate.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-form-and-slice.test.ts` to prove:

- exact ordered names/types/labels/placeholders/options/requiredness;
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
  `enabled`, no redirect and no DB ID;
- unknown form/settings/field/action keys and invalid public access fail closed;
- aggregate counts and reference closure are exact and deterministic;
- aggregate entry `cardHref`, entry SEO and exact dynamic detail SEO are
  unchanged, and the detail still has no related/listing-query dependency;
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
  split.

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
- hostile-looking text is React-escaped and never becomes an element/script;
- in happy-dom, execute the existing inline Form runtime against a successful
  mocked submission using default `show-message-hide-form`; assert the body is
  hidden (so its note is not visible), the supporting-text node is not moved or
  duplicated, and the one existing success node becomes visible with the exact
  message plus `role="alert"` and `aria-live="polite"`.

Run the existing `tests/vitest/forms/formActionsContract.test.ts`, Form settings/
theme, admin Forms, Form Embed structural baseline, Form runtime-script and
forms-client suites read-only. Runtime nonce/rate/captcha/submission and final
scoped submission cleanup evidence remains additionally owned by TASK-547-06.

## Sub-Tasks

- [ ] Add the strict present-only submit supporting-text contract and split Form
  Embed by cohesive responsibility without changing public imports or legacy
  output.
- [ ] Correct exact Form constants, fields, settings and safe action.
- [ ] Wire editor, canvas, runtime preview and public Form Embed placement.
- [ ] Preserve child slices, reference closure and dynamic SEO in the aggregate.
- [ ] Add focused pure, UI-integration and scoped DB regression suites without
  modifying oversized legacy tests or weakening security/failure assertions.

## Testing Requirements

- `bunx vitest run tests/vitest/kits/projekty-domow-form-and-slice.test.ts tests/vitest/forms/formSupportingText.test.ts tests/vitest/ui-integration/form-supporting-text.test.tsx tests/vitest/forms/formActionsContract.test.ts tests/vitest/forms/formSettings.test.ts tests/vitest/forms/formTheme.test.ts tests/vitest/admin/formDesignPanel.test.tsx tests/vitest/admin/formCanvas.test.tsx tests/vitest/admin/formRuntimePreviewDialog.test.tsx tests/vitest/admin/formsClient.test.ts tests/vitest/widgets/formEmbed.test.tsx tests/vitest/widgets/formRuntimeScript.test.ts`;
- after `set -a && source /home/coder/project/Coderso/.env && set +a`, without
  inspecting, printing, copying, hashing or persisting the environment contents,
  `bun test --timeout 360000 tests/unit/forms/formSupportingTextPersistence.test.ts`
  plus relevant existing Bun Form runtime/service suites selected by dependency
  shape. Every DB-backed case uses unique scoped fixtures/cleanup and a timeout
  of at least 360 seconds;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- baseline-to-final physical line counts for every added or modified production/
  test file, including all three Form Embed modules; each must be at most 1,000.

## Documentation Updates Required

Send exact field/action setup, null-description/native-submit-note placement,
nonce/rate/captcha/consent and optional post-install integration guidance to
TASK-547-06; do not edit shared docs here.
