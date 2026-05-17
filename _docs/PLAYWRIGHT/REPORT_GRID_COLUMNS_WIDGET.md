# RAPORT: Grid Columns Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright #3 (Grid Columns Widget)
> **Środowisko:** http://localhost:5173/admin | http://localhost:3000

---

## 1. Przegląd widgetu

**Typ:** Layout
**Moduł:** Core / Layout
**Warianty:** `equal`, `asymmetric`, `masonry-lite`
**Slot:** `column` — repeatable (min: 2, max: 6 kolumn)

Grid Columns widget pozwala na budowę responsywnych wielokolumnowych układów. Każda kolumna jest osobnym slotem repeatable z konfiguracją spanów (desktop/tablet/mobile) na bazie 12-kolumnowego gridu. Opcjonalnie kolumny mogą być "cardized" — owinięte tłem, ramką i zaokrągleniami.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Kolumny** | `columns[]` — id, label, desktopSpan, tabletSpan, mobileSpan |
| **Layout** | `gapX`, `gapY` (6 wartości), `align` (start/center/end/stretch) |
| **Styl** | `cardizeColumns`, `columnBackground`, `columnBorderColor`, `columnBorderWidth`, `columnRadius`, `columnPadding` |

### 2.2 Tokeny

| Token | Wartości |
|-------|---------|
| **Spany** | 1–12 (pełna skala) |
| **Gap** | none, 2, 3, 4, 6, 8 |
| **Border width** | 0, 1, 2, 3 px |
| **Radius** | none, lg, xl, 2xl |
| **Padding** | none, 2, 3, 4, 5, 6 |

### 2.3 Tryby edytora

- **Wizard** — wariant, liczba kolumn, etykiety (tylko kol. 1 i 2), gap X/Y
- **Visual** — wariant (karty), liczba kolumn, sizing grid, gapi, cardize + kolory
- **Advanced** — tokeny techniczne (align, gap, cardize, border, padding), JSON snapshot

### 2.4 Breakpointy

| Breakpoint | Tailwind prefix | Próg CSS |
|------------|----------------|----------|
| Mobile (domyślny) | brak | < 768px |
| Tablet | `md:` | ≥ 768px |
| Desktop | `lg:` | ≥ 1024px |

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują zakres konfiguracyjny lub tworzą chaos UX)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | **Desync slot/config** — liczba slotów (`column:1..N` w Slots panel) i liczba konfiguracji kolumn (w edytorze) to oddzielne kontrolki — user MUSI je ręcznie synchronizować. Komentarz w kodzie to potwierdza. To główna pułapka UX. | Edytor / Architektura |
| C2 | **Color picker nie obsługuje CSS variables** — `resolvePickerColor` fallbackuje do hardcoded hex gdy wartość to `var(--color-surface)`. Domyślne wartości to zmienne, ale kolor picker je ignoruje — picker pokazuje biały zamiast wartości tokenu. | Edytor / Styl |
| C3 | **Wizard edytuje etykiety tylko dla kolumny 1 i 2** — przy 3–6 kolumnach reszta jest niedostępna w wizard. Użytkownik musi przełączyć się na Visual dla pełnej kontroli. | Edytor |
| C4 | **Brak wizualnego podglądu spanów** — użytkownik wybiera "5/12" z dropdownu ale nie widzi jak kolumna będzie wyglądać relatywnie do innych. Ryzyko układów niezsumowujących się do 12. | UX edytora |
| C5 | **Brak walidacji sumy spanów** — nic nie ostrzega gdy desktopSpan kolumn nie sumuje się do 12 (np. 2 kolumny po 8/12 = przepełnienie). | Walidacja |

