# TASK-061: Post Editor Writing Canvas and Smart Paste
# FileName: TASK-061_Post_Editor_Writing_Canvas_and_Smart_Paste.md

**Priority:** High  
**Category:** Admin/UI + Content Authoring  
**Estimated Effort:** Large  
**Dependencies:** TASK-057, TASK-060  
**Status:** In Progress (2026-02-22)

---

## Overview
Przebudowac authoring postow do modelu bardziej Word/Gutenberg-like dla nietechnicznych userow:
- jeden glowny "Writing Canvas" do ciaglego pisania,
- smart paste z Word/Docs (wielostronicowe tresci),
- obrazki z oplywaniem tekstu (`wrap left/right`),
- zachowanie kompatybilnosci runtime i danych historycznych.

## Problem Statement
Obecny model jest technicznie poprawny, ale mniej intuicyjny dla scenariusza:
- copy/paste duzych tresci z Word,
- szybka edycja jak w klasycznym edytorze dokumentu,
- naturalne osadzanie obrazow "w tekscie".

## Goals
1. Uzytkownik moze wkleiac dlugie tresci (1-3+ strony) i dostaje automatycznie uporzadkowany dokument.
2. Domyslny flow edycji posta jest ciagly (jeden glowny writing block), a nie micro-edytowanie kazdego bloku osobno.
3. Obrazy moga oplywac tekst (`none/left/right`) i zachowuja responsywnosc.
4. Runtime preview/public rendering pozostaje deterministyczny i bezpieczny.

## Scope
1. Nowy typ bloku `writing-canvas` (agreguje paragrafy/listy/naglowki/obrazy inline).
2. Parser smart paste dla HTML/Word markup + bezpieczna normalizacja.
3. Wklejanie obrazow z clipboard z automatycznym uploadem do media i inline insert.
4. UI/UX integracja z ribbon (Insert + media controls + wrap controls).
5. Runtime renderer dla `writing-canvas`.
6. Backward compatibility dla istniejacych post block documents.

## Out of Scope
1. Absolutny free-canvas z nakladaniem elementow `position:absolute` (DTP-like).
2. WYSIWYG 1:1 pixel editor jak Figma.
3. Zmiana page buildera (dotyczy tylko posts editor/runtime).

## Architecture Decisions
1. **Word-like != free-position layout**: dla postow utrzymujemy flow content + wrap, bez dowolnego overlapu.
2. **Single writing surface**: domyslnie jeden glowny writing block; "special blocks" zostaja jako opcjonalne dodatki.
3. **Deterministic paste normalization**: zawsze sanitizacja i mapowanie do allowlisty struktur.
4. **Runtime parity**: preview i published wykorzystuja ten sam renderer `writing-canvas`.

## Sub-Tasks
- `TASK-061-01`: Writing Canvas UX Contract and User Flows
- `TASK-061-02`: Writing Canvas Block Contract and Normalization
- `TASK-061-03`: Smart Paste (Word/Docs/HTML) Parsing and Sanitization
- `TASK-061-04`: Clipboard Image Upload and Inline Media Insertion
- `TASK-061-05`: Image Wrap Controls and Layout Semantics
- `TASK-061-06`: Editor UI Integration (Ribbon + Canvas + List View)
- `TASK-061-07`: Runtime Renderer Parity and Backward Compatibility
- `TASK-061-08`: QA, Docs, Changelog, and Closure

## Implementation Order
1. `061-01` kontrakt UX.
2. `061-02` model danych + normalizer.
3. `061-03` paste pipeline.
4. `061-04` clipboard images.
5. `061-05` wrap/layout semantics.
6. `061-06` integracja edytora.
7. `061-07` runtime + compatibility.
8. `061-08` testy, dokumentacja, closure.

## Acceptance Criteria
1. Paste duzego dokumentu z Word tworzy czytelny writing canvas bez smieciowego markupu.
2. User moze ustawic oplywanie obrazu (`none/left/right`) i widzi efekt na canvasie i runtime preview.
3. Brak regresji: autosave/revisions/publish/preview nadal dzialaja.
4. Legacy post documents renderuja sie poprawnie po migracji/fallback.

## Testing Requirements
- Unit:
  - paste normalization,
  - writing-canvas schema/normalization,
  - wrap class resolver,
  - compatibility adapters.
- Integration UI:
  - big paste flow,
  - clipboard image paste,
  - wrap controls effect in editor.
- Runtime:
  - preview/public parity,
  - legacy docs fallback rendering.
- Regression:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun test`

## Documentation Updates Required
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/CODERSO_MODULES.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Progress Notes
- `TASK-061-01` completed: UX contract and writing-first flow anchors documented.
- `TASK-061-02` completed: `writing-canvas` block contract + normalizer + compatibility hooks implemented.
- `TASK-061-03` completed: smart-paste pipeline (Word/Docs/HTML), sanitizer hardening, adapter integration, and coverage tests delivered.
- `TASK-061-04` completed: clipboard image paste now uploads via internal media API and inserts safe inline media markup in the editor.
- `TASK-061-05` completed: image wrap/width/margin layout semantics wired end-to-end (inspector + rich-text controls + runtime/canvas CSS parity + mobile fallback).
- `TASK-061-06` completed: writing-first editor integration delivered (default writing-canvas, ribbon quick actions, logical list view labels, and canvas/details context updates).
