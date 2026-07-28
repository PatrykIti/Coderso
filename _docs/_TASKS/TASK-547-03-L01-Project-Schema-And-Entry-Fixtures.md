# TASK-547-03-L01: Project Schema and Entry Fixtures
# FileName: TASK-547-03-L01-Project-Schema-And-Entry-Fixtures.md

**Parent Subtask:** TASK-547-03
**Priority:** High
**Category:** Reference Example / Content
**Estimated Effort:** Medium
**Dependencies:** TASK-547-02
**Status:** 🚧 In Progress
**Reopened:** 2026-07-23 — the existing generators must replace drifted project
facts with the exact designated-reference matrix before validation can resume.

## Overview

Own the strict `house-project` schema, six immutable source-derived fixtures and
their `{key, desired}` content-type/entry seeds. The installer creates lifecycle
resources as drafts and later publishes the explicit `published` target state.
This leaf does not edit Pages, forms, listings, detail documents or the L03
aggregate.

## Exact Ownership

This leaf is the sole writer for:

- `scripts/projekty-domow/json.ts`;
- `scripts/projekty-domow/content/constants.ts`;
- `scripts/projekty-domow/content/projectSchema.ts`;
- `scripts/projekty-domow/content/projectFixtures.ts`;
- `scripts/projekty-domow/content/buildProjectResources.ts`;
- `tests/vitest/kits/projekty-domow-project-fixtures.test.ts`.

It owns `HOUSE_PROJECT_RESOURCE_KEY = "house-project"` and the ordered category
vocabulary `HOUSE_PROJECT_CATEGORIES = ["barn", "villa", "single", "eco"]`.
Remove the obsolete energy-class vocabulary. Sibling leaves import these symbols
instead of redefining them. `scripts/projekty-domow/json.ts::cleanJsonObject`
remains the single strict JSON conversion helper for all generator slices; it
must reject non-JSON values rather than stringify them unpredictably.

## Designated-Reference Contract

Source: `_docs/projekty-domow-wow-site/projekty.html:55-72` and
`projekt-aurora.html:42-75`. The immutable fixture order and common fields are:

| `referenceOrder` | `key` / `slug` | `title` | `area` | `categories` | `cardDescription` | `cardHref` |
| ---: | --- | --- | ---: | --- | --- | --- |
| 0 | `aurora` | `Dom Aurora` | 142 | `["barn","eco"]` | `142 m² · stodoła · eko` | `/projekty/aurora` |
| 1 | `linea` | `Dom Linea` | 188 | `["villa"]` | `188 m² · miejska willa` | `/projekty` |
| 2 | `nova` | `Dom Nova` | 121 | `["single","eco"]` | `121 m² · parterowy` | `/projekty` |
| 3 | `mono` | `Dom Mono` | 156 | `["barn"]` | `156 m² · czarna elewacja` | `/projekty` |
| 4 | `vista` | `Dom Vista` | 206 | `["villa","eco"]` | `206 m² · willa z patio` | `/projekty` |
| 5 | `calm` | `Dom Calm` | 98 | `["single"]` | `98 m² · kompaktowy` | `/projekty` |

Every fixture has this exact `seoDescription`:

`Nowoczesne projekty domów, architektura indywidualna, wizualizacje i kompleksowy proces projektowy.`

Only Aurora carries the optional detail fields, with these exact values:

- `detailEyebrow`: `Projekt pokazowy`;
- `detailLead`:
  `Nowoczesna stodoła z wysoką strefą dzienną, dużym przeszkleniem od ogrodu i spokojną elewacją z drewna oraz grafitowej blachy.`;
- `detailStats`, in order:
  `{id:"area",value:"142 m²",label:"powierzchnia"}`,
  `{id:"bedrooms",value:"4",label:"sypialnie"}`,
  `{id:"bathrooms",value:"2",label:"łazienki"}`,
  `{id:"energy",value:"A++",label:"standard energii"}`;
- `assumptionsEyebrow`: `Założenia`;
- `assumptionsTitle`:
  `Dom ma być efektowny, ale bardzo prosty w codziennym życiu.`;
- `assumptionsLead`:
  `Układ rozdziela prywatną strefę sypialni od otwartego salonu, kuchni i jadalni. Główne przeszklenie kieruje uwagę na ogród.`;
- `assumptions`, in order:
  - `{id:"living-zone",title:"Strefa dzienna",description:"Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia."}`;
  - `{id:"private-zone",title:"Strefa prywatna",description:"Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy."}`;
  - `{id:"facade",title:"Elewacja",description:"Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników."}`.

The three IDs are non-rendered, stable structural identifiers introduced by the
native document model. They are not reference copy and must never become public
labels.