### 3.2 Ważne (ograniczają wachlarz konfiguracyjny)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | **Brak per-kolumnowego stylu** — cardize jest globalny: jeden kolor tła, jedna ramka dla WSZYSTKICH kolumn. Niemożliwe np. kolumna wyróżniona vs normalna. | Styl |
| W2 | **Brak kontroli min-height kolumn** — `min-h-[6rem]` jest hardcoded. Nie da się np. ustawić wysokości hero-like kolumny. | Layout |
| W3 | **Brak "reverse on mobile"** — brak opcji odwrócenia kolejności kolumn na mobile (częsty wzorzec: media-left → media-bottom na mobile). | Responsywność |
| W4 | **Brak per-kolumnowej widoczności** — nie ma toggle `hideOnMobile` / `hideOnDesktop` per kolumna. | Responsywność |
| W5 | **Brak per-kolumnowego wyrównania pionowego** — `align` (items-*) jest globalny. Niemożliwe: kol.1 stretch, kol.2 center. | Layout |
| W6 | **Brak XL breakpointu (xl: / 2xl:)** — 3 breakpointy (mobile/tablet/desktop) przy użyciu lg (1024px). Brakuje obsługi szerokich monitorów (1280px, 1536px). | Responsywność |
| W7 | **Brak drag & drop reorderu kolumn** — jedyna zmiana kolejności to edit JSON lub usunięcie i ponowne dodanie. | UX edytora |
| W8 | **Brak custom CSS class per kolumna** — zaawansowani użytkownicy nie mogą dołączyć własnych klas. | Zaawansowane |
| W9 | **Brak kontroli overflow** — brak `overflow-hidden` toggle per kolumna (przydatne dla cardized z obrazem). | Styl |
| W10 | **Ograniczone tokeny gap** — brak wartości 1, 5, 7, 10, 12. Gap jest identyczny X i Y mimo oddzielnych kontrolek (typowy wzorzec: duży gapY, mały gapX). | Layout |

### 3.3 Ulepszenia UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | **Etykiety tokenów gap bez kontekstu** — "Gap 2", "Gap 6" bez px/rem — użytkownik nie wie ile to pikseli (gap-2 = 8px, gap-6 = 24px w Tailwind). | Edytor |
| U2 | **Brak wizualnych ikon wariantów** — karty wariantów mają tylko tekst. Brak miniaturki układu (np. ╠═╣ equal, ╠══╗╣ asymmetric). | Edytor |
| U3 | **Advanced editor nie chowa kontrolek cardize gdy wyłączone** — w Visual takie pola są ukryte (`{style.cardizeColumns ? <>...</> : null}`), ale w Advanced są zawsze widoczne (border, padding) bez kontekstu. | Edytor / Spójność |
| U4 | **Brak informacji o bieżącej sumie spanów** — przy edycji per-kolumna nie ma wskaźnika "Desktop: 5/12 + 7/12 = ✓12". | Edytor |
| U5 | **"Column configs" — myląca nazwa** — dropdown opisany jako "Column configs" zamiast np. "Liczba kolumn" — sugeruje coś więcej niż zmianę liczby. | Edytor |
| U6 | **Brak informacji o tym że masonry-lite wymusza cardize** — w kodzie: `const cardized = style.cardizeColumns || resolvedVariant === "masonry-lite"` — wariant masonry-lite zawsze kardyzuje kolumny, ale switch Cardized w UI nie jest automatycznie zaznaczony. | UX / Spójność |
| U7 | **Label kolumny widoczny w podglądzie jako nagłówek** — tekst etykiety wyświetla się w rendered output jako heading-like element. Użytkownik może nie wiedzieć, że label jest TYLKO do orientacji w edytorze czy też jest widoczny na froncie. | UX użytkownika |
| U8 | **Brak predefiniowanych layoutów (szablonów kolumn)** — brak quick-apply presetów jak "1/3 + 2/3", "2/3 + 1/3", "25/50/25", "Trzy równe". | Workflow |

---

## 4. Problemy UX z perspektywy użytkownika końcowego

