# RAPORT: Section Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie  
> **Data:** 2026-05-16  
> **Sesja:** Playwright #3 (Section Widget)  
> **Środowisko:** http://localhost:5173/admin | http://localhost:3000

---

## 1. Przegląd widgetu

**Typ:** Atomic  
**Moduł:** Layout  
**Audience:** Advanced  
**Warianty:** `default`, `contained`, `bleed`  
**Slot:** `region` — powtarzalny (min 1, max 8 regionów)

Section widget jest bazowym kontenerem układu strony. Odpowiada za: semantyczny element HTML (section/div), nagłówek sekcji (label + title + description), szerokość kontenera, padding, tło (kolor / gradient / overlay), obramowanie i zaokrąglenie. Wewnątrz zawiera powtarzalne sloty `region`, do których wstawiamy inne widgety.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **Heading** | `label`, `title`, `description` |
| **Layout** | `containerWidth` (content/wide/full), `maxWidth` (none/4xl–7xl), `paddingBlock` (sm/md/lg/xl), `paddingInline` (none/sm/md/lg) |
| **Semantics** | `element` (section/div), `anchorId`, `ariaLabel` |
| **Style** | `backgroundColor`, `gradientFrom`, `gradientTo`, `gradientAngle`, `borderColor`, `borderWidth` (0–3px), `radius` (none/lg/xl/2xl), `overlayColor`, `overlayOpacity` |

### 2.2 Tryby edytora

- **Wizard** — szybki start: wariant (dropdown), tytuł, opis, kolor tła
- **Visual** — pełna kontrola: wariant (karty), heading, semantics, szerokość/padding, surface/borders
- **Advanced** — tokeny techniczne: anchorId, ariaLabel, gradient angle, overlay opacity, raw JSON snapshot

### 2.3 Renderowanie

- Zewnętrzny element: `<section>` lub `<div>` (sterowany przez `semantics.element`)
- Regiony: `<div data-section-region="...">` z listą widgetów
- Puste regiony: placeholder „Empty region."
- Overlay: absolute div z opacity i backgroundColor
- Heading: `<header>` z `<p>` (label), `<h3>` (title), `<p>` (description)

---

## 3. Braki funkcjonalne — analiza kodu

### 3.1 Krytyczne (blokują podstawowe scenariusze użycia)

| # | Problem | Obszar |
|---|---------|--------|
| C1 | Brak kontroli wysokości sekcji (min-height) — nie można zrobić sekcji fullscreen (100vh) | Layout |
| C2 | Brak obsługi tła jako obrazu/wideo — wyłącznie kolor i gradient | Styl |
| C3 | Brak kontroli koloru i rozmiaru tekstu nagłówka sekcji — hardcoded `h3 text-2xl`, `text-xs`, `text-sm` | Typografia |
| C4 | Brak poziomu semantycznego nagłówka (h1–h6) — zawsze `<h3>`, ryzyko błędów SEO i dostępności | Dostępność / SEO |
| C5 | Brak układu poziomego regionów — regiony zawsze w kolumnie (flex-col); brak opcji grid/row | Layout |

### 3.2 Ważne (ograniczają zakres konfiguracji)

| # | Problem | Obszar |
|---|---------|--------|
| W1 | Brak presetów dla sekcji — każda konfiguracja od zera | Workflow |
| W2 | Brak cieni (box-shadow) dla powierzchni sekcji | Styl |
| W3 | Brak animacji/przejść (scroll effects, fade-in) | Efekty |
| W4 | Brak niestandardowych nazw regionów — wszystkie jako generyczne „Region" | UX struktury |
| W5 | Brak kontroli alignmentu nagłówka (zawsze left-aligned) | Typografia |
| W6 | Brak responsywnych wariantów paddingu (inny padding na mobile/desktop) | Responsywność |
| W7 | Brak kontroli odstępu między nagłówkiem a regionami (hardcoded `gap-4`) | Layout |
| W8 | Brak kontroli odstępu między regionami (hardcoded: default=gap-6, contained=gap-4, bleed=gap-8) | Layout |
| W9 | Gradient nie ma przycisku Clear — nie można łatwo usunąć gradientu po ustawieniu (brak onClear dla gradientFrom/gradientTo) | UX edytora |
| W10 | Brak walidatora anchorId — można wpisać spacje i znaki specjalne (niepoprawne HTML id) | Walidacja |
| W11 | Brak kontroli z-index dla warstw (overlay, treść) | Styl |

