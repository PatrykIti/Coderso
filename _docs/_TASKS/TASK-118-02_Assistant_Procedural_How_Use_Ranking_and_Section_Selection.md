# TASK-118-02: Assistant Procedural How/Use Ranking and Section Selection
# FileName: TASK-118-02_Assistant_Procedural_How_Use_Ranking_and_Section_Selection.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Small  
**Dependencies:** TASK-118  
**Status:** Done (2026-03-21)

---

## Overview

Poprawic ranking i composer dla pytan proceduralnych typu `how can I use ...`,
zeby preferowaly `Step By Step` jako primary guidance, a `What Is It` /
`When To Use` jako supporting context tylko wtedy, gdy pomaga to answer quality.

---

## Sub-Tasks

1. Wzmocnic procedural priors w retrieverze dla `Step By Step`.
2. Ograniczyc dominacje `When To Use` w pytaniach `how/use`.
3. Dolozyc procedural answer shaping: `Step By Step` jako primary, `What Is It`
   lub `When To Use` jako short supporting context.
4. Dolozyc test dla `how can i use engine?`.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run vitest run tests/vitest/assistant/docsAnswerComposer.test.ts tests/vitest/assistant/docsDbRetriever.test.ts`

---

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_GUIDE.md`

---

## Completion Notes (2026-03-21)

- Reduced the impact of low-signal procedural token `use` on section ranking.
- Strengthened `Step By Step` priors for `how/use` questions and moved
  procedural answer composition toward action-first output with supporting
  context only when helpful.
