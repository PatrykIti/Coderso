# TASK-547-03: Projekty Domów Content, Forms and Listings
# FileName: TASK-547-03-Projekty-Domow-Content-Forms-And-Listings.md

**Parent Task:** TASK-547
**Priority:** High
**Category:** Reference Example / Content Engine / Forms
**Estimated Effort:** Large
**Dependencies:** TASK-547-02
**Status:** ⏳ To Do

---

## Overview

Generate the reusable, data-driven part of the FormaDom package: project schema,
six entries, project listing/query/facets, dynamic detail document and route, and
a production contact form. Aurora is a seeded entry, not a duplicated static Page.

**Single-writer ownership:** new generator modules under
`scripts/projekty-domow/` for content/form/listing/detail resources and their
tests/fixtures. Do not edit Page document generator modules owned by TASK-547-04.

## Resource Contract

- `house-project` stable resource key and content type slug with bounded fields
  for summary, area, style, storeys, rooms, energy/category facets, assumptions,
  zones and abstract visual labels. This package seeds no CMS media IDs; safe
  Page `customSvg` plus detail registered-widget gradient/card composition
  provides the demo visuals.
- Six published entries: Aurora, Linea, Nova, Mono, Vista and Calm.
- One published listing template with three-column responsive cards.
- One saved listing query and generic facets for style/storeys/energy plus sort.
- One published detail document bound to the project content type and one enabled
  `/projekty/:slug` content route represented as the allowlisted
  `site.contentRoutes` SettingSeed owned by this resource slice.
- One published `project-brief` form: name, e-mail, stage, message, consent; one
  mandatory enabled native `success_message` action. E-mail/webhook/CRM stays a
  post-install configuration task.

## Security Contract

- No new endpoint; resources install through TASK-547-02.
- Public form uses existing Forms projection, nonce, `public_write` charge and
  optional reCAPTCHA policy.
- Form schemas reject unknown fields; action config contains no recipient secret,
  SMTP credential or webhook credential.
- Detail/listing runtime is published-only and uses native allowlisted binding,
  filter and URL contracts.
- Project data contains no customer PII.

## Implementation Pseudocode

```ts
export function buildFormaDomContentResources(): FullSitePackageResourcesSlice {
  const contentType = buildHouseProjectType();
  const entries = PROJECT_FIXTURES.map(buildProjectEntry);
  const listingTemplate = buildProjectCardTemplate();
  const listingQuery = buildProjectQuery(ref("content_type", contentType.key));
  const detailPage = buildProjectDetailPage({
    contentType: ref("content_type", contentType.key),
    relatedListingQuery: ref("listing_query", listingQuery.key),
  });
  const form = buildProjectBriefForm();
  return normalizeResourceSlice({
    contentTypes: [contentType],
    entries,
    listingTemplates: [listingTemplate],
    listingQueries: [listingQuery],
    detailPages: [detailPage],
    forms: [form],
    settings: [buildProjectContentRouteSetting(contentType, detailPage)],
  });
}
```

**Data flow:** immutable fixtures → domain-shaped payload builders → package refs
→ TASK-547-01 normalizer → installer.

**Error handling:** generator throws on duplicate slug/key, missing required
facet field, invalid detail binding, unexpected media ref, or unsafe action
config. Do not silently drop a project or form field.

**Regression-test shape:** exactly six unique projects; listing/query references
close; listing-template ref remains on the projects Page collection block owned
by TASK-547-04; Aurora detail bindings and related `listingQueryId` resolve; form
fields/action normalize; all resources
are published as intended; generated slice is deterministic and secret-free.

**Leaf land order:** `TASK-547-03-L01 → TASK-547-03-L02 → TASK-547-03-L03`.

## Sub-Tasks

- [ ] **TASK-547-03-L01** — project schema and six entry fixtures.
- [ ] **TASK-547-03-L02** — listing/query/facets/detail/content route.
- [ ] **TASK-547-03-L03** — real contact form/action and combined generator tests.

## Testing Requirements

- targeted Vitest generator/schema/detail/listing suites
- targeted Bun content/listing/detail/form runtime suites
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- touched-file line counts

## Documentation Updates Required

Provide the example resource-map/content-field documentation delta to TASK-547-06,
the sole shared-doc writer.