| # | Problem | Wpływ |
|---|---------|-------|
| P1 | Kolumna na froncie wyświetla etykietę tekstową (`Column 1`, `Column 2`) jako widoczny element — wygląda jak niepotrzebny heading dla odwiedzającego stronę. | Wysoki |
| P2 | "Empty column." placeholder widoczny na froncie jeśli slot jest pusty — może wyciekać do produkcji. | Wysoki |
| P3 | Brak `overflow-x` na kontenerze — przy błędnym sumie spanów (> 12) kolumny mogą wychodzić poza kontener. | Średni |
| P4 | `min-h-[6rem]` może powodować nieestetyczne puste przestrzenie na mobile gdy kolumna ma mało treści. | Niski |

---

## 5. Testy w przeglądarce (Admin Preview)

> **Strona testowa:** TEST-GRID-COLUMNS-0516
> **URL Admin:** http://localhost:5173/admin/pages/dabb2bc8-af98-498b-abac-bab7e8e2334a
> **Slug:** /test-grid-columns-0516

### 5.1 Test — Warianty

| Wariant | Wynik | Uwagi |
|---------|-------|-------|
| equal | ✅ OK | Dwie równe kolumny (6/12 + 6/12), poprawnie renderowane |
| asymmetric | ⚠️ Brak efektu wizualnego | Wariant wybrany w UI, ale kolumny mają explicit span 6/6 — wariant nie nadpisuje istniejących tokenów, tylko ustawia fallback. Układ wygląda identycznie jak `equal` |
| masonry-lite | ✅ + ⚠️ | Wariant wymusza cardize w render: klasy `border p-4 rounded-xl` obecne. Switch "Cardized columns" pozostaje OFF w UI — patrz U6 |

**Odkrycie dodatkowe (Asymmetric):** Wariant `asymmetric` zmienia TYLKO `fallbackSpanForVariant()` — jeżeli kolumny mają jawnie ustawione spany (domyślnie 6/12), przełączenie wariantu nie zmienia renderowanego układu. Użytkownik myśląc że wybrał "asymmetric" nadal widzi równe kolumny. To jest **błąd koncepcyjny** — wariant powinien albo aktualizować spany przy przełączeniu, albo wyraźnie komunikować że dotyczy tylko nowych kolumn bez ustawionego spanu.

### 5.2 Test — Cardize

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| Cardize OFF | ✅ OK | Kolumny bez stylów tła/ramki/zaokrągleń |
| Cardize ON | ✅ OK | Klasy `border p-4 rounded-xl` widoczne w DOM |
| Color picker z CSS var | ⚠️ Częściowy | Text input przyjmuje `var(--color-primary)` i preview ją renderuje poprawnie (kolumna staje się pomarańczowa). Color picker (input[type=color]) nadal pokazuje fallback `#f8fafc` — potwierdza C2 |
| masonry-lite + cardize switch | ❌ Niespójna UI | masonry-lite renderuje z cardize (klasy border/p/radius w DOM) choć switch jest `aria-checked="false"` — patrz U6 |

**Weryfikacja DOM (cardize ON):**
```
div[data-grid-column] > div.className = "h-full min-h-[6rem] border p-4 rounded-xl"
```

### 5.3 Test — Responsywność (Page Preview modal)

| Breakpoint | Wynik | Uwagi |
|------------|-------|-------|
| Desktop | ✅ OK | Dwie kolumny obok siebie (6/12 + 6/12) |
| Tablet | ✅ OK | Dwie kolumny obok siebie (md:col-span-6 + md:col-span-6) — poprawne dla tabletSpan=6 |
| Mobile | ✅ OK | Kolumny stackują pionowo (col-span-12 + col-span-12) — poprawne dla mobileSpan=12 |

**Device switcher:** Dostępny wyłącznie w Page Preview modal (Runtime preview). Brak urządzenia w canvas edytora samym sobie.

### 5.4 Test — Desync slot/config

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| 2 sloty, 3 config (dodano config) | ❌ Renderuje 2 kolumny | `data-grid-columns-count="2"` — 3. config jest w danych ale nie ma slotu do renderowania. Podgląd ignoruje nadmiarowy config. |
| Sync wymaga akcji manualnej | ❌ Brak auto-sync | Użytkownik MUSI samodzielnie dodać slot w Slots panel. Brak komunikatu o desynchronizacji. |

