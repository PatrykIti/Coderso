# TASK-063-13-01: Block by Block Defect Analysis and Fix Contract
# FileName: TASK-063-13-01_Block_by_Block_Defect_Analysis_and_Fix_Contract.md

**Priority:** High  
**Category:** Admin/UI Analysis  
**Estimated Effort:** Medium  
**Dependencies:** TASK-063-13  
**Status:** Done (2026-02-27)

---

## Overview
Sformalizowac root-cause i target fix per blok dla zgloszonych problemow authoring.
To jest plik "source of truth" dla implementacji i testow.

---

## Scope
1. Zmapowac symptomy -> root-cause w repo (pliki + mechanizm).
2. Okreslic kontrakt naprawy per blok.
3. Zdefiniowac testy unit/integration per blok.
4. Rozdzielic "must-fix now" vs "follow-up".

---

## Block-by-Block Analysis

### 1) Section (`writing-canvas`)
- **Symptom:** pierwsze wpisanie znaku destabilizuje caret i pozycje tekstu.
- **Root cause (repo):**
  - `PostEditorCanvas` wysyla `onChange` przez `createWritingCanvasContentFromPaste(...)` nawet dla zwyklego typingu.
  - Pipeline paste normalizuje cale HTML na strukture nodes, co reserializuje i przebudowuje DOM.
  - `PostRichTextAdapter` po zmianie `value` ustawia `innerHTML`, co resetuje selection.
- **Fix contract:**
  - Rozdzielic typing pipeline od paste pipeline.
  - Dodac `createWritingCanvasContentFromEditorHtml` (typing-safe) bez heurystyk "paste-only".
  - Ograniczyc `innerHTML` sync do rzeczywistych remote/external changes.
- **Tests:**
  - Unit: typing-safe conversion nie reindexuje node IDs przy drobnej zmianie.
  - Integration: wpisanie pierwszego znaku nie przesuwa caret na poczatek.

### 2) Paragraph
- **Symptom:** po `Enter` caret przeskakuje na poczatek.
- **Root cause (repo):**
  - browser `contentEditable` czesto emituje `div` przy `Enter`.
  - serializer/sanitizer nie traktuje `div` jako zgodnego block container.
- **Fix contract:**
  - pre-normalize editor HTML: `div -> p`.
  - dodatkowo wymusic semantyke `insertParagraph` na `Enter` dla spojnosc.
- **Tests:**
  - Unit: normalize `div` do `p`.
  - Integration: `Enter` tworzy nowy akapit bez jumpu caret.

### 3) Heading
- **Symptom:** analogiczny caret jump po nowej linii.
- **Root cause:** ten sam co `paragraph` (block container normalization + full sync).
- **Fix contract:** ten sam pipeline co paragraph.
- **Tests:** wspolny zestaw testow z paragraph + heading-specific case.

### 4) Quote
- **Symptom:** analogiczny caret jump po `Enter`.
- **Root cause:** ten sam co paragraph/heading.
- **Fix contract:** wspolny richtext newline contract.
- **Tests:** case dla blockquote + newline.

### 5) List
- **Symptom:** brak sensownego multiline (newline znika).
- **Root cause (repo):**
  - `parseListItems(...).filter(Boolean)` na kazdy keystroke usuwa puste linie.
  - normalizer przy kazdym dispatchu usuwa empty items.
- **Fix contract:**
  - wprowadzic draft string state podczas edycji textarea.
  - commit do `string[]` na blur / explicit save action.
  - parsowanie ma zachowac intencje wieloliniowosci podczas aktywnej edycji.
- **Tests:**
  - Unit: parse/serialize list draft (z pustymi liniami i trailing newline).
  - Integration: Enter w list nie cofa wpisu do jednej linii.

### 6) Image
- **Symptom:** klik placeholdera nie otwiera wyboru obrazu.
- **Root cause (repo):**
  - placeholder tylko wywoluje `onOpenBlockDetails`.
  - brak bezposredniego media picker flow w canvas.
  - canvas preview traktuje `attrs.mediaId` jako URL tylko gdy zaczyna sie od `/` lub `http`.
