# TASK-057-03: Rich Text Engine and Text Formatting Capabilities
# FileName: TASK-057-03_Rich_Text_Engine_and_Text_Formatting_Capabilities.md

**Priority:** High  
**Category:** Editor UX  
**Estimated Effort:** Large  
**Dependencies:** TASK-057-02  
**Status:** Done (2026-02-21)

---

## Goal
Zapewnic "prosty, ale bogaty" edytor tekstu w blokach posta.

## Scope
1. Dodac lekki engine rich text (`contentEditable`) opakowany w lokalny adapter i toolbar.
2. Wspierac podstawowe i rozszerzone formatowanie:
   - inline marks: bold, italic, underline, strike, inline code, link, highlight,
   - block formatting: paragraph, headings H2-H6, bullet/ordered list, quote, code block,
   - alignment: left/center/right,
   - clear formatting.
3. Dodac skroty klawiaturowe i toolbar kontekstowy.
4. Utrzymac output w bezpiecznym, serializowalnym formacie.

## Files to Create / Change
- `core/admin/ui/posts/editor/richtext/PostRichTextAdapter.tsx` (new)
- `core/admin/ui/posts/editor/richtext/PostRichTextToolbar.tsx` (new)
- `core/services/posts/editor/postRichTextSchema.ts` (new)
- `core/services/posts/editor/postRichTextSerializer.ts` (new)
- `core/services/posts/editor/postRichTextSanitizer.ts` (new)
- `tests/unit/posts/post-richtext-serializer.test.ts` (new)
- `tests/integration/ui/post-richtext-toolbar.test.tsx` (new)

## Pseudocode
```tsx
PostRichTextAdapter({ value, onChange, mode }):
  editor = createEditor(schema, extensions)
  toolbar = mode === "simple" ? BASIC_TOOLS : BASIC_PLUS_ADVANCED
  onEditorChange -> serialized = serializeToEditorJson(editor.state)
                  -> onChange(serialized)

sanitizeRichText(json):
  removeDisallowedNodes()
  removeDisallowedMarks()
  normalizeLinks()
  capDepthAndLength()
```

## UX Contract
- Domyslnie widoczny prosty toolbar (najczestsze akcje).
- Przycisk `More formatting` pokazuje zaawansowane opcje.
- Wsparcie skrotow: `Cmd/Ctrl+B`, `Cmd/Ctrl+I`, `Cmd/Ctrl+K`, `Shift+Alt+5` (quote), etc.

## Acceptance Criteria
1. Uzytkownik moze komfortowo pisac dluzsze artykuly bez opuszczania edytora.
2. Wszystkie opcje formatowania sa przewidywalne i odtwarzalne po zapisie.
3. Output rich text przechodzi sanitizacje i walidacje.
4. Testy pokrywaja serializacje, sanitizacje i kluczowe akcje UI.
