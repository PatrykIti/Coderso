# TASK-547-03: Projekty Domów Content, Forms and Listings
# FileName: TASK-547-03-Projekty-Domow-Content-Forms-And-Listings.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Reference Example / Content Engine / Forms
**Estimated Effort:** Large
**Dependencies:** TASK-547-02
**Status:** ✅ Done
**Completed:** 2026-08-08
**Validation:** Corrected content, Forms, listings and installed-runtime gates
passed, followed by the final 18/18 certification smoke.

---

## Overview

Generate the reusable, data-driven part of the FormaDom package with native CMS
resources: the `house-project` content type, six ordered entries, one listing
template and query, one dynamic project detail document and content route, and
one production public contact form. Aurora remains a seeded content entry, not a
duplicated static Page.

This task reproduces public copy and facts from the exact read-only reference at
`/home/coder/project/Coderso/_docs/projekty-domow-wow-site/`, allowlisted and
hash-verified by TASK-547-07. It must not retain the unrelated facts or copy from
the earlier generator draft. Native accessibility, validation and anti-abuse
additions are allowed only where this contract identifies them; they must not
introduce a new public claim.

**Single-writer ownership:** TASK-547-03 owns the content/listing/detail/form
generator modules and tests assigned by its leaves plus L03's smallest native
Forms supporting-text path (strict settings/theme contract, editor/canvas/
preview/public embed and focused tests). Page documents remain owned by
TASK-547-04. TASK-547-03-L03 exclusively owns
`scripts/projekty-domow/content/buildFormaDomContentResources.ts` and its
`buildFormaDomContentResources` export; L01/L02 expose child slice builders and
must not edit or duplicate that aggregate.

## Reference Fidelity Contract

The following designated-reference ranges are authoritative:

- `projekty.html:38-73` — portfolio heading, facet order, six card titles,
  descriptions, categories, display order and card destinations;
- `projekt-aurora.html:4-7,38-76` — dynamic-detail SEO, Aurora hero, statistics,
  assumptions and the three-card gallery;
- `kontakt.html:38-61` — contact intro, field labels, placeholders, select
  options, submit label and initial note;
- `assets/app.js:102-107` — exact successful-submit message.

The common SEO description is exactly:
`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.`

The entry order and public card facts are frozen:

| Order | Key / slug | Title | Area | Categories | Card description | Card href |
| ---: | --- | --- | ---: | --- | --- | --- |
| 0 | `aurora` | `Dom Aurora` | 142 | `barn`, `eco` | `142 m² · stodoła · eko` | `/projekty/aurora` |
| 1 | `linea` | `Dom Linea` | 188 | `villa` | `188 m² · miejska willa` | `/projekty` |
| 2 | `nova` | `Dom Nova` | 121 | `single`, `eco` | `121 m² · parterowy` | `/projekty` |
| 3 | `mono` | `Dom Mono` | 156 | `barn` | `156 m² · czarna elewacja` | `/projekty` |
| 4 | `vista` | `Dom Vista` | 206 | `villa`, `eco` | `206 m² · willa z patio` | `/projekty` |
| 5 | `calm` | `Dom Calm` | 98 | `single` | `98 m² · kompaktowy` | `/projekty` |

Do not reintroduce invented `style`, `storeys`, `rooms`, `energyClass`, singular
`category`, `zones`, `visualLabel`, related-project copy, or different project
facts. The schema instead owns source-backed `cardDescription`, `cardHref`,
`area`, `categories`, `referenceOrder`, `seoDescription` and optional
Aurora-only detail fields (`detailEyebrow`, `detailLead`, `detailStats`,
assumption headings and `assumptions`). `cardHref` is required and accepts only
the two exact safe internal values `/projekty/aurora` and `/projekty`; fixture
validation additionally freezes Aurora to the detail path and every other card
to the listing path. This reproduces `projekty.html:55-72` rather than inventing
detail destinations for the five cards whose prototype links back to the list.

The portfolio facet presentation is frozen in this order:

1. `all` — `Wszystkie` (the no-filter state),
2. `barn` — `Nowoczesna stodoła`,
3. `villa` — `Wille`,
4. `single` — `Parterowe`,
5. `eco` — `Energooszczędne`.

The query sorts by `data.referenceOrder` ascending with a deterministic `id`
tiebreaker and uses exact pagination `{limit:24,offset:0}`. L01 alone owns the
persisted `HOUSE_PROJECT_CATEGORIES`. L02 imports that registry and owns only the
`all` no-filter option plus ordered public labels/presentation; the TASK-547-04
projects Page imports L02's presentation constant rather than repeating labels.

