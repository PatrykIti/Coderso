# TASK-063-12-01: Reference Contract Freeze and Delta Matrix
# FileName: TASK-063-12-01_Reference_Contract_Freeze_and_Delta_Matrix.md

**Priority:** High  
**Category:** Docs/UX Contract  
**Estimated Effort:** Small  
**Dependencies:** TASK-063-11  
**Status:** To Do

---

## Overview
Zamrozic jednoznaczny kontrakt visual/UI dla post editora na podstawie:
- `_docs/UI/admin_panel/46-post-editor/code.html`

oraz spisac delta matrix `reference vs current` przed implementacja zmian.

---

## Scope
1. Rozbic referencje na sekcje (header, left rail, canvas, right rail, modal settings, responsive).
2. Zmapowac kazda sekcje do aktualnych komponentow Nextless.
3. Oznaczyc status: `match`, `partial`, `missing`.
4. Dla kazdego odchylenia wpisac decyzje: `must-fix`, `allowed deviation`, `defer`.

---

## Current State Analysis (Locked: 2026-02-25)
1. Header jest obecnie jednowierszowy i laczy wszystkie akcje (`Outline/Details/Focus/Revisions/Preview/Publish/Gear`) w jednym klastrze, bez wyraznego podzialu primary vs secondary actions.
2. Lewy rail ma tabs `List view` + `Outline` o rownej wadze wizualnej; `Outline` nie jest wystarczajaco domyslnym i dominujacym modelem jak w referencji.
3. Center canvas ma szersza geometrie (`~860px`) i inny rytm spacingu/typografii niz referencja (`720px`, `text-5xl`, `space-y-6`).
4. Prawy inspector ma obecnie sekcje bardziej techniczne (SEO/meta stale widoczne), a nie flow z referencji (`publishing -> categories -> tags -> featured image -> danger`).
5. Gear dialog istnieje, ale jest minimalistyczny (3 toggles) i bez dopietego kontraktu density/migracji preferences.
6. Responsive layout jest oparty o jeden breakpoint (`1024`) + mobile sheets; focus mode nie przywraca deterministycznie poprzedniego stanu paneli po wyjsciu.

---

## Locked Reference Contract (Token-Level)
1. Header: `h-14`, lewy kontekst (close/back + breadcrumb + draft badge), prawa strona `Preview`, `Publish`, `Gear`.
2. Left rail: `w-64`, `Document Outline`, list rows z lekkim hover/active, primary insert `+`.
3. Canvas: `max-width: 720px`, `py-20 px-8`, title `text-5xl font-display font-bold`, writing flow `space-y-6`.
4. Right rail: `w-80`, tabs `Post/Block`, sekcje publishing/category/tags/media/danger, advanced metadata jako secondary layer.
5. Gear/settings: settings icon jako primary entrypoint do globalnych ustawien editora.
6. Responsive: desktop-first 3-column composition; mobile fallback przez sheets.

---

## Final Decisions (Approved for 063-12)
1. Brak nowych public endpointow; parity to warstwa UI/UX.
2. Dodatkowa zakladka `List view` po lewej jest dozwolona, ale `Outline` pozostaje domyslnym i primary mode.
3. Secondary controls (`Outline/Details/Focus/Revisions`) zostaja w UI, ale poza glownym prawym klastrem headera.
4. Dla `DocumentInspector` nie dodajemy backendowych pol `visibility/sticky`, bo obecny kontrakt API ich nie wystawia.
5. SEO i pola zaawansowane przechodza do `Advanced` (progressive disclosure), zamiast usuwania.
6. Preferences editora sa utrzymywane local-first, ale synchronizowane rowniez do internal `user_settings` (dual persistence).
7. Focus mode po wdrozeniu ma przywracac poprzedni stan paneli po wyjsciu.

---

## Delta Matrix Source
Szczegolowy matrix sekcja-po-sekcji jest utrzymywany w:
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`

---

## Sub-Tasks
1. Spisac checklist parity dla kazdej sekcji referencji.
2. Opracowac mapping komponentow + plikow do zmian.
3. Uzgodnic i zapisac dozwolone odchylenia (np. dodatkowa zakladka `List view`).
4. Uzyc matrix jako gate dla kolejnych subtaskow.

---

## Physical Files (Planned)
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (new)
- `_docs/_TASKS/TASK-063-12_Post_Editor_Reference_Parity_with_46_Template.md`
- `_docs/_TASKS/TASK-063-12-01_Reference_Contract_Freeze_and_Delta_Matrix.md`

---

## Pseudocode
```ts
for (const section of referenceSections) {
  const target = mapReferenceToCurrent(section);
  const parity = evaluateParity(section, target);
  matrix.push({ section, target, parity, action: resolveAction(parity) });
}
```

---

## Acceptance Criteria
1. Powstal matrix z pelnym mapowaniem sekcji referencji i komponentow.
2. Kazde odchylenie ma przypisana decyzje i ownera.
3. Matrix moze byc uzyty jako checklista odbiorowa subtaskow 12-02..12-07.

---

## Testing Requirements
- Documentation consistency check:
  - matrix zawiera wszystkie regiony referencji,
  - matrix ma decyzje i target files dla kazdej roznicy.
- Brak zmian runtime w tym kroku.

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md`
- `_docs/_TASKS/README.md` (po dodaniu taska)
