# TASK-063-13-08: RichText Command Output Link Rendering Fixes QA Docs Closure
# FileName: TASK-063-13-08_RichText_Command_Output_and_Link_Rendering_Fixes_QA_Docs_Closure.md

**Priority:** High  
**Category:** Admin/UI + QA/Documentation  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-13-02, TASK-063-13-05, TASK-063-13-06, TASK-063-13-07  
**Status:** To Do

---

## Overview
Domknac problemy komend richtext i finalna walidacje:
1. brak surowych tagow (`<b>...</b>`) jako tekst na canvasie,
2. poprawny i czytelny UX linkow,
3. kompletna matryca testow unit/integration,
4. final docs/changelog/task board closure.

---

## Scope
1. Richtext command alias normalization (`b/i/div` i pokrewne).
2. Link insertion/edit UX dla selection collapsed/non-collapsed.
3. Wizualna prezentacja linkow na canvas.
4. Finalne quality gates + docs/changelog sync.

---

## Detailed File-Level Plan
1. `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
   - poprawic `link` command flow (selection-aware).
   - normalize command output zanim trafi do serialize.
2. `core/services/posts/editor/postRichTextSerializer.ts`
   - alias normalization + idempotent serialization.
3. `core/services/posts/editor/postRichTextSanitizer.ts`
   - stabilny anchor sanitize (href/title/target).
4. `tests/unit/posts/post-richtext-serializer.test.ts`
   - rozszerzyc coverage alias + link cases.
5. `tests/integration/ui/post-richtext-toolbar.test.tsx`
   - rozszerzyc assertions command outcomes.
6. `_docs/*`
   - task status closure + changelog.

---

## Pseudocode
```ts
function normalizeRichTextHtmlAliases(html: string): string {
  return html
    .replace(/<b(\s|>)/gi, "<strong$1")
    .replace(/<\/b>/gi, "</strong>")
    .replace(/<i(\s|>)/gi, "<em$1")
    .replace(/<\/i>/gi, "</em>")
    .replace(/<div(\s|>)/gi, "<p$1")
    .replace(/<\/div>/gi, "</p>");
}
```

---

## Acceptance Criteria
1. Brak surowych `<b>...</b>` i podobnych tagow jako tekst po uzyciu toolbar.
2. Link insertion nie dopisuje "golego URL obok" w mylacy sposob.
3. Linki sa wizualnie czytelne na canvasie.
4. Wszystkie wymagane testy i quality gates przechodza.
5. Task board, parity matrix i changelog sa zsynchronizowane.

---

## Testing Requirements
- Unit:
  - `tests/unit/posts/post-richtext-serializer.test.ts`
    - alias normalization and idempotency.
    - safe link sanitization and collapsed-selection insertion behavior (helper-level).
  - `tests/unit/posts/post-richtext-command-output.test.ts` (new)
    - command output canonicalization.
- Integration:
  - `tests/integration/ui/post-richtext-toolbar.test.tsx`
    - toolbar command flow, link visual behavior.
  - `tests/integration/ui/post-editor-canvas-shared.test.tsx`
    - formatted content renders visually, not escaped raw tags.
- Final gates:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test tests/unit tests/integration tests/perf tests/security`

---

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/<new-entry>.md`

