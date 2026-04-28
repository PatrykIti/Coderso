# TASK-118-01: Assistant Doc Metadata Propagation and Surface Label Fix
# FileName: TASK-118-01_Assistant_Doc_Metadata_Propagation_and_Surface_Label_Fix.md

**Priority:** High  
**Category:** Assistant/Core  
**Estimated Effort:** Small  
**Dependencies:** TASK-118  
**Status:** Done (2026-03-21)

---

## Overview

Naprawic user-facing `surface` label w docs-only answer tak, aby pokazywal nazwe
kanonicznego dokumentu / modulu (`Coderso Widgets and Template Editor`,
`Coderso Engine and Schema Builder`), a nie pierwszy heading sekcji
(`Examples`, `What Is It`).

---

## Sub-Tasks

1. Propagowac `docTitle` / metadata dokumentu do assistant chunk/hit contract.
2. Oprzec `Most likely surface` / `Most relevant surface` o metadata dokumentu,
   nie o `headingPath[0]`.
3. Dolozyc testy dla labelu surface na composer level.

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

- Added `docTitle` / `productArea` propagation into assistant chunks so answer
  composition can use canonical document metadata.
- Surface labels in docs-only answers now show the module/document title instead
  of section names like `Examples` or `What Is It`.
