# 517. TASK-117 assistant clarifying questions and section-aware docs answers

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-117

## Key Changes

### Assistant Answer Selection
- Docs-only assistant now chooses the most likely document/surface first and then the most useful section for the question intent.
- Capability questions now prefer `What Is It` and related workflow guidance instead of surfacing `Common Mistakes` or `Examples` as the primary answer.
- Location and procedural questions now prefer `Step By Step` evidence more aggressively.

### Clarification Path
- Added deterministic `clarifying_question` responses when the docs still leave multiple plausible product areas.
- `llm-rag` no longer bypasses this path; ambiguous docs-first answers stay conservative instead of escalating into a confident synthetic answer.

### Answer Readability
- Docs-only answers now prefer complete sentences over half-cut text where possible.
- Structured docs answers keep paragraph, numbered-step, and bullet-list formatting for cleaner rendering in the assistant surface.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
