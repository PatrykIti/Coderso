# TASK-547-03-L02: Listing, Query, Detail and Content Route
# FileName: TASK-547-03-L02-Listing-Query-Detail-And-Content-Route.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Content Engine / Listings / Detail
**Estimated Effort:** Large
**Dependencies:** TASK-547-03-L01
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — the resource graph exists, but its facets, project
facts, detail composition and SEO must be corrected to the designated reference.

## Overview

Own the native project listing template, published-only saved query, public
category-filter presentation derived from L01's persisted vocabulary, Aurora
detail document/bindings and the allowlisted `site.contentRoutes` setting seed.
Provide only
`buildProjectDiscoveryResources`; do not create or edit L03's
`buildFormaDomContentResources` aggregate.

## Exact Ownership

This leaf is the sole writer for:

- `scripts/projekty-domow/content/projectListing.ts`;
- `scripts/projekty-domow/content/projectDetail.ts`;
- `scripts/projekty-domow/content/buildProjectDiscoveryResources.ts`;
- `core/services/settings/settingsContracts.ts`;
- `tests/vitest/kits/projekty-domow-discovery-resources.test.ts`;
- `tests/unit/settings/contentRoutesValidation.test.ts`.

The later TASK-547-06 closure leaf owns the DB/runtime detail-route integration
suite `tests/integration/runtime/projekty-domow-detail-route.test.ts` and the
runtime Content List precedence/card-render assertions; do not grow the large
installed-site suite with those scenarios and do not move Bun-owned resolver
behavior into this leaf's Vitest lane.

## Listing and Facet Contract

Source: `_docs/projekty-domow-wow-site/projekty.html:38-73`.

L01 alone owns persisted values through `HOUSE_PROJECT_CATEGORIES`. L02 imports
that tuple and owns the ordered labels/presentation:

```ts
const PROJECT_CATEGORY_LABELS = [
  "Nowoczesna stodoła",
  "Wille",
  "Parterowe",
  "Energooszczędne",
] as const;

export const PROJECT_CATEGORY_FILTERS = [
  { value: "all", label: "Wszystkie" },
  { value: HOUSE_PROJECT_CATEGORIES[0], label: PROJECT_CATEGORY_LABELS[0] },
  { value: HOUSE_PROJECT_CATEGORIES[1], label: PROJECT_CATEGORY_LABELS[1] },
  { value: HOUSE_PROJECT_CATEGORIES[2], label: PROJECT_CATEGORY_LABELS[2] },
  { value: HOUSE_PROJECT_CATEGORIES[3], label: PROJECT_CATEGORY_LABELS[3] },
] as const;
```

`all` means the empty/no-filter state and is never persisted in an entry's
`categories`. The effective native category facet uses `data.categories` and
only L01's remaining four options in the same order. The exact resolved output
is `all/barn/villa/single/eco` with the five labels above. TASK-547-04 imports
this constant for the projects Page; it does not retype values or labels.
`PROJECT_FACET_FIELDS` is exactly `["data.categories"] as const`; no obsolete
style/storey/energy facet survives.

The `published-projects` query contract is:

- source `entries` with
  `contentTypeId:{ref:"content_type",key:"house-project"}`;
- `includeDrafts:false` and an explicit `status == published` filter;
- sort `[data.referenceOrder asc, id asc]`;
- exact pagination `{limit:24,offset:0}`;
- projected fields `id`, `title`, `slug`, `data.cardDescription`, `data.area`,
  `data.categories`, `data.referenceOrder`, and `data.cardHref` only.

The `project-cards` listing template has exactly this normalized field array:

```ts
[
  {
    key: "title",
    source: "title",
    label: null,
    fallback: null,
    format: "text",
    conditions: [],
  },
  {
    key: "description",
    source: "data.cardDescription",
    label: null,
    fallback: null,
    format: "text",
    conditions: [],
  },
  {
    key: "href",
    source: "data.cardHref",
    label: null,
    fallback: null,
    format: "text",
    conditions: [],
  },
]
```

