# 519. TASK-119 assistant multi-level docs and progressive follow-up flow

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-119, TASK-119-01, TASK-119-02, TASK-119-03, TASK-119-04, TASK-119-05

## Key Changes

### Multi-Level Assistant Contract
- Added explicit docs-only depth model: `basic`, `medium`, `instruction`, `advanced`.
- Added helper guidance modes: `troubleshooting`, `decision_guide`, `checklist`, `security`.
- Extended assistant response payload with `detailLevel`, `guideMode`, and deterministic `followUpOptions[]`.

### Retrieval and Composer
- Updated section inference/scoring in retriever and composer to prefer level/mode-aligned sections over generic overlap.
- Added compatibility aliases so both legacy headings and new multi-level headings can be consumed safely.
- Kept conservative clarification behavior when product-surface ambiguity remains high.

### API and Admin UI
- `POST /assistant/chat` now accepts optional `detailLevel` and `guideMode`.
- Assistant chat UI now renders progressive follow-up chips and sends typed depth/mode continuation requests.
- Added route/service/UI tests for depth/mode forwarding and follow-up rendering.

### Docs Corpus and Authoring
- Replaced docs template contract with multi-level sections plus helper sections.
- Updated docs README with intent-to-section mapping for deterministic authoring.
- Enriched high-traffic assistant docs (`widgets`, `engine`, `entries`, `posts`, `commerce`, `booking`, and integrations settings) with detailed multi-level content.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/assistant/docsIngestService.test.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/admin/assistantClient.test.ts`
  - `bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
