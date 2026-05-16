# RAPORT: Product Gallery Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W toku
> **Data:** 2026-05-16
> **Sesja:** Playwright — Product Gallery Widget
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** TBD (dedykowana strona w sesji)

---

## 1. Przegląd widgetu

**Typ:** Commerce / E-commerce
**Moduł:** Content
**Warianty:** `cards`, `compact`
**Limit produktów:** 1–48 | **Domyślnie:** 8

Product Gallery to widget commerce wyświetlający karty produktów z dynamicznym źródłem danych (runtime resolver). Odpowiada za: siatkę kart produktów, filtrowanie po kolekcjach/statusie/frazie, wyświetlanie ceny / stanu magazynowego / excerpta, konfigurację kolumn (2/3/4) oraz pustego stanu.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola |
|--------|------|
| **source** | `limit` (1–48), `search`, `collectionIds[]`, `status[]`, `sortField`, `sortDir` |
| **fields** | `showExcerpt`, `showPrice`, `showStock`, `showMediaHint` |
| **emptyState** | `title`, `description` |
| **style** | `columns` (2/3/4), `cardStyle` (outlined/minimal), `cardBackground`, `cardBorderColor`, `emptyBackground`, `emptyBorderColor` |
| **resolved** | `items[]`, `total`, `resolvedAt`, `error` (runtime inject) |

### 2.2 Warianty layoutu

| Wariant | Opis (deklaracja) | Faktyczny render |
|---------|-------------------|-----------------|
| `cards` | Card grid for featured products | Siatka `grid-cols-1 md:grid-cols-{2\|3\|4}` |
| `compact` | Dense card grid with minimal spacing | **Identyczny** jak `cards` — brak implementacji |

### 2.3 Breakpointy kolumn

| Kolumny | Mobile | Tablet (md) | Desktop (xl) |
|---------|--------|-------------|--------------|
| 2 | 1 | 2 | 2 |
| 3 | 1 | 3 | 3 |
| 4 | 1 | 2 | 4 |

### 2.4 Tryby edytora

| Tryb | Zawartość |
|------|-----------|
| **Wizard** | Źródło produktów (CommerceSourceFields), Kolumny, Card style, **SurfaceFields** (kolory) |
| **Visual** | Widoczność pól (excerpt/price/stock/mediaHint), Empty state copy, **SurfaceFields** (kolory) |
| **Advanced** | Resolved items count, Runtime error flag, Query JSON preview |

---

## 3. Problemy znalezione w kodzie (statyczna analiza)

### 3.1 Błędy logiczne (Code Bugs)

#### CODE-01 — Wariant `compact` nie jest implementowany
**Plik:** `core/widgets/core/productGallery.tsx:357`
**Opis:** `ProductGalleryBlock` przyjmuje `{ data, variant }` ale całkowicie ignoruje parametr `variant`. Oba warianty (`cards`, `compact`) renderują identyczny HTML. Opis wariantu `compact` ("Dense card grid with minimal spacing") jest niezrealizowany — brak oddzielnych klas `gap-`, `p-` ani innego stylu dla compact.

#### CODE-02 — `legacyCardSurfaceClass` jest dead code — nigdy nie stosowane
**Plik:** `core/widgets/core/productGallery.tsx:369-377`
**Opis:** Logika `hasStyleObject = normalized.style !== undefined` sprawdza czy style jest zdefiniowane PO normalizacji. `normalizeProductGalleryData` **zawsze** zwraca `style` jako obiekt (wypełnia go z defaults lub input). Zatem `hasStyleObject` jest zawsze `true`, a `legacyCardSurfaceClass` zawsze `""`. Klasy fallback Tailwind dla kart (np. `"border-[var(--color-border)] bg-[var(--color-bg)]"`) nigdy nie są stosowane.

