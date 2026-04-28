# TASK-179-05: Natural Prompt Fixtures and Live Provider Regression
# FileName: TASK-179-05_Natural_Prompt_Fixtures_and_Live_Provider_Regression.md

**Priority:** High
**Category:** QA/Assistant + Provider Integration
**Estimated Effort:** Large
**Dependencies:** TASK-179-01, TASK-179-02, TASK-179-03, TASK-179-04
**Status:** Done (2026-04-17)

---

## Overview

Add fixture and live provider tests for natural user prompts that do not use exact system terminology.

Baseline target prompts:

- `czy mozesz mi sprawdzic jakie ekrany customowe istnieja w admin ui?`
- `no a jakies sa opublikowane w sekcji 'Screens'?`
- `sprawdz menu Screens czy cos tam jest`
- English equivalents using `custom screens`, `admin UI`, `Screens section`, `visible`, `published`.

The test matrix must not focus only on `Screens`. It must include broader CMS language where users refer to product surfaces imprecisely:

- pages:
  - `czy widzisz strone Pysiek Mysiek?`
  - `sprawdz czy jest opublikowana strona kontakt`
  - `show pages visible in navigation`
- Engine/content types:
  - `jakie typy tresci sa w Engine?`
  - `czy istnieje model Products?`
  - `czy typ Orders ma jeszcze rekordy?`
- Entries/custom content:
  - `pokaz wpisy dla Products`
  - `czy sa rekordy w House Projects?`
  - `usun pierwszy rekord z tej listy` after an inspection candidate response.
- Relations between content:
  - `czy wpis Product ma relacje do kategorii?`
  - `sprawdz powiazane rekordy dla projektu House Projects`
  - relationship prompts must return inspection/needs-input until relation-aware mutation support is explicit.
- Forms:
  - `jakie formularze zbieraja leady?`
  - `czy formularz Lead Form jest publiczny?`
  - `zarchiwizuj ten formularz` after an inspection candidate response.
- Listings:
  - `jakie listing query sa dla produktow?`
  - `czy template Products Grid jest uzywany?`
  - `zmien limit tej query na 24` after exact target resolution.
- Menus and SEO:
  - `czy menu ma link Products?`
  - `sprawdz SEO dla strony Products`
  - `usun ten wpis SEO` after inspection.
- Widgets/templates:
  - `jakie szablony widgetow sa dostepne?`
  - `czy Hero Template jest opublikowany?`
  - widget block mutation prompts remain scoped to active/selected block contracts.

## Sub-Tasks

No child task files.

## Architecture

Tests should cover:

- local planner fallback,
- fake provider structured output,
- OpenRouter live provider,
- OpenAI live provider,
- UI interaction copy.
- follow-up prompts using prior candidates (`pierwszy`, `te dwa`, `ten formularz`, `ta strona`),
- unsupported relation/media mutations returning `needs_input`.

Live tests must remain opt-in and use only:

- `TEST_OPENROUTER_API_KEY`
- `TEST_OPENROUTER_MODEL`
- `TEST_OPENAI_API_KEY`
- `TEST_OPENAI_MODEL`

## Integration with Current Code

- Extend `tests/vitest/assistant/fixtures/cmsOperationFixtures.ts`.
- Extend `tests/vitest/assistant/provider-planner-fixtures.test.ts`.
- Extend live integration tests:
  - `assistant-openrouter-live.test.ts`
  - `assistant-openai-live.test.ts`
- Extend UI tests for inspection wording.
- Keep production provider settings/connectors untouched.

## Files to Change

- `tests/vitest/assistant/fixtures/cmsOperationFixtures.ts`
- `tests/vitest/assistant/cms-operation-fixtures.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`
- `tests/integration/routes/assistant-openai-live.test.ts`
- `tests/vitest/ui/assistant-panel.test.tsx`
- `tests/vitest/ui/assistant-panel-interaction.test.tsx`

## Acceptance Criteria

1. The three baseline Polish `Screens` prompts return custom-screen candidates in local/fake-provider tests.
2. Fixture matrix covers at least pages, Engine/content types, entries/custom content, relation-oriented prompts, forms, listings, menus, SEO, and widget templates.
3. OpenAI live smoke covers at least:
   - one `Screens` surface-hint prompt,
   - one page prompt,
   - one Engine/content-type prompt,
   - one form or listing prompt.
4. OpenRouter live smoke covers the same live prompt families as OpenAI.
5. Tests prove `Screens`, `Engine`, `Admin UI`, `menu`, and similar surface names are not treated as resource target names.
6. Tests prove `opublikowane`, `active`, `published`, and `widoczne/visible` map correctly per resource family.
7. Relation-oriented prompts return inspection or `needs_input` unless a safe relation action contract exists.
8. Follow-up prompts reuse previous candidates safely without bypassing target re-resolution.

## Security Contract

- Visibility: test-only.
- Auth model: no route mutation in live smokes; service-level provider injection.
- RBAC: route tests still cover permission behavior separately.
- CSRF: not applicable to service-level live tests.
- Rate-limit bucket: external provider limits only for opt-in live tests.
- Reject-unknown validation: provider output still passes strict schema.
- Anti-abuse: live tests do not dry-run or execute mutations.
- Secret handling: test API keys must not be serialized into plan output or logs.

## Testing Requirements

- Vitest local/fake-provider tests.
- Bun live provider smokes with env vars.
- UI interaction tests.
- Dedicated live prompt matrix for OpenAI/OpenRouter using the configured `.env` test model/API key pairs.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-04-17)

- Expanded OpenAI/OpenRouter live smokes into a natural prompt matrix covering Screens, Pages, Engine/content types, and Forms.
- Added resolver regression coverage for surface-only read queries and custom-screen/page/form filters.
- Live OpenAI and OpenRouter matrix tests passed with `.env` test credentials and selected models.
