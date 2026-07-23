# TASK-547-03-L02: Listing, Query, Detail and Content Route
# FileName: TASK-547-03-L02-Listing-Query-Detail-And-Content-Route.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Content Engine / Listings / Detail
**Estimated Effort:** Large
**Dependencies:** TASK-547-03-L01
**Status:** ⏳ To Do

## Overview

Own project listing template, saved query/facets, detail document/bindings and the
allowlisted `site.contentRoutes` SettingSeed.

## Security Contract

No endpoint. Published-only query/detail runtime, allowlisted fields/operators and
safe route patterns; no arbitrary URL/action/CSS.

## Implementation Pseudocode

```ts
export function buildProjectDiscoveryResources() {
  const template = buildProjectCards();
  const query = buildPublishedProjectQuery(ref("content_type", HOUSE_PROJECT_RESOURCE_KEY));
  const detail = buildProjectDetail(ref("content_type", HOUSE_PROJECT_RESOURCE_KEY), ref("listing_query", query.key));
  return { listingTemplates:[template], listingQueries:[query], detailPages:[detail],
    settings:[contentRouteSetting({
      type: HOUSE_PROJECT_RESOURCE_KEY,
      detailPageId: ref("detail_page",detail.key),
    })] };
}
```

Data flow: content ref → query/facets → detail bindings → settings-last route.
`site.contentRoutes.type` stores the literal content-type slug
`HOUSE_PROJECT_RESOURCE_KEY`; package validation cross-checks that it equals the
referenced content seed slug. Only `detailPageId` resolves to a UUID.
Reject unknown facet fields, unsafe route, invalid binding or missing related query.

Regression tests in
`tests/vitest/kits/projekty-domow-discovery-resources.test.ts`: refs/path
ownership, missing project-key ref rejection, published-only policy,
stored route `type === "house-project"` plus UUID `detailPageId`,
`/projekty/:slug`, Aurora binding and related listing-query round-trip.

## Sub-Tasks

- [ ] Build listing/query/facets/detail/route seeds.
- [ ] Add generator and native contract tests.

## Testing Requirements

Targeted Vitest plus Bun listing/detail runtime suites; core lint/types; line counts.

## Documentation Updates Required

Send route/query/detail recipe to TASK-547-06.