#### CODE-03 — `legacyEmptyClass` jest dead code — nigdy nie stosowane
**Plik:** `core/widgets/core/productGallery.tsx:370-372`
**Opis:** Ta sama przyczyna co CODE-02. `legacyEmptyClass` jest zawsze `""`. Klasy fallback dla empty state (`"border-[var(--color-border)] bg-[var(--color-bg)]/70"`) nigdy nie są stosowane.

#### CODE-04 — `cardStyle: "minimal"` ustawia `borderColor` w inline style bez klasy `border`
**Plik:** `core/widgets/core/productGallery.tsx:414-417`
**Opis:** Dla wariantu `minimal` karta nie dostaje klasy `border` (poprawnie — ramka nie ma się pokazywać). Jednak `compactStyle` może wypełnić `cardSurfaceStyle.borderColor` jeśli `cardBorderColor` jest ustawione. CSS `border-color` bez `border-width` ≥ 1px jest niewidoczne — `cardBorderColor` dla `minimal` jest bezużyteczne ale nie ma o tym informacji w edytorze.

#### CODE-05 — Podwójna normalizacja source w `buildProductGalleryQueryInput`
**Plik:** `core/widgets/core/productGallery.tsx:334-343`
**Opis:** `buildProductGalleryQueryInput` wywołuje `normalizeProductGalleryData(value)` (która wewnętrznie wywołuje `normalizeCommerceWidgetSource`), a następnie wywołuje `normalizeCommerceWidgetSource` **ponownie** na już znormalizowanym `source`. Zbędna podwójna normalizacja — może ukrywać błędy gdy znormalizowane wartości różnią się od surowych.

#### CODE-06 — Brak obrazu produktu w kartach
**Plik:** `core/widgets/core/productGallery.tsx:421-427`
**Opis:** `CommerceWidgetRuntimeCard` posiada `primaryMediaId` i `mediaIds`, ale karta produktu nie renderuje żadnego obrazu. `showMediaHint` pokazuje jedynie surowe ID (`"Primary media id: abc123"`), a nie faktyczny obraz. Widget e-commerce bez wizualizacji produktu nie spełnia podstawowej funkcji galerii handlowej.

#### CODE-07 — Brak walidacji `compareAtAmount > amount`
**Plik:** `core/widgets/core/productGallery.tsx:444-448`
**Opis:** Przekreślona "poprzednia cena" jest wyświetlana dla każdego `compareAtAmount !== null` bez sprawdzenia czy jest wyższa od `amount`. Możliwe wyświetlenie mylącego "obniżenia" gdy `compareAtAmount < amount` (np. cena wzrosła).

#### CODE-08 — Brak klikalne linki do stron produktów
**Plik:** `core/widgets/core/productGallery.tsx:406-460`
**Opis:** Każda karta ma `slug` produktu, ale `<article>` nie jest owinięty w `<a href>` ani nie zawiera żadnego linku. Użytkownik nie może kliknąć w produkt i przejść na jego stronę. Brak pola konfiguracyjnego `baseUrl` (np. `/products/`) w modelu danych.

### 3.2 Problemy UX edytora (kod)

#### UX-01 — Duplikacja `SurfaceFields` w Wizard i Visual
**Plik:** `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx:169, 266`
**Opis:** Komponent `SurfaceFields` (4 pola kolorów: cardBackground, cardBorder, emptyBackground, emptyBorder) jest renderowany zarówno w `ProductGalleryWizardEditor` jak i `ProductGalleryVisualEditor`. Wizard powinien być szybkim startem (źródło + layout), nie duplikować zaawansowanych opcji stylowania z Visual.

#### UX-02 — `showMediaHint` jako "technical helper" w edytorze użytkownika
**Plik:** `core/admin/ui/widgets/editors/ProductGalleryEditors.tsx:222-234`
**Opis:** Toggle "Show media hint" jest opisany jako "Technical helper showing primary media ID in cards". Pole deweloperskie jest dostępne dla redaktorów CMS bez ostrzeżenia o jego technicznym charakterze ani informacji że nie powinno być włączone na produkcji.