`description` is the native semantic key consumed by the card excerpt
resolver. `href` supplies the semantic card-anchor destination and takes
priority over generic content-route fallback. It is not a visible CTA. The
template has `itemActions:[]` and no obsolete badge, metric, media field,
lifecycle status or invented copy. TASK-547-04 must author the projects Page
Content List block with `props.showCta:false` and map that present Page prop to
`ContentListData.fields.showCta`, while retaining its normal semantic card href.
TASK-547-04 owns that prop's strict Page allowlist/round-trip and runtime mapper.
TASK-547-06's Bun/runtime lane proves Aurora → `/projekty/aurora`, the other
five → `/projekty`, and no visible `Zobacz szczegóły`. L02's Vitest proves only
the exact normalized binding shape.

## Aurora Detail Contract

Source: `_docs/projekty-domow-wow-site/projekt-aurora.html:4-7,38-76`.

The `project-detail` document is a published target created draft-first by the
installer. It references only
`{ref:"content_type",key:"house-project"}`; it has no listing-query reference,
`related` source, related-project block or computed `relatedItems` binding.

Its exact registered block order and public representation are:

1. `project-back-link`, `rich-text-section`, `variant:"single-column"`:
   empty `titleBlock`; `body.html` exactly
   `<p><a href="/projekty">← Wróć do projektów</a></p>`;
   `options:{dropcap:false,toc:false,maxWidth:"full",outputMode:"html"}`.
2. `project-hero`, `hero`, `variant:"centered"`: placeholder sentinel `—` for
   `badge.label`, `headline` and `body`; badge enabled/primary/above-headline;
   no CTA and `media:{type:"none",source:"external"}`. Required bindings replace
   the sentinels with `detailEyebrow`, entry `title` and `detailLead`.
3. `project-hero-art`, `grid-columns`, `variant:"asymmetric"`: two empty public
   columns `hero-art-main`/`hero-art-accent`, spans `8/4` desktop and `12/12`
   mobile/tablet, both `minHeight:"xl"`, `surface:"on"`,
   `padding:"none"`, `radius:"2xl"`, `overflow:"hidden"`, backgrounds
   `var(--color-primary)` and `var(--color-secondary)`, and empty slots.
4. `project-statistics`, `feature-grid`, `variant:"cards-4"`: empty header,
   exact item IDs `area/bedrooms/bathrooms/energy`, each with sentinel title
   `—`, empty description, no image/icon/CTA; required bindings replace titles
   with each `detailStats.N.value` and descriptions with
   `detailStats.N.label`. Style pins four columns, compact padding and no hover.
5. `project-contact-cta`, `cta-banner`, `variant:"centered"`: empty
   badge/title/description and `showDescription:false`; exact primary action
   `{label:"Chcę podobny dom",href:"/kontakt",enabled:true,openInNewTab:false,
   icon:"none"}`; secondary and tertiary actions are explicitly blank and
   disabled so no default English action can render.
6. `project-assumptions`, `feature-grid`, `variant:"cards-3"`: required header
   bindings for `assumptionsEyebrow`, `assumptionsTitle`,
   `assumptionsLead`, with raw `—` sentinels at all three header targets; exact
   item IDs `living-zone/private-zone/facade`, raw `—` title/description
   sentinels and required bindings from `assumptions.0..2`; no image, icon or
   CTA; three columns, spacious padding and no hover.
7. `project-gallery`, `grid-columns`, `variant:"asymmetric"`: empty public slots
   for `gallery-tall/gallery-default/gallery-warm`; desktop spans `5/4/3`,
   tablet/mobile spans `12/12/12`; minimum heights `xl/md/md`;
   `surface:"on"`, `padding:"none"`, `radius:"2xl"`,
   `overflow:"hidden"`; backgrounds respectively
   `var(--color-primary)`, `var(--color-secondary)`,
   `var(--color-accent)`.

All seven blocks use the existing full-width detail layout. Public grid-column
labels are editor-only and therefore not copy. `grid-columns` empty public slots
render surfaces without placeholder text. This intentionally avoids
`stats-kpi` and `gallery-mosaic`, whose normalizers/renderers add unwanted
fallback text. The raw `—` sentinels are never eligible public output: every
source-backed target is required and no binding has a `fallback` own property.
The successful Aurora render must contain none of those sentinels or English
widget defaults.

The exact binding matrix is:

- hero: `detailEyebrow → badge.label`, `title → headline`,
  `detailLead → body`;
- statistics index 0..3: `detailStats.N.value → items.N.title` and
  `detailStats.N.label → items.N.description`;
