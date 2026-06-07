# TASK-403-01: Assistant Docs Only Corpus and Answer Quality
# FileName: TASK-403-01_Assistant_Docs_Only_Corpus_and_Answer_Quality.md

**Priority:** High
**Category:** Assistant + Docs
**Estimated Effort:** Medium
**Dependencies:** TASK-403
**Status:** Done (2026-06-04)

---

## Overview

Refresh the official `docs/guide` corpus used by the deterministic docs-only
assistant so routine administrator questions about Assistant Settings,
Integrations, setup, and admin orientation are answered from current product
docs without requiring LLM Guide mode.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `docs/guide/screens/assistant-settings.md` | Document the simplified Assistant Settings flow, automatic docs indexing, and Advanced support controls. |
| `docs/guide/screens/integrations.md` | Clarify encrypted provider key setup for OpenAI/OpenRouter. |
| `docs/guide/getting-started/site-setup-and-first-publish.md` | Add the assistant setup touchpoints to first-run guidance. |
| `docs/guide/getting-started/admin-orientation.md` | Explain where Assistant Settings and Integrations live in admin navigation. |

## Implementation Pseudocode

```ts
const answer = await answerAssistantQuestion({
  prompt,
  detailLevel,
  guideMode: "docs-only",
  retriever: docsDbRetriever,
});

expect(answer.sources).toEqual(expect.arrayContaining([
  expect.objectContaining({ path: expect.stringContaining("docs/guide/") }),
]));
```

Data flow:

- `docs/guide` markdown remains the source corpus.
- `docsDbRetriever` retrieves indexed chunks from the same corpus.
- `docsAnswerComposer` keeps deterministic composition and citation behavior.

Error handling:

- Do not document unshipped behavior as a workaround for missing runtime
  features.
- Keep docs copy explicit about when LLM Guide is optional versus required.

## Security Contract

- Endpoint visibility: no endpoints added or changed.
- Auth model: unchanged internal admin assistant behavior.
- RBAC: unchanged `settings:read` and assistant read access.
- CSRF: unchanged; this leaf does not add write routes.
- Rate-limit bucket: unchanged assistant bucket.
- Reject unknown validation: unchanged assistant payload validation.
- Anti-abuse: no public write endpoint, no nonce/signature/HMAC, no reCAPTCHA.
- Secret handling: docs must not include provider keys, session identifiers,
  CSRF tokens, or environment secret values.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
- Include this leaf in the parent targeted assistant Vitest lane.

## Validation Results

- Covered by parent validation:
  `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/openRouterProvider.test.ts tests/vitest/server/startupAssistantDocs.test.ts tests/vitest/server/startupMigrations.test.ts tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`
  passed, 9 files / 90 tests.

## Documentation Updates Required

- `docs/guide/screens/assistant-settings.md`
- `docs/guide/screens/integrations.md`
- `docs/guide/getting-started/site-setup-and-first-publish.md`
- `docs/guide/getting-started/admin-orientation.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1097-2026-06-04-task-403-assistant-docs-and-llm-guide-ux-repair.md`

## Acceptance Criteria

- Assistant Settings and Integrations user docs describe the final admin flow.
- Docs-only assistant retrieval remains deterministic and test-covered.
- The docs corpus does not leak provider credentials or operational secrets.