Aurora detail must reproduce the source-backed hero lead, prominent abstract
hero art, four statistics, CTA, assumption heading/lead, three assumption cards
and three abstract gallery cards in that visible order. L02 pins registered
blocks and exact props/bindings that avoid `stats-kpi` and `gallery-mosaic`
fallback copy. Gallery items contain no caption or media/asset reference. The
detail document has no related-project block, related source, computed
`relatedItems` binding or listing-query reference. Every Aurora-only binding is
`required:true` with no binding fallback. Because the five non-Aurora fixtures
omit all detail data, resolving any of their direct `/projekty/:slug` requests
fails before rendering or metadata generation and produces the existing 404
response. Only Aurora may produce the showcase document or its showcase SEO.
Its neutral top-level document `titlePattern` is `{{ title }}`. Dynamic SEO alone
uses `{{ title }} — projekt pokazowy — FormaDom Studio` plus the exact common
`seoDescription`, producing
`Dom Aurora — projekt pokazowy — FormaDom Studio`.

The public Form carries the four prototype fields plus one explicit native
consent addition. Its public strings are exact:

- `Imię i nazwisko`, placeholder `Jan Kowalski`;
- `E-mail`, placeholder `jan@email.pl`;
- `Na jakim jesteś etapie?`, with ordered options `Mam działkę`,
  `Szukam działki`, `Mam gotowy projekt do adaptacji`,
  `Chcę tylko konsultację`;
- `Krótki opis`, placeholder
  `Napisz, jaki dom Ci się marzy, gdzie jest działka i jaki styl lubisz.`;
- native required-consent addition `Zgoda na kontakt w sprawie zapytania`;
- visible native Form heading and Form resource name `Zacznij projekt`;
- submit label `Wyślij brief`;
- submit supporting text
  `Odpisujemy zwykle w ciągu jednego dnia roboczego. Bez zobowiązań i bez sprzedażowej presji.`;
- success message
  `Dziękujemy! Odezwiemy się z pierwszym pomysłem na Twój dom — do usłyszenia.`

The stage control has exactly those four options and no synthetic blank or
English prompt; its Form field has no `placeholder` or `defaultValue` own key,
so native selection initially selects `Mam działkę`. The textarea renders with
exactly five rows. FormaDom also authors the native Polish pending label
`Wysyłanie...` pinned by L03. The reference defines no error copy; existing safe
code-specific Forms runtime errors remain unchanged native security behavior and
are not claimed as reference parity.

The note is native Form data, not Page copy. TASK-547-03-L03 adds the strict,
present-only optional contract `FormFormTheme.submit.supportingText?: string`.
It is trimmed, must be non-empty when present, is limited to 2,000 characters,
has no resolution or persistence default and emits no DOM/serialized bytes when
absent. The FormaDom seed stores `PROJECT_BRIEF_INITIAL_NOTE` at that exact
property. Form Embed renders one message slot immediately after the submit
controls. Before submission it contains the inert supporting text. FormaDom uses
the existing `show-message-keep-form` branch; after success the same slot exposes
the existing polite success target with the exact success message, hides the
initial note, and leaves every form control visible. The shared paragraph has
both data attributes and `aria-live="polite"` but no `role="alert"` before or
after mutation. There is no duplicate note, second live region or claim that
hiding the form matches the reference.

## Resource Contract

- One strict `house-project` content-type seed with published target status and
  bounded source-backed fields.
- Six entry seeds in the exact table order. Every `desired.status` is
  `published`, but TASK-547-02 creates the row as draft and publishes only in
  the publish-last stage. Every entry uses
  `{ref:"content_type",key:"house-project"}` at `contentTypeId`.
- One lifecycle-free listing-template seed with the exact normalized fields
  `title ← title`, `description ← data.cardDescription`, and
  `href ← data.cardHref`, each with `label:null`, `fallback:null`,
  `format:"text"` and `conditions:[]`. It has `itemActions:[]`. The href is a
  semantic card-anchor binding, not visible CTA copy. TASK-547-04 sets the
  projects Page Content List block to `props.showCta:false` and maps that
  present prop to `ContentListData.fields.showCta`; TASK-547-06 proves that card
  anchors still use the exact six-link matrix and that `Zobacz szczegóły` is
  absent. Its package-specific `config.emptyState` is exactly
  `{title:"Brak wyników",description:"Zmień filtry, aby zobaczyć inne projekty.",
  ctaLabel:null,ctaHref:null}`; the generic locale runtime preserves rather than
  authors this value.
- One published-only listing query over `house-project`, with exact pagination
  `{limit:24,offset:0}`, category data and deterministic reference order; its
  projection includes `data.cardHref`.
- One published-target detail document bound to the content type, plus one
  enabled `/projekty/:slug` route inside the allowlisted
  `site.contentRoutes` setting. Required Aurora-only bindings make the document
  fail closed for all five other direct slugs before public metadata/render.
  The detail does not depend on the listing query.