#### UX-03 — `emptyState.description` nie może być wyczyszczone do pustego
**Plik:** `core/widgets/core/productGallery.tsx:313-318`
**Opis:** Helper `text()` zawsze zwraca fallback gdy wartość jest pusta (`""`). Użytkownik wpisujący pusty opis w edytorze zobaczy że pole natychmiast wraca do tekstu domyślnego. Brak możliwości ustawienia pustego opisu pustego stanu.

#### UX-04 — Brak podglądu siatki kolumn przed zapisem
**Opis:** Zmiana liczby kolumn (2/3/4) w select nie daje wizualnego preview jak będzie wyglądała siatka. Trzeba zapisać i zobaczyć na canvas.

#### UX-05 — `collectionIds` wymaga wpisania surowych ID
**Opis:** Pole `collectionIds` w `CommerceSourceFields` akceptuje surowe identyfikatory kolekcji. Brak dropdownu / autocomplete z listą dostępnych kolekcji — użytkownik musi znać ID z bazy danych.

#### UX-06 — Brak informacji o runtime resolverze w edytorze
**Opis:** Widget wymaga zewnętrznego resolvera do załadowania produktów. W edytorze nie ma żadnego wskaźnika czy resolver jest podłączony, kiedy dane były ostatnio pobrane (poza polem `resolvedAt` w Advanced) ani przycisku "Odśwież produkty".

---

## 4. Wyniki testów Playwright — Admin UI

> *(Sekcja zostanie uzupełniona po testach)*

### 4.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie `cards` / `compact` w selectorze wariantów | — |
| Badge "Selected" na aktywnym wariancie | — |
| Podgląd canvas aktualizuje się po zmianie wariantu | — |

### 4.2 Edytor Wizard

| Test | Wynik |
|------|-------|
| Sekcja "Product source" widoczna i konfiguralna | — |
| Zmiana `limit` (suwak / input) | — |
| Zmiana `sortField` / `sortDir` | — |
| Select "Columns" 2 / 3 / 4 — zmiana w canvas | — |
| Select "Card style" outlined / minimal — zmiana w canvas | — |
| SurfaceFields — zmiana cardBackground | — |
| SurfaceFields — clear cardBackground | — |

### 4.3 Edytor Visual

| Test | Wynik |
|------|-------|
| Toggle "Show excerpt" — efekt w canvas | — |
| Toggle "Show price" — efekt w canvas | — |
| Toggle "Show stock badge" — efekt w canvas | — |
| Toggle "Show media hint" — efekt w canvas | — |
| Empty state title — zmiana | — |
| Empty state description — zmiana / próba wyczyszczenia | — |
| SurfaceFields — duplikacja względem Wizard | — |

### 4.4 Edytor Advanced

| Test | Wynik |
|------|-------|
| "Resolved items: 0 · Total: 0" przy braku danych | — |
| Query preview JSON — poprawność | — |
| Runtime error flag — wprowadzenie tekstu → error banner widoczny | — |

### 4.5 Canvas / podgląd

| Test | Wynik |
|------|-------|
| Empty state widoczny przy braku produktów | — |
| Error banner widoczny przy ustawionym resolved.error | — |
| `data-widget="product-gallery"` atrybut obecny | — |
| `data-product-gallery-count` poprawna wartość | — |

---

## 5. Wyniki testów Playwright — Frontend

> *(Sekcja zostanie uzupełniona po testach)*

| Test | Admin UI | Frontend | Zgodność |
|------|----------|----------|----------|
| Empty state rendering | — | — | — |
| Konfiguracja kolumn | — | — | — |
| Card style outlined / minimal | — | — | — |
| Wyświetlanie ceny / stock / excerpt | — | — | — |
| Responsywność (mobile / tablet) | — | — | — |

---

## 6. Braki funkcjonalne

### 6.1 Zidentyfikowane z analizy kodu