- assumption header: `assumptionsEyebrow → header.eyebrow`,
  `assumptionsTitle → header.title`,
  `assumptionsLead → header.description`;
- assumptions index 0..2: `assumptions.N.title → items.N.title` and
  `assumptions.N.description → items.N.description`.

Every binding above has `required:true`; every entry-field binding has
`transform:"text"`; none contains `fallback`. The required Aurora-only fields
are the detail eligibility seam. A non-Aurora entry fails
`detail_page_binding_missing_required`; the current runtime resolver returns no
document and the public route returns 404 before generating detail metadata or
body. The reference defines only Aurora's detail page, so no fallback detail
facts or SEO are permitted for Linea, Nova, Mono, Vista or Calm.
TASK-547-06's runtime suite pins `/projekty/aurora` to 200 with the exact
showcase metadata and pins `/projekty/linea`, `/projekty/nova`,
`/projekty/mono`, `/projekty/vista` and `/projekty/calm` to 404 with no project
detail body, title, description or canonical metadata leakage.

The document SEO is exactly:

```ts
{
  titlePattern: "{{ title }}",
  seo: {
    titlePattern: "{{ title }} — projekt pokazowy — FormaDom Studio",
    descriptionField: "seoDescription",
  },
}
```

The top-level pattern remains neutral document-title semantics; the runtime uses
`seo.titlePattern` first for public metadata. For the Aurora entry this resolves
to title
`Dom Aurora — projekt pokazowy — FormaDom Studio` and description
`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.`
Dynamic detail SEO belongs to this leaf. Static Page SEO belongs to
TASK-547-04-L01 and is not written here.

## Content Route and Settings Contract

The sole setting seed is exactly:

```ts
{
  key: "site.contentRoutes",
  desired: {
    value: [{
      type: "house-project",
      listPath: "/projekty",
      detailPath: "/projekty/:slug",
      enabled: true,
      detailPageId: { ref: "detail_page", key: "project-detail" },
    }],
  },
}
```

`type` is the literal content-type slug, not a ref or database ID. Only
`detailPageId` is a `PackageRef`; the installer resolves it to the native UUID
before `normalizeContentRoutes` persistence. `settingsContracts.ts` remains the
strict owner for the route object: plain-object prototype, exact string own
keys only, unique type, normalized list/detail paths, terminal `:slug`/`:id`
parameter, boolean `enabled` and optional UUID detail-page ID. This leaf pins
and tests only the exact generated literals `/projekty` and
`/projekty/:slug`, their normalizer round-trip, exact keys and exact ref
replacement. It does not change `contentRoutePaths.ts`, define a new general
path grammar or claim rejection beyond that owner's existing documented cases.

## Security Contract

No endpoint. Listing/detail reads are published-only. Query fields, filter
operators, detail binding source paths and the two generated route literals are
closed allowlists.
The card `href` binding is restricted to `data.cardHref`; L01 validates the only
two exact safe internal values and their fixture-key mapping. Unknown facets,
arbitrary CSS/URL/action values, non-exact refs and secret-like SEO/binding
fields fail closed. No media, remote URL, PII or secret is seeded. Before this
leaf may install the template, TASK-547-02-L02's full-site nested preflight must
reject unknown own keys in listing config, every field/condition/action,
empty-state and style object; `normalizeListingTemplateConfig` silently
selecting known keys is not sufficient strict validation.

## Implementation Pseudocode

```ts
export function buildProjectDiscoveryResources() {
  const contentRef = ref("content_type", HOUSE_PROJECT_RESOURCE_KEY);
  const detailRef = ref("detail_page", PROJECT_DETAIL_KEY);

  const template = {
    key: PROJECT_LISTING_TEMPLATE_KEY,
    desired: buildProjectCardsDesired(),
  };
  const query = {
    key: PROJECT_LISTING_QUERY_KEY,
    desired: buildPublishedProjectQueryDesired(contentRef, {
      sort: [
        { field: "data.referenceOrder", dir: "asc" },
        { field: "id", dir: "asc" },
      ],
      pagination: { limit: 24, offset: 0 },
    }),
  };
  const detail = {
    key: PROJECT_DETAIL_KEY,
    desired: buildProjectDetailDesired(contentRef),
  };
  const route = {
    key: "site.contentRoutes",
    desired: buildContentRouteSettingDesired(detailRef),
  };

  assertNoRelatedListingDependency(detail.desired);
  assertReferenceFilterOrder(PROJECT_CATEGORY_FILTERS);
  assertPersistedCategoriesImportedFromL01(PROJECT_CATEGORY_FILTERS);
  assertExactListingFields(template.desired, [
    ["title", "title"],
    ["description", "data.cardDescription"],
    ["href", "data.cardHref"],
  ]);
  assertNoItemActionsOrVisibleCta(template.desired);
  assertAllAuroraBindingsRequiredWithoutFallback(detail.desired);
  assertExactRegisteredDetailComposition(detail.desired);
  return {
    listingTemplates: [template],
    listingQueries: [query],
    detailPages: [detail],
    settings: [route],
  };
}
```