### 3.3 Błędy logiczne i normalizacja (wykryte w kodzie)

| # | Problem | Lokalizacja |
|---|---------|-------------|
| B1 | `resolveSectionBorderWidth`: wartość niestandardowa daje `"1"` (fallback), ale default to `"0"` — niespójność | `section.tsx:181` |
| B2 | `resolveSectionRadius`: wartość niestandardowa daje `"2xl"` zamiast `"none"` (brak spójności z defaults) | `section.tsx:185` |
| B3 | `containerWidth: "content"` i `"wide"` generują identyczne klasy CSS (`mx-auto w-full`) — różnica tylko w intencji, brak wizualnego efektu | `section.tsx:149` |
| B4 | `gradientAngle` i `overlayOpacity` są zduplikowane w Visual i Advanced edytorze — podwójne pola dla tej samej wartości | `SectionEditors.tsx:669,826` |
| B5 | `borderColor` akceptuje CSS zmienne (np. `var(--color-border)`) ale color picker nadpisuje je hexem — utrata zmiennych | `SectionEditors.tsx:689` |

### 3.4 Ulepszenia UX edytora

| # | Problem | Obszar |
|---|---------|--------|
| U1 | Wizard ma „Section title" + „Description" ale brak pola „Label" (dostępne tylko w Visual) — asymetria | Wizard editor |
| U2 | Gradient angle i overlay opacity są tylko polami numerycznymi — brak suwaka / wizualnego selectora kąta | Edytor |
| U3 | `maxWidth` podaje tylko techniczne nazwy Tailwind (4xl, 5xl, 6xl, 7xl) zamiast wartości px (896px, 1024px...) | Edytor |
| U4 | Brak informacji o tym, że gradient nadpisuje kolor tła — potencjalne zdezorientowanie użytkownika | Edytor |
| U5 | Brak podglądu gradientu / overlay przed zastosowaniem | Edytor |
| U6 | Wariant wybrany w Wizard (dropdown) vs Visual (karty) — różny UI dla tego samego ustawienia | Spójność |
| U7 | Brak walidacji URL/formatu kolorów w polach tekstowych | Walidacja |
| U8 | Brak komunikatu kiedy region jest pusty na froncie — ditto admin, tylko w admin jest „Empty region." | Frontend UX |

---

## 4. Testy Playwright — Admin UI

> **Status:** W trakcie

### 4.1 Środowisko testowe

- **URL:** http://localhost:5173/admin
- **Login:** patryk.ciechanski@patrykiti.pl
- **Strona testowa:** dedykowana sesja, oddzielna page

### 4.2 Wyniki testów

*(Sekcja uzupełniana po testach Playwright)*

---

## 5. Testy Playwright — Frontend

> **Status:** Oczekuje

### 5.1 Środowisko testowe

- **URL:** http://localhost:3000

### 5.2 Wyniki testów

*(Sekcja uzupełniana po testach Playwright)*

---

## 6. Porównanie Admin ↔ Frontend

> **Status:** Oczekuje

*(Sekcja uzupełniana po porównaniu obu środowisk)*

---

## 7. Priorytetyzacja rekomendacji

| Priorytet | Problem | Nakład |
|-----------|---------|--------|
| **P0** | C4 — poziom nagłówka (h1-h6) dla dostępności / SEO | Niski |
| **P0** | B4 — usunąć zduplikowane pola z Advanced editora | Niski |
| **P0** | B1/B2 — naprawić fallback w normalizacji borderWidth i radius | Niski |
| **P1** | C1 — min-height / fullscreen sekcja | Średni |
| **P1** | C3 — kolory i rozmiar tekstu headingu | Średni |
| **P1** | C5 — układ poziomy regionów (grid/row option) | Wysoki |
| **P1** | W9 — przycisk Clear dla pól gradientFrom/gradientTo | Niski |
| **P2** | C2 — obraz/wideo jako tło sekcji | Wysoki |
| **P2** | W1 — presety sekcji | Średni |
| **P2** | U3 — przyjazne nazwy maxWidth (px zamiast tailwind token) | Niski |
| **P3** | W6 — responsywny padding (mobile vs desktop) | Wysoki |
| **P3** | W2 — cienie (box-shadow) | Niski |
