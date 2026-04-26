# TASK-190-08-01: Composition Fixture Matrix and Red-Team Corpus
# FileName: TASK-190-08-01_Composition_Fixture_Matrix_and_Red_Team_Corpus.md

**Priority:** High
**Category:** QA + Assistant Evaluation
**Estimated Effort:** Medium
**Dependencies:** TASK-190-07
**Status:** To Do

---

## Overview

Add fixture and red-team coverage for mixed blueprint composition.

## Sub-Tasks

No child task files.

## Files to Change

- Add `tests/vitest/assistant/fixtures/blueprintCompositionFixtures.ts`
- Add `tests/vitest/assistant/blueprint-composition-fixtures.test.ts`
- Add `tests/integration/assistant-live/blueprintCompositionLiveMatrix.test.ts`

## Fixture Categories

- single primary only,
- Mabudo-like house-project catalog composition,
- primary + lead capture,
- primary + portfolio proof,
- primary + editorial hub,
- primary + gated booking,
- primary + multiple adjuncts,
- conflict cases,
- provider injection cases.
- media add/replace/remove cases for existing gallery assets and attached-file
  prompts.
- server-derived resource catalog and LLM-availability gate cases.

## Required Mabudo-Like Fixture

Add a canonical fixture for a prompt such as:

```text
Zrob mi strone jak Mabudo: katalog projektow domow z filtrami,
kartami, stronami szczegolowymi, formularzem zapytania, realizacjami,
poradnikiem, menu i wygodna edycja w adminie.
```

The Mabudo-like contract must be staged by implementation wave so fixtures do
not demand end-state resources before the owning seams exist.

The fixture must use `_docs/_PROMPTS/mabudo-like-prompt.md` as the repo-local
source example for the business shape. It should prove the assistant can move
toward a Mabudo-like site through reusable capabilities: house-project catalog,
rich project fields, filters, cards, detail pages, forms, proof/editorial
sections, menu/SEO, and media placement, not through a hardcoded one-off
`mabudo` preset.

Required fixture tiers:

- Tier A: current pack parity
  - house-project content type,
  - current base fields such as title, slug, summary, description, hero image,
    gallery, area, rooms, bathrooms, floors, priceFrom, location, and status,
  - dedicated house-project custom screen,
  - house-project listing query filtering published entries,
  - card/listing template,
  - public house-project landing page,
  - content route with list/detail patterns,
  - no duplicate resources on rerun.
- Tier B: adjunct composition waves
  - reusable Mabudo-like field fragments for project code, project price,
    start/plus/finish package prices, house type/floors enum, style, roof type,
    garage enum, construction technology, delivery time, energy level,
    isPromoted, isNew, and displayOrder,
  - listing facet/card fragments for area, rooms, floors, style, roof, garage,
    project price, package prices, technology, and energy level,
  - richer catalog cards showing project code, bathrooms/floors/roof/garage and
    package/project prices when those fields are enabled,
  - inquiry/contact forms only when the corresponding adjunct/page-composition
    leaves are in scope,
  - editorial hub / proof / case-study resources only when the corresponding
    adjunct capability and page/admin leaves are enabled,
  - menus and SEO expectations only when the corresponding action/composition
    leaves are enabled for that fixture tier,
  - supporting public pages such as `about` / `contact` only when a specific
    page-composition leaf adds them through existing page ownership, not as a
    blanket expectation for every early Mabudo fixture.
- Tier C: detail-page wave
  - canonical `detail_page_documents` entry linked from the
    `/projekty-domow/:slug` content route through `detailPageId`,
  - bindings for title, hero image, gallery, area, rooms, floors, price/status,
    CTA/form context, related projects,
  - detail-page preview/runtime assertions only after the detail-page owner
    leaves land.
- Tier D: collection workspace wave
  - one workspace linking canonical resources plus linked secondary resources
    for model, entries, list page, detail template, filters/cards, forms,
    admin screen, SEO, routes, and preview,
  - workspace assertions only after the bounded read-model/admin-context leaves
    land.
- Tier E: media and existing-resource wave
  - prompt variants where the user selects existing media-library assets and asks
    the assistant to place them in hero/gallery/card/widget/content fields,
  - add/replace/remove media-reference assertions for entries and page/widget
    blocks, with asset deletion staying out of scope unless an explicit media
    delete action exists,
  - attached-file prompt variants returning a gated media-import prerequisite or
    `needs_input` until trusted media ids exist,
  - no raw media bytes, base64 payloads, signed/private URLs, upload tokens, or
    client-authored media metadata in provider/action payloads.

Relation expectations must also stay owner-aligned:

- relation behavior is asserted as content-schema field metadata on generated
  content types when the relevant schema-merge leaf is in scope,
- do not model or assert `relation` as a standalone blueprint resource node.

Optional seeded-example coverage:

- sample entries for generated content types are asserted only in fixture modes
  that explicitly exercise seeding/draft-generation leaves.
- seeded examples with media references assert trusted media ids only; they do
  not embed uploaded file payloads into action fixtures.

Server-context coverage:

- fixtures that request resource reuse must use the reviewed
  `includeResourceCatalog` path and server-derived catalog injection,
- request-schema red-team cases must reject client-supplied
  `context.resourceCatalog`,
- LLM-unavailable cases must block catalog-backed/site-kit planning through the
  existing assistant unavailable error instead of silently composing without
  catalog context,
- content-type delete fixtures must include a content type with linked
  `detail_page_documents` and assert `content_type_has_detail_pages`.

The fixture should assert resource keys and action types, not brittle generated
copy. Text copy may be asserted only for stable product labels.

## Pseudocode

```ts
test.each(blueprintCompositionFixtures)(fixture.name, async () => {
  const plan = planAssistantActions(fixture.input);
  expect(plan.status).toBe(fixture.expected.status);
  expect(plan.actions.map((action) => action.type)).toEqual(fixture.expected.actions);
});
```

## Security Contract

- Visibility: tests only.
- Auth model: no runtime changes.
- RBAC: fixtures assert permission requirements where relevant.
- CSRF: no route changes.
- Rate-limit bucket: no route changes.
- Reject-unknown validation: red-team provider drafts reject unknown payloads.
- Anti-abuse: test provider action injection and duplicate resource spam.
- Secret handling: no secrets in fixture data.

## Testing Requirements

- Vitest fixtures.
- Bun live matrix with OpenAI/OpenRouter when env is configured.
- Red-team prompts:
  - provider action array,
  - SQL/path injection,
  - secret field request,
  - destructive mixed prompt,
  - duplicate slug request,
  - Mabudo-like prompt with provider-supplied executable actions,
  - Mabudo-like rerun that tries to create duplicate collection resources,
  - prompt that supplies `context.resourceCatalog` from the client,
  - prompt that asks to upload raw media bytes through provider/actions,
  - prompt that asks to attach an ambiguous media filename without a trusted id,
  - prompt that asks to delete a content type that still owns detail pages.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