**Data flow:** L01 content ref and persisted categories → L02 public
label/presentation mapping → strict listing-template/query preflight and
normalizers → exact seven-block detail with required Aurora-only bindings/SEO →
strict content-route normalizer using a validation UUID → replace only the
allowlisted final `detailPageId` with its package ref → four strict resource
seeds. Runtime resolves required bindings before public metadata/render.

**Error handling:** throw stable generator/domain errors on unknown/reordered
filter value, `all` persisted as a category, non-exact content/detail ref,
unknown query field/operator, non-deterministic sort, malformed binding, missing
or reordered `data.cardHref` projection, missing or altered semantic `href`
binding, invented item action/CTA copy, optional/fallback Aurora binding, any
related dependency, wrong registered block/ID/props/gallery geometry, altered
exact route literal or route-normalizer failure. Direct non-Aurora detail
resolution must remain a not-found outcome, never a partial document. Do not
silently restore the old detail composition or infer all six destinations from
the detail route.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-discovery-resources.test.ts` to prove:

- exact filter order/labels and the four persisted category values;
- published-only query, exact projected fields including `data.cardHref`,
  `referenceOrder`/`id` sort, `{limit:24,offset:0}` and content-type ref;
- listing template exact `title`/semantic `description`/semantic `href` field
  objects including `conditions:[]`; no lifecycle status, item action or
  obsolete/invented visible fields;
- exact generated six-link fixture/template matrix, while runtime precedence and
  absence of `Zobacz szczegóły` stay in TASK-547-06's Bun/runtime suite;
- exact seven registered block IDs/types/variants/data, exact lead → art →
  statistics → CTA → assumptions → gallery order, required/no-fallback Aurora
  binding matrix, four stats, three assumptions and exact captionless/media-free
  grid-column art/gallery surfaces;
- absence of `related`, related block, computed `relatedItems` binding and any
  listing-query ref inside detail desired;
- neutral top-level `{{ title }}` plus exact dynamic SEO pattern/description
  resolution for `Dom Aurora`; fixture-level binding resolution proves Aurora
  has every required source and each other fixture is ineligible;
- exact route seed, list/detail matching, closed ref paths, deterministic JSON
  and no validation UUID/DB/media ID in the produced package slice.

Update `tests/unit/settings/contentRoutesValidation.test.ts` to retain its
existing owner-defined plain-object/exact-key/path/duplicate/UUID cases and add
the exact `/projekty` plus `/projekty/:slug` route round-trip used by this
setting branch. Do not broaden its path grammar from this leaf. The Bun file
remains independently runnable and below 1,000 lines.

## Sub-Tasks

- [ ] Correct canonical filters, listing card projection and deterministic query.
- [ ] Correct Aurora detail blocks, bindings and dynamic SEO; remove related
  listing behavior completely.
- [ ] Preserve strict `site.contentRoutes` normalization and add the exact route
  branch regression test.
- [ ] Rebaseline the focused discovery suite without weakening failure cases.

## Testing Requirements

- `bunx vitest run tests/vitest/kits/projekty-domow-discovery-resources.test.ts`;
- `bun test tests/unit/settings/contentRoutesValidation.test.ts`;
- targeted detail-binding/query/content-route suites selected by dependency
  shape; TASK-547-06 runs the Bun content-list precedence and six-slug public
  route/metadata integration with at least a 360-second timeout;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- physical line counts for all owned production/test files, each at most 1,000.

## Documentation Updates Required

Send the filter/query/detail/route recipe and dynamic SEO contract to TASK-547-06;
do not edit shared documentation from this leaf.