Linea, Nova, Mono, Vista and Calm omit all Aurora-only fields. They must not
receive extrapolated bedrooms, bathrooms, energy standard, assumptions, style,
storeys, rooms, zones or summary copy.

## Schema Contract

`projectSchema.ts` owns and exports one exact limits object used by schema,
fixture validation and boundary tests:

```ts
export const HOUSE_PROJECT_SCHEMA_LIMITS = {
  key: 64,
  slug: 64,
  title: 160,
  cardDescription: 240,
  seoDescription: 320,
  area: { min: 40, max: 500 },
  categories: { min: 1, max: 4 },
  referenceOrder: { min: 0, max: 5 },
  detailEyebrow: 80,
  detailLead: 1_000,
  detailStats: { count: 4, id: 64, value: 32, label: 80 },
  assumptionsEyebrow: 80,
  assumptionsTitle: 240,
  assumptionsLead: 1_000,
  assumptions: { count: 3, id: 64, title: 160, description: 500 },
} as const;
```

All numeric bounds are inclusive. Every bounded string is trimmed, non-empty
and limited by Unicode JavaScript string length. `HOUSE_PROJECT_SCHEMA` is
strict (`additionalProperties:false`) and requires the source-backed common
fields `cardDescription`, `cardHref`, `area`, `categories`, `referenceOrder`
and `seoDescription`.

- `cardHref`: exact safe internal enum `/projekty/aurora` or `/projekty`;
- `area`: finite number from 40 through 500;
- `categories`: one through four unique values from L01's exact four-value
  registry;
- `referenceOrder`: integer from 0 through 5;
- optional `detailStats`, when present, has exactly four strict objects;
- optional `assumptions`, when present, has exactly three strict objects.

Generator validation enforces the exact cross-field link matrix: Aurora alone
uses `/projekty/aurora`; Linea, Nova, Mono, Vista and Calm use `/projekty`.
It also enforces the owner invariant: Aurora must carry the complete detail
group with the exact four stat IDs and exact three structural assumption IDs,
and every other fixture must omit every detail-group property. Missing-all
Aurora detail, partial Aurora detail, a complete detail group on a different
fixture and one misplaced detail property all fail with stable generator error
codes. No schema property exists for the obsolete drifted fields
`summary`, `style`, `storeys`, `rooms`, `energyClass`, singular `category`,
`zones` or `visualLabel`.

The pure fixture validator pins these machine-readable codes:

- `house_project_key_duplicate`, `house_project_slug_duplicate` and
  `house_project_reference_order_invalid`;
- `house_project_category_invalid` and
  `house_project_category_duplicate`;
- `house_project_card_href_invalid` and
  `house_project_fixture_bounds_invalid`;
- `house_project_detail_owner_invalid` for missing-all Aurora detail or any
  detail property on a non-Aurora fixture;
- `house_project_detail_group_invalid` for partial detail, wrong cardinality,
  reordered/wrong structural IDs or malformed detail values.

## Strict JSON Contract

`cleanJsonObject` validates recursively before cloning/serialization. The root
and nested objects must be plain records with `Object.prototype` or a null
prototype and enumerable string own keys only. An array may own only its
intrinsic non-enumerable data `length` plus dense enumerable canonical indices
`0..length-1`; frozen descriptor flags are accepted, but holes, accessors,
symbols, noncanonical/extra string keys and any other non-enumerable key reject.
Accepted leaves are `null`, strings, booleans and finite numbers. Reject
`undefined`, functions, symbols, bigint, `NaN`, either infinity, cycles, `Date`,
custom prototypes, accessors, `toJSON`, symbol keys and non-enumerable object
keys. Every rejection, including native serialization failure, maps to
`projekty_domow_json_object_invalid`; never drop a value or coerce it with a
stringify-first pass.

## Security Contract

No endpoint. Fixtures contain no PII, secret, remote URL, database ID, media ID
or asset reference. Content type and entry desired payloads pass through their
native schema/normalizer owners and reject unknown data properties.

## Implementation Pseudocode

