# TASK-057-08: Post Editor QA, Docs, Changelog, and Rollout
# FileName: TASK-057-08_Post_Editor_QA_Docs_Changelog_and_Rollout.md

**Priority:** Medium  
**Category:** QA + Docs + Release  
**Estimated Effort:** Medium  
**Dependencies:** TASK-057-01, TASK-057-02, TASK-057-03, TASK-057-04, TASK-057-05, TASK-057-06, TASK-057-07  
**Status:** Done (2026-02-21)

---

## Goal
Domknac wdrozenie: testy, dokumentacja, changelog, kanban, rollout i checklista regresji.

## Scope
1. Pelna walidacja:
   - `bun --cwd core lint`
   - `bun --cwd core lint:types`
   - `bun test`
2. Dodatkowe testy e2e-like dla krytycznych flow redakcyjnych.
3. Aktualizacja docs i kontraktow API.
4. Dodanie changelog entry i zamkniecie taskow na kanbanie.

## Files to Create / Change
- `tests/integration/ui/post-editor-smoke-regression.test.tsx` (new)
- `tests/perf/post-editor-load.test.tsx` (new, lightweight)
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_NAVIGATION.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/CONTENT_MODELING_COOKBOOK.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*.md`
- `_docs/_TASKS/README.md`
- `_docs/_TASKS/TASK-057*.md`

## Rollout Strategy
1. Feature flag: `posts.editor.mode = "classic" | "blocks"` (default: `blocks`).
2. Safe fallback: mozliwosc otwarcia klasycznego edytora dla awaryjnych przypadkow.
3. Stopniowe wlaczenie na srodowiskach: local -> staging -> production.

## Pseudocode
```ts
if settings.posts.editor.mode === "classic":
  renderLegacyPostEditor()
else:
  renderPostBlockEditor()

releaseChecklist():
  runLintTypesTests()
  runPostEditorRegressionMatrix()
  updateDocsAndChangelog()
  moveTasksToDone()
```

## Acceptance Criteria
1. Wszystkie testy przechodza bez fallback-hackow pod testy.
2. Dokumentacja odpowiada realnemu kodowi i API.
3. Jest opisany i przetestowany plan rollback/fallback.
4. TASK-057 i subtaski moga zostac formalnie zamkniete.
