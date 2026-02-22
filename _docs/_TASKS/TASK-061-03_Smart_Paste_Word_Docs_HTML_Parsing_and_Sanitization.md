# TASK-061-03: Smart Paste (Word/Docs/HTML) Parsing and Sanitization
# FileName: TASK-061-03_Smart_Paste_Word_Docs_HTML_Parsing_and_Sanitization.md

**Priority:** High  
**Category:** Core/Editor  
**Estimated Effort:** Large  
**Dependencies:** TASK-061-02  
**Status:** Done (2026-02-22)

---

## Overview
Zaimplementowac pipeline "smart paste" dla duzych tresci z Word/Docs/HTML, tak aby automatycznie mapowac dokument na czysty writing canvas.

## Scope
1. Wykrywanie rodzaju paste payload (`text/plain`, `text/html`).
2. Sanitizacja HTML (usuniecie Office/Docs noise i niebezpiecznych tagow/attrs).
3. Mapowanie struktur do writing nodes:
   - paragrafy,
   - naglowki,
   - listy,
   - quote,
   - inline formatowanie.
4. Budzety rozmiaru + graceful degradation dla bardzo duzych payloadow.
5. Error handling + user hint gdy cokolwiek zostalo odrzucone.

## Files to Create / Change
- `core/services/posts/editor/postPasteNormalizer.ts` (new)
- `core/services/posts/editor/postRichTextSanitizer.ts`
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx`
- `tests/unit/posts/post-paste-normalizer.test.ts` (new)
- `tests/integration/ui/post-editor-paste-from-word.test.tsx` (new)

## Pseudocode
```ts
onPaste(event):
  html = event.clipboardData.getData("text/html")
  text = event.clipboardData.getData("text/plain")

  result = normalizePastePayload({ html, text })
  if result.mode === "writing-canvas":
    mergeNodesIntoSelection(result.nodes)
    showToast(result.warnings)

normalizePastePayload(input):
  if html -> sanitizeHtml(html)
  stripOfficeArtifacts(["mso-", "o:p", "xmlns:v", ...])
  map DOM -> writing nodes
  fallback to plain paragraphs when unknown
```

## Acceptance Criteria
1. Wklejenie 2-3 stron tekstu tworzy czytelny writing canvas bez smieciowych styli.
2. Zachowane sa podstawowe struktury (heading/list/paragraph).
3. Brak XSS/unsafe HTML po paste.

## Testing Requirements
- Unit: parser, sanitizer, mapper.
- Integration UI: big-paste flow z Word-like HTML fixture.

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Validation Executed
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test`
  - Result: `1368 pass`, `149 skip`, `0 fail`

## Closure Notes
- Added deterministic smart-paste pipeline in `postPasteNormalizer`:
  - source detection (`text/html` vs `text/plain`),
  - Word/Docs artifact cleanup + sanitization,
  - mapping to writing-canvas nodes (`paragraph`, `heading`, `list`, `quote`),
  - size budgets and warnings (`truncated`, `fallback`, `unsupported markup removed`).
- Extended rich-text sanitizer with Office markup stripping helper:
  - `stripPostOfficeHtmlArtifacts`.
- Integrated smart paste in `PostRichTextAdapter`:
  - clipboard normalization before insertion,
  - safe insertion at cursor,
  - user-facing paste notices when payload is degraded.
- Added test coverage:
  - `tests/unit/posts/post-paste-normalizer.test.ts`,
  - `tests/integration/ui/post-editor-paste-from-word.test.tsx`.
