# 312 - TASK-061-09 Post Editor Silent Save and Preview Without Hydrate Reload

- **Date:** 2026-02-23
- **Version:** 1.0.0
- **Tasks:** TASK-061, TASK-061-09

## Key Changes

### Admin/UI
- Post editor draft save flow dostal tryb `silent sync`:
  - autosave nie wykonuje juz `hydrate` reducera po zapisie,
  - save-before-preview nie resetuje canvasu i selekcji podczas otwierania runtime preview.
- Dodano kontrakt sync mode (`silent | hydrate`) w hooku editora, z domyslnym `silent` dla flow authoring.

### Editor State
- Dodano helper snapshotu save-sync, ktory aktualizuje baseline (`baseData`, metadata signature, saved timestamp) bez przepinania lokalnego dokumentu.
- Full hydrate pozostaje tylko dla refresh/revision restore paths.
- Naprawiono trigger refresh hooka:
  - dirty-state jest czytany z ref, a nie z dependency callbacku,
  - wyeliminowano przypadki losowego `Loading post editor...` po kolejnych paste/preview sekwencjach.

### Validation + Smart Paste Follow-up
- Autosave/metadata schema dla posts akceptuje nullable SEO fields (`title`, `description`, `canonicalUrl`, `robots`), co usuwa bledy `validation_error` przy pustych wartosciach SEO.
- Smart paste rozszerzono o Word heading normalization:
  - `<h1>` z payloadu jest mapowane do `heading(level=1)`,
  - heading-like paragrafy Word (`MsoHeading*`, `Heading 1..6`, `mso-outline-level:1..6`) sa mapowane do odpowiadajacego `heading(level=1..6)`.

### Tests
- Dodano unit tests dla save-sync helperow:
  - mode normalization,
  - baseline snapshot build (`featuredImage`, metadata draft/signature, `savedAt` fallback).

## Files
- `core/admin/ui/posts/editor/hooks/usePostEditorState.ts`
- `tests/unit/ui/post-editor-save-sync.test.ts`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/TASK-061-09_Post_Editor_Silent_Save_and_Preview_Without_Hydrate.md`
- `_docs/_TASKS/TASK-061_Post_Editor_Writing_Canvas_and_Smart_Paste.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/ui/post-editor-save-sync.test.ts tests/unit/ui/post-editor-state-normalization.test.ts tests/integration/ui/post-editor-smoke-regression.test.tsx tests/integration/ui/post-editor-writing-canvas-flow.test.tsx tests/integration/ui/post-autosave-flow.test.tsx`
  - Result: `13 pass`, `0 fail`
