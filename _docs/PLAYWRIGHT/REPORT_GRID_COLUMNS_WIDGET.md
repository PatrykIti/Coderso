# RAPORT: Grid Columns Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
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

> *Sekcja do uzupełnienia po testach Playwright*

### 5.1 Test — Warianty

| Wariant | Wynik | Uwagi |
|---------|-------|-------|
| equal | — | — |
| asymmetric | — | — |
| masonry-lite | — | — |

### 5.2 Test — Cardize

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| Cardize OFF | — | — |
| Cardize ON | — | — |
| Color picker z CSS var | — | — |
| masonry-lite + cardize switch | — | — |

### 5.3 Test — Responsywność (Preview Device)

| Breakpoint | Wynik | Uwagi |
|------------|-------|-------|
| Desktop | — | — |
| Tablet | — | — |
| Mobile | — | — |

### 5.4 Test — Desync slot/config

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| 3 sloty, 2 config | — | — |
| 2 sloty, 3 config | — | — |

### 5.5 Test — Wizard

| Scenariusz | Wynik | Uwagi |
|------------|-------|-------|
| 3 kolumny, etykiety w Wizard | — | — |
| Zmiana wariantu | — | — |

---

## 6. Testy na froncie (http://localhost:3000)

> *Sekcja do uzupełnienia po testach Playwright*

### 6.1 Renderowanie HTML

| Sprawdzenie | Wynik | Uwagi |
|-------------|-------|-------|
| data-grid-columns-variant | — | — |
| data-grid-columns-count | — | — |
| Klasy Tailwind span | — | — |
| Label kolumny widoczny | — | — |
| Empty column placeholder | — | — |

### 6.2 Różnice Admin vs Front

| Element | Admin | Front | Różnica |
|---------|-------|-------|---------|
| — | — | — | — |

---

## 7. Podsumowanie i priorytety

> *Do uzupełnienia po testach*

### 7.1 Do naprawy (najpilniejsze)

1. **C1** — Desync slot/config — wymaga redesignu UX lub auto-sync
2. **C2** — Color picker + CSS variables
3. **P1** — Label kolumny widoczny na froncie (?)
4. **P2** — Empty column placeholder na froncie (?)
5. **U6** — masonry-lite + cardize switch niespójność

### 7.2 Do implementacji (high value)

1. **C4/C5** — Wizualny podgląd i walidacja sumy spanów
2. **W1** — Per-kolumnowy styl (cardize per column)
3. **W3** — Reverse on mobile
4. **U8** — Szablony układów (presets)
5. **U2** — Ikony/miniaturki wariantów

---

*Raport aktualizowany na bieżąco podczas sesji testowej Playwright.*
