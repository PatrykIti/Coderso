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

Own the native project listing template, published-only saved query, canonical
category-filter vocabulary, Aurora detail document/bindings and the allowlisted
`site.contentRoutes` setting seed. Provide only
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
suite `tests/integration/runtime/projekty-domow-detail-route.test.ts`; do not grow
the large installed-site suite with those scenarios.

## Listing and Facet Contract

Source: `_docs/projekty-domow-wow-site/projekty.html:38-73`.

`projectListing.ts` owns and exports the canonical ordered public filter values:

```ts
export const PROJECT_CATEGORY_FILTERS = [
  { value: "all", label: "Wszystkie" },
  { value: "barn", label: "Nowoczesna stodoła" },
  { value: "villa", label: "Wille" },
  { value: "single", label: "Parterowe" },
  { value: "eco", label: "Energooszczędne" },
] as const;
```

`all` means the empty/no-filter state and is never persisted in an entry's
`categories`. The effective native category facet uses `data.categories` and
only the remaining four options in the same order. TASK-547-04 imports this
constant for the projects Page; it does not retype the values or labels.

The `published-projects` query contract is:

- source `entries` with
  `contentTypeId:{ref:"content_type",key:"house-project"}`;
- `includeDrafts:false` and an explicit `status == published` filter;
- sort `[data.referenceOrder asc, id asc]`;
- bounded pagination large enough for the six fixtures, never unbounded;
- projected fields `id`, `title`, `slug`, `data.cardDescription`, `data.area`,
  `data.categories`, `data.referenceOrder`, and `data.cardHref` only.

The `project-cards` listing template displays the entry title and exact
`data.cardDescription`. It also contains the semantic field binding
`{key:"href",source:"data.cardHref",label:null,fallback:null,format:"text"}`.
The binding is not a visible CTA: it supplies the card anchor destination and,
by the native resolver contract, takes priority over generic content-route
fallback. Its exact source matrix is Aurora → `/projekty/aurora`; Linea, Nova,
Mono, Vista and Calm → `/projekty`, matching `projekty.html:55-72`. The template
must not display obsolete style/storey/room/energy badges, an invented visible
CTA, a media field or an invented card fact. It has no lifecycle status field
or item action. Neutral native empty/error/accessibility state copy is allowed,
but it must not claim a FormaDom fact absent from the reference.

## Aurora Detail Contract

Source: `_docs/projekty-domow-wow-site/projekt-aurora.html:4-7,38-76`.

The `project-detail` document is a published target created draft-first by the
installer. It references only
`{ref:"content_type",key:"house-project"}`; it has no listing-query reference,
`related` source, related-project block or computed `relatedItems` binding.

Its source-backed public composition is:

1. back link `← Wróć do projektów`, eyebrow bound from `detailEyebrow`, H1 bound
   from entry `title`, lead bound from `detailLead`, and CTA
   `Chcę podobny dom` to `/kontakt`;
2. four statistics bound in source order from `detailStats`, including both
   values and labels;
3. assumption eyebrow/title/lead plus three cards bound in source order from
   `assumptions` titles and descriptions;
4. exactly three abstract gallery cards, matching the source's tall/default/warm
   sequence through native layout/style vocabulary, with no caption, remote
   image, media ID or asset ID.

Use registered detail/Page blocks only. Native block separation of statistics
from the hero is an allowed structural approximation; public strings and facts
remain exact. Static block defaults for entry-bound public copy are empty so a
missing field never leaks Aurora data into another entry. The reference defines
only Aurora's detail page; tests must not invent detail facts for the other five
entries.

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
strict owner for the route object: plain-object prototype, exact string own keys
only, unique type, normalized safe list/detail paths, terminal `:slug`/`:id`
parameter, boolean `enabled` and optional UUID detail-page ID. It rejects custom
prototypes, symbol/non-enumerable unknown keys, duplicate types, unsafe paths and
invalid IDs with `settings_value_invalid`.

## Security Contract

No endpoint. Listing/detail reads are published-only. Query fields, filter
operators, detail binding source paths and route patterns are closed allowlists.
The card `href` binding is restricted to `data.cardHref`; L01 validates the only
two exact safe internal values and their fixture-key mapping. Unknown facets,
arbitrary CSS/URL/action values, non-exact refs and secret-like SEO/binding
fields fail closed. No media, remote URL, PII or secret is seeded.

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
  assertListingHrefBinding(template.desired, {
    key: "href",
    source: "data.cardHref",
  });
  return {
    listingTemplates: [template],
    listingQueries: [query],
    detailPages: [detail],
    settings: [route],
  };
}
```

**Data flow:** L01 content ref and categories → strict listing-template/query
normalizers → exact native detail blocks/bindings/SEO → strict content-route
normalizer using a validation UUID → replace only the allowlisted final
`detailPageId` with its package ref → four strict resource seeds.

**Error handling:** throw stable generator/domain errors on unknown/reordered
filter value, `all` persisted as a category, non-exact content/detail ref,
unknown query field/operator, non-deterministic sort, malformed binding, missing
or reordered `data.cardHref` projection, missing or altered semantic `href`
binding, invented item action, Aurora source binding, any related dependency,
wrong gallery count, unsafe route or route-normalizer failure. Do not silently
restore the old detail composition or infer all six destinations from the detail
route.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-discovery-resources.test.ts` to prove:

- exact filter order/labels and the four persisted category values;
- published-only query, exact projected fields including `data.cardHref`,
  `referenceOrder`/`id` sort and content-type ref;
- listing template title/card-description fields plus the exact semantic
  `href ← data.cardHref` binding; no lifecycle status, item action or
  obsolete/invented visible fields;
- exact resolved card-link matrix (Aurora detail; the other five listing) and
  proof that the explicit field binding wins over generic detail-route fallback;
- exact detail block order, exact Aurora bindings, four stats, three assumptions
  and exactly three captionless/media-free gallery cards;
- absence of `related`, related block, computed `relatedItems` binding and any
  listing-query ref inside detail desired;
- neutral top-level `{{ title }}` plus exact dynamic SEO pattern/description
  resolution for `Dom Aurora`;
- exact route seed, list/detail matching, closed ref paths, deterministic JSON
  and no validation UUID/DB/media ID in the produced package slice.

Update `tests/unit/settings/contentRoutesValidation.test.ts` to retain all
plain-object/exact-key/path/duplicate/UUID failure cases and add the exact
`house-project` route round-trip used by the `site.contentRoutes` setting branch.
The Bun file remains independently runnable and below 1,000 lines.

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
  shape; DB/runtime integration stays with TASK-547-06 and uses at least a
  360-second timeout;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- physical line counts for all owned production/test files, each at most 1,000.

## Documentation Updates Required

Send the filter/query/detail/route recipe and dynamic SEO contract to TASK-547-06;
do not edit shared documentation from this leaf.
