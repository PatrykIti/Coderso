# RAPORT: Product Gallery Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright — Product Gallery Widget
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko frontend:** http://localhost:3000
> **Strona testowa:** `Test — Product Gallery Widget` → `/test-product-gallery-widget`

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

> **Strona testowa:** `Test — Product Gallery Widget` (`/test-product-gallery-widget`)
> **ID strony:** `da39b2bd-bac7-40c5-8ace-2f82bac6a00f`

### 4.1 Warianty

| Test | Wynik |
|------|-------|
| Przełączanie `cards` / `compact` w Visual → variant selector | ✓ UI zmienia badge "Selected" / "Pick" |
| Badge "Selected" na aktywnym wariancie | ✓ Działa poprawnie |
| Canvas aktualizuje się po zmianie wariantu `cards → compact` | ✗ HTML identyczny — wariant `compact` nie jest implementowany (CODE-01) |

### 4.2 Edytor Wizard

| Test | Wynik |
|------|-------|
| Sekcja "Product source" widoczna i konfiguralna | ✓ Limit, Search, Collections, Sort field/dir, Status filter |
| Collections picker — dostępność kolekcji | ✗ "No commerce collections are available yet" — brak listy kolekcji (UX-05) |
| Zmiana `sortField` / `sortDir` (select) | ✓ Zmiana dostępna |
| Select "Columns" 2 / 3 / 4 | ✓ Zmiana zapisuje się (widać efekt na froncie) |
| Select "Card style" outlined / minimal | ✓ Zmiana zapisuje się |
| SurfaceFields — zmiana cardBackground (`#ff0000`) | ✓ Wartość przyjęta w input |
| SurfaceFields — Clear button działa | ✓ Pole wraca do pustego |
| Tryb Wizard jest domyślny (pierwsza wizyta widgetu) | ✓ Pokazuje się jako first-step z przyciskiem "Continue to layout and styling" |
| Po kliknięciu "Continue" pojawiają się zakładki Wizard/Visual/Advanced | ✓ |

### 4.3 Edytor Visual

| Test | Wynik |
|------|-------|
| Przełącznik wariantów (cards/compact) widoczny w Visual | ✓ Sekcja "Product Gallery Variants" na górze Visual |
| Toggle "Show price" — wyłączenie (frontend) | ✓ Cena znika z renderowanej karty |
| Toggle "Show stock badge" | ✓ Działa (nie testowane bezpośrednio w canvas, potwierdzono via HTML) |
| Toggle "Show media hint" — włączenie (frontend) | ✓ "No primary media attached" pojawia się w karcie |
| Empty state title — zmiana | ✓ Pole edytowalne |
| Empty state description — wyczyszczenie do pustego | ✗ Pole wraca do domyślnego tekstu — UX-03 potwierdzony |
| SurfaceFields obecne w Visual (duplikacja z Wizard) | ✓ UX-01 potwierdzony — te same 4 pola kolorów co w Wizard |
| Canvas — canvas pokazuje empty state (brak produktów) | ✓ Admin canvas nie uruchamia resolver — zawsze empty state |

### 4.4 Edytor Advanced

| Test | Wynik |
|------|-------|
| "Resolved items: 0 · Total: 0" przy braku danych | ✓ Wyświetlone poprawnie |
| Query preview JSON | ✓ `{"pagination":{"limit":8,"offset":0},"sort":[{"field":"updatedAt","dir":"desc"}]}` |
| Runtime error flag — banner "Commerce runtime warning: ..." | ✓ Banner amber pojawia się natychmiast w canvas |
| Advanced editor zawiera sekcje Layout i Visibility (tokeny globalne) | ✓ Widoczne — poza kodem widgetu (globalny edytor) |

### 4.5 Canvas — Admin UI

| Test | Wynik |
|------|-------|
| Empty state widoczny zawsze (brak runtime resolver) | ✓ |
| `data-widget="product-gallery"` obecny | ✓ |
| `data-product-gallery-count="0"` zawsze w admin | ✓ / ✗ Zawsze 0 — resolver nie działa w preview |
| Error banner przy `resolved.error` ustawionym | ✓ |
| Klasa article ends z trailing space — dead code (CODE-02) | ✓ Potwierdzono: `"space-y-3 rounded-xl border p-4 "` |
| Empty state div ends z trailing space — dead code (CODE-03) | ✓ Potwierdzono: `"rounded-xl border border-dashed px-4 py-6 text-center "` |