| ID | Opis | Priorytet |
|----|------|-----------|
| BF-01 | Brak wyświetlania obrazu produktu na karcie — `primaryMediaId` ignorowane | Wysoki |
| BF-02 | Brak linku do strony produktu — karta nie jest klikalnym `<a>` | Wysoki |
| BF-03 | Brak CTA na karcie (Add to cart / View product) | Wysoki |
| BF-04 | Wariant `compact` niezaimplementowany — identyczny render jak `cards` | Wysoki |
| BF-05 | Brak nagłówka sekcji galerii (`title` / `description`) | Średni |
| BF-06 | Brak paginacji / "Załaduj więcej" (tylko statyczny limit 1–48) | Średni |
| BF-07 | Brak badge statusu produktu na karcie (draft/archived) | Średni |
| BF-08 | Brak picker/autocomplete dla `collectionIds` — wymagane surowe ID | Średni |
| BF-09 | Brak loading state / skeleton podczas pobierania produktów | Średni |
| BF-10 | Brak manualnego układania produktów (drag-and-drop reorder) | Niski |
| BF-11 | Brak filtra cenowego (min/max price) w source | Niski |
| BF-12 | Brak pola `baseUrl` do stron produktów | Wysoki |
| BF-13 | Brak pola `alt` dla przyszłych obrazów produktów | Średni |
| BF-14 | `emptyState.description` nie może być puste — brak możliwości jednolinijkowego empty state | Niski |

---

## 7. Problemy dostępności (Accessibility)

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Brak `<a>` linku na kartach — karty produktów są nieklikalnym `<article>` (powiązane z BF-02) | WCAG 2.1 2.1.1 | Wysoki |
| A2 | `showMediaHint` wyświetla surowe ID jako widoczny tekst — nieznaczący dla czytników ekranowych | WCAG 2.1 1.3.1 | Niski |
| A3 | Stock badge ma tylko kolor (zielony/czerwony/żółty) bez ikony — brak non-color indicator | WCAG 2.1 1.4.1 | Średni |
| A4 | `<article>` bez `aria-label` ani `aria-labelledby` — czytnik nie zidentyfikuje kontekstu karty | WCAG 2.1 4.1.2 | Średni |
| A5 | Brak `<img alt>` na kartach (obrazy nie są renderowane — BF-01) | WCAG 2.1 1.1.1 | Wysoki |
| A6 | Empty state container (`<div>`) nie ma roli ani live region — czytnik nie ogłosi pustego stanu | WCAG 2.1 4.1.3 | Niski |

---

## 8. Podsumowanie wstępne (analiza kodu)

| Kategoria | Liczba |
|-----------|--------|
| Błędy w kodzie | 8 |
| Problemy UX edytora | 6 |
| Braki funkcjonalne | 14 |
| Problemy dostępności | 6 |

**Krytyczne (blokujące podstawową funkcję e-commerce):**
- Brak obrazu produktu (CODE-06 / BF-01)
- Brak linku do strony produktu (CODE-08 / BF-02)
- Wariant `compact` niezaimplementowany (CODE-01 / BF-04)

**Wysokie (poważnie ograniczają UX):**
- Dead code w klasach CSS kart i empty state (CODE-02, CODE-03)
- Brak walidacji compareAtAmount (CODE-07)
- Duplikacja SurfaceFields (UX-01)

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

> *(Do uzupełnienia po testach Playwright)*

| ID | Opis | Plik |
|----|------|------|
| S-01 | Admin UI — widok domyślny (empty state) | — |
| S-02 | Admin UI — Wizard editor otwarty | — |
| S-03 | Admin UI — Visual editor otwarty | — |
| S-04 | Admin UI — Advanced editor / Query preview | — |
| S-05 | Admin UI — card style outlined | — |
| S-06 | Admin UI — card style minimal | — |
| S-07 | Admin UI — kolumny 2 / 3 / 4 | — |
| S-08 | Frontend — strona testowa z widgetem | — |
| S-09 | Frontend — porównanie z Admin UI canvas | — |