- One published-target `project-brief` Form with public submission access, five
  ordered fields and one mandatory enabled native `success_message` action.
  Its resource name is the visible source-derived literal `Zacznij projekt`.
  TASK-547-04-L01 sets the bound Page Form block title to that same literal.
  This deterministic extra heading is documented only by the
  `native-form-heading-approximated` residual; the name is not admin-only.
  Form `desired.description` is exactly `null`, because native Form Embed renders
  that description above its fields. L03 stores its exact exported initial-note
  constant only at present
  `settings.theme.submit.supportingText:PROJECT_BRIEF_INITIAL_NOTE`. The contact
  Page contains no sibling text/note block for this copy. This native Form
  placement matches `kontakt.html:60-61`, preserves the note below the submit
  control and replaces its visible slot on success while controls remain visible.
  E-mail/webhook/CRM configuration is outside this package.
- Every resource seed is exactly `{key, desired}` with no database ID in JSON.

## Security Contract

- No new endpoint; resources install through TASK-547-02.
- Public submission continues through the existing Forms access evaluator,
  signed nonce, `public_write` rate bucket and optional reCAPTCHA v3 policy.
- Form, action, listing, detail and route payloads reject unknown fields before
  persistence; no secret, recipient, SMTP, webhook or credential data is seeded.
  This depends on TASK-547-02-L02 extending full-site nested preflight for both
  `submit.supportingText` and every nested listing-template object before L03
  implementation begins.
- Required consent is an explicit native privacy addition to the prototype, not
  a claim that the static demo already contained it.
- Listing/detail reads remain published-only and use allowlisted field, binding,
  filter and route contracts. Card destinations are exact safe internal
  allowlist values, never user-authored or remote URLs. Fixture data contains no
  customer PII.

## Implementation Pseudocode

```ts
export function buildFormaDomContentResources(): FormaDomContentResources {
  const projects = buildProjectResources();
  assertExactReferenceProjectMatrix(projects.entries);
  assertExactReferenceProjectLinkMatrix(projects.entries);
  assertEveryEntryRef(projects.entries, ref("content_type", "house-project"));
  assertEveryEntryStatus(projects.entries, "published");

  const discovery = buildProjectDiscoveryResources();
  assertListingSource(discovery.listingQueries, "house-project");
  assertReferenceOrderSort(discovery.listingQueries);
  assertExactPagination(discovery.listingQueries, { limit: 24, offset: 0 });
  assertExactListingBindings(discovery.listingTemplates, [
    ["title", "title"],
    ["description", "data.cardDescription"],
    ["href", "data.cardHref"],
  ]);
  assertNoListingItemActionsOrCtaCopy(discovery.listingTemplates);
  assertExactProjectListingEmptyState(discovery.listingTemplates);
  assertDetailContentRef(discovery.detailPages, "house-project");
  assertAuroraBindingsRequiredWithoutFallback(discovery.detailPages);
  assertNoRelatedListingDependency(discovery.detailPages);
  assertDynamicSeo(discovery.detailPages, {
    documentTitlePattern: "{{ title }}",
    seoTitlePattern: "{{ title }} — projekt pokazowy — FormaDom Studio",
    descriptionField: "seoDescription",
  });

  const form = buildProjectBriefForm();
  assertExactReferenceFormCopy(form);
  assertVisibleFormTitle(form, "Zacznij projekt");
  assertFormDescription(form, null);
  assertExactStageField(form, {
    options: [
      "Mam działkę",
      "Szukam działki",
      "Mam gotowy projekt do adaptacji",
      "Chcę tylko konsultację",
    ],
    authoredPlaceholder: undefined,
  });
  assertSubmitSupportingText(form, PROJECT_BRIEF_INITIAL_NOTE);
  assertFormDoesNotPersistPagePresentation(form);
  assertPresentOnlySupportingTextContract(form);
  assertNativePublicSecurityContract(form);

  return mergeResourceSlices(projects, discovery, { forms: [form] });
}
```

**Data flow:** frozen source-derived fixtures → L01 strict content seeds → L02
query/template/detail/route seeds → L03 native Form seed with null description
and present-only submit supporting text → L03-owned aggregate → TASK-547-01
graph normalization → TASK-547-02 draft-first installer and publish-last stage.
The contact Page binds only the Form; the Form-owned note reaches editor,
canvas, runtime preview and public Form Embed through normalized
`settings.theme.submit.supportingText`, then the existing keep-form success path
updates that visible message slot. L03 composes existing child slices without
rebuilding them.

