# TASK-183: Assistant Page Title Search Filtering
# FileName: TASK-183_Assistant_Page_Title_Search_Filtering.md

**Priority:** High
**Category:** Assistant/Core + Target Resolution
**Estimated Effort:** Small
**Dependencies:** TASK-179-03, TASK-180, TASK-182
**Status:** Done (2026-04-18)

---

## Overview

Fix `LLM Guide` page search so read-only title/name queries do not return every page from the surface.

Observed flow:

1. User asks: `znajdz wszystkie opublikowane strony ktore maja w nazwie / tytule slowo 'test'`.
2. Live provider returns a CMS inspection draft with page surface context and a text query such as `test-page OR test2 OR test`.
3. Resolver treats the query as a surface-only read and returns every published page, including `home` and unrelated catalog pages.

The resolver must distinguish real search terms from surface-only phrases such as `widoczne w sekcji Screens`.

## Sub-Tasks

No child task files.

## Files Changed

- `core/services/assistant/cmsTargetResolver.ts`
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/integration/routes/assistant-openai-live.test.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: unchanged; resolver filters already-authorized catalog summaries.
- CSRF: unchanged assistant planning route.
- Rate-limit bucket: existing `assistant`.
- Reject-unknown validation: unchanged strict CMS operation draft schema.
- Anti-abuse: broad surface-only read fallbacks remain read-only; destructive flows still require reviewed typed actions.
- Secret handling: resolver reads only bounded resource summaries and never provider keys, cookies, CSRF tokens, form submissions, or secret-bearing payloads.

## Testing Requirements

- Vitest:
  - `targetQuery.text` with OR search terms returns only matching pages.
  - read-only `exactName: "test"` can perform safe partial matching for inspection/find.
  - surface-only text still returns visible candidates for broad surface prompts.
- Live provider:
  - OpenAI and OpenRouter natural prompt matrix covers the published page title search and asserts unrelated pages are excluded.
- Validation:
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
  - `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openai-live.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Completion Notes (2026-04-18)

- `targetQuery.text` now supports OR-style search term matching instead of forcing the full OR string as one target.
- Surface-only read fallback is limited to actual surface/visibility wording and no longer hijacks search phrases.
- Read-only `exactName` inspection can safely fall back to partial matching when no exact title/slug match exists.
- OpenAI/OpenRouter live matrices now cover the `test` page-title search and reject unrelated published pages.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant-openai-live.test.ts tests/integration/routes/assistant-openrouter-live.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
