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
  - `Strefa dzienna` — `Salon z wysokim sufitem, wyjście na taras, kuchnia z wyspą i ukryta spiżarnia.`;
  - `Strefa prywatna` — `Sypialnia master z garderobą, trzy pokoje oraz kompaktowa strefa pracy.`;
  - `Elewacja` — `Drewno, grafit, ciepłe światło i proste detale bez zbędnych ozdobników.`

Linea, Nova, Mono, Vista and Calm omit all Aurora-only fields. They must not
receive extrapolated bedrooms, bathrooms, energy standard, assumptions, style,
storeys, rooms, zones or summary copy.

## Schema Contract

`HOUSE_PROJECT_SCHEMA` is strict (`additionalProperties:false`) and requires the
source-backed common fields `cardDescription`, `cardHref`, `area`, `categories`,
`referenceOrder` and `seoDescription`.

- `cardDescription`: non-empty bounded string;
- `cardHref`: exact safe internal enum `/projekty/aurora` or `/projekty`;
- `area`: finite number in the existing house-project safety range;
- `categories`: unique bounded array of the four frozen category values;
- `referenceOrder`: non-negative bounded integer;
- `seoDescription`: non-empty bounded string;
- Aurora detail strings: optional, non-empty and bounded;
- `detailStats`: optional array of at most four strict
  `{id,value,label}` objects;
- `assumptions`: optional array of at most three strict
  `{id,title,description}` objects.

Generator validation enforces the exact cross-field link matrix: Aurora alone
uses `/projekty/aurora`; Linea, Nova, Mono, Vista and Calm use `/projekty`.
It also enforces the optional Aurora detail group as complete when any member is
present. No schema property exists for the obsolete drifted fields
`summary`, `style`, `storeys`, `rooms`, `energyClass`, singular `category`,
`zones` or `visualLabel`.

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

export function buildProjectResources() {
  assertDeepFrozen(PROJECT_FIXTURES);
  assertExactKeysSlugsAndOrders(PROJECT_FIXTURES);
  assertExactCardHrefMatrix(PROJECT_FIXTURES);
  assertUniqueCategories(PROJECT_FIXTURES, HOUSE_PROJECT_CATEGORIES);
  assertCompleteOptionalDetailGroup(PROJECT_FIXTURES);

  return {
    contentTypes: [{
      key: HOUSE_PROJECT_RESOURCE_KEY,
      desired: cleanJsonObject(buildHouseProjectTypeDesired("published")),
    }],
    entries: PROJECT_FIXTURES.map((fixture) => ({
      key: fixture.key,
      desired: normalizeProjectEntryDesired({
        fixture,
        contentTypeId: ref("content_type", HOUSE_PROJECT_RESOURCE_KEY),
        status: "published",
      }),
    })),
  };
}
```

**Data flow:** exact literal fixtures → deep freeze → duplicate/order/category
and detail-group guards → strict entry data projection → native content schema
validation → `cleanJsonObject` → exact package seeds.

**Error handling:** throw stable machine-readable generator errors for duplicate
key/slug/order, non-contiguous or wrong reference order, unknown/duplicate
category, an unsafe, remote or key-mismatched `cardHref`, missing common data,
partial detail group, schema failure, non-exact
content-type ref, non-published target or any DB/media/asset reference. Do not
coerce a bad fixture into a different source fact.

## Regression Tests

Update `tests/vitest/kits/projekty-domow-project-fixtures.test.ts` to prove:

- the exact six-row matrix, order, titles, areas, categories, descriptions and
  card destinations;
- all six exact SEO descriptions and the complete exact Aurora detail object;
- non-Aurora fixtures omit Aurora-only data;
- the schema contains only the source-backed properties and rejects every
  obsolete field named above; `cardHref` accepts only the two exact internal
  enum values;
- category uniqueness, duplicate/order/card-link/detail-group guards and strict
  schema failure paths, including remote/unsafe and wrong-project link values;
- one published content type and six published entries, every entry carrying
  exactly `{ref:"content_type",key:"house-project"}`;
- round-trip/deterministic JSON, deep-frozen fixtures and absence of DB/media IDs.

## Sub-Tasks

- [ ] Correct constants, strict schema, fixture types and exact source values.
- [ ] Correct seed projection and strict JSON/ref/error guards.
- [ ] Rebaseline the focused Vitest suite to the intended reference contract
  without weakening behavioral assertions.

## Testing Requirements

- `bunx vitest run tests/vitest/kits/projekty-domow-project-fixtures.test.ts`;
- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- `git diff --check` for owned files;
- physical line counts for every owned production/test file, all at most 1,000.

## Documentation Updates Required

Send the strict schema and six-row source matrix to TASK-547-06; do not edit
shared documentation from this leaf.