**Error handling:** fail closed on duplicate key/slug/order, unknown category,
unsafe or mismatched `cardHref`, non-exact `PackageRef`, missing required common
field, partial/malformed Aurora detail data, unknown facet, altered exact route,
unexpected media reference, non-null Form description, blank/oversized/unknown
submit supporting-text input, secret-bearing form config or drift from the exact
form strings. This family validates recursive plain finite JSON before
serialization; no stringify-first coercion is allowed. The generic normalizer
trims valid supporting text and omits blank/oversized invalid values without
truncation; strict request/full-site preflight schemas reject them before
persistence. Never silently replace source content.

**Regression-test shape:** pin the six-row matrix, exact card-link matrix and
frozen order; reject prior invented fields; prove schema round-trip; prove exact
category filter order and reference-order query sort; prove the template `href`
binding and exact authored Polish empty-state shape in L02, then prove runtime
preservation, precedence and the absence of
`Zobacz szczegóły` in TASK-547-06's legal Bun/runtime lane; resolve Aurora
bindings to exact detail copy and abstract art; prove all five non-Aurora direct
slugs return 404 with no detail metadata/body; prove no related block/ref;
validate dynamic SEO; validate the exact visible Form/resource title,
four-option/no-prompt select, five-row textarea, Polish loading label,
fields/placeholders/submit/success, exact
exported initial-note constant, null Form description and the sole
`settings.theme.submit.supportingText` placement; prove schema/normalizer and DB
round-trip, editor set/reset, canvas/runtime-preview/public SSR parity, exact
post-submit DOM order, keep-form in-place note replacement and legacy absent-key
byte identity; prove the contact Page has no sibling note; prove native
nonce/rate/captcha/consent integration, aggregate reference closure,
determinism, SEO preservation and absence of secrets/DB/media IDs.

## Cross-Owner Prerequisites and Handoffs

- Before L03 implementation, TASK-547-02-L02 must add
  `submit.supportingText` to `assertFormNestedContract` with exact 1/2,000
  acceptance and blank, 2,001, wrong-type and unknown-key rejection, importing
  `FORM_SCHEMA_LIMITS.submitSupportingText` from the Forms domain owner instead
  of duplicating `2_000`. It must also strictly reject unknown own keys at every
  nested listing-template level; the existing normalizer's key selection is not
  strict preflight.
- TASK-547-04 owns Page documents. Its projects Page must keep card anchors but
  author `props.showCta:false` and map it to
  `ContentListData.fields.showCta`; its contact Form block authors textarea rows
  through `props.textareaRows:5`, removes the synthetic prompt through
  `props.showSelectPrompt:false`, authors exact Polish
  `props.loadingLabel`, authors
  `props.successBehavior:"show-message-keep-form"`, and contains no sibling
  initial-note block. Its Page contract must strictly allowlist, normalize and
  round-trip every newly consumed present-only prop, and its runtime mappers pass
  them to Content List/Form Embed. It imports L03's rows/loading-label bounds
  and `FORM_EMBED_SUCCESS_BEHAVIORS` rather than duplicating numbers or enum
  values. The Form resource does not persist them.
- TASK-547-06 owns public runtime evidence: card href precedence, no visible
  `Zobacz szczegóły`, visible lead → statistics → CTA order, Aurora-only 200
  versus five 404s with no metadata leakage, four select options with the first
  selected, five textarea rows, and controls remaining visible after the note
  changes to the success message.
- TASK-547-07 derives the live owned-path count from its ownership map and
  updates any separately pinned expected-count integrity assertion whenever
  this leaf's list changes. TASK-547-06 alone re-reads and synchronizes board
  rows/statistics at closure.

**Leaf land order:** `TASK-547-03-L01 → TASK-547-03-L02 → TASK-547-03-L03`.

## Sub-Tasks

- [x] **TASK-547-03-L01** — correct the project schema and six source-derived
  entry fixtures.
- [x] **TASK-547-03-L02** — correct listing/query/facets, Aurora detail SEO and
  content-route setting support.
- [x] **TASK-547-03-L03** — correct the real contact form/action and aggregate
  preservation tests.

## Testing Requirements

- targeted Vitest generator/schema/listing/detail/form suites;
- before every DB-backed command, load the approved shared environment only with
  `set -a && source /home/coder/project/Coderso/.env && set +a`; never inspect,
  print, copy, hash or persist its contents;
- targeted Bun settings/content/listing/detail/form runtime suites in their
  owning lanes, with DB timeouts at least 360 seconds;
- `bun --cwd core lint` and `bun --cwd core lint:types` after every leaf;
- `git diff --check` and baseline-to-final physical line counts for every
  touched human-authored production/test file; every file must remain at most
  1,000 lines.

## Documentation Updates Required

Provide the exact reference matrix, route/query/detail recipe and secure public
Form recipe to TASK-547-06, the sole shared-documentation and closure writer.
