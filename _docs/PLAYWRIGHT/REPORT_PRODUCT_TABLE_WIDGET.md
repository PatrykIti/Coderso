# RAPORT: Product Table Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zamknięty po TASK-281
> **Pierwotna sesja Playwright:** 2026-05-16
> **Raport closure:** 2026-05-22
> **Sesja:** Playwright (Product Table Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** ProductTableTestproducttabletest (`/producttabletestproducttabletest`) — UUID: `7227f3ad-d3bf-4fc2-88b1-d61d52df59df`

---

## 1. Przegląd widgetu

**Typ:** `product-table`
**Moduł:** Commerce (wymaga modułu `commerce`)
**Warianty:** `default`, `compact`
**Złożoność:** composite
**Odbiorca:** intermediate
**Kategoria:** content

Widget wyświetla produkty z katalogu commerce w układzie tabeli HTML z
opcjonalnym nagłówkiem sekcji, współdzielonym rejestrem kolumn, guardrailami
widoczności Product/Price/Stock, bounded status/stock presentation,
public-safe thumbnail/excerpt context, bezpiecznymi linkami do produktów,
opcjonalną kolumną Action, bounded layout/sticky-header controls, publicznymi
SSR controls dla search/filter/sort/pagination oraz opcjonalnym eksportem CSV.
Hydratacja danych następuje w runtime przez `hydrateProductTableRuntimeData()`,
a admin preview korzysta z tego samego query contract przez wewnętrzny preview
route i `WidgetPreviewState`.

> **Uwaga (2026-05-22):** Sekcje 3-11 zachowują historyczną bazę z sesji
> Playwright z 2026-05-16. Sekcje 1-2 opisują aktualny shipped contract po
> zamknięciu rodziny `TASK-281`, a późniejsze zamknięcia lokalnych findingów są
> oznaczone inline oraz w sekcjach `Status po TASK-*`.

---

## 2. Analiza kodu — aktualna struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola | Uwagi |
|--------|------|-------|
| **source** | `limit` (1–48), `search`, `collectionIds[]`, `status[]`, `sortField`, `sortDir` | Bazowy authored query dla runtime/admin preview; public paging korzysta z osobnych block-scoped query params. |
| **header** | `eyebrow`, `title`, `description` | Opcjonalny kontekst sekcji; `title` jest preferowaną etykietą sekcji/tabeli dla dostępności i CSV filename fallback. |
| **fields** | `showImage`, `showTitle`, `showExcerpt`, `showSlug`, `showPrice`, `showStatus`, `showStock`, `showStockQuantity`, `showCompareAt`, `showCollectionCount` | 9 kolumn z rejestru + stock quantity sub-toggle; guardraile wymuszają co najmniej jedną kolumnę identity i pricing oraz czyszczą quantity gdy Stock jest wyłączony. |
| **controls** | `showSearchInput`, `showCollectionFilter`, `showStatusFilter`, `sorting`, `pagination`, `pageSize` | Publiczne SSR controls. `sorting`: `none`, `indicator`, `interactive`; `pagination`: `none`, `paged`, `load-more`; `pageSize` clamp `1..24`. |
| **format** | `moneyLocale`, `currencyDisplay` | Widget-owned locale/display controls dla Price i Compare at. |
| **export** | `enabled`, `label` | Opcjonalny SSR CSV download dla aktualnie widocznych wierszy i kolumn. |
| **labels** | `image`, `title`, `excerpt`, `price`, `compareAt`, `status`, `stock`, `collections`, `slug` | 9 nagłówków współdzielonych przez renderer i edytor. |
| **links** | `linkedColumn`, `showAction`, `actionLabel`, `openInNewTab` | Safe relative product links dla kolumny Product/Slug i opcjonalnej kolumny Action. |
| **emptyState** | `title`, `description` | Komunikat gdy brak produktów. |
| **style** | `density`, `rowTreatment`, `hoverRows`, `stickyHeader`, `maxWidth`, `align`, `typography`, `tableBackground`, `tableBorderColor`, `headerBackground`, `emptyBackground`, `emptyBorderColor` | Bounded layout + typography controls oraz 5 clearable surface fields. |
| **resolved** | `items[]`, `total`, `resolvedAt`, `error`, `runtime` | Runtime only. `items[]` może zawierać public-safe `media` i `productHref`; `runtime` trzyma aktywny query state, retained params, available filters i bezpieczne hrefy prev/next/clear. |

### 2.2 Kolumny renderowane

| Kolumna | Zawsze widoczna | Toggle | Label edytowalny w edytorze |
|---------|-----------------|--------|-----------------------------|
| Image | ✗ | ✓ `showImage` (domyślnie OFF) | ✓ (Visual) |
| Product (title) | ✗ | ✓ `showTitle` (domyślnie ON; guardrail identity) | ✓ (Visual) |
| Excerpt | ✗ | ✓ `showExcerpt` (domyślnie OFF) | ✓ (Visual) |
| Slug | ✗ | ✓ `showSlug` (domyślnie ON) | ✓ (Visual) |
| Price | ✗ | ✓ `showPrice` (domyślnie ON; guardrail pricing) | ✓ (Visual) |
| Compare At | ✗ | ✓ `showCompareAt` (domyślnie OFF) | ✓ (Visual) |
| Status | ✗ | ✓ `showStatus` (domyślnie ON) | ✓ (Visual) |
| Stock | ✗ | ✓ `showStock` (domyślnie ON) | ✓ (Visual) |
| Collections count | ✗ | ✓ `showCollectionCount` (domyślnie OFF) | ✓ (Visual) |
| Action | ✗ | ✓ `links.showAction` | ✓ `links.actionLabel` |

### 2.3 Tryby edytora

- **Wizard** — source/query basics, admin preview status summary, surfaces.
- **Visual** — admin preview status summary, layout and style, section header,
  columns, column labels, public controls, export and currency, stock
  presentation, links and actions, empty state, surfaces.
- **Advanced** — read-only runtime/admin preview diagnostics, query
  diagnostics, manual preview refresh.

### 2.4 Runtime i rendering

`CommerceWidgetRuntimeCard` nadal dostarcza `id`, `title`, `slug`, `excerpt`,
`status`, `pricing.*`, `stock.*`, `primaryMediaId`, `mediaIds[]`, oraz
`collectionIds[]`, a Product Table wykorzystuje je teraz bezpośrednio do:

- renderowania Title, Slug, Price, Compare at, Status, Stock i opcjonalnego
  quantity copy;
- opcjonalnych kolumn Image i Excerpt przez backend-owned public-safe media
  enrichment i plain-text clamping;
- bezpiecznych `productHref` dla linked Title/Slug i opcjonalnej kolumny
  Action;
- runtime metadata dla search/filter/sort/page state, retained params, clear
  href, next/previous href, i rejected widget tokens;
- export filename fallback `header.title -> header.eyebrow -> product-table.csv`.

## 3. Wyniki testów Playwright — Admin UI (localhost:5173)

### 3.1 Wizard editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Formularz "Table source" widoczny | ✓ Działa | Limit (spinbutton), Search, Sort field, Sort direction |
| Limit domyślny = 12 | ✓ Działa | Spinbutton pokazuje "12" |
| Sort field = Updated (updatedAt) | ✓ Działa | Combobox poprawny |
| Sort direction = Descending | ✓ Działa | |
| Status filter: checkboxy draft/published/archived | ✓ Działa | Domyślnie wszystkie odznaczone (runtime default) |
| Sekcja Surfaces — 5 clearable inputów | ✓ Działa | Table background, Table border, Header background, Empty background, Empty border |
| Przycisk Clear na polach Surfaces | ✓ Działa | Wszystkie 5 pól ma Clear button |
| Collections: "No commerce collections available yet" | ✓ Informacja | Kolekcji brak — wyświetla placeholder |
| Przycisk "Continue to layout and styling" | ✓ Działa | Przechodzi do Visual editor |

### 3.2 Visual editor — Columns

| Test | Wynik | Uwagi |
|------|-------|-------|
| 5 togglei widocznych | ✓ Działa | Show slug, Show status, Show stock, Show compare-at price, Show collection count |
| Domyślnie: slug ON, status ON, stock ON | ✓ Potwierdzone | Checkboxy zaznaczone |
| Domyślnie: compareAt OFF, collectionCount OFF | ✓ Potwierdzone | Checkboxy odznaczone |
| Toggle "Show slug" → wyłączenie | ✓ Działa | Po publikacji na froncie kolumna Slug znika |
| Toggle "Show compare-at price" → włączenie | ✓ Działa | Na froncie pojawia się kolumna "Compare at" |
| Toggle "Show collection count" → włączenie | ✓ Działa | Na froncie pojawia się kolumna "Collections" |
| Admin preview przy empty state — brak efektu toggle | ✓ Potwierdzone | Empty state nie pokazuje tabelki — nie można zobaczyć efektu toggle w admin |
| Brak togglea dla kolumny Product (title) | ✗ BUG-04 | Kolumna zawsze widoczna |
| Brak togglea dla kolumny Price | ✗ BUG-04 | Kolumna zawsze widoczna |

### 3.3 Visual editor — Column labels

| Test | Wynik | Uwagi |
|------|-------|-------|
| Sekcja "Column labels" widoczna | ✓ Działa | |
| Pole edycji "Product" | ✓ Działa | Zmiana na "Produkt" działa i pojawia się na froncie |
| Pole edycji "Price" | ✓ Działa | |
| Pole edycji "Status" | ✓ Działa | |
| Brak pola edycji "Slug" | ✗ BUG-01 | Kolumna Slug nie ma edytora etykiety |
| Brak pola edycji "Stock" | ✗ BUG-01 | Kolumna Stock nie ma edytora etykiety |
| Brak pola edycji "Compare at" | ✗ BUG-01 | Kolumna Compare at nie ma edytora etykiety |
| Brak pola edycji "Collections" | ✗ BUG-01 | Kolumna Collections nie ma edytora etykiety |

### 3.4 Visual editor — Empty state

| Test | Wynik | Uwagi |
|------|-------|-------|
| Edycja tytułu empty state | ✓ Działa | Zmiana widoczna od razu w admin preview |
| Edycja opisu empty state | ✓ Działa | |
| Zmiany odzwierciedlone w admin canvas | ✓ Działa | Tekst w preview aktualizuje się live |
| Puste pola → powrót do defaults | ✓ Potwierdzone | Normalizacja ustawia defaults gdy pusty string |

### 3.5 Visual editor — Surfaces

| Test | Wynik | Uwagi |
|------|-------|-------|
| 5 clearable inputów dla kolorów | ✓ Działa | Table background, Table border, Header background, Empty background, Empty border |
| Clear button na każdym polu | ✓ Działa | Wszystkie pola mają Clear (asymetria naprawiona vs FeatureGrid) |
| Wpisanie koloru hex (#f0f4ff) | ✓ Działa | Kolor pojawia się w tabeli na froncie |
| Clear → powrót do var(--color-bg) | ✓ Działa | Po Clear pole jest puste (fallback do defaults) |
| Zmiana koloru tła tabeli odzwierciedlona na froncie | ✓ Działa | `background-color: rgb(240, 244, 255)` w inline style |

### 3.6 Advanced editor

| Test | Wynik | Uwagi |
|------|-------|-------|
| Sekcja "Runtime payload" widoczna | ✓ Działa | "Resolved items: 0 · Total: 0" |
| Admin zawsze pokazuje 0 items | ✓ Potwierdzone | Hydratacja danych jest wyłącznie na froncie — KRYTYCZNY UX BUG |
| Pole "Runtime error flag" edytowalne | ✗ UX-09 | Pole error jest edytowalne przez użytkownika — powinno być read-only |
| Query preview JSON | ✓ Działa | Pokazuje `{"pagination": {"limit": 12, "offset": 0}, "sort": [...], "status": [...]}` |
| Query preview aktualizuje się po zmianie source | ✓ Działa | Status filter ["draft","published"] pojawia się po zaznaczeniu |
| Sekcja "Layout" — Container, Padding, Margin tokeny | ✓ Działa | Standardowe tokeny layoutu |
| Sekcja "Visibility" — Desktop/Tablet/Mobile switches | ✓ Działa | Trzy przełączniki widoczności |

### 3.7 Renderowanie admin preview

| Test | Wynik | Uwagi |
|------|-------|-------|
| Admin preview: empty state gdy brak produktów commerce | ✓ Działa | `data-product-table-count="0"` |
| Admin preview: NIGDY nie pokazuje realnych danych | ✗ KRYTYCZNE | Nawet po dodaniu produktów admin preview zawsze pokazuje empty state |
| Empty state title zmienia się live w preview | ✓ Działa | Edycja tekstu visible od razu |
| Empty state border dashed | ✓ Działa | `border-dashed` klasa widoczna |
| Błąd commerce (amber box) — nie testowano | — | Brak możliwości wywołania w tej sesji |

---

## 4. Wyniki testów Playwright — Frontend (localhost:3000)

**Nota:** Strona testowa dostępna pod `/producttabletestproducttabletest` (podwójony slug — patrz sekcja 11).

### 4.1 Tabela porównawcza Admin ↔ Frontend

| Test | Admin | Front | Zgodność |
|------|-------|-------|----------|
| Empty state renderuje się | ✓ | ✓ | ✓ Zgodne |
| Tabela z danymi (2 produkty) | ✗ nie renderuje | ✓ renderuje | ✗ Rozbieżność — Admin nie hydruje danych |
| Kolumna Slug (toggle OFF) | — | ✓ ukryta | — |
| Kolumna Compare At (toggle ON) | — | ✓ widoczna | — |
| Kolumna Collections (toggle ON) | — | ✓ widoczna | — |
| Zmiana etykiety "Produkt" | — | ✓ widoczna | — |
| Custom kolor tła (#f0f4ff) | — | ✓ rgb(240, 244, 255) | — |
| Empty state custom text | ✓ live | ✓ po publish | ✓ Zgodne |

### 4.2 HTML tabeli — wyniki na froncie

```
Kolumny wyświetlone (po konfiguracji): Produkt, Slug, Price, Compare at, Status, Stock, Collections
Dane wiersz 1: ["Gamma Consulting Draft (draft)", "/gamma-consulting-draft", "$120,000.00", "-", "draft", "In stock", "0"]
Dane wiersz 2: ["Alpha Widget Pro", "/alpha-widget-pro", "$19,900.00", "$24,900.00", "published", "In stock", "0"]
Tło tabeli: rgb(240, 244, 255) ← z custom koloru
```

### 4.3 Weryfikacja struktury HTML (dostępność)

| Sprawdzenie | Wynik | Uwagi |
|------------|-------|-------|
| `<caption>` w tabeli | ✗ BRAK | Potwierdzone — A1 |
| `scope="col"` na `<th>` | ✗ BRAK | 4 `<th>` bez scope — A2 |
| `aria-label` na sekcji | ✗ BRAK | `<section>` bez aria-label |
| `aria-label` na `<table>` | ✗ BRAK | |
| Linki w wierszach tabeli | ✗ BRAK | Slug jako plain text `/<slug>`, nie `<a>` |
| Efekt hover na wierszach | ✗ BRAK | Klasy: `border-b border-[var(--color-border)]/70 last:border-b-0` — brak `hover:bg-*` |
| Status jako badge | ✗ BRAK | Historyczne ustalenie z 2026-05-16; fixed in `TASK-281-03`. |
| Quantity (stock.quantity) wyświetlana | ✗ BRAK | Historyczne ustalenie z 2026-05-16; fixed in `TASK-281-03`. |
| `role="alert"` na błędzie commerce | ✗ BRAK | — |
| Mobilne overflow-x-auto | ✓ Działa | Tabela scrolluje poziomo na 375px |

### 4.4 Responsywność

| Viewport | Wynik | Uwagi |
|---------|-------|-------|
| Desktop (1440px) | ✓ Działa | Tabela pełna szerokość |
| Mobile (375px) | ✓ Działa | Horizontal scroll przez `overflow-x-auto` |
| Brak breakpointów kolumn | — | Tabela nie zmienia struktury na mobile — poziomy scroll |

---

## 5. Znalezione błędy i problemy UX

### 5.1 Błędy funkcjonalne (Bugs) — potwierdzone testami + analiza kodu

#### BUG-00 — Admin preview NIGDY nie hydruje danych commerce — edytor zawsze pokazuje empty state
**Priorytet:** Krytyczny
**Opis:** Admin canvas nie wywołuje `hydrateProductTableRuntimeData()` — widget zawsze renderuje się z `resolved.items = []` w admin preview, niezależnie od liczby produktów w katalogu. Edytor **nie może zobaczyć swojej tabeli** z prawdziwymi danymi bez opublikowania strony i sprawdzenia frontendu. Brak możliwości testowania konfiguracji kolumn, sortowania, widoczności w admin preview.
**Potwierdzone Playwright:** `data-product-table-count="0"` w admin przez cały czas testów; `data-product-table-count="2"` na froncie po publish.
**Skutek:** Workflow edytora jest fundamentalnie zepsuty — edytor musi publikować i sprawdzać frontend żeby zobaczyć efekty konfiguracji kolumn.
**Rekomendacja:** Dodać "preview mode" resolver w admin który odpytuje commerce API z tymi samymi parametrami co runtime.
**Status (2026-05-21):** Fixed in `TASK-281-01`.

#### BUG-01 — Etykiety kolumn Slug, Stock, CompareAt, Collections niedostępne w edytorze
**Priorytet:** Wysoki
**Opis:** Sekcja "Column labels" w Visual editorze pozwala edytować tylko 3 z 7 etykiet: `title`, `price`, `status`. Etykiety `slug`, `stock`, `compareAt`, `collections` są w schemacie i w `productTableDefaults`, ale **nie mają kontrolek w edytorze**. Użytkownik może włączyć te kolumny togglem, ale nie może zmienić ich nagłówka.
**Lokalizacja:** `ProductTableEditors.tsx:197-234` (sekcja "Column labels")
**Status (2026-05-21):** Fixed in `TASK-281-02`.

#### BUG-02 — Status wyświetlany jako surowy tekst (brak badge/koloru)
**Priorytet:** Średni
**Opis:** Kolumna Status renderuje wartości `"draft"`, `"published"`, `"archived"` jako plain text. Brak wizualnego rozróżnienia (kolory, badge). Tytuł produktu poza tym dostaje suffix `(draft)` / `(archived)` poprzez `titleWithStatus()` — duplikowanie informacji gdy kolumna Status jest włączona.
**Lokalizacja:** `productTable.tsx:369-373`, `productTable.tsx:484`
**Status (2026-05-21):** Fixed in `TASK-281-03`.

#### BUG-03 — Ilość sztuk (stock.quantity) nigdy nie wyświetlana
**Priorytet:** Średni
**Opis:** `CommerceWidgetRuntimeCard` zawiera `stock.quantity` (liczba całkowita lub null) oraz `stock.inStock` (boolean), ale renderer ignoruje oba pola — wyświetla tylko etykietę stanu ("In stock", "Out of stock", "Backorder"). Użytkownik nie ma możliwości włączenia wyświetlania ilości.
**Lokalizacja:** `productTable.tsx:486-490`, `commerceWidgetShared.ts:187-193`
**Status (2026-05-21):** Fixed in `TASK-281-03`.

#### BUG-04 — Kolumna Title i Price niewyłączalne
**Priorytet:** Niski
**Opis:** Pola `showTitle` i `showPrice` nie istnieją — kolumny Product i Price są zawsze widoczne. Pozostałe 5 kolumn ma togglei. Asymetria: użytkownik może ukryć Slug, ale nie Price — mimo że oba mają te same wymagania edycyjne.
**Lokalizacja:** `productTable.tsx:421-443` (hardcoded thead bez conditionala)
**Status (2026-05-21):** Fixed in `TASK-281-02`.

---

### 5.2 Problemy UX edytora — z analizy kodu

#### UX-01 — Tylko jeden wariant (default)
**Opis:** Widget ma wyłącznie wariant `default`. Brak wariantów alternatywnych layoutów (compact, card-based, kanban). Porównując z innymi widgetami commerce (ProductGallery, ProductCompare) — brak elastyczności w wyborze widoku.
**Status (2026-05-22):** Fixed in `TASK-281-08`.
**Rekomendacja:** Dodać wariant `compact` (zmniejszone padding, mniejszy font) i/lub `striped` (alternujące kolory wierszy).

#### UX-02 — Brak paginacji / "Show more"
**Opis:** Limit to maksymalnie 48 produktów (hardcoded w schemacie). Brak paginacji, "load more" ani endless scroll. Dla katalogów z >48 produktami widget jest nieadekwatny jako główny widok katalogu.
**Status (2026-05-22):** Fixed in `TASK-281-07`.
**Rekomendacja:** Dodać opcję paginacji lub "Load more" z konfigurowalnymi page size.

#### UX-03 — Brak klikalnych wierszy / linków do produktów
**Opis:** Tabela jest read-only — wiersze nie są klikalne, nie ma linku do strony produktu. Pole `slug` wyświetla `/{slug}` jako tekst, ale nie jest hiperłączem. Tabela służy jako widok listy ale bez możliwości nawigacji.
**Status (2026-05-21):** Fixed in `TASK-281-04`.
**Rekomendacja:** Dodać opcję "row click target" (link do `/{slug}`) lub opcjonalny link w kolumnie tytułu.

#### UX-04 — Brak sortowania interaktywnego (klik w nagłówek)
**Opis:** Sortowanie konfiguruje się w edytorze przez `sortField` i `sortDir`. Na froncie użytkownik nie może kliknąć nagłówka kolumny żeby posortować — brak interaktywności. Standardowe oczekiwanie UX dla tabel danych.
**Status (2026-05-22):** Fixed in `TASK-281-07`.
**Rekomendacja:** Sortowanie interaktywne lub przynajmniej wizualny wskaźnik (ikona ▲/▼) aktywnego sortowania.

#### UX-05 — Brak miniatury obrazu produktu
**Opis:** Runtime card zawiera `primaryMediaId` i `mediaIds[]`, ale renderer nie wyświetla żadnego obrazu/thumbnails. Tabela produktów bez zdjęcia jest mniej czytelna — użytkownik musi identyfikować produkty po nazwie.
**Status (2026-05-22):** Fixed in `TASK-281-06`.
**Rekomendacja:** Dodać opcjonalną kolumnę thumbnail (`showImage` toggle) z małym `<img>` z `primaryMediaId`.

#### UX-06 — Brak wyszukiwarki inline na froncie
**Opis:** Pole `search` w source konfiguruje stałą frazę wyszukiwania. Na froncie użytkownik nie może filtrować tabeli — brak pola search w widgecie. Dla tabel z 48 produktami jest to duże ograniczenie UX.
**Status (2026-05-22):** Fixed in `TASK-281-07`.
**Rekomendacja:** Dodać opcjonalny toggle `showSearchInput` dla frontendu.

#### UX-07 — Brak opcji eksportu (CSV / clipboard)
**Opis:** Tabela prezentuje dane produktowe, ale brak przycisku eksportu. W kontekście CMS/admin użycie tablicy produktów sugeruje potrzebę eksportu danych.
**Status (2026-05-22):** Fixed in `TASK-281-09`.
**Rekomendacja:** Opcjonalny przycisk "Kopiuj do schowka" lub "Eksportuj CSV".

#### UX-08 — Brak filtrów widocznych dla użytkownika frontendu
**Opis:** Filtry (kolekcje, status, limit) są konfigurowane przez admina w edytorze — na froncie użytkownik nie może samodzielnie filtrować. Brak togglei filtrów dla użytkownika końcowego.
**Status (2026-05-22):** Fixed in `TASK-281-07`.
**Rekomendacja:** Opcjonalne `showFilters` — dropdowny po stronie klienta.

#### UX-09 — Advanced editor — "runtime error flag" jest edytowalny przez użytkownika
**Opis:** Pole "Runtime error flag" w Advanced editorze umożliwia ręczne wpisanie wartości błędu. To jest pole runtime, nie konfiguracyjne — edycja przez użytkownika może wprowadzić błędny stan (fałszywe ostrzeżenie w rendered widgecie).
**Lokalizacja:** `ProductTableEditors.tsx:284-296`
**Status (2026-05-21):** Fixed in `TASK-281-01`.
**Rekomendacja:** Zamienić na read-only display, usunąć `onChange` dla pola error.

---

## 6. Braki funkcjonalne — z analizy kodu

### BF-01 — Brak thumbnails / kolumny obraz
**Opis:** Dane runtime zawierają `primaryMediaId`, ale nie ma żadnej opcji wyświetlenia obrazu w tabeli. Standardowa tabela produktów w e-commerce zawiera miniaturę.
**Status (2026-05-22):** Fixed in `TASK-281-06`.

### BF-02 — Brak kolumny excerpt
**Opis:** `CommerceWidgetRuntimeCard` ma pole `excerpt` (string | null), ale nie ma togla `showExcerpt` ani renderowania w tabeli.
**Status (2026-05-22):** Fixed in `TASK-281-06`.

### BF-03 — Brak kolumny ilości (stock.quantity)
**Opis:** Pole `stock.quantity` jest w modelu danych ale nigdy renderowane. Zamiast "In stock" mogłoby pokazywać "In stock (42)".
**Status (2026-05-21):** Fixed in `TASK-281-03`.

### BF-04 — Brak kolorowania wierszy wg statusu
**Opis:** Wiersze dla draft/archived produktów nie mają żadnego wizualnego wyróżnienia (kolor, opacity). Standardowy UX tabel dla list z mieszanymi statusami.
**Status (2026-05-21):** Fixed in `TASK-281-03`.

### BF-05 — Brak zebra striping (alternujące kolory wierszy)
**Opis:** Wszystkie wiersze mają jednolite tło. Brak opcji `striped` alternujących wierszy dla czytelności przy długich listach.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-06 — Brak kontroli gęstości wierszy (row density)
**Opis:** Padding `py-2 px-3` hardcoded. Brak opcji compact/comfortable/spacious — ważne dla tabel z 48 produktami.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-07 — Brak nagłówka sekcji (eyebrow/title/description)
**Opis:** Widget nie ma opcji nagłówka sekcji — brak eyebrow, title, description nad tabelą. Inne widgety (FeatureGrid, Stats KPI) mają tę funkcjonalność. Brak kontekstu dla tabeli w layoutach wielowidgetowych.
**Status (2026-05-22):** Fixed in `TASK-281-06`.

### BF-08 — Brak kontroli typografii
**Opis:** Rozmiar fonta komórek (`text-sm`), nagłówków (`text-xs font-semibold uppercase`) i opcje stylu tekstowego hardcoded. Brak kontroli przez edytor.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-09 — Brak kontroli max-width i wyrównania
**Opis:** `overflow-x-auto` bez max-width ograniczenia. Tabela rozciąga się na pełną szerokość kontenera bez możliwości zwężenia.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-10 — Brak kontroli row hover (efekt hover na wierszu)
**Opis:** Brak `hover:bg-*` na wierszach. Dla klikalnej tabeli (jeśli dodany link) — hover jest niezbędny. Nawet dla read-only czytelność poprawia subtelny hover.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-11 — Brak kolumny akcji (Actions column)
**Opis:** Brak opcjonalnej kolumny z przyciskami akcji per wiersz (np. "View", "Edit"). Tabela tylko do odczytu.
**Status (2026-05-21):** Fixed in `TASK-281-04`.

### BF-12 — Brak sticky header
**Opis:** Przy 48 produktach i scrollowaniu pionowym nagłówek tabeli znika. Brak opcji `sticky header`.
**Status (2026-05-22):** Fixed in `TASK-281-08`.

### BF-13 — Brak etykiety dla kolumny "Collections count"
**Opis:** Kolumna `showCollectionCount` wyświetla liczbę kolekcji (integer), ale brak kontekstu — komórka pokazuje samo "3" bez jednostki. Etykieta nagłówka ("Collections") jest edytowalna w schemacie, ale nie w edytorze (BUG-01).
**Status (2026-05-21):** Fixed in `TASK-281-02`.

### BF-14 — Brak obsługi walut multi-currency w display
**Opis:** Formatowanie przez `Intl.NumberFormat("en-US", ...)` — zawsze lokalizacja en-US. Dla walut innych niż USD wyświetlana jest waluta z currency code (np. PLN 100.00), ale format liczby zawsze anglojęzyczny.
**Status (2026-05-22):** Fixed in `TASK-281-09`.

### BF-15 — Brak wyszukiwarki po stronie klienta
**Opis:** Patrz UX-06. Brak inline search inputu widocznego dla odwiedzającego stronę.
**Status (2026-05-22):** Fixed in `TASK-281-07` as the same frontend search gap already tracked by `UX-06`.

---

## 7. Problemy dostępności — z analizy kodu

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Tabela bez `<caption>` — brak opisu tabeli dla screen readerów (Fixed in TASK-281-05) | WCAG 1.3.1 | Wysoki |
| A2 | `<th>` bez atrybutu `scope="col"` — kolumny niezidentyfikowane dla AT (Fixed in TASK-281-05) | WCAG 1.3.1 | Wysoki |
| A3 | Status "(draft)" / "(archived)" w tytule produktu — tekst niespójny z `aria-label` (Fixed in TASK-281-03) | WCAG 4.1.2 | Średni |
| A4 | Brak `role="table"` / `aria-label` na sekcji nadrzędnej (Fixed in TASK-281-05) | WCAG 4.1.2 | Średni |
| A5 | Błąd commerce renderuje `<div>` z amber — brak `role="alert"` (Fixed in TASK-281-05) | WCAG 4.1.3 | Średni |
| A6 | Empty state bez `aria-live` — dynamiczne zmiany niezgłaszane (Fixed in TASK-281-05) | WCAG 4.1.3 | Niski |
| A7 | Brak `loading="lazy"` na przyszłych thumbnail obrazach (Fixed in TASK-281-06) | Performance | Niski |

---

## 8. Tabela podsumowania — macierz priorytetów

### Błędy krytyczne i wysokiego priorytetu

| ID | Opis | Priorytet | Potwierdzone |
|----|------|-----------|-------------|
| BUG-00 | Admin preview nigdy nie hydruje danych commerce — edytor widzi tylko empty state (Fixed in TASK-281-01) | Krytyczny | ✓ Playwright |
| BUG-01 | Brak edycji etykiet dla Slug, Stock, CompareAt, Collections (Fixed in TASK-281-02) | Wysoki | ✓ Playwright |
| A1 | Brak `<caption>` w tabeli (Fixed in TASK-281-05) | Wysoki (WCAG 1.3.1) | ✓ Playwright |
| A2 | Brak `scope="col"` na `<th>` (Fixed in TASK-281-05) | Wysoki (WCAG 1.3.1) | ✓ Playwright |
| BUG-02 | Status jako plain text — brak badge/koloru + duplikacja w tytule (Fixed in TASK-281-03) | Średni | ✓ Playwright |
| BUG-03 | stock.quantity nigdy niewyświetlany mimo że jest w danych (Fixed in TASK-281-03) | Średni | ✓ Kod |

### Pilne braki UX

| ID | Opis | Priorytet |
|----|------|-----------|
| UX-02 | Brak paginacji — max 48 produktów (Fixed in TASK-281-07) | Wysoki |
| UX-03 | Brak klikalnych wierszy / linków do produktów (Fixed in TASK-281-04) | Wysoki |
| UX-05 | Brak thumbnails — produkt bez zdjęcia (Fixed in TASK-281-06) | Wysoki |
| UX-01 | Tylko jeden wariant (default) (Fixed in TASK-281-08) | Średni |
| UX-04 | Brak sortowania interaktywnego kliknięciem nagłówka (Fixed in TASK-281-07) | Średni |
| UX-06 | Brak search inline na froncie (Fixed in TASK-281-07) | Średni |
| UX-08 | Brak filtrów widocznych dla użytkownika frontendu (Fixed in TASK-281-07) | Średni |
| UX-10 | Brak hover na wierszach tabeli (Fixed in TASK-281-08 as the same row-hover wave as BF-10) | Średni |
| UX-09 | Runtime error flag edytowalny przez użytkownika (Fixed in TASK-281-01) | Niski |
| BUG-04 | Title i Price niewyłączalne — asymetria togglei (Fixed in TASK-281-02) | Niski |

### Braki funkcjonalne (najważniejsze)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Brak thumbnails / kolumny obraz (Fixed in TASK-281-06) |
| BF-02 | Wysoki | Brak kolumny excerpt (Fixed in TASK-281-06) |
| BF-03 | Wysoki | Brak ilości sztuk (stock.quantity) w kolumnie Stock (Fixed in TASK-281-03) |
| BF-07 | Wysoki | Brak nagłówka sekcji (eyebrow/title/description nad tabelą) (Fixed in TASK-281-06) |
| BF-04 | Średni | Brak kolorowania wierszy wg statusu (Fixed in TASK-281-03) |
| BF-05 | Średni | Brak zebra striping (Fixed in TASK-281-08) |
| BF-06 | Średni | Brak kontroli gęstości wierszy (row density) (Fixed in TASK-281-08) |
| BF-10 | Średni | Brak row hover efektu (Fixed in TASK-281-08) |
| BF-11 | Średni | Brak kolumny akcji (Actions column) (Fixed in TASK-281-04) |
| BF-12 | Średni | Brak sticky header przy 48 produktach (Fixed in TASK-281-08) |
| BF-15 | Średni | Brak wyszukiwarki po stronie klienta (Fixed in TASK-281-07 as the same gap as UX-06) |

---

## 9. Zgodność Admin Preview ↔ Frontend

**Status (2026-05-21):** Fixed in `TASK-281-01`; poniższa sekcja zachowuje historyczną rozbieżność z audytu z 2026-05-16 jako dowód źródłowy.

> **Wniosek z audytu 2026-05-16: Admin preview i frontend były NIEZGODNE w kluczowym aspekcie.**

Widget Product Table ma fundamentalną rozbieżność między admin preview a frontendem:
- **Admin preview:** zawsze pokazuje empty state (`data-product-table-count="0"`) — hydratacja danych commerce nie jest wywoływana w canvas
- **Frontend:** pokazuje realne produkty po hydratacji przez `hydrateProductTableRuntimeData()` (`data-product-table-count="2"`)

Tylko elementy nie zależne od danych runtime są zgodne:
| Element | Admin | Front | Zgodność |
|---------|-------|-------|----------|
| Empty state text (title/description) | ✓ | ✓ | ✓ Zgodne |
| Empty state style (tło, border) | ✓ | ✓ | ✓ Zgodne |
| Kolory tabeli (custom background) | — | ✓ | — |
| Konfiguracja togglei kolumn | brak efektu w admin | ✓ na froncie | ✗ Rozbieżność |
| Etykiety kolumn | brak efektu w admin | ✓ na froncie | ✗ Rozbieżność |
| Dane produktów | ✗ (zawsze 0) | ✓ (2 produkty) | ✗ Rozbieżność krytyczna |

---

## 10. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|
| `pt-01-wizard-editor.png` | Wizard editor — Table source + Surfaces |
| `pt-02-visual-editor-overview.png` | Visual editor — pełny widok |
| `pt-03-advanced-editor.png` | Advanced editor — Runtime payload + Query preview |
| `pt-04-admin-published.png` | Admin — strona po publikacji |
| `pt-05-frontend-table-with-data.png` | Frontend — tabela z 2 produktami (domyślne kolumny) |
| `pt-06-frontend-mobile-375.png` | Frontend — widok mobile 375px z horizontal scroll |
| `pt-07-visual-editor-columns-section.png` | Visual editor — sekcja Columns ze wszystkimi toggleami |
| `pt-08-visual-editor-surfaces.png` | Visual editor — sekcja Surfaces z customowym kolorem |
| `pt-09-frontend-all-columns.png` | Frontend — tabela ze wszystkimi 7 kolumnami widocznymi |
| `pt-10-advanced-editor-query-preview.png` | Advanced editor — Query preview JSON |
| `pt-11-admin-preview-empty-state.png` | Admin preview zawsze pokazuje empty state (BUG-00) |

---

## 11. Statystyki

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 5 (w tym 1 krytyczny) |
| Problemy UX edytora | 9 |
| Braki funkcjonalne | 15 |
| Problemy dostępności | 7 |
| **Łącznie** | **36** |

---

*Raport wygenerowany na podstawie analizy kodu + testów Playwright — 2026-05-16.*

---

## Status po TASK-256 (2026-05-17)

- Current TASK-256 role for Product Table is classification only.
  Commerce/product-specific behavior continues through the `TASK-281` family.
- Shared rows that match existing TASK-256 safe-output or accessibility
  mechanisms remain referenced by `TASK-256-07` and `TASK-256-08`.


---

## Status po TASK-281-01 (2026-05-21)

### Fixed in TASK-281-01

- `BUG-00`: Product Table admin preview now hydrates rows through the internal
  `/admin/api/widgets/product-table/preview` route and the shared
  `WidgetPreviewState` canvas patch seam, so editors can validate live table
  output before publishing.
- `UX-09`: Advanced mode runtime diagnostics are now read-only; authors can no
  longer spoof `resolved.error` through an editable field.
- Admin preview refresh now ignores stale async responses, aborts superseded
  requests, and preserves the last safe preview payload when a newer request
  fails.

### Validation evidence

- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Status po TASK-281-02 (2026-05-21)

### Fixed in TASK-281-02

- `BUG-01`: Visual mode now exposes shared label inputs for `title`, `slug`,
  `price`, `compareAt`, `status`, `stock`, and `collections`, so the
  Collections count column no longer depends on schema-only defaults.
- `BUG-04`: `showTitle` and `showPrice` are now persisted schema fields with
  guardrails. Product stays on when Slug is also hidden, and Price stays on
  when Compare at is also hidden.
- `BF-13`: Collections count keeps editor-owned header context through the same
  shared column registry used by the renderer, labels, and visibility toggles.
- Product Table headers and cells now resolve through one `productTableColumns`
  registry instead of separate renderer/editor column lists.

### Validation evidence

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Status po TASK-281-03 (2026-05-21)

### Fixed in TASK-281-03

- `BUG-02`: Status now renders as fixed Published/Draft/Archived badges, and
  Product titles stop duplicating `(draft)` / `(archived)` when the Status
  column is visible.
- `BUG-03` / `BF-03`: Product Table now supports optional stock quantity copy
  inside the Stock column through the new `showStockQuantity` field.
- `BF-04`: Draft and archived rows now use bounded row-state treatment through
  fixed local tone classes instead of neutral identical rows.

### Validation evidence

- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Status po TASK-281-04 (2026-05-21)

### Fixed in TASK-281-04

- `UX-03`: Product Table now derives safe relative product detail hrefs from
  the shared commerce content-route contract and can link either the Product or
  Slug column without exposing arbitrary URLs.
- `BF-11`: Visual mode now exposes an optional Action column with a bounded
  label, shared target/rel handling, and plain-text fallback when a row has no
  safe public href.
- Interactive rows now get a bounded hover cue only when a real product link
  is active; the broader row-hover styling wave still remains with
  `TASK-281-08`.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Status po TASK-281-05 (2026-05-21)

### Fixed in TASK-281-05

- `A1` / `A2`: Product Table now renders an sr-only `Product table` caption and applies `scope="col"` to every current header, including the optional Action column added in `TASK-281-04`.
- `A4`: Product Table now keeps deterministic section/table labels while preserving native `<table>` semantics instead of adding a redundant wrapper `role="table"`.
- `A5`: Commerce runtime warnings now announce through `role="alert"`, and preview warning banners follow the same local alert treatment.
- `A6`: The editor-preview empty state remains a polite live region and is now locked by focused SSR coverage; preview refresh banners also announce through `role="status"` without introducing a new shared helper.
- `A3`: Ownership is synchronized back to `TASK-281-03`, which already removed duplicated title/status copy; `TASK-281-05` now keeps that baseline under regression coverage.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict`

## Status po TASK-281-06 (2026-05-22)

### Fixed in TASK-281-06

- `UX-05` / `BF-01` / `A7`: Product Table now exposes an optional Image column backed by backend-owned public media enrichment in `hydrateProductTableRuntimeData()`. Rendered thumbnails use `loading="lazy"`, `decoding="async"`, safe alt fallback to the product title, and a stable `No image` fallback instead of broken requests.
- `BF-02`: Product Table now exposes an optional Excerpt column through the shared `productTableColumns` registry and clamps long plain-text excerpts in the renderer without accepting raw HTML.
- `BF-07`: Product Table now exposes `header.eyebrow`, `header.title`, and `header.description` in Visual mode; the visible section title also becomes the preferred accessible section/table label on top of the `TASK-281-05` caption baseline.
- Existing `TASK-281-01` through `TASK-281-05` seams remain preserved: preview-state refresh still resolves only query-backed data, Product/Price guardrails stay intact, safe product links and Action continue to use shared href handling, and row-state/status accessibility regressions stay locked by focused tests.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)

## Status po TASK-281-07 (2026-05-22)

### Fixed in TASK-281-07

- `UX-02`: Product Table now exposes `controls.pagination` with `paged` and `load-more` modes, block-scoped previous/next/load-more hrefs, page metadata, and a bounded public `pageSize` clamp of `1..24`.
- `UX-04`: `controls.sorting` now supports both passive sort indicators and interactive header links while preserving current `<th scope="col">` semantics and `aria-sort` coverage.
- `UX-06` / `BF-15`: Product Table now offers an optional inline public search input through SSR page query params owned by the widget (`pt.<blockId>.q`) instead of a second public JSON refresh path.
- `UX-08`: Product Table now offers optional public collection filters, preserves unrelated page query params in Product Table-owned hrefs, and reports rejected/ignored widget params without mutating persisted widget JSON. Public status params stay published-safe and can never widen frontend access to draft/archived rows.
- Existing `TASK-281-01` through `TASK-281-06` seams remain preserved: admin preview still hydrates only backend-owned query data, shared column guardrails stay intact, safe links/media/header/state work together, and the new runtime state is validated through widget, runtime, validator, and `handlePublicRequest()` coverage.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`

## Status po TASK-281-08 (2026-05-22)

### Fixed in TASK-281-08

- `UX-01`: Product Table now exposes a shipped `compact` block variant instead of only `default`, giving dense-catalog tables a bounded preset without introducing unrelated card/kanban renderers.
- `BF-05`: Visual mode now exposes `style.rowTreatment`, and the renderer supports bounded striped rows while preserving the existing draft/archived row-state tones from `TASK-281-03`.
- `BF-06` / `BF-08`: Product Table now centralizes header/cell/action class maps and exposes bounded density plus typography controls instead of hardcoded padding and text sizing.
- `BF-09`: Product Table now exposes bounded `style.maxWidth` and `style.align` controls so large tables can stay left-aligned or centered within content/wide shells without breaking horizontal overflow.
- `BF-10` / `UX-10`: Product Table now exposes an optional table-wide row-hover treatment while keeping the stronger link-only interaction cue introduced in `TASK-281-04`.
- `BF-12`: Product Table now exposes an optional sticky-header mode that keeps `<th scope="col">` cells pinned inside the current horizontal scroll shell.
- Existing `TASK-281-01` through `TASK-281-07` seams remain preserved: preview stays backend-owned, shared column guardrails remain intact, public controls/runtime metadata still work, and explicit clearable surfaces keep their authored-cleared behavior.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)`


## Status po TASK-281-09 (2026-05-22)

### Fixed in TASK-281-09

- `UX-07`: Product Table może teraz renderować opcjonalny SSR CSV download dla
  aktualnie widocznych wierszy i kolumn. Closure tej fali dotyczy eksportu CSV;
  clipboard export nie został dodany.
- `BF-14`: Price i Compare at renderują się teraz przez widget-owned
  `format.moneyLocale` i `format.currencyDisplay`, więc tabela może pokazywać
  multi-currency output bez zmiany shared default-argument behavior.
- Export shell jest ukrywany gdy `export.enabled` jest wyłączone albo gdy
  runtime nie rozwiązał żadnych wierszy, a filename fallback używa
  `header.title`, następnie `header.eyebrow`, a dopiero potem
  `product-table.csv`.
- `TASK-281-01` read-only diagnostics seam pozostaje nienaruszony: Visual
  dodaje panel `Export and currency`, a Advanced nadal nie pozwala edytować
  runtime-owned diagnostics.

### Validation evidence

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/widgets/productTable.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `git diff --check`
- `bun run precommit`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` are not installed locally; embedded `bun audit` still ran)

## Status po TASK-281-10 (2026-05-22)

### Finalna macierz findingów

| ID | Snapshot z 2026-05-16 | Finalny status | Owner | Evidence |
|---|---|---|---|---|
| BUG-00 | Admin preview nigdy nie hydruje danych commerce | `fixed` | TASK-281-01 | `ProductTableEditors.tsx`, `productTablePreviewClient.test.ts`, `productTablePreview.test.ts` |
| BUG-01 | Brak label controls dla Slug/Stock/CompareAt/Collections | `fixed` | TASK-281-02 | `ProductTableEditors.tsx`, `productTable.test.tsx`, `product-table-editor-wave.test.tsx` |
| BUG-02 | Status jako plain text i duplikacja w tytule | `fixed` | TASK-281-03 | `productTable.tsx`, `productTable.test.tsx` |
| BUG-03 | `stock.quantity` ignorowane | `fixed` | TASK-281-03 | `productTable.tsx`, `productTable.test.tsx` |
| BUG-04 | Title i Price niewyłączalne | `fixed` | TASK-281-02 | `productTable.tsx`, `product-table-editor-wave.test.tsx`, `validator.test.ts` |
| UX-01 | Tylko jeden wariant | `fixed` | TASK-281-08 | `productTable.tsx`, `registry.test.ts`, `productTable.test.tsx` |
| UX-02 | Brak paginacji | `fixed` | TASK-281-07 | `productTable.tsx`, `product-table-runtime-pagination.test.ts` |
| UX-03 | Brak klikalnych linków do produktów | `fixed` | TASK-281-04 | `productTable.tsx`, `commerceRuntimeResolver.test.ts`, `commerceWidgetRuntime.test.ts` |
| UX-04 | Brak sortowania interaktywnego | `fixed` | TASK-281-07 | `productTable.tsx`, `productTable.test.tsx`, `product-table-runtime-pagination.test.ts` |
| UX-05 | Brak miniatur produktu | `fixed` | TASK-281-06 | `productTable.tsx`, `commerceWidgetRuntime.test.ts`, `productTable.test.tsx` |
| UX-06 | Brak inline search na froncie | `fixed` | TASK-281-07 | `productTable.tsx`, `product-table-runtime-pagination.test.ts` |
| UX-07 | Brak eksportu danych | `fixed` | TASK-281-09 | `productTable.tsx`, `productTable.test.tsx`, `validator.test.ts` |
| UX-08 | Brak publicznych filtrów | `fixed` | TASK-281-07 | `productTable.tsx`, `product-table-runtime-pagination.test.ts` |
| UX-09 | Runtime error flag edytowalny | `fixed` | TASK-281-01 | `ProductTableEditors.tsx`, `product-table-editor-wave.test.tsx` |
| UX-10 | Brak hover na wierszach | `fixed` | TASK-281-08 | `productTable.tsx`, `productTable.test.tsx` |
| BF-01 | Brak thumbnails / kolumny obraz | `fixed` | TASK-281-06 | `productTable.tsx`, `commerceWidgetRuntime.test.ts` |
| BF-02 | Brak kolumny excerpt | `fixed` | TASK-281-06 | `productTable.tsx`, `productTable.test.tsx` |
| BF-03 | Brak ilości sztuk w Stock | `fixed` | TASK-281-03 | `productTable.tsx`, `productTable.test.tsx` |
| BF-04 | Brak kolorowania wierszy wg statusu | `fixed` | TASK-281-03 | `productTable.tsx`, `productTable.test.tsx` |
| BF-05 | Brak zebra striping | `fixed` | TASK-281-08 | `productTable.tsx`, `productTable.test.tsx` |
| BF-06 | Brak kontroli gęstości wierszy | `fixed` | TASK-281-08 | `productTable.tsx`, `validator.test.ts` |
| BF-07 | Brak nagłówka sekcji | `fixed` | TASK-281-06 | `ProductTableEditors.tsx`, `productTable.test.tsx` |
| BF-08 | Brak kontroli typografii | `fixed` | TASK-281-08 | `productTable.tsx`, `validator.test.ts` |
| BF-09 | Brak kontroli max-width i wyrównania | `fixed` | TASK-281-08 | `productTable.tsx`, `productTable.test.tsx` |
| BF-10 | Brak row hover efektu | `fixed` | TASK-281-08 | `productTable.tsx`, `productTable.test.tsx` |
| BF-11 | Brak kolumny akcji | `fixed` | TASK-281-04 | `productTable.tsx`, `productTable.test.tsx` |
| BF-12 | Brak sticky header | `fixed` | TASK-281-08 | `productTable.tsx`, `productTable.test.tsx` |
| BF-13 | Collections count header context jest schema-only | `fixed` | TASK-281-02 | `productTableColumns`, `ProductTableEditors.tsx`, `validator.test.ts` |
| BF-14 | Brak locale-aware money formatting | `fixed` | TASK-281-09 | `productTable.tsx`, `productTable.test.tsx` |
| BF-15 | Brak wyszukiwarki po stronie klienta | `fixed` | TASK-281-07 | `productTable.tsx`, `product-table-runtime-pagination.test.ts` |
| A1 | Brak `<caption>` | `fixed` | TASK-281-05 | `productTable.tsx`, `productTable.test.tsx` |
| A2 | Brak `scope="col"` na `<th>` | `fixed` | TASK-281-05 | `productTable.tsx`, `productTable.test.tsx` |
| A3 | Niespójny status copy w tytule | `fixed` | TASK-281-03 | `productTable.tsx`, `productTable.test.tsx` |
| A4 | Brak prawidłowej etykiety sekcji/tabeli | `fixed` | TASK-281-05 | `productTable.tsx`, `productTable.test.tsx` |
| A5 | Brak `role="alert"` na błędzie commerce | `fixed` | TASK-281-05 | `productTable.tsx`, `productTable.test.tsx` |
| A6 | Empty state bez live semantics | `fixed` | TASK-281-05 | `productTable.tsx`, `productTable.test.tsx` |
| A7 | Brak `loading="lazy"` dla thumbnaili | `fixed` | TASK-281-06 | `productTable.tsx`, `commerceWidgetRuntime.test.ts`, `productTable.test.tsx` |

### Current-state / no-action rows

| Snapshot row | Finalny status | Owner | Evidence |
|---|---|---|---|
| Empty-state text editing i live admin preview | `no-action/current-state` | No local TASK-281 leaf | Snapshot already showed this working; `TASK-281-01` preview hydration preserved the live empty-state baseline. |
| Surface color controls i Clear buttons | `no-action/current-state` | No local TASK-281 leaf; shared token semantics remain under TASK-256-02 | Snapshot already showed all five controls working; Product Table kept the clearable-surface baseline through `TASK-281-08`. |
| Collections empty placeholder w source editorze | `no-action/current-state` | No local TASK-281 leaf | Snapshot marked the placeholder informational and working; no Product Table-local drift reopened it. |
| Mobile horizontal scroll | `no-action/current-state` | No local TASK-281 leaf | Snapshot already confirmed `overflow-x-auto`; later layout work in `TASK-281-08` preserved this baseline. |

No numerowany Product Table finding pozostał zdeferowany przy zamknięciu
rodziny. Referencje do `TASK-256` pozostają tylko dla shared current-state
seams, które były już poprawne dla Product Table i nie wymagały lokalnej
implementacji.

### Finalna walidacja rodziny

Finalny rerun `TASK-281-10` zakończył się green przed przejściem `TASK-281` do `Done`.

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/admin/productTablePreviewClient.test.ts tests/vitest/widgets/productTable.test.tsx tests/vitest/ui/product-table-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun test tests/integration/routes/productTablePreview.test.ts tests/integration/routes/widgets.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceRuntimeResolver.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/commerce/commerceWidgetRuntime.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/runtime/product-table-runtime-pagination.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/widgets/validator.test.ts tests/unit/widgets/registry.test.ts`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run scan:security:strict` (`semgrep`, `trivy`, and `gitleaks` missing locally; embedded `bun audit` still ran)
- `bun run precommit`
- `git diff --check`
