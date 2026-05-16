# RAPORT: Product Table Widget — Analiza UX/UI i brakujące funkcjonalności

> **Status:** W trakcie — analiza kodu zakończona, testy Playwright w toku
> **Data:** 2026-05-16
> **Sesja:** Playwright (Product Table Widget)
> **Środowisko admin:** http://localhost:5173/admin
> **Środowisko front:** http://localhost:3000
> **Strona testowa:** ProductTableTest (`/producttabletest`)

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

> _Sekcja zostanie uzupełniona po testach Playwright_

### 3.1 Wizard editor

| Test | Wynik |
|------|-------|

### 3.2 Visual editor — Columns

| Test | Wynik |
|------|-------|

### 3.3 Visual editor — Labels

| Test | Wynik |
|------|-------|

### 3.4 Visual editor — Empty state

| Test | Wynik |
|------|-------|

### 3.5 Visual editor — Surfaces

| Test | Wynik |
|------|-------|

### 3.6 Advanced editor

| Test | Wynik |
|------|-------|

### 3.7 Renderowanie tabeli z danymi

| Test | Wynik |
|------|-------|

---

## 4. Wyniki testów Playwright — Frontend (localhost:3000)

> _Sekcja zostanie uzupełniona po testach Playwright_

### 4.1 Tabela porównawcza Admin ↔ Frontend

| Test | Admin | Front | Zgodność |
|------|-------|-------|----------|

---

## 5. Znalezione błędy i problemy UX

### 5.1 Błędy funkcjonalne (Bugs) — z analizy kodu

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

## 8. Tabela podsumowania — macierz priorytetów (z analizy kodu)

### Błędy do naprawy

| ID | Opis | Priorytet |
|----|------|-----------|
| BUG-01 | Brak edycji etykiet dla Slug, Stock, CompareAt, Collections | Wysoki |
| BUG-02 | Status jako plain text — brak badge/koloru | Średni |
| BUG-03 | stock.quantity nigdy niewyświetlany | Średni |
| BUG-04 | Title i Price niewyłączalne — asymetria togglei | Niski |
| UX-09 | Runtime error flag edytowalny przez użytkownika | Niski |

### Pilne braki UX

| ID | Opis | Priorytet |
|----|------|-----------|
| UX-02 | Brak paginacji — max 48 produktów | Wysoki |
| UX-03 | Brak klikalnych wierszy / linków | Wysoki |
| UX-05 | Brak thumbnails | Wysoki |
| UX-01 | Tylko jeden wariant (default) | Średni |
| UX-04 | Brak sortowania interaktywnego | Średni |
| UX-06 | Brak search inline | Średni |

### Dostępność krytyczna

| ID | Opis | Standard |
|----|------|---------|
| A1 | Brak `<caption>` | WCAG 1.3.1 |
| A2 | Brak `scope="col"` na `<th>` | WCAG 1.3.1 |
| A5 | Błąd commerce bez `role="alert"` | WCAG 4.1.3 |

---

## 9. Wyniki testów Playwright — uzupełnienie

> _Do uzupełnienia po sesjach testowych_

---

## 10. Zgodność Admin Preview ↔ Frontend

> _Do uzupełnienia po testach Playwright_

---

## 11. Screenshoty

> Uwaga: nazwy plików PNG w tej sekcji są wyłącznie lokalnymi etykietami
> przechwyceń Playwright. Same pliki PNG są ignorowane przez Git i nie są
> wymaganym evidence w repo.

| Plik | Opis |
|------|------|

---

## 12. Statystyki (wstępne — z analizy kodu)

| Kategoria | Liczba |
|-----------|--------|
| Błędy funkcjonalne (Bugs) | 4 |
| Problemy UX edytora | 9 |
| Braki funkcjonalne | 15 |
| Problemy dostępności | 7 |
| **Łącznie** | **35** |

---

*Raport wygenerowany na podstawie analizy kodu — 2026-05-16. Testy Playwright w toku.*