```ts
type ProjectFixture = {
  key: string;
  slug: string;
  title: string;
  cardDescription: string;
  cardHref: "/projekty/aurora" | "/projekty";
  area: number;
  categories: readonly ProjectCategory[];
  referenceOrder: number;
  seoDescription: string;
  detailEyebrow?: string;
  detailLead?: string;
  detailStats?: readonly ProjectDetailStat[];
  assumptionsEyebrow?: string;
  assumptionsTitle?: string;
  assumptionsLead?: string;
  assumptions?: readonly ProjectAssumption[];
};

export function validateProjectFixtures(
  fixtures: readonly ProjectFixture[]
): void {
  assertExactKeysSlugsAndOrders(fixtures);
  assertEveryBound(fixtures, HOUSE_PROJECT_SCHEMA_LIMITS);
  assertExactCardHrefMatrix(fixtures);
  assertUniqueCategories(fixtures, HOUSE_PROJECT_CATEGORIES);
  assertExactAuroraDetailOwner(fixtures, {
    key: "aurora",
    statIds: ["area", "bedrooms", "bathrooms", "energy"],
    assumptionIds: ["living-zone", "private-zone", "facade"],
  });
}

export function buildProjectResources() {
  assertDeepFrozen(PROJECT_FIXTURES);
  validateProjectFixtures(PROJECT_FIXTURES);

  return {
    contentTypes: [{
      key: HOUSE_PROJECT_RESOURCE_KEY,
      desired: cleanJsonObject(buildHouseProjectTypeDesired("published")),
    }],
    entries: PROJECT_FIXTURES.map((fixture) => ({
      key: fixture.key,
      desired: cleanJsonObject(normalizeProjectEntryDesired({
        fixture,
        contentTypeId: ref("content_type", HOUSE_PROJECT_RESOURCE_KEY),
        status: "published",
      })),
    })),
  };
}
```

**Data flow:** exact literal fixtures → deep freeze → duplicate/order/category
and exact detail-owner guards → exact bound checks → strict entry data
projection → native content schema validation → recursive plain-finite JSON
validation → deterministic clone → exact package seeds. Invalid-fixture tests
pass copied arrays to `validateProjectFixtures`; they never mutate the frozen
canonical export or mock its module.

**Error handling:** throw stable machine-readable generator errors for duplicate
key/slug/order, non-contiguous or wrong reference order, unknown/duplicate
category, an unsafe, remote or key-mismatched `cardHref`, missing common data,
partial detail group, schema failure, non-exact
content-type ref, non-published target or any DB/media/asset reference. Do not
coerce a bad fixture into a different source fact. Strict JSON errors always
surface as `projekty_domow_json_object_invalid`.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-project-fixtures.test.ts` to prove:

- the exact six-row matrix, order, titles, areas, categories, descriptions and
  card destinations;
- all six exact SEO descriptions and the complete exact Aurora detail object;
- exact four stat IDs and three non-rendered structural assumption IDs;
- Aurora must have the complete exact detail group and non-Aurora fixtures omit
  it; copied invalid arrays cover missing-all Aurora, partial Aurora,
  full-group-on-wrong-owner and one-field-on-wrong-owner with stable errors;
- the schema contains only the source-backed properties and rejects every
  obsolete field named above; `cardHref` accepts only the two exact internal
  enum values;
- every `HOUSE_PROJECT_SCHEMA_LIMITS` minimum/maximum and one-under/one-over
  boundary, including exact cardinalities four and three;
- category uniqueness, duplicate/order/card-link/detail-group guards and strict
  schema failure paths, including remote/unsafe and wrong-project link values;
- one published content type and six published entries, every entry carrying
  exactly `{ref:"content_type",key:"house-project"}`;
- direct `cleanJsonObject` success for dense/frozen arrays and recursive failure
  cases for nested undefined/function/symbol/bigint, non-finite numbers, sparse
  arrays, cycles, array extra enumerable/non-enumerable/noncanonical/symbol/
  accessor keys, object accessors/symbol/non-enumerable keys, `Date`, `toJSON`
  and custom prototypes;
- representative valid nested content-type/entry, listing/detail, form/slice and
  shell/Page-shaped objects retain deterministic bytes through the shared
  helper;
- round-trip/deterministic JSON, deep-frozen fixtures and absence of DB/media IDs.

## Sub-Tasks

- [ ] Correct constants, strict schema, fixture types and exact source values.
- [ ] Correct seed projection and strict JSON/ref/error guards.
- [ ] Rebaseline the focused Vitest suite to the intended reference contract
  without weakening behavioral assertions.

## Testing Requirements

- `bunx vitest run tests/vitest/kits/projekty-domow-project-fixtures.test.ts`;
- after L02 and L03 land, the aggregate gate runs
  `tests/vitest/kits/projekty-domow-package.test.ts`,
  `projekty-domow-discovery-resources.test.ts` and
  `projekty-domow-form-and-slice.test.ts` as real shared-JSON consumers; after
  TASK-547-04 lands, its shell/Page suites join the final family gate;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- physical line counts for every owned production/test file, all at most 1,000.

## Documentation Updates Required

Send the strict schema and six-row source matrix to TASK-547-06; do not edit
shared documentation from this leaf.