- **Fix contract:**
  - klik placeholdera otwiera media picker dialog.
  - wybor assetu ustawia `attrs.mediaId` + domyslne `alt/caption`.
  - canvas potrafi rozwiazac `mediaId -> url` przez cache client.
- **Tests:**
  - Unit: resolve `mediaId` na `url` z cache/listy.
  - Integration: click placeholder -> picker -> selected image appears on canvas.

### 7) Button
- **Symptom:** placeholder zamiast realnego rezultatu.
- **Root cause:** canvas render ma tylko helper placeholder i tekst.
- **Fix contract:**
  - canvas preview ma odzwierciedlic runtime classes (`variant`, `size`, `newTab`).
  - fallback placeholder tylko gdy brak minimalnych danych.
- **Tests:**
  - Unit: map attrs -> preview classes/props.
  - Integration: zmiana variant/size w inspector od razu widoczna na canvas.

### 8) Embed
- **Symptom:** placeholder zamiast realnego podgladu.
- **Root cause:** canvas render nie mapuje provider/aspect/lazy.
- **Fix contract:**
  - preview iframe shell zgodny z runtime mapperem (bez wykonywania niebezpiecznych URL).
  - walidacja i normalizacja provider/url/aspect.
- **Tests:**
  - Unit: provider/url -> embed src mapping.
  - Integration: embed attrs update odswieza preview frame.

### 9) Callout / Code / Separator / TOC
- **Symptom:** czesc opcji z `Block` tab ma slaba widocznosc efektu na canvas.
- **Root cause:** brak pelnego parity canvas style state z runtime mapping.
- **Fix contract:**
  - ujednolicic preview contract z runtime layout (`textScale`, `spacing`, `alignment`, style attrs).
  - where not possible: jasno oznaczyc as "runtime-only" w UI.
- **Tests:**
  - Unit: attrs normalization + mapper expectations.
  - Integration: inspector changes produce visible delta or explicit "runtime-only" info.

### 10) Rich text commands (`bold`, `italic`, `link`, ...)
- **Symptom:** surowe `<b>...</b>` jako tekst, link UX niespojny.
- **Root cause (repo):**
  - browser generuje `b/i`, a serializer rozpoznaje HTML glownie po dozwolonych tagach (`strong/em`), co moze escapenac `b/i` do tekstu.
  - link insertion korzysta z `execCommand(createLink)` bez kontroli collapsed selection i preview styles.
- **Fix contract:**
  - dodac alias normalization: `b -> strong`, `i -> em`, `div -> p`.
  - poprawic link flow (selection-aware; bez dosztukowania URL jako surowego tekstu obok).
  - zapewnic wizualna prezentacje linka na canvas.
- **Tests:**
  - Unit: normalize aliases + serializer stability.
  - Integration: toolbar bold/link daje renderowany efekt, nie surowy markup.

---

## Must-Fix Now
1. `writing-canvas`, `paragraph`, `heading`, `quote` caret/newline.
2. `list` multiline.
3. `image` click-to-pick.
4. richtext command serialization/link behavior.
5. canvas previews `button` + `embed`.

## Follow-Up (same epic, lower order)
1. Rozszerzone quick toolbars dla non-text blocks.
2. Pelne parity wszystkich block inspector controls (wraz z helper labels runtime-only gdzie trzeba).
3. Dalsza rozbudowa typography model.

---

## Testing Requirements
- Unit matrix:
  - richtext html normalization aliases
  - typing vs paste conversion contracts
  - list draft parser/serializer
  - image media ID resolution
  - button/embed preview mapping
- Integration matrix:
  - caret and enter behavior per text block
  - list multiline editing flow
  - image picker modal flow
  - toolbar formatting and link UX
  - canvas preview parity for interactive blocks

---

## Documentation Updates Required
- `_docs/UI/POST_EDITOR_REFERENCE_PARITY_MATRIX.md` (allowed deviation updates)
- `_docs/ARCHITECTURE.md` (new authoring contracts)