**Przepływ desync** (odtworzony):
1. Wizard: Column configs = 2 → Slot panel: 2 sloty — OK
2. Visual → "Add column config" → configs = 3, sloty = 2 → Preview shows 2 columns
3. Slots panel → dodaj slot column:3 → Preview shows 3 columns — OK

### 5.5 Test — Wizard

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| Configs=3, etykiety w Wizard | ❌ Brakuje kol. 3 | Wizard ma 2 inputy (Column 1, Column 2). Kolumna 3 bez etykiety w Wizard — potwierdza C3 |
| Zmiana wariantu (Wizard dropdown) | ✅ OK | Dropdown zmienia wariant. Efekt wizualny zależy od jawnych spanów — patrz 5.1 |

### 5.6 Test — Advanced Editor

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| Cardize OFF → kontrolki stylu | ⚠️ Widoczne | Border width i Column padding widoczne nawet gdy cardize=OFF — potwierdza U3 |
| JSON snapshot | ✅ OK | Diagnostyczny snapshot pokazuje znormalizowane dane w czasie rzeczywistym |

---

## 6. Testy na froncie (http://localhost:3000)

> **URL frontu:** http://localhost:3000/test-grid-columns-0516
> **Status strony:** Published

### 6.1 Renderowanie HTML

| Sprawdzenie | Wynik | Uwagi |
|-------------|-------|-------|
| `data-grid-columns-variant` | ✅ `"equal"` | Atrybut obecny, wartość poprawna |
| `data-grid-columns-count` | ✅ `"2"` | Atrybut obecny, wartość zgodna ze slotami |
| Klasy Tailwind span | ✅ `col-span-12 md:col-span-6 lg:col-span-6` | Mobile/tablet/desktop spany poprawne |
| Label kolumny widoczny | ❌ WIDOCZNY | `display: block; visibility: visible; opacity: 1` — klasa `mb-3 text-xs font-semibold uppercase tracking-[0.16em]` — widoczny publicznie |
| Empty column placeholder | ❌ WIDOCZNY | Tekst "Empty column." renderowany w DOM frontu publicznego |
| Console errors | ✅ Brak | Tylko 404 na favicon.ico (nieistotne) |

### 6.2 Różnice Admin vs Front

| Element | Admin Preview | Front (localhost:3000) | Różnica |
|---------|---------------|------------------------|---------|
| Label kolumny | Widoczny | Widoczny | ✅ Identyczne |
| Empty column placeholder | Widoczny | Widoczny | ✅ Identyczne |
| Cardize styling | Działa | Działa | ✅ Identyczne |
| CSS var w bg | Renderuje | Renderuje | ✅ Identyczne |
| Responsywność | Poprawna | Poprawna | ✅ Identyczne |

**Wniosek:** Admin preview i frontend zachowują się **identycznie**. Problemy P1 i P2 (label i placeholder) istnieją w obu miejscach — ich przyczyna leży w komponencie `GridColumnsBlock` który nie rozróżnia między trybem edytora a produkcją.

---

## 7. Podsumowanie i priorytety

### 7.1 Krytyczne do naprawy (produkcja)

| Priorytet | ID | Problem | Zalecenie |
|-----------|-----|---------|-----------|
| 🔴 1 | P1 | Label kolumny (`Column 1`, `Column 2`) widoczny publicznie na froncie | Przenieść label do overlay edytora admin, ukryć w render (`hidden` lub usunąć z `GridColumnsBlock`) albo dodać prop `isEditing` |
| 🔴 2 | P2 | "Empty column." placeholder widoczny publicznie | Renderować tylko w trybie edytora, nie w produkcji |
| 🔴 3 | U6 | masonry-lite wymusza cardize w render (kod) ale switch UI nie jest zaznaczony | Auto-toggle switch do ON gdy wariant = masonry-lite, albo wyraźny komunikat. Spójność UI/engine |
| 🟠 4 | C1 | Desync slot/config — manualny sync | Auto-sync configów ze slotami lub blokada "Add column config" gdy sync jest off |
| 🟠 5 | C2 | Color picker nie wyświetla CSS variable | Pokazać placeholder z nazwą tokenu gdy wartość nie jest hex, lub obsłużyć `var(--*)` w `resolvePickerColor` |

