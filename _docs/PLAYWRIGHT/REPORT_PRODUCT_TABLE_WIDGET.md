# RAPORT: Product Table Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** Zakończony
> **Data:** 2026-05-16
> **Sesja:** Playwright (Product Table Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** ProductTableTestproducttabletest (`/producttabletestproducttabletest`) — UUID: `7227f3ad-d3bf-4fc2-88b1-d61d52df59df`

---

## 1. Przegląd widgetu

**Typ:** `product-table`
**Moduł:** Commerce (wymaga modułu `commerce`)
**Warianty:** tylko `default` — jeden wariant
**Złożoność:** composite
**Odbiorca:** intermediate
**Kategoria:** content

Widget wyświetla produkty z katalogu commerce w układzie tabeli HTML z konfigurowalnymi kolumnami, etykietami, filtrowaniem źródła danych i stylami powierzchni. Hydratacja danych następuje w runtime przez `hydrateProductTableRuntimeData()`.

---

## 2. Analiza kodu — struktura konfiguracji

### 2.1 Model danych

| Sekcja | Pola | Uwagi |
|--------|------|-------|
| **source** | `limit` (1–48), `search`, `collectionIds[]`, `status[]`, `sortField`, `sortDir` | Limit max 48, brak offsetu/paginacji |
| **fields** | `showSlug`, `showStatus`, `showStock`, `showCompareAt`, `showCollectionCount` | 5 togglei — brak togglea dla tytułu i ceny |
| **labels** | `title`, `price`, `compareAt`, `status`, `stock`, `collections`, `slug` | 7 etykiet w schemacie |
| **emptyState** | `title`, `description` | Komunikat gdy brak produktów |
| **style** | `tableBackground`, `tableBorderColor`, `headerBackground`, `emptyBackground`, `emptyBorderColor` | 5 powierzchni, brak kontroli typografii |
| **resolved** | `items[]`, `total`, `resolvedAt`, `error` | Runtime only — nie edytowane przez użytkownika |

### 2.2 Kolumny renderowane

| Kolumna | Zawsze widoczna | Toggle | Label edytowalny w edytorze |
|---------|-----------------|--------|-----------------------------|
| Product (title) | ✓ | ✗ brak | ✓ (Visual) |
| Slug | ✗ | ✓ showSlug (domyślnie ON) | ✗ BRAK w edytorze |
| Price | ✓ | ✗ brak | ✓ (Visual) |
| Compare At | ✗ | ✓ showCompareAt (domyślnie OFF) | ✗ BRAK w edytorze |
| Status | ✗ | ✓ showStatus (domyślnie ON) | ✓ (Visual) |
| Stock | ✗ | ✓ showStock (domyślnie ON) | ✗ BRAK w edytorze |
| Collections count | ✗ | ✓ showCollectionCount (domyślnie OFF) | ✗ BRAK w edytorze |

### 2.3 Tryby edytora

- **Wizard** — źródło danych (CommerceSourceFields), style powierzchni (5 clearable inputów)
- **Visual** — 3 sekcje: Columns (5 togglei), Column labels (tylko 3/7), Empty state, Surfaces
- **Advanced** — runtime payload (items count, total), runtime error flag, query preview JSON

### 2.4 Pola runtime card (dostępne danych, częściowo nieużywane)

`CommerceWidgetRuntimeCard` zawiera: `id`, `title`, `slug`, `excerpt`, `status`, `pricing.amount`, `pricing.currency`, `pricing.compareAtAmount`, `stock.state`, `stock.quantity`, `stock.inStock`, `primaryMediaId`, `mediaIds[]`, `collectionIds[]`

Z tych pól **nigdy nie są renderowane**: `excerpt`, `stock.quantity`, `stock.inStock`, `primaryMediaId`, `mediaIds[]` — dostępne w danych ale bez żadnej reprezentacji w UI.

---

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
| Status jako badge | ✗ BRAK | Wartości "draft"/"published" jako plain text |
| Quantity (stock.quantity) wyświetlana | ✗ BRAK | Tylko "In stock"/"Out of stock", bez liczby |
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

#### BUG-01 — Etykiety kolumn Slug, Stock, CompareAt, Collections niedostępne w edytorze
**Priorytet:** Wysoki
**Opis:** Sekcja "Column labels" w Visual editorze pozwala edytować tylko 3 z 7 etykiet: `title`, `price`, `status`. Etykiety `slug`, `stock`, `compareAt`, `collections` są w schemacie i w `productTableDefaults`, ale **nie mają kontrolek w edytorze**. Użytkownik może włączyć te kolumny togglem, ale nie może zmienić ich nagłówka.
**Lokalizacja:** `ProductTableEditors.tsx:197-234` (sekcja "Column labels")

#### BUG-02 — Status wyświetlany jako surowy tekst (brak badge/koloru)
**Priorytet:** Średni
**Opis:** Kolumna Status renderuje wartości `"draft"`, `"published"`, `"archived"` jako plain text. Brak wizualnego rozróżnienia (kolory, badge). Tytuł produktu poza tym dostaje suffix `(draft)` / `(archived)` poprzez `titleWithStatus()` — duplikowanie informacji gdy kolumna Status jest włączona.
**Lokalizacja:** `productTable.tsx:369-373`, `productTable.tsx:484`

#### BUG-03 — Ilość sztuk (stock.quantity) nigdy nie wyświetlana
**Priorytet:** Średni
**Opis:** `CommerceWidgetRuntimeCard` zawiera `stock.quantity` (liczba całkowita lub null) oraz `stock.inStock` (boolean), ale renderer ignoruje oba pola — wyświetla tylko etykietę stanu ("In stock", "Out of stock", "Backorder"). Użytkownik nie ma możliwości włączenia wyświetlania ilości.
**Lokalizacja:** `productTable.tsx:486-490`, `commerceWidgetShared.ts:187-193`

#### BUG-04 — Kolumna Title i Price niewyłączalne
**Priorytet:** Niski
**Opis:** Pola `showTitle` i `showPrice` nie istnieją — kolumny Product i Price są zawsze widoczne. Pozostałe 5 kolumn ma togglei. Asymetria: użytkownik może ukryć Slug, ale nie Price — mimo że oba mają te same wymagania edycyjne.
**Lokalizacja:** `productTable.tsx:421-443` (hardcoded thead bez conditionala)

---

### 5.2 Problemy UX edytora — z analizy kodu

#### UX-01 — Tylko jeden wariant (default)
**Opis:** Widget ma wyłącznie wariant `default`. Brak wariantów alternatywnych layoutów (compact, card-based, kanban). Porównując z innymi widgetami commerce (ProductGallery, ProductCompare) — brak elastyczności w wyborze widoku.
**Rekomendacja:** Dodać wariant `compact` (zmniejszone padding, mniejszy font) i/lub `striped` (alternujące kolory wierszy).

#### UX-02 — Brak paginacji / "Show more"
**Opis:** Limit to maksymalnie 48 produktów (hardcoded w schemacie). Brak paginacji, "load more" ani endless scroll. Dla katalogów z >48 produktami widget jest nieadekwatny jako główny widok katalogu.
**Rekomendacja:** Dodać opcję paginacji lub "Load more" z konfigurowalnymi page size.

#### UX-03 — Brak klikalnych wierszy / linków do produktów
**Opis:** Tabela jest read-only — wiersze nie są klikalne, nie ma linku do strony produktu. Pole `slug` wyświetla `/{slug}` jako tekst, ale nie jest hiperłączem. Tabela służy jako widok listy ale bez możliwości nawigacji.
**Rekomendacja:** Dodać opcję "row click target" (link do `/{slug}`) lub opcjonalny link w kolumnie tytułu.

#### UX-04 — Brak sortowania interaktywnego (klik w nagłówek)
**Opis:** Sortowanie konfiguruje się w edytorze przez `sortField` i `sortDir`. Na froncie użytkownik nie może kliknąć nagłówka kolumny żeby posortować — brak interaktywności. Standardowe oczekiwanie UX dla tabel danych.
**Rekomendacja:** Sortowanie interaktywne lub przynajmniej wizualny wskaźnik (ikona ▲/▼) aktywnego sortowania.

#### UX-05 — Brak miniatury obrazu produktu
**Opis:** Runtime card zawiera `primaryMediaId` i `mediaIds[]`, ale renderer nie wyświetla żadnego obrazu/thumbnails. Tabela produktów bez zdjęcia jest mniej czytelna — użytkownik musi identyfikować produkty po nazwie.
**Rekomendacja:** Dodać opcjonalną kolumnę thumbnail (`showImage` toggle) z małym `<img>` z `primaryMediaId`.

#### UX-06 — Brak wyszukiwarki inline na froncie
**Opis:** Pole `search` w source konfiguruje stałą frazę wyszukiwania. Na froncie użytkownik nie może filtrować tabeli — brak pola search w widgecie. Dla tabel z 48 produktami jest to duże ograniczenie UX.
**Rekomendacja:** Dodać opcjonalny toggle `showSearchInput` dla frontendu.

#### UX-07 — Brak opcji eksportu (CSV / clipboard)
**Opis:** Tabela prezentuje dane produktowe, ale brak przycisku eksportu. W kontekście CMS/admin użycie tablicy produktów sugeruje potrzebę eksportu danych.
**Rekomendacja:** Opcjonalny przycisk "Kopiuj do schowka" lub "Eksportuj CSV".

#### UX-08 — Brak filtrów widocznych dla użytkownika frontendu
**Opis:** Filtry (kolekcje, status, limit) są konfigurowane przez admina w edytorze — na froncie użytkownik nie może samodzielnie filtrować. Brak togglei filtrów dla użytkownika końcowego.
**Rekomendacja:** Opcjonalne `showFilters` — dropdowny po stronie klienta.

#### UX-09 — Advanced editor — "runtime error flag" jest edytowalny przez użytkownika
**Opis:** Pole "Runtime error flag" w Advanced editorze umożliwia ręczne wpisanie wartości błędu. To jest pole runtime, nie konfiguracyjne — edycja przez użytkownika może wprowadzić błędny stan (fałszywe ostrzeżenie w rendered widgecie).
**Lokalizacja:** `ProductTableEditors.tsx:284-296`
**Rekomendacja:** Zamienić na read-only display, usunąć `onChange` dla pola error.

---

## 6. Braki funkcjonalne — z analizy kodu

### BF-01 — Brak thumbnails / kolumny obraz
**Opis:** Dane runtime zawierają `primaryMediaId`, ale nie ma żadnej opcji wyświetlenia obrazu w tabeli. Standardowa tabela produktów w e-commerce zawiera miniaturę.

### BF-02 — Brak kolumny excerpt
**Opis:** `CommerceWidgetRuntimeCard` ma pole `excerpt` (string | null), ale nie ma togla `showExcerpt` ani renderowania w tabeli.

### BF-03 — Brak kolumny ilości (stock.quantity)
**Opis:** Pole `stock.quantity` jest w modelu danych ale nigdy renderowane. Zamiast "In stock" mogłoby pokazywać "In stock (42)".

### BF-04 — Brak kolorowania wierszy wg statusu
**Opis:** Wiersze dla draft/archived produktów nie mają żadnego wizualnego wyróżnienia (kolor, opacity). Standardowy UX tabel dla list z mieszanymi statusami.

### BF-05 — Brak zebra striping (alternujące kolory wierszy)
**Opis:** Wszystkie wiersze mają jednolite tło. Brak opcji `striped` alternujących wierszy dla czytelności przy długich listach.

### BF-06 — Brak kontroli gęstości wierszy (row density)
**Opis:** Padding `py-2 px-3` hardcoded. Brak opcji compact/comfortable/spacious — ważne dla tabel z 48 produktami.

### BF-07 — Brak nagłówka sekcji (eyebrow/title/description)
**Opis:** Widget nie ma opcji nagłówka sekcji — brak eyebrow, title, description nad tabelą. Inne widgety (FeatureGrid, Stats KPI) mają tę funkcjonalność. Brak kontekstu dla tabeli w layoutach wielowidgetowych.

### BF-08 — Brak kontroli typografii
**Opis:** Rozmiar fonta komórek (`text-sm`), nagłówków (`text-xs font-semibold uppercase`) i opcje stylu tekstowego hardcoded. Brak kontroli przez edytor.

### BF-09 — Brak kontroli max-width i wyrównania
**Opis:** `overflow-x-auto` bez max-width ograniczenia. Tabela rozciąga się na pełną szerokość kontenera bez możliwości zwężenia.

### BF-10 — Brak kontroli row hover (efekt hover na wierszu)
**Opis:** Brak `hover:bg-*` na wierszach. Dla klikalnej tabeli (jeśli dodany link) — hover jest niezbędny. Nawet dla read-only czytelność poprawia subtelny hover.

### BF-11 — Brak kolumny akcji (Actions column)
**Opis:** Brak opcjonalnej kolumny z przyciskami akcji per wiersz (np. "View", "Edit"). Tabela tylko do odczytu.

### BF-12 — Brak sticky header
**Opis:** Przy 48 produktach i scrollowaniu pionowym nagłówek tabeli znika. Brak opcji `sticky header`.

### BF-13 — Brak etykiety dla kolumny "Collections count"
**Opis:** Kolumna `showCollectionCount` wyświetla liczbę kolekcji (integer), ale brak kontekstu — komórka pokazuje samo "3" bez jednostki. Etykieta nagłówka ("Collections") jest edytowalna w schemacie, ale nie w edytorze (BUG-01).

### BF-14 — Brak obsługi walut multi-currency w display
**Opis:** Formatowanie przez `Intl.NumberFormat("en-US", ...)` — zawsze lokalizacja en-US. Dla walut innych niż USD wyświetlana jest waluta z currency code (np. PLN 100.00), ale format liczby zawsze anglojęzyczny.

### BF-15 — Brak wyszukiwarki po stronie klienta
**Opis:** Patrz UX-06. Brak inline search inputu widocznego dla odwiedzającego stronę.

---

## 7. Problemy dostępności — z analizy kodu

| # | Problem | Standard | Priorytet |
|---|---------|----------|-----------|
| A1 | Tabela bez `<caption>` — brak opisu tabeli dla screen readerów | WCAG 1.3.1 | Wysoki |
| A2 | `<th>` bez atrybutu `scope="col"` — kolumny niezidentyfikowane dla AT | WCAG 1.3.1 | Wysoki |
| A3 | Status "(draft)" / "(archived)" w tytule produktu — tekst niespójny z `aria-label` | WCAG 4.1.2 | Średni |
| A4 | Brak `role="table"` / `aria-label` na sekcji nadrzędnej | WCAG 4.1.2 | Średni |
| A5 | Błąd commerce renderuje `<div>` z amber — brak `role="alert"` | WCAG 4.1.3 | Średni |
| A6 | Empty state bez `aria-live` — dynamiczne zmiany niezgłaszane | WCAG 4.1.3 | Niski |
| A7 | Brak `loading="lazy"` na przyszłych thumbnail obrazach | Performance | Niski |

---

## 8. Tabela podsumowania — macierz priorytetów

### Błędy krytyczne i wysokiego priorytetu

| ID | Opis | Priorytet | Potwierdzone |
|----|------|-----------|-------------|
| BUG-00 | Admin preview nigdy nie hydruje danych commerce — edytor widzi tylko empty state | Krytyczny | ✓ Playwright |
| BUG-01 | Brak edycji etykiet dla Slug, Stock, CompareAt, Collections | Wysoki | ✓ Playwright |
| A1 | Brak `<caption>` w tabeli | Wysoki (WCAG 1.3.1) | ✓ Playwright |
| A2 | Brak `scope="col"` na `<th>` | Wysoki (WCAG 1.3.1) | ✓ Playwright |
| BUG-02 | Status jako plain text — brak badge/koloru + duplikacja w tytule | Średni | ✓ Playwright |
| BUG-03 | stock.quantity nigdy niewyświetlany mimo że jest w danych | Średni | ✓ Kod |

### Pilne braki UX

| ID | Opis | Priorytet |
|----|------|-----------|
| UX-02 | Brak paginacji — max 48 produktów | Wysoki |
| UX-03 | Brak klikalnych wierszy / linków do produktów | Wysoki |
| UX-05 | Brak thumbnails — produkt bez zdjęcia | Wysoki |
| UX-01 | Tylko jeden wariant (default) | Średni |
| UX-04 | Brak sortowania interaktywnego kliknięciem nagłówka | Średni |
| UX-06 | Brak search inline na froncie | Średni |
| UX-10 | Brak hover na wierszach tabeli | Średni |
| UX-09 | Runtime error flag edytowalny przez użytkownika | Niski |
| BUG-04 | Title i Price niewyłączalne — asymetria togglei | Niski |

### Braki funkcjonalne (najważniejsze)

| ID | Priorytet | Opis |
|----|-----------|------|
| BF-01 | Wysoki | Brak thumbnails / kolumny obraz |
| BF-02 | Wysoki | Brak klikalnych wierszy / linków |
| BF-03 | Wysoki | Brak ilości sztuk (stock.quantity) w kolumnie Stock |
| BF-07 | Wysoki | Brak nagłówka sekcji (eyebrow/title/description nad tabelą) |
| BF-04 | Średni | Brak kolorowania wierszy wg statusu |
| BF-05 | Średni | Brak zebra striping |
| BF-06 | Średni | Brak kontroli gęstości wierszy (row density) |
| BF-10 | Średni | Brak row hover efektu |
| BF-11 | Średni | Brak kolumny akcji (Actions column) |
| BF-12 | Średni | Brak sticky header przy 48 produktach |
| BF-15 | Średni | Brak wyszukiwarki po stronie klienta |

---

## 9. Zgodność Admin Preview ↔ Frontend

> **Wniosek: Admin preview i frontend są NIEZGODNE w kluczowym aspekcie.**

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
