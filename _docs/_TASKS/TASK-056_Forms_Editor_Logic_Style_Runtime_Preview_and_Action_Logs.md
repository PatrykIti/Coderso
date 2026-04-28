# TASK-056: Forms Editor Logic, Style, Runtime Preview, and Action Logs
# FileName: TASK-056_Forms_Editor_Logic_Style_Runtime_Preview_and_Action_Logs.md

**Priority:** High  
**Category:** Forms UX/Runtime  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-10, TASK-054-07, TASK-020-11  
**Status:** Done (2026-02-21)

---

## Goal
Domknac Forms Editor do poziomu produkcyjnego:
- pelne opcje `Logic` i `Style` dla kazdego pola,
- realny workflow testowania automatyzacji z poziomu edytora,
- przewidywalny runtime rendering (canvas + frontend widget),
- czytelny kontrakt dla Action Logs.

## Problem Statement
Obecnie zakladki `Logic` i `Style` sa placeholderami. Uzytkownik moze ustawic automatyzacje, ale nie ma prostego sposobu na test submit z poziomu edytora, przez co Action Logs sa malo uzyteczne.

## Scope
1. Wprowadzic typed contract dla `field.settings.logic` i `field.settings.style`.
2. Utrwalic ten kontrakt w normalizacji backend (`forms/validation.ts`).
3. Dac UI dla Logic/Style w panelu pola (`FieldSettingsPanel`).
4. Zastosowac style/logike w runtime (`form-embed`) i podgladzie canvas.
5. Dodac runtime preview/test submit w Form Builder, aby generowac Action Logs bez opuszczania edytora.
6. Uspojnic zachowanie public/internal access pod testy adminowe.

## Non-Goals
- Zaawansowany visual theming per-field (typografia per-breakpoint, custom CSS editor).
- Reguly logiczne wielowarunkowe (AND/OR groups) w tej iteracji.
- Przebudowa calego pipeline automation.

## New Sub-Tasks
- `TASK-056-01_Form_Field_Logic_Contract_and_Normalization.md`
- `TASK-056-02_Form_Field_Style_Contract_and_Runtime_Rendering.md`
- `TASK-056-03_Form_Editor_Logic_Style_UI.md`
- `TASK-056-04_Form_Runtime_Preview_and_Action_Logs_Test_Flow.md`
- `TASK-056-05_Form_Submission_Access_Adjustments_for_Admin_Testing.md`
- `TASK-056-06_Forms_QA_Docs_Changelog_and_Closure.md`

## Acceptance Criteria
1. Kazde pole ma dzialajaca zakladke `Logic` i `Style` (nie placeholder).
2. Zapis formularza persistuje `logic/style` i odczytuje je po reloadzie.
3. Runtime formularza respektuje te ustawienia (widocznosc pola + podstawowy layout label/width).
4. Form Builder ma interaktywny preview submit, ktory zapisuje runs w Action Logs.
5. Email action jasno komunikuje fallback do `Settings -> Email`.
6. Pokrycie testami obejmuje normalizacje, evaluator logiki, rendering runtime, i flow submit.

## Completion Notes (2026-02-21)
- Dodano kontrakt `field.settings.logic` i `field.settings.style` z backendowa normalizacja.
- Zakladki `Logic` i `Style` w `FieldSettingsPanel` sa w pelni edytowalne dla kazdego pola.
- Runtime `form-embed` renderuje style pola (`width`, `labelPosition`) i wystawia atrybuty logiki.
- Runtime client skrypt obsluguje warunkowa widocznosc pol oraz dynamiczne required/disabled.
- Form Builder otrzymal interaktywny `Runtime preview` modal z test submit i szybkim przejsciem do `Action logs`.
- Public mode dla zalogowanej sesji admina omija captcha requirement, co upraszcza testowanie automatyzacji.