### 7.2 Ważne do implementacji (UX)

| Priorytet | ID | Problem | Zalecenie |
|-----------|-----|---------|-----------|
| 🟡 6 | C3 | Wizard — etykiety tylko dla kol. 1 i 2 | Dynamicznie generować inputy dla wszystkich konfigurowanych kolumn |
| 🟡 7 | C4+C5 | Brak podglądu i walidacji sumy spanów | Wskaźnik sumy (np. `6 + 6 = 12 ✓`) przy editing każdej kolumny |
| 🟡 8 | W3 | Brak "reverse on mobile" | Toggle per widget: odwraca kolejność `flex-col-reverse` na mobile |
| 🟡 9 | U3 | Advanced — kontrolki cardize zawsze widoczne | Ukryć border/padding gdy cardize=OFF (spójność z Visual) |
| 🟡 10 | U2 | Brak wizualnych miniaturek wariantów | ASCII lub SVG preview wariantu w kartach wyboru |

### 7.3 Do rozważenia (long-term)

| ID | Problem |
|----|---------|
| W1 | Per-kolumnowy styl (różne tła/ramki per kolumna) |
| W2 | Kontrola min-height per kolumna |
| W4 | Per-kolumnowa widoczność (hideOnMobile) |
| W6 | Breakpoint XL (1280px+) |
| W7 | Drag & drop reorder kolumn |
| U8 | Predefiniowane szablony układów (1/3+2/3, etc.) |
| U1 | Etykiety gap z wartościami px/rem |

---

## 8. Odkrycia nieudokumentowane przed testami

1. **Wariant Asymmetric — brak efektu przy istniejących spanach** — to jest ukryty bug koncepcyjny. Variant selection zmienia tylko fallback spans, nie aktualizuje istniejących. Użytkownik myśli że zmienia layout, ale nic się nie dzieje wizualnie jeżeli spany są już ustawione.

2. **Page Preview (Runtime) vs Canvas Preview** — są dwa tryby podglądu. Canvas (w edytorze) to tryb edytowalny z theme admina. Runtime (Page Preview modal) to read-only z theme strony. Device switcher istnieje TYLKO w Runtime preview — brak go w Canvas.

3. **Label kolumny jako UX helper lub feature?** — Klasa `text-[var(--color-text)]/65` (65% opacity) sugeruje że jest to zamierzony element "helper" widoczny zarówno w edytorze jak i na produkcji. Jeżeli jest to feature (np. section label), wymaga opcji wyłączenia. Jeżeli to tylko hint edytora, musi być ukryty na froncie.

---

## Status po TASK-256 (2026-05-17)

- `TASK-256-03` + `TASK-256-05-01`: public runtime no longer renders the
  editor-only `Empty column.` placeholder. Empty-column guidance is now gated
  by the shared render-context contract.
- `TASK-256-05-01`: technical public `Column N` labels are now hidden outside
  editor-preview surfaces, and the editor surfaces an explicit mismatch warning
  when column configs drift from actual slot instances.
- `TASK-256-05-01`: `masonry-lite` now keeps the cardized wrapper contract
  truthful by locking the cardize toggle on with an explanation instead of
  pretending the runtime can render it off.
- Shared evidence from this turn:
  `bun run test:vitest -- tests/vitest/widgets/gridColumns.test.tsx
  tests/vitest/ui/grid-columns-editor-wave.test.tsx` passed on 2026-05-17.

*Raport zakończony. Sesja Playwright #3 — 2026-05-16.*
