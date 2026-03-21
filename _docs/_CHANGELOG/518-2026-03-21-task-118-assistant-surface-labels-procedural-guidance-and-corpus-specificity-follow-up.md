# 518. TASK-118 assistant surface labels procedural guidance and corpus specificity follow-up

**Date:** 2026-03-21  
**Version:** 0.1.0  
**Tasks:** TASK-118, TASK-118-01, TASK-118-02, TASK-118-03

## Key Changes

### Assistant Surface Labels
- Docs-only answers now label the canonical document/module surface instead of echoing the chosen section heading like `Examples` or `What Is It`.
- Assistant evidence now carries enough doc metadata to keep user-facing labels aligned with the real product surface.

### Procedural Guidance
- Procedural `how/use` questions now prefer `Step By Step` guidance more aggressively.
- Low-signal token overlap such as `use` is no longer enough to let `When To Use` dominate an otherwise actionable procedural query.

### Corpus Specificity
- Canonical widgets docs now include explicit Hero visual settings guidance for colors, spacing, and background via the Visual tab.
- Canonical engine docs now include a clearer operational usage path so `how can I use engine?` resolves to a more actionable answer.

### Validation
- Passed:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - `bun test tests/unit/assistant/assistantService.test.ts`
  - `bun test tests/integration/routes/assistant.test.ts`