#### NOWE ZNALEZISKO — Resolver nie działa w Admin Preview

> **KRYTYCZNE:** W systemie istnieje co najmniej jeden opublikowany produkt ("Alpha Widget Pro", `$199.00`, In stock). Admin canvas zawsze pokazuje empty state — commerce runtime resolver **nie jest uruchamiany** podczas podglądu w edytorze. Edytorzy nie mogą zobaczyć jak galeria wygląda z prawdziwymi produktami bez publikacji strony i sprawdzenia frontendu.

---

## 5. Wyniki testów Playwright — Frontend

> **URL:** `http://localhost:3000/test-product-gallery-widget`
> **Produkt w systemie:** "Alpha Widget Pro", slug `/alpha-widget-pro`, status Published

### 5.1 Zgodność Admin ↔ Frontend

| Test | Admin UI | Frontend | Zgodność |
|------|----------|----------|----------|
| Empty state rendering (brak produktów) | ✓ Wyświetla | ✗ Nie wyświetla (są produkty) | ✗ Rozbieżność — resolver nie działa w admin |
| Produkt ładuje się | ✗ Zawsze 0 produktów | ✓ "Alpha Widget Pro" widoczny | ✗ Rozbieżność — admin preview = pusty |
| Konfiguracja 3 kolumn | N/A (puste) | ✓ `md:grid-cols-3` | ✓ |
| Konfiguracja 4 kolumn | N/A (puste) | ✓ `md:grid-cols-2 xl:grid-cols-4` | ✓ |
| Card style outlined | N/A (puste) | ✓ Klasa `border` obecna w `<article>` | ✓ |
| Card style minimal | N/A (puste) | ✓ Brak klasy `border`, ale `style="border-color:..."` jest! (CODE-04) | ✗ Bug |
| Toggle "Show price" = false | N/A | ✓ Cena ukryta | ✓ |
| Toggle "Show media hint" = true | N/A | ✓ "No primary media attached" | ✓ |
| Responsywność mobile (375px) | N/A | ✓ 1 kolumna na mobile | ✓ |
| Brak linku do produktu | ✓ | ✓ | ✓ (to powinien być bug, nie feature) |

### 5.2 Obserwacje z frontendu

| Obserwacja | Szczegóły |
|------------|-----------|
| `data-product-gallery-count="1"` | ✓ Poprawna wartość na froncie |
| `data-product-id` per karta | ✓ UUID produktu obecny |
| Cena produktu | `$19,900.00` (admin: `$199.00`) — potencjalne przechowywanie w centach |
| Compare at | `$24,900.00` (strikethrough) — wyższy niż cena, CODE-07 nie triggeruje |
| Brak `<img>` w karcie | ✓ Potwierdza CODE-06 / BF-01 |
| Brak `<a>` w karcie | ✓ Potwierdza CODE-08 / BF-02 / A1 |
| `<article>` bez `aria-label` | ✓ Potwierdza A4 |
| Stock badge — tekst bez ikony | ✓ Potwierdza A3 |

#### NOWE ZNALEZISKO — Potencjalny błąd formatowania ceny

> **Produkt w Commerce admin:** `$199.00` | **Renderowanie na froncie:** `$19,900.00`
> Możliwe przyczyny: cena przechowywana jako grosze (19900 ¢ = $199.00), ale widget renderuje surową wartość (19900) jako dolary → $19,900.00. Wymaga weryfikacji modelu danych commerce. **Jeśli potwierdzone — poważny błąd cenowy.**

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

## 8. Podsumowanie końcowe (po testach)

| Kategoria | Liczba |
|-----------|--------|
| Błędy w kodzie | 8 |
| Nowe znaleziska z testów | 2 |
| Problemy UX edytora | 6 |
| Braki funkcjonalne | 14 |
| Problemy dostępności | 6 |
| **Łącznie** | **36** |

