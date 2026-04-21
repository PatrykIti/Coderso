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

## Required Mabudo-Like Fixture

Add a canonical fixture for a prompt such as:

```text
Zrob mi strone jak Mabudo: katalog projektow domow z filtrami,
kartami, stronami szczegolowymi, formularzem zapytania, realizacjami,
poradnikiem, menu i wygodna edycja w adminie.
```

The expected resource graph must include:

- standard pages:
  - home,
  - about,
  - contact,
  - house-project listing page,
  - realization/case-study listing page when selected,
- posts/editorial hub when the prompt asks for poradnik/blog guidance,
- content types:
  - house projects,
  - project categories or collections,
  - realizations/case studies when selected,
- sample entries for generated content types when fixture mode asks for seeded
  examples,
- relations:
  - project -> category/collection,
  - project -> related projects,
  - project -> realization/case study when selected,
- custom screens:
  - admin screen for house project records,
  - admin screen for related case studies when selected,
- listings:
  - published house-project query,
  - card template for project cards,
  - filters/facets for area, rooms, price/status/style/category where present,
- detail pages:
  - canonical `detail_page_documents` entry linked from the
    `/projekty-domow/:slug` content route through `detailPageId`,
  - bindings for title, hero image, gallery, area, rooms, floors, price/status,
    CTA/form context, related projects,
- forms:
  - project inquiry form using existing public form hardening,
  - contact form if contact page is generated,
- menus:
  - main menu with generated public pages,
  - footer menu with generated public pages,
- widget templates or reusable sections:
  - hero,
  - CTA,
  - FAQ/proof/testimonial sections when selected,
- SEO/routes:
  - SEO docs or patterns for generated pages and detail pages,
  - content routes with list and detail route patterns,
- collection workspace:
  - one workspace linking canonical resources plus linked secondary resources
    for model, entries, list page, detail template, filters/cards, forms,
    admin screen, SEO, routes, and preview,
- no duplicate resources on rerun.

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
  - Mabudo-like rerun that tries to create duplicate collection resources.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md`