### Krytyczne (blokujące podstawową funkcję e-commerce)

| ID | Problem | Status |
|----|---------|--------|
| CODE-06 / BF-01 | Brak obrazu produktu na karcie | Potwierdzony testami |
| CODE-08 / BF-02 | Brak linku do strony produktu | Potwierdzony testami |
| CODE-01 / BF-04 | Wariant `compact` niezaimplementowany | Potwierdzony testami |
| NEW-01 | Admin preview nie uruchamia commerce resolver — zawsze empty state | Potwierdzony testami |

### Wysokie (poważnie ograniczają UX)

| ID | Problem | Status |
|----|---------|--------|
| CODE-02, CODE-03 | Dead code — `legacyCardSurfaceClass` i `legacyEmptyClass` zawsze `""` | Potwierdzony przez HTML |
| CODE-04 | Minimal card dostaje `border-color` inline bez klasy `border` → niewidoczna | Potwierdzony testami |
| UX-03 | `emptyState.description` nie może być puste | Potwierdzony testami |
| UX-01 | Duplikacja SurfaceFields w Wizard i Visual | Potwierdzony testami |
| NEW-02 | Potencjalny błąd formatowania ceny (centygroszowy) — $199 → $19,900 | Wymaga weryfikacji |

### Rozbieżności Admin UI ↔ Frontend

| Rozbieżność | Przyczyna |
|-------------|-----------|
| Admin canvas zawsze pusty, frontend pokazuje produkty | Commerce runtime resolver nie działa w admin preview |
| `data-product-gallery-count="0"` w admin vs `"1"` na froncie | Jw. — resolver nie jest uruchamiany w edytorze |
| Cena: $199.00 (admin Commerce) vs $19,900.00 (frontend widget) | Potencjalne przechowywanie w centach bez konwersji |

---

## 9. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| ID | Opis | Plik |
|----|------|------|
| S-01 | Admin UI — widok domyślny (empty state po dodaniu widgetu) | `PRODUCT_GALLERY_01_default_empty_state.png` |
| S-02 | Admin UI — Visual editor z variant selector (cards / compact) | `PRODUCT_GALLERY_02_visual_editor_variants.png` |
| S-03 | Admin UI — Compact variant wybrany (identyczny canvas jak Cards) | `PRODUCT_GALLERY_03_compact_variant_no_diff.png` |
| S-04 | Admin UI — Wizard editor (product source + layout + surfaces) | `PRODUCT_GALLERY_04_wizard_editor.png` |
| S-05 | Admin UI — Card style minimal, 4 kolumny (Wizard) | `PRODUCT_GALLERY_05_wizard_minimal_4col.png` |
| S-06 | Admin UI — Visual editor (toggles fields + empty state) | `PRODUCT_GALLERY_06_visual_editor_fields.png` |
| S-07 | Admin UI — Advanced editor (query preview JSON) | `PRODUCT_GALLERY_07_advanced_editor.png` |
| S-08 | Admin UI — Error banner (runtime error flag ustawiony) | `PRODUCT_GALLERY_08_error_banner_canvas.png` |
| S-09 | Frontend — produkt "Alpha Widget Pro" renderowany w karcie | `PRODUCT_GALLERY_09_frontend_product_rendered.png` |
| S-10 | Frontend — 3 kolumny, outlined card style | `PRODUCT_GALLERY_10_frontend_3col_outlined.png` |
| S-11 | Frontend — widok mobile (375px) — 1 kolumna | `PRODUCT_GALLERY_11_frontend_mobile.png` |
| S-12 | Frontend — cena ukryta (Show price = false) | `PRODUCT_GALLERY_12_frontend_no_price.png` |
| S-13 | Frontend — Media hint włączony ("No primary media attached") | `PRODUCT_GALLERY_13_frontend_media_hint.png` |

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Product Gallery is classification only.
  Commerce/product-specific behavior continues through the `TASK-280` family.
- Shared rows that match existing TASK-256 safe-output or accessibility
  mechanisms remain referenced by `TASK-256-07` and `TASK-256-08`.
